# Task für Claude Code: Skill-A/B-Marktplatz — Phase 4 (Marktplatz-Frontend)

**Voraussetzung:** Briefing 04 (Backend) ist fertig — das Frontend konsumiert dessen Aggregations-API, baut nichts davon selbst.
**Kann parallel laufen zu:** Briefing 06 (Vorbefüllung) — Frontend kann gegen die Backend-API entwickelt werden, während parallel echte/synthetische Startdaten eingespeist werden.
**Vollständiger Kontext:** `skill-ab-marktplatz-plan.md`, insbesondere Abschnitt 5 (Bewertungsdimensionen) und Abschnitt 7 (Restrisiken — hier besonders: Vertrauensprinzip über Nachvollziehbarkeit).

## Ziel dieser Phase

Die öffentliche Ansicht des Marktplatzes: pro Skill sichtbar machen, ob und wie sehr er wirklich hilft — inklusive der Unsicherheit in den Daten, nicht nur einer beschönigten Zahl.

## Aufgaben

1. **Skill-Detailseite: Delta-Anzeige statt Absolutwert**
   - Zeigt "mit Skill X vs. ohne", nicht "Skill X hat Score 8.4/10"
   - Getrennt nach Kategorie (Coding/Debugging, Refactoring, Doku, Marketing) — **niemals ein aggregierter Gesamtscore über alle Kategorien hinweg**, das widerspricht der Backend-API-Struktur aus Briefing 04 ohnehin strukturell
   - Konfidenzintervall sichtbar neben dem Median-Delta, nicht nur der Mittelwert allein

2. **Sample-Size-Transparenz**
   - Skills mit weniger als 20 Runs in einer Kategorie werden explizit als "noch zu wenig Daten" markiert, keine numerische Bewertung wird für diese Kategorie prominent angezeigt
   - Sample-Size-Zahl ist immer direkt neben jeder Kennzahl sichtbar, nicht nur beim Hovern/in einem Tooltip versteckt

3. **Isolationsstufen-Aufschlüsselung**
   - Pro Skill sichtbar, wie viele der zugrundeliegenden Runs Tier A/B/C hatten (siehe Plan Abschnitt 3.2) — z.B. als kleiner gestapelter Balken oder Prozentangabe
   - Nicht nur in der Gesamtaggregation versteckt

4. **Account-Diversität als eingebautes Warnsignal**
   - Pro Skill sichtbar: Anzahl unterschiedlicher Accounts, die zu den angezeigten Daten beigetragen haben (z.B. "Daten von 3 Accounts" vs. "von 200 Accounts")
   - Bei niedriger Diversität (Schwellenwert konfigurierbar, z.B. <5 Accounts) ein sichtbarer Hinweis, unabhängig von der Sample-Size — viele Runs von wenigen Accounts sind ein anderes Risiko als wenige Runs insgesamt

5. **Kategorie-Filter & Übersichtsseite**
   - Marktplatz-Übersicht filterbar nach Kategorie, nicht nur Skill-für-Skill durchsuchbar
   - Skills ohne ausreichende Daten in einer Kategorie werden in der gefilterten Ansicht dieser Kategorie nicht mit einer irreführenden Zahl gelistet

6. **Rohdaten-Export sichtbar verlinkt**
   - Link zum Export-Endpoint aus Briefing 04 direkt auf jeder Skill-Detailseite — Nachvollziehbarkeit ist ein Kernprinzip des Projekts (Plan Abschnitt 1: "niemand misst echten Nutzen"), nicht ein Nice-to-have im Footer versteckt
   - Aggregationslogik selbst wird als Open-Source-Referenz verlinkt (Repo-Link), nicht nur behauptet

7. **Startdaten-Kennzeichnung**
   - Skills, deren Daten überwiegend aus der Vorbefüllung (Briefing 06) stammen, sind visuell klar als "Startdaten, kleine Sample-Size" markiert, nicht ununterscheidbar von echten Community-Daten

## Akzeptanzkriterien

- [ ] Keine Seite im Frontend zeigt einen Skill mit einer einzelnen Gesamtzahl ohne Kategorie-Kontext
- [ ] Ein Skill mit 8 Runs in einer Kategorie zeigt sichtbar "noch zu wenig Daten", kein numerischer Prozentwert wird prominent dargestellt
- [ ] Isolationsstufen- und Account-Diversitäts-Anzeige sind auf jeder Skill-Detailseite sichtbar, nicht nur über einen zusätzlichen Klick erreichbar
- [ ] Export-Link funktioniert und liefert dieselben Rohdaten, die der angezeigten Aggregation zugrunde liegen (Stichprobe manuell nachrechnen)
- [ ] Mobile-taugliches Layout (Marktplatz wird vermutlich auch von unterwegs durchsucht) — Kategorie-Filter und Delta-Anzeige bleiben auf schmalen Viewports verständlich

## Explizit NICHT Teil dieser Aufgabe

- Kein Blindvoting-UI (Phase 7, eigenes Briefing)
- Kein Login/Auth-System für Skill-Autoren — reine Leseansicht in dieser Phase
- Keine Änderungen an der Aggregationslogik selbst (Briefing 04) — nur Konsum der bestehenden API

**Geschätzter Aufwand:** 2-3 Wochen.
