# Phrase Expression Designer — MCP server (reference)

A minimal, **dependency-free** [MCP](https://modelcontextprotocol.io) server
(stdio, newline-delimited JSON-RPC 2.0) that exposes the project's pure core
(`../src/core.js`) so an agent can do note entry and MIDI rendering remotely.

```bash
node mcp/server.js
```

Add it to an MCP client (e.g. Claude Code) as a stdio server pointing at
`node /path/to/mcp/server.js`.

## Tools

| tool | args | returns |
|---|---|---|
| `enter_notes` | `phrase`, `profileId?` | project JSON parsed from a Sibelius-style phrase (`"4 C D E \| 2 G"`) |
| `render_midi` | `phrase`, `profileId?` | a Standard MIDI File, base64-encoded — import into a DAW to play |
| `list_engines` | — | engine wizard ids/labels (Opus / Kontakt·8Dio / Logic) |
| `build_profile` | `engine`, `library?`, `patch?` | a validated instrument profile JSON |

Phrase syntax: sticky durations (`1 2 4 8 16 32 64`, dots ok), letters `A–G`
placed in the octave nearest the previous note (or explicit scientific octave,
`C4`=60), accidentals `#`/`b`, `r` = rest, `|` = barline.

## Status / scope

- **Verified**: the server is round-trip tested (`tests/mcp.test.js`) — it
  reuses the same unit-tested core as the app, so what it renders matches the
  app's MIDI export.
- **Not yet**: *live real-time playback*. `render_midi` is file-based (the agent
  hands you a `.mid`). Driving a DAW in real time needs a MIDI sink — either
  shelling out to `sendmidi` into an IAC bus, or bridging to the browser app's
  Web MIDI output. That is the next increment.
- This is a minimal reference implementation of the protocol; for production use
  the official MCP SDK.
