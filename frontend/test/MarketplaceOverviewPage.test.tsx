import { describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { MarketplaceOverviewPage } from "../src/pages/MarketplaceOverviewPage.js";
import { createMockApiClient } from "../src/api/mockClient.js";
import { fixtureSkills } from "../src/api/fixtures.js";
import type { MarketplaceApiClient } from "../src/api/client.js";
import type { SkillListResponse, SkillSummary } from "../src/api/types.js";

function renderOverview(apiClient: MarketplaceApiClient = createMockApiClient(fixtureSkills)) {
  return render(
    <MemoryRouter>
      <MarketplaceOverviewPage apiClient={apiClient} />
    </MemoryRouter>,
  );
}

describe("MarketplaceOverviewPage", () => {
  const skill = (skillId: string): SkillSummary => ({ skillId, categories: [], metadata: null });

  it("resets pagination for agent/model filters and sends the filters on later pages", async () => {
    const listSkills = vi.fn<MarketplaceApiClient["listSkills"]>()
      .mockResolvedValueOnce({ skills: [skill("all-first")], nextCursor: "all-next" })
      .mockResolvedValueOnce({ skills: [skill("codex-first")], nextCursor: "codex-next" })
      .mockResolvedValueOnce({ skills: [skill("model-first")], nextCursor: "model-next" })
      .mockResolvedValueOnce({ skills: [skill("model-second")], nextCursor: null });
    renderOverview({ listSkills, getSkill: vi.fn() });
    await screen.findByText("all-first");
    await userEvent.selectOptions(screen.getByLabelText("Agent"), "codex");
    expect(await screen.findByText("codex-first")).toBeInTheDocument();
    expect(listSkills).toHaveBeenLastCalledWith({ category: undefined, agent: "codex" });
    await userEvent.type(screen.getByLabelText("Model"), "test-model");
    await userEvent.click(screen.getByRole("button", { name: "Apply model filter" }));
    expect(await screen.findByText("model-first")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(await screen.findByText("model-second")).toBeInTheDocument();
    expect(listSkills).toHaveBeenLastCalledWith({ category: undefined, agent: "codex", model: "test-model", cursor: "model-next" });
    expect(screen.queryByText("model-first")).not.toBeInTheDocument();
  });

  it("replaces entries when navigating forward and back and disables boundary controls", async () => {
    const firstPage = Array.from({ length: 20 }, (_, index) => skill(`entry-${index}`));
    const listSkills = vi.fn<MarketplaceApiClient["listSkills"]>()
      .mockResolvedValueOnce({ skills: firstPage, nextCursor: "page-2" })
      .mockResolvedValueOnce({ skills: [skill("entry-20")], nextCursor: null })
      .mockResolvedValueOnce({ skills: firstPage, nextCursor: "page-2" });
    renderOverview({ listSkills, getSkill: vi.fn() });
    await userEvent.click(await screen.findByRole("button", { name: "Next" }));
    expect(await screen.findByText("entry-20")).toBeInTheDocument();
    expect(screen.queryByText("entry-0")).not.toBeInTheDocument();
    expect(screen.getByText("Page 2")).toBeInTheDocument();
    expect(listSkills).toHaveBeenLastCalledWith({ category: undefined, cursor: "page-2" });
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Previous" }));
    expect(await screen.findByText("entry-0")).toBeInTheDocument();
    expect(screen.queryByText("entry-20")).not.toBeInTheDocument();
    expect(screen.getByText("Page 1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    expect(listSkills).toHaveBeenLastCalledWith({ category: undefined, cursor: null });
  });

  it("returns to page 1 when changing category from a later page", async () => {
    const listSkills = vi.fn<MarketplaceApiClient["listSkills"]>()
      .mockResolvedValueOnce({ skills: [skill("first")], nextCursor: "page-2" })
      .mockResolvedValueOnce({ skills: [skill("second")], nextCursor: null })
      .mockResolvedValueOnce({ skills: [skill("docs-first")], nextCursor: "docs-next" });
    renderOverview({ listSkills, getSkill: vi.fn() });
    await userEvent.click(await screen.findByRole("button", { name: "Next" }));
    expect(await screen.findByText("Page 2")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Documentation" }));
    expect(await screen.findByText("docs-first")).toBeInTheDocument();
    expect(screen.queryByText("second")).not.toBeInTheDocument();
    expect(screen.getByText("Page 1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    expect(listSkills).toHaveBeenLastCalledWith({ category: "docs" });
  });

  it("keeps existing entries on failure and retries the same cursor", async () => {
    const listSkills = vi.fn<MarketplaceApiClient["listSkills"]>()
      .mockResolvedValueOnce({ skills: [skill("first")], nextCursor: "page-2" })
      .mockRejectedValueOnce(new Error("Offline"))
      .mockResolvedValueOnce({ skills: [skill("second")], nextCursor: null });
    renderOverview({ listSkills, getSkill: vi.fn() });
    await userEvent.click(await screen.findByRole("button", { name: "Next" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("couldn’t load page 2");
    expect(screen.getByText("first")).toBeInTheDocument();
    expect(screen.getByText("Page 1")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("second")).toBeInTheDocument();
    expect(screen.queryByText("first")).not.toBeInTheDocument();
    expect(screen.getByText("Page 2")).toBeInTheDocument();
    expect(listSkills.mock.calls[1]).toEqual(listSkills.mock.calls[2]);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it.each([false, true])("ignores a stale page after a category change (failure: %s)", async (fail) => {
    let resolvePage!: (value: SkillListResponse) => void;
    let rejectPage!: (reason: Error) => void;
    const pendingPage = new Promise<SkillListResponse>((resolve, reject) => {
      resolvePage = resolve;
      rejectPage = reject;
    });
    const listSkills = vi.fn<MarketplaceApiClient["listSkills"]>()
      .mockResolvedValueOnce({ skills: [skill("original")], nextCursor: "old-cursor" })
      .mockReturnValueOnce(pendingPage)
      .mockResolvedValueOnce({ skills: [skill("filtered")], nextCursor: "docs-cursor" })
      .mockResolvedValueOnce({ skills: [skill("filtered-next")], nextCursor: null });
    renderOverview({ listSkills, getSkill: vi.fn() });
    await userEvent.click(await screen.findByRole("button", { name: "Next" }));
    const loadingButton = screen.getByRole("button", { name: "Next" });
    expect(loadingButton).toBeDisabled();
    await userEvent.click(loadingButton);
    expect(listSkills).toHaveBeenCalledTimes(2);
    await userEvent.click(screen.getByRole("button", { name: "Documentation" }));
    expect(await screen.findByText("filtered")).toBeInTheDocument();
    expect(screen.getByText("Page 1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    expect(listSkills).toHaveBeenLastCalledWith({ category: "docs" });
    await act(async () => {
      if (fail) rejectPage(new Error("Late failure"));
      else resolvePage({ skills: [skill("stale")], nextCursor: "stale-cursor" });
    });
    expect(screen.queryByText("stale")).not.toBeInTheDocument();
    expect(screen.queryByText("original")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(await screen.findByText("filtered-next")).toBeInTheDocument();
    expect(listSkills).toHaveBeenLastCalledWith({ category: "docs", cursor: "docs-cursor" });
  });

  it("shows repository stars and metadata links separately from performance evidence", async () => {
    renderOverview();
    const githubLinks = await screen.findAllByRole("link", { name: /^github$/i });
    expect(
      githubLinks.some((link) => link.getAttribute("href") === "https://github.com/example-org/bugfinder"),
    ).toBe(true);
    expect(screen.getByTitle("GitHub repository stars (not a performance score)")).toHaveTextContent(
      /1.?240/,
    );
    expect(screen.getByText("MIT")).toBeInTheDocument();
  });

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
