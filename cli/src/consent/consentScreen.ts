import prompts from "prompts";
import pc from "picocolors";

const TRANSMITTED_FIELDS = [
  "skill_id, account_id (pseudonym), signature",
  "category, size_bucket, isolation_tier",
  "with_skill/without_skill: success, tokens, duration_sec",
  "security_delta (only counts per severity level, never the full scan report)",
  "category_metrics (category-specific numbers, never free text)",
  "run_id, order_randomized, timestamp, claude_version, cli_version, cli_build_hash",
];

export interface ConsentDecision {
  standardConsentGiven: boolean;
  contentOptIn: boolean;
}

/**
 * Shows the one-time consent screen (only on the very first run, briefing
 * point 8). Two separate questions — standard consent is a prerequisite to
 * continue, `content_opt_in` (blind-voting content) is a deliberately
 * separate, ADDITIONAL opt-in and is never auto-confirmed.
 */
export async function showConsentScreen(): Promise<ConsentDecision> {
  console.log(pc.bold("\nSkillDiff — one-time consent\n"));
  console.log("After every comparison run, these fields are transmitted automatically:");
  for (const field of TRANSMITTED_FIELDS) {
    console.log(`  • ${field}`);
  }
  console.log(
    pc.dim(
      "\nNever transmitted: raw code, prompt content, your project's file contents.\n",
    ),
  );

  const { standardConsentGiven } = await prompts({
    type: "confirm",
    name: "standardConsentGiven",
    message: "Transmit this metadata automatically after every run?",
    initial: false,
  });

  console.log(
    pc.dim(
      "\nAdditionally, SEPARATE from the consent above: community blind voting\n" +
        "(Phase 7) wants to compare anonymized output pairs (your actual text/code\n" +
        "output). This is a separate opt-in, not included in the above.\n",
    ),
  );

  const { contentOptIn } = await prompts({
    type: "confirm",
    name: "contentOptIn",
    message: "Additionally participate in community blind voting with your output (content_opt_in)?",
    initial: false,
  });

  return {
    standardConsentGiven: Boolean(standardConsentGiven),
    contentOptIn: Boolean(contentOptIn),
  };
}
