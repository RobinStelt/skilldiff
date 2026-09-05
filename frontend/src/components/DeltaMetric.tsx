import type { DeltaStats } from "../api/types.js";
import { hasEnoughData } from "../api/types.js";

export interface DeltaMetricProps {
  label: string;
  stats: DeltaStats;
  /** Formats the raw delta number for display, e.g. "+18%" or "-3200 tokens". */
  format: (value: number) => string;
  /** Shown when `stats.medianDelta` is null even though sample size is sufficient (e.g. no success signal for this category). */
  unavailableReason?: string;
}

/**
 * One metric's delta, always paired with its sample size and confidence
 * interval right next to it — never hidden in a tooltip (briefing point 2).
 * Below `MIN_SAMPLE_SIZE`, no numeric value is shown prominently at all;
 * "not enough data yet" replaces it (acceptance criterion).
 */
export function DeltaMetric({ label, stats, format, unavailableReason }: DeltaMetricProps) {
  const enough = hasEnoughData(stats.sampleSize);

  return (
    <div className="delta-metric" data-testid={`delta-metric-${label}`}>
      <span className="delta-metric__label">{label}</span>
      {!enough ? (
        <span className="delta-metric__insufficient" role="status">
          Not enough data yet (n={stats.sampleSize})
        </span>
      ) : stats.medianDelta === null ? (
        <span className="delta-metric__insufficient" role="status">
          {unavailableReason ?? "No signal for this category"}
        </span>
      ) : (
        <span className="delta-metric__value">
          <strong>{format(stats.medianDelta)}</strong>
          {stats.confidenceInterval && (
            <span className="delta-metric__ci">
              {" "}
              (95% CI: {format(stats.confidenceInterval.low)} to {format(stats.confidenceInterval.high)})
            </span>
          )}
          <span className="delta-metric__n"> · n={stats.sampleSize}</span>
        </span>
      )}
    </div>
  );
}
