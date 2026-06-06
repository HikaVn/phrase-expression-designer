#include "Profile.h"

#include "Curve.h"

namespace ped
{

int noteNameToNumber (const juce::String& name, const juce::String& naming)
{
    static const std::map<juce::String, int> semis = {
        {"C", 0}, {"C#", 1}, {"DB", 1}, {"D", 2}, {"D#", 3}, {"EB", 3}, {"E", 4},
        {"FB", 4}, {"E#", 5}, {"F", 5}, {"F#", 6}, {"GB", 6}, {"G", 7}, {"G#", 8},
        {"AB", 8}, {"A", 9}, {"A#", 10}, {"BB", 10}, {"B", 11}, {"CB", 11}, {"B#", 0}
    };
    juce::String raw = name.trim().replace ("♯", "#").replace ("♭", "b");
    if (raw.isEmpty()) return -1;

    int i = raw.length();
    while (i > 0 && (juce::CharacterFunctions::isDigit (raw[i - 1]) || raw[i - 1] == '-'))
        --i;
    juce::String letter = raw.substring (0, i).toUpperCase();
    juce::String oct = raw.substring (i);
    if (oct.isEmpty()) return -1;

    auto it = semis.find (letter);
    if (it == semis.end()) return -1;

    int offset = (naming == "C4=60") ? 1 : (naming == "C3=60" ? 2 : -1);
    if (offset < 0) return -1;

    int number = (oct.getIntValue() + offset) * 12 + it->second;
    return (number >= 0 && number <= 127) ? number : -1;
}

bool InstrumentProfile::loadFromFile (const juce::File& file)
{
    if (! file.existsAsFile()) return false;
    return loadFromJSON (juce::JSON::parse (file));
}

bool InstrumentProfile::loadFromJSON (const juce::var& root)
{
    if (! root.isObject()) return false;

    id = root.getProperty ("id", "").toString();
    noteNaming = root.getProperty ("noteNaming", "C3=60").toString();

    articulations.clear();
    if (auto* arts = root.getProperty ("articulations", juce::var()).getArray())
    {
        for (auto& a : *arts)
        {
            PluginArticulation pa;
            pa.id = a.getProperty ("id", "").toString();
            pa.name = a.getProperty ("name", pa.id).toString();
            pa.type = a.getProperty ("type", "long").toString();
            auto trig = a.getProperty ("trigger", juce::var());
            if (trig.isObject())
            {
                pa.triggerType = trig.getProperty ("type", "").toString();
                pa.momentary = trig.getProperty ("mode", "latch").toString() == "momentary";
                if (pa.triggerType == "keyswitch")
                {
                    if (trig.hasProperty ("note"))
                        pa.ksNote = (int) trig.getProperty ("note", -1);
                    else if (trig.hasProperty ("noteName"))
                        pa.ksNote = noteNameToNumber (trig.getProperty ("noteName", "").toString(), noteNaming);
                }
            }
            articulations.push_back (pa);
        }
    }

    ccMappings.clear();
    if (auto* maps = root.getProperty ("ccMappings", juce::var()).getArray())
    {
        for (auto& m : *maps)
        {
            PluginCCMapping pm;
            pm.parameter = m.getProperty ("internalParameter", "").toString();
            auto target = m.getProperty ("target", juce::var());
            if (target.isObject() && target.getProperty ("type", "").toString() == "cc")
                pm.cc = (int) target.getProperty ("cc", -1);
            pm.curveId = m.getProperty ("curveId", "").toString();
            pm.smoothingMs = (double) m.getProperty ("smoothingMs", 0.0);
            pm.lookAheadMs = (double) m.getProperty ("lookAheadMs", 0.0);
            ccMappings.push_back (pm);
        }
    }

    calibrationCurves.clear();
    if (auto* curves = root.getProperty ("calibrationCurves", juce::var()).getArray())
    {
        for (auto& c : *curves)
        {
            CalibrationCurve cc;
            cc.id = c.getProperty ("id", "").toString().toStdString();
            cc.interpolation = interpFromString (c.getProperty ("interpolation", "monotonic").toString().toStdString());
            if (auto* outR = c.getProperty ("outputRange", juce::var()).getArray())
                if (outR->size() == 2) { cc.outMin = (int) (*outR)[0]; cc.outMax = (int) (*outR)[1]; }
            if (auto* pts = c.getProperty ("points", juce::var()).getArray())
                for (auto& p : *pts)
                    cc.points.push_back ({ (double) p.getProperty ("input", 0.0), (int) p.getProperty ("output", 0) });
            cc.sortPoints();
            calibrationCurves[juce::String (cc.id)] = cc;
        }
    }
    return true;
}

} // namespace ped
