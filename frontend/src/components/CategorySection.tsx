import type { SkillCategoryDetail } from "../api/types.js";
import { DeltaMetric } from "./DeltaMetric.js";
import { IsolationTierBar } from "./IsolationTierBar.js";
import { AccountDiversityBadge } from "./AccountDiversityBadge.js";
import { SeedDataBadge } from "./SeedDataBadge.js";

const CATEGORY_LABEL: Record<string, string> = {
  debugging: "Debugging",
  feature: "Feature work",
  refactoring: "Refactoring",
  docs: "Documentation",
  marketing: "Marketing",
  other: "Other",
};

function formatPercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${Math.round(value * 100)}%`;
}
function formatTokens(value: number): string {
  return `${value >= 0 ? "+" : ""}${Math.round(value)} tokens`;
}
function formatSeconds(value: number): string {
  return `${value >= 0 ? "+" : ""}${Math.round(value)}s`;
}
function formatSeverityScore(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)} severity points`;
}

/**
 * One category's complete, self-contained delta view. Deliberately never
 * combined with another category's numbers on this page or any other —
 * there is no cross-category aggregate anywhere in this app (briefing
 * point 1 / acceptance criterion 1).
 */
export function CategorySection({ detail }: { detail: SkillCategoryDetail }) {
  return (
    <section className="category-section" aria-labelledby={`category-${detail.category}-heading`}>
      <header className="category-section__header">
        <h3 id={`category-${detail.category}-heading`}>{CATEGORY_LABEL[detail.category] ?? detail.category}</h3>
        {detail.seedDataMajority && <SeedDataBadge />}
      </header>

      <div className="category-section__metrics">
        <DeltaMetric
          label="Success rate"
          stats={detail.successDelta}
          format={formatPercent}
          unavailableReason="No automated success signal for this category"
        />
        <DeltaMetric label="Tokens" stats={detail.tokensDelta} format={formatTokens} />
        <DeltaMetric label="Duration" stats={detail.durationDelta} format={formatSeconds} />
        {detail.securityDelta ? (
          <DeltaMetric label="Security findings" stats={detail.securityDelta} format={formatSeverityScore} />
        ) : (
          <div className="delta-metric" data-testid="delta-metric-Security findings">
            <span className="delta-metric__label">Security findings</span>
            <span className="delta-metric__insufficient" role="status">
              Not applicable — this category doesn't produce a code artifact
            </span>
          </div>
        )}
      </div>

      <div className="category-section__transparency">
        <IsolationTierBar breakdown={detail.isolationTierBreakdown} />
        <AccountDiversityBadge distinctAccountCount={detail.distinctAccountCount} />
      </div>

      <a className="category-section__export" href={detail.exportUrl}>
        Export raw data for this category ↓
      </a>
    </section>
  );
}
