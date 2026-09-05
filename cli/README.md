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

Without `--endpoint`, the upload runs against a local mock
(`.skill-ab-mock-uploads/<run_id>.json`) — Phase 3 (the real backend
endpoint) doesn't exist yet.

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

40 tests (vitest) cover: randomization, category/size-bucket detection,
readability/complexity heuristics, security-delta rules, the link
capability test, `RunResult` assembly **validated against the real schema
package**, mock upload (including rejecting invalid payloads before any
write/send), and local config persistence. Real `claude` calls go through
an injectable `ProcessRunner` interface and are replaced by fakes in tests
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
