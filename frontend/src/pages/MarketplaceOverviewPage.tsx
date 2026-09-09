import type { ExecutionFilter as Filter } from "@skilldiff/schema";
import { ExecutionFilter, executionLabel } from "../components/ExecutionFilter.js";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { MarketplaceApiClient } from "../api/client.js";
import type { Category, SkillSummary } from "../api/types.js";
import { hasEnoughData } from "../api/types.js";
import { CategoryFilter } from "../components/CategoryFilter.js";
import { LandingHero } from "../components/LandingHero.js";
import { ContributeSection, EvidenceStrip, MethodSection } from "../components/LandingSections.js";
import { Arrow } from "../components/SiteHeader.js";

const CATEGORY_LABEL: Record<string, string> = {
  debugging: "Debugging",
  feature: "Feature work",
  refactoring: "Refactoring",
  docs: "Documentation",
  marketing: "Marketing",
  other: "Other",
};

export function MarketplaceOverviewPage({ apiClient }: { apiClient: MarketplaceApiClient }) {
  const [executionFilter, setExecutionFilter] = useState<Filter>({});
  const [category, setCategory] = useState<Category | null>(null);
  const [skills, setSkills] = useState<SkillSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [requestVersion, setRequestVersion] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingPage, setLoadingPage] = useState(false);
  const [failedPage, setFailedPage] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [pageCursors, setPageCursors] = useState<(string | null)[]>([null]);
  const generation = useRef(0);
  const pageRequest = useRef(false);

  useEffect(() => {
    let cancelled = false;
    generation.current += 1;
    pageRequest.current = false;
    setSkills(null);
    setError(null);
    setNextCursor(null);
    setLoadingPage(false);
    setFailedPage(null);
    setPage(0);
    setPageCursors([null]);
    apiClient
      .listSkills({ category: category ?? undefined, ...executionFilter })
      .then((response) => {
        if (!cancelled) {
          setSkills(response.skills);
          setNextCursor(response.nextCursor);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
      generation.current += 1;
    };
  }, [apiClient, category, requestVersion, executionFilter]);

  async function goToPage(targetPage: number) {
    const cursor = targetPage === page + 1 ? nextCursor : pageCursors[targetPage];
    if (targetPage < 0 || cursor === undefined || (targetPage > 0 && cursor === null) || pageRequest.current) return;
    const currentGeneration = generation.current;
    pageRequest.current = true;
    setLoadingPage(true);
    setFailedPage(null);
    try {
      const response = await apiClient.listSkills({ category: category ?? undefined, cursor, ...executionFilter });
      if (generation.current !== currentGeneration) return;
      setSkills(response.skills);
      setPage(targetPage);
      setPageCursors((previous) => [...previous.slice(0, targetPage), cursor]);
      setNextCursor(response.nextCursor);
    } catch {
      if (generation.current === currentGeneration) setFailedPage(targetPage);
    } finally {
      if (generation.current === currentGeneration) {
        pageRequest.current = false;
        setLoadingPage(false);
      }
    }
  }

  return (
    <main className="overview-page">
      <LandingHero />
      <EvidenceStrip />
      <MethodSection />
      <section id="explore" className="explore-section content-shell" aria-labelledby="explore-title">
        <div className="section-heading">
          <div>
            <span className="eyebrow">02 — THE SKILL INDEX</span>
            <h2 id="explore-title">
              Find your
              <br />
              <span className="text-muted">next advantage.</span>
            </h2>
            <p>Explore skills by the work you do. Look closer at the evidence.</p>
          </div>
          <a className="text-link" href="#how-it-works">
            How to read the results <Arrow />
          </a>
        </div>

        <ExecutionFilter value={executionFilter} onChange={setExecutionFilter} />
        <CategoryFilter selected={category} onChange={setCategory} />

        {error && (
          <div className="catalog-state" role="alert">
            <span className="catalog-state__icon" aria-hidden="true">
              ⇄
            </span>
            <h3>The catalog is taking a moment.</h3>
            <p>We couldn’t connect to the marketplace. Try again to load the latest skill data.</p>
            <button
              className="button button--outline button--small"
              type="button"
              onClick={() => setRequestVersion((version) => version + 1)}
            >
              Try again <Arrow />
            </button>
          </div>
        )}
        {!error && skills === null && (
          <div className="catalog-state catalog-state--loading" role="status">
            <span className="status-dot" /> Loading skill evidence…
          </div>
        )}
        {!error && skills !== null && skills.length === 0 && (
          <div className="catalog-state" role="status">
            <span className="catalog-state__icon" aria-hidden="true">
              ⌗
            </span>
            <h3>Room for the next discovery.</h3>
            <p>No skills with data in this category yet.</p>
            <a className="text-link" href="#contribute-title">
              Be part of the first comparisons <Arrow />
            </a>
          </div>
        )}

        <ul className="skill-list">
          {skills?.map((skill) => (
            <li key={skill.skillId} className="skill-list__item">
              <article className="skill-list__card">
                <Link to={`/skills/${encodeURIComponent(skill.skillId)}`} className="skill-list__link">
                  <div className="skill-list__topline">
                    <span className="skill-list__icon" aria-hidden="true">
                      {skill.categories[0]?.category === "docs"
                        ? "Aa"
                        : skill.categories[0]?.category === "marketing"
                          ? "↗"
                          : "{ }"}
                    </span>
                    <span className="skill-list__kind">
                      {skill.metadata?.declaredCategory ?? "Community skill"}
                    </span>
                    <Arrow diagonal />
                  </div>
                  <span className="skill-list__id">
                    {skill.metadata?.name ?? skill.skillId}
                    {skill.metadata?.githubStars != null && (
                      <span
                        className="skill-metadata__stars"
                        title="GitHub repository stars (not a performance score)"
                      >
                        {" "}
                        ★ {skill.metadata.githubStars.toLocaleString("en-US")}
                      </span>
                    )}
                  </span>
                  {/* Technical skill_id stays visible even once a friendly name exists — it's still the identifier the URL, CLI, and export data use. */}
                  {skill.metadata?.name && <span className="skill-list__technical-id">{skill.skillId}</span>}
                  <p className="skill-list__description">
                    {skill.metadata?.description ??
                      "Explore task-level comparisons, measurement context, and the underlying run data."}
                  </p>
                  <span className="skill-list__categories">
                    {skill.categories.length === 0 && (
                      <span className="skill-list__category-chip">No comparisons yet</span>
                    )}
                    {skill.categories.map((c) => (
                      <span key={`${c.category}-${c.execution?.agent}-${c.execution?.model}-${c.execution?.reasoning_effort}`} className="skill-list__category-chip">
                        {c.execution && `${executionLabel(c.execution)} · `}{CATEGORY_LABEL[c.category] ?? c.category}:{" "}
                        {hasEnoughData(c.sampleSize) ? `n=${c.sampleSize}` : "not enough data yet"}
                      </span>
                    ))}
                  </span>
                  <span className="skill-list__bottomline">
                    View evidence <Arrow />
                  </span>
                </Link>
                {skill.metadata &&
                  (skill.metadata.githubUrl || skill.metadata.maintainer || skill.metadata.license) && (
                    <div className="skill-list__facts">
                      {skill.metadata.githubUrl && (
                        <a href={skill.metadata.githubUrl} target="_blank" rel="noreferrer">
                          GitHub <Arrow diagonal />
                        </a>
                      )}
                      {skill.metadata.maintainer && (
                        <span title="Maintainer">{skill.metadata.maintainer}</span>
                      )}
                      {skill.metadata.license && <span title="License">{skill.metadata.license}</span>}
                    </div>
                  )}
              </article>
            </li>
          ))}
        </ul>
        {skills !== null && (page > 0 || nextCursor !== null) && (
          <nav className="catalog-pagination" aria-label="Catalog pagination">
            {failedPage !== null && (
              <p role="alert">
                We couldn’t load page {failedPage + 1}.{" "}
                <button className="button button--outline button--small" type="button"
                  onClick={() => void goToPage(failedPage)}>Try again</button>
              </p>
            )}
            <button
              className="button button--outline button--small"
              type="button"
              disabled={loadingPage || page === 0}
              onClick={() => void goToPage(page - 1)}
            >
              Previous
            </button>
            <span role="status" className="catalog-pagination__status">
              {loadingPage ? "Loading page…" : `Page ${page + 1}`}
            </span>
            <button
              className="button button--outline button--small"
              type="button"
              disabled={loadingPage || nextCursor === null}
              onClick={() => void goToPage(page + 1)}
            >
              Next
            </button>
          </nav>
        )}
        <p className="catalog-footnote">
          <span className="status-dot" /> At least 20 runs per category before a numeric result is
          highlighted.
        </p>
      </section>
      <ContributeSection />
    </main>
  );
}
