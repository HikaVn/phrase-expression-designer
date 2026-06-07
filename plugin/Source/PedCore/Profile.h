// PedCore: InstrumentProfile loader for the plugin. This is the one PedCore
// header that depends on JUCE (for JSON + File). The math headers (Curve.h,
// Calibration.h) stay JUCE-free so they can be unit-tested standalone.
//
// Parity target: src/ped/profiles/instrument_profile.py
#pragma once

#include <juce_core/juce_core.h>

#include <map>
#include <string>
#include <vector>

#include "Calibration.h"

namespace ped
{

// C3=60 / C4=60 note-name -> MIDI number. Parity with ped.core.pitch.
int noteNameToNumber (const juce::String& name, const juce::String& naming);

struct PluginArticulation
{
    juce::String id;
    juce::String name;
    juce::String type;        // long / short / effect
    juce::String triggerType; // keyswitch / cc / program_change / ""
    int ksNote = -1;          // resolved keyswitch note (or -1)
    bool momentary = false;
};

struct PluginCCMapping
{
    juce::String parameter;   // intensity / volume / timbre / vibratoDepth ...
    int          cc = -1;     // output CC
    juce::String curveId;
    double       smoothingMs = 0.0;
    double       lookAheadMs = 0.0; // offline only (real-time can't see the future)
    int          inputCc = -1;      // live source controller, or -1
};

class InstrumentProfile
{
public:
    juce::String id;
    juce::String noteNaming = "C3=60";
    std::vector<PluginArticulation> articulations;
    std::vector<PluginCCMapping>    ccMappings;
    std::map<juce::String, CalibrationCurve> calibrationCurves;

    bool loadFromFile (const juce::File& file);
    bool loadFromJSON (const juce::var& root);

    const CalibrationCurve* calibrationById (const juce::String& cid) const
    {
        auto it = calibrationCurves.find (cid);
        return it == calibrationCurves.end() ? nullptr : &it->second;
    }

    const PluginCCMapping* mappingForParameter (const juce::String& param) const
    {
        for (const auto& m : ccMappings)
            if (m.parameter == param) return &m;
        return nullptr;
    }
};

} // namespace ped
