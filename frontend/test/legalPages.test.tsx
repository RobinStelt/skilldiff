import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { PrivacyPage } from "../src/pages/PrivacyPage.js";
import { TermsPage } from "../src/pages/TermsPage.js";
import { SiteFooter } from "../src/components/SiteFooter.js";

describe("legal pages", () => {
  it("PrivacyPage renders and flags itself as a draft", () => {
    render(<PrivacyPage />);
    expect(screen.getByText(/draft — not legal advice/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /privacy policy/i })).toBeInTheDocument();
  });

  it("TermsPage renders and flags itself as a draft", () => {
    render(
      <MemoryRouter>
        <TermsPage />
      </MemoryRouter>,
    );
    expect(screen.getByText(/draft — not legal advice/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /terms of use/i })).toBeInTheDocument();
  });

  it("SiteFooter links to both", () => {
    render(
      <MemoryRouter>
        <SiteFooter />
      </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: /privacy/i })).toHaveAttribute("href", "/privacy");
    expect(screen.getByRole("link", { name: /terms/i })).toHaveAttribute("href", "/terms");
  });
});
