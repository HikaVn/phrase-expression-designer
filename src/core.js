export const PPQ_DEFAULT = 960;
export const TICKS_PER_BAR_DEFAULT = PPQ_DEFAULT * 4;

export const INTERNAL_PARAMETERS = [
  "intensity",
  "volume",
  "timbre",
  "brightness",
  "vibratoDepth",
  "vibratoSpeed",
  "legatoTime",
  "releaseTail",
  "bowPressure",
  "bowSpeed",
  "bowPosition",
  "conSordino",
  "fingerPosition",
  "phraseFlow"
];

export const PHRASE_TEMPLATES = [
  { id: "natural_swell", name: "Natural Swell", points: [[0, 0.35], [0.5, 0.78], [1, 0.48]] },
  { id: "soft_entry", name: "Soft Entry", points: [[0, 0.12], [0.25, 0.32], [1, 0.62]] },
  { id: "breath_ending", name: "Breath Ending", points: [[0, 0.68], [0.75, 0.55], [1, 0.18]] },
  { id: "delayed_vibrato", name: "Delayed Vibrato", points: [[0, 0.05], [0.45, 0.08], [0.72, 0.62], [1, 0.75]] },
  { id: "cinematic_rise", name: "Cinematic Rise", points: [[0, 0.2], [0.65, 0.55], [1, 1]] },
  { id: "bow_change", name: "Bow Change", points: [[0, 0.62], [0.48, 0.38], [0.52, 0.72], [1, 0.58]] },
  { id: "decrescendo", name: "Decrescendo", points: [[0, 0.85], [1, 0.2]] },
  { id: "phrase_arch", name: "Phrase Arch", points: [[0, 0.25], [0.33, 0.72], [0.66, 0.76], [1, 0.28]] }
];

export const BUILT_IN_PROFILES = [
  {
    schemaVersion: "0.1.0",
    id: "opus_hollywood_strings",
    engine: "EastWest Opus",
    library: "Hollywood Strings",
    patch: "1st Violins KS Master",
    noteNaming: "C3=60",
    playableRange: { low: 55, high: 103 },
    keyswitchRange: { low: 12, high: 36 },
    articulations: [
      articulation("sustain", "Sustain", "long", "C0", 100, -80),
      articulation("legato", "Legato", "legato", "C#0", 100, -80, 5, 80),
      articulation("staccato", "Staccato", "short", "F#0", 70, -20),
      articulation("accent", "Accent", "accent", "G0", 80, -30),
      articulation("marcato", "Marcato", "marcato", "A0", 80, -40)
    ],
    controls: [
      ccControl("intensity", "Modulation wheel", 1),
      ccControl("legatoTime", "Legato Time", 5),
      ccControl("midiVolume", "MIDI Volume", 7),
      ccControl("pan", "MIDI Pan", 10),
      ccControl("volume", "Expression", 11),
      ccControl("conSordino", "Con Sordino", 15),
      ccControl("trueLegatoMono", "True Legato: Mono", 22),
      ccControl("fingerPosition", "Finger Position", 70)
    ],
    timing: { trackOffsetMs: 0, ccLookAheadMs: 80, programChangeLookAheadMs: 150 },
    calibration: [],
    setupInstructions: [
      "OpusでARTICULATIONSタブを開く",
      "未使用奏法のNoneを左クリックし、Key Switchを選択する",
      "Opus側パッチを別名保存する",
      "AUTOMATIONタブのCC割当を本Profileと照合する"
    ],
    validationRules: [],
    testEvents: []
  },
  {
    schemaVersion: "0.1.0",
    id: "8dio_century_strings",
    engine: "Kontakt",
    library: "8Dio Century Strings",
    patch: "8Dio Century - Violins 1",
    noteNaming: "Kontakt",
    playableRange: { low: 55, high: 103 },
    keyswitchRange: { low: 12, high: 33 },
    articulations: [
      articulation("sus_vibrato", "SUS VIBRATO", "long", "C-1", 100, -80),
      articulation("legato", "LEGATO", "legato", "C#-1", 100, -80, 5, 80),
      articulation("sus_molto_vib", "SUS MOLTO VIB", "long", "D-1", 100, -80),
      articulation("sus_non_vib", "SUS NON VIB", "long", "D#-1", 100, -80),
      articulation("sus_nv_mv", "SUS NV-MV", "long", "E-1", 100, -80),
      articulation("marcato", "MARCATO", "marcato", "F-1", 80, -40),
      articulation("staccato", "STACCATO", "short", "F#-1", 70, -20),
      articulation("spiccato_feather", "SPICCATO FEATHER", "short", "G-1", 70, -20),
      articulation("spiccato_tapped", "SPICCATO TAPPED", "short", "G#-1", 70, -20),
      articulation("loure_short", "LOURE SHORT", "short", "A-1", 70, -20)
    ],
    controls: [
      learnControl("intensity", "DYNAMICS", 1),
      learnControl("volume", "EXPRESSION", 11),
      learnControl("legatoSpeed", "SPEED", 20),
      learnControl("releaseTail", "RELEASE TAILS", 23),
      learnControl("vibratoDepth", "VIBRATO", 21),
      learnControl("legatoVolume", "LEGATO VOL.", 24)
    ],
    timing: { trackOffsetMs: 0, ccLookAheadMs: 80, programChangeLookAheadMs: 150 },
    calibration: [],
    setupInstructions: [
      "Kontakt画面の奏法表とKeyswitchを確認する",
      "ノブ類はMIDI Learnまたは手動対象として分類する",
      "Kontakt内部ファイルは直接編集しない"
    ],
    validationRules: [],
    testEvents: []
  },
  {
    schemaVersion: "0.1.0",
    id: "logic_preset_strings",
    engine: "Logic Instrument",
    library: "Logic Preset Strings",
    patch: "Studio Strings",
    noteNaming: "Logic",
    playableRange: { low: 36, high: 103 },
    keyswitchRange: { low: 0, high: 0 },
    articulations: [
      { id: "sustain", name: "Sustain", type: "long", trigger: { type: "default" }, performance: { globalOffsetMs: -20 } },
      { id: "legato", name: "Legato", type: "legato", trigger: { type: "default" }, performance: { globalOffsetMs: -30, overlapPercent: 5, overlapMaxMs: 80 } },
      { id: "staccato", name: "Staccato", type: "short", trigger: { type: "manual", reason: "Confirm available articulation control in Logic." }, performance: { globalOffsetMs: 0 } },
      { id: "accent", name: "Accent", type: "accent", trigger: { type: "manual", reason: "Confirm available articulation control in Logic." }, performance: { globalOffsetMs: 0 } },
      { id: "marcato", name: "Marcato", type: "marcato", trigger: { type: "manual", reason: "Confirm available articulation control in Logic." }, performance: { globalOffsetMs: 0 } }
    ],
    controls: [
      ccControl("intensity", "Dynamics", 1),
      ccControl("volume", "Expression", 11)
    ],
    timing: { trackOffsetMs: 0, ccLookAheadMs: 80, programChangeLookAheadMs: 150 },
    calibration: [],
    setupInstructions: [
      "Logicプリセット弦楽器を読み込む",
      "使用可能なArticulationとSmart Controlsを手動確認する",
      "MIDI CC1/11の反応を確認する"
    ],
    validationRules: [],
    testEvents: []
  }
];

function articulation(id, name, type, noteName, lookAheadMs, globalOffsetMs, overlapPercent = 0, overlapMaxMs = 0) {
  return {
    id,
    name,
    type,
    trigger: { type: "keyswitch", noteName, lookAheadMs },
    performance: { globalOffsetMs, overlapPercent, overlapMaxMs }
  };
}

function ccControl(internalParameter, label, cc) {
  return { internalParameter, label, target: { type: "midiCC", cc }, calibrationCurveId: "dynamic_default", enabled: true };
}

function learnControl(internalParameter, label, suggestedCC) {
  return { internalParameter, label, target: { type: "midiLearnRequired", suggestedCC }, enabled: true };
}

// Engine-specific Setup Wizards. Each wizard carries a richer preset *menu*
// than the shipped built-in profiles: the user picks which articulations and
// controls their patch actually has, and the wizard builds a validated profile
// with engine-correct note naming, ranges, timing, and (for keyswitch engines)
// automatically numbered keyswitch slots.
function artPreset(id, name, type, performance = {}, trigger = { type: "keyswitch", lookAheadMs: 100 }) {
  return {
    id,
    name,
    type,
    trigger,
    performance: { globalOffsetMs: 0, overlapPercent: 0, overlapMaxMs: 0, ...performance }
  };
}

const TRIGGER_DEFAULT = { type: "default" };
function triggerManual() {
  return { type: "manual", reason: "Confirm available articulation control in the source instrument." };
}

export const ENGINE_WIZARDS = [
  {
    id: "opus",
    label: "EastWest Opus",
    engine: "EastWest Opus",
    defaultLibrary: "Hollywood Strings",
    defaultPatch: "1st Violins KS Master",
    summary:
      "Opus/Play系。奏法はARTICULATIONSタブでKey Switchに割り当て、CCはAUTOMATIONタブで対応させます。内部パッチは別名保存してください。",
    noteNaming: "C3=60",
    playableRange: { low: 55, high: 103 },
    keyswitchRange: { low: 12, high: 36 },
    keyswitchStartNote: "C0",
    timing: { trackOffsetMs: 0, ccLookAheadMs: 80, programChangeLookAheadMs: 150 },
    articulationPresets: [
      artPreset("sustain", "Sustain", "long", { globalOffsetMs: -80 }),
      artPreset("legato", "Legato", "legato", { globalOffsetMs: -80, overlapPercent: 5, overlapMaxMs: 80 }),
      artPreset("portato", "Portato", "long", { globalOffsetMs: -40 }),
      artPreset("spiccato", "Spiccato", "short", { globalOffsetMs: -20 }),
      artPreset("staccato", "Staccato", "short", { globalOffsetMs: -20 }),
      artPreset("pizzicato", "Pizzicato", "short", { globalOffsetMs: -10 }),
      artPreset("tremolo", "Tremolo", "long", { globalOffsetMs: -60 }),
      artPreset("trill_half", "Trill (half)", "long", { globalOffsetMs: -60 }),
      artPreset("trill_whole", "Trill (whole)", "long", { globalOffsetMs: -60 }),
      artPreset("marcato", "Marcato", "marcato", { globalOffsetMs: -40 }),
      artPreset("accent", "Accent", "accent", { globalOffsetMs: -30 }),
      artPreset("harmonics", "Harmonics", "long", { globalOffsetMs: -60 })
    ],
    controlPresets: [
      ccControl("intensity", "Modulation wheel", 1),
      ccControl("legatoTime", "Legato Time", 5),
      ccControl("midiVolume", "MIDI Volume", 7),
      ccControl("pan", "MIDI Pan", 10),
      ccControl("volume", "Expression", 11),
      ccControl("conSordino", "Con Sordino", 15),
      ccControl("vibratoDepth", "Vibrato", 21),
      ccControl("fingerPosition", "Finger Position", 70)
    ],
    setupInstructions: [
      "OpusでARTICULATIONSタブを開く",
      "未使用奏法のNoneを左クリックし、Key Switchを選択する",
      "本Profileのキースイッチ割当（自動採番）と照合する",
      "Opus側パッチを別名保存する",
      "AUTOMATIONタブのCC割当を本Profileと照合する"
    ]
  },
  {
    id: "kontakt",
    label: "Kontakt / 8Dio",
    engine: "Kontakt",
    defaultLibrary: "8Dio Century Strings",
    defaultPatch: "8Dio Century - Violins 1",
    summary:
      "Kontakt系（8Dio Century等）。奏法は画面下部のキースイッチ、ノブ類はMIDI Learnで対応させます。Kontakt内部ファイルは編集しません。",
    noteNaming: "Kontakt",
    playableRange: { low: 55, high: 103 },
    keyswitchRange: { low: 12, high: 33 },
    keyswitchStartNote: "C-1",
    timing: { trackOffsetMs: 0, ccLookAheadMs: 80, programChangeLookAheadMs: 150 },
    articulationPresets: [
      artPreset("sus_vibrato", "SUS VIBRATO", "long", { globalOffsetMs: -80 }),
      artPreset("legato", "LEGATO", "legato", { globalOffsetMs: -80, overlapPercent: 5, overlapMaxMs: 80 }),
      artPreset("sus_molto_vib", "SUS MOLTO VIB", "long", { globalOffsetMs: -80 }),
      artPreset("sus_non_vib", "SUS NON VIB", "long", { globalOffsetMs: -80 }),
      artPreset("marcato", "MARCATO", "marcato", { globalOffsetMs: -40 }),
      artPreset("staccato", "STACCATO", "short", { globalOffsetMs: -20 }),
      artPreset("spiccato_feather", "SPICCATO FEATHER", "short", { globalOffsetMs: -20 }),
      artPreset("spiccato_tapped", "SPICCATO TAPPED", "short", { globalOffsetMs: -20 }),
      artPreset("loure_short", "LOURE SHORT", "short", { globalOffsetMs: -20 }),
      artPreset("tremolo", "TREMOLO", "long", { globalOffsetMs: -60 }),
      artPreset("trill", "TRILL", "long", { globalOffsetMs: -60 })
    ],
    controlPresets: [
      learnControl("intensity", "DYNAMICS", 1),
      learnControl("volume", "EXPRESSION", 11),
      learnControl("vibratoDepth", "VIBRATO", 21),
      learnControl("legatoSpeed", "SPEED", 20),
      learnControl("releaseTail", "RELEASE TAILS", 23),
      learnControl("legatoVolume", "LEGATO VOL.", 24)
    ],
    setupInstructions: [
      "Kontakt画面の奏法表とKeyswitchを確認する",
      "本Profileのキースイッチ割当（自動採番）と照合する",
      "ノブ類はMIDI Learnまたは手動対象として分類する",
      "Kontakt内部ファイルは直接編集しない"
    ]
  },
  {
    id: "logic",
    label: "Logic Preset",
    engine: "Logic Instrument",
    defaultLibrary: "Logic Preset Strings",
    defaultPatch: "Studio Strings",
    summary:
      "Logic内蔵音源。Articulationはデフォルト/Smart Controlsで切替。キースイッチは持ちません。CC1/CC11の反応を手動確認します。",
    noteNaming: "Logic",
    playableRange: { low: 36, high: 103 },
    keyswitchRange: { low: 0, high: 0 },
    keyswitchStartNote: null,
    timing: { trackOffsetMs: 0, ccLookAheadMs: 80, programChangeLookAheadMs: 150 },
    articulationPresets: [
      artPreset("sustain", "Sustain", "long", { globalOffsetMs: -20 }, TRIGGER_DEFAULT),
      artPreset("legato", "Legato", "legato", { globalOffsetMs: -30, overlapPercent: 5, overlapMaxMs: 80 }, TRIGGER_DEFAULT),
      artPreset("staccato", "Staccato", "short", { globalOffsetMs: 0 }, triggerManual()),
      artPreset("accent", "Accent", "accent", { globalOffsetMs: 0 }, triggerManual()),
      artPreset("marcato", "Marcato", "marcato", { globalOffsetMs: 0 }, triggerManual()),
      artPreset("pizzicato", "Pizzicato", "short", { globalOffsetMs: 0 }, triggerManual())
    ],
    controlPresets: [
      ccControl("intensity", "Dynamics", 1),
      ccControl("volume", "Expression", 11)
    ],
    setupInstructions: [
      "Logicプリセット弦楽器を読み込む",
      "使用可能なArticulationとSmart Controlsを手動確認する",
      "MIDI CC1/11の反応を確認する"
    ]
  }
];

export function engineWizardById(id) {
  return ENGINE_WIZARDS.find((wizard) => wizard.id === id) ?? null;
}

// Number the keyswitch-triggered articulations chromatically from a start note,
// leaving default/manual articulations untouched. Returns new objects.
export function autoAssignKeyswitches(articulations, startNoteName = "C0", noteNaming = "C3=60") {
  const startMidi = startNoteName === null ? null : noteNameToMidi(startNoteName, noteNaming);
  let slot = 0;
  return articulations.map((art) => {
    if (art.trigger?.type !== "keyswitch" || startMidi === null) return structuredClone(art);
    const noteName = pitchName(startMidi + slot, noteNaming);
    slot += 1;
    return { ...structuredClone(art), trigger: { ...art.trigger, noteName } };
  });
}

function engineProfileId(engine, library, patch) {
  return [engine, library, patch]
    .map((part) => String(part || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, ""))
    .filter(Boolean)
    .join("_") || "custom_profile";
}

// Build a complete, validated-shape instrument profile from an engine wizard
// and the user's selection of articulations/controls. Pure and testable.
export function buildEngineProfile(wizardId, selection = {}) {
  const wizard = engineWizardById(wizardId);
  if (!wizard) throw new Error(`Unknown engine wizard: ${wizardId}`);
  const library = String(selection.library ?? wizard.defaultLibrary ?? "Custom Library").trim() || "Custom Library";
  const patch = String(selection.patch ?? wizard.defaultPatch ?? "Custom Patch").trim() || "Custom Patch";
  const artIds = selection.articulationIds ?? wizard.articulationPresets.map((art) => art.id);
  const ctrlIds = selection.controlIds ?? wizard.controlPresets.map((control) => control.internalParameter);
  const articulations = autoAssignKeyswitches(
    wizard.articulationPresets.filter((art) => artIds.includes(art.id)).map((art) => structuredClone(art)),
    wizard.keyswitchStartNote,
    wizard.noteNaming
  );
  const controls = wizard.controlPresets
    .filter((control) => ctrlIds.includes(control.internalParameter))
    .map((control) => structuredClone(control));
  return {
    schemaVersion: "0.1.0",
    id: engineProfileId(wizard.engine, library, patch),
    engine: wizard.engine,
    library,
    patch,
    noteNaming: wizard.noteNaming,
    playableRange: { ...wizard.playableRange },
    keyswitchRange: { ...wizard.keyswitchRange },
    articulations,
    controls,
    timing: { ...wizard.timing },
    calibration: [],
    setupInstructions: [...wizard.setupInstructions],
    validationRules: [],
    testEvents: []
  };
}

// Interpretation = the "retained performer". A steerable layer that derives
// the micro-decisions a real player makes (phrase shaping, agogics, breath,
// human imperfection) from the score itself, written as timing/duration
// nudges on top of the score — never altering the notated values. Disabled by
// default so the engine stays a faithful transcoder until you ask for a player.
export const DEFAULT_INTERPRETATION = {
  enabled: false,
  amount: 1,        // overall strength 0..1 (the main dial)
  breathMs: 45,     // luft/breath before a new phrase
  apexTenutoMs: 60, // lengthen the phrase apex (peak) note
  finalRelaxMs: 30, // relax (delay) the phrase-final note
  humanizeMs: 8,    // deterministic +/- onset jitter ("alive", reproducible)
  swell: 12,        // velocity arch depth: lift toward the apex, ease the edges
  accent: 8,        // metrical accent: strong beats louder, offbeats softer
  humanizeVel: 4,   // deterministic +/- velocity jitter
  seed: 1
};

export function createInitialProject() {
  return {
    schemaVersion: "0.1.0",
    title: "Untitled Phrase",
    ppq: PPQ_DEFAULT,
    tempoMap: [{ tick: 0, bpm: 120 }],
    timeSignature: { numerator: 4, denominator: 4 },
    cursorTick: 0,
    selectedIds: [],
    selectedBars: [],
    mode: "select",
    clef: "treble",
    keySignature: 0,
    notes: [
      createNote({ pitch: 60, scoreTick: 0, durationTicks: 960, articulation: "sustain", velocity: 72 }),
      createNote({ pitch: 62, scoreTick: 960, durationTicks: 960, articulation: "legato", velocity: 76 }),
      createNote({ pitch: 64, scoreTick: 1920, durationTicks: 960, articulation: "legato", velocity: 78 }),
      createNote({ pitch: 67, scoreTick: 2880, durationTicks: 960, articulation: "marcato", velocity: 88 })
    ],
    rests: [],
    slurs: [],
    crescendos: [],
    dynamics: [],
    selectedDynamicId: null,
    expressionCurves: {
      intensity: { parameter: "intensity", points: [{ tick: 0, value: 0.35 }, { tick: 1920, value: 0.8 }, { tick: 3840, value: 0.55 }] },
      volume: { parameter: "volume", points: [{ tick: 0, value: 0.45 }, { tick: 3840, value: 0.62 }] },
      timbre: { parameter: "timbre", points: [{ tick: 0, value: 0.4 }, { tick: 3840, value: 0.68 }] },
      vibratoDepth: { parameter: "vibratoDepth", points: [{ tick: 0, value: 0.1 }, { tick: 2400, value: 0.62 }, { tick: 3840, value: 0.7 }] },
      phraseFlow: { parameter: "phraseFlow", points: [{ tick: 0, value: 0.2 }, { tick: 1920, value: 0.85 }, { tick: 3840, value: 0.25 }] }
    },
    profileId: "opus_hollywood_strings",
    trackTimingOffsetMs: 0,
    interpretation: { ...DEFAULT_INTERPRETATION }
  };
}

export function createNote({ pitch, scoreTick, durationTicks, articulation = "sustain", velocity = 72, localStartOffsetMs = 0, localEndOffsetMs = 0, expression = {}, expressionInfluence = 1 }) {
  return {
    id: cryptoRandomId("note"),
    pitch,
    scoreTick,
    durationTicks,
    velocity,
    articulation,
    localStartOffsetMs,
    localEndOffsetMs,
    localDurationOffsetMs: 0,
    tiedToNext: false,
    frozenPerformanceTick: null,
    phraseOffsetMs: 0,
    humanizeMs: 0,
    expression,
    expressionInfluence
  };
}

export function copySelection(project) {
  const notes = selectedNotes(project).sort((a, b) => a.scoreTick - b.scoreTick || a.pitch - b.pitch);
  if (notes.length === 0) return null;
  const selected = new Set(notes.map((note) => note.id));
  const baseTick = Math.min(...notes.map((note) => note.scoreTick));
  return {
    type: "phrase-expression-designer-selection",
    baseTick,
    notes: notes.map((note) => ({ ...structuredClone(note), relativeTick: note.scoreTick - baseTick })),
    slurs: project.slurs.filter((slur) => selected.has(slur.startNoteId) && selected.has(slur.endNoteId)),
    crescendos: project.crescendos.filter((hairpin) => selected.has(hairpin.startNoteId) && selected.has(hairpin.endNoteId))
  };
}

export function pasteSelection(project, clipboard, atTick = project.cursorTick) {
  if (!clipboard || clipboard.type !== "phrase-expression-designer-selection" || !Array.isArray(clipboard.notes)) return [];
  const idMap = new Map();
  const notes = clipboard.notes.map((source) => {
    const id = cryptoRandomId("note");
    idMap.set(source.id, id);
    const { relativeTick, ...note } = source;
    return {
      ...structuredClone(note),
      id,
      scoreTick: atTick + Number(relativeTick ?? 0)
    };
  });
  const slurs = (clipboard.slurs ?? [])
    .filter((slur) => idMap.has(slur.startNoteId) && idMap.has(slur.endNoteId))
    .map((slur) => ({ ...structuredClone(slur), id: cryptoRandomId("slur"), startNoteId: idMap.get(slur.startNoteId), endNoteId: idMap.get(slur.endNoteId) }));
  const crescendos = (clipboard.crescendos ?? [])
    .filter((hairpin) => idMap.has(hairpin.startNoteId) && idMap.has(hairpin.endNoteId))
    .map((hairpin) => ({ ...structuredClone(hairpin), id: cryptoRandomId("crescendo"), startNoteId: idMap.get(hairpin.startNoteId), endNoteId: idMap.get(hairpin.endNoteId) }));
  project.notes.push(...notes);
  project.slurs.push(...slurs);
  project.crescendos.push(...crescendos);
  project.selectedIds = notes.map((note) => note.id);
  project.selectedBars = [];
  project.cursorTick = notes.reduce((max, note) => Math.max(max, note.scoreTick + note.durationTicks), atTick);
  return notes;
}

export function deleteSelection(project) {
  const selected = new Set(project.selectedIds);
  project.notes = project.notes.filter((note) => !selected.has(note.id));
  project.slurs = project.slurs.filter((slur) => !selected.has(slur.startNoteId) && !selected.has(slur.endNoteId));
  project.crescendos = project.crescendos.filter((hairpin) => !selected.has(hairpin.startNoteId) && !selected.has(hairpin.endNoteId));
  project.selectedIds = [];
  project.selectedBars = [];
}

export function cloneProject(project) {
  return structuredClone(project);
}

export function getProfile(project) {
  return BUILT_IN_PROFILES.find((profile) => profile.id === project.profileId) ?? BUILT_IN_PROFILES[0];
}

export function getArticulation(profile, articulationId) {
  return profile.articulations.find((item) => item.id === articulationId) ?? profile.articulations[0];
}

export function tickToMs(tick, tempoMap, ppq) {
  const sorted = [...tempoMap].sort((a, b) => a.tick - b.tick);
  let elapsed = 0;
  for (let i = 0; i < sorted.length; i += 1) {
    const current = sorted[i];
    const next = sorted[i + 1];
    const endTick = next ? Math.min(tick, next.tick) : tick;
    if (endTick > current.tick) {
      elapsed += ((endTick - current.tick) / ppq) * (60000 / current.bpm);
    }
    if (!next || tick < next.tick) break;
  }
  return elapsed;
}

export function msToTick(ms, tempoMap, ppq, referenceTick = 0) {
  const bpm = bpmAtTick(referenceTick, tempoMap);
  return Math.round((ms / 60000) * bpm * ppq);
}

export function bpmAtTick(tick, tempoMap) {
  return [...tempoMap].sort((a, b) => a.tick - b.tick).reduce((bpm, item) => (item.tick <= tick ? item.bpm : bpm), tempoMap[0]?.bpm ?? 120);
}

export function formatPosition(tick, ppq) {
  const ticksPerBar = ppq * 4;
  const bar = Math.floor(tick / ticksPerBar) + 1;
  const beat = Math.floor((tick % ticksPerBar) / ppq) + 1;
  const sub = tick % ppq;
  return `${bar}.${beat}.${String(sub).padStart(3, "0")}`;
}

export function pitchName(midiNote, noteNaming = "C3=60") {
  const names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const octaveOffset = noteNaming === "C4=60" ? -1 : -2;
  return `${names[((midiNote % 12) + 12) % 12]}${Math.floor(midiNote / 12) + octaveOffset}`;
}

export function noteNameToMidi(noteName, noteNaming = "C3=60") {
  const match = /^([A-G])([#b]?)(-?\d+)$/.exec(noteName.trim());
  if (!match) return null;
  const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[match[1]];
  const accidental = match[2] === "#" ? 1 : match[2] === "b" ? -1 : 0;
  const octaveOffset = noteNaming === "C4=60" ? 1 : 2;
  return (Number(match[3]) + octaveOffset) * 12 + base + accidental;
}

export function applyNoteLetter(project, letter) {
  const last = getLastEditedNote(project);
  const basis = last?.pitch ?? 67;
  const pitch = nearestPitchForLetter(letter, basis);
  if (project.mode === "notation") {
    const note = createNote({
      pitch,
      scoreTick: project.cursorTick,
      durationTicks: getDefaultDuration(project),
      articulation: "sustain",
      velocity: 72
    });
    project.notes.push(note);
    project.selectedIds = [note.id];
    project.selectedBars = [];
    project.cursorTick += note.durationTicks;
    return;
  }
  const selected = selectedNotes(project);
  if (selected.length > 0) {
    selected.forEach((note) => {
      note.pitch = nearestPitchForLetter(letter, note.pitch);
    });
  }
}

export function nearestPitchForLetter(letter, basisPitch) {
  const targetPc = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[letter.toUpperCase()];
  let best = targetPc;
  let bestDistance = Infinity;
  for (let pitch = 0; pitch <= 127; pitch += 1) {
    if (pitch % 12 !== targetPc) continue;
    const distance = Math.abs(pitch - basisPitch);
    if (distance < bestDistance || (distance === bestDistance && pitch > best)) {
      best = pitch;
      bestDistance = distance;
    }
  }
  return best;
}

export function transposeSelection(project, semitones) {
  const targets = selectedNotes(project);
  const fallback = targets.length ? targets : [getLastEditedNote(project)].filter(Boolean);
  fallback.forEach((note) => {
    note.pitch = clamp(note.pitch + semitones, 0, 127);
  });
}

export function addRest(project, durationTicks = getDefaultDuration(project)) {
  project.rests.push({ id: cryptoRandomId("rest"), scoreTick: project.cursorTick, durationTicks });
  project.selectedIds = [];
  project.selectedBars = [];
  project.cursorTick += durationTicks;
}

export function applySelectedNoteDuration(project, durationTicks) {
  const duration = Math.max(1, Math.round(Number(durationTicks)));
  if (!Number.isFinite(duration)) {
    return { selectedCount: 0, changedCount: 0, adjustedNotes: 0, deletedNotes: 0, addedRests: 0 };
  }
  const selectedIds = new Set(project.selectedIds);
  const targets = selectedNotes(project);
  if (targets.length === 0) {
    project.defaultDurationTicks = duration;
    return { selectedCount: 0, changedCount: 0, adjustedNotes: 0, deletedNotes: 0, addedRests: 0 };
  }

  let changedCount = 0;
  targets.forEach((note) => {
    if (note.durationTicks !== duration) changedCount += 1;
    note.durationTicks = duration;
  });

  const overlapResult = resolveNoteOverlaps(project);
  cleanupScoreReferences(project);
  const addedRests = fillGapsAfterSelectedNotes(project, selectedIds);
  normalizeRestsAgainstNotes(project);
  cleanupScoreReferences(project);

  project.selectedIds = project.selectedIds.filter((id) => project.notes.some((note) => note.id === id));
  project.selectedBars = [];
  const selectedAfter = selectedNotes(project);
  if (selectedAfter.length > 0) {
    project.cursorTick = Math.max(...selectedAfter.map((note) => note.scoreTick + note.durationTicks));
  }
  project.defaultDurationTicks = duration;
  return {
    selectedCount: targets.length,
    changedCount,
    adjustedNotes: overlapResult.adjustedNotes,
    deletedNotes: overlapResult.deletedNotes,
    addedRests
  };
}

export function toggleTie(project) {
  selectedNotes(project).forEach((note) => {
    const next = nextNote(project, note);
    if (next?.pitch === note.pitch) note.tiedToNext = !note.tiedToNext;
    else note.tiedToNext = false;
  });
}

export function addSlur(project) {
  const notes = selectedNotes(project).sort((a, b) => a.scoreTick - b.scoreTick);
  if (notes.length === 0) return false;
  const start = notes[0];
  const end = notes.length === 1 ? nextNote(project, start) : notes[notes.length - 1];
  if (!end) return false;
  project.slurs.push({ id: cryptoRandomId("slur"), startNoteId: start.id, endNoteId: end.id });
  return true;
}

// Dynamic marks, soft to loud. Mark i sits at i / (count - 1) on the
// normalized intensity scale, so hairpins can move in whole "steps".
export const DYNAMIC_MARKS = ["ppp", "pp", "p", "mp", "mf", "f", "ff", "fff"];
const DYNAMIC_STEP = 1 / (DYNAMIC_MARKS.length - 1);

export function dynamicValue(mark) {
  const index = DYNAMIC_MARKS.indexOf(mark);
  return index === -1 ? null : index * DYNAMIC_STEP;
}

export function velocityForDynamic(value) {
  return clamp(Math.round(30 + 90 * value), 1, 127);
}

function intensityCurve(project) {
  if (!project.expressionCurves.intensity) {
    project.expressionCurves.intensity = { parameter: "intensity", points: [] };
  }
  return project.expressionCurves.intensity;
}

function setCurvePointAt(curve, tick, value) {
  curve.points = curve.points.filter((point) => point.tick !== tick);
  curve.points.push({ tick, value });
  curve.points.sort((a, b) => a.tick - b.tick);
}

// Parse the dynamics-popover text (Sibelius-style Cmd+E entry) into a command.
export function dynamicCommandFromText(text) {
  const token = String(text ?? "").trim().toLowerCase();
  if (token === "") return null;
  if (token === "<" || token === "cresc" || token === "cresc." || token === "crescendo") {
    return { type: "hairpin", direction: "crescendo" };
  }
  if (token === ">" || token === "dim" || token === "dim." || token === "decresc"
      || token === "decresc." || token === "decrescendo" || token === "diminuendo") {
    return { type: "hairpin", direction: "decrescendo" };
  }
  if (DYNAMIC_MARKS.includes(token)) return { type: "dynamic", mark: token };
  return null;
}

export function applyDynamic(project, mark) {
  const value = dynamicValue(mark);
  if (value === null) return false;
  const notes = selectedNotes(project).sort((a, b) => a.scoreTick - b.scoreTick);
  const tick = notes.length > 0 ? notes[0].scoreTick : project.cursorTick;
  const curve = intensityCurve(project);
  // Subito: hold the previous level right up to the mark, then step.
  const previous = sampleCurve(project, "intensity", tick);
  if (tick > 0 && curve.points.some((point) => point.tick < tick)) {
    setCurvePointAt(curve, tick - 1, previous);
  }
  setCurvePointAt(curve, tick, value);
  // Record the mark itself so the notation view can engrave it.
  project.dynamics = (project.dynamics ?? []).filter((d) => d.tick !== tick);
  project.dynamics.push({ id: cryptoRandomId("dynamic"), tick, mark });
  project.dynamics.sort((a, b) => a.tick - b.tick);
  // Velocities follow the (updated) curve: the selection if there is one,
  // otherwise every note from the mark onward.
  const targets = notes.length > 0 ? notes : project.notes.filter((n) => n.scoreTick >= tick);
  targets.forEach((note) => {
    note.velocity = velocityForDynamic(sampleCurve(project, "intensity", note.scoreTick));
  });
  return true;
}

// Staff geometry: diatonic steps above the staff's bottom line (half a staff
// space each). Treble puts E4 on the bottom line, bass puts G2 there — so the
// same pitch lands where a player expects under either clef. The key decides
// the spelling (B♭ sits on B's line, A♯ on A's).
const CLEF_BOTTOM_STEP = { treble: 4 * 7 + 2, bass: 2 * 7 + 4 }; // E4 / G2

export function staffPosition(pitch, clef = "treble", key = 0) {
  return noteSpelling(pitch, key).step - (CLEF_BOTTOM_STEP[clef] ?? CLEF_BOTTOM_STEP.treble);
}

export function isSharpPitch(pitch) {
  return [1, 3, 6, 8, 10].includes(((pitch % 12) + 12) % 12);
}

// Key signatures: -7..+7 (negative = flats, positive = sharps, 0 = C/Am).
export const KEY_SIGNATURES = [
  { value: 0, label: "C / Am" },
  { value: 1, label: "G (♯1)" }, { value: 2, label: "D (♯2)" }, { value: 3, label: "A (♯3)" },
  { value: 4, label: "E (♯4)" }, { value: 5, label: "B (♯5)" }, { value: 6, label: "F♯ (♯6)" },
  { value: 7, label: "C♯ (♯7)" },
  { value: -1, label: "F (♭1)" }, { value: -2, label: "B♭ (♭2)" }, { value: -3, label: "E♭ (♭3)" },
  { value: -4, label: "A♭ (♭4)" }, { value: -5, label: "D♭ (♭5)" }, { value: -6, label: "G♭ (♭6)" },
  { value: -7, label: "C♭ (♭7)" }
];

const LETTER_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const LETTER_INDEX = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };
const PC_LETTER = ["C", null, "D", null, "E", "F", null, "G", null, "A", null, "B"];
const SHARP_ORDER = ["F", "C", "G", "D", "A", "E", "B"];
const FLAT_ORDER = ["B", "E", "A", "D", "G", "C", "F"];

function keyAlterFor(letter, key) {
  if (key > 0 && SHARP_ORDER.indexOf(letter) < key) return 1;
  if (key < 0 && FLAT_ORDER.indexOf(letter) < -key) return -1;
  return 0;
}

// How a pitch is written under a key signature: which letter (as an absolute
// diatonic step) and which accidental, if any, must be engraved. Black keys
// spell sharp in sharp keys and flat in flat keys; a natural sign appears when
// the key signature says altered but the note is not.
export function noteSpelling(pitch, key = 0) {
  const pc = ((pitch % 12) + 12) % 12;
  const octave = Math.floor(pitch / 12) - 1;
  let letter = PC_LETTER[pc];
  let alter = 0;
  if (letter === null) {
    if (key < 0) {
      letter = PC_LETTER[(pc + 1) % 12];
      alter = -1;
    } else {
      letter = PC_LETTER[(pc + 11) % 12];
      alter = 1;
    }
  }
  const step = octave * 7 + LETTER_INDEX[letter];
  const keyAlter = keyAlterFor(letter, key);
  let accidental = null;
  if (alter !== keyAlter) accidental = alter === 1 ? "♯" : alter === -1 ? "♭" : "♮";
  return { letter, step, accidental };
}

// Staff steps (above the clef's bottom line) where key-signature symbols sit.
const KEY_SIG_STEPS = {
  treble: { sharp: [8, 5, 9, 6, 3, 7, 4], flat: [4, 7, 3, 6, 2, 5, 1] },
  bass: { sharp: [6, 3, 7, 4, 1, 5, 2], flat: [2, 5, 1, 4, 0, 3, -1] }
};

export function keySignatureSteps(key, clef = "treble") {
  const table = KEY_SIG_STEPS[clef] ?? KEY_SIG_STEPS.treble;
  if (key > 0) return table.sharp.slice(0, key).map((step) => ({ step, symbol: "♯" }));
  if (key < 0) return table.flat.slice(0, -key).map((step) => ({ step, symbol: "♭" }));
  return [];
}

// Classify a duration for engraving: head shape, stem, flag count, dot.
// base 1 = whole, 2 = half, ... 32 = thirty-second.
export function noteGlyph(durationTicks, ppq) {
  const bases = [
    { base: 1, ticks: ppq * 4 },
    { base: 2, ticks: ppq * 2 },
    { base: 4, ticks: ppq },
    { base: 8, ticks: ppq / 2 },
    { base: 16, ticks: ppq / 4 },
    { base: 32, ticks: ppq / 8 }
  ];
  let chosen = bases[bases.length - 1];
  for (const candidate of bases) {
    if (durationTicks >= candidate.ticks) {
      chosen = candidate;
      break;
    }
  }
  return {
    base: chosen.base,
    dotted: durationTicks >= chosen.ticks * 1.5 && chosen.base > 1,
    hollow: chosen.base <= 2,
    hasStem: chosen.base >= 2,
    flags: chosen.base >= 8 ? Math.log2(chosen.base) - 2 : 0
  };
}

// Beam grouping: runs of flagged notes (8th and shorter) that are contiguous
// in time and stay inside one beat are beamed together instead of flagged.
export function beamGroups(notes, ppq) {
  const sorted = [...notes].sort((a, b) => a.scoreTick - b.scoreTick);
  const groups = [];
  let current = null;
  sorted.forEach((note) => {
    const flags = noteGlyph(note.durationTicks, ppq).flags;
    const beat = Math.floor(note.scoreTick / ppq);
    if (flags >= 1 && current && current.end === note.scoreTick && current.beat === beat) {
      current.ids.push(note.id);
      current.end = note.scoreTick + note.durationTicks;
    } else if (flags >= 1) {
      current = { ids: [note.id], beat, end: note.scoreTick + note.durationTicks };
      groups.push(current);
    } else {
      current = null;
    }
  });
  return groups.filter((group) => group.ids.length >= 2).map((group) => group.ids);
}

// Phrase-level curve and note-level expression are independent layers; the
// output mixes them per note: phrase + (note - phrase) * influence.
// influence 1.0 = the note's value wins fully, 0.0 = phrase only.
export function effectiveExpression(project, note, parameter) {
  const phrase = sampleCurve(project, parameter, note.scoreTick);
  const noteValue = note.expression?.[parameter];
  if (noteValue === undefined || noteValue === null) return phrase;
  const amount = clamp(Number(note.expressionInfluence ?? 1), 0, 1);
  return clamp(phrase + (clamp(Number(noteValue), 0, 1) - phrase) * amount, 0, 1);
}

export function setNoteExpression(project, { parameter, value, influence }) {
  const notes = selectedNotes(project);
  if (notes.length === 0) return 0;
  notes.forEach((note) => {
    if (parameter !== undefined && value !== undefined) {
      note.expression = note.expression ?? {};
      if (value === null) {
        delete note.expression[parameter];
      } else {
        note.expression[parameter] = clamp(Number(value), 0, 1);
      }
    }
    if (influence !== undefined) {
      note.expressionInfluence = clamp(Number(influence), 0, 1);
    }
  });
  return notes.length;
}

export function removeDynamic(project, dynamicId) {
  const dynamics = project.dynamics ?? [];
  const index = dynamics.findIndex((d) => d.id === dynamicId);
  if (index === -1) return false;
  const { tick } = dynamics[index];
  dynamics.splice(index, 1);
  // Take out the points the mark wrote: its step and the hold just before it.
  const curve = project.expressionCurves.intensity;
  if (curve) {
    curve.points = curve.points.filter((p) => p.tick !== tick && p.tick !== tick - 1);
  }
  // Velocities in the mark's former region (up to the next mark) follow the
  // curve that remains.
  const next = dynamics.find((d) => d.tick > tick);
  const limit = next ? next.tick : Infinity;
  project.notes
    .filter((note) => note.scoreTick >= tick && note.scoreTick < limit)
    .forEach((note) => {
      note.velocity = velocityForDynamic(sampleCurve(project, "intensity", note.scoreTick));
    });
  return true;
}

export function addCrescendo(project, direction = "crescendo") {
  const notes = selectedNotes(project).sort((a, b) => a.scoreTick - b.scoreTick);
  if (notes.length === 0) return false;
  const start = notes[0];
  const end = notes.length === 1 ? nextNote(project, start) : notes[notes.length - 1];
  if (!end) return false;
  const startTick = start.scoreTick;
  const endTick = end.scoreTick + end.durationTicks;

  const curve = intensityCurve(project);
  // Start from the level that is actually sounding at the hairpin, and aim at
  // the level already written after it (a following dynamic mark), falling
  // back to two dynamic steps in the hairpin's direction.
  const startValue = sampleCurve(project, "intensity", startTick);
  const later = [...curve.points].sort((a, b) => a.tick - b.tick).find((p) => p.tick > endTick);
  let endValue = later ? later.value : startValue + (direction === "crescendo" ? 2 : -2) * DYNAMIC_STEP;
  if (direction === "crescendo" && endValue <= startValue) endValue = startValue + 2 * DYNAMIC_STEP;
  if (direction === "decrescendo" && endValue >= startValue) endValue = startValue - 2 * DYNAMIC_STEP;
  endValue = clamp(endValue, 0, 1);

  // Merge: only the hairpin's own span is rewritten; the rest of the curve stays.
  curve.points = curve.points.filter((point) => point.tick < startTick || point.tick > endTick);
  curve.points.push({ tick: startTick, value: startValue }, { tick: endTick, value: endValue });
  curve.points.sort((a, b) => a.tick - b.tick);

  project.crescendos.push({
    id: cryptoRandomId("crescendo"),
    startNoteId: start.id,
    endNoteId: end.id,
    direction,
    curveType: "S-Curve",
    curveOrder: 2,
    startIntensity: startValue,
    endIntensity: endValue,
    timbreFollowsDynamics: true,
    expressionFollowsDynamics: true,
    vibratoAmount: 0.35
  });

  // Notes under the hairpin follow it.
  project.notes
    .filter((note) => note.scoreTick >= startTick && note.scoreTick <= endTick)
    .forEach((note) => {
      note.velocity = velocityForDynamic(sampleCurve(project, "intensity", note.scoreTick));
    });
  return true;
}

export function applyBatchProperties(project, patch) {
  const targets = selectedNotes(project);
  targets.forEach((note) => {
    if (patch.pitch?.enabled) note.pitch = clamp(Number(patch.pitch.value), 0, 127);
    if (patch.articulation?.enabled) note.articulation = patch.articulation.value;
    if (patch.offset?.enabled) note.localStartOffsetMs = Number(patch.offset.value);
    if (patch.velocity?.enabled) note.velocity = clamp(Number(patch.velocity.value), 1, 127);
  });
  return targets.length;
}

export function resetLocalOffsets(project) {
  selectedNotes(project).forEach((note) => {
    note.localStartOffsetMs = 0;
    note.localEndOffsetMs = 0;
    note.localDurationOffsetMs = 0;
    note.frozenPerformanceTick = null;
  });
}

export function freezeSelectedTiming(project, profile = getProfile(project)) {
  const performanceById = new Map(computePerformanceNotes(project, profile).map((note) => [note.id, note]));
  selectedNotes(project).forEach((note) => {
    note.frozenPerformanceTick = performanceById.get(note.id)?.performanceStartTick ?? note.scoreTick;
  });
}

export function quantizeSelectedTimingToScore(project) {
  selectedNotes(project).forEach((note) => {
    note.frozenPerformanceTick = null;
    note.localStartOffsetMs = 0;
    note.humanizeMs = 0;
    note.phraseOffsetMs = 0;
  });
}

export function setFrozenPerformanceTick(project, noteId, performanceTick) {
  const note = project.notes.find((item) => item.id === noteId);
  if (!note) return false;
  note.frozenPerformanceTick = Math.max(0, Math.round(performanceTick));
  return true;
}

export function selectedNotes(project) {
  const selected = new Set(project.selectedIds);
  return project.notes.filter((note) => selected.has(note.id));
}

export function mixedValue(notes, key) {
  if (notes.length === 0) return "";
  const first = notes[0][key];
  return notes.every((note) => note[key] === first) ? first : "Mixed";
}

export function getLastEditedNote(project) {
  if (project.selectedIds.length) {
    const selected = selectedNotes(project).sort((a, b) => b.scoreTick - a.scoreTick);
    if (selected[0]) return selected[0];
  }
  return [...project.notes].sort((a, b) => b.scoreTick - a.scoreTick)[0] ?? null;
}

export function nextNote(project, note) {
  return [...project.notes].sort((a, b) => a.scoreTick - b.scoreTick).find((candidate) => candidate.scoreTick > note.scoreTick) ?? null;
}

// Small deterministic PRNG so "human" jitter is alive but reproducible
// (and testable). Same seed + note order => same performance.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Split the notes into phrases: a new phrase starts wherever a gap (a rest, or
// any silence) separates a note from the previous note's end.
function segmentPhrases(notes) {
  const sorted = [...notes].sort((a, b) => a.scoreTick - b.scoreTick || a.pitch - b.pitch);
  const phrases = [];
  let current = null;
  sorted.forEach((note) => {
    if (current && note.scoreTick <= current.end + 1) {
      current.notes.push(note);
      current.end = Math.max(current.end, note.scoreTick + note.durationTicks);
    } else {
      current = { notes: [note], end: note.scoreTick + note.durationTicks };
      phrases.push(current);
    }
  });
  return phrases.map((phrase) => phrase.notes);
}

// The performer's micro-decisions, derived from the score. Returns a map of
// noteId -> { onsetMs, durationMs, velocityDelta } nudges. Pure; does not
// mutate the project.
export function computeInterpretation(project, settings = project.interpretation) {
  const result = new Map();
  if (!settings || !settings.enabled) return result;
  const amount = clamp(Number(settings.amount ?? 1), 0, 1);
  if (amount === 0) return result;
  const breathMs = (settings.breathMs ?? 0) * amount;
  const apexTenutoMs = (settings.apexTenutoMs ?? 0) * amount;
  const finalRelaxMs = (settings.finalRelaxMs ?? 0) * amount;
  const humanizeMs = (settings.humanizeMs ?? 0) * amount;
  const swell = settings.swell ?? 0;
  const accent = settings.accent ?? 0;
  const humanizeVel = settings.humanizeVel ?? 0;
  const ticksPerBar = project.ppq * 4;
  const beatTol = project.ppq / 16;
  const rng = mulberry32(settings.seed ?? 1);
  segmentPhrases(project.notes).forEach((phrase, phraseIndex) => {
    // Apex = the phrase's peak: highest pitch, breaking ties toward the louder
    // (then earlier) note — the note a player naturally leans on.
    let apexIndex = 0;
    phrase.forEach((note, index) => {
      const apex = phrase[apexIndex];
      if (note.pitch > apex.pitch || (note.pitch === apex.pitch && (note.velocity ?? 0) > (apex.velocity ?? 0))) apexIndex = index;
    });
    phrase.forEach((note, index) => {
      let onsetMs = 0;
      let durationMs = 0;
      if (index === 0 && phraseIndex > 0) onsetMs += breathMs;        // breath into a new phrase
      if (index === phrase.length - 1) {                              // relax + linger at the close
        onsetMs += finalRelaxMs;
        durationMs += apexTenutoMs * 0.5;
      }
      if (index === apexIndex) durationMs += apexTenutoMs;            // agogic lean on the peak
      onsetMs += (rng() * 2 - 1) * humanizeMs;                        // human onset imperfection

      // Velocity: a phrase arch (peak at the apex, eased at the edges) plus a
      // metrical accent (strong beats louder, offbeats softer) plus jitter.
      const arch = swell * (archShape(index, apexIndex, phrase.length) - 0.5);
      const metric = metricalAccent(note.scoreTick, ticksPerBar, project.ppq, beatTol, accent);
      const velJitter = (rng() * 2 - 1) * humanizeVel;
      const velocityDelta = (arch + metric + velJitter) * amount;

      result.set(note.id, { onsetMs, durationMs, velocityDelta });
    });
  });
  return result;
}

// Phrase-arch weight in [0,1]: 1 at the apex, ramping from the phrase edges.
function archShape(index, apexIndex, length) {
  if (length <= 1 || index === apexIndex) return 1;
  if (index < apexIndex) return apexIndex === 0 ? 1 : index / apexIndex;
  const tail = length - 1 - apexIndex;
  return tail === 0 ? 1 : (length - 1 - index) / tail;
}

// Metrical accent in velocity units: downbeat strongest, beat 3 next, other
// beats slightly accented, offbeats slightly softened.
function metricalAccent(scoreTick, ticksPerBar, ppq, beatTol, accent) {
  const inBar = ((scoreTick % ticksPerBar) + ticksPerBar) % ticksPerBar;
  const beatIndex = Math.round(inBar / ppq);
  const onBeat = Math.abs(inBar - beatIndex * ppq) <= beatTol;
  if (!onBeat) return -accent * 0.25;
  if (beatIndex % 4 === 0) return accent;
  if (beatIndex % 4 === 2) return accent * 0.5;
  return accent * 0.25;
}

export function computePerformanceNotes(project, profile = getProfile(project)) {
  const interpretation = computeInterpretation(project);
  return project.notes.map((note) => {
    const art = getArticulation(profile, note.articulation);
    const performance = art?.performance ?? {};
    // Frozen (user-pinned) notes opt out of interpretation.
    const interp = (note.frozenPerformanceTick == null && interpretation.get(note.id)) || { onsetMs: 0, durationMs: 0, velocityDelta: 0 };
    const offsetMs =
      (profile.timing?.trackOffsetMs ?? 0) +
      (project.trackTimingOffsetMs ?? 0) +
      (performance.globalOffsetMs ?? 0) +
      (note.phraseOffsetMs ?? 0) +
      (note.localStartOffsetMs ?? 0) +
      (note.humanizeMs ?? 0) +
      interp.onsetMs;
    const startTick = note.frozenPerformanceTick ?? note.scoreTick + msToTick(offsetMs, project.tempoMap, project.ppq, note.scoreTick);
    const overlapMs = art?.type === "legato" ? Math.min((tickToMs(note.durationTicks, [{ tick: 0, bpm: bpmAtTick(note.scoreTick, project.tempoMap) }], project.ppq) * (performance.overlapPercent ?? 0)) / 100, performance.overlapMaxMs ?? 0) : 0;
    const endOffsetTick = msToTick((note.localEndOffsetMs ?? 0) + overlapMs + (note.localDurationOffsetMs ?? 0) + interp.durationMs, project.tempoMap, project.ppq, note.scoreTick + note.durationTicks);
    const durationTicks = Math.max(1, note.durationTicks + endOffsetTick);
    const performanceVelocity = clamp(Math.round((note.velocity ?? 72) + interp.velocityDelta), 1, 127);
    return { ...note, performanceStartTick: Math.max(0, startTick), performanceDurationTicks: durationTicks, performanceVelocity, articulationName: art?.name ?? note.articulation };
  });
}

export function applyPhraseTemplate(project, parameter, templateId, startTick = 0, endTick = project.ppq * 4) {
  const template = PHRASE_TEMPLATES.find((item) => item.id === templateId);
  if (!template) return false;
  project.expressionCurves[parameter] = {
    parameter,
    points: template.points.map(([ratio, value]) => ({ tick: Math.round(startTick + (endTick - startTick) * ratio), value }))
  };
  return true;
}

export function upsertCurvePoint(project, parameter, tick, value) {
  const curve = project.expressionCurves[parameter] ?? { parameter, points: [] };
  const snappedTick = Math.max(0, Math.round(tick));
  const clampedValue = clamp(value, 0, 1);
  const existing = curve.points.find((point) => Math.abs(point.tick - snappedTick) <= project.ppq / 16);
  if (existing) {
    existing.tick = snappedTick;
    existing.value = clampedValue;
  } else {
    curve.points.push({ tick: snappedTick, value: clampedValue });
  }
  curve.points.sort((a, b) => a.tick - b.tick);
  project.expressionCurves[parameter] = curve;
  return curve;
}

export function moveCurvePoint(project, parameter, pointIndex, tick, value) {
  const curve = project.expressionCurves[parameter];
  if (!curve || !curve.points[pointIndex]) return false;
  curve.points[pointIndex] = {
    tick: Math.max(0, Math.round(tick)),
    value: clamp(value, 0, 1)
  };
  curve.points.sort((a, b) => a.tick - b.tick);
  return true;
}

export function deleteCurvePoint(project, parameter, pointIndex) {
  const curve = project.expressionCurves[parameter];
  if (!curve || !curve.points[pointIndex]) return false;
  curve.points.splice(pointIndex, 1);
  return true;
}

export function generateCcEvents(project, profile = getProfile(project)) {
  const events = [];
  const performanceNotes = computePerformanceNotes(project, profile);
  performanceNotes.forEach((note) => {
    profile.controls.filter((control) => control.enabled && control.target?.type === "midiCC").forEach((control) => {
      const lookAheadTick = Math.max(0, note.performanceStartTick - msToTickPrecise(profile.timing?.ccLookAheadMs ?? 80, project.tempoMap, project.ppq, note.performanceStartTick));
      events.push({
        tick: lookAheadTick,
        cc: control.target.cc,
        value: clamp(Math.round(effectiveExpression(project, note, control.internalParameter) * 127), 0, 127),
        parameter: control.internalParameter,
        label: control.label,
        noteId: note.id
      });
    });
  });
  return events.sort((a, b) => a.tick - b.tick || a.cc - b.cc);
}

export function generateMidiEventList(project, profile = getProfile(project)) {
  const events = [];
  const tempoMap = project.tempoMap.length ? project.tempoMap : [{ tick: 0, bpm: 120 }];
  tempoMap.forEach((tempo) => {
    events.push({
      tick: tempo.tick,
      type: "tempo",
      source: "tempoMap",
      detail: `BPM ${tempo.bpm}`,
      priority: 0,
      bytes: metaTempoBytes(tempo.bpm)
    });
  });
  const performanceNotes = mergeTiedPerformanceNotes(project, computePerformanceNotes(project, profile));
  performanceNotes.forEach((note) => {
    const art = getArticulation(profile, note.articulation);
    if (art?.trigger?.type === "keyswitch") {
      const key = noteNameToMidi(art.trigger.noteName, profile.noteNaming);
      const lookAheadTick = Math.max(0, note.performanceStartTick - msToTickPrecise(art.trigger.lookAheadMs ?? 100, project.tempoMap, project.ppq, note.performanceStartTick));
      if (key !== null) {
        events.push({
          tick: lookAheadTick,
          type: "keyswitchOn",
          source: art.name,
          detail: `${pitchName(key, profile.noteNaming)} velocity 96`,
          priority: 1,
          bytes: [0x90, key, 96]
        });
        events.push({
          tick: lookAheadTick + Math.max(1, msToTickPrecise(30, project.tempoMap, project.ppq, lookAheadTick)),
          type: "keyswitchOff",
          source: art.name,
          detail: pitchName(key, profile.noteNaming),
          priority: 2,
          bytes: [0x80, key, 0]
        });
      }
    }
    generateCcEvents({ ...project, notes: [note] }, profile).forEach((ccEvent) => {
      events.push({
        tick: ccEvent.tick,
        type: "cc",
        source: ccEvent.parameter,
        detail: `CC${ccEvent.cc} ${ccEvent.value}`,
        priority: 3,
        bytes: [0xb0, ccEvent.cc, ccEvent.value]
      });
    });
    const velocity = note.performanceVelocity ?? note.velocity;
    events.push({
      tick: note.performanceStartTick,
      type: "noteOn",
      source: note.articulationName,
      detail: `${pitchName(note.pitch, profile.noteNaming)} velocity ${velocity}`,
      priority: 4,
      noteId: note.id,
      bytes: [0x90, note.pitch, velocity]
    });
    events.push({
      tick: note.performanceStartTick + note.performanceDurationTicks,
      type: "noteOff",
      source: note.articulationName,
      detail: pitchName(note.pitch, profile.noteNaming),
      priority: 5,
      noteId: note.id,
      bytes: [0x80, note.pitch, 0]
    });
  });
  return events.sort((a, b) => a.tick - b.tick || a.priority - b.priority);
}

// Turn the project's MIDI event list into time-stamped playable messages for
// live Web MIDI output: drop file-only meta (tempo, 0xF0+) and convert each
// event's tick to milliseconds from the start. Order is preserved from the
// event list (already sorted by tick then priority), so note-on/keyswitch/CC
// ordering at the same instant is kept.
export function generatePlaybackMessages(project, profile = getProfile(project)) {
  const tempoMap = project.tempoMap?.length ? project.tempoMap : [{ tick: 0, bpm: 120 }];
  return generateMidiEventList(project, profile)
    .filter((event) => Array.isArray(event.bytes) && event.bytes[0] < 0xf0)
    .map((event) => ({
      timeMs: tickToMs(event.tick, tempoMap, project.ppq),
      type: event.type,
      bytes: event.bytes
    }));
}

export function sampleCurve(project, parameter, tick) {
  const curve = project.expressionCurves[parameter];
  if (!curve || curve.points.length === 0) return 0.5;
  const points = [...curve.points].sort((a, b) => a.tick - b.tick);
  if (tick <= points[0].tick) return points[0].value;
  if (tick >= points[points.length - 1].tick) return points[points.length - 1].value;
  for (let i = 0; i < points.length - 1; i += 1) {
    const left = points[i];
    const right = points[i + 1];
    if (tick >= left.tick && tick <= right.tick) {
      const ratio = (tick - left.tick) / (right.tick - left.tick);
      return left.value + (right.value - left.value) * ratio;
    }
  }
  return 0.5;
}

export function validateProfile(profile) {
  const messages = [];
  const keyswitches = new Map();
  const articulations = Array.isArray(profile?.articulations) ? profile.articulations : [];
  const controls = Array.isArray(profile?.controls) ? profile.controls : [];
  if (articulations.length === 0) messages.push(error("No articulations are defined."));
  if (controls.length === 0) messages.push(warn("No controls are defined."));
  articulations.forEach((art) => {
    if (!art.trigger || art.trigger.type === "default") return;
    if (art.trigger.type === "keyswitch") {
      const midi = noteNameToMidi(art.trigger.noteName, profile.noteNaming);
      if (midi === null) {
        messages.push(error(`Keyswitch note is invalid: ${art.name}`));
        return;
      }
      if (keyswitches.has(midi)) messages.push(error(`Keyswitch duplicate: ${art.name} and ${keyswitches.get(midi)}`));
      keyswitches.set(midi, art.name);
      if (midi >= profile.playableRange.low && midi <= profile.playableRange.high) messages.push(error(`Keyswitch conflicts with playable range: ${art.name} ${art.trigger.noteName}`));
      if (profile.keyswitchRange && (midi < profile.keyswitchRange.low || midi > profile.keyswitchRange.high)) messages.push(warn(`Keyswitch is outside declared keyswitch range: ${art.name}`));
    }
    if (art.trigger.type === "manual") messages.push(warn(`Manual articulation target: ${art.name}`));
  });
  const ccByParam = new Map();
  controls.forEach((control) => {
    const target = control.target ?? {};
    if (target.type === "midiCC") {
      if (!Number.isInteger(target.cc) || target.cc < 0 || target.cc > 127) messages.push(error(`CC out of range: ${control.label}`));
      const existing = ccByParam.get(control.internalParameter);
      if (existing !== undefined && existing !== target.cc) messages.push(error(`Internal parameter has competing CC assignments: ${control.internalParameter}`));
      ccByParam.set(control.internalParameter, target.cc);
    }
    if (target.type === "midiLearnRequired") messages.push(warn(`MIDI Learn required: ${control.label} suggested CC${target.suggestedCC}`));
    if (target.type === "manual" || target.type === "unsupported" || target.type === "hostAutomation") messages.push(warn(`Not directly exported to MIDI: ${control.label} (${target.type})`));
  });
  if (!profile.noteNaming) messages.push(error("Note naming is not set."));
  messages.push(info(`${profile.engine} patch should be saved separately in the source instrument.`));
  return messages;
}

function error(message) {
  return { level: "Error", message };
}

function warn(message) {
  return { level: "Warning", message };
}

function info(message) {
  return { level: "Info", message };
}

export function createSetupReport(profile) {
  const lines = [
    `${profile.library} / ${profile.patch}`,
    "",
    "Articulations:"
  ];
  const articulations = Array.isArray(profile.articulations) ? profile.articulations : [];
  const controls = Array.isArray(profile.controls) ? profile.controls : [];
  articulations.forEach((art) => {
    const trigger = art.trigger?.type === "keyswitch" ? art.trigger.noteName : art.trigger?.type ?? "default";
    lines.push(`${trigger.padEnd(6)} ${art.name}`);
  });
  lines.push("", "Controls:");
  controls.forEach((control) => {
    const target = control.target;
    if (target.type === "midiCC") lines.push(`CC${target.cc} ${control.label} / ${control.internalParameter}`);
    else if (target.type === "midiLearnRequired") lines.push(`CC${target.suggestedCC} suggested ${control.label} / ${control.internalParameter} / MIDI Learn required`);
    else lines.push(`${target.type} ${control.label} / ${control.internalParameter}`);
  });
  lines.push("", "Timing:");
  lines.push(`Keyswitch lookAheadMs = ${Math.max(0, ...articulations.map((art) => art.trigger?.lookAheadMs ?? 0))}`);
  lines.push(`CC lookAheadMs = ${profile.timing?.ccLookAheadMs ?? 80}`);
  lines.push("", "注意:");
  (Array.isArray(profile.setupInstructions) ? profile.setupInstructions : []).forEach((step) => lines.push(`- ${step}`));
  return lines.join("\n");
}

export function createTestProject(profileId) {
  const project = createInitialProject();
  project.profileId = profileId;
  project.notes = [
    createNote({ pitch: 60, scoreTick: 0, durationTicks: 960, articulation: "sustain", velocity: 72 }),
    createNote({ pitch: 62, scoreTick: 960, durationTicks: 960, articulation: "legato", velocity: 78 }),
    createNote({ pitch: 64, scoreTick: 1920, durationTicks: 960, articulation: "legato", velocity: 80 }),
    createNote({ pitch: 67, scoreTick: 2880, durationTicks: 480, articulation: "staccato", velocity: 92 }),
    createNote({ pitch: 69, scoreTick: 3360, durationTicks: 480, articulation: "marcato", velocity: 95 })
  ];
  project.slurs = [{ id: cryptoRandomId("slur"), startNoteId: project.notes[0].id, endNoteId: project.notes[2].id }];
  project.crescendos = [{ id: cryptoRandomId("crescendo"), startNoteId: project.notes[0].id, endNoteId: project.notes[3].id, direction: "crescendo", curveType: "S-Curve", startIntensity: 0.35, endIntensity: 0.85, timbreFollowsDynamics: true, expressionFollowsDynamics: true, vibratoAmount: 0.35 }];
  return project;
}

export function exportMidi(project, profile = getProfile(project)) {
  const events = generateMidiEventList(project, profile);
  const track = buildTrack(events);
  const header = [...ascii("MThd"), ...uint32(6), ...uint16(0), ...uint16(1), ...uint16(project.ppq)];
  return new Uint8Array([...header, ...track]);
}

function mergeTiedPerformanceNotes(project, performanceNotes) {
  const byId = new Map(performanceNotes.map((note) => [note.id, structuredClone(note)]));
  const sorted = [...performanceNotes].sort((a, b) => a.scoreTick - b.scoreTick || a.pitch - b.pitch);
  const consumed = new Set();
  const merged = [];
  sorted.forEach((note) => {
    if (consumed.has(note.id)) return;
    const root = structuredClone(note);
    let cursor = project.notes.find((item) => item.id === note.id);
    let endTick = root.performanceStartTick + root.performanceDurationTicks;
    while (cursor?.tiedToNext) {
      const next = nextNote(project, cursor);
      if (!next || next.pitch !== cursor.pitch) break;
      const nextPerformance = byId.get(next.id);
      if (!nextPerformance) break;
      consumed.add(next.id);
      const tiedScoreEndFromRoot = root.performanceStartTick + (next.scoreTick + next.durationTicks - note.scoreTick);
      endTick = Math.max(endTick, tiedScoreEndFromRoot, nextPerformance.performanceStartTick + nextPerformance.performanceDurationTicks);
      cursor = next;
    }
    root.performanceDurationTicks = Math.max(1, endTick - root.performanceStartTick);
    merged.push(root);
  });
  return merged;
}

function msToTickPrecise(ms, tempoMap, ppq, referenceTick) {
  const bpm = bpmAtTick(referenceTick, tempoMap);
  return Math.round((ms / 60000) * bpm * ppq);
}

export function importMidi(arrayBuffer) {
  const view = new DataView(arrayBuffer);
  const text = (offset, length) => String.fromCharCode(...new Uint8Array(arrayBuffer, offset, length));
  if (text(0, 4) !== "MThd") throw new Error("MIDI header was not found.");
  const ppq = view.getUint16(12);
  let offset = 14;
  const project = createInitialProject();
  project.ppq = ppq;
  project.notes = [];
  project.rests = [];
  project.slurs = [];
  project.crescendos = [];
  project.dynamics = [];
  project.selectedIds = [];
  project.tempoMap = [];
  const importedCc = [];
  const active = new Map();
  while (offset < view.byteLength) {
    if (text(offset, 4) !== "MTrk") break;
    const length = view.getUint32(offset + 4);
    offset += 8;
    const end = offset + length;
    let tick = 0;
    let runningStatus = null;
    while (offset < end) {
      const delta = readVarLen(view, offset);
      tick += delta.value;
      offset = delta.offset;
      let status = view.getUint8(offset);
      if (status < 0x80) {
        if (runningStatus === null) throw new Error("Invalid running status.");
        status = runningStatus;
      } else {
        offset += 1;
        if (status < 0xf0) runningStatus = status;
      }
      if (status === 0xff) {
        const type = view.getUint8(offset);
        offset += 1;
        const lengthInfo = readVarLen(view, offset);
        offset = lengthInfo.offset;
        if (type === 0x51 && lengthInfo.value === 3) {
          const mpqn = (view.getUint8(offset) << 16) | (view.getUint8(offset + 1) << 8) | view.getUint8(offset + 2);
          project.tempoMap.push({ tick, bpm: Math.round(60000000 / mpqn) });
        }
        offset += lengthInfo.value;
        continue;
      }
      if (status === 0xf0 || status === 0xf7) {
        const lengthInfo = readVarLen(view, offset);
        offset = lengthInfo.offset + lengthInfo.value;
        continue;
      }
      const command = status & 0xf0;
      const data1 = view.getUint8(offset);
      const data2 = command === 0xc0 || command === 0xd0 ? null : view.getUint8(offset + 1);
      offset += data2 === null ? 1 : 2;
      if (command === 0x90 && data2 > 0) {
        active.set(data1, { pitch: data1, scoreTick: tick, velocity: data2 });
      } else if (command === 0x80 || (command === 0x90 && data2 === 0)) {
        const started = active.get(data1);
        if (started) {
          project.notes.push(createNote({ pitch: data1, scoreTick: started.scoreTick, durationTicks: Math.max(1, tick - started.scoreTick), articulation: "sustain", velocity: started.velocity }));
          active.delete(data1);
        }
      } else if (command === 0xb0 && data2 !== null) {
        importedCc.push({ tick, cc: data1, value: data2 });
      }
    }
    offset = end;
  }
  if (project.tempoMap.length === 0) project.tempoMap = [{ tick: 0, bpm: 120 }];
  project.tempoMap.sort((a, b) => a.tick - b.tick);
  applyImportedCcToCurves(project, importedCc);
  project.notes.sort((a, b) => a.scoreTick - b.scoreTick || a.pitch - b.pitch);
  project.cursorTick = project.notes.reduce((max, note) => Math.max(max, note.scoreTick + note.durationTicks), 0);
  return project;
}

function applyImportedCcToCurves(project, importedCc) {
  if (importedCc.length === 0) return;
  const defaultMap = new Map([
    [1, "intensity"],
    [11, "volume"],
    [21, "vibratoDepth"],
    [70, "fingerPosition"]
  ]);
  const grouped = new Map();
  importedCc.forEach((event) => {
    const parameter = defaultMap.get(event.cc);
    if (!parameter) return;
    if (!grouped.has(parameter)) grouped.set(parameter, []);
    grouped.get(parameter).push({ tick: event.tick, value: clamp(event.value / 127, 0, 1) });
  });
  grouped.forEach((points, parameter) => {
    project.expressionCurves[parameter] = {
      parameter,
      points: points.sort((a, b) => a.tick - b.tick)
    };
  });
}

function buildTrack(events) {
  const sorted = [...events].sort((a, b) => a.tick - b.tick || a.priority - b.priority);
  const body = [];
  let lastTick = 0;
  sorted.forEach((event) => {
    body.push(...varLen(Math.max(0, event.tick - lastTick)), ...event.bytes);
    lastTick = event.tick;
  });
  body.push(0x00, 0xff, 0x2f, 0x00);
  return [...ascii("MTrk"), ...uint32(body.length), ...body];
}

function metaTempoBytes(bpm) {
  const mpqn = Math.round(60000000 / bpm);
  return [0xff, 0x51, 0x03, (mpqn >> 16) & 0xff, (mpqn >> 8) & 0xff, mpqn & 0xff];
}

function readVarLen(view, offset) {
  let value = 0;
  let current;
  do {
    current = view.getUint8(offset);
    value = (value << 7) | (current & 0x7f);
    offset += 1;
  } while (current & 0x80);
  return { value, offset };
}

function varLen(value) {
  let buffer = value & 0x7f;
  const bytes = [];
  while ((value >>= 7)) {
    buffer <<= 8;
    buffer |= (value & 0x7f) | 0x80;
  }
  while (true) {
    bytes.push(buffer & 0xff);
    if (buffer & 0x80) buffer >>= 8;
    else break;
  }
  return bytes;
}

function ascii(value) {
  return [...value].map((char) => char.charCodeAt(0));
}

function uint16(value) {
  return [(value >> 8) & 0xff, value & 0xff];
}

function uint32(value) {
  return [(value >> 24) & 0xff, (value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
}

function getDefaultDuration(project) {
  return project.defaultDurationTicks ?? project.ppq;
}

function resolveNoteOverlaps(project) {
  const sorted = [...project.notes].sort((a, b) => a.scoreTick - b.scoreTick || a.pitch - b.pitch);
  const kept = [];
  let occupiedEnd = -Infinity;
  let adjustedNotes = 0;
  let deletedNotes = 0;
  sorted.forEach((note) => {
    const rawDuration = Number(note.durationTicks);
    const safeDuration = Number.isFinite(rawDuration) ? Math.max(1, Math.round(rawDuration)) : 1;
    const originalEnd = note.scoreTick + safeDuration;
    note.durationTicks = safeDuration;
    if (note.scoreTick < occupiedEnd) {
      if (originalEnd <= occupiedEnd) {
        deletedNotes += 1;
        return;
      }
      note.scoreTick = occupiedEnd;
      note.durationTicks = originalEnd - occupiedEnd;
      note.frozenPerformanceTick = null;
      adjustedNotes += 1;
    }
    kept.push(note);
    occupiedEnd = Math.max(occupiedEnd, note.scoreTick + note.durationTicks);
  });
  project.notes = kept;
  return { adjustedNotes, deletedNotes };
}

function fillGapsAfterSelectedNotes(project, selectedIds) {
  const notes = [...project.notes].sort((a, b) => a.scoreTick - b.scoreTick || a.pitch - b.pitch);
  let addedRests = 0;
  notes.filter((note) => selectedIds.has(note.id)).forEach((note) => {
    const noteEnd = note.scoreTick + note.durationTicks;
    const nextNote = notes.find((candidate) => candidate.scoreTick >= noteEnd && candidate.id !== note.id);
    if (!nextNote || nextNote.scoreTick <= noteEnd) return;
    if (project.rests.some((rest) => rest.scoreTick <= noteEnd && rest.scoreTick + rest.durationTicks >= nextNote.scoreTick)) return;
    project.rests.push({ id: cryptoRandomId("rest"), scoreTick: noteEnd, durationTicks: nextNote.scoreTick - noteEnd });
    addedRests += 1;
  });
  return addedRests;
}

function normalizeRestsAgainstNotes(project) {
  const noteRanges = project.notes
    .map((note) => ({ start: note.scoreTick, end: note.scoreTick + note.durationTicks }))
    .sort((a, b) => a.start - b.start || a.end - b.end);
  const restSegments = [];
  project.rests.filter((rest) => rest.durationTicks > 0).forEach((rest) => {
    let segments = [{ start: rest.scoreTick, end: rest.scoreTick + rest.durationTicks, id: rest.id }];
    noteRanges.forEach((note) => {
      segments = segments.flatMap((segment) => subtractRange(segment, note));
    });
    restSegments.push(...segments.filter((segment) => segment.end > segment.start));
  });
  restSegments.sort((a, b) => a.start - b.start || a.end - b.end);
  const merged = [];
  restSegments.forEach((segment) => {
    const previous = merged[merged.length - 1];
    if (previous && segment.start <= previous.end) {
      previous.end = Math.max(previous.end, segment.end);
    } else {
      merged.push({ ...segment });
    }
  });
  project.rests = merged.map((segment) => ({
    id: segment.id ?? cryptoRandomId("rest"),
    scoreTick: segment.start,
    durationTicks: segment.end - segment.start
  }));
}

function subtractRange(segment, blocker) {
  if (blocker.end <= segment.start || blocker.start >= segment.end) return [segment];
  const next = [];
  if (blocker.start > segment.start) {
    next.push({ ...segment, end: blocker.start });
  }
  if (blocker.end < segment.end) {
    next.push({ ...segment, start: blocker.end, id: cryptoRandomId("rest") });
  }
  return next;
}

function cleanupScoreReferences(project) {
  const noteIds = new Set(project.notes.map((note) => note.id));
  project.slurs = project.slurs.filter((slur) => noteIds.has(slur.startNoteId) && noteIds.has(slur.endNoteId));
  project.crescendos = project.crescendos.filter((hairpin) => noteIds.has(hairpin.startNoteId) && noteIds.has(hairpin.endNoteId));
  project.notes.forEach((note) => {
    if (note.tiedToNext && nextNote(project, note)?.pitch !== note.pitch) note.tiedToNext = false;
  });
}

function cryptoRandomId(prefix) {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.randomUUID) return `${prefix}_${cryptoApi.randomUUID()}`;
  return `${prefix}_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
