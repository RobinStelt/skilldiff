# skill-ab — CLI core (Phase 2)

Implements `03-marktplatz-phase2-cli-kern.md`. Full context:
`../skill-ab-marktplatz-plan.md`, sections 3 (isolation) and 5 (evaluation) —
written in German, the project's planning language. Source code (this
package and `../schema`) is English-only; see the repo-root `CLAUDE.md` for
that convention.

## Usage

```bash
npm install
npm run dev -- run \
  --skill <skill-id> \
  --dir <working-directory> \
  --skill-source <skill-source, MUST live outside --dir> \
  --task "<task description>" \
  --check "npm test"
```

The consent screen appears once, on the very first run (briefing point 8).
Every subsequent call runs without asking — the decision is stored under
`~/.skill-ab/config.json` (pseudonymous `account_id`, local signing secret,
consent status).

### Lowering per-run effort — watched skills and auto-detected checks

Added after Phase 6 real usage surfaced that typing `--skill`,
`--skill-source`, and `--check` on every invocation is real friction for
someone contributing data during their normal work, especially with more
than one skill in regular use (never test several at once — that measures
a bundle's effect, not one skill's marginal effect, plan section 4/5):

```bash
# once, per skill you want data for:
npm run dev -- watch add --skill ponytail --source /path/to/ponytail-skill
npm run dev -- watch list
npm run dev -- watch remove --skill ponytail

# from then on, --skill/--skill-source can be omitted — `run` picks ONE
# watched skill at random per invocation:
npm run dev -- run --dir <working-directory> --task "<task description>"
```

`--check` can also be omitted — `detectCheckCommand` (`src/category/`)
looks for a real `npm test` script, a pytest project (`pyproject.toml`,
`pytest.ini`, `setup.cfg`, or a `tests/test_*.py` convention), `go.mod`, or
`Cargo.toml`, in that order, and falls back to no check (`success: null`)
rather than guessing wrong. An explicit `--check` always overrides
detection.

The required second ("without skill") run can't be shrunk without giving
up the causal claim ("real usage, not vibes") the project is built on —
see "Shadow mode" below for what's actually done about that: not removing
the cost, moving it off the interactive critical path.

Without `--endpoint`, the upload runs against a local mock
(`.skill-ab-mock-uploads/<run_id>.json`).

### Shadow mode — comparisons that happen automatically, off to the side

"Install once, then it runs entirely in the background" needs three things
in place, in this order — skipping the first two just makes shadow mode
silently do nothing, by design (see below):

1. **See the consent screen once.** Run `skill-ab run` interactively,
   for any real task, at least once — the one-time consent screen only
   exists there (a background hook process has no terminal to show a
   prompt on). Shadow mode checks `standardConsentGiven` before ever
   arming and simply refuses otherwise; it does not and cannot ask.
2. **Register at least one skill:** `skill-ab watch add --skill <id> --source <path>`.
3. **Persist where uploads go**, so a hook process spawned by Claude Code
   days from now still knows: `skill-ab config set endpoint <url>`
   (`skill-ab config show` to check, `config unset endpoint` to clear —
   also works for `claude-bin`, normally unnecessary since that's
   auto-detected). Without this, shadow mode had no durable way to know
   where to upload — an env var only lives as long as whatever set it in
   the current shell.

Then, opt-in per project (never global, never silently enabled):

```bash
skill-ab shadow install --dir /path/to/your/project
```

This registers two Claude Code hooks
(`<project>/.claude/settings.json` — see `src/shadow/install.ts`, safe to
run again, and it never touches your project's other settings/hooks):

- **`UserPromptSubmit`**: if you have at least one watched skill
  (`skill-ab watch add`), picks ONE at random, snapshots the project
  directory as it is right now, and records whether that skill is
  currently linked into the project (i.e., whether your upcoming real
  turn will actually run with or without it — never assumed).
- **`Stop`**: reads the real turn's token usage from the session
  transcript and computes its wall-clock duration, then spawns a
  **detached background process** that replays the exact same task from
  the snapshot in the OPPOSITE condition — a real, isolated `claude` call,
  same isolation guarantees as `run` (Tier A/B/C, fresh `$HOME` with only
  the credentials file copied in, see `src/isolation/gating.ts`) — and
  uploads the completed comparison. None of this blocks you; your real
  work already finished before the hook even fires.

Net effect: **2** real `claude` calls per compared task (your real
interactive one + 1 silent background one), same as manually running
`skill-ab run`, but nothing to remember or wait for.

**Known, disclosed limitations, not silently glossed over:**
- If the watched skill isn't linked at the *project* level (e.g. it's a
  personal/global skill), presence can't be determined from `cwd` alone —
  that turn is skipped rather than guessed.
- If the transcript's usage can't be parsed (undocumented, version-
  dependent format — `src/shadow/transcriptUsage.ts`), the turn is
  discarded rather than uploaded with a fabricated `0`.
- `order_randomized` is always `false` for shadow-mode results — the real
  turn always comes first, unlike `run`'s actual randomization.
- The background worker is spawned as `skill-ab shadow worker-run ...`,
  which needs `skill-ab` on `PATH` (a global install/link) — on Windows
  this can hit the same npm-`.cmd`-shim spawn limitation already noted for
  `claude`/`npm` elsewhere in this document; not shadow-mode-specific, not
  solved here.
- Not part of the automated test suite beyond `resolveConditionOutcomes`
  and the hook decision logic (`test/shadow/`) — the actual background
  `claude` call is the same "verified manually, not automated" situation
  as `run` itself (see "Tests" below).

```bash
skill-ab shadow uninstall --dir /path/to/your/project   # removes exactly what install added
```

## Architecture

```
src/
  isolation/     Tier detection (A/B/C) + gating (symlink/junction, docker args)
  orchestration/ Randomized order, fresh working copies, process execution
  category/      Automatic category and size-bucket detection
  security/      Semgrep/npm audit/bandit -> SeverityCounts delta
  metrics/       Category-specific extra metrics (coverage, lint, complexity, readability)
  consent/       One-time consent screen
  config/        Local, persistent config (~/.skill-ab/config.json)
  upload/        Signature + validation (schema package) + submit/mock
  shadow/        Shadow mode: hook decision logic, state store, transcript-usage parsing, background worker
  buildRunResult.ts  Assembles the final, typed RunResult
```

## Isolation tiers — implementation status

| Tier | Implementation |
|---|---|
| **A** (Docker/Podman) | `docker info`/`podman info` is actually executed, not guessed. The `docker run` call itself (`isolation/dockerRun.ts`) mounts only the working directory and — only for `with_skill` — the one allowed skill folder. **Prerequisite this phase does NOT deliver:** a Docker image with the `claude` CLI preinstalled (default name `skill-ab/claude-runner:latest`, overridable via `--docker-image`). Without that image, the container call fails — reproduced and documented in a local smoke test with real, running Docker, no guesswork. |
| **B** (symlink/junction + isolated home) | Fully implemented, including a real capability test instead of a platform assumption. Directly informed by `../../skill-matching-hook/skill-gate-test/LOKAL-PROTOKOLL.md`: `fs.symlinkSync` is actually attempted and verified via `readlinkSync` (not just try/catch, because `ln -s` on Windows without Developer Mode silently creates an empty file instead of a symlink); NTFS junction is the automatic fallback. Every condition also gets a fresh, empty `$HOME`/`%USERPROFILE%` — necessary because `--setting-sources project` alone is demonstrably NOT enough to keep globally enabled plugin skills out (also confirmed in the local protocol). |
| **C** (best effort) | Runs with no isolation guarantee at all, in the (copied) original working directory — deliberately the lowest trust tier, no extra code needed. |

Every condition also runs in a **fresh working copy** (not the original), so
the two conditions are guaranteed to never share file state — regardless of
the isolation tier.

## What this phase deliberately does NOT deliver

- No finished Docker image for Tier A (only the invocation mechanism).
- No real backend endpoint (Phase 3) — only a local, validated mock.
- Category detection and every `category_metrics` (complexity, readability)
  are **heuristic, not exact** — see the comments in
  `src/category/detectCategory.ts`, `src/metrics/complexity.ts`, and
  `src/metrics/readability.ts` for their respective limits. No manual
  rating ever replaces this (briefing point 3) — inaccuracy is caught in
  aggregate via the category-heterogeneity check (plan section 7), not
  corrected here.

## Tests

```bash
npm run typecheck
npm test
```

87 tests (vitest) cover: randomization, category/size-bucket/check-command
detection, readability/complexity heuristics, security-delta rules, the
link capability test, `RunResult` assembly **validated against the real
schema package**, mock upload (including rejecting invalid payloads before
any write/send), watched-skill persistence, local config persistence
(including loading a config.json written before the `watchedSkills` field
existed), persisted `config set/unset` (endpoint/claude-bin) across
reloads, shadow-mode hook install/uninstall (`.claude/settings.json`
merging, never disturbing unrelated entries), the UserPromptSubmit/Stop
decision logic (including refusing to arm without consent — a real gap
found and closed: a background hook has no TTY to show the consent screen
on, so it must check the decision, never ask for it), and transcript-usage
parsing (including the "can't measure, don't fake zero" fallback). Real `claude` calls go through an
injectable `ProcessRunner` interface and are replaced by fakes in tests
— a real end-to-end run was verified once manually against the local
`claude` installation (see commit history), but isn't part of the
automated test suite (would incur real API cost on every test run).

## Open items for later iterations

- Build and maintain a Docker image for Tier A.
- Calibrate category detection on real data once the first runs come in.
- Replace cyclomatic complexity with a real AST-based calculation (e.g.
  `ts-morph` for TS/JS) once the effort is justified.
- Cloud test 5d (fresh home isolates personal-level skills) was so far only
  verified in the cloud sandbox — should be specifically re-tested locally
  (see the `skill-matching-hook` README, "Next steps").
