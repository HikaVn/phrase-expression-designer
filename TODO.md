# TODO

Tracks decisions and remaining work. Update this in the same change that
resolves an item.

## Decisions made

- **Language: Python** for the prototype core (per spec §14/§27). Revisit for
  GUI/plugin (JUCE/C++ or Swift) once the core is stable.
- **MIDI library: `mido`** — standard, simple, test-friendly.
- **`ppq` + `timeSignatureMap` on `Project`** — required to interpret ticks,
  bar:beat positions, and round-trip MIDI.
- **`CurvePoint.shape` = the segment leaving the point.**
- **Calibration `monotonic`** now uses Fritsch–Carlson monotone cubic; `linear`
  uses piecewise-linear.
- **License: still TBD** (`pyproject.toml` says "TBD"; README says
  all-rights-reserved until chosen).

## Done since v0.1.0

- [x] Bar:beat ranges in `apply-template` / `apply-macro` (`--start-pos/--end-pos`).
- [x] Time signatures in the data model + MIDI read/write (`core/musictime.py`).
- [x] `lookAheadMs` applied in the expression mapper.
- [x] True monotone-cubic calibration interpolation.
- [x] Phrase Painter (`engine/phrase_painter.py`, `ped paint-phrase`).
- [x] Expression Macros (`engine/macros.py`, `ped apply-macro`).
- [x] Performance Rule Engine (`engine/performance.py`): rest-based phrase
      detection, velocity-from-intensity for short articulations, downbeat accent,
      phrase-end release, legato/slur softening (`ped export-midi --perform`).
- [x] Velocity rules from `expressionBehavior` (velocityRole).
- [x] `cc` and `program_change` articulation triggers (`generate_articulation_events`).
- [x] Calibration Assistant — manual ppp..fff table (`ped calibrate`).
- [x] JSON Schema files (`schema/`) + `ped validate-project`.
- [x] More example profiles (CSS-style, Spitfire-style).
- [x] CI (GitHub Actions), ruff, mypy.

## Still open (decisions)

- Confirm Python as the long-term core language vs. early port.
- GUI stack: SwiftUI vs JUCE.
- First real (named) instrument library to target.
- Logic Articulation Set output format.
- Cubase Expression Map output format.
- Profile sharing format / signing of community profiles.
- License choice.
- AI-assist: local vs external API.

## Remaining core / future work

- [ ] Audio-analysis calibration (CC sweep playback + RMS/LUFS/spectral-centroid)
      to auto-suggest calibration values — the automatic half of §9.5.
- [ ] Monotone-cubic for `outputRange` inversion (decreasing curves) — currently
      assumes non-decreasing nodes for the "no overshoot" guarantee.
- [ ] Slur/legato re-attack handled at the *note* level (note-overlap shaping),
      not just velocity softening.
- [ ] Logic Articulation Set / Cubase Expression Map exporters (Roadmap v0.4).
- [ ] GUI (Roadmap v0.2+), macOS app, AU MIDI FX / VST3 (do NOT start before the
      core is locked).
- [ ] Tempo-aware `smoothingMs` already done; consider per-mapping curve sampling
      resolution override.

## Notes for the Codex phase

- Keep intent ↔ instrument-mapping separation intact (the core rule).
- Do not start AU/VST/GUI before the remaining core items above are addressed.
- Every change touching CC values, note timing, or keyswitch placement needs a
  test. Keep `ruff check`, `mypy`, and `pytest` green (CI enforces all three).
