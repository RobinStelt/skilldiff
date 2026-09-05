export interface WeightedValue {
  value: number;
  weight: number;
}

/**
 * Weighted median: sort by value, walk the cumulative weight, return the
 * value where the running total first reaches half the total weight.
 * Falls back to the unweighted median when all weights are equal.
 */
export function weightedMedian(values: readonly WeightedValue[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a.value - b.value);
  const totalWeight = sorted.reduce((sum, v) => sum + v.weight, 0);
  if (totalWeight <= 0) return null;

  const half = totalWeight / 2;
  let cumulative = 0;
  for (const entry of sorted) {
    cumulative += entry.weight;
    if (cumulative >= half) return entry.value;
  }
  return sorted[sorted.length - 1]!.value;
}

export interface ConfidenceInterval {
  low: number;
  high: number;
}

/**
 * Percentile bootstrap CI around the weighted median (plan section 5: "Teil
 * der Konfidenzintervall-Berechnung" across many independent run pairs,
 * since we deliberately don't repeat runs per user — see design rationale
 * there). Resamples with replacement, weighted by each record's trust
 * weight, and takes the [alpha/2, 1-alpha/2] percentiles of the resampled
 * medians.
 *
 * `rng` is injectable so tests can assert on deterministic output.
 */
export function bootstrapMedianConfidenceInterval(
  values: readonly WeightedValue[],
  options: { iterations?: number; alpha?: number; rng?: () => number } = {},
): ConfidenceInterval | null {
  if (values.length === 0) return null;
  const iterations = options.iterations ?? 1000;
  const alpha = options.alpha ?? 0.05;
  const rng = options.rng ?? Math.random;

  const n = values.length;
  const resampledMedians: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const sample: WeightedValue[] = new Array(n);
    for (let j = 0; j < n; j++) {
      sample[j] = values[Math.floor(rng() * n)]!;
    }
    const median = weightedMedian(sample);
    if (median !== null) resampledMedians.push(median);
  }
  if (resampledMedians.length === 0) return null;

  resampledMedians.sort((a, b) => a - b);
  const lowIndex = Math.floor((alpha / 2) * resampledMedians.length);
  const highIndex = Math.min(
    resampledMedians.length - 1,
    Math.ceil((1 - alpha / 2) * resampledMedians.length) - 1,
  );
  return { low: resampledMedians[lowIndex]!, high: resampledMedians[highIndex]! };
}

export interface DeltaStats {
  medianDelta: number | null;
  confidenceInterval: ConfidenceInterval | null;
  sampleSize: number;
}

/** One metric's full aggregation result for a single skill+category — never merged across categories (briefing point 3). */
export function computeDeltaStats(
  values: readonly WeightedValue[],
  bootstrapOptions?: { iterations?: number; alpha?: number; rng?: () => number },
): DeltaStats {
  return {
    medianDelta: weightedMedian(values),
    confidenceInterval: bootstrapMedianConfidenceInterval(values, bootstrapOptions),
    sampleSize: values.length,
  };
}
