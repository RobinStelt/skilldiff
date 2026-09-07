# Getting started — try the CLI yourself

> **Status:** `cli/` is built and packaged for `npm install -g skill-ab`
> (bundled, verified with a real `npm pack` + isolated install — see
> `cli/build.mjs`) but not yet actually published to the registry, which
> needs someone with npm publish rights to run `npm publish` from `cli/`
> once, by hand. Until that happens, use the "Building from source"
> fallback below step 1.

## Prerequisites

- **Node.js 20+**.
- **[Claude Code](https://claude.com/claude-code)** installed and logged in
  — either a Pro/Max subscription login (`claude` with no
  `ANTHROPIC_API_KEY` set) or an API key. Either works; a subscription
  login is what most contributors will actually have.
- Nothing else. Docker is optional (only used for Tier A isolation, see
  `cli/README.md`) — the CLI auto-detects what's available and falls back
  gracefully (`cli/README.md`, "Isolation tiers").

## 1. Install `skill-ab`

```bash
npm install -g skill-ab
```

Verify it worked:

```bash
skill-ab --version
```

That should print the current version. `cli/package.json` bundles every
dependency (including its internal `@skilldiff/schema` contract package)
into one file at publish time, so this is a single, self-contained
install — nothing else to build.

<details>
<summary>Building from source instead (working on the CLI itself, or the
published package isn't available yet)</summary>

```bash
git clone https://github.com/RobinStelt/skilldiff.git
cd skilldiff

cd cli && npm install && npm run build && npm link && cd ..
```

`npm run build` (`cli/build.mjs`) bundles `src/index.ts` with esbuild —
the same thing `npm publish` runs — so `npm link` here exercises the exact
artifact real installs get, not a different dev-only build. If
`skill-ab --version` then fails with a "command not found" (or, on
Windows, a `spawn ... ENOENT`/`EINVAL` error), see the troubleshooting
note at the bottom before anything else — a known, already-fixed class of
bug, so make sure `git pull` actually got the fix.
</details>

## 2. Try it once, locally, with no upload

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

## 3. Contribute to a real backend

```bash
skill-ab config set endpoint https://skilldiff.robin-steltmann.de/v1/run-results
skill-ab run --dir <your-real-project> --task "<a task you're about to do anyway>"
```

`config set endpoint` persists it (`~/.skill-ab/config.json`) so you don't
repeat `--endpoint` on every run — or pass `--endpoint <url>` once instead
if you'd rather not persist it. Point it at the public instance above, at
your own (`backend/README.md` for running one locally, or
`docker/DEPLOY.md` for a real deployment), or at a shared one someone gave
you the URL for. The account/signing-secret step
(`cli/src/accounts/accountStore.ts` on the backend side) happens
automatically; nothing extra to set up by hand.

## Where to go from here

- `cli/README.md` — full flag reference, isolation tiers, shadow mode
  (background comparisons that don't block your normal work).
- `skill-ab-marktplatz-plan.md` — the actual design rationale (German —
  the project's planning language, see repo-root `CLAUDE.md`).

## Troubleshooting — the one real gotcha found while testing this guide

**Windows only, building from source:** `npm link` creates
`skill-ab`/`skill-ab.cmd` shims. If `skill-ab --version` fails with a raw
`spawn ... ENOENT`/`EINVAL`, that's `cli/src/isolation/claudeBinary.ts`'s
territory (Node's `spawn` can't resolve an npm `.cmd` shim without a
shell) — it auto-detects a real `claude.exe` from a Claude Desktop
install; if you don't have Claude Desktop, pass `--claude-bin` explicitly
to wherever your `claude` install actually lives.
