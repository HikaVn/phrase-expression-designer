# AU / VST3 Plugin (MIDI FX)

A real-time companion to the Python authoring tool, built with **JUCE** so one
codebase produces **AU** (Logic Pro), **VST3** (Cubase, Studio One, REAPER,
Live), and a **Standalone** app. It is a **MIDI effect**: place it *before* an
instrument; it converts intent parameters into the CC and articulation switches
the loaded Instrument Profile prescribes, and passes incoming MIDI through.

> Status: **scaffold + tested core**. The pure-math C++ core is unit-tested and
> matches the Python implementation exactly. The JUCE wrapper compiles against
> JUCE 8 with the steps below, but is **not built or DAW-tested in this repo's
> CI** (no JUCE SDK / Xcode in the sandbox). Build and validate it on a machine
> with Xcode.

## Layout

```
plugin/
  CMakeLists.txt              JUCE plugin (AU + VST3 + Standalone) + CTest
  Source/
    PedCore/
      Curve.h                 ExpressionCurve eval (JUCE-free)  — port of ped.core.curve
      Calibration.h           CalibrationCurve map (JUCE-free)  — port of ped.profiles.calibration
      Profile.h / Profile.cpp Profile JSON loader (uses juce::JSON)
    PluginProcessor.{h,cpp}   MIDI FX: intent params -> CC, articulation switches
    PluginEditor.{h,cpp}      Sliders (intensity/timbre/vibrato), articulation, Load Profile
  tests/
    test_pedcore.cpp          Parity test vs the Python reference values
```

`Curve.h` and `Calibration.h` are intentionally dependency-free so the core
algorithms can be tested without JUCE — and so parity with the Python core is
verifiable. Only `Profile.*` and the plugin classes pull in JUCE.

## How it works

- Three intent values — `intensity`, `timbre`, `vibratoDepth` (0.0–1.0) — drive
  the output. Each can be set two ways:
  - **Host/editor**: the matching plugin parameter (automation or a knob), or
  - **Live input CC**: if the profile's mapping has an `inputCc` (e.g. `1` =
    mod wheel), the plugin reads that incoming controller as the intent. Once an
    assigned input CC arrives it takes over from the knob.
- On load, an Instrument Profile JSON (the same files the `ped` tool uses) is
  parsed. For each parameter mapped to an output CC, the intent is pushed through
  the profile's **calibration curve** and emitted as that CC — only when the
  integer value changes, to keep the stream compact.
- **Real-time smoothing**: each output is run through a one-pole low-pass using
  the mapping's `smoothingMs`, so live controller jumps come out as smooth CC
  ramps. (See `PedCore/Smoothing.h`, unit-tested for parity with the Python
  `one_pole`.)
- Input CCs assigned via `inputCc` are **consumed** (not passed through); the
  calibrated output replaces them. All other incoming MIDI — your notes, other
  controllers — passes through unchanged.
- An `Articulation` index parameter taps the selected articulation's trigger
  (keyswitch note / CC / program change).

This mirrors the offline `export-midi` path, so a profile behaves the same
whether you render CC offline in Python or play it live in the DAW.

### Why there is no real-time `lookAhead`

The offline mapper supports `lookAheadMs` (CC anticipates a curve by reading
*ahead* in time). Live, that is impossible without delaying output — you cannot
read a controller value the performer has not moved yet (**causality**). So the
plugin applies `smoothingMs` but ignores `lookAheadMs`; anticipation stays an
offline-only feature.

## Build

Requires CMake ≥ 3.22 and a C++17 toolchain (Xcode on macOS). JUCE is fetched
automatically on first configure (needs network), pinned to 8.0.4.

```bash
cd plugin
cmake -B build -G Xcode            # or: cmake -B build (Makefiles/Ninja)
cmake --build build --config Release
ctest --test-dir build             # runs the PedCore parity test
```

To use a local JUCE checkout instead of fetching, edit `CMakeLists.txt` (see the
comment near `FetchContent`).

### Run just the parity test (no JUCE / CMake)

```bash
clang++ -std=c++17 -I plugin/Source plugin/tests/test_pedcore.cpp -o /tmp/pedcore_test
/tmp/pedcore_test
```

## Install (macOS)

The build copies formats to the standard folders:

- AU: `~/Library/Audio/Plug-Ins/Components/`
- VST3: `~/Library/Audio/Plug-Ins/VST3/`

In Logic, add it as a **MIDI FX** on an instrument track (it appears under the
manufacturer "HikaVn"). In Cubase/Studio One/REAPER, insert the VST3 as a MIDI
insert before the instrument.

## Parity with the Python core

`tests/test_pedcore.cpp` asserts the C++ port reproduces the Python reference
values for: monotone-cubic and linear calibration mapping (including decreasing
curves and 0–127 clamping) and ExpressionCurve linear/smooth/hold evaluation.
When you change a core algorithm in Python, update both ports and both tests.

## Current limitations / next steps

- Not yet built or validated inside Logic/Cubase in this repo — do that locally.
- Input-CC source + real-time `smoothingMs` are implemented; `lookAheadMs` is
  offline-only by design (see above).
- Per-note performance rules (velocity shaping, legato overlap) are offline-only
  for now; the plugin focuses on CC + articulation switching.
- Input-CC assignment is profile-driven (`inputCc`); a UI to re-assign it live
  (MIDI-learn) would be a nice addition.
- Manufacturer/plugin codes in `CMakeLists.txt` are placeholders; set your own.
