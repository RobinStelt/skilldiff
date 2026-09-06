/**
 * Deterministic canonical JSON serialization — sorts object keys
 * recursively at EVERY nesting level, not just the top one.
 *
 * Exists here, shared between `cli/` (signs a RunResult before upload) and
 * `backend/` (verifies that signature), because an earlier version of this
 * canonicalization was duplicated in both places and the CLI's copy had a
 * real bug: `JSON.stringify(value, Object.keys(value).sort())` — passing
 * an array as the replacer filters property names against that SAME
 * array at every nesting level, not just the top one. Since the array
 * only ever listed top-level keys, every nested object (`with_skill`,
 * `category_metrics`, `security_delta`, ...) serialized as `{}`:
 *
 *   JSON.stringify({ a: 1, with_skill: { tokens: 5 } }, ["a", "with_skill"])
 *   // => '{"a":1,"with_skill":{}}'
 *
 * In practice the old signature only ever covered the flat/top-level
 * fields of a RunResult — nested measurement data could be tampered with
 * in transit without invalidating it. This implementation recurses, so
 * every level is actually included and order-independent.
 *
 * NOTE: this is a breaking change to the signing protocol — a signature
 * produced by the old canonicalization will NOT verify against this one.
 * Deliberately done now, before any real deployment (no production data
 * depends on the old format yet), rather than after.
 */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortKeysDeep(value));
}

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep);
  }
  if (value !== null && typeof value === "object") {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      sorted[key] = sortKeysDeep((value as Record<string, unknown>)[key]);
    }
    return sorted;
  }
  return value;
}
