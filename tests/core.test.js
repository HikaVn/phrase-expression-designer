import assert from "node:assert/strict";
import test from "node:test";
import {
  BUILT_IN_PROFILES,
  BUILT_IN_CALIBRATION_CURVES,
  getCalibrationCurve,
  applyCalibration,
  buildCalibrationProbe,
  reduceCalibrationMeasurement,
  fitCalibrationCurve,
  ENGINE_WIZARDS,
  engineWizardById,
  buildEngineProfile,
  autoAssignKeyswitches,
  addCrescendo,
  applyDynamic,
  addSlur,
  applyBatchProperties,
  applyNoteLetter,
  beamGroups,
  applySelectedNoteDuration,
  computePerformanceNotes,
  computeInterpretation,
  createDemoPhraseProject,
  parsePhrase,
  projectFromPhrase,
  getSetupGuide,
  DEFAULT_INTERPRETATION,
  copySelection,
  createNote,
  createInitialProject,
  deleteCurvePoint,
  deleteSelection,
  dynamicCommandFromText,
  dynamicValue,
  effectiveExpression,
  exportMidi,
  generateCcEvents,
  generateMidiEventList,
  generatePlaybackMessages,
  importMidi,
  isSharpPitch,
  nearestPitchForLetter,
  noteSpelling,
  keySignatureSteps,
  noteGlyph,
  noteNameToMidi,
  quantizeSelectedTimingToScore,
  removeDynamic,
  resetLocalOffsets,
  sampleCurve,
  selectedNotes,
  staffPosition,
  freezeSelectedTiming,
  pasteSelection,
  moveCurvePoint,
  setFrozenPerformanceTick,
  setNoteExpression,
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

test("dynamicCommandFromText parses marks and hairpins, rejects noise", () => {
  assert.deepEqual(dynamicCommandFromText("mf"), { type: "dynamic", mark: "mf" });
  assert.deepEqual(dynamicCommandFromText("  FF "), { type: "dynamic", mark: "ff" });
  assert.deepEqual(dynamicCommandFromText("<"), { type: "hairpin", direction: "crescendo" });
  assert.deepEqual(dynamicCommandFromText("cresc."), { type: "hairpin", direction: "crescendo" });
  assert.deepEqual(dynamicCommandFromText(">"), { type: "hairpin", direction: "decrescendo" });
  assert.deepEqual(dynamicCommandFromText("dim"), { type: "hairpin", direction: "decrescendo" });
  assert.equal(dynamicCommandFromText("fortissimo"), null);
  assert.equal(dynamicCommandFromText(""), null);
});

test("removeDynamic deletes the mark, its curve step, and re-derives velocities", () => {
  const project = createInitialProject();
  project.expressionCurves.intensity = { parameter: "intensity", points: [] };
  project.selectedIds = [project.notes[0].id];
  applyDynamic(project, "p");
  project.selectedIds = [project.notes[2].id]; // tick 1920
  applyDynamic(project, "ff");
  const ffMark = project.dynamics.find((d) => d.mark === "ff");

  assert.equal(removeDynamic(project, ffMark.id), true);
  assert.deepEqual(project.dynamics.map((d) => d.mark), ["p"]);
  // The ff step (and its hold point) are gone: the level is p throughout.
  assert.equal(sampleCurve(project, "intensity", 1920), dynamicValue("p"));
  // Velocities behind the deleted mark follow the remaining curve again.
  assert.equal(project.notes[2].velocity, velocityForDynamic(dynamicValue("p")));
  assert.equal(removeDynamic(project, "missing"), false);
});

test("effectiveExpression mixes phrase and note layers by influence", () => {
  const project = createInitialProject();
  project.expressionCurves.intensity = {
    parameter: "intensity",
    points: [{ tick: 0, value: 0.4 }]
  };
  const note = project.notes[0]; // scoreTick 0 -> phrase value 0.4
  note.expression = { intensity: 0.8 };

  note.expressionInfluence = 1;
  assert.equal(effectiveExpression(project, note, "intensity"), 0.8);
  note.expressionInfluence = 0.5;
  assert.ok(Math.abs(effectiveExpression(project, note, "intensity") - 0.6) < 1e-9);
  note.expressionInfluence = 0;
  assert.equal(effectiveExpression(project, note, "intensity"), 0.4);
  // Without a note-level value the phrase wins regardless of influence.
  assert.equal(effectiveExpression(project, note, "timbre"),
    sampleCurve(project, "timbre", 0));
});

test("setNoteExpression writes and clears values on the selection", () => {
  const project = createInitialProject();
  project.selectedIds = [project.notes[0].id, project.notes[1].id];
  assert.equal(setNoteExpression(project, { parameter: "timbre", value: 0.9, influence: 0.5 }), 2);
  assert.equal(project.notes[0].expression.timbre, 0.9);
  assert.equal(project.notes[1].expressionInfluence, 0.5);
  setNoteExpression(project, { parameter: "timbre", value: null });
  assert.equal(project.notes[0].expression.timbre, undefined);
});

test("generated CC events reflect the note layer at its influence", () => {
  const project = createInitialProject();
  project.profileId = "opus_hollywood_strings";
  project.expressionCurves.intensity = {
    parameter: "intensity",
    points: [{ tick: 0, value: 0.4 }]
  };
  const ccFor = () => generateCcEvents(project)
    .find((e) => e.parameter === "intensity" && e.noteId === project.notes[0].id).value;
  const phraseOnly = ccFor();
  project.notes[0].expression = { intensity: 1 };
  project.notes[0].expressionInfluence = 1;
  const full = ccFor();
  project.notes[0].expressionInfluence = 0.5;
  const half = ccFor();
  assert.equal(phraseOnly, Math.round(0.4 * 127));
  assert.equal(full, 127);
  assert.ok(phraseOnly < half && half < full);
});

test("notes without note-level expression export exactly as before", () => {
  const project = createInitialProject();
  delete project.notes[0].expression; // simulate a project saved by an older version
  delete project.notes[0].expressionInfluence;
  const cc = generateCcEvents(project).find((e) => e.noteId === project.notes[0].id);
  assert.equal(cc.value, Math.round(sampleCurve(project, cc.parameter, 0) * 127));
});

test("staffPosition maps pitches to diatonic steps above each clef's bottom line", () => {
  // Treble: E4 bottom line, B4 middle line, F5 top line; C4 one ledger below.
  assert.equal(staffPosition(64, "treble"), 0);   // E4
  assert.equal(staffPosition(71, "treble"), 4);   // B4 (middle line)
  assert.equal(staffPosition(77, "treble"), 8);   // F5 (top line)
  assert.equal(staffPosition(60, "treble"), -2);  // C4 (ledger line below)
  // Sharps share the natural's position.
  assert.equal(staffPosition(61, "treble"), staffPosition(60, "treble")); // C#4 = C4
  // Bass: G2 bottom line, D3 middle line, C4 above the staff.
  assert.equal(staffPosition(43, "bass"), 0);     // G2
  assert.equal(staffPosition(50, "bass"), 4);     // D3 (middle line)
  assert.equal(staffPosition(60, "bass"), 10);    // C4 (ledger line above)
});

test("isSharpPitch flags black keys only", () => {
  assert.equal(isSharpPitch(60), false); // C
  assert.equal(isSharpPitch(61), true);  // C#
  assert.equal(isSharpPitch(66), true);  // F#
  assert.equal(isSharpPitch(71), false); // B
});

test("noteGlyph classifies durations for engraving (ppq 960)", () => {
  assert.deepEqual(noteGlyph(3840, 960), { base: 1, dotted: false, hollow: true, hasStem: false, flags: 0 });
  assert.deepEqual(noteGlyph(2880, 960), { base: 2, dotted: true, hollow: true, hasStem: true, flags: 0 });
  assert.deepEqual(noteGlyph(1920, 960), { base: 2, dotted: false, hollow: true, hasStem: true, flags: 0 });
  assert.deepEqual(noteGlyph(960, 960),  { base: 4, dotted: false, hollow: false, hasStem: true, flags: 0 });
  assert.deepEqual(noteGlyph(720, 960),  { base: 8, dotted: true, hollow: false, hasStem: true, flags: 1 });
  assert.deepEqual(noteGlyph(480, 960),  { base: 8, dotted: false, hollow: false, hasStem: true, flags: 1 });
  assert.deepEqual(noteGlyph(360, 960),  { base: 16, dotted: true, hollow: false, hasStem: true, flags: 2 });
  assert.deepEqual(noteGlyph(240, 960),  { base: 16, dotted: false, hollow: false, hasStem: true, flags: 2 });
  assert.deepEqual(noteGlyph(120, 960),  { base: 32, dotted: false, hollow: false, hasStem: true, flags: 3 });
});

test("beamGroups beams contiguous flagged notes within one beat", () => {
  const mk = (id, tick, dur) => ({ id, scoreTick: tick, durationTicks: dur, pitch: 60 });
  // 2 eighths in beat 1, then a quarter, then 4 sixteenths in beat 3,
  // then 2 eighths straddling the beat-3/4 boundary (must split apart).
  const notes = [
    mk("a", 0, 480), mk("b", 480, 480),
    mk("c", 960, 960),
    mk("d", 1920, 240), mk("e", 2160, 240), mk("f", 2400, 240), mk("g", 2640, 240),
    mk("h", 3360, 480), mk("i", 3840, 480)
  ];
  const groups = beamGroups(notes, 960);
  assert.deepEqual(groups, [["a", "b"], ["d", "e", "f", "g"]]);
});

test("beamGroups requires contiguity: a gap breaks the beam", () => {
  const mk = (id, tick, dur) => ({ id, scoreTick: tick, durationTicks: dur, pitch: 60 });
  const notes = [mk("a", 0, 240), mk("b", 480, 240)]; // rest between
  assert.deepEqual(beamGroups(notes, 960), []);
});

test("noteSpelling follows the key signature", () => {
  // C major: black keys spell sharp and carry the sign; naturals are bare.
  assert.deepEqual(noteSpelling(61, 0), { letter: "C", step: 28, accidental: "♯" });
  assert.equal(noteSpelling(60, 0).accidental, null);
  // G major (F#): F# needs no sign, F natural needs a natural sign.
  assert.equal(noteSpelling(66, 1).accidental, null);
  assert.deepEqual(noteSpelling(65, 1).accidental, "♮");
  // F major (Bb): the black key spells as Bb on B's step, no sign needed.
  const bFlat = noteSpelling(70, -1);
  assert.equal(bFlat.letter, "B");
  assert.equal(bFlat.accidental, null);
  // ...but B natural in F major needs a natural sign.
  assert.equal(noteSpelling(71, -1).accidental, "♮");
});

test("staffPosition respects key-signature spelling", () => {
  // Pitch 70 sits on A's position as A# (sharp keys) but B's as Bb (flat keys).
  assert.equal(staffPosition(70, "treble", 0), 3);
  assert.equal(staffPosition(70, "treble", -1), 4);
});

test("keySignatureSteps lists the right symbols per clef", () => {
  assert.deepEqual(keySignatureSteps(2, "treble"),
    [{ step: 8, symbol: "♯" }, { step: 5, symbol: "♯" }]);
  assert.deepEqual(keySignatureSteps(-3, "bass"),
    [{ step: 2, symbol: "♭" }, { step: 5, symbol: "♭" }, { step: 1, symbol: "♭" }]);
  assert.deepEqual(keySignatureSteps(0, "treble"), []);
});

test("engineWizardById returns the three engine wizards, null otherwise", () => {
  assert.deepEqual(ENGINE_WIZARDS.map((w) => w.id), ["opus", "kontakt", "logic"]);
  assert.equal(engineWizardById("opus").engine, "EastWest Opus");
  assert.equal(engineWizardById("kontakt").noteNaming, "Kontakt");
  assert.equal(engineWizardById("nope"), null);
});

test("autoAssignKeyswitches numbers keyswitch articulations and skips the rest", () => {
  const articulations = [
    { id: "sus", name: "Sustain", type: "long", trigger: { type: "keyswitch", lookAheadMs: 100 } },
    { id: "stac", name: "Staccato", type: "short", trigger: { type: "keyswitch", lookAheadMs: 100 } },
    { id: "leg", name: "Legato", type: "legato", trigger: { type: "default" } }
  ];
  const assigned = autoAssignKeyswitches(articulations, "C0", "C3=60");
  assert.equal(assigned[0].trigger.noteName, "C0");
  assert.equal(assigned[1].trigger.noteName, "C#0");
  assert.equal(assigned[2].trigger.noteName, undefined); // default trigger untouched
  // The input is not mutated.
  assert.equal(articulations[0].trigger.noteName, undefined);
});

test("autoAssignKeyswitches leaves notes unassigned when the engine has no keyswitches", () => {
  const articulations = [{ id: "sus", name: "Sustain", type: "long", trigger: { type: "keyswitch", lookAheadMs: 100 } }];
  const assigned = autoAssignKeyswitches(articulations, null, "Logic");
  assert.equal(assigned[0].trigger.noteName, undefined);
});

test("buildEngineProfile produces a validated profile for every engine", () => {
  ENGINE_WIZARDS.forEach((wizard) => {
    const profile = buildEngineProfile(wizard.id);
    assert.equal(profile.engine, wizard.engine);
    assert.equal(profile.noteNaming, wizard.noteNaming);
    assert.equal(profile.articulations.length, wizard.articulationPresets.length);
    assert.equal(profile.controls.length, wizard.controlPresets.length);
    const errors = validateProfile(profile).filter((m) => m.level === "Error");
    assert.deepEqual(errors, [], `${wizard.id} should validate without errors`);
    // Keyswitch slots are unique.
    const ksNotes = profile.articulations
      .filter((art) => art.trigger?.type === "keyswitch")
      .map((art) => art.trigger.noteName);
    assert.equal(new Set(ksNotes).size, ksNotes.length, `${wizard.id} keyswitches must be unique`);
  });
});

test("buildEngineProfile selects a subset and renumbers keyswitches from the start", () => {
  const profile = buildEngineProfile("opus", {
    library: "Custom Strings",
    patch: "Violas",
    articulationIds: ["legato", "staccato"],
    controlIds: ["intensity"]
  });
  assert.equal(profile.id, "eastwest_opus_custom_strings_violas");
  assert.deepEqual(profile.articulations.map((a) => a.id), ["legato", "staccato"]);
  assert.equal(profile.articulations[0].trigger.noteName, "C0");
  assert.equal(profile.articulations[1].trigger.noteName, "C#0");
  assert.deepEqual(profile.controls.map((c) => c.internalParameter), ["intensity"]);
});

test("buildEngineProfile for Logic has no keyswitches and uses default/manual triggers", () => {
  const profile = buildEngineProfile("logic");
  assert.equal(profile.keyswitchRange.low, 0);
  assert.equal(profile.keyswitchRange.high, 0);
  assert.ok(profile.articulations.every((art) => art.trigger.type !== "keyswitch"));
  assert.ok(profile.controls.every((control) => control.target.type === "midiCC"));
});

test("generatePlaybackMessages drops file meta and time-stamps playable bytes", () => {
  const project = createInitialProject();
  const messages = generatePlaybackMessages(project, BUILT_IN_PROFILES[0]);
  assert.ok(messages.length > 0);
  // No tempo/meta/sysex: every message is a channel-voice status byte.
  assert.ok(messages.every((m) => m.bytes[0] < 0xf0));
  assert.ok(messages.every((m) => typeof m.timeMs === "number" && m.timeMs >= 0));
  // One noteOn per note, in score order; the first sounds at the start.
  const noteOns = messages.filter((m) => m.type === "noteOn");
  assert.equal(noteOns.length, project.notes.length);
  assert.deepEqual(noteOns.map((m) => m.bytes[1]), [60, 62, 64, 67]);
  assert.equal(noteOns[0].timeMs, 0);
});

function twoPhraseProject() {
  const project = createInitialProject();
  // phrase 1: 60, 72(apex), 64 contiguous; gap 1440..1920; phrase 2: 62, 65
  project.notes = [
    createNote({ pitch: 60, scoreTick: 0, durationTicks: 480 }),
    createNote({ pitch: 72, scoreTick: 480, durationTicks: 480 }),
    createNote({ pitch: 64, scoreTick: 960, durationTicks: 480 }),
    createNote({ pitch: 62, scoreTick: 1920, durationTicks: 480 }),
    createNote({ pitch: 65, scoreTick: 2400, durationTicks: 480 })
  ];
  return project;
}

test("interpretation is off by default and adds nothing", () => {
  const project = createInitialProject();
  assert.equal(project.interpretation.enabled, false);
  assert.equal(computeInterpretation(project).size, 0);
});

test("interpretation shapes phrases: apex tenuto, breath, deterministic", () => {
  const project = twoPhraseProject();
  project.interpretation = { ...DEFAULT_INTERPRETATION, enabled: true, humanizeMs: 0 };
  const map = computeInterpretation(project);
  assert.equal(map.size, 5);
  const apex = project.notes[1]; // pitch 72, highest in phrase 1
  assert.ok(map.get(apex.id).durationMs > 0, "apex note is lengthened");
  assert.ok(map.get(project.notes[3].id).onsetMs > 0, "breath delays the new phrase");
  assert.equal(map.get(project.notes[0].id).onsetMs, 0, "first note of first phrase has no breath");
  // re-run is identical (reproducible performance)
  assert.equal(computeInterpretation(project).get(apex.id).durationMs, map.get(apex.id).durationMs);
});

test("interpretation amount 0 (or off) yields no adjustment", () => {
  const project = twoPhraseProject();
  project.interpretation = { ...DEFAULT_INTERPRETATION, enabled: true, amount: 0 };
  assert.equal(computeInterpretation(project).size, 0);
});

test("computePerformanceNotes folds in interpretation when enabled", () => {
  const project = twoPhraseProject();
  const off = computePerformanceNotes(project);
  project.interpretation = { ...DEFAULT_INTERPRETATION, enabled: true, humanizeMs: 0 };
  const on = computePerformanceNotes(project);
  assert.ok(on[3].performanceStartTick > off[3].performanceStartTick, "phrase-2 start is delayed by a breath");
  assert.ok(on[1].performanceDurationTicks > off[1].performanceDurationTicks, "apex note rings longer");
});

test("interpretation leaves frozen notes pinned", () => {
  const project = twoPhraseProject();
  project.notes[3].frozenPerformanceTick = 2000;
  project.interpretation = { ...DEFAULT_INTERPRETATION, enabled: true };
  const performance = computePerformanceNotes(project);
  assert.equal(performance[3].performanceStartTick, 2000);
});

test("interpretation accents strong beats louder than offbeats (velocityDelta)", () => {
  const project = createInitialProject();
  project.notes = [
    createNote({ pitch: 60, scoreTick: 0, durationTicks: 480 }),   // downbeat
    createNote({ pitch: 60, scoreTick: 480, durationTicks: 480 })  // offbeat
  ];
  // Isolate the metrical accent: no arch, no jitter.
  project.interpretation = { ...DEFAULT_INTERPRETATION, enabled: true, swell: 0, humanizeVel: 0 };
  const map = computeInterpretation(project);
  assert.ok(map.get(project.notes[0].id).velocityDelta > 0, "downbeat is lifted");
  assert.ok(map.get(project.notes[1].id).velocityDelta < 0, "offbeat is softened");
  assert.ok(map.get(project.notes[0].id).velocityDelta > map.get(project.notes[1].id).velocityDelta);
});

test("performanceVelocity inflects output without touching the notated velocity", () => {
  const project = createInitialProject();
  project.notes = [createNote({ pitch: 60, scoreTick: 0, durationTicks: 480, velocity: 70 })];
  project.interpretation = { ...DEFAULT_INTERPRETATION, enabled: true, swell: 0, humanizeVel: 0 };
  const perf = computePerformanceNotes(project, BUILT_IN_PROFILES[0]);
  assert.ok(perf[0].performanceVelocity > 70, "downbeat accent raises the played velocity");
  assert.equal(project.notes[0].velocity, 70, "the score velocity is unchanged");
  // And the MIDI note-on carries the performance velocity.
  const noteOn = generateMidiEventList(project, BUILT_IN_PROFILES[0]).find((e) => e.type === "noteOn");
  assert.equal(noteOn.bytes[2], perf[0].performanceVelocity);
});

test("performanceVelocity equals the notated velocity when interpretation is off", () => {
  const project = createInitialProject();
  const perf = computePerformanceNotes(project, BUILT_IN_PROFILES[0]);
  assert.deepEqual(perf.map((n) => n.performanceVelocity), project.notes.map((n) => n.velocity));
});

test("legato leaps are reached for more than steps (context-dependent onset)", () => {
  const project = createInitialProject();
  project.notes = [
    createNote({ pitch: 60, scoreTick: 0, durationTicks: 480, articulation: "legato" }),
    createNote({ pitch: 62, scoreTick: 480, durationTicks: 480, articulation: "legato" }),  // step (+2)
    createNote({ pitch: 74, scoreTick: 960, durationTicks: 480, articulation: "legato" }),  // leap (+12)
    createNote({ pitch: 75, scoreTick: 1440, durationTicks: 480, articulation: "legato" })  // last
  ];
  project.interpretation = { ...DEFAULT_INTERPRETATION, enabled: true, humanizeMs: 0 };
  const map = computeInterpretation(project, project.interpretation, BUILT_IN_PROFILES[0]);
  // notes[1] and notes[2] are both mid-phrase, so onset is the legato reach only.
  assert.ok(map.get(project.notes[2].id).onsetMs > map.get(project.notes[1].id).onsetMs,
    "the octave leap is reached for more than the step");
});

test("legato reach does not apply to non-legato articulations", () => {
  const project = createInitialProject();
  project.notes = [
    createNote({ pitch: 60, scoreTick: 0, durationTicks: 480, articulation: "sustain" }),
    createNote({ pitch: 74, scoreTick: 480, durationTicks: 480, articulation: "sustain" }), // big leap, but not legato
    createNote({ pitch: 75, scoreTick: 960, durationTicks: 480, articulation: "sustain" })
  ];
  project.interpretation = { ...DEFAULT_INTERPRETATION, enabled: true, humanizeMs: 0 };
  const map = computeInterpretation(project, project.interpretation, BUILT_IN_PROFILES[0]);
  assert.equal(map.get(project.notes[1].id).onsetMs, 0); // mid-phrase, sustain -> no reach
});

test("applyCalibration is identity without a curve, and interpolates with one", () => {
  assert.equal(applyCalibration(null, 0.3), 0.3);
  assert.equal(applyCalibration({ points: [] }, 0.3), 0.3);
  const linear = getCalibrationCurve(null, "linear");
  assert.equal(applyCalibration(linear, 0.42), 0.42);
  const s = getCalibrationCurve(null, "s_curve");
  assert.ok(applyCalibration(s, 0.25) < 0.25, "s-curve attenuates the low input");
  assert.equal(applyCalibration(s, 0.5), 0.5);
  // clamps out of range
  assert.equal(applyCalibration(linear, 2), 1);
  assert.equal(applyCalibration(linear, -1), 0);
});

test("getCalibrationCurve resolves built-ins; profile calibration overrides", () => {
  assert.equal(getCalibrationCurve(null, "nope"), null);
  assert.equal(getCalibrationCurve({}, "s_curve").id, "s_curve");
  // built-in dynamic_default is identity (no behaviour change by default)
  assert.equal(applyCalibration(getCalibrationCurve({}, "dynamic_default"), 0.4), 0.4);
  // a profile can override the shared default slot with its own shape
  const profile = { calibration: [{ id: "dynamic_default", points: [{ in: 0, out: 1 }, { in: 1, out: 1 }] }] };
  assert.equal(applyCalibration(getCalibrationCurve(profile, "dynamic_default"), 0), 1);
  assert.ok(BUILT_IN_CALIBRATION_CURVES.some((c) => c.id === "soft" && c.id === "soft"));
});

test("calibration curve reshapes CC output when assigned to a control", () => {
  const project = createInitialProject();
  project.expressionCurves.intensity = { parameter: "intensity", points: [{ tick: 0, value: 0.25 }] };
  const profile = structuredClone(BUILT_IN_PROFILES[0]);
  const intensity = profile.controls.find((c) => c.internalParameter === "intensity");
  intensity.calibrationCurveId = "linear";
  const linearVal = generateCcEvents(project, profile).find((e) => e.parameter === "intensity").value;
  intensity.calibrationCurveId = "s_curve";
  const sVal = generateCcEvents(project, profile).find((e) => e.parameter === "intensity").value;
  assert.equal(linearVal, Math.round(0.25 * 127));
  assert.ok(sVal < linearVal, "the s-curve pulls the low input down");
});

test("default profiles keep linear CC output (dynamic_default is identity)", () => {
  const project = createInitialProject();
  project.expressionCurves.intensity = { parameter: "intensity", points: [{ tick: 0, value: 0.6 }] };
  const cc = generateCcEvents(project, BUILT_IN_PROFILES[0]).find((e) => e.parameter === "intensity");
  assert.equal(cc.value, Math.round(0.6 * 127));
});

test("createDemoPhraseProject is a valid, interpretable A/B subject", () => {
  const project = createDemoPhraseProject();
  assert.ok(project.notes.length >= 6);
  assert.equal(project.interpretation.enabled, true);
  assert.equal(validateProfile(getProfileForDemo(project)).filter((m) => m.level === "Error").length, 0);
  const perf = computePerformanceNotes(project);
  assert.equal(perf.length, project.notes.length);
  assert.ok(generateMidiEventList(project).some((e) => e.type === "noteOn"));
  // interpretation actually changes the rendered performance for this phrase
  const off = computePerformanceNotes({ ...project, interpretation: { ...DEFAULT_INTERPRETATION, enabled: false } });
  assert.ok(perf.some((n, i) => n.performanceStartTick !== off[i].performanceStartTick || n.performanceVelocity !== off[i].performanceVelocity));
});

function getProfileForDemo(project) {
  return BUILT_IN_PROFILES.find((p) => p.id === project.profileId) ?? BUILT_IN_PROFILES[0];
}

test("buildCalibrationProbe sweeps CC on a held note with matching windows", () => {
  const probe = buildCalibrationProbe({ cc: 1, pitch: 60, steps: 8, dwellMs: 200, leadMs: 100 });
  assert.equal(probe.messages[0].bytes[0] & 0xf0, 0x90); // noteOn first
  assert.equal(probe.messages.at(-1).bytes[0] & 0xf0, 0x80); // noteOff last
  const ccMsgs = probe.messages.filter((m) => (m.bytes[0] & 0xf0) === 0xb0);
  assert.equal(ccMsgs.length, 8);
  assert.equal(ccMsgs[0].bytes[1], 1); // cc number
  assert.equal(ccMsgs[0].bytes[2], 0); // first step = 0
  assert.equal(ccMsgs.at(-1).bytes[2], 127); // last step = full
  assert.equal(probe.windows.length, 8);
  // times are non-decreasing and bytes valid
  let last = -1;
  probe.messages.forEach((m) => { assert.ok(m.timeMs >= last); last = m.timeMs; assert.ok(m.bytes.every((b) => b >= 0 && b <= 0xff)); });
});

test("reduceCalibrationMeasurement skips the window front and averages RMS", () => {
  const windows = [{ value01: 0, startMs: 0, endMs: 100 }];
  // loud attack in the first 40%, settles to 0.1 after
  const samples = [
    { timeMs: 10, rms: 0.9 }, { timeMs: 30, rms: 0.9 },
    { timeMs: 50, rms: 0.1 }, { timeMs: 70, rms: 0.1 }, { timeMs: 90, rms: 0.1 }
  ];
  const [m] = reduceCalibrationMeasurement(samples, windows, { skipFraction: 0.4 });
  assert.ok(Math.abs(m.rms - 0.1) < 1e-9, "attack transient is skipped");
  assert.equal(m.value01, 0);
});

test("fitCalibrationCurve inverts the measured response to linearise it", () => {
  // A library whose normalized loudness grows as cc^2: to get loudness x you
  // must drive cc = sqrt(x), so the fitted curve should map 0.25 -> ~0.5.
  const measured = [0, 0.25, 0.5, 0.75, 1].map((v) => ({ value01: v, level: v * v }));
  const curve = fitCalibrationCurve(measured, { id: "m", outPoints: 9 });
  assert.ok(Math.abs(applyCalibration(curve, 0.25) - 0.5) < 0.05);
  // monotonic, spans the unit square
  const outs = curve.points.map((p) => p.out);
  assert.deepEqual(outs, [...outs].sort((a, b) => a - b));
  assert.equal(curve.points[0].in, 0);
  assert.equal(curve.points.at(-1).in, 1);
});

test("fitCalibrationCurve falls back to linear on flat or degenerate input", () => {
  assert.deepEqual(fitCalibrationCurve([{ value01: 0, level: -40 }, { value01: 1, level: -40 }]).points,
    [{ in: 0, out: 0 }, { in: 1, out: 1 }]);
  assert.deepEqual(fitCalibrationCurve([]).points, [{ in: 0, out: 0 }, { in: 1, out: 1 }]);
});

test("parsePhrase: sticky duration, nearest-octave letters, ticks advance", () => {
  const { notes, endTick } = parsePhrase("4 C D E", { ppq: 960 });
  assert.deepEqual(notes.map((n) => n.pitch), [72, 74, 76]); // nearest to default 67, then walk
  assert.deepEqual(notes.map((n) => n.scoreTick), [0, 960, 1920]);
  assert.ok(notes.every((n) => n.durationTicks === 960));
  assert.equal(endTick, 2880);
});

test("parsePhrase: dotted/sticky values, rests, explicit octave, accidentals", () => {
  const half = parsePhrase("2 C 4. D", { ppq: 960 });
  assert.equal(half.notes[0].durationTicks, 1920);
  assert.equal(half.notes[1].durationTicks, 1440); // dotted quarter
  assert.equal(half.notes[1].scoreTick, 1920);

  const withRest = parsePhrase("4 C r D", { ppq: 960 });
  assert.equal(withRest.rests.length, 1);
  assert.equal(withRest.rests[0].scoreTick, 960);
  assert.equal(withRest.notes[1].scoreTick, 1920);

  assert.equal(parsePhrase("C4").notes[0].pitch, 60);
  assert.equal(parsePhrase("C5").notes[0].pitch, 72);
  assert.equal(parsePhrase("C#4").notes[0].pitch, 61);
  assert.equal(parsePhrase("Bb4").notes[0].pitch, 70);
  assert.throws(() => parsePhrase("4 H"), /Bad token/);
  assert.throws(() => parsePhrase("3 C"), /Bad duration/);
});

test("projectFromPhrase builds a playable project", () => {
  const project = projectFromPhrase("4 C D E F | 2 G", { ppq: 960, profileId: "logic_preset_strings" });
  assert.equal(project.profileId, "logic_preset_strings");
  assert.equal(project.notes.length, 5);
  assert.equal(project.cursorTick, project.notes.reduce((m, n) => Math.max(m, n.scoreTick + n.durationTicks), 0));
  assert.ok(generateMidiEventList(project).some((e) => e.type === "noteOn"));
});

test("getSetupGuide returns runnable commands, urls, and adapts to the DAW/goal", () => {
  const guide = getSetupGuide();
  assert.equal(guide.daw, "logic");
  const ids = guide.steps.map((s) => s.id);
  assert.ok(ids.includes("iac") && ids.includes("connect") && ids.includes("blackhole"));
  // a runnable command is surfaced as-is
  assert.ok(guide.steps.find((s) => s.id === "blackhole").command.includes("brew install blackhole-2ch"));
  assert.ok(guide.steps.find((s) => s.id === "serve").command === "npm start");
  // every URL (when present) is a real https/app link
  assert.ok(guide.steps.every((s) => !s.url || /^https?:\/\//.test(s.url)));
  // DAW-specific instrument note
  assert.notEqual(getSetupGuide({ daw: "reaper" }).steps.find((s) => s.id === "instrument").detail,
    getSetupGuide({ daw: "logic" }).steps.find((s) => s.id === "instrument").detail);
  // playback goal drops the calibration-only steps
  assert.ok(!getSetupGuide({ goal: "playback" }).steps.some((s) => s.id === "blackhole"));
});

test("buildEngineProfile for Kontakt uses MIDI Learn controls", () => {
  const profile = buildEngineProfile("kontakt");
  assert.ok(profile.controls.every((control) => control.target.type === "midiLearnRequired"));
  assert.equal(profile.articulations[0].trigger.noteName, "C-1");
  assert.throws(() => buildEngineProfile("unknown"), /Unknown engine wizard/);
});
