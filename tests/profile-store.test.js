import assert from "node:assert/strict";
import test from "node:test";
import { createProfileStore } from "../src/profile-store.js";
import { BUILT_IN_PROFILES, createInitialProject, getProfile } from "../src/core.js";

const customProfile = (id) => ({
  id,
  engine: "Manual",
  library: "Custom",
  patch: "Custom",
  noteNaming: "C3=60",
  playableRange: { low: 0, high: 127 },
  keyswitchRange: { low: 0, high: 12 },
  articulations: [{ id: "sustain", name: "Sustain", type: "long", trigger: { type: "default" }, performance: {} }],
  controls: [],
  timing: {},
  calibration: []
});

test("createProfileStore seeds from the built-ins and isolates them by clone", () => {
  const store = createProfileStore(BUILT_IN_PROFILES);
  assert.equal(store.all().length, BUILT_IN_PROFILES.length);
  // Mutating a stored profile must not leak back into the shared constant.
  store.all()[0].patch = "MUTATED";
  assert.notEqual(BUILT_IN_PROFILES[0].patch, "MUTATED");
});

test("store get/customs/isBuiltIn distinguish built-in from custom profiles", () => {
  const store = createProfileStore(BUILT_IN_PROFILES);
  const builtInId = BUILT_IN_PROFILES[0].id;
  store.upsert(customProfile("my_custom"));
  assert.equal(store.get(builtInId).id, builtInId);
  assert.equal(store.get("my_custom").id, "my_custom");
  assert.equal(store.get("missing"), undefined);
  assert.deepEqual(store.customs().map((p) => p.id), ["my_custom"]);
  assert.equal(store.isBuiltIn(builtInId), true);
  assert.equal(store.isBuiltIn("my_custom"), false);
});

test("store upsert replaces an existing profile by id instead of duplicating", () => {
  const store = createProfileStore(BUILT_IN_PROFILES);
  store.upsert(customProfile("dup"));
  store.upsert({ ...customProfile("dup"), patch: "Updated" });
  assert.equal(store.customs().length, 1);
  assert.equal(store.get("dup").patch, "Updated");
});

test("getProfile resolves custom profiles only when given the runtime store", () => {
  const store = createProfileStore(BUILT_IN_PROFILES);
  store.upsert(customProfile("my_custom"));
  const project = createInitialProject();
  project.profileId = "my_custom";
  // Built-ins-only resolution can't see the custom profile -> falls back to first.
  assert.equal(getProfile(project).id, BUILT_IN_PROFILES[0].id);
  // Passing the store resolves it correctly (the two-source drift fix).
  assert.equal(getProfile(project, store.all()).id, "my_custom");
});
