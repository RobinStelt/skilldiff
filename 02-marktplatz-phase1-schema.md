# Task für Claude Code: Skill-A/B-Marktplatz — Phase 1 (Protokoll & Schema)

**Voraussetzung:** Briefing 01 (Hook-Gating-Modul) ist fertig und getestet, bevor diese Aufgabe beginnt.
**Vollständiger Kontext:** `skill-ab-marktplatz-plan.md` (kompletter Projektplan, liegt im selben Ordner wie dieses Briefing) — bei Unklarheiten dort nachlesen, insbesondere Abschnitt 4 (Datenschema) und Abschnitt 5 (Bewertungsdimensionen).

## Ziel dieser Phase

Das Datenschema als TypeScript-Typen + JSON-Schema-Validierung implementieren, BEVOR das eigentliche CLI (Phase 2) gebaut wird. Diese Phase produziert keine funktionierende Software, sondern die verbindliche Vertragsschicht zwischen CLI und Backend.

## Aufgaben

1. **TypeScript-Typdefinitionen** für das vollständige Schema aus Abschnitt 4 des Plans erstellen, inklusive:
   - `RunResult` (Haupttyp)
   - `category_metrics` als diskriminierte Union nach `category` — Felder sind final spezifiziert (Abschnitt 4 des Plans): `debugging`/`feature` bekommen `test_coverage_pct`, `lint_errors`, `ci_status`; `refactoring` bekommt `cyclomatic_complexity_before/after`, `diff_size_loc`; `doku` bekommt `readability_score`; `marketing`/`sonstige` haben `category_metrics: null`
   - Kein `RegressionCheck`-Typ — Regressions-Nachcheck ist bewusst kein Teil des Projekts, nicht implementieren
2. **JSON-Schema-Datei** (für Laufzeitvalidierung im Backend, Phase 3) aus den TS-Typen ableiten oder parallel pflegen — Entscheidung liegt bei dir, aber beide müssen synchron bleiben (Empfehlung: `zod`-Schema als Single Source of Truth, TS-Typen per `z.infer<>` ableiten, JSON-Schema per `zod-to-json-schema` exportieren)
3. **Validierungsfunktion** `validateRunResult(data: unknown): RunResult | ValidationError[]`, die insbesondere prüft:
   - `security_delta` ist `null`, wenn `category` nicht in einer Menge code-naher Kategorien liegt (debugging, feature, refactoring) — bei `marketing`/`doku` muss es `null` sein, ein gesetzter Wert dort ist ein Validierungsfehler
   - `content_ref` ist nur gesetzt, wenn `content_opt_in === true`
   - `isolation_tier` ist einer von `A`/`B`/`C`, kein anderer Wert
4. **Beispieldaten** (Fixtures) für mindestens einen validen Run pro Kategorie + mindestens 3 bewusst ungültige Beispiele (zum Testen der Validierung)
5. **Kurzes README** im Schema-Package: erklärt, wie CLI und Backend dieses Package importieren sollen, ohne den ganzen Projektplan lesen zu müssen

## Akzeptanzkriterien

- [ ] `RunResult`-Typ deckt alle Felder aus Abschnitt 4 des Plans ab, keine Abweichung ohne Rücksprache
- [ ] Validierung lehnt die 3 negativen Fixtures korrekt ab, akzeptiert die positiven
- [ ] Package hat keine Laufzeit-Abhängigkeit zu CLI- oder Backend-Code (reines, eigenständiges Schema-Package, damit beide es unabhängig importieren können)
- [ ] `npm run typecheck` und ein einfacher Test-Runner (vitest o.ä.) laufen grün

## Bewusst offen gelassen (nicht in dieser Phase klären)

- Wie `content_ref` konkret referenziert wird (separate Tabelle steht fest, genaues Zugriffsrechte-Konzept ist Phase-3-Thema)

**Geschätzter Aufwand:** 1 Woche, wie im Hauptplan veranschlagt.
