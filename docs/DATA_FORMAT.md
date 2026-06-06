# Data Format

All JSON uses `camelCase` keys. `schemaVersion` is `"0.1.0"`. Times are in
**ticks**; `ppq` (ticks per quarter) is stored on the Project.

## Project

```json
{
  "schemaVersion": "0.1.0",
  "projectName": "Example Project",
  "ppq": 960,
  "tempoMap": [{ "tick": 0, "bpm": 120.0 }],
  "tracks": []
}
```

## Track

```json
{
  "id": "track_vln1",
  "name": "Violin 1",
  "instrumentProfileId": "css_vln1_default",
  "notes": [],
  "expressionCurves": [],
  "phrases": []
}
```

## Note

```json
{
  "id": "note_0001",
  "pitch": 72,
  "startTick": 0,
  "durationTick": 960,
  "velocity": 80,
  "articulationId": "legato",
  "phraseId": "phrase_0001"
}
```

`articulationId` and `phraseId` may be `null`.

## Phrase

```json
{ "id": "phrase_0001", "name": "opening", "startTick": 0, "endTick": 3840 }
```

## ExpressionCurve

Values are normalized `0.0–1.0`. `shape` (`"linear" | "smooth" | "hold"`)
controls interpolation **from this point to the next**.

```json
{
  "id": "curve_intensity_0001",
  "parameter": "intensity",
  "points": [
    { "tick": 0,   "value": 0.25, "shape": "smooth" },
    { "tick": 960, "value": 0.75, "shape": "smooth" }
  ]
}
```

Common `parameter` values: `intensity`, `volume`, `timbre`, `brightness`,
`vibratoDepth`, `vibratoSpeed`, `attackSharpness`, `releaseShape`, `bowSpeed`,
`bowPressure`, `bowPosition`, `phraseFlow`, `tension`, `air`.

## InstrumentProfile

```json
{
  "schemaVersion": "0.1.0",
  "id": "example_strings_vln1",
  "engine": "Kontakt",
  "library": "Example Strings",
  "patch": "Violin 1",
  "noteNaming": "C3=60",
  "playableRange": { "low": 55, "high": 103 },
  "articulations": [],
  "ccMappings": [],
  "calibrationCurves": []
}
```

`noteNaming` is `"C3=60"` or `"C4=60"`. It governs how `noteName` strings
resolve to MIDI numbers (see `docs/KONTAKT_PROFILE.md`).

## Articulation

```json
{
  "id": "legato",
  "name": "Legato",
  "type": "long",
  "trigger": { "type": "keyswitch", "note": 24, "noteName": "C0", "mode": "latch" },
  "defaultMacro": "natural_swell",
  "expressionBehavior": { "velocityRole": "secondary", "ccRole": "primary" }
}
```

- `type`: `"long" | "short" | "effect"`.
- `trigger.type`: `"keyswitch" | "cc" | "program_change"`.
- `trigger.mode` (keyswitch): `"latch"` (sticky) or `"momentary"` (held).
- For a keyswitch, `note` (explicit MIDI number) wins; `noteName` is a fallback
  and a cross-check against `noteNaming`.

## CCMapping

```json
{
  "internalParameter": "intensity",
  "target": { "type": "cc", "cc": 1 },
  "curveId": "dynamic_curve_default",
  "smoothingMs": 40,
  "lookAheadMs": 80
}
```

`target.type` is `"cc"` for now (`keyswitch` / `program_change` reserved).
`lookAheadMs` is stored but not yet applied — see `TODO.md`.

## CalibrationCurve

Maps a normalized intent value to a CC value. Output is clamped to
`outputRange` and to 0–127.

```json
{
  "id": "dynamic_curve_default",
  "inputRange": [0.0, 1.0],
  "outputRange": [0, 127],
  "interpolation": "monotonic",
  "points": [
    { "input": 0.0,  "output": 8 },
    { "input": 0.25, "output": 35 },
    { "input": 0.5,  "output": 68 },
    { "input": 0.75, "output": 96 },
    { "input": 1.0,  "output": 120 }
  ]
}
```

`interpolation` is `"linear"` or `"monotonic"`. Both currently use
piecewise-linear interpolation; true monotone-cubic is a TODO.
