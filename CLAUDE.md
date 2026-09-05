# Skill-A/B-Marktplatz

## Sprachkonvention

Der **Quellcode** (`schema/`, `cli/` — Variablen-, Funktions-, Typ- und
Feldnamen, Kommentare, Konsolen-/Log-Ausgaben, `package.json`-Beschreibungen,
Paket-READMEs) ist **ausschließlich Englisch**. Das gilt auch für die
tatsächlichen JSON-Feldnamen des `RunResult`-Schemas — diese sind auf
Englisch übersetzt und weichen damit bewusst von der deutschen Terminologie
im Plan-Dokument ab (z.B. `mit_skill`→`with_skill`, `kritisch`→`critical`,
`doku`→`docs`, `sonstige`→`other`, `reihenfolge_randomisiert`→`order_randomized`).
Bei neuem Code in `schema/` oder `cli/`: konsequent auf Englisch anlegen,
nicht mischen.

Die **Planungsdokumentation** (`skill-ab-marktplatz-plan.md`, die
Phasen-Briefings `0X-marktplatz-*.md`, sowie `PROTOKOLL*.md`- und
`LOKAL-PROTOKOLL.md`-Dateien in verwandten Projekten wie
`../skill-matching-hook`) bleibt bewusst **Deutsch** — das sind die eigenen
Arbeitsnotizen des Projektinhabers, kein Quellcode, und werden nicht
übersetzt.

## Struktur

- `schema/` — Vertragsschicht (Zod-Schema + TS-Typen + Validierung), Phase 1
- `cli/` — CLI-Kern (`skill-ab run`), Phase 2
- Backend (Phase 3) und Frontend (Phase 4) sind separate, noch zu
  erstellende Pakete in diesem Repo bzw. parallel entwickelt.
