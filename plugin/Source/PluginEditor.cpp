#include "PluginEditor.h"

namespace
{
void configureRotary (juce::Slider& s)
{
    s.setSliderStyle (juce::Slider::RotaryHorizontalVerticalDrag);
    s.setTextBoxStyle (juce::Slider::TextBoxBelow, false, 70, 18);
}

void configureLabel (juce::Label& l, const juce::String& text, juce::Component& owner)
{
    l.setText (text, juce::dontSendNotification);
    l.setJustificationType (juce::Justification::centred);
    owner.addAndMakeVisible (l);
}
} // namespace

PedAudioProcessorEditor::PedAudioProcessorEditor (PedAudioProcessor& p)
    : juce::AudioProcessorEditor (&p), processorRef (p)
{
    for (auto* s : { &intensity, &timbre, &vibrato })
    {
        configureRotary (*s);
        addAndMakeVisible (*s);
    }
    configureLabel (intensityLabel, "Intensity", *this);
    configureLabel (timbreLabel, "Timbre", *this);
    configureLabel (vibratoLabel, "Vibrato", *this);

    intensityAtt = std::make_unique<SliderAttachment> (p.apvts, "intensity", intensity);
    timbreAtt    = std::make_unique<SliderAttachment> (p.apvts, "timbre", timbre);
    vibratoAtt   = std::make_unique<SliderAttachment> (p.apvts, "vibratoDepth", vibrato);

    articulation.setSliderStyle (juce::Slider::IncDecButtons);
    articulation.setTextBoxStyle (juce::Slider::TextBoxLeft, false, 50, 20);
    addAndMakeVisible (articulation);
    configureLabel (articulationLabel, "Articulation #", *this);
    articulationAtt = std::make_unique<SliderAttachment> (p.apvts, "articulation", articulation);

    addAndMakeVisible (loadButton);
    loadButton.onClick = [this] { openProfile(); };

    addAndMakeVisible (reloadButton);
    reloadButton.onClick = [this] { processorRef.reloadProfile(); refreshProfileLabel(); };

    profileLabel.setJustificationType (juce::Justification::centredLeft);
    addAndMakeVisible (profileLabel);
    refreshProfileLabel();

    setSize (480, 300);
}

void PedAudioProcessorEditor::refreshProfileLabel()
{
    const auto path = processorRef.getProfilePath();
    profileLabel.setText (path.isEmpty() ? "No profile loaded" : "Profile: " + processorRef.getProfile().id,
                          juce::dontSendNotification);
}

void PedAudioProcessorEditor::openProfile()
{
    // Allow all files (some hosts grey out a ".json"-only filter); we validate
    // the JSON on load anyway.
    chooser = std::make_unique<juce::FileChooser> ("Select an Instrument Profile JSON",
                                                   juce::File(), "*");
    auto flags = juce::FileBrowserComponent::openMode | juce::FileBrowserComponent::canSelectFiles;
    chooser->launchAsync (flags, [this] (const juce::FileChooser& fc)
    {
        auto file = fc.getResult();
        if (file.existsAsFile() && processorRef.loadProfile (file))
            refreshProfileLabel();
    });
}

bool PedAudioProcessorEditor::isInterestedInFileDrag (const juce::StringArray& files)
{
    for (const auto& f : files)
        if (f.endsWithIgnoreCase (".json"))
            return true;
    return false;
}

void PedAudioProcessorEditor::filesDropped (const juce::StringArray& files, int, int)
{
    for (const auto& f : files)
    {
        juce::File file (f);
        if (file.existsAsFile() && processorRef.loadProfile (file))
        {
            refreshProfileLabel();
            break;
        }
    }
}

void PedAudioProcessorEditor::paint (juce::Graphics& g)
{
    g.fillAll (getLookAndFeel().findColour (juce::ResizableWindow::backgroundColourId));
    g.setColour (juce::Colours::white);
    g.setFont (18.0f);
    g.drawText ("Phrase Expression Designer", getLocalBounds().removeFromTop (32),
                juce::Justification::centred);
    g.setColour (juce::Colours::grey);
    g.setFont (11.0f);
    g.drawText ("Load a profile, or drop a .json here",
                getLocalBounds().removeFromBottom (16), juce::Justification::centred);
}

void PedAudioProcessorEditor::resized()
{
    auto area = getLocalBounds().reduced (12);
    area.removeFromTop (32); // title

    auto top = area.removeFromTop (40);
    loadButton.setBounds (top.removeFromLeft (120));
    top.removeFromLeft (6);
    reloadButton.setBounds (top.removeFromLeft (74));
    top.removeFromLeft (6);
    profileLabel.setBounds (top);

    auto knobs = area.removeFromTop (150);
    const int w = knobs.getWidth() / 3;
    auto place = [&] (juce::Slider& s, juce::Label& l, juce::Rectangle<int> col)
    {
        l.setBounds (col.removeFromBottom (20));
        s.setBounds (col);
    };
    place (intensity, intensityLabel, knobs.removeFromLeft (w));
    place (timbre, timbreLabel, knobs.removeFromLeft (w));
    place (vibrato, vibratoLabel, knobs);

    auto bottom = area.removeFromTop (40);
    articulationLabel.setBounds (bottom.removeFromLeft (110));
    articulation.setBounds (bottom.removeFromLeft (120));
}
