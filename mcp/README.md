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
| `play_phrase` | `phrase`, `profileId?`, `loop?` | queues the phrase for **live playback** through the connected browser bridge |
| `stop` | — | stops live playback on the bridge |
| `list_engines` | — | engine wizard ids/labels (Opus / Kontakt·8Dio / Logic) |
| `build_profile` | `engine`, `library?`, `patch?` | a validated instrument profile JSON |

Phrase syntax: sticky durations (`1 2 4 8 16 32 64`, dots ok), letters `A–G`
placed in the octave nearest the previous note (or explicit scientific octave,
`C4`=60), accidentals `#`/`b`, `r` = rest, `|` = barline.

## Live bridge (real-time playback)

`play_phrase` / `stop` queue commands on a tiny localhost HTTP server (port
`PED_BRIDGE_PORT`, default `4274`). The browser app short-polls it and plays the
command through its Web MIDI output, so notes reach a real instrument in real
time:

```
agent → MCP play_phrase → HTTP queue → browser /poll → Web MIDI → IAC → Logic
```

In the app, enable **Bridge** (next to the Live MIDI transport), set the port to
match, and select the IAC output. The bridge plays delivered phrases **without**
disturbing the project you're editing.

## Status / scope

- **Verified here**: the stdio protocol (`initialize` / `tools/list` /
  `tools/call`) and the bridge queue (`play_phrase` → `/poll`) are round-trip
  tested in `tests/mcp.test.js`; rendering reuses the same unit-tested core as
  the app.
- **Browser-side only / unverified here**: the app's bridge poller and the
  final Web MIDI send (needs a browser + IAC + DAW).
- `render_midi` remains available for a file-based workflow (hand you a `.mid`).
- This is a minimal reference implementation of the protocol; for production use
  the official MCP SDK.
