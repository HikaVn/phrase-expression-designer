# Architecture

## Guiding principle

**Separate performance intent from instrument-specific mapping.** Intent
(`intensity`, `timbre`, `vibratoDepth`, ...) is stored as normalized `0.0–1.0`
curves. Instrument-specific CC values, keyswitch notes, and velocity rules live
only in `InstrumentProfile`s and are produced on export.

## Layers

```
cli           ── user commands (argparse); orchestrates the layers below
  │
engine        ── intent → MIDI: expression_mapper, rule_engine, templates, smoothing
  │
midi          ── mido-backed reader/writer + tick-based event records
  │
profiles      ── instrument-specific: profile, articulation, calibration, validation
  │
core          ── DAW-independent musical data: note, phrase, track, project, curve, pitch
```

Dependency direction points **downward only**: `core` imports nothing from the
other layers; `engine` may use `core`, `profiles`, and `midi`; `cli` may use all.
Keep DAW-specific and library-specific knowledge out of `core`.

## Module map

| Module | Responsibility |
| --- | --- |
| `core/pitch.py` | Note name ⇄ MIDI number, C3=60 / C4=60 conventions |
| `core/note.py` | `Note` (tick timing, pitch, velocity, articulation ref) |
| `core/phrase.py` | `Phrase` (tick range that shares shaping) |
| `core/curve.py` | `ExpressionCurve` / `CurvePoint`, interpolation + sampling |
| `core/track.py` | `Track` (notes + curves + phrases) |
| `core/project.py` | `Project` (ppq, tempo map, tracks) + JSON load/save |
| `profiles/calibration.py` | `CalibrationCurve`: intent 0–1 → CC 0–127 |
| `profiles/articulation.py` | `Articulation`, `Trigger`, `CCMapping` |
| `profiles/instrument_profile.py` | `InstrumentProfile` + JSON load/save |
| `profiles/pitch_compat.py` | Resolve a keyswitch trigger to a MIDI note |
| `profiles/validation.py` | Profile checks (errors vs warnings) |
| `midi/events.py` | `CCEvent`, `KeyswitchEvent` (tick-based) |
| `midi/reader.py` | SMF → `Project` |
| `midi/writer.py` | `Project` + events → SMF (timing preserved) |
| `engine/expression_mapper.py` | Curves → CC events via calibration |
| `engine/rule_engine.py` | Notes/articulations → keyswitch events |
| `engine/templates.py` | Named intent shapes (swell, arch, ...) |
| `engine/smoothing.py` | One-pole low-pass for CC streams |
| `cli/main.py` | The `ped` command |

## Export data flow

1. Load `Project` (from JSON or via `read_midi`) and the `InstrumentProfile`.
2. For each track, for each `CCMapping` in the profile:
   - find the matching `ExpressionCurve` (`internalParameter == curve.parameter`),
   - sample it across the track tick span,
   - map each sample through the referenced `CalibrationCurve` → CC 0–127,
   - optionally smooth, drop consecutive duplicates → `CCEvent`s.
3. Generate `KeyswitchEvent`s from each note's `articulationId` (latch vs momentary).
4. `write_midi` merges notes (unchanged) + CC + keyswitches by absolute tick.

## Key design decisions (and why)

- **`ppq` lives on `Project`.** The spec's data sketch omitted it, but tick
  timing is meaningless without ticks-per-quarter, and MIDI round-trip needs it.
- **`CurvePoint.shape` describes the segment *leaving* the point.** Interpolation
  between `p[i]` and `p[i+1]` uses `p[i].shape`. Simple and order-independent.
- **Calibration is piecewise-linear for now.** True monotone-cubic
  ("monotonic") is a TODO; piecewise-linear over monotonic nodes is already
  monotonic and clamped to 0–127.
- **Writer refuses to overwrite its declared input.** Safety rule from the spec.
