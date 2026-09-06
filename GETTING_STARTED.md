# Getting started — try the CLI yourself

Not published to npm yet (no `npm publish` credentials on this side, and no
public registry name reserved) — this walks through it straight from a
git clone. Every command below was actually run once, in order, on a clean
checkout, to make sure this really works end to end (see the note at the
bottom for the one platform-specific gotcha found while doing that).

## Prerequisites

- **Node.js 20+** and **git**.
- **[Claude Code](https://claude.com/claude-code)** installed and logged in
  — either a Pro/Max subscription login (`claude` with no
  `ANTHROPIC_API_KEY` set) or an API key. Either works; a subscription
  login is what most contributors will actually have.
- Nothing else. Docker is optional (only used for Tier A isolation, see
  `cli/README.md`) — the CLI auto-detects what's available and falls back
  gracefully (`cli/README.md`, "Isolation tiers").

## 1. Clone and build the two packages the CLI needs

```bash
git clone <this-repo-url> skill-ab-marktplatz
cd skill-ab-marktplatz

# @marktplatz/schema first — the CLI depends on its BUILT output, not its
# source (see the "Fix: real build output..." commit if you're curious why
# that distinction matters here).
cd schema && npm install && npm run build && cd ..

cd cli && npm install && npm run build && cd ..
```

## 2. Make `skill-ab` a real command on your machine

```bash
cd cli
npm link
```

Verify it worked:

```bash
skill-ab --version
```

If that prints `0.1.0`, you're set. If you get a "command not found" (or,
on Windows, an `ERR_MODULE_NOT_FOUND`/`ENOENT` error), see the
troubleshooting note at the bottom before anything else — both are known,
already-fixed classes of bugs, so make sure `git pull` actually got the
fix.

## 3. Try it once, locally, with no upload

No `--endpoint` means the result is written to a local file
(`.skill-ab-mock-uploads/`) instead of sent anywhere — good for a first
look before you decide to actually contribute data.

```bash
mkdir -p /tmp/skill-ab-demo/src
cat > /tmp/skill-ab-demo/src/formatDate.js <<'EOF'
function formatDate(date) {
  return date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate();
}
module.exports = { formatDate };
EOF

skill-ab watch add --skill some-skill-you-have --source /path/to/that/skills/SKILL.md/folder

skill-ab run \
  --dir /tmp/skill-ab-demo \
  --task "Add zero-padding to formatDate so single-digit months/days get a leading 0."
```

`--skill`/`--skill-source` above are optional once you've registered at
least one with `watch add` — `run` picks one at random for you
(`cli/README.md`, "Lowering per-run effort"). `--check` is also optional;
it's auto-detected from the project (a real `npm test`/`pytest`/`go test`/
`cargo test` setup) — this toy example has none, so `success` stays `null`,
which is expected and fine.

The very first `run` shows a one-time consent screen (nothing is uploaded
without saying yes there — cli/README.md, "Usage"). You'll see a real,
local delta either way.

## 4. Contribute to a real backend

```bash
skill-ab run --dir <your-real-project> --task "<a task you're about to do anyway>" \
  --endpoint http://<the-backend-url>/v1/run-results
```

Point `--endpoint` at whichever backend instance you're contributing to —
your own (`backend/README.md` for running one locally or via
`docker compose up` at the repo root) or a shared one someone gave you the
URL for. The account/signing-secret step
(`cli/src/accounts/accountStore.ts` on the backend side) happens
automatically; nothing extra to set up by hand.

## Where to go from here

- `cli/README.md` — full flag reference, isolation tiers, shadow mode
  (background comparisons that don't block your normal work).
- `skill-ab-marktplatz-plan.md` — the actual design rationale (German —
  the project's planning language, see repo-root `CLAUDE.md`).

## Troubleshooting — the one real gotcha found while testing this guide

**Windows only:** `npm link` creates `skill-ab`/`skill-ab.cmd` shims. If
`skill-ab --version` fails with `ERR_MODULE_NOT_FOUND` pointing at
`schema/src/...`, your `schema/` build is stale or missing — rerun step 1.
If it fails with a raw `spawn ... ENOENT`/`EINVAL` instead, that's
`cli/src/isolation/claudeBinary.ts`'s territory (Node's `spawn` can't
resolve an npm `.cmd` shim without a shell) — it auto-detects a real
`claude.exe` from a Claude Desktop install; if you don't have Claude
Desktop, pass `--claude-bin` explicitly to wherever your `claude` install
actually lives.
