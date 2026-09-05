# skill-ab — CLI-Kern (Phase 2)

Setzt `03-marktplatz-phase2-cli-kern.md` um. Voller Kontext:
`../skill-ab-marktplatz-plan.md`, Abschnitt 3 (Isolation) und 5 (Bewertung).

## Nutzung

```bash
npm install
npm run dev -- run \
  --skill <skill-id> \
  --dir <arbeitsverzeichnis> \
  --skill-source <skill-quelle, MUSS außerhalb von --dir liegen> \
  --aufgabe "<Aufgabenbeschreibung>" \
  --check "npm test"
```

Beim allerersten Lauf erscheint einmalig der Consent-Screen (Briefing Punkt
8). Danach läuft jeder weitere Aufruf ohne Rückfrage — die Entscheidung wird
unter `~/.skill-ab/config.json` gespeichert (pseudonyme `account_id`, lokaler
Signierschlüssel, Consent-Status).

Ohne `--endpoint` läuft der Upload gegen einen lokalen Mock
(`.skill-ab-mock-uploads/<run_id>.json`) — Phase 3 (echter Backend-Endpoint)
existiert noch nicht.

## Architektur

```
src/
  isolation/     Tier-Erkennung (A/B/C) + Gating (Symlink/Junction, Docker-Args)
  orchestration/ Randomisierte Reihenfolge, frische Arbeitskopien, Prozessausführung
  category/      Automatische Kategorie- und Größenklassen-Erkennung
  security/      Semgrep/npm audit/bandit -> SeverityCounts-Delta
  metrics/       Kategoriespezifische Zusatzmetriken (Coverage, Lint, Komplexität, Lesbarkeit)
  consent/       Einmaliger Consent-Screen
  config/        Lokale, persistente Config (~/.skill-ab/config.json)
  upload/        Signatur + Validierung (Schema-Package) + Versand/Mock
  buildRunResult.ts  Baut den finalen, typisierten RunResult zusammen
```

## Isolationsstufen — Umsetzungsstatus

| Tier | Umsetzung |
|---|---|
| **A** (Docker/Podman) | `docker info`/`podman info` wird tatsächlich ausgeführt, nicht geraten. Der `docker run`-Aufruf selbst (`isolation/dockerRun.ts`) mountet ausschließlich das Arbeitsverzeichnis und — nur bei `mit_skill` — den einen erlaubten Skill-Ordner. **Voraussetzung, die diese Phase NICHT liefert:** ein Docker-Image mit vorinstallierter `claude`-CLI (Default-Name `skill-ab/claude-runner:latest`, überschreibbar per `--docker-image`). Ohne dieses Image bricht der Container-Aufruf ab — in einem lokalen Rauchtest mit echtem, laufendem Docker reproduziert und dokumentiert, kein Rätselraten. |
| **B** (Symlink/Junction + isoliertes Home) | Vollständig umgesetzt, inkl. echtem Fähigkeitstest statt Plattform-Annahme. Direkte Lehre aus `../../skill-matching-hook/skill-gate-test/LOKAL-PROTOKOLL.md`: `fs.symlinkSync` wird real ausprobiert und per `readlinkSync` verifiziert (nicht nur try/catch, weil `ln -s` auf Windows ohne Developer Mode lautlos eine leere Datei statt eines Symlinks erzeugt); NTFS-Junction ist der automatische Fallback. Jede Bedingung bekommt zusätzlich ein frisches, leeres `$HOME`/`%USERPROFILE%` — notwendig, weil `--setting-sources project` allein nachweislich NICHT ausreicht, um global aktivierte Plugin-Skills fernzuhalten (ebenfalls im Lokal-Protokoll bestätigt). |
| **C** (Best-Effort) | Läuft ohne jede Isolationsgarantie im (kopierten) Original-Arbeitsverzeichnis — bewusst niedrigste Vertrauensstufe, kein zusätzlicher Code nötig. |

Jede Bedingung läuft zusätzlich in einer **frischen Arbeitskopie** (nicht im
Original), damit die beiden Bedingungen garantiert keinen Dateizustand teilen
— unabhängig von der Isolationsstufe.

## Was diese Phase bewusst NICHT liefert

- Kein fertiges Docker-Image für Tier A (nur der Aufruf-Mechanismus).
- Kein echter Backend-Endpoint (Phase 3) — nur ein lokaler, validierter Mock.
- Kategorieerkennung und alle `category_metrics` (Komplexität, Lesbarkeit)
  sind **heuristisch, nicht exakt** — siehe Kommentare in
  `src/category/detectCategory.ts`, `src/metrics/complexity.ts` und
  `src/metrics/readability.ts` für die jeweiligen Grenzen. Kein manuelles
  Rating ersetzt das je (Briefing Punkt 3) — Ungenauigkeit wird über die
  Kategorie-Heterogenitäts-Prüfung im Aggregat abgefangen (Plan Abschnitt 7),
  nicht hier korrigiert.

## Tests

```bash
npm run typecheck
npm test
```

40 Tests (vitest) decken ab: Randomisierung, Kategorie-/Größenklassen-
Erkennung, Lesbarkeit/Komplexität-Heuristiken, Security-Delta-Regeln,
Link-Fähigkeitstest, `RunResult`-Aufbau **validiert gegen das echte
Schema-Package**, Mock-Upload (inkl. Ablehnung ungültiger Payloads vor jedem
Schreiben/Versand), und lokale Config-Persistenz. Reale `claude`-Aufrufe
laufen über ein injizierbares `ProcessRunner`-Interface und sind in Tests
durch Fakes ersetzt — ein echter End-to-End-Lauf wurde einmalig manuell
gegen die lokale `claude`-Installation verifiziert (siehe Commit-Historie),
ist aber kein Teil der automatisierten Testsuite (würde reale API-Kosten pro
Testlauf verursachen).

## Offene Punkte für spätere Iterationen

- Docker-Image für Tier A bauen und pflegen.
- Kategorieerkennung auf echten Daten kalibrieren, sobald erste Runs vorliegen.
- Zyklomatische Komplexität durch echte AST-basierte Berechnung ersetzen
  (z.B. `ts-morph` für TS/JS), sobald der Aufwand gerechtfertigt ist.
- Cloud-Test 5d (frisches Home isoliert personal-level Skills) war bisher
  nur in der Cloud-Sandbox verifiziert — sollte einmal gezielt lokal
  nachgetestet werden (siehe `skill-matching-hook`-README, "Nächste Schritte").
