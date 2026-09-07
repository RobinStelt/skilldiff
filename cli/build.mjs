// Bundles src/index.ts into a single dist/index.js with esbuild — no
// externals, so the local `@skilldiff/schema` (file:../schema) dependency
// and every npm dependency (commander, picocolors, prompts, zod) end up
// inlined. That's why all of them are devDependencies, not dependencies,
// in package.json: `npm install skill-ab` needs to fetch nothing at all
// at install time, and a published `file:../schema` dependency would
// otherwise fail to resolve on anyone else's machine.
//
// tsc still runs separately for type-checking (`npm run typecheck`) and
// as the pre-publish gate in ci — this script only produces the runnable
// artifact, it doesn't check types itself (esbuild strips types without
// checking them, which is fine as long as typecheck runs alongside it).
import { build } from "esbuild";

await build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  outfile: "dist/index.js",
  // Needed because index.js otherwise conflicts with esbuild's own require
  // shim in some edge cases when a bundled dependency does `require(...)`
  // under the hood (prompts does, transitively) despite the ESM output.
  banner: { js: "import { createRequire as __createRequire } from 'module';\nconst require = __createRequire(import.meta.url);" },
});
