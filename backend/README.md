# Backend — Phase 3 (Ingestion, Aggregation, Reputation, Anomalie-Flagging)

Implementiert `04-marktplatz-phase3-backend.md`. Node.js/TypeScript, Fastify, Postgres — passend zum Stack von `cli/` und `@marktplatz/schema`.

Für den kompletten Stack (Postgres + Backend + Frontend) in einem Rutsch: `docker compose up --build` im Repo-Root (`../docker-compose.yml`). Der `docker-compose.yml` hier im Verzeichnis startet nur Postgres, für die schnelle Entwicklungsschleife mit `npm run dev`.

## Setup

```bash
npm install
docker compose up -d
npm run migrate        # legt Tabellen + Rollen (app_backend, content_writer, blindvoting_service) an
cp .env.example .env   # Passwörter für Produktion ändern!
npm run dev
```

## Architektur

- **`src/canonical.ts`** — Signaturprüfung. Repliziert bewusst exakt die Kanonisierung aus `cli/src/upload/signature.ts`, damit echte CLI-Uploads verifizierbar sind.
- **`src/accounts/`** — Account-Registrierung (`POST /v1/accounts`) und Reputationsdaten.
- **`src/ingestion/`** — Validierung → Signaturprüfung → Duplikat-Check → Speicherung (`POST /v1/run-results`).
- **`src/aggregation/`** — Median-Delta + Bootstrap-Konfidenzintervall + Sample-Size, strikt pro Skill+Kategorie getrennt (`src/aggregation/metrics.ts`), plus Reputations-/Tier-/Build-Hash-Gewichtung (`src/aggregation/weighting.ts`).
- **`src/anomaly/`** — Batch-Scan (`npm run migrate` einmalig, danach `scripts/run-anomaly-scan.ts` per Cron), markiert statt löscht.
- **`src/api/`** — zwei Oberflächen auf derselben Aggregationslogik:
  - `/v1/*`: internes/CLI-seitiges API aus Briefing 04 (`GET /v1/skills/:skillId/metrics`, `GET /v1/export.json`, `GET /v1/export.csv`).
  - `/api/*`: der öffentliche Vertrag, gegen den `frontend/` (Phase 4) gebaut ist (`src/api/publicApi.ts`) — `GET /api/skills`, `GET /api/skills/:skillId`, `GET /api/skills/:skillId/export?category=`. Nachträglich ergänzt, um die zwischen Phase 3 und Phase 4 parallel entstandene Vertragslücke zu schließen (siehe `frontend/README.md`, war dort als "Backend gap" dokumentiert).
- **`db/migrations/001_init.sql`** — Schema + Rollen/Grants für die `content_ref`-Trennung (briefing Punkt 2).
- **`db/migrations/002_seed_accounts_and_public_api.sql`** — `accounts.is_seed_account`-Flag (Briefing 06 Punkt 4, gesetzt über `scripts/mark-seed-account.ts`, nie über HTTP).

## Zwei offene Punkte aus dieser Phase — nicht in `backend/` lösbar

Beide betreffen `cli/src/upload/signature.ts` (Briefing 03), das gerade parallel übersetzt wird — deshalb hier dokumentiert statt dort angefasst:

1. **Signaturmodell.** `localConfig.ts` sagt, der `signingSecret` verlasse nie den Rechner — für eine serverseitige HMAC-Prüfung muss der Server das Secret aber kennen. Lösung in dieser Phase (siehe Nutzer-Entscheidung): expliziter Registrierungs-Endpoint `POST /v1/accounts { account_id, signing_secret }`, den das CLI einmalig aufrufen muss. Das widerspricht dem bestehenden Kommentar in `localConfig.ts` — der sollte in der laufenden CLI-Übersetzung korrigiert und ein Aufruf dieses Endpoints ergänzt werden. Sauberere Alternative für später: Ed25519 (Server speichert nur den öffentlichen Schlüssel, echtes TOFU), aber das braucht eine Schema-Änderung.
2. **Signatur-Lücke.** `JSON.stringify(payload, Object.keys(payload).sort())` mit Array-Replacer filtert verschachtelte Objektschlüssel auf allen Ebenen nach derselben flachen Liste — `with_skill`, `without_skill`, `category_metrics`, `security_delta` werden dadurch faktisch als `{}` signiert, nicht mit ihrem echten Inhalt. Die Signatur schützt aktuell nur die Top-Level-Skalarfelder vor nachträglicher Manipulation. `src/canonical.ts` repliziert das Verhalten bewusst 1:1 (sonst würden echte CLI-Uploads fehlschlagen) und dokumentiert die Lücke ausführlich. Empfehlung: eine einzige, korrekte Kanonisierungsfunktion in `@marktplatz/schema` exportieren, die CLI und Backend beide importieren, statt zwei unabhängige Implementierungen zu pflegen.

## Tests

```bash
npm test                # Unit-Tests, keine Datenbank nötig
npm run test:integration  # braucht laufendes Postgres + TEST_DATABASE_URL_APP_ROLE / TEST_DATABASE_URL_CONTENT_WRITER
```

`test/integration/permissions.test.ts` verifiziert das Akzeptanzkriterium, dass der `app_backend`-Rolle der Zugriff auf `run_result_content` mit einem echten Permission-Fehler verweigert wird.
