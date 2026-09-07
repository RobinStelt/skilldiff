# Backend — Phase 3 (Ingestion, Aggregation, Reputation, Anomalie-Flagging)

Implementiert `04-marktplatz-phase3-backend.md`. Node.js/TypeScript, Fastify, Postgres — passend zum Stack von `cli/` und `@skilldiff/schema`.

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

- **`src/canonical.ts`** — Signaturprüfung, über die gemeinsame `canonicalJson`-Funktion aus `@skilldiff/schema` (`schema/src/canonicalJson.ts`) — dieselbe, mit der `cli/src/upload/signature.ts` signiert.
- **`src/accounts/`** — Account-Registrierung (`POST /v1/accounts`) und Reputationsdaten.
- **`src/ingestion/`** — Validierung → Signaturprüfung → Duplikat-Check → Speicherung (`POST /v1/run-results`).
- **`src/aggregation/`** — Median-Delta + Bootstrap-Konfidenzintervall + Sample-Size, strikt pro Skill+Kategorie getrennt (`src/aggregation/metrics.ts`), plus Reputations-/Tier-/Build-Hash-Gewichtung (`src/aggregation/weighting.ts`).
- **`src/anomaly/`** — Batch-Scan (`npm run migrate` einmalig, danach `scripts/run-anomaly-scan.ts` per Cron), markiert statt löscht.
- **`src/api/`** — zwei Oberflächen auf derselben Aggregationslogik:
  - `/v1/*`: internes/CLI-seitiges API aus Briefing 04 (`GET /v1/skills/:skillId/metrics`, `GET /v1/export.json`, `GET /v1/export.csv`).
  - `/api/*`: der öffentliche Vertrag, gegen den `frontend/` (Phase 4) gebaut ist (`src/api/publicApi.ts`) — `GET /api/skills`, `GET /api/skills/:skillId`, `GET /api/skills/:skillId/export?category=`. Nachträglich ergänzt, um die zwischen Phase 3 und Phase 4 parallel entstandene Vertragslücke zu schließen (siehe `frontend/README.md`, war dort als "Backend gap" dokumentiert).
- **`db/migrations/001_init.sql`** — Schema + Rollen/Grants für die `content_ref`-Trennung (briefing Punkt 2).
- **`db/migrations/002_seed_accounts_and_public_api.sql`** — `accounts.is_seed_account`-Flag (Briefing 06 Punkt 4, gesetzt über `scripts/mark-seed-account.ts`, nie über HTTP).

## Zwei ursprünglich offene Punkte — inzwischen beide gelöst

Beide betrafen das Zusammenspiel mit `cli/src/upload/signature.ts` (Briefing 03) und waren hier zunächst nur dokumentiert, nicht behoben:

1. **Signaturmodell.** `localConfig.ts` sagt, der `signingSecret` verlasse nie den Rechner — für eine serverseitige HMAC-Prüfung muss der Server das Secret aber kennen. Gelöst über `POST /v1/accounts { account_id, signing_secret }`: `cli/src/upload/submit.ts` ruft diesen Endpoint jetzt vor jedem Upload automatisch auf (idempotent, kein separater Einmal-Schritt nötig) — vorher rief das CLI diesen Endpoint nirgends auf, ein frischer, nie zuvor registrierter Account wäre beim allerersten Upload mit `401 unregistered_account` gescheitert. Real verifiziert mit einem nagelneuen Account gegen einen laufenden Server.
2. **Signatur-Lücke.** `JSON.stringify(payload, Object.keys(payload).sort())` mit Array-Replacer filterte verschachtelte Objektschlüssel auf allen Ebenen nach derselben flachen Liste — `with_skill`, `without_skill`, `category_metrics`, `security_delta` wurden dadurch faktisch als `{}` signiert, nicht mit ihrem echten Inhalt. Gelöst durch `canonicalJson` in `schema/src/canonicalJson.ts` — eine echte rekursive Kanonisierung, die CLI und Backend jetzt beide importieren, statt zwei unabhängige (und in der CLI fehlerhafte) Implementierungen zu pflegen. **Bricht bewusst das alte Signaturformat** — bewusst jetzt gemacht, vor jedem echten Deployment, nicht danach. Real verifiziert: eine mit der neuen Funktion signierte Nutzlast wird akzeptiert, eine Manipulation an einem verschachtelten Feld (`with_skill.tokens`) wird jetzt korrekt mit `401 invalid_signature` abgelehnt (vorher unentdeckt geblieben).

## Tests

```bash
npm test                # Unit-Tests, keine Datenbank nötig
npm run test:integration  # braucht laufendes Postgres + TEST_DATABASE_URL_APP_ROLE / TEST_DATABASE_URL_CONTENT_WRITER
```

`test/integration/permissions.test.ts` verifiziert das Akzeptanzkriterium, dass der `app_backend`-Rolle der Zugriff auf `run_result_content` mit einem echten Permission-Fehler verweigert wird.
