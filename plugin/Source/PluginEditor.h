#pragma once

#include <juce_audio_processors/juce_audio_processors.h>
#include <memory>

#include "PluginProcessor.h"

class PedAudioProcessorEditor : public juce::AudioProcessorEditor,
                                public juce::FileDragAndDropTarget
{
public:
    explicit PedAudioProcessorEditor (PedAudioProcessor&);
    ~PedAudioProcessorEditor() override = default;

    void paint (juce::Graphics&) override;
    void resized() override;

    // Drag a profile .json onto the window to load it.
    bool isInterestedInFileDrag (const juce::StringArray& files) override;
    void filesDropped (const juce::StringArray& files, int x, int y) override;

private:
    using SliderAttachment = juce::AudioProcessorValueTreeState::SliderAttachment;

    void openProfile();
    void refreshProfileLabel();
    void writeMidiFromText();

    PedAudioProcessor& processorRef;

    juce::Slider intensity, timbre, vibrato;
    juce::Label intensityLabel, timbreLabel, vibratoLabel;
    std::unique_ptr<SliderAttachment> intensityAtt, timbreAtt, vibratoAtt;

    juce::Slider articulation;
    juce::Label articulationLabel;
    std::unique_ptr<SliderAttachment> articulationAtt;

    juce::TextButton loadButton { "Load Profile…" };
    juce::TextButton reloadButton { "Reload" };
    juce::Label profileLabel;
    std::unique_ptr<juce::FileChooser> chooser;

    // Sibelius-style text note entry -> MIDI file (type in-plugin, drag into the DAW).
    juce::TextEditor noteEntry;
    juce::TextButton writeMidiButton { "Notes → MIDI…" };
    juce::Label noteHint;
    std::unique_ptr<juce::FileChooser> saveChooser;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (PedAudioProcessorEditor)
};
