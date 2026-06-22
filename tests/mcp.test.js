import assert from "node:assert/strict";
import test from "node:test";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const serverPath = join(here, "..", "mcp", "server.js");

// Drive the stdio JSON-RPC server: send a request, await the response with the
// matching id. Notifications (no id) get no reply.
function startServer(bridgePort = 0) {
  const child = spawn(process.execPath, [serverPath], {
    stdio: ["pipe", "pipe", "inherit"],
    env: { ...process.env, PED_BRIDGE_PORT: String(bridgePort) }
  });
  const pending = new Map();
  let buffer = "";
  child.stdout.on("data", (chunk) => {
    buffer += chunk.toString();
    let nl;
    while ((nl = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line) continue;
      const msg = JSON.parse(line);
      if (msg.id !== undefined && pending.has(msg.id)) {
        pending.get(msg.id)(msg);
        pending.delete(msg.id);
      }
    }
  });
  let nextId = 1;
  const request = (method, params) => new Promise((resolve) => {
    const id = nextId++;
    pending.set(id, resolve);
    child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
  });
  return { child, request, stop: () => child.kill() };
}

test("MCP server: initialize, tools/list, and render_midi round-trip", async () => {
  const server = startServer();
  try {
    const init = await server.request("initialize", { protocolVersion: "2024-11-05", capabilities: {} });
    assert.equal(init.result.serverInfo.name, "phrase-expression-designer");
    assert.equal(init.result.protocolVersion, "2024-11-05");

    const list = await server.request("tools/list", {});
    const names = list.result.tools.map((t) => t.name);
    assert.ok(names.includes("render_midi"));
    assert.ok(names.includes("enter_notes"));
    assert.ok(names.includes("list_engines"));

    const rendered = await server.request("tools/call", { name: "render_midi", arguments: { phrase: "4 C D E" } });
    const midi = Buffer.from(rendered.result.content[0].text, "base64");
    assert.equal(midi.subarray(0, 4).toString("ascii"), "MThd");

    const engines = await server.request("tools/call", { name: "list_engines", arguments: {} });
    assert.ok(JSON.parse(engines.result.content[0].text).some((e) => e.id === "opus"));

    const guide = await server.request("tools/call", { name: "get_setup_guide", arguments: { daw: "logic" } });
    assert.ok(JSON.parse(guide.result.content[0].text).steps.some((s) => s.id === "iac"));

    const bad = await server.request("tools/call", { name: "nope", arguments: {} });
    assert.equal(bad.result.isError, true);
  } finally {
    server.stop();
  }
});

async function fetchWithRetry(url, attempts = 30) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      return res;
    } catch {
      await new Promise((r) => setTimeout(r, 50));
    }
  }
  throw new Error(`unreachable: ${url}`);
}

test("MCP bridge: play_phrase queues a command delivered over HTTP /poll", async () => {
  const port = 47319;
  const server = startServer(port);
  try {
    await server.request("initialize", { protocolVersion: "2024-11-05", capabilities: {} });
    const health = await fetchWithRetry(`http://127.0.0.1:${port}/health`);
    assert.equal(health.status, 200);

    const queued = await server.request("tools/call", { name: "play_phrase", arguments: { phrase: "4 C D E", loop: true } });
    assert.equal(queued.result.isError, undefined);

    const poll = await fetch(`http://127.0.0.1:${port}/poll`, { cache: "no-store" });
    assert.equal(poll.status, 200);
    const command = await poll.json();
    assert.equal(command.type, "play");
    assert.equal(command.loop, true);
    assert.equal(command.project.notes.length, 3);

    // queue now empty -> 204
    const empty = await fetch(`http://127.0.0.1:${port}/poll`, { cache: "no-store" });
    assert.equal(empty.status, 204);

    await server.request("tools/call", { name: "stop", arguments: {} });
    const stopCmd = await (await fetch(`http://127.0.0.1:${port}/poll`, { cache: "no-store" })).json();
    assert.equal(stopCmd.type, "stop");
  } finally {
    server.stop();
  }
});
