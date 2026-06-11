# AGENTS.md

## Project

Phrase Expression Designer is a notation, piano roll, and expression-curve based tool for generating performance control data for string and sustained virtual instruments.

## Repository Source of Truth

- Treat the current `master` branch as the source of truth.
- Ignore the old `master` backup branch created before the browser prototype overwrite.
- Do not restore, merge, or use the old backup content as reference material unless the user explicitly asks for it.

## Core Principles

- Separate score position from actual performance timing.
- Separate musical intent from instrument-specific MIDI controls.
- Keep internal expression parameters independent from concrete MIDI CC numbers.

## Initial Targets

1. EastWest Opus / Hollywood Strings
2. 8Dio Century Strings
3. Logic Preset Strings

## Do Not

- Do not edit Logic project files directly.
- Do not edit Opus internal files.
- Do not edit Kontakt internal files.
- Do not automate plugin GUI clicks.
- Do not implement voices in MVP.
- Do not store CC values as the primary musical intent.
- Do not change unchecked properties during batch apply.

## MVP Priorities

1. MIDI import/export
2. Notation-style input
3. Piano roll with score/performance timing separation
4. Expression curves
5. Instrument Profiles
6. Opus Wizard
7. Kontakt/8Dio Wizard
8. Logic Preset Wizard
9. Property batch apply with checkboxes
10. Validation and Setup Reports
