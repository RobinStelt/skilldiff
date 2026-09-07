import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { PrivacyPage } from "../src/pages/PrivacyPage.js";
import { TermsPage } from "../src/pages/TermsPage.js";
import { ImpressumPage } from "../src/pages/ImpressumPage.js";
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

  it("ImpressumPage renders the operator's identification", () => {
    render(<ImpressumPage />);
    expect(screen.getByText(/draft — keine rechtsberatung/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^impressum$/i })).toBeInTheDocument();
    expect(screen.getAllByText(/robin steltmann/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/34479 breuna/i)).toBeInTheDocument();
  });

  it("SiteFooter links to all three legal pages", () => {
    render(
      <MemoryRouter>
        <SiteFooter />
      </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: /privacy/i })).toHaveAttribute("href", "/privacy");
    expect(screen.getByRole("link", { name: /terms/i })).toHaveAttribute("href", "/terms");
    expect(screen.getByRole("link", { name: /impressum/i })).toHaveAttribute("href", "/impressum");
  });
});
