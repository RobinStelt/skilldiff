# Task für Claude Code: Skill-A/B-Marktplatz — Phase 3 (Backend & Aggregation)

**Voraussetzung:** Briefing 02 (Schema-Package) ist fertig. Kann parallel zu Briefing 03 (CLI-Kern) starten — beide hängen nur vom Schema ab, nicht voneinander.
**Vollständiger Kontext:** `skill-ab-marktplatz-plan.md`, insbesondere Abschnitt 4 (Datenschema) und Abschnitt 7 (Restrisiken — hier besonders relevant: Client-Manipulation, selektive Aufgabenwahl).

## Ziel dieser Phase

Der Server, der Run-Ergebnisse entgegennimmt, validiert, speichert und zu Marktplatz-Kennzahlen aggregiert. Läuft auf einem eigenen VPS (siehe Plan Abschnitt 2 — kein Serverless-Vendor-Lock-in).

## Aufgaben

1. **Ingestion-Endpoint**
   - Nimmt `RunResult`-Objekte entgegen (Typ aus dem Schema-Package, Briefing 02)
   - Validiert **jeden** eingehenden Datensatz gegen das Schema — ungültige Datensätze werden mit klarer Fehlermeldung abgelehnt, nicht stillschweigend verworfen oder halb gespeichert
   - Prüft die lokale Signatur (`signature`-Feld) gegen den `account_id`-Schlüssel — Datensätze mit ungültiger Signatur werden abgelehnt

2. **Speicherung**
   - Metadaten (Haupt-`RunResult` ohne Klartext-Content) in der primären Tabelle
   - `content_ref`-Zielinhalte (falls `content_opt_in: true`) in einer **separaten Tabelle mit eigenen, eingeschränkten Zugriffsrechten** (Entscheidung aus Plan Abschnitt 4) — nur ein dedizierter Blindvoting-Service-Account darf darauf lesend zugreifen, keine allgemeinen Backend-Prozesse

3. **Aggregationslogik**
   - Pro Skill, aufgeschlüsselt nach Kategorie: Median-Delta (mit vs. ohne Skill) + Konfidenzintervall + Sample-Size
   - **Nie ein globaler Einzelscore** — die API/DB-Views müssen die Kategorie-Aufschlüsselung strukturell erzwingen, nicht nur als UI-Konvention
   - Security-Delta separat aggregiert (severity-gewichtet), nicht in den Erfolgs-Score verrechnet

4. **Reputationsgewichtung**
   - Neue Accounts (kurze Historie) fließen mit Gewicht nahe 0 in die Aggregation ein, Gewicht steigt mit Kontohistorie über Zeit
   - `isolation_tier` fließt als weiterer Gewichtungsfaktor ein (Tier A > B > C), nach demselben Prinzip wie der Build-Hash-Abgleich
   - `cli_build_hash`-Abgleich: Ergebnisse von unmodifizierten, offiziell veröffentlichten CLI-Versionen höher gewichten als von selbstkompilierten Versionen

5. **Anomalie-Flagging**
   - Accounts mit auffällig perfekter Erfolgsrate über heterogene Kategorien hinweg markieren
   - Auffällig viele Uploads für denselben Skill vom selben Account markieren
   - Geflaggte Datensätze werden nicht automatisch gelöscht, sondern mit niedrigerem Gewicht in die Aggregation einbezogen und für manuelle Prüfung sichtbar gemacht (Grundlage für Phase 6)

6. **Öffentliche API für Rohdaten-Export**
   - Read-only Endpoint, der aggregierte (nicht die rohen Klartext-Inhalte) Daten als CSV/JSON exportiert — Grundlage für die im Plan geforderte Nachrechenbarkeit (Abschnitt 7, Vertrauensprinzip)

## Akzeptanzkriterien

- [ ] Ingestion-Endpoint lehnt einen Datensatz mit fehlerhafter Signatur ab (Testfall: manipuliertes `RunResult` mit unveränderter, aber jetzt ungültiger Signatur)
- [ ] Ingestion-Endpoint lehnt einen Datensatz ab, der gegen das Schema aus Briefing 02 verstößt (z.B. `security_delta` gesetzt bei `category: marketing`)
- [ ] Aggregations-Query für einen Skill liefert Ergebnisse **pro Kategorie getrennt**, kein einzelner Gesamtwert ist über die API abrufbar
- [ ] Ein frisch angelegter Test-Account mit 50 "perfekten" Uploads für denselben Skill wird vom Anomalie-Flagging markiert
- [ ] Zugriff auf die `content_ref`-Tabelle ist über einen normalen Backend-DB-User nachweislich nicht möglich (z.B. Query schlägt mit Permission-Fehler fehl)
- [ ] Export-Endpoint liefert nur aggregierte Werte, keine einzelnen Klartext-Inhalte

## Explizit NICHT Teil dieser Aufgabe

- Kein Marktplatz-Frontend (Phase 4, separates Briefing)
- Keine Blindvoting-Voting-UI (Phase 7) — nur die Speicher-Infrastruktur dafür (Punkt 2) wird hier schon vorbereitet
- Kein CLI-seitiger Code (Briefing 03)

**Geschätzter Aufwand:** 2 Wochen.
