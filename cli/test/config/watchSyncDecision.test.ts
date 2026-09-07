import { describe, expect, it } from "vitest";
import { decideWatchSync } from "../../src/config/watchSyncDecision.js";
import type { WatchedSkill } from "../../src/config/localConfig.js";

describe("decideWatchSync", () => {
  it("adds a skill that is installed locally and known to the catalog, but not yet watched", () => {
    const decision = decideWatchSync(
      [{ skillId: "foo", skillSourceDir: "/proj/.claude/skills/foo", hash: "h1" }],
      new Set(["foo"]),
      [],
    );
    expect(decision.toAdd).toEqual([{ skillId: "foo", skillSourceDir: "/proj/.claude/skills/foo", hash: "h1" }]);
    expect(decision.toUpdateHash).toEqual([]);
    expect(decision.toRemove).toEqual([]);
  });

  it("never auto-watches a locally installed skill the catalog doesn't know", () => {
    const decision = decideWatchSync(
      [{ skillId: "private-skill", skillSourceDir: "/proj/.claude/skills/private-skill", hash: "h1" }],
      new Set(["some-other-skill"]),
      [],
    );
    expect(decision.toAdd).toEqual([]);
  });

  it("flags a content-hash change for an already-watched skill instead of silently re-registering", () => {
    const watched: WatchedSkill[] = [{ skillId: "foo", skillSourceDir: "/proj/.claude/skills/foo", lastKnownHash: "h1" }];
    const decision = decideWatchSync(
      [{ skillId: "foo", skillSourceDir: "/proj/.claude/skills/foo", hash: "h2" }],
      new Set(["foo"]),
      watched,
    );
    expect(decision.toAdd).toEqual([]);
    expect(decision.toUpdateHash).toEqual([
      { skillId: "foo", skillSourceDir: "/proj/.claude/skills/foo", previousHash: "h1", newHash: "h2" },
    ]);
  });

  it("does not flag drift for a watched skill with no known baseline hash yet", () => {
    const watched: WatchedSkill[] = [{ skillId: "foo", skillSourceDir: "/proj/.claude/skills/foo", lastKnownHash: null }];
    const decision = decideWatchSync(
      [{ skillId: "foo", skillSourceDir: "/proj/.claude/skills/foo", hash: "h2" }],
      new Set(["foo"]),
      watched,
    );
    expect(decision.toUpdateHash).toEqual([]);
  });

  it("removes a watched skill that is no longer installed locally", () => {
    const watched: WatchedSkill[] = [{ skillId: "gone", skillSourceDir: "/proj/.claude/skills/gone", lastKnownHash: "h1" }];
    const decision = decideWatchSync([], new Set(["gone"]), watched);
    expect(decision.toRemove).toEqual(["gone"]);
  });

  it("does nothing when everything already matches", () => {
    const watched: WatchedSkill[] = [{ skillId: "foo", skillSourceDir: "/proj/.claude/skills/foo", lastKnownHash: "h1" }];
    const decision = decideWatchSync(
      [{ skillId: "foo", skillSourceDir: "/proj/.claude/skills/foo", hash: "h1" }],
      new Set(["foo"]),
      watched,
    );
    expect(decision).toEqual({ toAdd: [], toUpdateHash: [], toRemove: [] });
  });
});
