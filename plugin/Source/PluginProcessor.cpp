#include "PluginProcessor.h"

#include "PluginEditor.h"

PedAudioProcessor::PedAudioProcessor()
    : AudioProcessor (BusesProperties()), // MIDI effect: no audio buses
      apvts (*this, nullptr, "PARAMS", makeLayout())
{
}

juce::AudioProcessorValueTreeState::ParameterLayout PedAudioProcessor::makeLayout()
{
    juce::AudioProcessorValueTreeState::ParameterLayout layout;
    for (auto* id : kParams)
        layout.add (std::make_unique<juce::AudioParameterFloat> (
            juce::ParameterID { id, 1 }, id, juce::NormalisableRange<float> (0.0f, 1.0f), 0.5f));
    // Articulation index into the loaded profile's articulation list.
    layout.add (std::make_unique<juce::AudioParameterInt> (
        juce::ParameterID { "articulation", 1 }, "Articulation", 0, kMaxArticulations - 1, 0));
    return layout;
}

void PedAudioProcessor::prepareToPlay (double, int)
{
    lastSentCC = { -1, -1, -1 };
    lastArticulationIndex = -1;
    pendingNoteOff = -1;
}

void PedAudioProcessor::processBlock (juce::AudioBuffer<float>& buffer, juce::MidiBuffer& midi)
{
    buffer.clear(); // MIDI effect produces no audio

    juce::MidiBuffer generated;

    // Release a keyswitch tapped on the previous block.
    if (pendingNoteOff >= 0)
    {
        generated.addEvent (juce::MidiMessage::noteOff (midiChannel, pendingNoteOff), 0);
        pendingNoteOff = -1;
    }

    // Intent parameters -> CC, via the profile's calibration curves.
    for (size_t i = 0; i < kParams.size(); ++i)
    {
        const auto* mapping = profile.mappingForParameter (kParams[i]);
        if (mapping == nullptr || mapping->cc < 0)
            continue;
        const float value = apvts.getRawParameterValue (kParams[i])->load();
        const auto* cal = profile.calibrationById (mapping->curveId);
        const int ccValue = cal != nullptr ? cal->map (value)
                                           : juce::jlimit (0, 127, (int) std::lround (value * 127.0));
        if (ccValue != lastSentCC[i])
        {
            generated.addEvent (juce::MidiMessage::controllerEvent (midiChannel, mapping->cc, ccValue), 0);
            lastSentCC[i] = ccValue;
        }
    }

    // Articulation switch: when the index changes, fire the trigger for the
    // selected articulation (keyswitch tap / CC / program change).
    const int artIndex = (int) apvts.getRawParameterValue ("articulation")->load();
    if (artIndex != lastArticulationIndex
        && artIndex >= 0 && artIndex < (int) profile.articulations.size())
    {
        const auto& art = profile.articulations[(size_t) artIndex];
        if (art.triggerType == "keyswitch" && art.ksNote >= 0)
        {
            generated.addEvent (juce::MidiMessage::noteOn (midiChannel, art.ksNote, (juce::uint8) 100), 0);
            pendingNoteOff = art.ksNote; // released at the next block
        }
        lastArticulationIndex = artIndex;
    }

    // Pass incoming MIDI through unchanged, then add generated events.
    generated.addEvents (midi, 0, buffer.getNumSamples(), 0);
    midi.swapWith (generated);
}

bool PedAudioProcessor::loadProfile (const juce::File& file)
{
    if (! profile.loadFromFile (file))
        return false;
    profilePath = file.getFullPathName();
    lastSentCC = { -1, -1, -1 };
    return true;
}

void PedAudioProcessor::getStateInformation (juce::MemoryBlock& dest)
{
    auto state = apvts.copyState();
    state.setProperty ("profilePath", profilePath, nullptr);
    if (auto xml = state.createXml())
        copyXmlToBinary (*xml, dest);
}

void PedAudioProcessor::setStateInformation (const void* data, int sizeInBytes)
{
    if (auto xml = getXmlFromBinary (data, sizeInBytes))
    {
        auto state = juce::ValueTree::fromXml (*xml);
        if (state.isValid())
        {
            apvts.replaceState (state);
            auto path = state.getProperty ("profilePath", "").toString();
            if (path.isNotEmpty())
                loadProfile (juce::File (path));
        }
    }
}

juce::AudioProcessorEditor* PedAudioProcessor::createEditor()
{
    return new PedAudioProcessorEditor (*this);
}

// JUCE entry point.
juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter()
{
    return new PedAudioProcessor();
}
