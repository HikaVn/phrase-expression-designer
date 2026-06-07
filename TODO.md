# TODO

Tracks decisions and remaining work. Update this in the same change that
resolves an item.

## Decisions made

- **Language: Python** for the prototype core (per spec §14/§27). Revisit for
  GUI/plugin (JUCE/C++ or Swift) once the core is stable.
- **MIDI library: `mido`** — standard, simple, test-friendly.
- **`ppq` + `timeSignatureMap` on `Project`** — required to interpret ticks,
  bar:beat positions, and round-trip MIDI.
- **`CurvePoint.shape` = the segment leaving the point.**
- **Calibration `monotonic`** now uses Fritsch–Carlson monotone cubic; `linear`
  uses piecewise-linear.
- **License: still TBD** (`pyproject.toml` says "TBD"; README says
  all-rights-reserved until chosen).

## Done since v0.1.0

- [x] Bar:beat ranges in `apply-template` / `apply-macro` (`--start-pos/--end-pos`).
- [x] Time signatures in the data model + MIDI read/write (`core/musictime.py`).
- [x] `lookAheadMs` applied in the expression mapper.
- [x] True monotone-cubic calibration interpolation.
- [x] Phrase Painter (`engine/phrase_painter.py`, `ped paint-phrase`).
- [x] Expression Macros (`engine/macros.py`, `ped apply-macro`).
- [x] Performance Rule Engine (`engine/performance.py`): rest-based phrase
      detection, velocity-from-intensity for short articulations, downbeat accent,
      phrase-end release, legato/slur softening (`ped export-midi --perform`).
- [x] Velocity rules from `expressionBehavior` (velocityRole).
- [x] `cc` and `program_change` articulation triggers (`generate_articulation_events`).
- [x] Calibration Assistant — manual ppp..fff table (`ped calibrate`).
- [x] JSON Schema files (`schema/`) + `ped validate-project`.
- [x] More example profiles (CSS-style, Spitfire-style).
- [x] CI (GitHub Actions), ruff, mypy.

## Still open (decisions)

- Confirm Python as the long-term core language vs. early port.
- GUI stack: SwiftUI vs JUCE.
- First real (named) instrument library to target.
- Logic Articulation Set output format.
- Cubase Expression Map output format.
- Profile sharing format / signing of community profiles.
- License choice.
- AI-assist: local vs external API.

## Done (DAW integration + plugin scaffold)

- [x] Logic Articulation Set + Cubase Expression Map exporters
      (`ped export-articulations`, `ped/exporters/`).
- [x] Decreasing monotone-cubic calibration verified + tested.
- [x] Note-level legato overlap shaping (`apply_legato_overlap`).
- [x] Per-mapping CC sampling resolution override (`stepTick` on CCMapping).
- [x] Auto-calibration framework: invert a measured CC→loudness response
      (`build_from_measurements`, `ped calibrate-auto`).
- [x] **AU/VST3 MIDI FX plugin scaffold** (JUCE, `plugin/`): JUCE-free C++ core
      port (Curve/Calibration) **unit-tested for parity with Python**, profile
      JSON loader, PluginProcessor (intent→CC + articulation switching),
      PluginEditor, CMake (AU+VST3+Standalone). See docs/PLUGIN.md.

## Remaining future work

- [x] **Build the plugin locally** — AU/VST3/Standalone built (CMake+Ninja, CLT
      only, no full Xcode) and the **AU passes `auval`** (`AU VALIDATION
      SUCCEEDED`). Installed to `~/Library/Audio/Plug-Ins`. See docs/PLUGIN.md.
- [x] **Headless runtime test** (`plugin/tests/test_processor.cpp`, `ctest`):
      drives `processBlock` and verifies input-CC→calibrated-CC, passthrough, and
      keyswitch tap/release in the real plugin code (no DAW).
- [ ] **Play-test in Logic/Cubase**: load a real instrument, drive intent live
      (mod wheel → CC1), confirm articulation switching sounds right (needs a
      human + audio; can't be automated here).
- [x] Plugin: read *incoming* CC as the intent source (`inputCc` on a mapping)
      and apply `smoothingMs` in real time (one-pole, parity-tested). `lookAheadMs`
      is offline-only by design — real-time can't read the future (causality).
- [ ] Plugin: MIDI-learn UI to assign `inputCc` live (currently profile-driven).
- [ ] **Audio decode/level extraction** for `calibrate-auto` — real RMS/LUFS from
      rendered audio (CC sweep + analysis). Inversion framework is done; only the
      audio front-end remains. Out of MVP per spec §11.2.
- [ ] Refine exported Logic/Cubase maps toward exact, version-specific schemas.
- [ ] Standalone GUI app (Roadmap v0.2): note/curve/CC visual editing.
- [ ] License decision (still TBD) — release blocker for any external use.

## Notes for the Codex phase

- Keep intent ↔ instrument-mapping separation intact (the core rule).
- Do not start AU/VST/GUI before the remaining core items above are addressed.
- Every change touching CC values, note timing, or keyswitch placement needs a
  test. Keep `ruff check`, `mypy`, and `pytest` green (CI enforces all three).
