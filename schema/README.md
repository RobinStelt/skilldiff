# @marktplatz/schema

Verbindliche Vertragsschicht zwischen CLI (Phase 2) und Backend (Phase 3) des
Skill-A/B-Marktplatzes. Reines Schema-Package — **keine** Laufzeit-Abhängigkeit
zu CLI- oder Backend-Code, damit beide es unabhängig voneinander importieren
können.

Voller Projekt-Kontext: `../skill-ab-marktplatz-plan.md`, Abschnitt 4
(Datenschema) und Abschnitt 5 (Bewertungsdimensionen). Dieses README erklärt
nur, wie man das Package benutzt — nicht warum das Schema so aussieht.

## Single Source of Truth

`src/schema.ts` enthält das Zod-Schema, aus dem alles andere abgeleitet wird:

- **TypeScript-Typen** (`src/types.ts`) per `z.infer<>`
- **JSON-Schema** (`run-result.schema.json`) per `npm run build:json-schema`
  (nutzt `zod-to-json-schema`) — für die Laufzeitvalidierung im Backend, falls
  dort keine Node/Zod-Laufzeit zur Verfügung steht

Ändere Feldregeln **nur** in `src/schema.ts`. Typen und JSON-Schema ziehen
automatisch nach.

⚠️ **Grenze des JSON-Schema-Exports:** Die Cross-Field-Regel
„`content_ref` nur gesetzt, wenn `content_opt_in === true`" ist als
`.superRefine()` auf der Zod-Seite implementiert und lässt sich nicht verlustfrei
nach JSON-Schema exportieren. Ein Backend, das ausschließlich das exportierte
JSON-Schema nutzt (statt der Zod-Laufzeit direkt), muss diese eine Regel separat
prüfen. Alle anderen Regeln (inkl. der `category`↔`security_delta`- und
`category`↔`category_metrics`-Kopplung über die diskriminierte Union) sind im
JSON-Schema vollständig abgebildet.

## Nutzung in CLI/Backend

```ts
import { validateRunResult, type RunResult } from "@marktplatz/schema";

const result = validateRunResult(unbekannteDaten);
if (Array.isArray(result)) {
  // result: ValidationError[] — jeweils { path, message }
  console.error("Ungültiger RunResult:", result);
} else {
  // result: RunResult — vollständig typisiert, inkl. korrekt
  // eingeengtem category_metrics je nach result.category
  submitToBackend(result);
}
```

Alle öffentlichen Exporte laufen über `src/index.ts` — nicht aus tieferen
Pfaden (`src/schema.ts`, `src/validate.ts`, …) importieren, damit die interne
Struktur frei änderbar bleibt.

## Kernregeln, die die Validierung erzwingt

1. `category_metrics` ist strukturell an `category` gekoppelt (diskriminierte
   Union): `debugging`/`feature` → `test_coverage_pct`, `lint_errors`,
   `ci_status`; `refactoring` → `cyclomatic_complexity_before/after`,
   `diff_size_loc`; `doku` → `readability_score`; `marketing`/`sonstige` →
   `null`.
2. `security_delta` muss `null` sein außer bei `debugging`/`feature`/
   `refactoring` (dort ist es optional — `null`, wenn kein Code-Artefakt
   entstand).
3. `content_ref` darf nur gesetzt sein, wenn `content_opt_in === true`.
4. `isolation_tier` ist ausschließlich `"A"`, `"B"` oder `"C"`.

Kein `RegressionCheck`-Typ — Regressions-Nachcheck ist bewusst kein Teil des
Projekts (Plan, Abschnitt 4 & 8).

## Fixtures

`fixtures/valid/` — ein valider Run pro Kategorie.
`fixtures/invalid/` — drei bewusst ungültige Beispiele (eine Verletzung pro
Regel oben aus 2–4). Beide Verzeichnisse werden von `test/validate.test.ts`
automatisch eingelesen; ein neuer Fixture wird ohne Codeänderung mitgetestet.

## Scripts

```bash
npm run typecheck        # tsc --noEmit
npm test                 # vitest run
npm run build:json-schema  # schreibt run-result.schema.json
```

## Installation (lokal, solange kein eigenes npm-Package registriert ist)

```bash
cd schema
npm install
```
