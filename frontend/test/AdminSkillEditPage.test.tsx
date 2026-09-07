import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AdminSkillEditPage } from "../src/pages/AdminSkillEditPage.js";
import type { AdminApiClient, AdminSkillRecord } from "../src/api/adminClient.js";

const record: AdminSkillRecord = {
  skillId: "sample",
  name: "Sample",
  description: "Description",
  githubUrl: "https://github.com/example/sample",
  license: "MIT",
  maintainer: "example",
  declaredCategory: "docs",
  githubStars: 42,
};

function renderEditor() {
  const upsertSkill = vi.fn<AdminApiClient["upsertSkill"]>().mockResolvedValue(record);
  const client: AdminApiClient = {
    login: vi.fn(),
    logout: vi.fn(),
    isAuthenticated: vi.fn(),
    listSkills: vi.fn().mockResolvedValue([record]),
    upsertSkill,
    deleteSkill: vi.fn(),
  };
  render(
    <MemoryRouter initialEntries={["/admin/skills/sample"]}>
      <Routes>
        <Route path="/admin/skills/:skillId" element={<AdminSkillEditPage adminApiClient={client} />} />
        <Route path="/admin/skills" element={<p>Catalog saved</p>} />
      </Routes>
    </MemoryRouter>,
  );
  return { upsertSkill };
}

describe("AdminSkillEditPage", () => {
  it("loads and saves GitHub stars together with the other metadata", async () => {
    const { upsertSkill } = renderEditor();
    const user = userEvent.setup();
    const stars = await screen.findByRole("spinbutton", { name: "GitHub stars" });
    expect(stars).toHaveValue(42);
    await user.clear(stars);
    await user.type(stars, "1234");
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(upsertSkill).toHaveBeenCalledWith(
        "sample",
        expect.objectContaining({
          name: "Sample",
          githubStars: 1234,
          githubUrl: record.githubUrl,
          license: "MIT",
        }),
      ),
    );
    expect(await screen.findByText("Catalog saved")).toBeInTheDocument();
  });

  it("saves a cleared star field as unknown, not zero", async () => {
    const { upsertSkill } = renderEditor();
    const user = userEvent.setup();
    await user.clear(await screen.findByRole("spinbutton", { name: "GitHub stars" }));
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(upsertSkill).toHaveBeenCalledWith("sample", expect.objectContaining({ githubStars: null })),
    );
  });
});
