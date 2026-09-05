# Task für Claude Code: Skill-A/B-Marktplatz — Phase 5 (Vorbefüllung & Kaltstart)

**Voraussetzung:** Briefing 03 (CLI-Kern) und Briefing 04 (Backend) sind fertig — diese Phase nutzt beide, produziert selbst kein neues Produktfeature.
**Kann parallel laufen zu:** Briefing 05 (Frontend).
**Vollständiger Kontext:** `skill-ab-marktplatz-plan.md` Abschnitt 6 (Roadmap) sowie das recherchierte Skill-Katalog-Dokument mit ca. 200 Skills aus früheren Gesprächen (falls im selben Ordner/Projekt abgelegt, sonst bei Robin erfragen).

## Ziel dieser Phase

Der Marktplatz zeigt bei Launch nicht "0 Daten" — ohne dabei den Eindruck zu erwecken, es handle sich bereits um echte Community-Daten.

## Aufgaben

1. **Skill-Auswahl für die Vorbefüllung**
   - Aus dem recherchierten Katalog eine Teilmenge auswählen, die alle Kategorien abdeckt (Coding/Debugging, Refactoring, Doku, Marketing/Persona) — nicht nur die bekanntesten/größten Skills, sonst ist die Startansicht des Marktplatzes einseitig
   - Realistische Auswahlgröße: 15-20 Skills, nicht alle 200 — Qualität der Testläufe geht vor Abdeckung in dieser Phase

2. **Testaufgaben pro Skill**
   - Für jeden ausgewählten Skill 3-5 realistische, unterschiedliche Aufgaben entwerfen (nicht dieselbe Aufgabe wiederholt — das widerspricht dem Grundprinzip "viele unterschiedliche Aufgaben" aus Phase 1 des Hauptplans, auch wenn hier nur ein einziger Account testet)
   - Aufgaben so wählen, dass sie in den passenden `category_metrics` auswertbar sind (siehe Schema aus Briefing 02) — z.B. bei Coding-Skills eine Aufgabe mit vorhandener Testsuite, nicht ein Greenfield-Snippet ohne Erfolgskriterium

3. **Läufe durchführen und hochladen**
   - CLI aus Briefing 03 nutzen wie ein normaler Teilnehmer — kein Sonderpfad, keine manuelle Direkteinspeisung in die Datenbank unter Umgehung der Validierung aus Briefing 04
   - Dokumentieren, mit welcher Isolationsstufe (Tier A/B/C) die Läufe tatsächlich passiert sind — realistisch das, was auf der verwendeten Maschine verfügbar ist, nicht künstlich auf Tier A forcieren, wenn das nicht der reale Fall wäre

4. **Kennzeichnung als Startdaten**
   - Der für diese Läufe verwendete `account_id` wird im Backend als "bekannter Startdaten-Account" markiert (eigenes Flag, kein Missbrauch des bestehenden Reputationssystems aus Briefing 04)
   - Frontend (Briefing 05) nutzt dieses Flag für die visuelle Kennzeichnung — stellt sicher, dass beide Seiten dasselbe Flag verwenden, keine Doppelentwicklung

5. **Dokumentation der Methode**
   - Kurzes Dokument, das festhält: welche Skills, welche Aufgaben, welches Datum, welche Isolationsstufe — damit spätere echte Community-Daten sauber von den Startdaten unterschieden werden können und die Methode nachvollziehbar bleibt (passt zum Transparenzprinzip aus Plan Abschnitt 1)

## Akzeptanzkriterien

- [ ] Mindestens 15 Skills aus mindestens 3 verschiedenen Kategorien haben je mindestens 3 Runs in der Datenbank
- [ ] Alle Vorbefüllungs-Runs sind über den regulären CLI-Pfad eingegangen, nicht per direktem DB-Insert
- [ ] Frontend zeigt für diese Skills sichtbar "Startdaten" an (Zusammenspiel mit Briefing 05 testen, nicht isoliert)
- [ ] Dokumentation der verwendeten Aufgaben und Methodik liegt vor und ist für Dritte nachvollziehbar

## Explizit NICHT Teil dieser Aufgabe

- Keine Änderungen an CLI, Backend oder Frontend selbst — reine Nutzung der bestehenden Werkzeuge
- Keine Fake-Diversität vortäuschen (z.B. mehrere Accounts für dieselbe Person anlegen) — ein einzelner, klar gekennzeichneter Startdaten-Account ist ehrlicher als vorgetäuschte Vielfalt

**Geschätzter Aufwand:** läuft parallel zu Phase 4, keine eigene Wochenschätzung im Hauptplan — grobe Richtgröße 1-1,5 Wochen für Auswahl, Durchführung und Dokumentation.
