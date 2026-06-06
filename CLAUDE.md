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

## Current State (v0.1.0)

Python prototype implemented and tested (`python -m pytest`, 44 tests green):

- Core data models: Note, Phrase, Track, Project, ExpressionCurve.
- Curve interpolation: linear / smooth / hold, with clip + sampling.
- CalibrationCurve: normalized 0.0-1.0 -> CC 0-127 (piecewise-linear).
- InstrumentProfile + Articulation + CCMapping with JSON load/save.
- C3=60 / C4=60 note-naming handling (`ped.core.pitch`).
- Profile validation (errors vs warnings).
- MIDI read/write via `mido`, note timing preserved, input-overwrite guard.
- Expression mapper (curves -> CC) + keyswitch rule engine.
- Templates: natural_swell, decrescendo, phrase_arch, soft_entry,
  breath_ending, delayed_vibrato.
- CLI: `ped inspect-midi | import-midi | validate-profile | apply-template | export-midi`.

See `TODO.md` for what is intentionally unfinished.

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
