# Roadmap

## MVP — done (v0.1.0)

- Python CLI
- MIDI read / write (timing preserved)
- ExpressionCurve + interpolation
- CalibrationCurve (intent → CC)
- InstrumentProfile + JSON I/O
- Kontakt-style profile support
- CC normalization, keyswitch output
- Profile validation
- Sample profile + sample MIDI
- Unit tests

## v0.2

- Simple GUI
- Curve / note display
- More expression templates
- A/B output comparison
- Logic operating guide

## v0.3

- macOS app
- Real-time MIDI input
- Profile editor UI
- Calibration UI
- MIDI controller recording

## v0.4

- Logic Articulation Set-equivalent export — **initial version shipped**
  (`ped export-articulations --format logic`)
- Cubase Expression Map-equivalent export — **initial version shipped**
  (`ped export-articulations --format cubase`)
- Refine both toward exact, version-specific DAW schemas
- Studio One Sound Variations-equivalent export (investigation)

## v1.0

- Stable standalone app
- Multiple instrument profiles
- Phrase-level expression design
- Practical MIDI round-trip workflow

## Future

- AU MIDI FX
- VST3
- KSP helper scripts
- AI expression suggestions
- Audio-analysis calibration
- Community profile sharing
