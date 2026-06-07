# AU / VST3 Plugin (MIDI FX)

A real-time companion to the Python authoring tool, built with **JUCE** so one
codebase produces **AU** (Logic Pro), **VST3** (Cubase, Studio One, REAPER,
Live), and a **Standalone** app. It is a **MIDI effect**: place it *before* an
instrument; it converts intent parameters into the CC and articulation switches
the loaded Instrument Profile prescribes, and passes incoming MIDI through.

> Status: **builds and passes Audio Unit validation**. All three formats (AU,
> VST3, Standalone) have been built locally on macOS (Apple Silicon) and the AU
> passes `auval` (`AU VALIDATION SUCCEEDED`). Notably this worked with **Command
> Line Tools only — full Xcode was not required**. CI builds only the JUCE-free
> C++ core (`pedcore_test`); the full JUCE build is done locally as below.
> Still to do by you: open it in Logic/Cubase and play through a real instrument.

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

## Build (verified steps)

Requires CMake ≥ 3.22, Ninja, and a C++17 toolchain. **Command Line Tools are
enough** (full Xcode not required); the Xcode CMake generator does need full
Xcode, so use Ninja. JUCE is fetched automatically on first configure (needs
network), pinned to 8.0.4.

```bash
# from the repo root. If you don't have cmake/ninja:
python3 -m pip install cmake ninja        # quick way to get both

cmake -S plugin -B plugin/build -G Ninja -DCMAKE_BUILD_TYPE=Release   # configure (fetches JUCE)
ctest --test-dir plugin/build                                         # runs both tests below

# build the formats you want (or all by building the default target)
cmake --build plugin/build --target PhraseExpressionDesigner_VST3
cmake --build plugin/build --target PhraseExpressionDesigner_AU
cmake --build plugin/build --target PhraseExpressionDesigner_Standalone
```

Artefacts land in
`plugin/build/PhraseExpressionDesigner_artefacts/Release/{AU,VST3,Standalone}/`.

To use a local JUCE checkout instead of fetching, edit `CMakeLists.txt` (see the
comment near `FetchContent`).

### Run just the parity test (no JUCE / CMake)

```bash
clang++ -std=c++17 -I plugin/Source plugin/tests/test_pedcore.cpp -o /tmp/pedcore_test
/tmp/pedcore_test
```

## Install & validate (macOS)

The build **auto-installs** AU + VST3 to the user plug-in folders
(`COPY_PLUGIN_AFTER_BUILD` in `CMakeLists.txt`), so a normal
`cmake --build … --target …_AU` (or `_VST3`) copies them to
`~/Library/Audio/Plug-Ins/{Components,VST3}` for you. (Standalone stays in
`build/`.) Validate the AU:

```bash
# type aumi = MIDI processor, subtype Ped1, manufacturer Hkvn
auval -v aumi Ped1 Hkvn      # expect: AU VALIDATION SUCCEEDED
```

To install manually instead (e.g. a Release artefact from elsewhere), `ditto`
the bundle into the same folders.

In **Logic**, add it as a **MIDI FX** on an instrument track (it is a MIDI
processor, manufacturer "HikaVn"). In **Cubase/Studio One/REAPER**, insert the
VST3 as a MIDI insert *before* the instrument. The Standalone `.app` runs with no
install for a quick GUI smoke test.

## Iterating (what needs a restart)

A plugin is a dynamic library the host loads into its own process, so the rules
differ by what you changed:

- **Edited a profile JSON** → no restart. Click **Reload** in the plugin UI to
  re-read the current file (or **Load Profile…** to pick another).
- **Moved a parameter / automation** → real-time, nothing to do.
- **Rebuilt the plugin (C++)** → the host still holds the old binary in memory,
  so **quit and reopen Logic/Cubase** to pick up the new build. For a fast loop,
  test the **Standalone `.app`** instead (same engine, just relaunch the app).
- If a rebuild isn't picked up (stale AU cache):
  `killall -9 AudioComponentRegistrar; rm -rf ~/Library/Caches/AudioUnitCache`,
  then relaunch.

## Tests

Two `ctest` tests (run via `ctest --test-dir plugin/build`):

- **`pedcore_test`** (no JUCE) — asserts the C++ core reproduces the Python
  reference values: monotone-cubic and linear calibration (incl. decreasing
  curves and 0–127 clamping), ExpressionCurve linear/smooth/hold, and the
  one-pole smoother. This is the one the GitHub CI builds (via `c++` directly).
- **`processor_test`** (links JUCE + the plugin code) — a headless host test:
  it constructs `PedAudioProcessor`, drives `processBlock` with crafted MIDI,
  and checks the real-time behavior — input CC1 → calibrated output CC1 (raw
  input consumed), non-input CC and notes pass through, and an articulation
  change taps + releases its keyswitch. Run locally; not in CI (needs full JUCE
  incl. GUI modules).

When you change a core algorithm in Python, update both C++ ports and the tests.

## Current limitations / next steps

- Not yet built or validated inside Logic/Cubase in this repo — do that locally.
- Input-CC source + real-time `smoothingMs` are implemented; `lookAheadMs` is
  offline-only by design (see above).
- Per-note performance rules (velocity shaping, legato overlap) are offline-only
  for now; the plugin focuses on CC + articulation switching.
- Input-CC assignment is profile-driven (`inputCc`); a UI to re-assign it live
  (MIDI-learn) would be a nice addition.
- Manufacturer/plugin codes in `CMakeLists.txt` are placeholders; set your own.
