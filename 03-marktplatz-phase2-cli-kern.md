# Task für Claude Code: Skill-A/B-Marktplatz — Phase 2 (CLI-Kern)

**Voraussetzung:** Briefing 01 (Hook-Gating-Modul) und Briefing 02 (Schema-Package) sind fertig, getestet und für dieses Projekt importierbar.
**Vollständiger Kontext:** `skill-ab-marktplatz-plan.md`, insbesondere Abschnitt 3 (Kontrolllauf-Isolation) und Abschnitt 5 (Bewertungsdimensionen).

## Ziel dieser Phase

Das eigentliche Werkzeug, das Nutzer installieren und ausführen: `npx skill-ab run`.

## Aufgaben

1. **Run-Orchestrierung**
   - Nutzer gibt Skill-ID + Arbeitsverzeichnis/Aufgabe an
   - Reihenfolge (mit/ohne Skill zuerst) wird randomisiert
   - Beide Läufe passieren in frischen, voneinander isolierten Sessions — kein gemeinsamer Kontext zwischen den beiden Bedingungen

2. **Gestufte Kontrolllauf-Isolation** (siehe Plan-Abschnitt 3.2 für die vollständige Tabelle)
   - Beim Start automatisch erkennen, welche Isolationsstufe verfügbar ist:
     - **Tier A:** Docker/Podman vorhanden → Run in frischem, minimalem Container, nur Task-Arbeitsverzeichnis + (im "mit Skill"-Fall) der eine erlaubte Skill-Ordner gemountet
     - **Tier B:** Kein Container, aber Skill-Quelle lässt sich physisch außerhalb des Arbeitsverzeichnisses platzieren (nutzt das Gating-Modul aus Briefing 01) + isoliertes `$HOME` → mittlere Stufe
     - **Tier C:** Weder A noch B möglich → Best-Effort-Lauf, lokal weiterhin nützlich, aber klar als niedrigste Vertrauensstufe markiert
   - Erkannte Stufe wird ins `isolation_tier`-Feld des Schemas (aus Briefing 02) geschrieben — **nicht raten, sondern tatsächlich prüfen** (z.B. `docker info` erfolgreich? Sandbox-Verhalten testweise verifizieren?)

3. **Kein manuelles Rating, kein Wiederholungszwang**
   - Erfolg wird ausschließlich automatisiert gemessen (Exit-Code von Test-/Lint-/Build-Kommando, das der Nutzer angibt oder das Tool aus dem Projekttyp erkennt) — kein Prompt an den Nutzer für eine Bewertung
   - Genau 1 Durchlauf pro Bedingung, keine Mehrfachausführung

4. **Erzwungener Upload, kein Cherry-Picking**
   - Nach Abschluss beider Bedingungen wird das Ergebnis automatisch übertragen — kein manueller Bestätigungsschritt, der selektives Hochladen ermöglicht
   - Ausnahme: der Consent-Screen beim allerersten Lauf (einmalig, nicht pro Run)

5. **Security-Scan-Integration**
   - Nach jedem Run automatisch passenden SAST-Scanner anhand der erkannten Sprache wählen (Semgrep als sprachübergreifende Basis, `npm audit`/`bandit` als Ergänzung wo zutreffend)
   - Nur Finding-Deltas (Anzahl pro Severity-Stufe) ins Schema schreiben, niemals den vollständigen Scan-Report
   - Bei nicht-code-erzeugenden Kategorien (`marketing`, `doku` ohne Codeanteil): `security_delta: null`

6. **Kategoriespezifische Metriken erfassen**
   - Automatische Kategorieerkennung (Dateitypen, Projektstruktur) — nicht vom Nutzer manuell eintragbar
   - Je nach erkannter Kategorie die passenden `category_metrics`-Felder aus dem Schema befüllen (siehe Briefing 02 / Plan Abschnitt 4)

7. **Sofortiger lokaler Eigennutzen**
   - Nach jedem abgeschlossenen Vergleich zeigt das CLI dem Nutzer sein eigenes Delta direkt in der Konsole (z.B. "Mit Skill X: 40% weniger Tokens, gleiche Erfolgsrate") — unabhängig vom Marktplatz-Upload

8. **Consent-Screen**
   - Nur beim ersten Lauf: zeigt exakt, welche Felder übertragen werden (Metadaten laut Schema, nie Rohcode oder Prompt-Inhalte)
   - Separates, zusätzliches Opt-in für `content_opt_in` (Blindvoting), klar getrennt vom Standard-Consent

## Akzeptanzkriterien

- [ ] `npx skill-ab run --skill <id> --dir <pfad>` führt beide Bedingungen aus und zeigt lokal ein Delta an
- [ ] Erkannte Isolationsstufe stimmt mit der tatsächlichen Umgebung überein (manuell an 3 Testmaschinen mit unterschiedlicher Docker-Verfügbarkeit verifizieren)
- [ ] Kein Pfad im Code fragt den Nutzer nach einem 1-5-Rating oder einer subjektiven Einschätzung
- [ ] Ein abgebrochener Lauf (z.B. Ctrl+C nach Bedingung 1) lädt nichts hoch — Ergebnis erst nach beiden vollständigen Bedingungen
- [ ] Security-Scan läuft nur bei Kategorien mit Code-Artefakt, `security_delta` ist bei reinen Text-Kategorien `null`
- [ ] Ausgabe des Tools validiert erfolgreich gegen das Schema-Package aus Briefing 02, bevor sie an den (noch nicht existierenden) Backend-Endpoint gesendet wird — Versand selbst kann in dieser Phase gegen einen Mock-Endpoint laufen

## Explizit NICHT Teil dieser Aufgabe

- Kein echter Backend-Ingestion-Endpoint (Phase 3, separates Briefing)
- Kein Blindvoting-UI (Phase 7)
- Kein Reputationssystem, keine Anomalie-Erkennung (Phase 3)

**Geschätzter Aufwand:** 3 Wochen.
