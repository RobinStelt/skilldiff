// Exports the Zod schema (single source of truth, see src/schema.ts) as a
// JSON schema file for backend runtime validation (Phase 3).
// Usage: npm run build:json-schema

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { zodToJsonSchema } from "zod-to-json-schema";
import { runResultSchema } from "../src/schema.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const jsonSchema = zodToJsonSchema(runResultSchema, {
  name: "RunResult",
  $refStrategy: "none",
});

const outPath = resolve(__dirname, "..", "run-result.schema.json");
writeFileSync(outPath, JSON.stringify(jsonSchema, null, 2) + "\n", "utf-8");

console.log(`JSON schema written to ${outPath}`);
