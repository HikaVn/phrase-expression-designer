// Headless runtime test for PedAudioProcessor: drive processBlock with crafted
// MIDI and assert the output, with no DAW. Validates the real-time features
// (input CC -> calibrated output CC, articulation keyswitch, MIDI passthrough).
//
// Built and run via CMake/CTest (links the plugin shared code + JUCE).
#include "PluginProcessor.h"

#include <cstdio>
#include <vector>

namespace
{
int failures = 0;

void check (bool cond, const char* what)
{
    if (! cond) { std::printf ("FAIL: %s\n", what); ++failures; }
}

struct CC { int number; int value; };

// Collect controller events from a processed block.
std::vector<CC> controllers (const juce::MidiBuffer& b)
{
    std::vector<CC> out;
    for (const auto meta : b)
    {
        const auto m = meta.getMessage();
        if (m.isController())
            out.push_back ({ m.getControllerNumber(), m.getControllerValue() });
    }
    return out;
}

void setParam (juce::AudioProcessorValueTreeState& s, const char* id, float normalised)
{
    if (auto* p = s.getParameter (id))
        p->setValueNotifyingHost (normalised);
}

// Run one block with the given input MIDI; return the output MIDI.
juce::MidiBuffer runBlock (PedAudioProcessor& proc, juce::MidiBuffer input, int numSamples = 512)
{
    juce::AudioBuffer<float> audio (2, numSamples);
    audio.clear();
    proc.processBlock (audio, input);
    return input; // processBlock swaps output into the buffer it was given
}
} // namespace

int main()
{
    PedAudioProcessor proc;
    if (! proc.loadProfile (juce::File (PED_EXAMPLE_PROFILE)))
    {
        std::printf ("FAIL: could not load example profile %s\n", PED_EXAMPLE_PROFILE);
        return 1;
    }
    proc.prepareToPlay (44100.0, 512);

    // --- 1. Input CC1 (mod wheel) drives intensity -> calibrated output CC1 ---
    // The example profile maps intensity: inputCc=1, output cc=1, curve
    // dynamic_default (1.0 -> 120). Feed CC1=127 over many blocks; the smoothed
    // output should converge to 120, and the raw 127 must NOT pass through.
    int lastCC1 = -1;
    bool sawRaw127 = false;
    for (int i = 0; i < 80; ++i)
    {
        juce::MidiBuffer in;
        in.addEvent (juce::MidiMessage::controllerEvent (1, 1, 127), 0);
        auto out = runBlock (proc, in);
        for (auto& c : controllers (out))
        {
            if (c.number == 1)
            {
                lastCC1 = c.value;
                if (c.value == 127) sawRaw127 = true;
            }
        }
    }
    check (lastCC1 == 120, "intensity input CC1 converges to calibrated 120");
    check (! sawRaw127, "raw input CC1=127 is consumed, not passed through");

    // --- 2. A non-input controller passes through unchanged ---
    {
        juce::MidiBuffer in;
        in.addEvent (juce::MidiMessage::controllerEvent (1, 7, 100), 0); // CC7 volume
        auto out = controllers (runBlock (proc, in));
        bool found = false;
        for (auto& c : out) if (c.number == 7 && c.value == 100) found = true;
        check (found, "non-input CC7 passes through unchanged");
    }

    // --- 3. Notes pass through unchanged ---
    {
        juce::MidiBuffer in;
        in.addEvent (juce::MidiMessage::noteOn (1, 60, (juce::uint8) 90), 10);
        auto out = runBlock (proc, in);
        bool found = false;
        for (const auto meta : out)
        {
            auto m = meta.getMessage();
            if (m.isNoteOn() && m.getNoteNumber() == 60) found = true;
        }
        check (found, "played note passes through");
    }

    // --- 4. Articulation selector taps the keyswitch (spiccato = index 2, note 26) ---
    {
        setParam (proc.apvts, "articulation", 2.0f / 31.0f); // index 2
        juce::MidiBuffer in;
        auto out = runBlock (proc, in);
        bool sawKsOn = false;
        for (const auto meta : out)
        {
            auto m = meta.getMessage();
            if (m.isNoteOn() && m.getNoteNumber() == 26) sawKsOn = true;
        }
        check (sawKsOn, "articulation change taps keyswitch note 26 (spiccato)");

        // next block releases it
        juce::MidiBuffer in2;
        auto out2 = runBlock (proc, in2);
        bool sawKsOff = false;
        for (const auto meta : out2)
        {
            auto m = meta.getMessage();
            if (m.isNoteOff() && m.getNoteNumber() == 26) sawKsOff = true;
        }
        check (sawKsOff, "keyswitch note 26 is released on the next block");
    }

    if (failures == 0) { std::printf ("Processor runtime: all checks passed\n"); return 0; }
    std::printf ("Processor runtime: %d failure(s)\n", failures);
    return 1;
}
