import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AccountDiversityBadge } from "../src/components/AccountDiversityBadge.js";

describe("AccountDiversityBadge", () => {
  it("warns below the low-diversity threshold, independent of sample size", () => {
    render(<AccountDiversityBadge distinctAccountCount={3} />);
    expect(screen.getByText(/low diversity/i)).toBeInTheDocument();
  });

  it("does not warn at or above the threshold", () => {
    render(<AccountDiversityBadge distinctAccountCount={87} />);
    expect(screen.queryByText(/low diversity/i)).not.toBeInTheDocument();
  });
});
