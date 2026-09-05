# Vorbefüllung — Methodik & Durchführung, Batch 1

Dokumentiert die tatsächliche Durchführung von Briefing 06
(`06-marktplatz-phase5-vorbefuellung.md`). **Kein vollständiger
Durchlauf** — siehe Abschnitt "Status ggü. Akzeptanzkriterien" unten für
das, was noch offen ist. Auf ausdrücklichen Wunsch priorisiert: echte
Läufe über volle Abdeckung, kein künstliches Auffüllen der Zielzahlen.

## Zwei Vorarbeiten, ohne die dieser Batch keine echten Daten geliefert hätte

Beide sind in eigenen Commits dokumentiert, nicht Teil dieser Datei im
Detail:

1. **API-Vertragslücke Backend↔Frontend geschlossen** (Commit
   "Close Phase 3/4 API contract gap ..."). Ohne `/api/*` hätte das
   Frontend die Startdaten gar nicht anzeigen können — Akzeptanzkriterium
   3 dieses Briefings wäre nicht testbar gewesen.
2. **CLI-Bug gefunden und behoben**: `createIsolatedHome()`
   (`cli/src/isolation/gating.ts`) hat bei jedem Lauf ein leeres
   `$HOME`/`%USERPROFILE%` gesetzt — auf einem Rechner mit
   Pro/Max-Abo-Login (statt `ANTHROPIC_API_KEY`) hat das den `claude`-Aufruf
   dadurch komplett ausgeloggt. Ergebnis: 0 Tokens, 0 Sekunden, `success:
   true` — sah wie eine Messung aus, war aber ein stiller Auth-Fehler.
   Fix kopiert ausschließlich `.claude/.credentials.json` ins frische
   Home hinein (Isolationsgarantie bleibt: keine fremden Skills/Settings).
   Commit "Fix: isolated $HOME breaks Pro/Max subscription login ...".
   **Betrifft jeden Nutzer mit Abo-Login, nicht nur diese Umgebung.**

## Auswahl der Skills (Batch 1 von 8 vom Nutzer vorgegebenen)

Nutzer hat 8 konkrete Skills genannt (siehe Konversation). Für Batch 1
wurden 3 ausgewählt — je einer pro angestrebter Kategorie, mit dem Ziel,
die Methode einmal komplett ehrlich durchzuspielen, bevor die restlichen
5 folgen:

| Skill | Quelle | Kategorie (automatisch erkannt) | Warum als Erstes |
|---|---|---|---|
| `ponytail` | github.com/dietrichgebert/ponytail (`skills/ponytail/SKILL.md`) | refactoring | Einzige der 8 mit echtem, testbarem Code-Effekt (YAGNI/Vereinfachung), passt direkt zu Refactoring-Metriken |
| `humanizer` | github.com/blader/humanizer (`SKILL.md` im Repo-Root) | docs | Einzige mit `readability_score`-tauglicher Textarbeit |
| `caveman` | github.com/juliusbrussee/caveman (`skills/caveman/skills/caveman/SKILL.md`) | other | Reine Kommunikationsstil-Optimierung, kein Code-Bezug — testet bewusst NICHT code-adjacente Kategorie |

**Noch nicht durchgeführt** (Batch 2, nicht Teil dieser Datei):
`clawscan`, `clawsec-suite` (Sicherheits-Tooling, keine klare "Aufgabe
lösen"-Semantik — Framing für einen fairen Vergleich noch offen),
`notfair-plugin` (braucht echte Google/Meta/LinkedIn-Ads-Konten, in dieser
Umgebung nicht verfügbar — keine Marketing-Kategorie in Batch 1),
`playwright-skill` (braucht Playwright+Chromium-Installation),
`frontend-design` (offizieller Anthropic-Skill, UI-Bewertung schwerer
automatisierbar).

## Aufgaben pro Skill

Jede Aufgabe lief über den reduzierten Standardpfad
(`skill-ab run --skill ... --dir ... --skill-source ... --task ... [--check ...] --endpoint http://localhost:3000/v1/run-results`),
mit `--claude-bin` auf die lokal installierte `claude.exe` gesetzt (nicht
den npm-Shim — separater, in der Konversation dokumentierter Grund:
`spawn ... ENOENT`/`EINVAL` bei `.cmd`-Dateien unter Node/Windows ohne
Shell, ein Umgebungs-Detail dieser Maschine, keine Protokoll-Änderung).
Docker lief bewusst NICHT im PATH des Prozesses, damit die
Isolationsstufe ehrlich B statt eines nicht funktionsfähigen A ermittelt
wird (Tier A bräuchte ein Docker-Image mit vorinstalliertem `claude` UND
eine Weiterleitung des Abo-Logins in den Container — beides von Phase 2
bewusst nicht geliefert, siehe `cli/README.md`).

| # | Skill | Aufgabe | Check-Kommando | run_id |
|---|---|---|---|---|
| 1 | ponytail | "Simplify src/formatDate.js as much as possible while keeping all tests passing. Do not change its behavior." | `node test/formatDate.test.js` | `44b2fb16-499b-470a-8926-ecda0d0116f2` |
| 2 | ponytail | "Simplify src/pricing.js — remove any unnecessary abstraction while keeping all tests passing." | `node test/pricing.test.js` | `615fa223-e149-4221-8971-7c7d857dc942` |
| 3 | humanizer | "Write documentation in docs/EXPLAINER.md explaining what src/parseCsv.js does and how to use it, for a new contributor." | keins (Erfolg bleibt `null`) | `a3d0d8ed-8fad-4d3e-9494-5bd47448f54c` |
| 4 | humanizer | "Write a clear README.md section describing what src/rateLimiter.js does and its edge cases, for a new contributor." | keins | `014d84a7-c542-4516-b887-e758fa7d7c3a` |
| 5 | caveman | "Summarize the trade-offs between microservices and a monolith for a small team's first product." | keins | `4f1d1d1f-d927-4718-9322-e6cfe9b6b62c` |
| 6 | caveman | "Give me a plan for organizing a two-day offsite for a 12-person engineering team." | keins | `de4d58f9-a8fe-4dea-8b2a-036eb2048a0d` |

Für ponytail wurden reale, kleine Node-Repos mit absichtlich
über-engineerten Funktionen (Strategy-Pattern-Overkill, unnötige
Config-Klassen) und einer echten, laufenden Testsuite angelegt — nicht
Teil dieses Repos (liegen im Scratchpad der Session), Struktur oben
dokumentiert genug, um sie bei Bedarf zu reproduzieren. Für
humanizer/caveman genügt die Aufgabenbeschreibung selbst, keine
Zielrepos nötig (Doku- bzw. reine Text-/Denkaufgabe).

## Tatsächliche Ergebnisse (Rohdaten nachrechenbar über den Export-Endpoint)

Datum: 2026-09-05. Account: pseudonym, ausschließlich für diesen Batch
angelegt, in der Datenbank über `accounts.is_seed_account = true`
markiert (`backend/scripts/mark-seed-account.ts`) — **kein** Missbrauch
des Reputationssystems aus Briefing 04, eigenes, separates Flag.
Isolationsstufe: **B** bei allen 6 Läufen (NTFS-Junction — Docker lief
nicht, siehe oben; ehrlich das, was auf dieser Maschine tatsächlich
zutraf, nicht künstlich auf A gesetzt).

| Skill | Kategorie | n | Tokens-Delta (Median) | Dauer-Delta (Median) | Erfolg |
|---|---|---|---|---|---|
| ponytail | refactoring | 2 | **−59.892** (mit Skill *mehr* Tokens) | −2s | beide Läufe: Tests bestanden |
| humanizer | docs | 2 | −445 (mit Skill leicht mehr Tokens) | −6s | kein Check-Kommando |
| caveman | other | 2 | −46.711 (mit Skill mehr Tokens) | −2s | kein Check-Kommando |

**Bewusst nicht schöngerechnet:** Bei allen drei Skills verbraucht die
"mit Skill"-Bedingung in diesem winzigen Sample MEHR Tokens, nicht
weniger — u.a. weil das Laden der SKILL.md selbst Kontext kostet (im
Datenschema explizit als Teil der "Netto-Bilanz inklusive
Kontext-Overhead" vorgesehen, Plan Abschnitt 5). Mit n=2 pro Kategorie ist
das exakt der Fall, für den das Frontend "Not enough data yet" statt einer
prominenten Zahl zeigt (Briefing 05, Akzeptanzkriterium 2) — funktioniert
im echten Test im Browser nachweislich so.

Vollständige Rohdaten je Skill+Kategorie: `GET /api/skills/<skillId>/export?category=<kategorie>`
gegen die laufende Backend-Instanz (siehe `backend/README.md` fürs
Setup) — genau der Nachrechenbarkeits-Endpoint aus Briefing 04 Punkt 6 /
Briefing 05 Punkt 6. **Wichtig:** Es existiert noch kein echter VPS-Deploy
(Plan Abschnitt 2) — dieser Batch lief gegen die lokale Docker-Postgres aus
`backend/docker-compose.yml`. Damit die echten `claude`-Aufrufe (Pro-Abo,
reale Kosten an Zeit) nicht verloren gehen, liegt ein Snapshot der
Export-Antworten unter [`07-vorbefuellung-data/`](07-vorbefuellung-data/)
(`<skill>-<kategorie>-raw.json`, `<skill>-detail.json`) — bei echtem
Deploy können diese Rohwerte übernommen werden, ohne die Läufe zu
wiederholen.

## Status ggü. Akzeptanzkriterien (Briefing 06)

- [ ] ~~Mindestens 15 Skills aus mindestens 3 Kategorien haben je mindestens 3 Runs~~ — **nicht erfüllt**: 3 Skills, 3 Kategorien (debugging/feature/marketing fehlen), je 2 statt ≥3 Runs. Bewusster Zwischenstand, kein vollständiger Claim.
- [x] Alle Vorbefüllungs-Runs sind über den regulären CLI-Pfad eingegangen, nicht per direktem DB-Insert — alle 6 Läufe über `skill-ab run --endpoint ...`, echte Signaturprüfung/Schema-Validierung im Backend durchlaufen.
- [x] Frontend zeigt für diese Skills sichtbar "Startdaten" an — im echten Browser gegen den echten Backend verifiziert (`SeedDataBadge`, Screenshot-Text in der Konversation dokumentiert).
- [x] Diese Datei — Aufgaben, Methodik, Datum, Isolationsstufe.

## Offene Punkte für Batch 2

- Restliche 5 Skills (siehe oben) — `notfair-plugin` (marketing) fehlt
  komplett, damit auch die Kategorie Marketing.
- `debugging`/`feature` als Kategorien noch nicht abgedeckt.
- Pro Skill 3-5 statt 2 Aufgaben, wie im Briefing gefordert.
- `clawscan`/`clawsec-suite`: Framing als faire "Aufgabe lösen"-Vergleich
  noch ungeklärt (Sicherheits-Scanner sind Meta-Tools, kein
  Task-Completion im üblichen Sinn) — vor Ausführung eher eine
  Rückfrage an den Nutzer wert als eine eigenmächtige Entscheidung.
