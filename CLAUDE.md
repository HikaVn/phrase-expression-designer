# CLAUDE.md

## Role

You are helping develop **Phrase Expression Designer**, a DAW-independent core
tool for generating musical expression control data for string and sustained
virtual instruments.

## Goal

Build the core first. The core should allow users to describe musical
performance intent independently of any specific sound library, then map that
intent to MIDI CC, velocity, keyswitches, and articulation triggers through
Instrument Profiles.

## Key Concepts

- Performance intent is primary.
- Instrument-specific CC values are secondary.
- Instrument Profiles map normalized parameters to MIDI outputs.
- Kontakt support means external control profiles, not direct modification of
  Kontakt libraries.
- Logic support starts with MIDI export/import, not direct project editing.

## Current State

Python prototype implemented and tested (`pytest` 116 tests, `ruff` + `mypy`
clean; CI on 3.10–3.13):

- Core data models: Note, Phrase, Track, Project, ExpressionCurve; tempo +
  time-signature maps; bar:beat ⇄ tick (`core/musictime`).
- Curve interpolation: linear / smooth / hold, with clip + sampling.
- CalibrationCurve: normalized 0.0-1.0 -> CC 0-127, linear or Fritsch–Carlson
  monotone cubic; Calibration Assistant builds curves from ppp…fff tables.
- InstrumentProfile + Articulation + CCMapping with JSON load/save.
- C3=60 / C4=60 note-naming handling (`ped.core.pitch`).
- Profile validation + project validation; JSON Schema in `schema/`.
- MIDI read/write via `mido`, note timing preserved, input-overwrite guard,
  time signatures + program changes.
- Engine: expression mapper (curves -> CC, lookAhead, per-mapping stepTick),
  articulation rule engine (keyswitch / cc / program_change), performance rules
  (phrase detection, velocity shaping, note-level legato overlap), phrase
  painter, macros, single-parameter templates.
- Calibration: linear / monotone-cubic (increasing & decreasing); assistant
  builds curves from ppp…fff tables or by inverting a measured CC→loudness
  response.
- Exporters: Logic Articulation Set (.plist) + Cubase Expression Map.
- CLI: `inspect-midi | import-midi | validate-profile | validate-project |
  apply-template | apply-macro | paint-phrase | calibrate | calibrate-auto |
  export-articulations | export-midi`.

See `TODO.md` for what is intentionally unfinished: audio decode/level
extraction for calibrate-auto, exact DAW-schema refinement, and GUI/plugin
(deferred until the core is locked).

## Avoid

- AU/VST implementation before the core is stable.
- GUI automation.
- Direct Logic project editing.
- Direct Kontakt preset modification.
- Hard-coding one library's CC behavior into the core.
- Breaking note timing in MIDI output.

## Work Style

Make small, testable changes. Update docs and tests together. Keep
DAW-specific and instrument-specific logic out of `ped.core`.
