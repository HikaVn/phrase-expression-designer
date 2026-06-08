#include "PluginEditor.h"

#include "PedCore/NoteEntry.h"

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

    // --- text note entry -> MIDI ---
    noteEntry.setMultiLine (true);
    noteEntry.setReturnKeyStartsNewLine (true);
    noteEntry.setTextToShowWhenEmpty ("e.g.  4 C D E F  2 G | 4 [C E G]  1 G~",
                                      juce::Colours::grey);
    addAndMakeVisible (noteEntry);
    addAndMakeVisible (writeMidiButton);
    writeMidiButton.onClick = [this] { writeMidiFromText(); };
    noteHint.setJustificationType (juce::Justification::centredLeft);
    noteHint.setFont (juce::Font (juce::FontOptions (11.0f)));
    noteHint.setText ("Type notes, then Notes → MIDI to save a .mid to drag into your DAW.",
                      juce::dontSendNotification);
    addAndMakeVisible (noteHint);

    setSize (520, 420);
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

void PedAudioProcessorEditor::writeMidiFromText()
{
    constexpr int ppq = 480;
    auto parsed = ped::parseNoteEntry (noteEntry.getText().toStdString(), ppq, 4, 4);
    if (! parsed.ok)
    {
        noteHint.setText ("Error: " + juce::String (parsed.error), juce::dontSendNotification);
        return;
    }
    if (parsed.notes.empty())
    {
        noteHint.setText ("No notes parsed.", juce::dontSendNotification);
        return;
    }

    juce::MidiMessageSequence seq;
    for (const auto& n : parsed.notes)
    {
        auto on = juce::MidiMessage::noteOn (1, n.pitch, (juce::uint8) 90);
        on.setTimeStamp ((double) n.startTick);
        auto off = juce::MidiMessage::noteOff (1, n.pitch);
        off.setTimeStamp ((double) (n.startTick + n.durationTick));
        seq.addEvent (on);
        seq.addEvent (off);
    }
    seq.updateMatchedPairs();

    auto dir = juce::File::getSpecialLocation (juce::File::userHomeDirectory)
                   .getChildFile ("Library/Audio/Presets/HikaVn/Phrase Expression Designer");
    dir.createDirectory();
    saveChooser = std::make_unique<juce::FileChooser> ("Save phrase as MIDI",
                                                       dir.getChildFile ("phrase.mid"), "*.mid");
    auto flags = juce::FileBrowserComponent::saveMode | juce::FileBrowserComponent::canSelectFiles
               | juce::FileBrowserComponent::warnAboutOverwriting;
    saveChooser->launchAsync (flags, [this, seq] (const juce::FileChooser& fc)
    {
        auto file = fc.getResult();
        if (file == juce::File())
            return;
        file = file.withFileExtension ("mid");
        juce::MidiFile mf;
        mf.setTicksPerQuarterNote (480);
        mf.addTrack (seq);
        file.deleteFile();
        if (auto stream = file.createOutputStream())
        {
            mf.writeTo (*stream);
            stream->flush();
            noteHint.setText ("Wrote " + file.getFileName() + " — drag it into your DAW.",
                              juce::dontSendNotification);
        }
        else
        {
            noteHint.setText ("Could not write " + file.getFullPathName(), juce::dontSendNotification);
        }
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

    auto artRow = area.removeFromTop (34);
    articulationLabel.setBounds (artRow.removeFromLeft (110));
    articulation.setBounds (artRow.removeFromLeft (120));

    area.removeFromTop (6);
    noteHint.setBounds (area.removeFromTop (16));
    auto entryRow = area.removeFromTop (28);
    writeMidiButton.setBounds (entryRow.removeFromRight (120));
    entryRow.removeFromRight (6);
    // (entryRow left part is spare)
    area.removeFromBottom (18); // leave room for the drop hint in paint()
    noteEntry.setBounds (area.removeFromTop (juce::jmax (40, area.getHeight())));
}
