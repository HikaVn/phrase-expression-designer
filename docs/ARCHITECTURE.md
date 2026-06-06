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
| `core/musictime.py` | `TimeSignature`, bar:beat ⇄ tick conversion |
| `core/note.py` | `Note` (tick timing, pitch, velocity, articulation ref) |
| `core/phrase.py` | `Phrase` (tick range that shares shaping) |
| `core/curve.py` | `ExpressionCurve` / `CurvePoint`, interpolation + sampling |
| `core/track.py` | `Track` (notes + curves + phrases) |
| `core/project.py` | `Project` (ppq, tempo + time-signature maps, tracks) + JSON I/O |
| `core/report.py` | Shared `Issue` / `ValidationReport` (errors vs warnings) |
| `profiles/calibration.py` | `CalibrationCurve`: intent 0–1 → CC 0–127 (linear / monotone-cubic) |
| `profiles/calibration_assistant.py` | Build a calibration curve from a ppp…fff table |
| `profiles/articulation.py` | `Articulation`, `Trigger`, `CCMapping` |
| `profiles/instrument_profile.py` | `InstrumentProfile` + JSON load/save |
| `profiles/pitch_compat.py` | Resolve a keyswitch trigger to a MIDI note |
| `profiles/validation.py` | Profile checks |
| `project_checks.py` | Project-level checks (structure + cross-refs), top layer |
| `midi/events.py` | `CCEvent`, `KeyswitchEvent`, `ProgramChangeEvent` (tick-based) |
| `midi/reader.py` | SMF → `Project` (notes, tempo, time signatures) |
| `midi/writer.py` | `Project` + events → SMF (timing preserved) |
| `engine/expression_mapper.py` | Curves → CC events via calibration (+ lookAhead) |
| `engine/rule_engine.py` | Articulations → keyswitch / CC / program-change events |
| `engine/performance.py` | Phrase detection + velocity shaping rules (§9.8) |
| `engine/phrase_painter.py` | One intent line → several derived curves (§9.2) |
| `engine/macros.py` | Multi-parameter expression macros (§9.3) |
| `engine/templates.py` | Named single-parameter intent shapes (swell, arch, ...) |
| `engine/smoothing.py` | One-pole low-pass for CC streams |
| `cli/main.py` | The `ped` command |

`schema/` holds JSON Schema (draft 2020-12) for the project and instrument
profile formats; `validate-project` checks values, and the schema is enforced on
example profiles in the test suite.

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
