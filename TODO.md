# TODO

Tracks what is intentionally unfinished after the v0.1.0 core, plus open
decisions. Update this in the same change that resolves an item.

## Decisions made in v0.1.0 (were "未決事項" in the spec)

- **Language: Python** for the prototype core (per spec §14/§27). Revisit for
  GUI/plugin (JUCE/C++ or Swift) once the core is stable.
- **MIDI library: `mido`** — standard, simple, test-friendly.
- **`ppq` added to `Project`** — required to interpret ticks / round-trip MIDI.
- **`CurvePoint.shape` = the segment leaving the point.**
- **Calibration interpolation is piecewise-linear** even when labeled
  `"monotonic"`.

## Still open (decisions)

- Confirm Python as the long-term core language vs. early port.
- GUI stack: SwiftUI vs JUCE.
- First real (named) instrument library to target.
- Logic Articulation Set output format.
- Cubase Expression Map output format.
- Profile sharing format / signing of community profiles.
- License (currently "TBD" in `pyproject.toml`; README says all-rights-reserved
  until chosen).
- AI-assist: local vs external API.

## Core gaps / next implementation

- [ ] **Bar:beat ranges** in `apply-template` (currently ticks only). Needs
      tempo + time-signature interpretation.
- [ ] **`lookAheadMs`** is parsed and stored but not applied in the mapper.
- [ ] **True monotone-cubic** calibration interpolation (Fritsch–Carlson).
- [ ] **Phrase Painter**: drive multiple derived curves (CC1/CC11/vibrato/timbre)
      from a single intent line, with per-target delay/shaping (spec §9.2).
- [ ] **Expression Macros** (spec §9.3): named multi-parameter presets beyond the
      single-curve templates.
- [ ] **Performance Rule Engine** beyond keyswitching (spec §9.8): long→CC vs
      short→Velocity, legato connection smoothing, phrase-end release, strong-beat
      attack, slur re-attack suppression, rest-based phrase detection.
- [ ] **Velocity rules** from `expressionBehavior` (currently informational only).
- [ ] **`cc` / `program_change` triggers** in the rule engine (only `keyswitch`
      is generated today).
- [ ] **Calibration Assistant** (spec §9.5): manual ppp..fff entry helper; later,
      audio-analysis calibration.
- [ ] **JSON Schema files** for project + profile, plus a `validate-project` cmd.
- [ ] **Time signature** in the data model (only tempo map exists).
- [ ] More instrument profiles (CSS-style, Spitfire-style) under `examples/`.

## Tooling / project

- [ ] CI (run `pytest` on push) — for Codex phase.
- [ ] Linter/formatter config (ruff/black) if desired.
- [ ] Type-checking (mypy) pass; type hints are already present.

## Notes for the Codex phase

- Keep intent ↔ instrument-mapping separation intact (the core rule).
- Do not start AU/VST/GUI before the above core gaps are addressed.
- Every change touching CC values, note timing, or keyswitch placement needs a
  test.
