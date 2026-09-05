import type { IsolationTier } from "@marktplatz/schema";

export interface LinkCapability {
  /** Echte POSIX-Symlinks funktionieren (z.B. macOS/Linux, oder Windows mit Developer Mode). */
  symlink: boolean;
  /** NTFS-Junction funktioniert (Windows-Fallback für Verzeichnisse, kein Admin/Dev-Mode nötig). */
  junction: boolean;
}

export interface TierDetectionResult {
  tier: IsolationTier;
  /** Menschenlesbare Begründung, warum genau diese Stufe erkannt wurde (für Logs/Debugging). */
  begruendung: string;
  dockerVerfuegbar: boolean;
  linkFaehigkeit: LinkCapability;
}

/**
 * Wie eine Skill-Quelle für eine Bedingung ("mit_skill"/"ohne_skill")
 * sichtbar gemacht bzw. verborgen wird.
 */
export type Bedingung = "mit_skill" | "ohne_skill";
