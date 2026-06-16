#!/usr/bin/env node
// Minimal, dependency-free MCP server (stdio, newline-delimited JSON-RPC 2.0)
// that exposes the phrase-expression-designer core to an agent: turn a text
// phrase into a project or a Standard MIDI File, list engines, build profiles.
//
// This is a reference server — it reuses ../src/core.js (pure) and adds no
// dependencies, so it runs and is round-trip testable without a DAW/browser.
// "Playback" here is file-based: render_midi returns a .mid (base64) to import
// into Logic. Live real-time playback needs a MIDI sink (e.g. `sendmidi` to an
// IAC bus, or a bridge to the browser app's Web MIDI output) — the next step.

import { createInterface } from "node:readline";
import {
  ENGINE_WIZARDS,
  buildEngineProfile,
  projectFromPhrase,
  exportMidi,
  getProfile
} from "../src/core.js";

const SERVER_INFO = { name: "phrase-expression-designer", version: "0.1.0" };
const DEFAULT_PROTOCOL = "2024-11-05";

const TOOLS = [
  {
    name: "enter_notes",
    description: "Parse a Sibelius-style text phrase (e.g. \"4 C D E | 2 G\") into a project JSON. Sticky durations, A-G nearest the previous pitch or explicit octave (C4=60), accidentals # b, dots, r=rest, |=barline.",
    inputSchema: {
      type: "object",
      properties: {
        phrase: { type: "string", description: "The text phrase to parse." },
        profileId: { type: "string", description: "Instrument profile id (optional)." }
      },
      required: ["phrase"]
    }
  },
  {
    name: "render_midi",
    description: "Render a text phrase to a Standard MIDI File, returned base64-encoded. Import into a DAW to play it.",
    inputSchema: {
      type: "object",
      properties: {
        phrase: { type: "string", description: "The text phrase to render." },
        profileId: { type: "string", description: "Instrument profile id (optional)." }
      },
      required: ["phrase"]
    }
  },
  {
    name: "list_engines",
    description: "List the available engine wizards (Opus / Kontakt-8Dio / Logic) and their ids.",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "build_profile",
    description: "Build a validated instrument profile from an engine wizard.",
    inputSchema: {
      type: "object",
      properties: {
        engine: { type: "string", description: "Engine wizard id (opus|kontakt|logic)." },
        library: { type: "string" },
        patch: { type: "string" }
      },
      required: ["engine"]
    }
  }
];

function callTool(name, args = {}) {
  switch (name) {
    case "enter_notes": {
      const project = projectFromPhrase(args.phrase, { profileId: args.profileId });
      return text(JSON.stringify({ notes: project.notes.length, cursorTick: project.cursorTick, project }, null, 2));
    }
    case "render_midi": {
      const project = projectFromPhrase(args.phrase, { profileId: args.profileId });
      const bytes = exportMidi(project, getProfile(project));
      return text(Buffer.from(bytes).toString("base64"));
    }
    case "list_engines":
      return text(JSON.stringify(ENGINE_WIZARDS.map((w) => ({ id: w.id, label: w.label, engine: w.engine })), null, 2));
    case "build_profile":
      return text(JSON.stringify(buildEngineProfile(args.engine, { library: args.library, patch: args.patch }), null, 2));
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

function text(value) {
  return { content: [{ type: "text", text: value }] };
}

function handle(message) {
  const { id, method, params } = message;
  if (method === "initialize") {
    return reply(id, {
      protocolVersion: params?.protocolVersion ?? DEFAULT_PROTOCOL,
      capabilities: { tools: {} },
      serverInfo: SERVER_INFO
    });
  }
  if (method === "tools/list") return reply(id, { tools: TOOLS });
  if (method === "tools/call") {
    try {
      return reply(id, callTool(params?.name, params?.arguments ?? {}));
    } catch (error) {
      return reply(id, { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true });
    }
  }
  if (method === "ping") return reply(id, {});
  if (typeof method === "string" && method.startsWith("notifications/")) return null; // notifications: no response
  if (id === undefined) return null; // any other notification
  return { jsonrpc: "2.0", id, error: { code: -32601, message: `Method not found: ${method}` } };
}

function reply(id, result) {
  return { jsonrpc: "2.0", id, result };
}

function send(message) {
  if (message) process.stdout.write(`${JSON.stringify(message)}\n`);
}

const rl = createInterface({ input: process.stdin });
rl.on("line", (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  let message;
  try {
    message = JSON.parse(trimmed);
  } catch {
    return; // ignore non-JSON lines
  }
  send(handle(message));
});
