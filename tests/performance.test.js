import assert from "node:assert/strict";
import test from "node:test";
import {
  BUILT_IN_PROFILES,
  DEFAULT_INTERPRETATION,
  createInitialProject,
  createNote,
  computePerformanceNotes,
  generateMidiEventList,
  generatePlaybackMessages,
  exportMidi
} from "../src/core.js";

// A representative phrase: a legato line with a leap up to an apex, then a
// rest (phrase break), then a second short phrase. Exercises every
// interpretation rule at once. Note ids are random but never reach the MIDI
// bytes, so the rendered output is fully determined by the score + settings.
function fixtureProject({ interpretation = false } = {}) {
  const project = createInitialProject();
  project.profileId = "opus_hollywood_strings";
  project.tempoMap = [{ tick: 0, bpm: 120 }];
  project.notes = [
    createNote({ pitch: 60, scoreTick: 0, durationTicks: 480, articulation: "legato", velocity: 70 }),
    createNote({ pitch: 64, scoreTick: 480, durationTicks: 480, articulation: "legato", velocity: 72 }),
    createNote({ pitch: 72, scoreTick: 960, durationTicks: 960, articulation: "legato", velocity: 80 }), // apex + leap
    createNote({ pitch: 67, scoreTick: 1920, durationTicks: 480, articulation: "legato", velocity: 74 }),
    // gap 2400..2880 -> phrase break
    createNote({ pitch: 65, scoreTick: 2880, durationTicks: 480, articulation: "sustain", velocity: 68 }),
    createNote({ pitch: 67, scoreTick: 3360, durationTicks: 480, articulation: "sustain", velocity: 70 })
  ];
  project.interpretation = { ...DEFAULT_INTERPRETATION, enabled: interpretation };
  return project;
}

const profile = BUILT_IN_PROFILES[0];

function isValidMidiByte(b) {
  return Number.isInteger(b) && b >= 0 && b <= 0xff;
}

test("golden: exported MIDI is deterministic across identical projects (off)", () => {
  const a = exportMidi(fixtureProject(), profile);
  const b = exportMidi(fixtureProject(), profile);
  assert.deepEqual([...a], [...b]);
});

test("golden: exported MIDI is deterministic with interpretation on", () => {
  const a = exportMidi(fixtureProject({ interpretation: true }), profile);
  const b = exportMidi(fixtureProject({ interpretation: true }), profile);
  assert.deepEqual([...a], [...b]);
});

test("golden: every MIDI event is well-formed and tick-ordered", () => {
  const events = generateMidiEventList(fixtureProject({ interpretation: true }), profile);
  assert.ok(events.length > 0);
  let lastTick = -1;
  events.forEach((event) => {
    assert.ok(event.tick >= 0, "no negative ticks");
    assert.ok(event.tick >= lastTick, "events are tick-ordered");
    lastTick = event.tick;
    assert.ok(Array.isArray(event.bytes) && event.bytes.every(isValidMidiByte), "bytes in range");
    if (event.type === "noteOn" || event.type === "noteOff") {
      assert.ok(event.bytes[1] >= 0 && event.bytes[1] <= 127, "pitch in range");
      assert.ok(event.bytes[2] >= 0 && event.bytes[2] <= 127, "velocity in range");
    }
  });
  const noteOns = events.filter((e) => e.type === "noteOn").length;
  const noteOffs = events.filter((e) => e.type === "noteOff").length;
  assert.equal(noteOns, 6);
  assert.equal(noteOffs, 6);
});

test("golden: interpretation never mutates the notated score", () => {
  const project = fixtureProject({ interpretation: true });
  const beforeVel = project.notes.map((n) => n.velocity);
  const beforeTick = project.notes.map((n) => n.scoreTick);
  const beforeDur = project.notes.map((n) => n.durationTicks);
  computePerformanceNotes(project, profile);
  generateMidiEventList(project, profile);
  assert.deepEqual(project.notes.map((n) => n.velocity), beforeVel);
  assert.deepEqual(project.notes.map((n) => n.scoreTick), beforeTick);
  assert.deepEqual(project.notes.map((n) => n.durationTicks), beforeDur);
});

test("golden: interpretation shapes timing and velocity vs. off", () => {
  const off = computePerformanceNotes(fixtureProject(), profile);
  const on = computePerformanceNotes(fixtureProject({ interpretation: true }), profile);
  // apex (index 2) rings longer
  assert.ok(on[2].performanceDurationTicks > off[2].performanceDurationTicks, "apex lingers");
  // phrase-2 start (index 4) is delayed by a breath
  assert.ok(on[4].performanceStartTick > off[4].performanceStartTick, "breath before phrase 2");
  // at least one played velocity is inflected
  assert.ok(on.some((n, i) => n.performanceVelocity !== off[i].performanceVelocity), "velocity inflected");
  // played velocities stay in range
  assert.ok(on.every((n) => n.performanceVelocity >= 1 && n.performanceVelocity <= 127));
});

test("golden: playback messages are playable, ordered, and meta-free", () => {
  const messages = generatePlaybackMessages(fixtureProject({ interpretation: true }), profile);
  assert.ok(messages.length > 0);
  assert.ok(messages.every((m) => m.bytes[0] < 0xf0 && m.bytes.every(isValidMidiByte)));
  assert.ok(messages.every((m) => typeof m.timeMs === "number" && m.timeMs >= 0 && Number.isFinite(m.timeMs)));
});

test("golden: off-by-default project renders identically with the flag explicitly off", () => {
  const def = exportMidi(fixtureProject(), profile);
  const explicitOff = exportMidi(fixtureProject({ interpretation: false }), profile);
  assert.deepEqual([...def], [...explicitOff]);
});
