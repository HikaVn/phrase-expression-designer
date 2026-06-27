// Single runtime source of truth for instrument profiles.
//
// Seeded from the built-ins and extended at runtime with imported / wizard-
// authored profiles, so there is one list every resolver consults instead of a
// core constant (BUILT_IN_PROFILES) and a separate app-side array that can
// drift apart. Pure and DOM-free: the UI layer reads `all()` to render and
// calls `get()` to resolve `project.profileId`.
export function createProfileStore(builtIns = []) {
  const profiles = structuredClone(builtIns);
  const builtInIds = new Set(builtIns.map((profile) => profile.id));
  return {
    // The live list (built-ins first, then customs in insertion order).
    all() {
      return profiles;
    },
    // Resolve a profile id, or undefined when absent.
    get(id) {
      return profiles.find((profile) => profile.id === id);
    },
    // Profiles that are not part of the seeded built-in set.
    customs() {
      return profiles.filter((profile) => !builtInIds.has(profile.id));
    },
    isBuiltIn(id) {
      return builtInIds.has(id);
    },
    // Insert or replace by id; returns the stored profile.
    upsert(profile) {
      const index = profiles.findIndex((item) => item.id === profile.id);
      if (index >= 0) profiles[index] = profile;
      else profiles.push(profile);
      return profile;
    }
  };
}
