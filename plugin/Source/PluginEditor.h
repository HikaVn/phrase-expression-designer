#pragma once

#include <juce_audio_processors/juce_audio_processors.h>
#include <memory>

#include "PluginProcessor.h"

class PedAudioProcessorEditor : public juce::AudioProcessorEditor
{
public:
    explicit PedAudioProcessorEditor (PedAudioProcessor&);
    ~PedAudioProcessorEditor() override = default;

    void paint (juce::Graphics&) override;
    void resized() override;

private:
    using SliderAttachment = juce::AudioProcessorValueTreeState::SliderAttachment;

    void openProfile();
    void refreshProfileLabel();

    PedAudioProcessor& processorRef;

    juce::Slider intensity, timbre, vibrato;
    juce::Label intensityLabel, timbreLabel, vibratoLabel;
    std::unique_ptr<SliderAttachment> intensityAtt, timbreAtt, vibratoAtt;

    juce::Slider articulation;
    juce::Label articulationLabel;
    std::unique_ptr<SliderAttachment> articulationAtt;

    juce::TextButton loadButton { "Load Profile…" };
    juce::Label profileLabel;
    std::unique_ptr<juce::FileChooser> chooser;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (PedAudioProcessorEditor)
};
