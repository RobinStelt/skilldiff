import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { CategorySection } from "../src/components/CategorySection.js";
import { fixtureSkills } from "../src/api/fixtures.js";

describe("CategorySection", () => {
  it("renders isolation-tier breakdown and account diversity inline, not behind an extra click (acceptance criterion)", () => {
    const debugging = fixtureSkills[0]!.categories[0]!;
    render(<CategorySection detail={debugging} />);
    expect(screen.getByText(/Tier A \(container\)/)).toBeInTheDocument();
    expect(screen.getByText(/data from 87 accounts/i)).toBeInTheDocument();
  });

  it("shows 'not applicable' for security findings on a non-code category instead of a fake zero", () => {
    const marketing = fixtureSkills[2]!.categories[0]!;
    render(<CategorySection detail={marketing} />);
    expect(screen.getByText(/not applicable/i)).toBeInTheDocument();
  });

  it("shows the seed-data badge only when the category is seed-majority", () => {
    const { unmount } = render(<CategorySection detail={fixtureSkills[2]!.categories[0]!} />);
    expect(screen.getByText(/seed data/i)).toBeInTheDocument();
    unmount();

    render(<CategorySection detail={fixtureSkills[0]!.categories[0]!} />);
    expect(screen.queryByText(/seed data/i)).not.toBeInTheDocument();
  });

  it("links to the export endpoint for exactly this category's raw data", () => {
    const debugging = fixtureSkills[0]!.categories[0]!;
    render(<CategorySection detail={debugging} />);
    const link = screen.getByRole("link", { name: /export raw data/i });
    expect(link).toHaveAttribute("href", debugging.exportUrl);
  });
});
