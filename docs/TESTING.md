# Testing

```bash
python -m pytest          # full suite (currently 44 tests)
python -m pytest -k pitch # a subset
```

## What is covered

| Area | File |
| --- | --- |
| Curve interpolation, clip, sampling | `tests/test_curve.py` |
| Calibration mapping, clamping, monotonicity | `tests/test_calibration.py` |
| C3=60 / C4=60 conversion | `tests/test_pitch.py` |
| Profile JSON load/save | `tests/test_profile.py` |
| Profile validation (errors vs warnings) | `tests/test_validation.py` |
| MIDI round-trip + CC/keyswitch writing | `tests/test_midi_roundtrip.py` |
| Expression mapper, keyswitch engine, templates | `tests/test_engine.py` |

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
