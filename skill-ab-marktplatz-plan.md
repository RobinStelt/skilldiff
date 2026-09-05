# Skill-A/B-Marktplatz — Projektplan

**Status:** Konzept fertig durchdacht, Kernrisiken lokal verifiziert, bereit für Phase 1.

---

## 1. Was wir bauen

Ein Marktplatz, der zeigt, ob ein Claude-Skill **tatsächlich hilft** — nicht wie viele GitHub-Stars er hat oder ob er einen Security-Scan bestanden hat (das machen andere Anbieter schon, siehe Marktanalyse unten).

**Funktionsprinzip:** Ein CLI-Tool lässt Nutzer ihre eigene, frei gewählte Aufgabe automatisch zweimal laufen — einmal mit einem bestimmten Skill geladen, einmal ohne. Beide Ergebnisse werden zwingend gemeinsam hochgeladen (kein Cherry-Picking). Der Marktplatz aggregiert diese Vergleiche über viele Nutzer hinweg und zeigt pro Skill: *"bringt das wirklich etwas, und wie sicher können wir uns da sein?"*

**Warum das eine Lücke füllt:** Bestehende Marktplätze (SkillsClaude, Agensi, ClaudeMarketplaces u.a.) bewerten nach Stars, Sicherheitsscans oder Kuration — niemand misst echten Nutzen aus echter Nutzung. Das ist strukturell auch schwer nachzuliefern, weil es eine eigene Runtime mit Telemetrie braucht, die wir mit diesem Projekt ohnehin bauen.

---

## 2. Grundsatzentscheidungen

| Entscheidung | Wahl | Warum |
|---|---|---|
| Tech-Stack CLI | Node.js/TypeScript | — |
| Architektur | Eigenständiges CLI-Tool | Kein harter Kopplungszwang an das separate [[skill-matching-hook]]-Projekt, nur ein kleiner Teil davon wird wiederverwendet (siehe Abschnitt 4) |
| Anreizmodell | Reine Reputation/Sichtbarkeit | Kein Zahlungssystem im MVP — vermeidet rechtliche/steuerliche Komplexität, Revenue-Share (wie bei Agensi: 80/20-Split) ist später nachrüstbar |
| Backend-Hosting | Eigener VPS | Volle Kontrolle über Datenhaltung, kein Vendor-Lock-in |
| Lizenz | MIT/Apache für das CLI | Vertrauen wie bei etablierten Skill-Marktplätzen |

---

## 3. Kontrolllauf-Isolation — der technische Kern

Die zentrale Herausforderung: Wenn ein Skill "ausgeschaltet" ist, darf das Modell dessen Inhalt nicht trotzdem sehen oder nutzen können — sonst ist der Vergleich wertlos.

### 3.1 Was wir lokal getestet haben

Vier Tests mit zwei Diagnose-Skills, per Symlink an-/abschaltbar:

| Test | Ergebnis |
|---|---|
| Nur verlinkte Skills erscheinen in der Skill-Liste | ✅ bestanden |
| Rescan innerhalb derselben Session nach Symlink-Wechsel | ✅ bestanden — kein Stale-Cache |
| Rescan bei neuer Session nach Symlink-Wechsel | ✅ bestanden — sofort aktueller Zustand |
| Kontrolllauf: kann das Modell den un-verlinkten Skill trotzdem lesen? | ⚠️ **Ja, wenn er im erreichbaren Verzeichnisbaum liegt** — "nicht registriert" ≠ "nicht zugreifbar", ein Skill der als Nachbarordner im Dateibaum liegt, kann per Bash/Read direkt gelesen werden |

**Zweiter Test (Nachschärfung von Punkt 4):** Wenn die Skill-Quelle physisch außerhalb des Arbeitsverzeichnisses liegt (z.B. `/tmp/skill-vault/` statt Nachbarordner), greift eine bereits aktive, sitzungsweite Verzeichnis-Sandbox und blockiert den Zugriff hart auf Tool-Ebene — bestätigt in 4 Varianten, inklusive expliziter Aufforderung, das ganze Dateisystem zu durchsuchen. **Wichtige Korrektur:** Nicht `--safe-mode`/isoliertes `$HOME` erzwingen das — diese lösen ein anderes Problem (siehe unten). Der eigentliche Schutz ist die Verzeichnis-Sandbox selbst.

**Offener Punkt:** Diese Sandbox wurde bisher nur in einer Cloud-/Container-Testumgebung beobachtet, nicht auf einer gewöhnlichen lokalen Installation. Deshalb bauen wir nicht darauf, sondern auf ein gestuftes Modell (3.2).

### 3.2 Gestufte Isolation statt Docker-Pflicht

Erste Idee war: jeder Run läuft in einem Docker-Container. Problem damit: **das schließt jeden Nutzer ohne Docker faktisch aus** — widerspricht unserem Grundprinzip "viele Nutzer mit unterschiedlichen Aufgaben schlägt einen Nutzer mit vielen Wiederholungen". Stattdessen erkennt das CLI automatisch die beste verfügbare Stufe:

| Tier | Bedingung | Isolationsmethode | Vertrauensgewicht |
|---|---|---|---|
| **A** | Docker/Podman verfügbar | Container-Isolation, Skill-Quelle nicht gemountet | höchstes |
| **B** | Kein Container, aber Sandbox-Verhalten erkennbar aktiv | Skill-Quelle physisch außerhalb des Arbeitsverzeichnisses + isoliertes `$HOME` | mittel |
| **C** | Weder noch | Bestmöglicher Best-Effort, lokal weiter nützlich (Eigennutzen bleibt) | niedrig/kaum gewichtet in der Aggregation |

Teilnahme ist auf jeder Stufe möglich — nur die Vertrauensgewichtung im Marktplatz unterscheidet sich. `isolation_tier` wird als Feld mit hochgeladen (siehe Schema) und fließt in die Reputationsgewichtung ein, genau wie der Build-Hash-Abgleich.

### 3.3 Was aus dem Hook-Projekt gebraucht wird

Nur ein kleiner Ausschnitt aus [[skill-matching-hook]], nicht das volle Matching-System:

**Gebraucht:**
- Symlink-Gating-Mechanismus, von außen (Skript/CLI) ansteuerbar, nicht nur interaktiv
- Programmatische Ansteuerbarkeit als Subprozess/Modul statt reinem `UserPromptSubmit`-Hook

**Nicht gebraucht** (spart Scope):
- Embedding-basiertes Matching, Difficulty-Scoring, Persona-Sonderbehandlung, Skill-Registry-Cache für Hunderte Skills — der Nutzer wählt den zu testenden Skill hier ja selbst

**Aufwand:** ca. 3-5 Tage am Hook-Projekt, bevor Phase 2 dieses Plans starten kann (entspricht Phase 3 der ursprünglichen Hook-Planung).

---

## 4. Datenschema

```jsonc
{
  // Identifikation
  "skill_id": "string",
  "account_id": "string",          // pseudonym, langfristig stabil
  "signature": "string",           // lokal signiert vor Upload — verhindert nachträgliche Fälschung der übertragenen Daten (verhindert NICHT Manipulation an der Quelle selbst)

  // Kontext
  "category": "debugging | feature | doku | refactoring | marketing | sonstige",
  "size_bucket": "klein | mittel | groß",   // automatisch aus Dateizahl/LOC abgeleitet
  "isolation_tier": "A | B | C",

  // Kern-Ergebnis, pro Bedingung
  "mit_skill":  { "erfolg": "bool|null", "tokens": "int", "dauer_sek": "int" },
  "ohne_skill": { "erfolg": "bool|null", "tokens": "int", "dauer_sek": "int" },

  // Sicherheit — nur befüllt, wenn ein Code-Artefakt entstand, sonst null
  "security_delta": {
    "mit_skill":  { "kritisch": "int", "hoch": "int", "mittel": "int", "niedrig": "int" },
    "ohne_skill": { "kritisch": "int", "hoch": "int", "mittel": "int", "niedrig": "int" }
  } ,  // | null

  // Kategoriespezifische Zusatzmetriken — final spezifiziert pro Kategorie, kein generisches Objekt
  "category_metrics": {
    "mit_skill":  { "...": "s. Tabelle unten, je nach category" },
    "ohne_skill": { "...": "..." }
  },  // | null wenn Kategorie keine automatisierte Zusatzmetrik hat (marketing, sonstige)

  // Subjektive Qualität — separates Opt-in, getrennt vom übrigen Consent
  "content_opt_in": "bool",
  "content_ref": "string|null",   // Verweis auf separat gespeicherten Klartext-Output in eigener DB-Tabelle mit eingeschränkten Zugriffsrechten, nur wenn opt_in=true

  // Betriebs-Metadaten
  "run_id": "string",   // Primärschlüssel des Eintrags
  "reihenfolge_randomisiert": "bool",
  "timestamp": "ISO8601",
  "claude_version": "string",
  "cli_version": "string",
  "cli_build_hash": "string"
}
```

**Kategoriespezifische `category_metrics`-Felder (final):**
| Kategorie | Felder |
|---|---|
| `debugging` | `test_coverage_pct: number`, `lint_errors: int`, `ci_status: "pass"\|"fail"\|"n/a"` |
| `feature` | `test_coverage_pct: number`, `lint_errors: int`, `ci_status: "pass"\|"fail"\|"n/a"` |
| `refactoring` | `cyclomatic_complexity_before: number`, `cyclomatic_complexity_after: number`, `diff_size_loc: int` |
| `doku` | `readability_score: number` |
| `marketing`, `sonstige` | `null` — kein automatisiertes Signal, Bewertung ausschließlich über Blindvoting (Phase 7) |

**Content-Hosting-Entscheidung:** `content_ref` verweist auf eine **separate Tabelle in derselben Datenbank**, nicht auf getrennte Infrastruktur — mit eigenen, strikt eingeschränkten Zugriffsrechten (nur der Blindvoting-Service liest daraus, kein allgemeiner DB-Zugriff auf diese Tabelle). Einfacher zu betreiben als getrennte Objektspeicher-Infrastruktur, bei vergleichbarer Trennschärfe für den MVP.

**Kein Regressions-Nachcheck.** Bewusst nicht Teil des Projekts — kein Feld, kein Folge-Datensatz, kein Trigger-Mechanismus. Regressionsrate ist damit auch aus den kategoriespezifischen Metriken für `debugging` entfernt (siehe Tabelle in Abschnitt 5).

---

## 5. Bewertungsdimensionen — vier unabhängige Metrik-Klassen

Kein Gesamtscore. Vier parallele, getrennt sichtbare Klassen, weil ein Skill in einer Dimension gut und in einer anderen schlecht sein kann:

**A) Universell (jede Kategorie, automatisch)**
- Erfolg/Korrektheit — Exit-Code, sonst `null` (kein manuelles Rating)
- Tokens & Dauer — Netto-Bilanz inklusive Kontext-Overhead durch das Laden der SKILL.md selbst

**B) Kategoriespezifisch**
| Kategorie | Zusatzmetrik |
|---|---|
| Coding/Debugging | Testabdeckung, Lint-/Type-Fehler, CI-Status |
| Refactoring | Zyklomatische Komplexität vorher/nachher, Diff-Größe vs. Verbesserung |
| Doku/Schreiben | Nutzer-Korrekturrate, Lesbarkeits-Score |
| Marketing/Persona | Kein automatisches Signal — nur Blindvoting (Klasse D) |

**C) Sicherheit** — unabhängig von "Erfolg", ein Skill kann die Aufgabe lösen und trotzdem Lücken einführen
- Automatisierter SAST-Scan (Semgrep sprachübergreifend, `npm audit`/`bandit` als Ergänzung) als Ground Truth, nicht Selbsteinschätzung
- Delta statt Absolutzahl, severity-gewichtet, gleicher Scanner in beiden Läufen zwingend
- Grenze: erkennt nur bekannte Musterklassen, keine Business-Logik-Lücken

**D) Subjektive Qualität** — kein Rating im CLI mehr, läuft komplett über Community-Blindvoting (Phase 7):
1. Anonymisierte Output-Paare, unabhängige Dritte stimmen blind ab — echte Drittperspektive statt Selbsteinschätzung, zieht zusätzlich Nutzer ohne eigenes CLI an
2. LLM-as-Judge nur als klar gekennzeichnetes Zusatzsignal, nie gleichgewichtet mit menschlichem Voting

**Designentscheidung dahinter:** 1 Durchlauf pro Bedingung statt 3 Wiederholungen — mehr unabhängige Nutzer mit unterschiedlichen Aufgaben liefern aussagekräftigere Daten als ein Nutzer, der dieselbe Aufgabe wiederholt, und senken die Teilnahmehürde von 6 auf 2 Runs. Konsequenz: Konsistenz/Varianz wird nicht pro Nutzer gemessen, sondern aggregiert über viele Run-Paare in Phase 3 (Teil der Konfidenzintervall-Berechnung).

---

## 6. Roadmap

| Phase | Inhalt | Dauer | Parallelisierbar mit |
|---|---|---|---|
| 0 | Grundsatzentscheidungen, Hook-Ausschnitt fertigstellen | 3-5 Tage | — |
| 1 | Protokoll & Datenschema final festlegen | 1 Woche | — |
| 2 | CLI-Kern: Run-Orchestrierung, gestufte Isolation, Security-Scan-Integration | 3 Wochen | Phase 3 (Start) |
| 3 | Backend: Ingestion, Aggregation, Reputationsgewichtung, Anomalie-Flagging | 2 Wochen | Phase 2 |
| 4 | Marktplatz-Frontend: Delta-Anzeige, Sample-Size, Tier-Transparenz | 2-3 Wochen | Phase 5 |
| 5 | Vorbefüllung mit eigenen Testläufen (200-Skill-Katalog), klar als Startdaten markiert | parallel zu 4 | Phase 4 |
| 6 | Anti-Gaming-Nachschärfung anhand echter Daten | laufend ab Launch | — |
| 7 | Community-Blindvoting (separates Opt-in für Klartext-Content) | 2 Wochen | Nachlauf, nach MVP-Launch |

**Gesamtdauer bis nutzbare Beta: ca. 7-8 Wochen**, Phase 7 nicht mitgerechnet (bewusster Nachlauf).

---

## 7. Bekannte Restrisiken

- **Client-Manipulation:** Open-Source-CLI kann gepatcht werden, um nur günstige Ergebnisse zu senden. Gemildert durch Build-Hash-Abgleich und lokale Signatur — nicht eliminierbar.
- **Selektive Aufgabenwahl:** Nutzer testet gezielt nur Aufgaben, bei denen der eigene Skill gut abschneidet. Gemildert durch Kategorie-Heterogenitäts-Check und sichtbare Account-Diversität pro Skill.
- **Kaltstart:** Kritische Masse an Nutzern nötig, bevor Daten aussagekräftig sind. Phase 5 mildert den ersten Eindruck, löst das Henne-Ei-Problem aber nicht vollständig. Siehe Abschnitt 7.1 für die Strategie, Teilnahme-Aufwand pro Nutzer zu senken — das eigentliche Henne-Ei-Problem (kritische Masse an Nutzern) bleibt davon unberührt.
- **Rechtliches:** Nutzer verarbeiten ggf. urheberrechtlich geschützten Firmencode über das CLI. Klare Nutzungsbedingungen nötig, die zusichern, dass keine Inhalte gespeichert werden — sonst bleiben gerade die wertvollsten Teilnehmer (echter Produktivcode) fern.
- **Plattform-Sandbox:** Durch das gestufte Isolationsmodell (Abschnitt 3.2) kein Blocker mehr — schwächer isolierte Ergebnisse fließen ein, nur schwächer gewichtet.

### 7.1 Kaltstart-Strategie: Teilnahme-Aufwand senken

Ergänzt während Phase 6 (Vorbefüllung), als der eigentliche Aufwand einer
echten Teilnahme (nicht nur "wie baue ich das CLI", sondern "warum würde
das jemand regelmäßig nutzen") konkret spürbar wurde. Kernfrage: Wie
bekommen wir Nutzer dazu, uns Daten zu liefern, ohne dass sie zu viel
Aufwand haben — insbesondere wenn sie im Alltag mehrere Skills gleichzeitig
nutzen?

**Was sich NICHT senken lässt, ohne das Grundprinzip aufzugeben:** Der
echte Gegenlauf ("ohne Skill") ist zwingend ein zweiter, unabhängiger
Claude-Aufruf derselben Aufgabe — das ist genau das, was das Projekt von
Stars/Sicherheitsscans anderer Marktplätze unterscheidet (Abschnitt 1:
"echte Nutzung, kein Rating"). Jede Kaltstart-Maßnahme reduziert Aufwand
*um* diesen Kern herum, nie den Kern selbst.

**Mehrere gleichzeitig genutzte Skills sind kein Blocker, aber ein
Unterschied je nach Herkunft der Skills:**
- Projekt-eigene Skills (im Repo eingecheckt, z.B. unter `.claude/skills/`)
  bleiben in beiden Bedingungen automatisch konstant — die Vergleichslogik
  kopiert das Arbeitsverzeichnis unverändert, nur der EINE getestete Skill
  wird ein-/ausgeblendet. Kein Zusatzaufwand, kein Konflikt.
- Persönliche/globale Skills werden durch die frische, leere
  `$HOME`-Isolation (Abschnitt 3.2) in beiden Bedingungen ausgeblendet —
  korrekt fürs Isolationsprinzip, bedeutet aber: ein Nutzer mit mehreren
  aktiven persönlichen Skills testet pro Lauf effektiv "nur Skill X" gegen
  "gar kein Skill", nicht "X zusätzlich zu meinen üblichen Skills" gegen
  "nur meine üblichen Skills". Gemildert (nicht gelöst) durch die
  Watchlist unten: senkt die Entscheidungshürde, ändert aber nichts an der
  Isolationslogik selbst.

**Umgesetzt (CLI, Phase 2, nach diesem Plan-Update):**
1. **Automatische Ableitung von `--check`** aus Projekt-Konventionen
   (`npm test`-Skript, `pytest`/`go.mod`/`Cargo.toml`) statt Pflichtangabe
   bei jedem Lauf. Bewusst konservativ: lieber kein Check als ein falsch
   geratener, der einen kaputten Lauf als "erfolgreich" ausgibt.
2. **Watchlist statt Pflichtangabe von `--skill`/`--skill-source`**
   (`skill-ab watch add/remove/list`): Bei mehreren registrierten Skills
   wählt `run` **genau einen** zufällig pro Aufruf — nie mehrere gleichzeitig
   (das würde den Effekt eines Bündels statt eines einzelnen Skills messen,
   Abschnitt 4/5). Verteilt Datenerhebung organisch über alle genutzten
   Skills, ohne dass der Nutzer das pro Lauf entscheiden muss.
3. **Asynchroner Schattenlauf statt synchronem Doppel-Lauf** (`skill-ab
   shadow install/uninstall`, opt-in pro Projekt): Ein `UserPromptSubmit`-Hook
   merkt sich Aufgabe, Verzeichnis-Snapshot und ob der beobachtete Skill
   gerade wirklich verlinkt ist (bestimmt die tatsächliche Bedingung des
   echten Vordergrund-Zugs, nicht angenommen). Ein `Stop`-Hook liest Tokens
   aus dem Transkript und die Zeit seit Prompt-Absenden — dann läuft der
   Gegenlauf für dieselbe Aufgabe still im Hintergrund, ohne den Nutzer zu
   blockieren. Bleibt bei den echten 2 `claude`-Aufrufen pro verglichener
   Aufgabe (nicht 3) — kein Transkript-Parsing für den Gegenlauf nötig, nur
   für die Live-Zug-Messung, mit ehrlichem Abbruch statt erfundener Nullen,
   falls das nicht gelingt. Details/Grenzen: `cli/README.md`, "Shadow mode".
**Noch nicht umgesetzt:**
4. **Sampling statt jeder Aufgabe:** Nicht jeder Lauf wird verglichen,
   sondern nur eine Stichprobe (z.B. jede 5.–10. Aufgabe) — über viele
   Nutzer/Sessions kommt trotzdem genug Datenvolumen zusammen, der
   einzelne Nutzer merkt kaum etwas vom Mehraufwand.

---

## 8. Offene Fragen

Alle drei ursprünglich offenen Punkte sind geklärt:
- ✅ `category_metrics`-Felder final spezifiziert (Abschnitt 4)
- ✅ Regressions-Nachcheck bewusst gestrichen, kein Bestandteil des Projekts
- ✅ Content-Hosting: gleiche Datenbank, separate Tabelle mit eingeschränkten Zugriffsrechten (Abschnitt 4)

Aktuell keine offenen Design-Fragen mehr — der Plan ist bereit für Phase 0/1.
