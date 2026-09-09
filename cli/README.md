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

# or: watch everything at once instead of one at a time — every skill
# that is BOTH installed locally (.claude/skills/<id>/) AND already in
# your marketplace catalog. Also drops watched skills you've uninstalled,
# and warns (without silently mixing data) when a watched skill's content
# changed since the last sync — see "Skill versioning" below.
npm run dev -- watch sync --endpoint <url>

# from then on, --skill/--skill-source can be omitted — `run` picks ONE
# watched skill at random per invocation:
npm run dev -- run --dir <working-directory> --task "<task description>"
```

#### Skill versioning

`skill_id` alone never changes when a skill's author updates its content —
so without something extra, two measurements under the same `skill_id`
would silently be treated as the same skill even after it changed,
corrupting aggregation. Every `RunResult` therefore also carries
`skill_content_hash` (`src/skill/contentHash.ts`): a sha256 over the skill
source directory's file paths and contents, computed fresh at every real
`run`/shadow measurement — not a version number a skill author has to
remember to bump. The backend tracks how many distinct hashes contributed
to a skill+category slice (`distinctContentHashCount`) as a transparency
signal; it does not (yet) split aggregation by hash, see migration `004`'s
comment for why. `watch sync` uses the same hash to detect and warn about
drift in an already-watched skill, instead of measuring a changed skill
under its old identity without telling you.

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
2. **Register at least one skill:** `skill-ab watch add --skill <id> --source <path>`, or `skill-ab watch sync` to watch everything at once (see "Watching skills" above).
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
| **A** (Docker/Podman) | `docker info`/`podman info` is actually executed, not guessed. The `docker run` call itself (`isolation/dockerRun.ts`) mounts only the working directory and — only for `with_skill` — the one allowed skill folder. **Prerequisite this phase does NOT deliver:** a Docker image with the `claude` CLI preinstalled (default name `skill-ab/claude-runner:latest`, overridable via `--docker-image`). Without that image, the container call fails — reproduced and documented in a local smoke test with real, running Docker, no guesswork. Tier A is always preferred once Docker/Podman is running, even if you don't have that image or you authenticate via subscription login rather than an API key (Tier A only forwards `ANTHROPIC_API_KEY`, if set) — pass `--no-docker` to force Tier B/C instead. |
| **B** (symlink/junction + isolated home) | Fully implemented, including a real capability test instead of a platform assumption. Directly informed by `../../skill-matching-hook/skill-gate-test/LOKAL-PROTOKOLL.md`: `fs.symlinkSync` is actually attempted and verified via `readlinkSync` (not just try/catch, because `ln -s` on Windows without Developer Mode silently creates an empty file instead of a symlink); NTFS junction is the automatic fallback. Every condition also gets a fresh, empty `$HOME`/`%USERPROFILE%` — necessary because `--setting-sources project` alone is demonstrably NOT enough to keep globally enabled plugin skills out (also confirmed in the local protocol). |
| **C** (best effort) | Runs with no isolation guarantee at all, in the (copied) original working directory — deliberately the lowest trust tier, no extra code needed. |

Every condition also runs in a **fresh working copy** (not the original), so
the two conditions are guaranteed to never share file state — regardless of
the isolation tier.

Both `claude` invocations run with `--permission-mode acceptEdits`. Real bug
this fixed: a headless `claude -p` has no TTY to prompt for permission, so
without this, every Edit/Write tool call is silently denied — the run
"completes" and reports a result, but neither condition can actually touch a
file, which defeats the entire comparison equally in both directions rather
than failing loudly. Safe specifically because the argument is always this
run's disposable working copy (or a container mount), never your real
project — that's the whole reason the copy exists.

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

97 tests (vitest) cover: randomization, category/size-bucket/check-command
detection, readability/complexity heuristics, security-delta rules, the
link capability test, skill content hashing (determinism, order-independence,
change-detection — `skill/contentHash.ts`), `watch sync`'s reconciliation
logic (`config/watchSyncDecision.ts`), `RunResult` assembly **validated
against the real schema package**, mock upload (including rejecting invalid
payloads before any write/send), watched-skill persistence, local config
persistence (including loading a config.json written before the
`watchedSkills` field existed), persisted `config set/unset`
(endpoint/claude-bin) across reloads, shadow-mode hook install/uninstall
(`.claude/settings.json` merging, never disturbing unrelated entries), the
UserPromptSubmit/Stop decision logic (including refusing to arm without
consent — a real gap found and closed: a background hook has no TTY to show
the consent screen on, so it must check the decision, never ask for it), and
transcript-usage
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

## Codex / OpenAI models

Codex is a second execution agent. This integration runs the Codex CLI with
models available to that CLI/account; it does not automate the ChatGPT web UI
or claim that every ChatGPT model is available in Codex. Install Codex and sign
in before running a comparison. Existing CLI login credentials are used in a
fresh isolated Codex home; file-based `auth.json` and `CODEX_API_KEY` are
supported. Keychain-only or managed authentication needs verification on the
target machine. Credentials are never uploaded to SkillDiff.

```bash
skill-ab run --agent codex --model <model-id> --reasoning-effort medium \
  --skill <skill-id> --skill-source <external-skill-directory> \
  --dir <task-project> --task "Fix the failing tests" --check "npm test"
```

Both runs use the exact same model and reasoning setting. The Codex default
reasoning effort falls back to `medium` when no setting can be inherited. The
model is inherited from the calling session or effective Codex configuration
unless explicitly overridden. Unknown or inaccessible models fail through Codex.
Use a concrete model ID when available; moving aliases can change over time.

```bash
skill-ab config set agent codex
skill-ab config set codex-model <model-id>
skill-ab config set codex-reasoning-effort medium
skill-ab config set codex-bin <path-to-native-executable>
skill-ab watch add --agent codex --skill <id> --source <external-path>
skill-ab watch sync --agent codex --dir <project> --endpoint <backend-url>
skill-ab watch list --agent codex
```

`--codex-bin` is optional when the executable is on PATH. On Windows it must
point to native `codex.exe`, not an npm `.cmd` shim. Claude remains the default
for existing installations. Its model can be set with `--model` or
`skill-ab config set claude-model <model-id>`. Watch lists are separate by
agent. Sync reads `.agents/skills` for Codex and snapshots selected sources
outside the task project; old source snapshots remain under
`~/.skill-ab/skill-snapshots` for reproducibility.

Codex uses separate temporary workspaces and homes, project skills under
`.agents/skills`, `workspace-write` permissions, and disabled hooks for paired
runs. Skills are available only in the treatment copy. Skill availability does
not guarantee that the agent chooses to use it; Claude-specific tools in a
skill may need adaptation. Personal configuration, desktop task identity and
app tool pipes are excluded. Personal `.agents/skills` entries are explicitly
disabled for the run, including Windows installations that resolve the OS home
independently of HOME. The treatment skill is copied into the working directory
so excluding its original personal path does not disable the test copy. Windows
runs explicitly select Codex's unelevated native workspace sandbox. Cached and reasoning token counts are subsets and
are not added a second time. Missing usage, malformed events, failed turns or
nonzero process exits abort the comparison without uploading it.

Codex defaults to local Tier B/C, even if Docker happens to be running. To use
Tier A, supply `--docker-image` with a prepared image containing `codex`, and
set `CODEX_API_KEY`. Only the workspace and treatment skill are mounted; the
host home is not mounted. Tier C uses a copied skill when links are unavailable
and remains labeled as weaker isolation. Real model runs consume account usage.

### Codex shadow mode

```bash
skill-ab shadow install --agent codex --dir <project>
skill-ab shadow uninstall --agent codex --dir <project>
```

Installation merges hooks into `.codex/hooks.json`, preserving unrelated hooks.
The Codex project and hook definitions must be trusted using Codex's normal
review flow; SkillDiff does not bypass hook trust. A Codex watch entry and prior
standard upload consent are required. Internal comparison runs never arm hooks.

The hooks use the active model from Codex and conservatively read cumulative
usage plus the active turn's reasoning effort from the rollout transcript. The
transcript is not a stable API. Missing baseline (including a first turn without
prior usage), unknown format, missing turn ID, changed model or unavailable
reasoning metadata means the turn is skipped, without a fabricated zero or a
background charge. Foreground work is snapshotted at Stop. Each turn has its
own state file. The counterfactual uses the observed model and effort.

A live foreground session can include prior conversation, other skills and
tools; this context is not reproduced by the fresh background session. Codex
shadow comparisons are therefore reported as Tier C and non-randomized. Use
`run` for controlled pairs. The adapter has fixture tests; transcript support
must be rechecked after Codex format changes.

### Verification

Normal tests never call a model. The opt-in test below performs two real calls,
checks that a test skill is discovered only in the treatment workspace, and
never uploads synthetic data:

```powershell
$env:SKILL_AB_LIVE_CODEX_MODEL = "<available-model-id>"
npx vitest run test/liveCodex.test.ts
```

Official interfaces: [non-interactive mode](https://learn.chatgpt.com/docs/non-interactive-mode),
[skills](https://learn.chatgpt.com/docs/build-skills), and
[hooks](https://learn.chatgpt.com/docs/hooks).

The Windows live smoke test was verified on 2026-09-08 with `gpt-6-astra`
(`low` reasoning). The test skill produced its marker only in the treatment
condition. Regular tests remain model-free. Codex native Windows sandbox
selection is necessary; omitting it may produce a read-only session despite
`--sandbox workspace-write` on some installations.


### Automatic Codex model metadata

When `--model` and `codex-model` are omitted, `skill-ab run --agent codex` first
reads the latest model/effort of the calling Codex session identified by
`CODEX_THREAD_ID` (or `CODEX_SESSION_ID`). Otherwise it asks `codex app-server`
for the effective project configuration using `config/read`, without a paid
model request. If neither provides a model, the command stops with an actionable
error. Explicit CLI/config overrides take precedence.

Both conditions pin the resolved model and effort. The runner checks every
`turn_context` in each isolated Codex rollout against that configuration and
rejects missing metadata or a model/effort mismatch before upload. Rollouts are
kept only in temporary isolated homes and deleted after measurement. Their
format is not a stable API; unsupported formats fail closed. Container runs mount
that same temporary Codex home so model verification works after container exit.

The console report always includes agent, model and reasoning effort. Shadow
mode takes model metadata from the active turn, pins it for the counterfactual,
and verifies the counterfactual's rollout too. It never substitutes a model based
on the answer text. Existing historical records with unknown models remain
labelled `unknown`.

The opt-in integration test can save a local report without uploading synthetic
data: set `SKILL_AB_LIVE_CODEX_MODEL` and optionally `SKILL_AB_LIVE_REPORT`, then
run `npm test -- test/liveCodex.test.ts`. This checks skill visibility and model
metadata, not the productivity benefit of a real skill.
