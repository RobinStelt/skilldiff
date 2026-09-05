import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { MarketplaceOverviewPage } from "../src/pages/MarketplaceOverviewPage.js";
import { createMockApiClient } from "../src/api/mockClient.js";
import { fixtureSkills } from "../src/api/fixtures.js";

function renderOverview() {
  const apiClient = createMockApiClient(fixtureSkills);
  return render(
    <MemoryRouter>
      <MarketplaceOverviewPage apiClient={apiClient} />
    </MemoryRouter>,
  );
}

describe("MarketplaceOverviewPage", () => {
  it("lists every skill with per-category sample sizes, not a single score", async () => {
    renderOverview();
    await waitFor(() => expect(screen.getByText("skill_bugfinder_v2")).toBeInTheDocument());
    expect(screen.getByText(/debugging: n=142/i)).toBeInTheDocument();
    expect(screen.getByText(/refactoring: not enough data yet/i)).toBeInTheDocument();
  });

  it("filters the list by category (acceptance point 5)", async () => {
    renderOverview();
    await waitFor(() => expect(screen.getByText("skill_bugfinder_v2")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: /^documentation$/i }));

    await waitFor(() => {
      expect(screen.getByText("skill_doc_writer")).toBeInTheDocument();
      expect(screen.queryByText("skill_copywriter_pro")).not.toBeInTheDocument();
    });
  });

  it("never lists a category's sample size as a misleading number when data is insufficient", async () => {
    renderOverview();
    await waitFor(() => expect(screen.getByText("skill_bugfinder_v2")).toBeInTheDocument());
    // The low-sample refactoring category must say "not enough data yet",
    // never render its raw n=8 as if it were a trustworthy figure.
    expect(screen.queryByText(/refactoring: n=8/i)).not.toBeInTheDocument();
  });
});
