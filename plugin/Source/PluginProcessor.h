// Phrase Expression Designer — AU/VST3 MIDI FX plugin.
//
// Real-time companion to the Python authoring tool: it sits *before* an
// instrument (e.g. a Kontakt patch) in the DAW and converts high-level intent
// parameters (intensity / timbre / vibrato) into the CC the loaded
// InstrumentProfile prescribes, plus keyswitch/CC/program-change articulation
// switches. Incoming MIDI is passed through unchanged.
#pragma once

#include <juce_audio_processors/juce_audio_processors.h>

#include <array>

#include "PedCore/Profile.h"

class PedAudioProcessor : public juce::AudioProcessor
{
public:
    PedAudioProcessor();
    ~PedAudioProcessor() override = default;

    void prepareToPlay (double sampleRate, int samplesPerBlock) override;
    void releaseResources() override {}
    void processBlock (juce::AudioBuffer<float>&, juce::MidiBuffer&) override;

    juce::AudioProcessorEditor* createEditor() override;
    bool hasEditor() const override { return true; }

    const juce::String getName() const override { return "Phrase Expression Designer"; }
    bool acceptsMidi() const override { return true; }
    bool producesMidi() const override { return true; }
    bool isMidiEffect() const override { return true; }
    double getTailLengthSeconds() const override { return 0.0; }

    int getNumPrograms() override { return 1; }
    int getCurrentProgram() override { return 0; }
    void setCurrentProgram (int) override {}
    const juce::String getProgramName (int) override { return {}; }
    void changeProgramName (int, const juce::String&) override {}

    void getStateInformation (juce::MemoryBlock&) override;
    void setStateInformation (const void*, int sizeInBytes) override;

    // -- profile management (called from the editor) --
    bool loadProfile (const juce::File&);
    const ped::InstrumentProfile& getProfile() const { return profile; }
    juce::String getProfilePath() const { return profilePath; }

    juce::AudioProcessorValueTreeState apvts;

private:
    static juce::AudioProcessorValueTreeState::ParameterLayout makeLayout();

    static constexpr std::array<const char*, 3> kParams { "intensity", "timbre", "vibratoDepth" };
    static constexpr int kMaxArticulations = 32;

    ped::InstrumentProfile profile;
    juce::String profilePath;
    int midiChannel = 1;

    std::array<int, 3> lastSentCC { -1, -1, -1 };
    int lastArticulationIndex = -1;
    int pendingNoteOff = -1; // keyswitch note to release at the next block start

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (PedAudioProcessor)
};
