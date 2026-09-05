import type { IsolationTierBreakdown } from "../api/types.js";

const TIER_LABEL: Record<keyof IsolationTierBreakdown, string> = {
  A: "Tier A (container)",
  B: "Tier B (symlink/junction)",
  C: "Tier C (best effort)",
};

/**
 * Stacked bar showing how many of a category's runs had each isolation
 * tier (briefing point 3) — shown per skill+category, not buried only in
 * an overall aggregate.
 */
export function IsolationTierBar({ breakdown }: { breakdown: IsolationTierBreakdown }) {
  const total = breakdown.A + breakdown.B + breakdown.C;
  if (total === 0) {
    return <p className="isolation-bar__empty">No isolation-tier data yet.</p>;
  }

  const tiers: Array<keyof IsolationTierBreakdown> = ["A", "B", "C"];

  return (
    <div className="isolation-bar" role="img" aria-label={`Isolation tiers: ${tiers.map((t) => `${TIER_LABEL[t]} ${Math.round((breakdown[t] / total) * 100)}%`).join(", ")}`}>
      <div className="isolation-bar__track">
        {tiers.map((tier) =>
          breakdown[tier] > 0 ? (
            <div
              key={tier}
              className={`isolation-bar__segment isolation-bar__segment--${tier}`}
              style={{ width: `${(breakdown[tier] / total) * 100}%` }}
              title={`${TIER_LABEL[tier]}: ${breakdown[tier]} runs`}
            />
          ) : null,
        )}
      </div>
      <ul className="isolation-bar__legend">
        {tiers.map((tier) => (
          <li key={tier}>
            <span className={`isolation-bar__swatch isolation-bar__swatch--${tier}`} aria-hidden="true" />
            {TIER_LABEL[tier]}: {breakdown[tier]} ({Math.round((breakdown[tier] / total) * 100)}%)
          </li>
        ))}
      </ul>
    </div>
  );
}
