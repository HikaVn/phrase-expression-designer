# AGENTS.md

## Project

Phrase Expression Designer is a tool for designing musical expression curves
for sustained virtual instruments, especially strings. It converts high-level
performance intent such as intensity, timbre, vibrato, attack, release, bow
pressure, and phrase flow into MIDI CC, velocity, keyswitches, and articulation
outputs using instrument-specific profiles.

## Working Style — Teach While Building (REQUIRED)

The repository owner is learning as the project is built. **Explain as you
work.** This applies to *every* task, not just when asked.

For each non-trivial step:
- **Term** — define the jargon you use (CC, keyswitch, articulation, monotone
  cubic, AU/VST3, ticks/PPQ, etc.) in plain language the first time it appears.
- **Principle / how it works** — briefly say *why* it works, not just *what* the
  code does.
- **Purpose** — connect the change to the user's goal (why it matters musically
  or for the product).

Keep explanations short and concrete; favor a one-line "what this is / why" over
silence. When introducing a design choice, state the trade-off. Prefer teaching
in the chat reply; keep code comments at the normal level. Do not assume prior
knowledge of DSP, MIDI internals, C++/JUCE, or Python packaging.

## Core Rule

Never store instrument-specific CC values directly as the primary musical data.
Store performance intent first, then convert through Instrument Profiles.

## Current Priority

Focus on the DAW-independent core:

1. Data models
2. MIDI import/export
3. Expression curves
4. Calibration curves
5. Instrument profiles
6. Kontakt profile support
7. Validation
8. Tests

Do not prioritize AU/VST plugin code until the core is stable.

## Do Not

- Do not edit Logic project files directly.
- Do not modify Kontakt internal preset files.
- Do not reverse engineer protected libraries.
- Do not automate plugin GUI clicks as a core feature.
- Do not put DAW-specific logic into the core engine.
- Do not change MIDI note timing unless explicitly required.
- Do not output CC outside 0-127.
- Do not overwrite user input files by default.

## Testing

Run the test suite after changes (`python -m pytest`). Add tests for all core
transformations:

- Curve interpolation
- Calibration mapping
- CC conversion
- MIDI roundtrip
- Keyswitch generation
- Profile validation
- C3=60/C4=60 conversion

## Architecture

Keep the architecture layered:

- `core`: DAW-independent musical data
- `profiles`: instrument-specific mappings
- `midi`: MIDI parsing and writing
- `engine`: expression mapping and rules
- `exporters`: DAW articulation maps (Logic plist, Cubase expressionmap)
- `profiles/validation.py` + `project_checks.py`: profile and project checks
- `cli`: user commands
- `app/plugin`: future UI and DAW integration (do not start before core locked)

## Documentation

Update docs when behavior changes. See `docs/ARCHITECTURE.md` and
`docs/DATA_FORMAT.md`.

## Getting Oriented (first session)

1. Read this file and `docs/ARCHITECTURE.md`.
2. Run `python -m pytest`; all tests should pass.
3. Pick the highest-priority open item from `TODO.md`.
4. Implement it as a small change with tests. Keep intent / instrument-mapping
   separation intact.
