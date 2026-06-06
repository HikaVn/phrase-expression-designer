# Kontakt Profile Support

## Approach

We do **not** read, modify, or reverse-engineer Kontakt libraries. A profile is
an *external* description of what MIDI to send a given patch: keyswitches, CC
assignments, velocity roles, and the playable range. The library stays
untouched; we only generate well-formed MIDI for it.

## What a Kontakt profile covers

- Keyswitch note per articulation (latch or momentary)
- CC assignments (e.g. CC1 dynamics, CC11 expression, CC21 vibrato)
- Velocity role per articulation (primary/secondary)
- MIDI channel / program change (when relevant)
- `C3=60` / `C4=60` note naming
- Playable range, for keyswitch-collision checks

## What it deliberately avoids

- Editing Kontakt internal presets / `.nki` files
- Analyzing protected libraries
- GUI automation to "register" keyswitches
- Anything against a library's license

## The C3=60 / C4=60 trap

A manual may list "C0 = Legato", but `C0` is a different MIDI number depending
on the naming convention:

| Written | C3=60 (Yamaha/Logic/many Kontakt) | C4=60 (scientific) |
| --- | --- | --- |
| C0 | 24 | 12 |
| C3 | 60 | 36 |
| C4 | 72 | 60 |

Set `noteNaming` to match the manual. In a trigger, prefer the explicit `note`
(MIDI number) and keep `noteName` as documentation — the validator warns if they
disagree.

## Validation

`ped validate-profile <file>` checks:

- `note_naming_missing` / `note_naming_unknown`
- `keyswitch_duplicate` — two articulations on the same keyswitch note
- `keyswitch_range_collision` — a keyswitch lands inside the playable range
- `keyswitch_note_mismatch` (warning) — `note` ≠ resolved `noteName`
- `calibration_missing` — a CC mapping references an unknown calibration curve
- `cc_out_of_range` — CC number or calibration output outside 0–127
- `cc_unassigned` (warning) — profile defines no CC mappings

## Example

See [`examples/profiles/example_kontakt_strings_vln1.json`](../examples/profiles/example_kontakt_strings_vln1.json)
for a complete, valid profile (legato/sustain/spiccato keyswitches; CC1/CC11/CC21
mappings; three calibration curves).

## Future

- KSP helper-script generation (assist, not modify)
- Per-library profile packs
