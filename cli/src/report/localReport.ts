import pc from "picocolors";
import type { Laufergebnis } from "@marktplatz/schema";

function prozentDelta(mit: number, ohne: number): string {
  if (ohne === 0) return mit === 0 ? "±0%" : "n/a";
  const delta = ((ohne - mit) / ohne) * 100;
  const vorzeichen = delta >= 0 ? "-" : "+"; // "weniger" bei positivem delta
  return `${vorzeichen}${Math.abs(Math.round(delta))}%`;
}

function erfolgsText(erfolg: boolean | null): string {
  if (erfolg === null) return "kein Prüfkommando (n/a)";
  return erfolg ? "erfolgreich" : "fehlgeschlagen";
}

/**
 * Sofortiger lokaler Eigennutzen (Briefing Punkt 7) — unabhängig vom
 * Marktplatz-Upload zeigt das CLI direkt in der Konsole, was der Skill
 * für DIESEN Nutzer gebracht hat.
 */
export function zeigeLokalesDelta(params: { skillId: string; mitSkill: Laufergebnis; ohneSkill: Laufergebnis }): void {
  const { skillId, mitSkill, ohneSkill } = params;
  console.log(pc.bold(`\nErgebnis für Skill "${skillId}":\n`));
  console.log(`  Tokens:     mit ${mitSkill.tokens} / ohne ${ohneSkill.tokens}  (${prozentDelta(mitSkill.tokens, ohneSkill.tokens)} Tokens)`);
  console.log(`  Dauer:      mit ${mitSkill.dauer_sek}s / ohne ${ohneSkill.dauer_sek}s  (${prozentDelta(mitSkill.dauer_sek, ohneSkill.dauer_sek)} Zeit)`);
  console.log(`  Erfolg mit: ${erfolgsText(mitSkill.erfolg)}`);
  console.log(`  Erfolg ohne: ${erfolgsText(ohneSkill.erfolg)}`);
  console.log();
}
