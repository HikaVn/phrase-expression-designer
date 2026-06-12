import {
  BUILT_IN_PROFILES,
  PHRASE_TEMPLATES,
  addCrescendo,
  addRest,
  addSlur,
  applyBatchProperties,
  applyDynamic,
  applyNoteLetter,
  applyPhraseTemplate,
  dynamicCommandFromText,
  removeDynamic,
  applySelectedNoteDuration,
  cloneProject,
  computePerformanceNotes,
  copySelection,
  createInitialProject,
  createSetupReport,
  createTestProject,
  deleteCurvePoint,
  deleteSelection as deleteSelectedItems,
  exportMidi,
  formatPosition,
  generateCcEvents,
  generateMidiEventList,
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
const AUTOSAVE_KEY = "phraseExpressionDesigner.autosave.v1";

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
  bindEvents();
  render();
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
    "restButton",
    "tieButton",
    "slurButton",
    "crescendoButton",
    "decrescendoButton",
    "bpmInput",
    "ppqInput",
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
    "dynamicInput"
  ].forEach((id) => {
    els[id] = document.getElementById(id);
  });
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
  els.profileSelect.addEventListener("change", () => mutate("Change profile", () => {
    project.profileId = els.profileSelect.value;
    normalizeArticulationsForProfile();
  }));
  els.wizardButton.addEventListener("click", openWizard);
  els.wizardBaseSelect.addEventListener("change", () => fillWizardFromProfile(profileById(els.wizardBaseSelect.value)));
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
  els.wizardArticulationsText.value = profile.articulations.map((art) => {
    const trigger = art.trigger?.type === "keyswitch" ? art.trigger.noteName : art.trigger?.type ?? "default";
    const lookAhead = art.trigger?.lookAheadMs ?? 100;
    const perf = art.performance ?? {};
    return [art.id, art.name, art.type, trigger, lookAhead, perf.globalOffsetMs ?? 0, perf.overlapPercent ?? 0, perf.overlapMaxMs ?? 0].join("\t");
  }).join("\n");
  els.wizardControlsText.value = profile.controls.map((control) => {
    const target = control.target ?? { type: "manual" };
    const value = target.type === "midiCC" ? target.cc : target.suggestedCC ?? "";
    return [control.internalParameter, control.label, target.type, value, control.enabled === false ? "off" : "on"].join("\t");
  }).join("\n");
  els.wizardInstructionsText.value = (profile.setupInstructions ?? []).join("\n");
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

function renderNotation(profile) {
  const svg = els.notationSvg;
  clear(svg);
  const width = svg.clientWidth || 900;
  const height = 260;
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  const top = 78;
  const staffGap = 12;
  const left = 54;
  const right = width - 24;
  const ticksPerBar = project.ppq * 4;
  const totalTicks = Math.max(ticksPerBar * 2, Math.ceil((maxScoreTick(project) + 1) / ticksPerBar) * ticksPerBar);
  const xScale = (right - left) / totalTicks;
  const barCount = Math.ceil(totalTicks / ticksPerBar);

  for (let barIndex = 0; barIndex < barCount; barIndex += 1) {
    const x = left + barIndex * ticksPerBar * xScale;
    svg.append(svgNode("rect", {
      x,
      y: top - 22,
      width: Math.min(ticksPerBar * xScale, right - x),
      height: 4 * staffGap + 62,
      class: "measure-hit-area",
      "data-bar-index": barIndex
    }));
  }

  (project.selectedBars ?? []).forEach((barIndex) => {
    const x = left + barIndex * ticksPerBar * xScale;
    if (x >= left && x < right) {
      svg.append(svgNode("rect", {
        x,
        y: top - 14,
        width: Math.min(ticksPerBar * xScale, right - x),
        height: 4 * staffGap + 28,
        class: "measure-selection"
      }));
    }
  });

  for (let line = 0; line < 5; line += 1) {
    svg.append(lineEl(left, top + line * staffGap, right, top + line * staffGap, "staff-line"));
  }
  for (let tick = 0; tick <= totalTicks; tick += ticksPerBar) {
    const x = left + tick * xScale;
    svg.append(lineEl(x, top - 10, x, top + 4 * staffGap + 10, "bar-line"));
    svg.append(textEl(x + 5, top - 18, String(Math.floor(tick / ticksPerBar) + 1), "bar-number"));
  }

  project.rests.forEach((rest) => {
    const x = left + rest.scoreTick * xScale;
    svg.append(textEl(x, top + 24, "休", "rest-symbol"));
  });

  project.slurs.forEach((slur) => {
    const start = project.notes.find((note) => note.id === slur.startNoteId);
    const end = project.notes.find((note) => note.id === slur.endNoteId);
    if (!start || !end) return;
    const x1 = left + start.scoreTick * xScale;
    const x2 = left + (end.scoreTick + end.durationTicks * 0.6) * xScale;
    const y = top + pitchToStaffY(Math.max(start.pitch, end.pitch)) - 20;
    svg.append(pathEl(`M ${x1} ${y} Q ${(x1 + x2) / 2} ${y - 26} ${x2} ${y}`, "slur"));
  });

  project.crescendos.forEach((hairpin) => {
    const start = project.notes.find((note) => note.id === hairpin.startNoteId);
    const end = project.notes.find((note) => note.id === hairpin.endNoteId);
    if (!start || !end) return;
    const x1 = left + start.scoreTick * xScale;
    const x2 = left + (end.scoreTick + end.durationTicks) * xScale;
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
    const x = left + dyn.tick * xScale;
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

  project.notes.forEach((note) => {
    const selected = project.selectedIds.includes(note.id);
    const x = left + note.scoreTick * xScale;
    const y = top + pitchToStaffY(note.pitch);
    const group = svgNode("g", { class: `note-group ${selected ? "selected" : ""}`, tabindex: "0" });
    group.append(svgNode("ellipse", { cx: x, cy: y, rx: NOTE_HEAD_RX, ry: NOTE_HEAD_RY, class: "note-head", transform: `rotate(${NOTE_HEAD_ANGLE} ${x} ${y})` }));
    group.append(lineEl(x + NOTE_HEAD_RX - 1, y - 1, x + NOTE_HEAD_RX - 1, y - 39, "note-stem"));
    group.append(textEl(x - 12, y + 22, pitchName(note.pitch, profile.noteNaming), "note-label"));
    group.append(textEl(x - 13, y + 36, getArticulation(profile, note.articulation)?.name ?? note.articulation, "articulation-label"));
    if (note.tiedToNext) group.append(pathEl(`M ${x - 4} ${y + 12} Q ${x + 22} ${y + 26} ${x + 48} ${y + 12}`, "tie"));
    group.addEventListener("click", (event) => {
      event.stopPropagation();
      mutate("Select note", () => selectNote(note.id, event));
    });
    svg.append(group);
  });

  const cursorX = left + project.cursorTick * xScale;
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
  const rect = els.notationSvg.getBoundingClientRect();
  const width = els.notationSvg.clientWidth || 900;
  const left = 54;
  const right = width - 24;
  const ticksPerBar = project.ppq * 4;
  const totalTicks = Math.max(ticksPerBar * 2, Math.ceil((maxScoreTick(project) + 1) / ticksPerBar) * ticksPerBar);
  const relativeX = event.clientX - rect.left - left;
  if (relativeX < 0 || event.clientX > rect.left + right) return null;
  const rawTick = (relativeX / (right - left)) * totalTicks;
  return Math.max(0, Math.min(Math.floor(rawTick / ticksPerBar), Math.ceil(totalTicks / ticksPerBar) - 1));
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
    const [internalParameter, label, targetType = "manual", value = "", enabled = "on"] = cols;
    if (!internalParameter || !label) throw new Error(`Controls ${index + 1}行目のinternalParameter/labelが不足しています。`);
    const target = { type: targetType };
    if (targetType === "midiCC") target.cc = Number(value);
    if (targetType === "midiLearnRequired") target.suggestedCC = value === "" ? undefined : Number(value);
    if (targetType === "manual" || targetType === "unsupported") target.reason = "Confirm this target manually.";
    return {
      internalParameter,
      label,
      target,
      enabled: enabled.toLowerCase() !== "off"
    };
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
  const pitchClassToDiatonicStep = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6];
  const pitchClass = ((pitch % 12) + 12) % 12;
  const octave = Math.floor(pitch / 12) - 2;
  const diatonicIndex = octave * 7 + pitchClassToDiatonicStep[pitchClass];
  const referenceG3Index = 3 * 7 + 4;
  return 24 - (diatonicIndex - referenceG3Index) * 6;
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
