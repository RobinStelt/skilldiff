import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SkillMetadataCard } from "../src/components/SkillMetadataCard.js";

describe("SkillMetadataCard", () => {
  it("shows a neutral message when the skill has no catalog metadata yet", () => {
    render(<SkillMetadataCard metadata={null} />);
    expect(screen.getByText(/no catalog information yet/i)).toBeInTheDocument();
  });

  it("shows name, description, github link+stars, license, maintainer, and declared category", () => {
    render(
      <SkillMetadataCard
        metadata={{
          name: "Ponytail",
          description: "Lazy senior dev mode.",
          githubUrl: "https://github.com/dietrichgebert/ponytail",
          license: "MIT",
          maintainer: "Dietrich Gebert",
          declaredCategory: "refactoring",
          githubStars: 127884,
        }}
      />,
    );
    expect(screen.getByText("Ponytail")).toBeInTheDocument();
    expect(screen.getByText("Lazy senior dev mode.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /dietrichgebert\/ponytail/i })).toHaveAttribute(
      "href",
      "https://github.com/dietrichgebert/ponytail",
    );
    // toLocaleString's thousands separator is locale-dependent (comma vs.
    // period) — match the digits loosely instead of asserting one locale.
    expect(screen.getByText(/127.?884/)).toBeInTheDocument();
    expect(screen.getByText("MIT")).toBeInTheDocument();
    expect(screen.getByText("Dietrich Gebert")).toBeInTheDocument();
    expect(screen.getByText("refactoring")).toBeInTheDocument();
  });

  it("omits fields that are null instead of showing empty labels", () => {
    render(
      <SkillMetadataCard
        metadata={{
          name: "Minimal",
          description: null,
          githubUrl: null,
          license: null,
          maintainer: null,
          declaredCategory: null,
          githubStars: null,
        }}
      />,
    );
    expect(screen.getByText("Minimal")).toBeInTheDocument();
    expect(screen.queryByText(/maintainer/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/license/i)).not.toBeInTheDocument();
  });
});
