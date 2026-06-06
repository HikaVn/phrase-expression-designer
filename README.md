# Phrase Expression Designer

A DAW-independent **expression-design** tool for strings and sustained virtual
instruments. You describe *performance intent* — intensity, timbre, vibrato,
attack, phrase flow — and the tool converts it into MIDI CC, velocity, and
keyswitches through per-instrument **profiles**.

> This is **not** a CC editor. It absorbs each library's quirks and stores
> performance intent in a reusable, instrument-independent form. When you swap
> libraries, you swap the profile — not your musical intent.

Status: **v0.1.0 — Python core + CLI (MVP)**. No GUI / AU / VST yet; see
[docs/ROADMAP.md](docs/ROADMAP.md).

## Why

DAWs let you draw CC1/CC11/CC21 directly, but every library means something
different by the same CC value, hand-drawing curves is tedious, and the work
doesn't transfer when you change instruments. Here you draw intent once; the
Instrument Profile maps it to whatever a given library expects.

## Install

```bash
python -m pip install -e .          # core + CLI (requires Python 3.10+, mido)
python -m pip install -e ".[dev]"   # plus pytest
```

## Quick start

```bash
# 1. Inspect a MIDI file
ped inspect-midi examples/midi/simple_phrase.mid

# 2. Import MIDI into a project, attaching an instrument profile id
ped import-midi examples/midi/simple_phrase.mid \
    --profile example_kontakt_strings_vln1 -o my.project.json

# 3. Paint a phrase with an expression template (ticks)
ped apply-template natural_swell --project my.project.json --track "Violin 1"

# 4. Export MIDI with generated CC + keyswitches
ped export-midi --project my.project.json \
    --profile examples/profiles/example_kontakt_strings_vln1.json -o my.out.mid

# Validate a profile any time
ped validate-profile examples/profiles/example_kontakt_strings_vln1.json
```

## How it fits together

```
MIDI ──read──▶ Project (Notes, Tracks)
                  │  + ExpressionCurves (intent, 0.0–1.0)
                  ▼
        InstrumentProfile (CC mappings + calibration curves + articulations)
                  │
                  ▼
        engine: curves ─▶ CalibrationCurve ─▶ CC events
                notes/articulations ─▶ Keyswitch events
                  │
                  ▼
MIDI ◀─write── notes (unchanged) + CC + keyswitches
```

## Library / package layout

```
src/ped/
  core/      DAW-independent data: note, phrase, track, project, curve, pitch
  profiles/  instrument_profile, articulation, calibration, validation
  midi/      reader, writer, events  (mido)
  engine/    expression_mapper, rule_engine, templates, smoothing
  cli/       main  (the `ped` command)
```

## Tests

```bash
python -m pytest
```

## Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — layering and data flow
- [docs/DATA_FORMAT.md](docs/DATA_FORMAT.md) — JSON schemas for project & profile
- [docs/KONTAKT_PROFILE.md](docs/KONTAKT_PROFILE.md) — writing Kontakt profiles
- [docs/LOGIC_INTEGRATION.md](docs/LOGIC_INTEGRATION.md) — Logic Pro workflow
- [docs/TESTING.md](docs/TESTING.md) — test strategy
- [docs/ROADMAP.md](docs/ROADMAP.md) — versions and milestones
- [TODO.md](TODO.md) — what's intentionally unfinished
- [CLAUDE.md](CLAUDE.md) / [AGENTS.md](AGENTS.md) — instructions for coding agents

## License

To be decided (see [TODO.md](TODO.md)). Until then, treat as all-rights-reserved
by the author.
