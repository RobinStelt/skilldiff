import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { IsolationTierBar } from "../src/components/IsolationTierBar.js";

describe("IsolationTierBar", () => {
  it("shows counts and percentages for every tier", () => {
    render(<IsolationTierBar breakdown={{ A: 60, B: 30, C: 10 }} />);
    expect(screen.getByText(/Tier A \(container\): 60 \(60%\)/)).toBeInTheDocument();
    expect(screen.getByText(/Tier B \(symlink\/junction\): 30 \(30%\)/)).toBeInTheDocument();
    expect(screen.getByText(/Tier C \(best effort\): 10 \(10%\)/)).toBeInTheDocument();
  });

  it("handles an all-zero breakdown without dividing by zero", () => {
    render(<IsolationTierBar breakdown={{ A: 0, B: 0, C: 0 }} />);
    expect(screen.getByText(/no isolation-tier data yet/i)).toBeInTheDocument();
  });
});
