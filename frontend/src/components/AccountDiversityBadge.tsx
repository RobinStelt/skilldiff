import { hasLowAccountDiversity, LOW_ACCOUNT_DIVERSITY_THRESHOLD } from "../api/types.js";

/**
 * Visible independently of sample size (briefing point 4): many runs from
 * few accounts is a different risk than few runs overall, and gets flagged
 * even when the sample size itself looks healthy.
 */
export function AccountDiversityBadge({ distinctAccountCount }: { distinctAccountCount: number }) {
  const low = hasLowAccountDiversity(distinctAccountCount);
  return (
    <div className={`account-diversity${low ? " account-diversity--low" : ""}`} role="status">
      Data from {distinctAccountCount} account{distinctAccountCount === 1 ? "" : "s"}
      {low && (
        <span className="account-diversity__warning">
          {" "}
          — below {LOW_ACCOUNT_DIVERSITY_THRESHOLD} contributing accounts, low diversity
        </span>
      )}
    </div>
  );
}
