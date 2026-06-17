import {
  BUILT_IN_PROFILES,
  DEFAULT_INTERPRETATION,
  ENGINE_WIZARDS,
  engineWizardById,
  buildEngineProfile,
  autoAssignKeyswitches,
  INTERNAL_PARAMETERS,
  PHRASE_TEMPLATES,
  addCrescendo,
  addRest,
  addSlur,
  applyBatchProperties,
  applyDynamic,
  applyNoteLetter,
  parsePhrase,
  applyPhraseTemplate,
  beamGroups,
  dynamicCommandFromText,
  removeDynamic,
  KEY_SIGNATURES,
  keySignatureSteps,
  noteGlyph,
  noteSpelling,
  setNoteExpression,
  staffPosition,
  applySelectedNoteDuration,
  cloneProject,
  computePerformanceNotes,
  copySelection,
  createInitialProject,
  createDemoPhraseProject,
  getSetupGuide,
  createSetupReport,
  createTestProject,
  deleteCurvePoint,
  deleteSelection as deleteSelectedItems,
  exportMidi,
  formatPosition,
  generateCcEvents,
  generateMidiEventList,
  generatePlaybackMessages,
  buildCalibrationProbe,
  reduceCalibrationMeasurement,
  fitCalibrationCurve,
  getArticulation,
  importMidi,
  mixedValue,
  moveCurvePoint,
  pitchName,
  quantizeSelectedTimingToScore,
  resetLocalOffsets,
  sampleCurve,
  selectedNotes,
  freezeSelectedTiming,
  toggleTie,
  transposeSelection,
  pasteSelection,
  setFrozenPerformanceTick,
  tickToMs,
  upsertCurvePoint,
  validateProfile
} from "./core.js";

const els = {};
let project = createInitialProject();
let profiles = structuredClone(BUILT_IN_PROFILES);
let undoStack = [];
let redoStack = [];
let currentCurveParameter = "intensity";
let internalClipboard = null;
let lastRepeatAction = null;
let dragState = null;
let suppressNextCurveClick = false;
let selectedCurvePoint = null;
let wizardEngineId = null;
let wizardArtSelection = new Set();
let wizardCtrlSelection = new Set();
let midiAccess = null;
let midiOutput = null;
let playbackTimer = null;
let isPlaying = false;
let loopEnabled = false;
let playbackMessagesFn = null;
let playbackLoop = false;
let bridgeTimer = null;
let bridgePollUrl = null;
let interpDialEls = {};
const PLAYBACK_LEAD_MS = 120;
const AUTOSAVE_KEY = "phraseExpressionDesigner.autosave.v1";
// Sub-dials that open the interpretation magic-numbers for live ear-tuning.
const INTERPRETATION_DIALS = [
  { key: "humanizeMs", label: "ゆらぎ(時間)", max: 30, unit: "ms" },
  { key: "breathMs", label: "息継ぎ", max: 120, unit: "ms" },
  { key: "apexTenutoMs", label: "頂点テヌート", max: 150, unit: "ms" },
  { key: "finalRelaxMs", label: "終止の緩み", max: 120, unit: "ms" },
  { key: "legatoReachMs", label: "レガート届かせ", max: 60, unit: "ms" },
  { key: "swell", label: "強弱アーチ", max: 40, unit: "" },
  { key: "accent", label: "拍節アクセント", max: 30, unit: "" },
  { key: "humanizeVel", label: "ゆらぎ(強弱)", max: 20, unit: "" }
];

const svgNs = "http://www.w3.org/2000/svg";
const NOTE_HEAD_RX = 8.4;
const NOTE_HEAD_RY = 5.4;
const NOTE_HEAD_ANGLE = -20;
const STRAIGHT_DURATION_SHORTCUTS = new Map([
  ["1", 240],
  ["2", 480],
  ["3", 960],
  ["4", 1920],
  ["5", 3840]
]);
const DOTTED_DURATION_SHORTCUTS = new Map([
  ["1", 360],
  ["2", 720],
  ["3", 1440],
  ["4", 2880],
  ["5", 5760]
]);

document.addEventListener("DOMContentLoaded", () => {
  bindElements();
  restoreAutosave();
  populateProfiles();
  populateTemplateButtons();
  populateNoteExpressionParameters();
  populateEngineWizards();
  populateInterpretationDials();
  bindEvents();
  render();
  initMidi();
  populateAudioInputs();
});

function bindElements() {
  [
    "statusText",
    "projectImportInput",
    "midiImportInput",
    "profileImportInput",
    "exportProjectButton",
    "exportMidiButton",
    "testMidiButton",
    "exportProfileButton",
    "exportReportButton",
    "selectModeButton",
    "notationModeButton",
    "performanceModeButton",
    "durationSelect",
    "phraseInput",
    "phraseEnterButton",
    "restButton",
    "tieButton",
    "slurButton",
    "crescendoButton",
    "decrescendoButton",
    "bpmInput",
    "ppqInput",
    "midiOutputSelect",
    "playButton",
    "stopButton",
    "loopToggle",
    "testToneButton",
    "demoButton",
    "setupButton",
    "setupDialog",
    "setupDawSelect",
    "setupSteps",
    "bridgeToggle",
    "bridgePort",
    "bridgeStatus",
    "midiStatusOutput",
    "cursorOutput",
    "selectionOutput",
    "autosaveOutput",
    "notationSvg",
    "pianoRollSvg",
    "curveSvg",
    "curveParameterSelect",
    "templateButtons",
    "eventListSummary",
    "eventListBody",
    "profileSelect",
    "wizardButton",
    "audioInputSelect",
    "calibrateButton",
    "calibStatus",
    "batchSummary",
    "applyPitch",
    "pitchInput",
    "applyArticulation",
    "articulationInput",
    "applyOffset",
    "offsetInput",
    "applyVelocity",
    "velocityInput",
    "applyBatchButton",
    "resetOffsetButton",
    "freezeTimingButton",
    "quantizeTimingButton",
    "validationList",
    "reportText",
    "wizardDialog",
    "wizardEngineButtons",
    "wizardEngineSummary",
    "wizardAutoKsButton",
    "wizardArtPresets",
    "wizardCtrlPresets",
    "wizardBaseSelect",
    "wizardEngineInput",
    "wizardLibraryInput",
    "wizardPatchInput",
    "wizardNoteNamingSelect",
    "wizardPlayableLowInput",
    "wizardPlayableHighInput",
    "wizardKeyswitchLowInput",
    "wizardKeyswitchHighInput",
    "wizardCcLookAheadInput",
    "wizardPcLookAheadInput",
    "wizardArticulationsText",
    "wizardControlsText",
    "wizardInstructionsText",
    "wizardValidationList",
    "wizardRefreshButton",
    "wizardApplyButton",
    "dynamicPopover",
    "dynamicInput",
    "noteExprParameter",
    "noteExprValue",
    "noteExprInfluence",
    "noteExprInfluenceOut",
    "noteExprApplyButton",
    "noteExprClearButton",
    "interpEnabled",
    "interpAmount",
    "interpAmountOut",
    "interpDials",
    "clefSelect",
    "keySelect"
  ].forEach((id) => {
    els[id] = document.getElementById(id);
  });
}

function populateNoteExpressionParameters() {
  els.noteExprParameter.replaceChildren(
    ...INTERNAL_PARAMETERS.map((parameter) => option(parameter, parameter))
  );
  els.keySelect.replaceChildren(
    ...KEY_SIGNATURES.map((sig) => option(String(sig.value), sig.label))
  );
}

function openDynamicPopover() {
  els.dynamicPopover.hidden = false;
  els.dynamicInput.value = "";
  els.dynamicInput.focus();
}

function closeDynamicPopover() {
  els.dynamicPopover.hidden = true;
  els.dynamicInput.blur();
}

function commitDynamicPopover() {
  const command = dynamicCommandFromText(els.dynamicInput.value);
  if (!command) {
    els.statusText.textContent = `強弱として解釈できません: ${els.dynamicInput.value}`;
    return;
  }
  closeDynamicPopover();
  if (command.type === "dynamic") {
    mutate(`Dynamic ${command.mark}`, () => applyDynamic(project, command.mark));
  } else {
    mutate(`Add ${command.direction}`, () => addCrescendo(project, command.direction));
  }
}

function populateProfiles() {
  els.profileSelect.replaceChildren(...profiles.map((profile) => option(profile.id, `${profile.engine} / ${profile.library}`)));
  els.profileSelect.value = project.profileId;
  if (!els.profileSelect.value && profiles[0]) {
    project.profileId = profiles[0].id;
    els.profileSelect.value = project.profileId;
  }
  populateArticulations();
}

function populateArticulations() {
  const profile = activeProfile();
  els.articulationInput.replaceChildren(...profile.articulations.map((art) => option(art.id, art.name)));
}

function populateTemplateButtons() {
  els.templateButtons.replaceChildren(...PHRASE_TEMPLATES.map((template) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = template.name;
    button.addEventListener("click", () => mutate(`Apply template ${template.name}`, () => {
      const endTick = Math.max(project.ppq * 4, maxScoreTick(project));
      applyPhraseTemplate(project, currentCurveParameter, template.id, 0, endTick);
    }));
    return button;
  }));
}

function bindEvents() {
  els.projectImportInput.addEventListener("change", onProjectImport);
  els.midiImportInput.addEventListener("change", onMidiImport);
  els.profileImportInput.addEventListener("change", onProfileImport);
  els.exportProjectButton.addEventListener("click", () => downloadJson({ project, profiles: customProfiles() }, "phrase_expression_designer_project.json"));
  els.exportMidiButton.addEventListener("click", () => downloadMidi(project, "phrase_expression_designer.mid"));
  els.testMidiButton.addEventListener("click", () => downloadMidi(createTestProject(project.profileId), "phrase_expression_designer_test.mid"));
  els.exportProfileButton.addEventListener("click", () => downloadJson(activeProfile(), `${project.profileId}.json`));
  els.exportReportButton.addEventListener("click", () => downloadText(createSetupReport(activeProfile()), `${project.profileId}_setup_report.txt`));
  els.selectModeButton.addEventListener("click", () => setMode("select"));
  els.notationModeButton.addEventListener("click", () => setMode("notation"));
  els.performanceModeButton.addEventListener("click", () => setMode("performance"));
  els.phraseEnterButton.addEventListener("click", enterPhraseText);
  els.phraseInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      enterPhraseText();
    }
  });
  els.restButton.addEventListener("click", () => mutate("Add rest", () => addRest(project, currentDurationTicks())));
  els.tieButton.addEventListener("click", () => mutate("Toggle tie", () => toggleTie(project)));
  els.slurButton.addEventListener("click", () => mutate("Add slur", () => addSlur(project)));
  els.crescendoButton.addEventListener("click", () => mutate("Add crescendo", () => addCrescendo(project, "crescendo")));
  els.decrescendoButton.addEventListener("click", () => mutate("Add decrescendo", () => addCrescendo(project, "decrescendo")));
  els.durationSelect.addEventListener("change", onDurationChange);
  els.bpmInput.addEventListener("change", () => mutate("Change BPM", () => {
    project.tempoMap[0].bpm = clamp(Number(els.bpmInput.value), 20, 300);
  }));
  els.ppqInput.addEventListener("change", () => mutate("Change PPQ", () => {
    project.ppq = clamp(Number(els.ppqInput.value), 120, 3840);
  }));
  els.midiOutputSelect.addEventListener("change", () => {
    midiOutput = midiAccess?.outputs.get(els.midiOutputSelect.value) ?? null;
    els.midiStatusOutput.textContent = midiOutput ? `→ ${midiOutput.name}` : "出力先を選択";
  });
  els.playButton.addEventListener("click", startLivePlayback);
  els.stopButton.addEventListener("click", stopLivePlayback);
  els.loopToggle.addEventListener("change", () => {
    loopEnabled = els.loopToggle.checked;
  });
  els.testToneButton.addEventListener("click", sendTestTone);
  els.demoButton.addEventListener("click", loadDemoPhrase);
  els.setupButton.addEventListener("click", openSetup);
  els.setupDawSelect.addEventListener("change", renderSetupSteps);
  els.bridgeToggle.addEventListener("change", toggleBridge);
  els.calibrateButton.addEventListener("click", runAutoCalibration);
  els.profileSelect.addEventListener("change", () => mutate("Change profile", () => {
    project.profileId = els.profileSelect.value;
    normalizeArticulationsForProfile();
  }));
  els.wizardButton.addEventListener("click", openWizard);
  els.wizardBaseSelect.addEventListener("change", () => {
    clearEngineSelection();
    fillWizardFromProfile(profileById(els.wizardBaseSelect.value));
    renderWizardValidation();
  });
  els.wizardAutoKsButton.addEventListener("click", onWizardAutoAssignKeyswitches);
  els.wizardRefreshButton.addEventListener("click", () => renderWizardValidation());
  els.wizardApplyButton.addEventListener("click", applyWizardProfile);
  els.applyBatchButton.addEventListener("click", onBatchApply);
  els.resetOffsetButton.addEventListener("click", () => mutate("Reset local offsets", () => resetLocalOffsets(project)));
  els.freezeTimingButton.addEventListener("click", () => mutate("Freeze timing", () => freezeSelectedTiming(project, activeProfile())));
  els.quantizeTimingButton.addEventListener("click", () => mutate("Quantize to score", () => quantizeSelectedTimingToScore(project)));
  els.curveParameterSelect.addEventListener("change", () => {
    currentCurveParameter = els.curveParameterSelect.value;
    selectedCurvePoint = null;
    renderCurve();
  });
  els.clefSelect.addEventListener("change", () => {
    mutate("Change clef", () => {
      project.clef = els.clefSelect.value;
    });
  });
  els.keySelect.addEventListener("change", () => {
    mutate("Change key signature", () => {
      project.keySignature = Number(els.keySelect.value);
    });
  });
  els.notationSvg.addEventListener("click", onNotationBackgroundClick);
  els.curveSvg.addEventListener("click", onCurveClick);
  document.addEventListener("mousemove", onDocumentMouseMove);
  document.addEventListener("mouseup", onDocumentMouseUp);
  document.querySelectorAll("[data-articulation]").forEach((button) => {
    button.addEventListener("click", () => {
      const articulation = button.dataset.articulation;
      mutate(`Apply ${articulation}`, () => {
        selectedNotes(project).forEach((note) => {
          note.articulation = articulation;
        });
      });
    });
  });
  document.querySelectorAll("[data-dynamic]").forEach((button) => {
    button.addEventListener("click", () => {
      const mark = button.dataset.dynamic;
      mutate(`Dynamic ${mark}`, () => applyDynamic(project, mark));
    });
  });
  els.dynamicInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commitDynamicPopover();
    } else if (event.key === "Escape") {
      event.preventDefault();
      closeDynamicPopover();
    }
  });
  els.dynamicInput.addEventListener("blur", () => {
    if (!els.dynamicPopover.hidden) closeDynamicPopover();
  });
  els.noteExprParameter.addEventListener("change", renderInspector);
  els.noteExprInfluence.addEventListener("input", () => {
    els.noteExprInfluenceOut.textContent = `${els.noteExprInfluence.value}%`;
  });
  els.noteExprInfluence.addEventListener("change", () => {
    const influence = Number(els.noteExprInfluence.value) / 100;
    mutate(`Note influence ${els.noteExprInfluence.value}%`, () =>
      setNoteExpression(project, { influence }));
  });
  els.noteExprApplyButton.addEventListener("click", () => {
    const parameter = els.noteExprParameter.value;
    const raw = els.noteExprValue.value;
    if (raw === "") return;
    const value = Number(raw);
    const influence = Number(els.noteExprInfluence.value) / 100;
    mutate(`Note ${parameter} ${value}`, () =>
      setNoteExpression(project, { parameter, value, influence }));
  });
  els.noteExprClearButton.addEventListener("click", () => {
    const parameter = els.noteExprParameter.value;
    mutate(`Clear note ${parameter}`, () =>
      setNoteExpression(project, { parameter, value: null }));
  });
  els.interpEnabled.addEventListener("change", () => {
    mutate(els.interpEnabled.checked ? "Enable interpretation" : "Disable interpretation", () => {
      project.interpretation = { ...DEFAULT_INTERPRETATION, ...(project.interpretation ?? {}), enabled: els.interpEnabled.checked };
    });
  });
  els.interpAmount.addEventListener("input", () => {
    els.interpAmountOut.textContent = `${els.interpAmount.value}%`;
  });
  els.interpAmount.addEventListener("change", () => {
    mutate(`Interpretation ${els.interpAmount.value}%`, () => {
      project.interpretation = { ...DEFAULT_INTERPRETATION, ...(project.interpretation ?? {}), amount: Number(els.interpAmount.value) / 100 };
    });
  });
  document.addEventListener("keydown", onKeyDown);
}

function onMidiImport(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = importMidi(reader.result);
      mutate("Import MIDI", () => {
        const profileId = project.profileId;
        project = imported;
        project.profileId = profileId;
      }, { replaceProject: true });
      els.statusText.textContent = `${file.name}を読み込みました。`;
    } catch (error) {
      els.statusText.textContent = `MIDI読み込みエラー: ${error.message}`;
    }
  };
  reader.readAsArrayBuffer(file);
}

function onProjectImport(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      mutate("Import project", () => {
        if (data.project) {
          project = normalizeProject(data.project);
          if (Array.isArray(data.profiles)) mergeProfiles(data.profiles);
        } else {
          project = normalizeProject(data);
        }
        if (!profileById(project.profileId)) project.profileId = profiles[0].id;
      }, { replaceProject: true });
      els.statusText.textContent = `${file.name}を読み込みました。`;
    } catch (error) {
      els.statusText.textContent = `Project読込エラー: ${error.message}`;
    }
  };
  reader.readAsText(file, "utf-8");
}

function onProfileImport(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const profile = normalizeProfile(JSON.parse(reader.result));
      mutate("Import profile", () => {
        upsertProfile(profile);
        project.profileId = profile.id;
        normalizeArticulationsForProfile();
      });
      els.statusText.textContent = `${file.name}をProfileとして読み込みました。`;
    } catch (error) {
      els.statusText.textContent = `Profile読込エラー: ${error.message}`;
    }
  };
  reader.readAsText(file, "utf-8");
}

function onBatchApply() {
  const patch = {
    pitch: { enabled: els.applyPitch.checked, value: els.pitchInput.value },
    articulation: { enabled: els.applyArticulation.checked, value: els.articulationInput.value },
    offset: { enabled: els.applyOffset.checked, value: els.offsetInput.value },
    velocity: { enabled: els.applyVelocity.checked, value: els.velocityInput.value }
  };
  mutate("Batch apply", () => {
    const count = applyBatchProperties(project, patch);
    els.statusText.textContent = `${count}件へチェック項目のみ適用しました。`;
  });
}

function onDurationChange() {
  const durationTicks = Number(els.durationSelect.value);
  applyDurationTicks(durationTicks);
}

function applyDurationTicks(durationTicks) {
  if (!Number.isFinite(durationTicks)) return;
  const noteCount = selectedNotes(project).length;
  if (noteCount === 0) {
    project.defaultDurationTicks = durationTicks;
    els.durationSelect.value = String(durationTicks);
    render();
    saveAutosave();
    els.statusText.textContent = "入力音価を変更しました。";
    return;
  }
  let result = null;
  mutate("Change duration", () => {
    result = applySelectedNoteDuration(project, durationTicks);
  });
  if (result) els.statusText.textContent = durationChangeSummary(result);
}

function durationTicksFromShortcut(event) {
  const match = /^(?:Digit|Numpad)([1-5])$/.exec(event.code ?? "");
  const shortcut = match?.[1] ?? (/^[1-5]$/.test(event.key) ? event.key : null);
  if (!shortcut) return null;
  const durations = event.shiftKey ? DOTTED_DURATION_SHORTCUTS : STRAIGHT_DURATION_SHORTCUTS;
  return durations.get(shortcut) ?? null;
}

function durationChangeSummary(result) {
  const details = [];
  if (result.adjustedNotes) details.push(`後続短縮:${result.adjustedNotes}`);
  if (result.deletedNotes) details.push(`後続削除:${result.deletedNotes}`);
  if (result.addedRests) details.push(`休符追加:${result.addedRests}`);
  return details.length
    ? `${result.selectedCount}件の音価を変更しました（${details.join("、")}）。`
    : `${result.selectedCount}件の音価を変更しました。`;
}

function openWizard() {
  els.wizardBaseSelect.replaceChildren(...profiles.map((profile) => option(profile.id, `${profile.engine} / ${profile.library}`)));
  els.wizardBaseSelect.value = project.profileId;
  clearEngineSelection();
  fillWizardFromProfile(activeProfile());
  renderWizardValidation();
  if (typeof els.wizardDialog.showModal === "function") els.wizardDialog.showModal();
  else els.wizardDialog.setAttribute("open", "");
}

function fillWizardFromProfile(profile) {
  els.wizardEngineInput.value = profile.engine ?? "";
  els.wizardLibraryInput.value = profile.library ?? "";
  els.wizardPatchInput.value = profile.patch ?? "";
  els.wizardNoteNamingSelect.value = profile.noteNaming ?? "C3=60";
  els.wizardPlayableLowInput.value = profile.playableRange?.low ?? 0;
  els.wizardPlayableHighInput.value = profile.playableRange?.high ?? 127;
  els.wizardKeyswitchLowInput.value = profile.keyswitchRange?.low ?? 0;
  els.wizardKeyswitchHighInput.value = profile.keyswitchRange?.high ?? 36;
  els.wizardCcLookAheadInput.value = profile.timing?.ccLookAheadMs ?? 80;
  els.wizardPcLookAheadInput.value = profile.timing?.programChangeLookAheadMs ?? 150;
  els.wizardArticulationsText.value = articulationsToText(profile.articulations);
  els.wizardControlsText.value = controlsToText(profile.controls);
  els.wizardInstructionsText.value = (profile.setupInstructions ?? []).join("\n");
}

function articulationsToText(articulations) {
  return (articulations ?? []).map((art) => {
    const trigger = art.trigger?.type === "keyswitch" ? (art.trigger.noteName ?? "") : art.trigger?.type ?? "default";
    const lookAhead = art.trigger?.lookAheadMs ?? 100;
    const perf = art.performance ?? {};
    return [art.id, art.name, art.type, trigger, lookAhead, perf.globalOffsetMs ?? 0, perf.overlapPercent ?? 0, perf.overlapMaxMs ?? 0].join("\t");
  }).join("\n");
}

function controlsToText(controls) {
  return (controls ?? []).map((control) => {
    const target = control.target ?? { type: "manual" };
    const value = target.type === "midiCC" ? target.cc : target.suggestedCC ?? "";
    const calibration = target.type === "midiCC" ? (control.calibrationCurveId ?? "") : "";
    return [control.internalParameter, control.label, target.type, value, control.enabled === false ? "off" : "on", calibration].join("\t");
  }).join("\n");
}

// --- Engine-specific Setup Wizards ---------------------------------------

function populateEngineWizards() {
  els.wizardEngineButtons.replaceChildren(...ENGINE_WIZARDS.map((wizard) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "engine-button";
    button.dataset.engineId = wizard.id;
    button.textContent = wizard.label;
    button.addEventListener("click", () => selectEngineWizard(wizard.id));
    return button;
  }));
}

// Build the interpretation sub-dials once; renderInspector syncs their values.
function populateInterpretationDials() {
  interpDialEls = {};
  els.interpDials.replaceChildren(...INTERPRETATION_DIALS.map((dial) => {
    const row = document.createElement("div");
    row.className = "influence-row";
    const label = document.createElement("label");
    label.textContent = dial.label;
    label.setAttribute("for", `interpDial_${dial.key}`);
    const input = document.createElement("input");
    input.type = "range";
    input.id = `interpDial_${dial.key}`;
    input.min = "0";
    input.max = String(dial.max);
    input.step = "1";
    const out = document.createElement("output");
    input.addEventListener("input", () => {
      out.textContent = `${input.value}${dial.unit}`;
    });
    input.addEventListener("change", () => {
      mutate(`Interpretation ${dial.key} ${input.value}`, () => {
        project.interpretation = { ...DEFAULT_INTERPRETATION, ...(project.interpretation ?? {}), [dial.key]: Number(input.value) };
      });
    });
    row.append(label, input, out);
    interpDialEls[dial.key] = { input, out, unit: dial.unit };
    return row;
  }));
}

function selectEngineWizard(id) {
  const wizard = engineWizardById(id);
  if (!wizard) return;
  wizardEngineId = id;
  wizardArtSelection = new Set(wizard.articulationPresets.map((art) => art.id));
  wizardCtrlSelection = new Set(wizard.controlPresets.map((control) => control.internalParameter));
  // Start from the engine's default identity so the build uses engine defaults.
  els.wizardLibraryInput.value = "";
  els.wizardPatchInput.value = "";
  els.wizardEngineSummary.textContent = wizard.summary ?? "";
  renderEngineButtonsState();
  renderWizardPresets(wizard);
  rebuildWizardFromSelection();
}

function clearEngineSelection() {
  wizardEngineId = null;
  wizardArtSelection = new Set();
  wizardCtrlSelection = new Set();
  els.wizardEngineSummary.textContent = "";
  els.wizardArtPresets.replaceChildren();
  els.wizardCtrlPresets.replaceChildren();
  renderEngineButtonsState();
}

function renderEngineButtonsState() {
  els.wizardEngineButtons.querySelectorAll(".engine-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.engineId === wizardEngineId);
  });
}

function renderWizardPresets(wizard) {
  els.wizardArtPresets.replaceChildren(...wizard.articulationPresets.map((art) =>
    presetToggle(art.id, art.name, wizardArtSelection, () => rebuildWizardFromSelection())));
  els.wizardCtrlPresets.replaceChildren(...wizard.controlPresets.map((control) =>
    presetToggle(control.internalParameter, control.label, wizardCtrlSelection, () => rebuildWizardFromSelection())));
}

function presetToggle(value, label, selectionSet, onChange) {
  const wrapper = document.createElement("label");
  wrapper.className = "preset-toggle";
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = selectionSet.has(value);
  checkbox.addEventListener("change", () => {
    if (checkbox.checked) selectionSet.add(value);
    else selectionSet.delete(value);
    onChange();
  });
  const text = document.createElement("span");
  text.textContent = label;
  wrapper.append(checkbox, text);
  return wrapper;
}

function rebuildWizardFromSelection() {
  if (!wizardEngineId) return;
  let profile;
  try {
    profile = buildEngineProfile(wizardEngineId, {
      library: els.wizardLibraryInput.value.trim() || undefined,
      patch: els.wizardPatchInput.value.trim() || undefined,
      articulationIds: [...wizardArtSelection],
      controlIds: [...wizardCtrlSelection]
    });
  } catch (error) {
    els.statusText.textContent = `Wizardエラー: ${error.message}`;
    return;
  }
  fillWizardFromProfile(profile);
  renderWizardValidation(profile);
}

function onWizardAutoAssignKeyswitches() {
  const wizard = wizardEngineId ? engineWizardById(wizardEngineId) : null;
  const startNote = wizard?.keyswitchStartNote ?? "C0";
  const noteNaming = els.wizardNoteNamingSelect.value || wizard?.noteNaming || "C3=60";
  let articulations;
  try {
    articulations = parseWizardArticulations(els.wizardArticulationsText.value);
  } catch (error) {
    els.statusText.textContent = `Wizardエラー: ${error.message}`;
    return;
  }
  els.wizardArticulationsText.value = articulationsToText(autoAssignKeyswitches(articulations, startNote, noteNaming));
  renderWizardValidation();
}

function applyWizardProfile() {
  let profile;
  try {
    profile = buildWizardProfile();
  } catch (error) {
    els.statusText.textContent = `Wizardエラー: ${error.message}`;
    return;
  }
  mutate("Apply wizard profile", () => {
    upsertProfile(profile);
    project.profileId = profile.id;
    normalizeArticulationsForProfile();
  });
  renderWizardValidation(profile);
  if (els.wizardDialog.open) els.wizardDialog.close();
  els.statusText.textContent = "Setup WizardのProfileを反映しました。音源内部は操作していません。";
}

function renderWizardValidation(profile = null) {
  let messages;
  try {
    messages = validateProfile(profile ?? buildWizardProfile());
  } catch (error) {
    messages = [{ level: "Error", message: error.message }];
  }
  els.wizardValidationList.replaceChildren(...messages.map((item) => {
    const li = document.createElement("li");
    li.className = item.level.toLowerCase();
    li.textContent = `${item.level}: ${item.message}`;
    return li;
  }));
}

function buildWizardProfile() {
  const base = profileById(els.wizardBaseSelect.value) ?? activeProfile();
  const engine = els.wizardEngineInput.value.trim();
  const library = els.wizardLibraryInput.value.trim();
  const patch = els.wizardPatchInput.value.trim();
  if (!engine || !library || !patch) throw new Error("Engine、Library、Patchは必須です。");
  const id = safeProfileId(`${engine}_${library}_${patch}`);
  return normalizeProfile({
    ...structuredClone(base),
    id,
    engine,
    library,
    patch,
    noteNaming: els.wizardNoteNamingSelect.value,
    playableRange: {
      low: Number(els.wizardPlayableLowInput.value),
      high: Number(els.wizardPlayableHighInput.value)
    },
    keyswitchRange: {
      low: Number(els.wizardKeyswitchLowInput.value),
      high: Number(els.wizardKeyswitchHighInput.value)
    },
    articulations: parseWizardArticulations(els.wizardArticulationsText.value),
    controls: parseWizardControls(els.wizardControlsText.value),
    timing: {
      ...(base.timing ?? {}),
      ccLookAheadMs: Number(els.wizardCcLookAheadInput.value),
      programChangeLookAheadMs: Number(els.wizardPcLookAheadInput.value)
    },
    setupInstructions: els.wizardInstructionsText.value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  });
}

function onKeyDown(event) {
  const target = event.target;
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return;
  const key = event.key;
  const cmd = event.metaKey || event.ctrlKey;
  if (cmd && key.toLowerCase() === "z" && !event.shiftKey) {
    event.preventDefault();
    undo();
    return;
  }
  if ((cmd && key.toLowerCase() === "z" && event.shiftKey) || (cmd && key.toLowerCase() === "y")) {
    event.preventDefault();
    redo();
    return;
  }
  if (cmd && key.toLowerCase() === "e") {
    event.preventDefault();
    openDynamicPopover();
    return;
  }
  if (cmd && key.toLowerCase() === "b") {
    event.preventDefault();
    mutate("Add bar", () => {
      project.cursorTick = Math.ceil((maxScoreTick(project) + 1) / (project.ppq * 4)) * project.ppq * 4;
    });
    return;
  }
  if (cmd && key.toLowerCase() === "d") {
    event.preventDefault();
    duplicateSelection();
    return;
  }
  if (cmd && key.toLowerCase() === "c") {
    event.preventDefault();
    copyCurrentSelection();
    return;
  }
  if (cmd && key.toLowerCase() === "x") {
    event.preventDefault();
    cutCurrentSelection();
    return;
  }
  if (cmd && key.toLowerCase() === "v") {
    event.preventDefault();
    pasteCurrentSelection();
    return;
  }
  if (cmd && key.toLowerCase() === "r") {
    event.preventDefault();
    repeatLastAction();
    return;
  }
  const shortcutDuration = durationTicksFromShortcut(event);
  if (!cmd && !event.altKey && shortcutDuration !== null) {
    event.preventDefault();
    applyDurationTicks(shortcutDuration);
    return;
  }
  if (/^[a-g]$/i.test(key) && !cmd) {
    event.preventDefault();
    mutate(`Input ${key.toUpperCase()}`, () => applyNoteLetter(project, key.toUpperCase()));
    return;
  }
  if (key.toLowerCase() === "r" && !cmd) {
    event.preventDefault();
    mutate("Add rest", () => addRest(project, currentDurationTicks()));
    return;
  }
  if (key === "ArrowUp") {
    event.preventDefault();
    mutate("Pitch up", () => transposeSelection(project, event.shiftKey ? 1 : cmd ? 12 : 2));
    return;
  }
  if (key === "ArrowDown") {
    event.preventDefault();
    mutate("Pitch down", () => transposeSelection(project, event.shiftKey ? -1 : cmd ? -12 : -2));
    return;
  }
  if (key.toLowerCase() === "n") {
    event.preventDefault();
    setMode(project.mode === "notation" ? "select" : "notation");
    return;
  }
  if (key.toLowerCase() === "p") {
    event.preventDefault();
    setMode(project.mode === "performance" ? "select" : "performance");
    return;
  }
  if (key === "Escape") {
    event.preventDefault();
    stopLivePlayback();
    mutate("Clear selection", () => {
      project.selectedIds = [];
      project.selectedBars = [];
      project.selectedDynamicId = null;
      project.mode = "select";
    });
    return;
  }
  if (key === "Tab") {
    event.preventDefault();
    selectRelativeNote(event.shiftKey ? -1 : 1);
    return;
  }
  if (key.toLowerCase() === "s") {
    event.preventDefault();
    mutate("Add slur", () => addSlur(project));
    return;
  }
  if (key.toLowerCase() === "h") {
    event.preventDefault();
    mutate("Add hairpin", () => addCrescendo(project, event.shiftKey ? "decrescendo" : "crescendo"));
    return;
  }
  if (key === "Delete" || key === "Backspace") {
    event.preventDefault();
    if (selectedCurvePoint) {
      deleteSelectedCurvePoint();
      return;
    }
    if (project.selectedDynamicId) {
      mutate("Delete dynamic", () => {
        removeDynamic(project, project.selectedDynamicId);
        project.selectedDynamicId = null;
      });
      return;
    }
    deleteSelection();
  }
}

function setMode(mode) {
  project.mode = mode;
  render();
}

function mutate(label, fn, options = {}) {
  const before = cloneProject(project);
  undoStack.push(before);
  redoStack = [];
  fn();
  if (options.repeatable) lastRepeatAction = options.repeatable;
  if (!options.replaceProject) {
    els.statusText.textContent = label;
  }
  render();
  saveAutosave();
}

function undo() {
  const previous = undoStack.pop();
  if (!previous) return;
  redoStack.push(cloneProject(project));
  project = previous;
  render();
  saveAutosave();
}

function redo() {
  const next = redoStack.pop();
  if (!next) return;
  undoStack.push(cloneProject(project));
  project = next;
  render();
  saveAutosave();
}

function selectRelativeNote(direction) {
  const ordered = [...project.notes].sort((a, b) => a.scoreTick - b.scoreTick || a.pitch - b.pitch);
  if (ordered.length === 0) return;
  const currentId = project.selectedIds[0];
  const currentIndex = Math.max(0, ordered.findIndex((note) => note.id === currentId));
  const next = ordered[clamp(currentIndex + direction, 0, ordered.length - 1)];
  mutate("Move selection", () => {
    project.selectedIds = [next.id];
    project.cursorTick = next.scoreTick;
  });
}

function duplicateSelection() {
  const targets = selectedNotes(project);
  if (targets.length === 0) return;
  internalClipboard = copySelection(project);
  const duration = Math.max(...targets.map((note) => note.durationTicks));
  mutate("Duplicate selection", () => {
    pasteSelection(project, internalClipboard, Math.min(...targets.map((note) => note.scoreTick)) + duration);
  }, { repeatable: () => pasteCurrentSelection() });
}

function deleteSelection() {
  if (project.selectedIds.length === 0) return;
  mutate("Delete selection", () => {
    deleteSelectedItems(project);
  });
}

function copyCurrentSelection() {
  internalClipboard = copySelection(project);
  els.statusText.textContent = internalClipboard ? `${internalClipboard.notes.length}件をコピーしました。` : "コピー対象がありません。";
}

function cutCurrentSelection() {
  if (project.selectedIds.length === 0) return;
  mutate("Cut selection", () => {
    internalClipboard = copySelection(project);
    deleteSelectedItems(project);
  });
}

function pasteCurrentSelection() {
  if (!internalClipboard) {
    els.statusText.textContent = "ペースト対象がありません。";
    return;
  }
  mutate("Paste selection", () => {
    pasteSelection(project, internalClipboard, project.cursorTick);
  }, { repeatable: () => pasteCurrentSelection() });
}

function repeatLastAction() {
  if (!lastRepeatAction) {
    els.statusText.textContent = "繰り返す操作がありません。";
    return;
  }
  lastRepeatAction();
}

function activeProfile() {
  return profileById(project.profileId) ?? profiles[0];
}

function saveAutosave() {
  try {
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({ project, profiles: customProfiles(), savedAt: new Date().toISOString() }));
    if (els.autosaveOutput) els.autosaveOutput.textContent = "保存済み";
  } catch (error) {
    if (els.autosaveOutput) els.autosaveOutput.textContent = "保存失敗";
  }
}

function restoreAutosave() {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (Array.isArray(data.profiles)) mergeProfiles(data.profiles);
    if (data.project) project = normalizeProject(data.project);
    if (!profileById(project.profileId)) project.profileId = profiles[0].id;
    if (els.autosaveOutput) els.autosaveOutput.textContent = "復元済み";
  } catch (error) {
    if (els.autosaveOutput) els.autosaveOutput.textContent = "復元失敗";
  }
}

function profileById(id) {
  return profiles.find((profile) => profile.id === id);
}

function customProfiles() {
  const builtInIds = new Set(BUILT_IN_PROFILES.map((profile) => profile.id));
  return profiles.filter((profile) => !builtInIds.has(profile.id));
}

function upsertProfile(profile) {
  const index = profiles.findIndex((item) => item.id === profile.id);
  if (index >= 0) profiles[index] = profile;
  else profiles.push(profile);
  populateProfiles();
}

function mergeProfiles(nextProfiles) {
  nextProfiles.forEach((profile) => upsertProfile(normalizeProfile(profile)));
}

function normalizeArticulationsForProfile() {
  const profile = activeProfile();
  const ids = new Set(profile.articulations.map((art) => art.id));
  project.notes.forEach((note) => {
    if (!ids.has(note.articulation)) note.articulation = profile.articulations[0]?.id ?? "sustain";
  });
}

function render() {
  const profile = activeProfile();
  els.profileSelect.value = project.profileId;
  els.bpmInput.value = project.tempoMap[0]?.bpm ?? 120;
  els.ppqInput.value = project.ppq;
  syncDurationSelect();
  els.cursorOutput.textContent = formatPosition(project.cursorTick, project.ppq);
  els.selectionOutput.textContent = selectionSummary();
  els.batchSummary.textContent = `変更対象:${selectedNotes(project).length}件`;
  document.querySelectorAll(".mode-button").forEach((button) => button.classList.remove("active"));
  els[`${project.mode}ModeButton`]?.classList.add("active");
  populateArticulations();
  renderInspector();
  renderNotation(profile);
  renderPianoRoll(profile);
  renderCurve();
  renderEventList(profile);
  renderValidation(profile);
}

function renderInspector() {
  const notes = selectedNotes(project);
  const pitch = mixedValue(notes, "pitch");
  const articulation = mixedValue(notes, "articulation");
  const offset = mixedValue(notes, "localStartOffsetMs");
  const velocity = mixedValue(notes, "velocity");
  setInputMixed(els.pitchInput, pitch);
  setInputMixed(els.offsetInput, offset);
  setInputMixed(els.velocityInput, velocity);
  if (articulation !== "Mixed" && articulation !== "") els.articulationInput.value = articulation;
  els.articulationInput.title = articulation === "Mixed" ? "Mixed" : "";

  // Note Expression: show the selection's value for the chosen parameter.
  const parameter = els.noteExprParameter.value;
  const exprValues = [...new Set(notes.map((note) => note.expression?.[parameter] ?? ""))];
  setInputMixed(els.noteExprValue, exprValues.length > 1 ? "Mixed" : exprValues[0] ?? "");
  const influences = [...new Set(notes.map((note) => note.expressionInfluence ?? 1))];
  if (influences.length === 1 && notes.length > 0) {
    const percent = Math.round(influences[0] * 100);
    els.noteExprInfluence.value = String(percent);
    els.noteExprInfluenceOut.textContent = `${percent}%`;
  } else if (notes.length > 0) {
    els.noteExprInfluenceOut.textContent = "Mixed";
  }

  // Interpretation (the retained performer) reflects project state.
  const interpretation = { ...DEFAULT_INTERPRETATION, ...(project.interpretation ?? {}) };
  els.interpEnabled.checked = interpretation.enabled;
  const interpPercent = Math.round(clamp(interpretation.amount, 0, 1) * 100);
  els.interpAmount.value = String(interpPercent);
  els.interpAmountOut.textContent = `${interpPercent}%`;
  Object.entries(interpDialEls).forEach(([key, { input, out, unit }]) => {
    const value = Math.round(interpretation[key] ?? 0);
    input.value = String(value);
    out.textContent = `${value}${unit}`;
  });
}

function syncDurationSelect() {
  const notes = selectedNotes(project);
  const value = notes.length > 0 ? mixedValue(notes, "durationTicks") : project.defaultDurationTicks ?? project.ppq;
  els.durationSelect.value = value === "Mixed" ? "" : String(value);
}

function currentDurationTicks() {
  const value = Number(els.durationSelect.value);
  return Number.isFinite(value) ? value : project.defaultDurationTicks ?? project.ppq;
}

function selectionSummary() {
  const noteCount = project.selectedIds.length;
  const barSummary = formatBarSelection(project.selectedBars ?? []);
  if (noteCount && barSummary) return `音符:${noteCount} 小節:${barSummary}`;
  if (barSummary) return `小節:${barSummary}`;
  return String(noteCount);
}

function formatBarSelection(selectedBars) {
  const bars = [...new Set(selectedBars)]
    .filter((barIndex) => Number.isFinite(barIndex))
    .sort((a, b) => a - b);
  if (bars.length === 0) return "";
  const ranges = [];
  let start = bars[0];
  let end = bars[0];
  for (let index = 1; index < bars.length; index += 1) {
    if (bars[index] === end + 1) {
      end = bars[index];
    } else {
      ranges.push(formatBarRange(start, end));
      start = bars[index];
      end = bars[index];
    }
  }
  ranges.push(formatBarRange(start, end));
  return ranges.join(",");
}

function formatBarRange(start, end) {
  return start === end ? String(start + 1) : `${start + 1}-${end + 1}`;
}

function selectMeasure(barIndex, event) {
  const current = project.selectedBars ?? [];
  if (event.metaKey || event.ctrlKey) {
    project.selectedBars = current.includes(barIndex) ? current.filter((item) => item !== barIndex) : [...current, barIndex].sort((a, b) => a - b);
    return;
  }
  if (event.shiftKey && current.length) {
    const anchor = current[current.length - 1];
    const start = Math.min(anchor, barIndex);
    const end = Math.max(anchor, barIndex);
    project.selectedBars = Array.from({ length: end - start + 1 }, (_, index) => start + index);
    return;
  }
  project.selectedBars = [barIndex];
}

// Engraving-style horizontal layout: each gap gets width proportional to
// duration^0.6 (so 16ths stay readable next to whole notes), and content is
// shifted clear of its bar line. Cached for click → bar lookups.
let notationLayout = null;

function buildNotationLayout(availableWidth) {
  // Wider left margin when a key signature needs room between clef and staff.
  const left = 56 + Math.abs(project.keySignature ?? 0) * 11;
  const MIN_NOTE_GAP_PX = 26; // dense passages widen the score instead of cramming
  const ticksPerBar = project.ppq * 4;
  const totalTicks = Math.max(ticksPerBar * 2, Math.ceil((maxScoreTick(project) + 1) / ticksPerBar) * ticksPerBar);
  const anchors = new Set([0, totalTicks]);
  for (let t = ticksPerBar; t < totalTicks; t += ticksPerBar) anchors.add(t);
  const noteTicks = new Set();
  project.notes.forEach((note) => {
    noteTicks.add(Math.min(totalTicks, note.scoreTick));
    noteTicks.add(Math.min(totalTicks, note.scoreTick + note.durationTicks));
  });
  project.rests.forEach((rest) => noteTicks.add(Math.min(totalTicks, rest.scoreTick)));
  noteTicks.forEach((t) => anchors.add(t));
  anchors.add(Math.max(0, Math.min(totalTicks, project.cursorTick)));
  const ticks = [...anchors].sort((a, b) => a - b);
  const units = [0];
  for (let i = 1; i < ticks.length; i += 1) {
    units.push(units[i - 1] + Math.pow(ticks[i] - ticks[i - 1], 0.6));
  }
  const span = units[units.length - 1] || 1;

  // Scale: fit the panel when sparse, but never let the closest pair of
  // note boundaries drop below MIN_NOTE_GAP_PX — grow (and scroll) instead.
  const sortedNoteTicks = [...noteTicks].sort((a, b) => a - b);
  let minNoteUnit = Infinity;
  for (let i = 1; i < sortedNoteTicks.length; i += 1) {
    const gap = sortedNoteTicks[i] - sortedNoteTicks[i - 1];
    if (gap > 0) minNoteUnit = Math.min(minNoteUnit, Math.pow(gap, 0.6));
  }
  const fitScale = Math.max(0, availableWidth - left - 30) / span;
  const minScale = Number.isFinite(minNoteUnit) ? MIN_NOTE_GAP_PX / minNoteUnit : 0;
  const scale = Math.max(fitScale, minScale);

  const xs = units.map((u) => left + u * scale);
  const right = left + span * scale + 16;
  const width = Math.max(right + 14, availableWidth);
  const tickX = (tick) => {
    const t = Math.max(ticks[0], Math.min(tick, ticks[ticks.length - 1]));
    const hi = ticks.findIndex((v) => v >= t);
    if (ticks[hi] === t) return xs[hi];
    const lo = hi - 1;
    return xs[lo] + ((xs[hi] - xs[lo]) * (t - ticks[lo])) / (ticks[hi] - ticks[lo]);
  };
  const noteX = (tick) => tickX(tick) + 14;
  return { left, right, width, ticksPerBar, totalTicks, barCount: Math.ceil(totalTicks / ticksPerBar), tickX, noteX };
}

function renderNotation(profile) {
  const svg = els.notationSvg;
  clear(svg);
  const available = svg.parentElement?.clientWidth || 900;
  const height = 260;
  const top = 78;
  const staffGap = 12;
  const layout = buildNotationLayout(available);
  notationLayout = layout;
  const { left, right, width, ticksPerBar, totalTicks, barCount, tickX, noteX } = layout;
  svg.setAttribute("width", width);
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

  for (let barIndex = 0; barIndex < barCount; barIndex += 1) {
    const x = tickX(barIndex * ticksPerBar);
    svg.append(svgNode("rect", {
      x,
      y: top - 22,
      width: tickX(Math.min((barIndex + 1) * ticksPerBar, totalTicks)) - x,
      height: 4 * staffGap + 62,
      class: "measure-hit-area",
      "data-bar-index": barIndex
    }));
  }

  (project.selectedBars ?? []).forEach((barIndex) => {
    const x = tickX(barIndex * ticksPerBar);
    if (x >= left && x < right) {
      svg.append(svgNode("rect", {
        x,
        y: top - 14,
        width: tickX(Math.min((barIndex + 1) * ticksPerBar, totalTicks)) - x,
        height: 4 * staffGap + 28,
        class: "measure-selection"
      }));
    }
  });

  // The staff extends under the clef and key signature.
  for (let line = 0; line < 5; line += 1) {
    svg.append(lineEl(8, top + line * staffGap, right, top + line * staffGap, "staff-line"));
  }
  const clef = project.clef ?? "treble";
  const key = project.keySignature ?? 0;
  els.clefSelect.value = clef;
  els.keySelect.value = String(key);
  if (clef === "bass") {
    svg.append(textEl(8, top + 40, "\u{1D122}", "clef-symbol clef-bass"));
  } else {
    svg.append(textEl(8, top + 52, "\u{1D11E}", "clef-symbol clef-treble"));
  }
  keySignatureSteps(key, clef).forEach((sig, index) => {
    svg.append(textEl(40 + index * 11, top + 48 - sig.step * 6 + 8, sig.symbol, "accidental key-sig"));
  });
  for (let tick = 0; tick <= totalTicks; tick += ticksPerBar) {
    const x = tickX(tick);
    svg.append(lineEl(x, top - 10, x, top + 4 * staffGap + 10, "bar-line"));
    svg.append(textEl(x + 5, top - 18, String(Math.floor(tick / ticksPerBar) + 1), "bar-number"));
  }

  project.rests.forEach((rest) => {
    const x = noteX(rest.scoreTick);
    svg.append(textEl(x, top + 24, "休", "rest-symbol"));
  });

  project.slurs.forEach((slur) => {
    const start = project.notes.find((note) => note.id === slur.startNoteId);
    const end = project.notes.find((note) => note.id === slur.endNoteId);
    if (!start || !end) return;
    // Notehead to notehead, arched over the higher of the two. Margins shrink
    // with the gap so tightly spaced notes never get overshot.
    const startX = noteX(start.scoreTick);
    const endX = noteX(end.scoreTick);
    const margin = Math.min(7, Math.max(1.5, (endX - startX) * 0.15));
    const x1 = startX + margin;
    const x2 = Math.max(endX - 2, x1 + 6);
    const yTop = top + Math.min(pitchToStaffY(start.pitch), pitchToStaffY(end.pitch)) - 12;
    const lift = Math.min(26, 6 + (x2 - x1) * 0.08);
    svg.append(pathEl(`M ${x1} ${yTop} Q ${(x1 + x2) / 2} ${yTop - lift} ${x2} ${yTop}`, "slur"));
  });

  project.crescendos.forEach((hairpin) => {
    const start = project.notes.find((note) => note.id === hairpin.startNoteId);
    const end = project.notes.find((note) => note.id === hairpin.endNoteId);
    if (!start || !end) return;
    const x1 = noteX(start.scoreTick);
    const x2 = noteX(end.scoreTick + end.durationTicks);
    const y = top + 78;
    if (hairpin.direction === "crescendo") {
      svg.append(lineEl(x1, y, x2, y - 10, "hairpin"));
      svg.append(lineEl(x1, y, x2, y + 10, "hairpin"));
    } else {
      svg.append(lineEl(x1, y - 10, x2, y, "hairpin"));
      svg.append(lineEl(x1, y + 10, x2, y, "hairpin"));
    }
  });

  (project.dynamics ?? []).forEach((dyn) => {
    const x = noteX(dyn.tick);
    const selected = project.selectedDynamicId === dyn.id;
    const mark = textEl(x - 6, top + 96, dyn.mark, `dynamic-mark ${selected ? "selected" : ""}`);
    mark.addEventListener("click", (event) => {
      event.stopPropagation();
      mutate("Select dynamic", () => {
        project.selectedDynamicId = selected ? null : dyn.id;
      });
    });
    svg.append(mark);
  });

  // Beamed groups: contiguous flagged notes within a beat share one beam
  // instead of individual flags. Geometry is computed up front so every
  // member's stem can reach the common beam line.
  const groupsList = beamGroups(project.notes, project.ppq);
  const groupIndex = new Map();
  groupsList.forEach((ids, gi) => ids.forEach((id) => groupIndex.set(id, gi)));
  const beamGeometry = groupsList.map((ids) => {
    const members = ids.map((id) => project.notes.find((n) => n.id === id));
    const data = members.map((member) => ({
      x: noteX(member.scoreTick),
      y: top + pitchToStaffY(member.pitch),
      position: staffPosition(member.pitch, clef, key),
      flags: noteGlyph(member.durationTicks, project.ppq).flags
    }));
    const down = data.reduce((sum, d) => sum + d.position, 0) / data.length >= 4;
    const beamY = down
      ? Math.max(...data.map((d) => d.y)) + 42
      : Math.min(...data.map((d) => d.y)) - 42;
    data.forEach((d) => {
      d.stemX = down ? d.x - NOTE_HEAD_RX + 1 : d.x + NOTE_HEAD_RX - 1;
    });
    return { data, down, beamY };
  });

  project.notes.forEach((note) => {
    const selected = project.selectedIds.includes(note.id);
    const x = noteX(note.scoreTick);
    const y = top + pitchToStaffY(note.pitch);
    const group = svgNode("g", { class: `note-group ${selected ? "selected" : ""}`, tabindex: "0" });
    // Ledger lines for pitches outside the five staff lines.
    const position = staffPosition(note.pitch, clef, key);
    for (let s = -2; s >= position; s -= 2) {
      svg.append(lineEl(x - 11, top + 48 - s * 6, x + 11, top + 48 - s * 6, "staff-line"));
    }
    for (let s = 10; s <= position; s += 2) {
      svg.append(lineEl(x - 11, top + 48 - s * 6, x + 11, top + 48 - s * 6, "staff-line"));
    }
    const glyph = noteGlyph(note.durationTicks, project.ppq);
    group.append(svgNode("ellipse", {
      cx: x, cy: y, rx: NOTE_HEAD_RX, ry: NOTE_HEAD_RY,
      class: `note-head ${glyph.hollow ? "hollow" : ""}`,
      transform: `rotate(${NOTE_HEAD_ANGLE} ${x} ${y})`
    }));
    // Stems flip downward from the middle line up; flags hang off the stem
    // tip — unless the note is beamed, in which case the stem reaches the
    // group's beam line and the flags are suppressed.
    const beamed = groupIndex.has(note.id);
    const geo = beamed ? beamGeometry[groupIndex.get(note.id)] : null;
    const stemDown = beamed ? geo.down : position >= 4;
    if (glyph.hasStem) {
      // Standard stem length: 3.5 staff spaces (42px at 12px/space).
      const stemX = stemDown ? x - NOTE_HEAD_RX + 1 : x + NOTE_HEAD_RX - 1;
      const stemEnd = beamed ? geo.beamY : (stemDown ? y + 42 : y - 42);
      group.append(lineEl(stemX, stemDown ? y + 1 : y - 1, stemX, stemEnd, "note-stem"));
      if (!beamed) {
        for (let i = 0; i < glyph.flags; i += 1) {
          const flagY = stemDown ? y + 42 - i * 9 : y - 42 + i * 9;
          const dir = stemDown ? -1 : 1;
          group.append(pathEl(`M ${stemX} ${flagY} q 11 ${5 * dir} 9 ${19 * dir}`, "note-flag"));
        }
      }
    }
    if (glyph.dotted) {
      // The augmentation dot sits right of the head; notes on a line get it
      // in the space above.
      const dotY = position % 2 === 0 ? y - 4 : y;
      group.append(svgNode("circle", { cx: x + 13, cy: dotY, r: 2.5, class: "aug-dot" }));
    }
    const accidental = noteSpelling(note.pitch, key).accidental;
    if (accidental) {
      group.append(textEl(x - 26, y + 8, accidental, "accidental"));
    }
    group.append(textEl(x - 12, y + 22, pitchName(note.pitch, profile.noteNaming), "note-label"));
    group.append(textEl(x - 13, y + 36, getArticulation(profile, note.articulation)?.name ?? note.articulation, "articulation-label"));
    if (note.tiedToNext) {
      // The tie spans exactly this note's duration, reaching the next
      // notehead; margins shrink with the gap so short values stay inside it.
      const nextX = noteX(note.scoreTick + note.durationTicks);
      const margin = Math.min(7, Math.max(1.5, (nextX - x) * 0.3));
      const tieX1 = x + margin;
      const tieX2 = Math.max(nextX - margin, tieX1 + 3);
      const sag = Math.min(10, 4 + (tieX2 - tieX1) * 0.08);
      group.append(pathEl(
        `M ${tieX1} ${y + 10} Q ${(tieX1 + tieX2) / 2} ${y + 10 + sag} ${tieX2} ${y + 10}`, "tie"
      ));
    }
    group.addEventListener("click", (event) => {
      event.stopPropagation();
      mutate("Select note", () => selectNote(note.id, event));
    });
    svg.append(group);
  });

  // Beam bars: one per flag level shared by each adjacent pair, stacked
  // inward from the beam line.
  beamGeometry.forEach(({ data, down, beamY }) => {
    for (let i = 0; i < data.length - 1; i += 1) {
      const a = data[i];
      const b = data[i + 1];
      const count = Math.min(a.flags, b.flags);
      for (let k = 0; k < count; k += 1) {
        const yk = beamY + (down ? -k * 6 : k * 6);
        svg.append(lineEl(a.stemX, yk, b.stemX, yk, "note-beam"));
      }
    }
  });

  const cursorX = noteX(project.cursorTick);
  svg.append(lineEl(cursorX, top - 32, cursorX, top + 92, "cursor-line"));
}

function onNotationBackgroundClick(event) {
  if (event.target.closest?.(".note-group")) return;
  const ticksPerBar = project.ppq * 4;
  const hitArea = event.target.closest?.(".measure-hit-area");
  const barIndex = hitArea ? Number(hitArea.dataset.barIndex) : measureIndexFromNotationEvent(event);
  if (!Number.isFinite(barIndex)) return;
  mutate("Select measure", () => {
    selectMeasure(barIndex, event);
    project.cursorTick = barIndex * ticksPerBar;
    project.selectedIds = [];
  });
}

function measureIndexFromNotationEvent(event) {
  if (!notationLayout) return null;
  const rect = els.notationSvg.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const { left, right, ticksPerBar, totalTicks, barCount, tickX } = notationLayout;
  if (x < left || x > right) return null;
  for (let barIndex = 0; barIndex < barCount; barIndex += 1) {
    const end = tickX(Math.min((barIndex + 1) * ticksPerBar, totalTicks));
    if (x < end) return barIndex;
  }
  return barCount - 1;
}

function renderPianoRoll(profile) {
  const svg = els.pianoRollSvg;
  clear(svg);
  const { width, height, left, right, top, bottom, ticksPerBar, totalTicks, xScale } = pianoRollMetrics();
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  const notes = computePerformanceNotes(project, profile);
  const minPitch = Math.min(48, ...project.notes.map((note) => note.pitch)) - 2;
  const maxPitch = Math.max(84, ...project.notes.map((note) => note.pitch)) + 2;
  const yScale = (bottom - top) / (maxPitch - minPitch + 1);

  for (let tick = 0; tick <= totalTicks; tick += project.ppq) {
    const x = left + tick * xScale;
    svg.append(lineEl(x, top, x, bottom, tick % ticksPerBar === 0 ? "roll-bar" : "roll-beat"));
  }
  for (let pitch = minPitch; pitch <= maxPitch; pitch += 2) {
    const y = bottom - (pitch - minPitch) * yScale;
    svg.append(lineEl(left, y, right, y, "roll-pitch"));
    if (pitch % 12 === 0) svg.append(textEl(8, y + 4, pitchName(pitch, profile.noteNaming), "pitch-label"));
  }

  notes.forEach((note) => {
    const y = bottom - (note.pitch - minPitch) * yScale - yScale * 0.38;
    const scoreX = left + note.scoreTick * xScale;
    const actualX = left + note.performanceStartTick * xScale;
    const scoreW = Math.max(5, note.durationTicks * xScale);
    const actualW = Math.max(5, note.performanceDurationTicks * xScale);
    svg.append(svgNode("rect", { x: scoreX, y, width: scoreW, height: Math.max(5, yScale * 0.72), rx: 3, class: "score-note" }));
    const rect = svgNode("rect", { x: actualX, y, width: actualW, height: Math.max(5, yScale * 0.72), rx: 3, class: project.selectedIds.includes(note.id) ? "actual-note selected" : "actual-note", "data-note-id": note.id });
    rect.addEventListener("click", (event) => {
      event.stopPropagation();
      mutate("Select note", () => selectNote(note.id, event));
    });
    rect.addEventListener("mousedown", (event) => startPianoRollDrag(event, note, xScale));
    svg.append(rect);
    svg.append(lineEl(scoreX, y + yScale * 0.36, actualX, y + yScale * 0.36, "offset-arrow"));
    svg.append(textEl(actualX + 4, y - 3, `${formatPerformanceDeltaMs(note)}ms`, "offset-label"));
  });

  renderCcEvents(svg, profile, { left, right, bottom, totalTicks, xScale });
}

function renderCurve() {
  const svg = els.curveSvg;
  clear(svg);
  const width = svg.clientWidth || 900;
  const height = 210;
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  const left = 54;
  const right = width - 24;
  const top = 18;
  const bottom = height - 28;
  const maxTick = Math.max(project.ppq * 4, maxScoreTick(project));
  const xScale = (right - left) / maxTick;
  for (let i = 0; i <= 4; i += 1) {
    const y = top + ((bottom - top) * i) / 4;
    svg.append(lineEl(left, y, right, y, "curve-grid"));
    svg.append(textEl(12, y + 4, String(1 - i / 4), "pitch-label"));
  }
  for (let tick = 0; tick <= maxTick; tick += project.ppq) {
    const x = left + tick * xScale;
    svg.append(lineEl(x, top, x, bottom, "curve-beat"));
  }
  const samples = [];
  for (let tick = 0; tick <= maxTick; tick += Math.max(1, Math.round(maxTick / 80))) {
    const value = sampleCurve(project, currentCurveParameter, tick);
    const x = left + tick * xScale;
    const y = bottom - value * (bottom - top);
    samples.push(`${x},${y}`);
  }
  svg.append(polylineEl(samples.join(" "), "curve-line"));
  const curve = project.expressionCurves[currentCurveParameter];
  curve?.points.forEach((point, index) => {
    const x = left + point.tick * xScale;
    const y = bottom - point.value * (bottom - top);
    const selected = selectedCurvePoint?.parameter === currentCurveParameter && selectedCurvePoint.index === index;
    const circle = svgNode("circle", { cx: x, cy: y, r: 6, class: selected ? "curve-point selected" : "curve-point", "data-point-index": index });
    circle.addEventListener("mousedown", (event) => startCurveDrag(event, index));
    circle.addEventListener("click", (event) => onCurvePointClick(event, index));
    svg.append(circle);
  });
}

function onCurveClick(event) {
  if (suppressNextCurveClick) {
    suppressNextCurveClick = false;
    return;
  }
  if (event.target !== els.curveSvg && event.target.tagName !== "circle" && event.target.tagName !== "polyline") return;
  const { tick, value } = curvePointFromEvent(event);
  mutate("Edit expression curve", () => {
    upsertCurvePoint(project, currentCurveParameter, tick, value);
  }, { repeatable: null });
}

function startPianoRollDrag(event, note, xScale) {
  event.preventDefault();
  event.stopPropagation();
  dragState = {
    type: "piano-note",
    noteId: note.id,
    startClientX: event.clientX,
    startTick: note.performanceStartTick,
    xScale,
    moved: false
  };
}

function startCurveDrag(event, pointIndex) {
  event.preventDefault();
  event.stopPropagation();
  dragState = {
    type: "curve-point",
    pointIndex,
    parameter: currentCurveParameter,
    startClientX: event.clientX,
    startClientY: event.clientY,
    moved: false
  };
  selectedCurvePoint = { parameter: currentCurveParameter, index: pointIndex };
}

function onDocumentMouseMove(event) {
  if (!dragState) return;
  const distance = Math.abs(event.clientX - dragState.startClientX) + Math.abs((event.clientY ?? 0) - (dragState.startClientY ?? 0));
  if (distance > 3) dragState.moved = true;
}

function onDocumentMouseUp(event) {
  if (!dragState) return;
  const state = dragState;
  dragState = null;
  if (!state.moved) return;
  if (state.type === "piano-note") {
    const snap = event.shiftKey ? project.ppq / 4 : project.ppq / 16;
    const tick = Math.max(0, Math.round((state.startTick + (event.clientX - state.startClientX) / state.xScale) / snap) * snap);
    mutate("Drag performance timing", () => {
      setFrozenPerformanceTick(project, state.noteId, tick);
      project.selectedIds = [state.noteId];
      project.cursorTick = project.notes.find((note) => note.id === state.noteId)?.scoreTick ?? project.cursorTick;
    });
  }
  if (state.type === "curve-point") {
    const { tick, value } = curvePointFromEvent(event);
    suppressNextCurveClick = true;
    mutate("Drag expression point", () => {
      moveCurvePoint(project, state.parameter, state.pointIndex, tick, value);
    });
  }
}

function onCurvePointClick(event, index) {
  event.stopPropagation();
  if (event.altKey || event.metaKey) {
    mutate("Delete expression point", () => {
      deleteCurvePoint(project, currentCurveParameter, index);
      selectedCurvePoint = null;
    });
    return;
  }
  selectedCurvePoint = { parameter: currentCurveParameter, index };
  renderCurve();
}

function deleteSelectedCurvePoint() {
  mutate("Delete expression point", () => {
    deleteCurvePoint(project, selectedCurvePoint.parameter, selectedCurvePoint.index);
    selectedCurvePoint = null;
  });
}

function curvePointFromEvent(event) {
  const rect = els.curveSvg.getBoundingClientRect();
  const width = els.curveSvg.clientWidth || 900;
  const height = 210;
  const left = 54;
  const right = width - 24;
  const top = 18;
  const bottom = height - 28;
  const maxTick = Math.max(project.ppq * 4, maxScoreTick(project));
  const ratioX = clamp((event.clientX - rect.left - left) / (right - left), 0, 1);
  const ratioY = clamp((event.clientY - rect.top - top) / (bottom - top), 0, 1);
  return {
    tick: Math.round((ratioX * maxTick) / (project.ppq / 8)) * (project.ppq / 8),
    value: 1 - ratioY
  };
}

function renderCcEvents(svg, profile, metrics) {
  const ccEvents = generateCcEvents(project, profile);
  const grouped = new Map();
  ccEvents.forEach((event) => {
    const key = `${event.tick}:${event.cc}:${event.value}`;
    if (!grouped.has(key)) grouped.set(key, event);
  });
  [...grouped.values()].forEach((event) => {
    const x = metrics.left + event.tick * metrics.xScale;
    if (x < metrics.left || x > metrics.right) return;
    const laneTop = metrics.bottom - 44;
    const y = laneTop + (1 - event.value / 127) * 36;
    svg.append(lineEl(x, laneTop, x, metrics.bottom, "cc-event-line"));
    const dot = svgNode("circle", { cx: x, cy: y, r: 3.5, class: "cc-event-dot" });
    dot.append(svgNode("title", {}));
    dot.querySelector("title").textContent = `CC${event.cc} ${event.parameter} = ${event.value}`;
    svg.append(dot);
  });
  svg.append(textEl(metrics.left, metrics.bottom - 48, "CC", "cc-lane-label"));
}

function renderEventList(profile) {
  const events = generateMidiEventList(project, profile);
  els.eventListSummary.textContent = `${events.length} events`;
  els.eventListBody.replaceChildren(...events.slice(0, 300).map((event) => {
    const tr = document.createElement("tr");
    [formatPosition(event.tick, project.ppq), event.tick, event.type, event.detail, event.source].forEach((value) => {
      const td = document.createElement("td");
      td.textContent = String(value ?? "");
      tr.append(td);
    });
    return tr;
  }));
}

function renderValidation(profile) {
  const messages = validateProfile(profile);
  els.validationList.replaceChildren(...messages.map((item) => {
    const li = document.createElement("li");
    li.className = item.level.toLowerCase();
    li.textContent = `${item.level}: ${item.message}`;
    return li;
  }));
  els.reportText.value = createSetupReport(profile);
}

function selectNote(noteId, event) {
  project.selectedBars = [];
  selectedCurvePoint = null;
  if (event.metaKey || event.ctrlKey) {
    project.selectedIds = project.selectedIds.includes(noteId) ? project.selectedIds.filter((id) => id !== noteId) : [...project.selectedIds, noteId];
  } else if (event.shiftKey && project.selectedIds.length) {
    const ordered = [...project.notes].sort((a, b) => a.scoreTick - b.scoreTick || a.pitch - b.pitch);
    const firstIndex = ordered.findIndex((note) => note.id === project.selectedIds[0]);
    const nextIndex = ordered.findIndex((note) => note.id === noteId);
    const [start, end] = [Math.min(firstIndex, nextIndex), Math.max(firstIndex, nextIndex)];
    project.selectedIds = ordered.slice(start, end + 1).map((note) => note.id);
  } else {
    project.selectedIds = [noteId];
  }
  const note = project.notes.find((item) => item.id === noteId);
  if (note) project.cursorTick = note.scoreTick;
}

function formatPerformanceDeltaMs(note) {
  const delta = tickToMs(note.performanceStartTick, project.tempoMap, project.ppq) - tickToMs(note.scoreTick, project.tempoMap, project.ppq);
  return `${delta >= 0 ? "+" : ""}${Math.round(delta)}`;
}

function downloadMidi(targetProject, filename) {
  const bytes = exportMidi(targetProject, profileById(targetProject.profileId) ?? activeProfile());
  downloadBlob(new Blob([bytes], { type: "audio/midi" }), filename);
  els.statusText.textContent = `${filename}を書き出しました。`;
}

// --- Live MIDI output (Web MIDI) -----------------------------------------
// The app stays silent; it streams the generated events to an external MIDI
// port (e.g. an IAC bus into Logic) so a real instrument sounds them. This is
// the feedback loop — the body (sampler) lives outside, the brain here.

function disableMidiControls() {
  [els.midiOutputSelect, els.playButton, els.stopButton, els.loopToggle, els.testToneButton].forEach((el) => {
    if (el) el.disabled = true;
  });
}

async function initMidi() {
  if (!navigator.requestMIDIAccess) {
    els.midiStatusOutput.textContent = "Web MIDI非対応(Chrome系/localhost)";
    disableMidiControls();
    return;
  }
  try {
    midiAccess = await navigator.requestMIDIAccess({ sysex: false });
    midiAccess.addEventListener?.("statechange", populateMidiOutputs);
    populateMidiOutputs();
  } catch (error) {
    els.midiStatusOutput.textContent = "MIDIアクセス不可";
    disableMidiControls();
  }
}

function populateMidiOutputs() {
  if (!midiAccess) return;
  const outputs = [...midiAccess.outputs.values()];
  const previous = midiOutput?.id;
  els.midiOutputSelect.replaceChildren(
    option("", outputs.length ? "出力先を選択" : "出力先なし"),
    ...outputs.map((out) => option(out.id, out.name ?? out.id))
  );
  if (previous && outputs.some((out) => out.id === previous)) {
    els.midiOutputSelect.value = previous;
    els.midiStatusOutput.textContent = `→ ${midiOutput.name}`;
  } else {
    midiOutput = null;
    els.midiStatusOutput.textContent = outputs.length ? "出力先を選択" : "出力先なし";
  }
}

function startLivePlayback() {
  if (!midiOutput) {
    els.midiStatusOutput.textContent = "出力先を選択してください";
    return;
  }
  stopLivePlayback();
  playbackMessagesFn = () => generatePlaybackMessages(project, activeProfile());
  playbackLoop = loopEnabled;
  isPlaying = true;
  els.playButton.classList.add("active");
  scheduleCycle();
}

// Schedule one pass; when looping, re-generate each cycle so tweaking the dials
// / interpretation toggle is heard on the next loop.
function scheduleCycle() {
  if (!isPlaying || !midiOutput || !playbackMessagesFn) return;
  const messages = playbackMessagesFn();
  if (messages.length === 0) {
    els.midiStatusOutput.textContent = "再生するイベントがありません";
    stopLivePlayback();
    return;
  }
  const startAt = performance.now() + PLAYBACK_LEAD_MS;
  let endMs = 0;
  messages.forEach((message) => {
    midiOutput.send(message.bytes, startAt + message.timeMs);
    endMs = Math.max(endMs, message.timeMs);
  });
  els.midiStatusOutput.textContent = playbackLoop ? "ループ再生中…" : "再生中…";
  const total = PLAYBACK_LEAD_MS + endMs;
  if (playbackLoop) {
    playbackTimer = setTimeout(scheduleCycle, total + 350); // small luft between loops
  } else {
    playbackTimer = setTimeout(stopLivePlayback, total + 250);
  }
}

function stopLivePlayback() {
  if (playbackTimer) {
    clearTimeout(playbackTimer);
    playbackTimer = null;
  }
  if (midiOutput) {
    midiOutput.clear?.(); // cancel anything still scheduled
    midiOutput.send([0xb0, 120, 0]); // all sound off
    midiOutput.send([0xb0, 123, 0]); // all notes off
  }
  if (isPlaying) {
    els.midiStatusOutput.textContent = midiOutput ? `→ ${midiOutput.name}` : "停止";
  }
  isPlaying = false;
  els.playButton.classList.remove("active");
}

// Send a single note to confirm the IAC -> Logic routing works before judging
// any music. Independent of the transport.
function sendTestTone() {
  if (!midiOutput) {
    els.midiStatusOutput.textContent = "出力先を選択してください";
    return;
  }
  const now = performance.now();
  midiOutput.send([0x90, 60, 90], now + 20);
  midiOutput.send([0x80, 60, 0], now + 520);
  els.midiStatusOutput.textContent = "テスト音を送出 (C4)";
}

function enterPhraseText() {
  const text = els.phraseInput.value.trim();
  if (!text) return;
  let parsed;
  try {
    parsed = parsePhrase(text, { ppq: project.ppq, startTick: project.cursorTick, velocity: 80, articulation: "sustain" });
  } catch (error) {
    els.statusText.textContent = `テキスト入力エラー: ${error.message}`;
    return;
  }
  if (parsed.notes.length === 0 && parsed.rests.length === 0) return;
  mutate("Enter phrase text", () => {
    project.notes.push(...parsed.notes);
    project.rests.push(...parsed.rests);
    project.selectedIds = parsed.notes.map((note) => note.id);
    project.selectedBars = [];
    project.cursorTick = parsed.endTick;
  });
  els.phraseInput.value = "";
}

// Curated setup guide (IAC / DAW / app / bridge / loopback), rendered from the
// pure getSetupGuide — runnable commands get a copy button, refs get a link.
function openSetup() {
  renderSetupSteps();
  if (typeof els.setupDialog.showModal === "function") els.setupDialog.showModal();
  else els.setupDialog.setAttribute("open", "");
}

function renderSetupSteps() {
  const guide = getSetupGuide({ daw: els.setupDawSelect.value });
  els.setupSteps.replaceChildren(...guide.steps.map((step) => {
    const li = document.createElement("li");
    li.className = "setup-step";
    const title = document.createElement("div");
    title.className = "setup-step-title";
    title.textContent = step.title;
    const detail = document.createElement("p");
    detail.className = "setup-step-detail";
    detail.textContent = step.detail;
    li.append(title, detail);
    if (step.command) {
      const row = document.createElement("div");
      row.className = "setup-cmd";
      const code = document.createElement("code");
      code.textContent = step.command;
      const copy = document.createElement("button");
      copy.type = "button";
      copy.textContent = "コピー";
      copy.addEventListener("click", () => {
        navigator.clipboard?.writeText(step.command);
        copy.textContent = "コピー済";
        setTimeout(() => { copy.textContent = "コピー"; }, 1200);
      });
      row.append(code, copy);
      li.append(row);
    }
    if (step.url) {
      const link = document.createElement("a");
      link.href = step.url;
      link.target = "_blank";
      link.rel = "noopener";
      link.className = "setup-link";
      link.textContent = step.url.startsWith("http") ? "公式/リンクを開く" : step.url;
      li.append(link);
    }
    return li;
  }));
}

function loadDemoPhrase() {
  mutate("Load demo phrase", () => {
    const profileId = project.profileId;
    project = createDemoPhraseProject(profileId);
  }, { replaceProject: true });
  els.statusText.textContent = "デモ譜を読み込みました（解釈ON）。Live MIDIで▶、解釈チェックやループ・内訳ダイヤルで聴き比べてください。";
}

// Play an externally-delivered project (from the MCP bridge) without disturbing
// the editor's own project — just routes it through the same Web MIDI transport.
function playDeliveredProject(delivered, loop) {
  if (!midiOutput) {
    els.midiStatusOutput.textContent = "出力先(IAC)未選択：ブリッジ再生不可";
    return;
  }
  let target;
  try {
    target = normalizeProject(delivered);
  } catch (error) {
    els.midiStatusOutput.textContent = `ブリッジ受信エラー: ${error.message}`;
    return;
  }
  const profile = profileById(target.profileId) ?? activeProfile();
  stopLivePlayback();
  playbackMessagesFn = () => generatePlaybackMessages(target, profile);
  playbackLoop = Boolean(loop);
  isPlaying = true;
  els.playButton.classList.add("active");
  scheduleCycle();
}

// --- MCP live bridge (browser side): short-poll the local MCP server for
// play/stop commands and route them through Web MIDI. -----------------------
function toggleBridge() {
  if (els.bridgeToggle.checked) startBridgePolling();
  else stopBridgePolling();
}

function startBridgePolling() {
  const port = Number(els.bridgePort.value) || 4274;
  bridgePollUrl = `http://localhost:${port}/poll`;
  setBridgeStatus("接続中…");
  pollBridge();
}

function stopBridgePolling() {
  if (bridgeTimer) {
    clearTimeout(bridgeTimer);
    bridgeTimer = null;
  }
  setBridgeStatus("未接続");
}

async function pollBridge() {
  if (!els.bridgeToggle.checked) return;
  try {
    const res = await fetch(bridgePollUrl, { cache: "no-store" });
    if (res.status === 200) {
      const command = await res.json();
      handleBridgeCommand(command);
    } else {
      setBridgeStatus("接続OK（待機中）");
    }
  } catch (error) {
    setBridgeStatus(`未接続（MCPサーバ起動？）`);
  }
  if (els.bridgeToggle.checked) bridgeTimer = setTimeout(pollBridge, 250);
}

function handleBridgeCommand(command) {
  if (!command || typeof command !== "object") return;
  if (command.type === "stop") {
    stopLivePlayback();
    setBridgeStatus("受信: stop");
    return;
  }
  if (command.type === "play" && command.project) {
    playDeliveredProject(command.project, command.loop);
    setBridgeStatus(`受信: play (${command.project.notes?.length ?? 0}音)`);
  }
}

function setBridgeStatus(text) {
  if (els.bridgeStatus) els.bridgeStatus.textContent = text;
}

// --- Auto-calibration (loopback) -----------------------------------------
// Sweep the intensity CC on a held note, capture the looped-back audio, measure
// loudness per step, fit a curve that linearises the response, and store it on
// the active profile. Browser-only (Web MIDI out + getUserMedia/Web Audio in).

async function populateAudioInputs() {
  if (!navigator.mediaDevices?.enumerateDevices) {
    els.audioInputSelect.disabled = true;
    els.calibrateButton.disabled = true;
    return;
  }
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const inputs = devices.filter((d) => d.kind === "audioinput");
    els.audioInputSelect.replaceChildren(
      option("", inputs.length ? "既定の入力" : "入力なし"),
      ...inputs.map((d, i) => option(d.deviceId, d.label || `入力 ${i + 1}`))
    );
  } catch (error) {
    els.audioInputSelect.disabled = true;
  }
}

function setCalibStatus(text) {
  if (els.calibStatus) els.calibStatus.textContent = text;
  els.statusText.textContent = text;
}

async function runAutoCalibration() {
  if (!midiOutput) {
    setCalibStatus("出力先(IAC)を選択してください");
    return;
  }
  const profile = activeProfile();
  const control = profile.controls.find((c) => c.internalParameter === "intensity" && c.target?.type === "midiCC");
  if (!control) {
    setCalibStatus("intensityのmidiCC制御がProfileにありません");
    return;
  }
  let stream;
  try {
    const deviceId = els.audioInputSelect.value;
    stream = await navigator.mediaDevices.getUserMedia({ audio: deviceId ? { deviceId: { exact: deviceId } } : true });
  } catch (error) {
    setCalibStatus(`オーディオ入力にアクセスできません: ${error.message}`);
    return;
  }
  populateAudioInputs(); // labels are available once permission is granted

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const ctx = new AudioCtx();
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 2048;
  ctx.createMediaStreamSource(stream).connect(analyser);
  const buffer = new Float32Array(analyser.fftSize);

  const probe = buildCalibrationProbe({ cc: control.target.cc, pitch: 60, velocity: 100, steps: 16, dwellMs: 300 });
  const sendBase = performance.now() + PLAYBACK_LEAD_MS;
  const samples = [];
  els.calibrateButton.disabled = true;
  setCalibStatus("計測中… 音を鳴らしています");
  const interval = setInterval(() => {
    analyser.getFloatTimeDomainData(buffer);
    let sum = 0;
    for (let i = 0; i < buffer.length; i += 1) sum += buffer[i] * buffer[i];
    samples.push({ timeMs: performance.now() - sendBase, rms: Math.sqrt(sum / buffer.length) });
  }, 20);
  probe.messages.forEach((m) => midiOutput.send(m.bytes, sendBase + m.timeMs));

  await new Promise((resolve) => setTimeout(resolve, PLAYBACK_LEAD_MS + probe.totalMs + 200));
  clearInterval(interval);
  midiOutput.clear?.();
  midiOutput.send([0xb0, 120, 0]);
  midiOutput.send([0xb0, 123, 0]);
  stream.getTracks().forEach((t) => t.stop());
  ctx.close?.();
  els.calibrateButton.disabled = false;

  const measured = reduceCalibrationMeasurement(samples, probe.windows);
  const levels = measured.map((m) => m.level).filter(Number.isFinite);
  const span = levels.length ? Math.max(...levels) - Math.min(...levels) : 0;
  if (span < 3) {
    setCalibStatus(`応答を検出できません (${span.toFixed(1)}dB)。ループバック配線/入力を確認してください`);
    return;
  }
  const curveId = `measured_${control.internalParameter}`;
  const curve = fitCalibrationCurve(measured, { id: curveId, name: `Measured ${control.internalParameter}` });
  profile.calibration = [...(profile.calibration ?? []).filter((c) => c.id !== curveId), curve];
  control.calibrationCurveId = curveId;
  saveAutosave();
  render();
  setCalibStatus(`校正完了: ${control.label} (レンジ ${span.toFixed(1)}dB / ${measured.length}点)`);
}

function downloadJson(data, filename) {
  downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }), filename);
  els.statusText.textContent = `${filename}を書き出しました。`;
}

function downloadText(text, filename) {
  downloadBlob(new Blob([text], { type: "text/plain;charset=utf-8" }), filename);
  els.statusText.textContent = `${filename}を書き出しました。`;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function parseWizardArticulations(text) {
  const rows = parseRows(text);
  if (rows.length === 0) throw new Error("Articulationsが空です。");
  return rows.map((cols, index) => {
    const [id, name, type = "long", triggerValue = "default", lookAhead = "100", globalOffset = "0", overlapPercent = "0", overlapMax = "0"] = cols;
    if (!id || !name) throw new Error(`Articulations ${index + 1}行目のid/nameが不足しています。`);
    const triggerType = ["default", "manual", "unsupported"].includes(triggerValue) ? triggerValue : "keyswitch";
    const trigger = triggerType === "keyswitch"
      ? { type: "keyswitch", noteName: triggerValue, lookAheadMs: Number(lookAhead) }
      : { type: triggerType, reason: triggerType === "manual" ? "Confirm available articulation control in the source instrument." : undefined };
    return {
      id: safeProfileId(id),
      name,
      type,
      trigger,
      performance: {
        globalOffsetMs: Number(globalOffset),
        overlapPercent: Number(overlapPercent),
        overlapMaxMs: Number(overlapMax)
      }
    };
  });
}

function parseWizardControls(text) {
  const rows = parseRows(text);
  if (rows.length === 0) throw new Error("Controlsが空です。");
  return rows.map((cols, index) => {
    const [internalParameter, label, targetType = "manual", value = "", enabled = "on", calibration = ""] = cols;
    if (!internalParameter || !label) throw new Error(`Controls ${index + 1}行目のinternalParameter/labelが不足しています。`);
    const target = { type: targetType };
    if (targetType === "midiCC") target.cc = Number(value);
    if (targetType === "midiLearnRequired") target.suggestedCC = value === "" ? undefined : Number(value);
    if (targetType === "manual" || targetType === "unsupported") target.reason = "Confirm this target manually.";
    const control = {
      internalParameter,
      label,
      target,
      enabled: enabled.toLowerCase() !== "off"
    };
    if (targetType === "midiCC") control.calibrationCurveId = calibration.trim() || "dynamic_default";
    return control;
  });
}

function parseRows(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => line.split(/\t|,/).map((value) => value.trim()));
}

function normalizeProfile(profile) {
  if (!profile || typeof profile !== "object") throw new Error("Profile JSONが不正です。");
  const id = safeProfileId(profile.id || `${profile.engine}_${profile.library}_${profile.patch}`);
  const normalized = {
    schemaVersion: profile.schemaVersion ?? "0.1.0",
    id,
    engine: profile.engine ?? "Manual",
    library: profile.library ?? "Custom Library",
    patch: profile.patch ?? "Custom Patch",
    noteNaming: profile.noteNaming ?? "C3=60",
    playableRange: {
      low: clamp(Number(profile.playableRange?.low ?? 0), 0, 127),
      high: clamp(Number(profile.playableRange?.high ?? 127), 0, 127)
    },
    keyswitchRange: {
      low: clamp(Number(profile.keyswitchRange?.low ?? 0), 0, 127),
      high: clamp(Number(profile.keyswitchRange?.high ?? 36), 0, 127)
    },
    articulations: Array.isArray(profile.articulations) ? profile.articulations : [],
    controls: Array.isArray(profile.controls) ? profile.controls : [],
    timing: profile.timing ?? {},
    calibration: Array.isArray(profile.calibration) ? profile.calibration : [],
    setupInstructions: Array.isArray(profile.setupInstructions) ? profile.setupInstructions : [],
    validationRules: Array.isArray(profile.validationRules) ? profile.validationRules : [],
    testEvents: Array.isArray(profile.testEvents) ? profile.testEvents : []
  };
  if (normalized.playableRange.low > normalized.playableRange.high) throw new Error("Playable Rangeのlow/highが逆です。");
  if (normalized.keyswitchRange.low > normalized.keyswitchRange.high) throw new Error("Keyswitch Rangeのlow/highが逆です。");
  if (normalized.articulations.length === 0) throw new Error("Profileには少なくとも1つのArticulationが必要です。");
  return normalized;
}

function normalizeProject(input) {
  if (!input || typeof input !== "object") throw new Error("Project JSONが不正です。");
  const base = createInitialProject();
  return {
    ...base,
    ...input,
    ppq: Number(input.ppq ?? base.ppq),
    tempoMap: Array.isArray(input.tempoMap) && input.tempoMap.length ? input.tempoMap : base.tempoMap,
    notes: Array.isArray(input.notes) ? input.notes : [],
    rests: Array.isArray(input.rests) ? input.rests : [],
    slurs: Array.isArray(input.slurs) ? input.slurs : [],
    crescendos: Array.isArray(input.crescendos) ? input.crescendos : [],
    expressionCurves: input.expressionCurves ?? base.expressionCurves,
    interpretation: { ...base.interpretation, ...(input.interpretation ?? {}) },
    selectedIds: [],
    selectedBars: [],
    cursorTick: Number(input.cursorTick ?? 0),
    mode: "select"
  };
}

function safeProfileId(value) {
  return String(value || "custom_profile")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "custom_profile";
}

function option(value, label) {
  const opt = document.createElement("option");
  opt.value = value;
  opt.textContent = label;
  return opt;
}

function setInputMixed(input, value) {
  if (value === "Mixed") {
    input.value = "";
    input.placeholder = "Mixed";
  } else {
    input.placeholder = "";
    input.value = value;
  }
}

function pitchToStaffY(pitch) {
  // Bottom staff line sits at offset 48 (5 lines, 12px apart); each diatonic
  // step is half a space. staffPosition handles the clef's reference pitch
  // and the key signature's spelling (B♭ on B's line, A♯ on A's).
  return 48 - staffPosition(pitch, project.clef ?? "treble", project.keySignature ?? 0) * 6;
}

function pianoRollMetrics() {
  const width = els.pianoRollSvg.clientWidth || 900;
  const height = 260;
  const left = 54;
  const right = width - 24;
  const top = 24;
  const bottom = height - 28;
  const ticksPerBar = project.ppq * 4;
  const totalTicks = Math.max(ticksPerBar * 2, Math.ceil((maxScoreTick(project) + 1) / ticksPerBar) * ticksPerBar);
  return {
    width,
    height,
    left,
    right,
    top,
    bottom,
    ticksPerBar,
    totalTicks,
    xScale: (right - left) / totalTicks
  };
}

function maxScoreTick(targetProject) {
  return Math.max(0, ...targetProject.notes.map((note) => note.scoreTick + note.durationTicks), ...targetProject.rests.map((rest) => rest.scoreTick + rest.durationTicks));
}

function svgNode(name, attrs) {
  const node = document.createElementNS(svgNs, name);
  Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
  return node;
}

function lineEl(x1, y1, x2, y2, className) {
  return svgNode("line", { x1, y1, x2, y2, class: className });
}

function textEl(x, y, text, className) {
  const node = svgNode("text", { x, y, class: className });
  node.textContent = text;
  return node;
}

function pathEl(d, className) {
  return svgNode("path", { d, class: className });
}

function polylineEl(points, className) {
  return svgNode("polyline", { points, class: className });
}

function clear(node) {
  node.replaceChildren();
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
