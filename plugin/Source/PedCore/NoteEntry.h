// PedCore: text note entry -> notes. JUCE-free std C++ port of ped.note_entry
// (parse_note_entry). Supports sticky durations (+dots), nearest-octave letters,
// explicit octave (scientific C4=60), +/- octave shifts, accidentals (#sbx),
// leading duration on a note (8C), chords [C E G] / [CEG], ties (~), rests (r),
// barlines (|). Errors are returned (no exceptions).
//
// Parity target: src/ped/note_entry.py
#pragma once

#include <algorithm>
#include <cmath>
#include <map>
#include <regex>
#include <string>
#include <vector>

namespace ped
{

struct EntryNote
{
    int  pitch;
    long startTick;
    long durationTick;
};

struct ParseResult
{
    std::vector<EntryNote> notes;
    std::string error;      // empty on success
    bool ok = true;
};

namespace detail
{
inline int pitchClass (char letter)
{
    switch (std::toupper ((unsigned char) letter))
    {
        case 'C': return 0;  case 'D': return 2;  case 'E': return 4;
        case 'F': return 5;  case 'G': return 7;  case 'A': return 9;
        case 'B': return 11; default:  return -1;
    }
}

inline int accidentalShift (const std::string& acc)
{
    int s = 0;
    for (char c : acc)
        s += (c == '#' || c == 's') ? 1 : (c == 'b') ? -1 : (c == 'x') ? 2 : 0;
    return s;
}

inline bool durationTicks (int value, int dots, int ppq, long& out)
{
    static const int valid[] = { 1, 2, 4, 8, 16, 32, 64 };
    if (std::find (std::begin (valid), std::end (valid), value) == std::end (valid))
        return false;
    double base = (double) ppq * 4.0 / (double) value;
    double factor = dots ? (2.0 - 1.0 / std::pow (2.0, dots)) : 1.0;
    out = (long) std::lround (base * factor);
    return true;
}

inline int nearestMidi (int semitone, int reference, int octaveShift)
{
    int k = (int) std::lround ((reference - semitone) / 12.0);
    return semitone + 12 * k + 12 * octaveShift;
}

inline int aboveMidi (int semitone, int reference, int octaveShift)
{
    int k = (int) std::ceil ((reference - semitone) / 12.0);
    return semitone + 12 * k + 12 * octaveShift;
}

struct Spec { std::string signs, accidentals, octave; char letter; };

inline int resolve (const Spec& s, int ref, bool stackUp)
{
    int semitone = pitchClass (s.letter) + accidentalShift (s.accidentals);
    int shift = (int) std::count (s.signs.begin(), s.signs.end(), '+')
              - (int) std::count (s.signs.begin(), s.signs.end(), '-');
    if (! s.octave.empty())
        return (std::stoi (s.octave) + 1) * 12 + semitone + 12 * shift;
    return stackUp ? aboveMidi (semitone, ref, shift) : nearestMidi (semitone, ref, shift);
}
} // namespace detail

inline ParseResult parseNoteEntry (const std::string& textIn, int ppq = 480,
                                   int defaultOctave = 4, int defaultDuration = 4)
{
    using namespace detail;
    ParseResult res;

    // Collapse spaces inside [ ... ] so "[C E G]" is one token.
    std::string text;
    bool inBracket = false;
    for (char c : textIn)
    {
        if (c == '[') inBracket = true;
        else if (c == ']') inBracket = false;
        if (inBracket && c == ' ') continue;
        text += c;
    }

    const std::regex durRe (R"(^(\d+)(\.*)$)");
    const std::regex chordRe (R"(^(\d+\.*)?\[([^\]]*)\](~?)$)");
    const std::regex noteRe (R"(^(\d+\.*)?([+-]*)([A-Ga-g])([#sbx]*)(-?\d+)?(~?)$)");
    const std::regex specRe (R"(([+-]*)([A-Ga-g])([#sbx]*)(-?\d+)?)");

    long tick = 0;
    int curValue = defaultDuration, curDots = 0;
    int reference = (defaultOctave + 1) * 12;
    bool havePrev = false;
    int prevMidi = 0;
    std::map<int, int> pending;  // pitch -> index in res.notes

    auto fail = [&] (const std::string& msg) { res.ok = false; res.error = msg; return res; };

    auto setDurFrom = [&] (const std::string& d) {
        std::smatch m;
        if (std::regex_match (d, m, durRe)) { curValue = std::stoi (m[1]); curDots = (int) m[2].length(); }
    };

    auto applyGroup = [&] (const std::vector<Spec>& specs, bool tie, const std::string& tok) -> bool {
        long length;
        if (! durationTicks (curValue, curDots, ppq, length)) { fail ("bad note value in " + tok); return false; }
        int ref = havePrev ? prevMidi : reference;
        std::vector<int> midis;
        for (size_t i = 0; i < specs.size(); ++i)
        {
            int midi = resolve (specs[i], ref, i > 0);
            if (midi < 0 || midi > 127) { fail ("note out of MIDI range in " + tok); return false; }
            midis.push_back (midi);
            ref = midi;
        }
        std::map<int, int> covering;
        for (int midi : midis)
        {
            auto it = pending.find (midi);
            if (it != pending.end())
            {
                res.notes[(size_t) it->second].durationTick += length;
                covering[midi] = it->second;
            }
            else
            {
                res.notes.push_back ({ midi, tick, length });
                covering[midi] = (int) res.notes.size() - 1;
            }
        }
        for (auto& kv : pending)
            if (std::find (midis.begin(), midis.end(), kv.first) == midis.end())
                { fail ("tie not continued at " + tok); return false; }
        pending = tie ? covering : std::map<int, int>{};
        tick += length;
        prevMidi = midis.front();
        havePrev = true;
        return true;
    };

    std::regex ws (R"(\s+)");
    std::sregex_token_iterator it (text.begin(), text.end(), ws, -1), end;
    for (; it != end; ++it)
    {
        std::string tok = *it;
        if (tok.empty() || tok == "|") continue;

        std::smatch m;
        if (std::regex_match (tok, m, durRe))
        {
            long tmp;
            curValue = std::stoi (m[1]); curDots = (int) m[2].length();
            if (! durationTicks (curValue, curDots, ppq, tmp)) return fail ("bad note value: " + tok);
            continue;
        }
        if (tok == "r" || tok == "R")
        {
            if (! pending.empty()) return fail ("tie not continued before rest");
            long length; durationTicks (curValue, curDots, ppq, length); tick += length;
            continue;
        }
        if (std::regex_match (tok, m, chordRe))
        {
            if (m[1].matched) setDurFrom (m[1]);
            std::string inner = m[2];
            std::vector<Spec> specs;
            std::string reconstructed;
            for (std::sregex_iterator si (inner.begin(), inner.end(), specRe), se; si != se; ++si)
            {
                auto sm = *si;
                specs.push_back ({ sm[1], sm[3], sm[4], std::string (sm[2]).empty() ? '?' : std::string (sm[2])[0] });
                reconstructed += sm.str();
            }
            if (specs.empty() || reconstructed != inner) return fail ("bad chord: " + tok);
            if (! applyGroup (specs, m[3].matched && m[3].length() > 0, tok)) return res;
            continue;
        }
        if (std::regex_match (tok, m, noteRe))
        {
            if (m[1].matched) setDurFrom (m[1]);
            Spec s { m[2], m[4], m[5].matched ? std::string (m[5]) : std::string(), std::string (m[3])[0] };
            if (! applyGroup ({ s }, m[6].matched && m[6].length() > 0, tok)) return res;
            continue;
        }
        return fail ("unrecognized token: " + tok);
    }

    if (! pending.empty()) return fail ("unresolved tie at end of input");
    return res;
}

} // namespace ped
