# Skill-A/B-Marktplatz

## Sprachkonvention

Der **Quellcode** (`schema/`, `cli/`, `frontend/`, `backend/` — Variablen-, Funktions-, Typ- und
Feldnamen, Kommentare, Konsolen-/Log-Ausgaben, `package.json`-Beschreibungen,
Paket-READMEs) ist **ausschließlich Englisch**. Das gilt auch für die
tatsächlichen JSON-Feldnamen des `RunResult`-Schemas — diese sind auf
Englisch übersetzt und weichen damit bewusst von der deutschen Terminologie
im Plan-Dokument ab (z.B. `mit_skill`→`with_skill`, `kritisch`→`critical`,
`doku`→`docs`, `sonstige`→`other`, `reihenfolge_randomisiert`→`order_randomized`).
Bei neuem Code in `schema/`, `cli/`, `frontend/` oder `backend/`: konsequent
auf Englisch anlegen, nicht mischen. Das Backend hält diese Konvention
bereits ein (unabhängig entstanden, parallel zu dieser Sitzung).

Die **Planungsdokumentation** (`skill-ab-marktplatz-plan.md`, die
Phasen-Briefings `0X-marktplatz-*.md`, sowie `PROTOKOLL*.md`- und
`LOKAL-PROTOKOLL.md`-Dateien in verwandten Projekten wie
`../skill-matching-hook`) bleibt bewusst **Deutsch** — das sind die eigenen
Arbeitsnotizen des Projektinhabers, kein Quellcode, und werden nicht
übersetzt.

## Struktur

- `schema/` — Vertragsschicht (Zod-Schema + TS-Typen + Validierung), Phase 1
- `cli/` — CLI-Kern (`skill-ab run`), Phase 2
- `backend/` — Ingestion, Aggregation, Reputationsgewichtung, Anomalie-Flagging, Phase 3. Zwei API-Oberflächen: `/v1/*` (CLI-Ingestion, intern) und `/api/*` (öffentlicher Vertrag für `frontend/`, s. `backend/src/api/publicApi.ts`)
- `frontend/` — öffentliche Marktplatz-Ansicht, Phase 4, seit Phase 5 gegen den echten Backend-`/api/*`-Endpoint verdrahtet (`VITE_BACKEND_URL`, s. `frontend/README.md`)
