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

## Next steps (planned)

- Export a Logic **Articulation Set**-equivalent description from a profile's
  articulation list (names, ids, keyswitch notes).
- Tidy articulation naming/ids for easy mapping into Logic.
- Technical spike on **AU MIDI FX** for in-DAW, real-time CC generation.

## Future

- AU MIDI FX plugin generating CC live from intent, synced to Logic's transport,
  tempo, and meter.

See [docs/ROADMAP.md](ROADMAP.md) for version targets. Plugin work is explicitly
deferred until the core is stable.
