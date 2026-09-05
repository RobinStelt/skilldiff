import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { DeltaMetric } from "../src/components/DeltaMetric.js";

describe("DeltaMetric", () => {
  it("shows 'not enough data yet' instead of a number below MIN_SAMPLE_SIZE (acceptance criterion)", () => {
    render(
      <DeltaMetric
        label="Success rate"
        stats={{ medianDelta: 0.5, confidenceInterval: null, sampleSize: 8 }}
        format={(v) => `${v}`}
      />,
    );
    expect(screen.getByText(/not enough data yet/i)).toBeInTheDocument();
    expect(screen.queryByText("0.5")).not.toBeInTheDocument();
  });

  it("shows the value, CI, and sample size together — not hidden behind a tooltip", () => {
    render(
      <DeltaMetric
        label="Tokens"
        stats={{ medianDelta: 3200, confidenceInterval: { low: 1800, high: 4600 }, sampleSize: 142 }}
        format={(v) => `${v} tokens`}
      />,
    );
    expect(screen.getByText("3200 tokens")).toBeInTheDocument();
    expect(screen.getByText(/1800 tokens to 4600 tokens/)).toBeInTheDocument();
    expect(screen.getByText(/n=142/)).toBeInTheDocument();
  });

  it("shows an explicit reason when there's enough sample size but no signal (medianDelta null)", () => {
    render(
      <DeltaMetric
        label="Success rate"
        stats={{ medianDelta: null, confidenceInterval: null, sampleSize: 64 }}
        format={(v) => `${v}`}
        unavailableReason="No automated success signal for this category"
      />,
    );
    expect(screen.getByText(/no automated success signal/i)).toBeInTheDocument();
  });
});
