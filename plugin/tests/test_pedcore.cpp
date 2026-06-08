// Parity test for the PedCore C++ port. Reference values are produced by the
// Python implementation (see tests/ in the repo root) and hard-coded here.
//
// Build & run (no JUCE needed):
//   clang++ -std=c++17 -I plugin/Source plugin/tests/test_pedcore.cpp -o /tmp/pedcore_test && /tmp/pedcore_test
#include "PedCore/Calibration.h"
#include "PedCore/Curve.h"
#include "PedCore/NoteEntry.h"
#include "PedCore/Smoothing.h"

#include <cassert>
#include <cmath>
#include <cstdio>

using namespace ped;

static int failures = 0;

static void checkEq (long got, long want, const char* what)
{
    if (got != want) { std::printf ("FAIL %s: got %ld want %ld\n", what, got, want); ++failures; }
}

static void checkClose (double got, double want, const char* what)
{
    if (std::fabs (got - want) > 1e-6) { std::printf ("FAIL %s: got %g want %g\n", what, got, want); ++failures; }
}

static CalibrationCurve dynamicDefault()
{
    CalibrationCurve c;
    c.id = "d";
    c.points = { {0.0, 8}, {0.25, 35}, {0.5, 68}, {0.75, 96}, {1.0, 120} };
    c.interpolation = Interp::Monotonic;
    c.sortPoints();
    return c;
}

int main()
{
    // --- CalibrationCurve monotone cubic, parity with Python ---
    {
        auto c = dynamicDefault();
        // Python: [8,19,29,41,55,68,80,91,101,111,120] for x = 0.0..1.0 step 0.1
        const int want[11] = { 8, 19, 29, 41, 55, 68, 80, 91, 101, 111, 120 };
        for (int i = 0; i <= 10; ++i)
            checkEq (c.map (i / 10.0), want[i], "cubic.map");

        // monotonic non-decreasing + in range
        int prev = -1;
        for (double x = 0.0; x <= 1.0001; x += 0.02)
        {
            int v = c.map (x);
            assert (v >= prev);
            assert (v >= 0 && v <= 127);
            prev = v;
        }
    }

    // --- decreasing monotone cubic ---
    {
        CalibrationCurve c;
        c.points = { {0.0, 120}, {0.5, 60}, {1.0, 5} };
        c.interpolation = Interp::Monotonic;
        c.sortPoints();
        checkEq (c.map (0.0), 120, "dec.map0");
        checkEq (c.map (0.5), 60, "dec.map0.5");
        checkEq (c.map (1.0), 5, "dec.map1");
        int prev = 200;
        for (double x = 0.0; x <= 1.0001; x += 0.05) { int v = c.map (x); assert (v <= prev); prev = v; }
    }

    // --- linear calibration ---
    {
        CalibrationCurve c;
        c.points = { {0.0, 0}, {1.0, 127} };
        c.interpolation = Interp::Linear;
        c.sortPoints();
        checkEq (c.map (0.5), 64, "lin.map0.5"); // Python lin50 == 64
        checkEq (c.map (-5.0), 0, "lin.clampLo");
        checkEq (c.map (5.0), 127, "lin.clampHi");
    }

    // --- ExpressionCurve shapes, parity with Python ---
    {
        ExpressionCurve s;
        s.points = { {0, 0.0, Shape::Smooth}, {100, 1.0, Shape::Smooth} };
        checkClose (s.valueAt (25), 0.15625, "smooth25");
        checkClose (s.valueAt (50), 0.5, "smooth50");

        ExpressionCurve l;
        l.points = { {0, 0.0, Shape::Linear}, {100, 1.0, Shape::Linear} };
        checkClose (l.valueAt (25), 0.25, "lin25");

        ExpressionCurve h;
        h.points = { {0, 0.2, Shape::Hold}, {100, 0.8, Shape::Linear} };
        checkClose (h.valueAt (99), 0.2, "hold99");
        checkClose (h.valueAt (100), 0.8, "hold100");

        // clamp outside range
        checkClose (l.valueAt (-10), 0.0, "clampBefore");
        checkClose (l.valueAt (999), 1.0, "clampAfter");
    }

    // --- OnePole smoothing ---
    {
        OnePole f;
        f.reset (0.0);
        // dt=10ms, tau=40ms -> alpha = 1 - exp(-0.25) = 0.2211992...
        double v = f.process (1.0, 10.0, 40.0);
        checkClose (v, 1.0 - std::exp (-0.25), "onepole.firstStep");

        // converges toward the target, monotonically, never overshoots
        double prev = v;
        for (int i = 0; i < 200; ++i)
        {
            double cur = f.process (1.0, 10.0, 40.0);
            assert (cur >= prev - 1e-12);
            assert (cur <= 1.0 + 1e-9);
            prev = cur;
        }
        assert (std::fabs (prev - 1.0) < 1e-3);

        // smoothingMs <= 0 -> jump straight to target
        OnePole g;
        g.reset (0.0);
        checkClose (g.process (0.7, 10.0, 0.0), 0.7, "onepole.noSmoothing");
    }

    // --- NoteEntry parser parity (vs ped.note_entry) ---
    {
        auto pitches = [] (const char* s) {
            auto r = parseNoteEntry (s, 480);
            std::vector<int> out;
            for (auto& n : r.notes) out.push_back (n.pitch);
            return out;
        };
        auto eqVec = [&] (std::vector<int> got, std::vector<int> want, const char* what) {
            if (got != want) { std::printf ("FAIL %s\n", what); ++failures; }
        };
        eqVec (pitches ("C D E F G"), { 60, 62, 64, 65, 67 }, "entry.scale");
        eqVec (pitches ("[C E G]"), { 60, 64, 67 }, "entry.chord");
        eqVec (pitches ("[C B]"), { 60, 71 }, "entry.chordStackUp");
        eqVec (pitches ("[E C]"), { 64, 72 }, "entry.chordStackUp2");
        eqVec (pitches ("C5 C4 C3"), { 72, 60, 48 }, "entry.explicitOctave");

        {   // durations + start ticks
            auto r = parseNoteEntry ("4 C 2 D 4 E", 480);
            checkEq ((long) r.notes.size(), 3, "entry.count");
            checkEq (r.notes[1].durationTick, 960, "entry.halfDur");
            checkEq (r.notes[2].startTick, 1440, "entry.startTick");
        }
        {   // dotted
            auto r = parseNoteEntry ("4. C", 480);
            checkEq (r.notes[0].durationTick, 720, "entry.dotted");
        }
        {   // tie merges two quarters into one note
            auto r = parseNoteEntry ("4 C~ C", 480);
            checkEq ((long) r.notes.size(), 1, "entry.tieCount");
            checkEq (r.notes[0].durationTick, 960, "entry.tieDur");
        }
        {   // tied chord across a barline
            auto r = parseNoteEntry ("2 [C E G]~ | 2 [C E G]", 480);
            checkEq ((long) r.notes.size(), 3, "entry.tieChordCount");
            checkEq (r.notes[0].durationTick, 1920, "entry.tieChordDur");
        }
        {   // errors are returned, not thrown
            checkEq (parseNoteEntry ("C H D", 480).ok ? 1 : 0, 0, "entry.badToken");
            checkEq (parseNoteEntry ("4 C~ D", 480).ok ? 1 : 0, 0, "entry.badTie");
            checkEq (parseNoteEntry ("C10", 480).ok ? 1 : 0, 0, "entry.outOfRange");
        }
    }

    if (failures == 0) { std::printf ("PedCore parity: all checks passed\n"); return 0; }
    std::printf ("PedCore parity: %d failure(s)\n", failures);
    return 1;
}
