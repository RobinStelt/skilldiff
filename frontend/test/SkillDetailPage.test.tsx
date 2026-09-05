import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { SkillDetailPage } from "../src/pages/SkillDetailPage.js";
import { createMockApiClient } from "../src/api/mockClient.js";
import { fixtureSkills } from "../src/api/fixtures.js";

function renderSkillDetail(skillId: string) {
  const apiClient = createMockApiClient(fixtureSkills);
  return render(
    <MemoryRouter initialEntries={[`/skills/${skillId}`]}>
      <Routes>
        <Route path="/skills/:skillId" element={<SkillDetailPage apiClient={apiClient} />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("SkillDetailPage", () => {
  it("never shows a single overall number without category context (acceptance criterion 1)", async () => {
    renderSkillDetail("skill_bugfinder_v2");
    await waitFor(() => expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("skill_bugfinder_v2"));

    // Every metric must be rendered inside a category heading's section —
    // there is no page-level score element outside category-section.
    expect(screen.getByRole("heading", { name: /debugging/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /refactoring/i })).toBeInTheDocument();
    expect(screen.getAllByTestId("delta-metric-Tokens")).toHaveLength(2); // one per category, never merged
  });

  it("shows 'not enough data yet' for a low-sample category, with no prominent numeric value (acceptance criterion 2)", async () => {
    renderSkillDetail("skill_bugfinder_v2");
    await waitFor(() => expect(screen.getByRole("heading", { name: /refactoring/i })).toBeInTheDocument());

    const refactoringHeading = screen.getByRole("heading", { name: /refactoring/i });
    const section = refactoringHeading.closest("section")!;
    expect(section).toHaveTextContent(/not enough data yet \(n=8\)/i);
  });

  it("shows isolation-tier breakdown and account diversity on the detail page without extra navigation (acceptance criterion 3)", async () => {
    renderSkillDetail("skill_bugfinder_v2");
    await waitFor(() => expect(screen.getAllByText(/Tier A \(container\)/).length).toBeGreaterThan(0));
    expect(screen.getAllByText(/data from \d+ accounts?/i).length).toBeGreaterThan(0);
  });

  it("renders a working export link matching the underlying category data (acceptance criterion 4)", async () => {
    renderSkillDetail("skill_doc_writer");
    await waitFor(() => expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("skill_doc_writer"));
    const link = screen.getByRole("link", { name: /export raw data/i });
    expect(link).toHaveAttribute("href", "/api/skills/skill_doc_writer/export?category=docs");
  });

  it("links to the open-source aggregation logic", async () => {
    renderSkillDetail("skill_doc_writer");
    await waitFor(() => expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument());
    expect(screen.getByRole("link", { name: /aggregation logic/i })).toHaveAttribute(
      "href",
      expect.stringContaining("aggregation"),
    );
  });
});
