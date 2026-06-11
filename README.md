# Phrase Expression Designer

Phrase Expression Designer is a standalone browser prototype for designing string phrase expression data and exporting it as MIDI for Logic Pro.

The MVP follows these rules:

- Score ticks and actual MIDI timing are stored separately.
- Musical expression is stored as internal parameters such as `intensity`, `volume`, `timbre`, and `vibratoDepth`.
- Instrument Profiles map those internal parameters to MIDI CC, keyswitches, velocity, or manual/setup-only targets.
- Logic, Opus, and Kontakt internal files are not modified.

## Run

Open `index.html` directly in a browser, or run a local server:

```bash
npm start
```

Then open `http://127.0.0.1:4273`.

## Test

```bash
npm test
```

## Implemented MVP Features

- Notation-style note display and A-G keyboard input
- Rest insertion, tie flag, slur creation, crescendo/decrescendo creation
- Piano roll showing score timing and actual performance timing
- Piano roll drag editing for frozen performance timing
- MIDI CC event visualization in the piano roll
- Expression curve editor with phrase templates, click-to-add control points, and point dragging
- Score tick and performance offset separation
- Property panel with checkbox-based batch apply and Mixed display
- Reset Local Offset, Freeze Timing, and Quantize to Score controls
- Undo/redo
- Copy, cut, paste, duplicate, and repeat operation shortcuts
- MIDI file import and export
- MIDI Event Preview with final tempo, keyswitch, CC, and note events
- MIDI import support for tempo changes and common CC expression curves
- Project JSON save/load
- Browser auto-save and restore
- Instrument Profile JSON import/export
- Built-in Opus, 8Dio/Kontakt, and Logic Preset instrument profiles
- Editable setup wizard, validation, setup report, and test MIDI generation

## Limits

This is a browser MVP. It does not implement AU MIDI FX, VST3, Logic project editing, Opus/Kontakt internal editing, host automation writing, MusicXML, or publication-quality notation layout.
