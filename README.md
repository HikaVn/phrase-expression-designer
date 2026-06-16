# Phrase Expression Designer

Phrase Expression Designer is a standalone browser prototype for designing string phrase expression data and exporting it as MIDI for Logic Pro.

The MVP follows these rules:

- Score ticks and actual MIDI timing are stored separately.
- Musical expression is stored as internal parameters such as `intensity`, `volume`, `timbre`, and `vibratoDepth`.
- Instrument Profiles map those internal parameters to MIDI CC, keyswitches, velocity, or manual/setup-only targets.
- Logic, Opus, and Kontakt internal files are not modified.

## Repository Note

The current `master` branch is the source of truth for this browser prototype.
Older `master` content was preserved only as a backup branch before the overwrite.
Do not use the old `master` backup as project reference material unless explicitly asked.

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

## MCP server (agent control)

A dependency-free reference MCP server lets an agent do note entry / MIDI
rendering remotely by reusing the same pure core. See `mcp/README.md`.

```bash
node mcp/server.js
```

## Implemented MVP Features

- Text note entry (`テキスト入力`): type a Sibelius-style phrase
  (`4 C D E | 2 G`) — sticky durations, A–G nearest the previous pitch (or
  explicit octave `C4`=60), accidentals `# b`, dots, `r` rest — and it appends
  at the cursor. Same `parsePhrase` primitive the MCP server's `enter_notes` uses
- Notation-style note display and A-G keyboard input (`r` inserts a rest);
  selectable treble/bass clef with correct staff positions, ledger lines,
  sharps, and stem direction
- Key signatures (7 sharps to 7 flats): engraved after the clef per-clef,
  in-key notes drop their accidentals, out-of-key naturals get ♮, and black
  keys spell as flats in flat keys (B♭ on B's line)
- Duration-aware engraving: hollow whole/half noteheads, stemless whole notes,
  flags (8th/16th/32nd) that follow stem direction, and augmentation dots
- Beaming: contiguous 8th/16th notes within a beat share beams instead of
  flags (double beams for 16ths)
- Engraving-style horizontal spacing: gaps scale with duration^0.6, so 16ths
  stay readable beside whole notes; content sits clear of bar lines
- Dense passages automatically widen the score (guaranteed minimum note
  spacing) with horizontal scrolling; sparse scores still fit the panel
- Rest insertion, tie flag, slur creation, crescendo/decrescendo creation
- Dynamic marks (ppp–fff): one click sets the intensity level from that point
  (subito step), shapes note velocities to match, and engraves the mark
  (e.g. *mf*) in the notation view
- Sibelius-style dynamics entry: Cmd/Ctrl+E opens a popover — type `p`, `mf`,
  `ff`, `<` (cresc.) or `>` (dim.) and press Enter
- Click an engraved mark to select it (red); Delete/Backspace removes the mark,
  its curve step, and re-derives the affected velocities
- Two independent expression layers: the phrase curve and per-note values
  (Note Expression panel). Output mixes them per note with a continuous
  influence amount — 0% = phrase only, 100% = the note's value wins
- Interpretation engine (the "retained performer"): an optional, steerable
  layer that derives a player's micro-decisions from the score — phrase-apex
  agogic lengthening, a breath before each new phrase, phrase-final relaxation,
  deterministic (reproducible) human timing jitter, plus velocity inflection (a
  phrase arch that swells toward the apex and eases at the edges, metrical
  accents that lift strong beats and soften offbeats, and velocity jitter), and
  context-dependent legato (bigger interval leaps are "reached for" with a
  little more onset delay). It writes timing/duration/velocity nudges on top of
  the score (the notation is
  never altered — the played velocity is a separate `performanceVelocity`),
  recomputes live as you edit, opts out of frozen notes, and is driven by a
  single strength dial (off by default). Flows straight into the piano roll,
  MIDI export, and live output
- Hairpins start from the level actually sounding, aim at the next written
  dynamic (or move two steps), and merge into the existing intensity curve
  instead of replacing it
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
- Live MIDI output (Web MIDI): stream the generated events in real time to an
  external MIDI port (e.g. an IAC bus into Logic) so a real instrument sounds
  them — the app itself stays silent. Play/Stop transport with all-notes-off on
  stop, a **Loop** mode that re-generates each cycle (so dial/interpretation
  tweaks are heard on the next pass — live A/B tuning), and a **test-tone**
  button to confirm routing before judging. Requires Chrome/Edge over https or
  localhost
- Demo phrase (`デモ譜`): one click loads a lyrical two-phrase line built to
  show off the interpretation engine (legato ascent → apex leap → breath →
  falling answer, with an intensity arch), interpretation on — a consistent
  subject for the ear A/B
- MIDI Event Preview with final tempo, keyswitch, CC, and note events
- MIDI import support for tempo changes and common CC expression curves
- Project JSON save/load
- Browser auto-save and restore
- Calibration curves: a control's internal value (0–1) is mapped through a
  named curve before the ×127, so a library's non-linear CC response can be
  matched (built-in `linear`, `s_curve`, `soft`, `firm`; the per-instrument
  `dynamic_default` slot is identity until a profile overrides it in its own
  `calibration` array). Assigned per midiCC control (6th wizard column);
  unknown curve ids are flagged in validation. Default profiles stay linear, so
  existing output is unchanged
- Auto-calibration (loopback): `Auto-Calibrate` sweeps the intensity CC on a
  held note via Web MIDI while capturing the looped-back audio (getUserMedia +
  Web Audio RMS), measures the library's loudness response per step, fits a
  calibration curve that linearises it, and stores it on the profile — closing
  the calibration loop without hand-drawing curves. Needs a loopback audio
  device (e.g. BlackHole) routing the instrument's output back to an input. The
  measure/fit math is pure and unit-tested; the audio capture is browser-only
- Instrument Profile JSON import/export
- Built-in Opus, 8Dio/Kontakt, and Logic Preset instrument profiles
- Engine-specific Setup Wizards (EastWest Opus / Kontakt·8Dio / Logic): pick an
  engine to load its articulation and control preset menus with checkboxes,
  engine-correct note naming, ranges and timing, automatic keyswitch numbering
  ("Auto-assign KS"), and tailored setup instructions
- Editable generic setup wizard (any base profile), validation, setup report,
  and test MIDI generation

## Limits

This is a browser MVP. It produces and streams MIDI; it does not host or render
audio itself, so sound comes from an external instrument (e.g. Logic hosting
Opus/Kontakt) driven over Web MIDI or from an exported `.mid`. It does not
implement AU MIDI FX, VST3, Logic project editing, Opus/Kontakt internal
editing, host automation writing, MusicXML, or publication-quality notation
layout.
