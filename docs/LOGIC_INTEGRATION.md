# Logic Pro Integration

## Initial workflow (v0.1)

Phrase Expression Designer is a standalone tool today. The round-trip is
file-based:

1. In Logic, write your notes on the instrument track.
2. Export the region/track as a MIDI file (File ▸ Export ▸ Selection as MIDI File,
   or drag the region to the Finder).
3. `ped import-midi exported.mid --profile <id> -o song.project.json`
4. `ped apply-template <name> --project song.project.json --track "<name>"`
   (repeat / hand-edit the project JSON to refine intent curves).
5. `ped export-midi --project song.project.json --profile <profile>.json -o song.out.mid`
6. Import `song.out.mid` back into Logic. Note timing is preserved; CC and
   keyswitches are added.

The tool never edits the Logic project directly — only MIDI files you export and
re-import.

## Articulation Set export (available)

Generate a Logic-style Articulation Set plist from a profile:

```bash
ped export-articulations --profile examples/profiles/example_kontakt_strings_vln1.json \
    --format logic -o "My Set.plist"
```

This writes a valid `.plist` capturing each articulation's name, id, and
keyswitch note (resolved via the profile's `noteNaming`). It is a **starting
point** to import into Logic's Articulation Set editor — Logic's full schema is
version-specific, so review the switch rows after importing. No Logic project is
edited (spec §17.2).

Cubase users can export the same data as an Expression Map:

```bash
ped export-articulations --profile <profile>.json --format cubase -o map.expressionmap
```

## Next steps (planned)

- Refine the exported maps toward exact Logic/Cubase schemas per DAW version.
- Technical spike on **AU MIDI FX** for in-DAW, real-time CC generation.

## Future

- AU MIDI FX plugin generating CC live from intent, synced to Logic's transport,
  tempo, and meter.

See [docs/ROADMAP.md](ROADMAP.md) for version targets. Plugin work is explicitly
deferred until the core is stable.
