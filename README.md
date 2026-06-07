# Phrase Expression Designer

A DAW-independent **expression-design** tool for strings and sustained virtual
instruments. You describe *performance intent* — intensity, timbre, vibrato,
attack, phrase flow — and the tool converts it into MIDI CC, velocity, and
keyswitches through per-instrument **profiles**.

> This is **not** a CC editor. It absorbs each library's quirks and stores
> performance intent in a reusable, instrument-independent form. When you swap
> libraries, you swap the profile — not your musical intent.

Status: **Python core + CLI** (feature-complete core) plus a **JUCE AU/VST3 MIDI
FX plugin scaffold** with a tested C++ core ([docs/PLUGIN.md](docs/PLUGIN.md)). No
GUI app yet; see [docs/ROADMAP.md](docs/ROADMAP.md).

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

# 3a. Paint a phrase with a single-parameter template (bar:beat or ticks)
ped apply-template natural_swell --project my.project.json --track "Violin 1" \
    --start-pos 1:1 --end-pos 5:1

# 3b. Or apply a multi-parameter macro, or expand one intent line into several
ped apply-macro cinematic_rise --project my.project.json --track "Violin 1"
ped paint-phrase --project my.project.json --track "Violin 1"   # intensity -> volume/vibrato/timbre

# 4. Export MIDI with generated CC + keyswitches (+ performance shaping)
ped export-midi --project my.project.json \
    --profile examples/profiles/example_kontakt_strings_vln1.json \
    -o my.out.mid --perform

# Validate, and build a calibration curve from measured dynamics
ped validate-profile examples/profiles/example_kontakt_strings_vln1.json
ped validate-project my.project.json --profile examples/profiles/example_kontakt_strings_vln1.json
ped calibrate --id dyn --levels "ppp=8,p=35,mf=68,ff=110,fff=120" \
    --profile examples/profiles/example_kontakt_strings_vln1.json
```

### Commands

| Command | Purpose |
| --- | --- |
| `inspect-midi` | Summarize a MIDI file |
| `import-midi` | MIDI → project JSON |
| `validate-profile` | Check an instrument profile |
| `validate-project` | Check a project (structure + refs, optional profile cross-check) |
| `list-instruments` | List installed instrument plugins (AU via `auval`, VST3 by folder) |
| `apply-template` | Add one template curve (swell, arch, …) |
| `apply-macro` | Add a multi-parameter macro (emotional_swell, cinematic_rise, …) |
| `paint-phrase` | Derive volume/vibrato/timbre curves from one intent line |
| `calibrate` | Build a calibration curve from a ppp…fff table |
| `calibrate-auto` | Invert a measured CC→loudness response into a calibration curve |
| `export-articulations` | Export a profile's articulations as a Logic / Cubase map |
| `export-midi` | Project + profile → MIDI with CC/keyswitches/program changes (`--perform` for velocity shaping + legato) |

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
  core/      DAW-independent data: note, phrase, track, project, curve, pitch, musictime, report
  profiles/  instrument_profile, articulation, calibration, calibration_assistant, validation
  midi/      reader, writer, events  (mido)
  engine/    expression_mapper, rule_engine, performance, phrase_painter, macros, templates, smoothing
  exporters/ logic (Articulation Set), cubase (Expression Map)
  cli/       main  (the `ped` command)
  project_checks.py   project-level validation
schema/      JSON Schema for project + instrument profile
plugin/      JUCE AU/VST3 MIDI FX plugin (C++) — see docs/PLUGIN.md
```

## Tests & checks

```bash
python -m pytest          # 116 tests
ruff check src tests      # lint
mypy                      # type check
```

CI (GitHub Actions) runs all three on Python 3.10–3.13.

## Documentation

- [docs/TUTORIAL.md](docs/TUTORIAL.md) — hands-on walkthrough (CLI → expression → calibration → plugin)
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — layering and data flow
- [docs/PLUGIN.md](docs/PLUGIN.md) — AU/VST3 MIDI FX plugin (JUCE) build & design
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
