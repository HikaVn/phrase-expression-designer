import assert from "node:assert/strict";
import test from "node:test";
import {
  BUILT_IN_PROFILES,
  addCrescendo,
  applyDynamic,
  addSlur,
  applyBatchProperties,
  applyNoteLetter,
  applySelectedNoteDuration,
  computePerformanceNotes,
  copySelection,
  createInitialProject,
  deleteCurvePoint,
  deleteSelection,
  dynamicValue,
  exportMidi,
  generateCcEvents,
  generateMidiEventList,
  importMidi,
  nearestPitchForLetter,
  noteNameToMidi,
  quantizeSelectedTimingToScore,
  resetLocalOffsets,
  sampleCurve,
  selectedNotes,
  freezeSelectedTiming,
  pasteSelection,
  moveCurvePoint,
  setFrozenPerformanceTick,
  toggleTie,
  tickToMs,
  upsertCurvePoint,
  validateProfile,
  velocityForDynamic
} from "../src/core.js";

test("tickToMs converts constant tempo ticks to milliseconds", () => {
  assert.equal(tickToMs(960, [{ tick: 0, bpm: 120 }], 960), 500);
  assert.equal(tickToMs(1920, [{ tick: 0, bpm: 60 }], 960), 2000);
});

test("note letters choose nearest same-name pitch and prefer upward tie", () => {
  assert.equal(nearestPitchForLetter("D", 60), 62);
  assert.equal(nearestPitchForLetter("B", 60), 59);
  assert.equal(nearestPitchForLetter("C", 66), 72);
});

test("notation mode inserts notes and advances cursor", () => {
  const project = createInitialProject();
  project.notes = [];
  project.mode = "notation";
  applyNoteLetter(project, "A");
  assert.equal(project.notes.length, 1);
  assert.equal(project.notes[0].pitch, 69);
  assert.equal(project.cursorTick, 960);
});

test("performance notes separate score and actual timing", () => {
  const project = createInitialProject();
  project.profileId = "opus_hollywood_strings";
  project.notes[0].articulation = "legato";
  project.notes[0].localStartOffsetMs = -20;
  const performance = computePerformanceNotes(project, BUILT_IN_PROFILES[0]);
  assert.equal(project.notes[0].scoreTick, 0);
  assert.equal(performance[0].performanceStartTick, 0);
  assert.ok(performance[1].performanceStartTick < project.notes[1].scoreTick);
});

test("slur and crescendo are created from selected note ranges", () => {
  const project = createInitialProject();
  project.selectedIds = [project.notes[0].id, project.notes[2].id];
  assert.equal(addSlur(project), true);
  assert.equal(addCrescendo(project, "crescendo"), true);
  assert.equal(project.slurs.length, 1);
  assert.equal(project.crescendos.length, 1);
  // The hairpin rewrites only its own span: it starts at the level that was
  // sounding at the first note and ends higher at the last note's end.
  const hairpin = project.crescendos[0];
  const startTick = project.notes[0].scoreTick;
  const endTick = project.notes[2].scoreTick + project.notes[2].durationTicks;
  assert.equal(hairpin.startIntensity, 0.35); // the initial curve's value at tick 0
  assert.ok(hairpin.endIntensity > hairpin.startIntensity);
  assert.ok(Math.abs(sampleCurve(project, "intensity", startTick) - hairpin.startIntensity) < 1e-9);
  assert.ok(Math.abs(sampleCurve(project, "intensity", endTick) - hairpin.endIntensity) < 1e-9);
});

test("batch apply changes only checked properties", () => {
  const project = createInitialProject();
  project.selectedIds = [project.notes[0].id, project.notes[1].id];
  const beforePitch = project.notes[0].pitch;
  const count = applyBatchProperties(project, {
    pitch: { enabled: false, value: 72 },
    articulation: { enabled: true, value: "legato" },
    offset: { enabled: true, value: -20 },
    velocity: { enabled: false, value: 12 }
  });
  assert.equal(count, 2);
  assert.equal(project.notes[0].pitch, beforePitch);
  assert.equal(project.notes[0].articulation, "legato");
  assert.equal(project.notes[1].localStartOffsetMs, -20);
  assert.notEqual(project.notes[0].velocity, 12);
  assert.equal(selectedNotes(project).length, 2);
});

test("timing helpers reset, freeze, and quantize selected note timing", () => {
  const project = createInitialProject();
  project.profileId = "opus_hollywood_strings";
  project.selectedIds = [project.notes[1].id];
  project.notes[1].localStartOffsetMs = -24;
  freezeSelectedTiming(project, BUILT_IN_PROFILES[0]);
  assert.equal(typeof project.notes[1].frozenPerformanceTick, "number");
  resetLocalOffsets(project);
  assert.equal(project.notes[1].localStartOffsetMs, 0);
  assert.equal(project.notes[1].frozenPerformanceTick, null);
  project.notes[1].localStartOffsetMs = -30;
  project.notes[1].humanizeMs = 8;
  project.notes[1].phraseOffsetMs = -12;
  quantizeSelectedTimingToScore(project);
  assert.equal(project.notes[1].localStartOffsetMs, 0);
  assert.equal(project.notes[1].humanizeMs, 0);
  assert.equal(project.notes[1].phraseOffsetMs, 0);
});

test("frozen performance tick can be set directly for piano roll dragging", () => {
  const project = createInitialProject();
  assert.equal(setFrozenPerformanceTick(project, project.notes[1].id, 777.7), true);
  assert.equal(project.notes[1].frozenPerformanceTick, 778);
  assert.equal(setFrozenPerformanceTick(project, "missing", 100), false);
});

test("copy, paste, and delete selected notes preserve relative timing", () => {
  const project = createInitialProject();
  project.selectedIds = [project.notes[0].id, project.notes[1].id];
  addSlur(project);
  const clipboard = copySelection(project);
  assert.equal(clipboard.notes.length, 2);
  assert.equal(clipboard.slurs.length, 1);
  const pasted = pasteSelection(project, clipboard, 3840);
  assert.equal(pasted.length, 2);
  assert.deepEqual(pasted.map((note) => note.scoreTick), [3840, 4800]);
  assert.equal(project.selectedIds.length, 2);
  deleteSelection(project);
  assert.equal(project.notes.length, 4);
});

test("selected note duration changes add rests for shortened gaps", () => {
  const project = createInitialProject();
  project.selectedIds = [project.notes[0].id];
  const result = applySelectedNoteDuration(project, 480);
  assert.equal(project.notes[0].durationTicks, 480);
  assert.equal(project.notes[1].scoreTick, 960);
  assert.deepEqual(project.rests.map((rest) => [rest.scoreTick, rest.durationTicks]), [[480, 480]]);
  assert.equal(result.addedRests, 1);
});

test("selected note duration changes shorten partially overlapped following notes", () => {
  const project = createInitialProject();
  project.selectedIds = [project.notes[0].id];
  const result = applySelectedNoteDuration(project, 1440);
  assert.equal(project.notes[0].durationTicks, 1440);
  assert.equal(project.notes[1].scoreTick, 1440);
  assert.equal(project.notes[1].durationTicks, 480);
  assert.equal(project.rests.length, 0);
  assert.equal(result.adjustedNotes, 1);
});

test("selected note duration changes delete fully covered following notes", () => {
  const project = createInitialProject();
  const deletedId = project.notes[1].id;
  project.selectedIds = [project.notes[0].id];
  const result = applySelectedNoteDuration(project, 1920);
  assert.equal(project.notes.some((note) => note.id === deletedId), false);
  assert.equal(project.notes[0].durationTicks, 1920);
  assert.equal(project.notes[1].scoreTick, 1920);
  assert.equal(result.deletedNotes, 1);
});

test("selected dotted half deletes covered notes and preserves the next boundary note", () => {
  const project = createInitialProject();
  const coveredIds = [project.notes[1].id, project.notes[2].id];
  project.selectedIds = [project.notes[0].id];
  const result = applySelectedNoteDuration(project, 2880);
  assert.equal(project.notes[0].durationTicks, 2880);
  assert.equal(project.notes.some((note) => coveredIds.includes(note.id)), false);
  assert.equal(project.notes[1].scoreTick, 2880);
  assert.equal(project.notes.length, 2);
  assert.equal(project.rests.length, 0);
  assert.equal(result.deletedNotes, 2);
});

test("expression curve samples linearly between points", () => {
  const project = createInitialProject();
  project.expressionCurves.intensity = { parameter: "intensity", points: [{ tick: 0, value: 0 }, { tick: 960, value: 1 }] };
  assert.equal(sampleCurve(project, "intensity", 480), 0.5);
});

test("expression curve point editing inserts and updates snapped points", () => {
  const project = createInitialProject();
  upsertCurvePoint(project, "intensity", 480, 0.25);
  assert.ok(project.expressionCurves.intensity.points.some((point) => point.tick === 480 && point.value === 0.25));
  upsertCurvePoint(project, "intensity", 500, 2);
  const edited = project.expressionCurves.intensity.points.find((point) => point.tick === 500);
  assert.equal(edited.value, 1);
  assert.equal(moveCurvePoint(project, "intensity", 0, 120, -1), true);
  assert.ok(project.expressionCurves.intensity.points.some((point) => point.tick === 120 && point.value === 0));
  assert.equal(deleteCurvePoint(project, "intensity", 0), true);
  assert.equal(deleteCurvePoint(project, "intensity", 999), false);
});

test("cc events are generated from enabled midiCC profile controls", () => {
  const project = createInitialProject();
  const events = generateCcEvents(project, BUILT_IN_PROFILES[0]);
  assert.ok(events.length > project.notes.length);
  assert.ok(events.some((event) => event.cc === 1 && event.parameter === "intensity"));
  assert.ok(events.every((event) => event.value >= 0 && event.value <= 127));
});

test("midi event list previews tempo, keyswitch, cc, and note events", () => {
  const project = createInitialProject();
  project.tempoMap = [{ tick: 0, bpm: 120 }, { tick: 1920, bpm: 90 }];
  const events = generateMidiEventList(project, BUILT_IN_PROFILES[0]);
  assert.ok(events.some((event) => event.type === "tempo" && event.tick === 1920));
  assert.ok(events.some((event) => event.type === "keyswitchOn"));
  assert.ok(events.some((event) => event.type === "cc"));
  assert.ok(events.some((event) => event.type === "noteOn"));
  assert.ok(events.every((event) => Array.isArray(event.bytes)));
});

test("built-in profiles validate without fatal errors except expected warnings", () => {
  BUILT_IN_PROFILES.forEach((profile) => {
    const messages = validateProfile(profile);
    assert.equal(messages.filter((item) => item.level === "Error").length, 0, profile.id);
  });
});

test("note name conversion follows profile note naming convention", () => {
  assert.equal(noteNameToMidi("C3", "C3=60"), 60);
  assert.equal(noteNameToMidi("C4", "C4=60"), 60);
  assert.equal(noteNameToMidi("C#-1", "Kontakt"), 13);
});

test("midi export produces a readable midi project", () => {
  const project = createInitialProject();
  const bytes = exportMidi(project, BUILT_IN_PROFILES[0]);
  assert.equal(String.fromCharCode(...bytes.slice(0, 4)), "MThd");
  const imported = importMidi(bytes.buffer);
  assert.ok(imported.notes.length >= project.notes.length);
});

test("midi import preserves tempo changes and maps common CCs to expression curves", () => {
  const project = createInitialProject();
  project.tempoMap = [{ tick: 0, bpm: 120 }, { tick: 960, bpm: 90 }];
  project.expressionCurves.intensity = { parameter: "intensity", points: [{ tick: 0, value: 0.5 }] };
  const bytes = exportMidi(project, BUILT_IN_PROFILES[0]);
  const imported = importMidi(bytes.buffer);
  assert.ok(imported.tempoMap.some((tempo) => tempo.tick === 960 && tempo.bpm === 90));
  assert.ok(imported.expressionCurves.intensity.points.length > 1);
});

test("tied same-pitch notes export as one longer midi note", () => {
  const project = createInitialProject();
  project.notes = [
    { ...project.notes[0], pitch: 60, scoreTick: 0, durationTicks: 960, tiedToNext: false },
    { ...project.notes[1], pitch: 60, scoreTick: 960, durationTicks: 960, tiedToNext: false },
    { ...project.notes[2], pitch: 64, scoreTick: 1920, durationTicks: 960, tiedToNext: false }
  ];
  project.selectedIds = [project.notes[0].id];
  toggleTie(project);
  assert.equal(project.notes[0].tiedToNext, true);
  const bytes = exportMidi(project, BUILT_IN_PROFILES[0]);
  const imported = importMidi(bytes.buffer);
  const cNotes = imported.notes.filter((note) => note.pitch === 60);
  assert.equal(cNotes.length, 1);
  assert.ok(cNotes[0].durationTicks >= 1920);
});

test("tie is rejected when the next note has a different pitch", () => {
  const project = createInitialProject();
  project.selectedIds = [project.notes[0].id];
  toggleTie(project);
  assert.equal(project.notes[0].tiedToNext, false);
});

test("applyDynamic places a curve step at the selected note and shapes velocity", () => {
  const project = createInitialProject();
  project.expressionCurves.intensity = { parameter: "intensity", points: [] };
  project.selectedIds = [project.notes[0].id];
  assert.equal(applyDynamic(project, "mf"), true);
  assert.equal(sampleCurve(project, "intensity", 0), dynamicValue("mf"));
  assert.equal(project.notes[0].velocity, velocityForDynamic(dynamicValue("mf")));
});

test("applyDynamic mid-phrase is subito: previous level holds until the mark", () => {
  const project = createInitialProject();
  project.expressionCurves.intensity = { parameter: "intensity", points: [] };
  project.selectedIds = [project.notes[0].id];
  applyDynamic(project, "p");
  project.selectedIds = [project.notes[2].id]; // scoreTick 1920
  applyDynamic(project, "ff");
  assert.equal(sampleCurve(project, "intensity", 1919), dynamicValue("p"));
  assert.equal(sampleCurve(project, "intensity", 1920), dynamicValue("ff"));
});

test("applyDynamic without a selection applies from the cursor onward", () => {
  const project = createInitialProject();
  project.expressionCurves.intensity = { parameter: "intensity", points: [] };
  project.selectedIds = [];
  project.cursorTick = 1920;
  applyDynamic(project, "fff");
  assert.equal(project.notes[0].velocity, 72); // before the mark: untouched
  assert.equal(project.notes[2].velocity, velocityForDynamic(1));
  assert.equal(project.notes[3].velocity, velocityForDynamic(1));
});

test("addCrescendo keeps curve points outside the hairpin span", () => {
  const project = createInitialProject();
  project.expressionCurves.intensity = {
    parameter: "intensity",
    points: [{ tick: 0, value: 0.2 }, { tick: 5000, value: 0.9 }]
  };
  project.selectedIds = [project.notes[1].id, project.notes[2].id]; // 960..2880
  assert.equal(addCrescendo(project, "crescendo"), true);
  const ticks = project.expressionCurves.intensity.points.map((p) => p.tick);
  assert.ok(ticks.includes(0), "point before the hairpin survives");
  assert.ok(ticks.includes(5000), "point after the hairpin survives");
});

test("addCrescendo starts from the sounding level and aims at the next written level", () => {
  const project = createInitialProject();
  project.expressionCurves.intensity = {
    parameter: "intensity",
    points: [
      { tick: 0, value: dynamicValue("p") },
      { tick: 960, value: dynamicValue("p") },   // p holds up to the hairpin
      { tick: 5000, value: dynamicValue("f") }   // a later written f
    ]
  };
  project.selectedIds = [project.notes[1].id, project.notes[2].id];
  addCrescendo(project, "crescendo");
  const hairpin = project.crescendos.at(-1);
  assert.ok(Math.abs(hairpin.startIntensity - dynamicValue("p")) < 1e-9);
  assert.ok(Math.abs(hairpin.endIntensity - dynamicValue("f")) < 1e-9);
});

test("addCrescendo without a later mark moves two dynamic steps and respects direction", () => {
  const project = createInitialProject();
  project.expressionCurves.intensity = {
    parameter: "intensity",
    points: [{ tick: 0, value: dynamicValue("mf") }]
  };
  project.selectedIds = [project.notes[1].id, project.notes[2].id];
  addCrescendo(project, "decrescendo");
  const hairpin = project.crescendos.at(-1);
  assert.ok(hairpin.endIntensity < hairpin.startIntensity, "decrescendo must fall");
  assert.ok(Math.abs((hairpin.startIntensity - hairpin.endIntensity) - 2 / 7) < 1e-9);
});

test("notes under a crescendo get rising velocities", () => {
  const project = createInitialProject();
  project.expressionCurves.intensity = {
    parameter: "intensity",
    points: [{ tick: 0, value: dynamicValue("p") }]
  };
  project.selectedIds = project.notes.map((n) => n.id);
  addCrescendo(project, "crescendo");
  const velocities = project.notes.map((n) => n.velocity);
  const sorted = [...velocities].sort((a, b) => a - b);
  assert.deepEqual(velocities, sorted);
  assert.ok(velocities.at(-1) > velocities[0]);
});

test("applyDynamic records the mark for notation and replaces a same-tick mark", () => {
  const project = createInitialProject();
  project.selectedIds = [project.notes[0].id];
  applyDynamic(project, "p");
  applyDynamic(project, "mf"); // change your mind at the same spot
  assert.equal(project.dynamics.length, 1);
  assert.equal(project.dynamics[0].mark, "mf");
  assert.equal(project.dynamics[0].tick, project.notes[0].scoreTick);
});

test("MIDI import starts with no dynamic marks", () => {
  const source = createInitialProject();
  const bytes = exportMidi(source);
  const project = importMidi(bytes.buffer ?? bytes);
  assert.deepEqual(project.dynamics, []);
});
