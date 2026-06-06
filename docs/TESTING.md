# Testing

```bash
python -m pytest          # full suite (116 tests)
python -m pytest -k pitch # a subset
ruff check src tests      # lint
mypy                      # type check
```

## What is covered

| Area | File |
| --- | --- |
| Curve interpolation, clip, sampling | `tests/test_curve.py` |
| Calibration mapping, clamping, monotonicity | `tests/test_calibration.py` |
| Monotone-cubic calibration (no overshoot) | `tests/test_calibration_cubic.py` |
| Decreasing monotone-cubic | `tests/test_calibration_decreasing.py` |
| Calibration Assistant (ppp…fff) | `tests/test_calibration_assistant.py` |
| Auto-calibration (measured response inversion) | `tests/test_calibration_auto.py` |
| Per-mapping CC sampling resolution | `tests/test_step_tick.py` |
| Legato note-overlap shaping | `tests/test_legato_overlap.py` |
| Logic/Cubase articulation exporters | `tests/test_exporters.py` |
| C3=60 / C4=60 conversion | `tests/test_pitch.py` |
| Bar:beat ⇄ tick, time signatures | `tests/test_musictime.py` |
| Time-signature MIDI round-trip | `tests/test_timesig_midi.py` |
| Profile JSON load/save | `tests/test_profile.py` |
| Profile validation | `tests/test_validation.py` |
| Project validation | `tests/test_project_checks.py` |
| Example profiles (validator + schema) | `tests/test_example_profiles.py` |
| JSON Schema files | `tests/test_schema.py` |
| MIDI round-trip + CC/keyswitch writing | `tests/test_midi_roundtrip.py` |
| Expression mapper, keyswitch engine, templates | `tests/test_engine.py` |
| lookAhead | `tests/test_lookahead.py` |
| Articulation triggers (keyswitch/cc/PC) | `tests/test_triggers.py` |
| Performance rules (phrases, velocity) | `tests/test_performance.py` |
| Phrase Painter + macros | `tests/test_painter_macros.py` |

Shared fixtures (example profile, sample MIDI) live in `tests/conftest.py`.

## Regression invariants for MIDI output

Exact byte-for-byte MIDI equality is not a goal. Instead we assert:

- note count unchanged,
- note start ticks unchanged,
- note durations unchanged,
- required CC present,
- all CC values within 0–127,
- keyswitches present where expected,
- no redundant consecutive duplicate CC values.

## Sample data

- `examples/profiles/example_kontakt_strings_vln1.json` — a valid profile.
- `examples/midi/simple_phrase.mid` — a 16-note, 4-bar phrase (ppq 480),
  generated with the project's own writer so it round-trips.

## When adding features

Add or update tests in the same change (see `AGENTS.md`). Any new core
transformation needs a unit test, especially anything touching CC values,
note timing, or keyswitch placement.
