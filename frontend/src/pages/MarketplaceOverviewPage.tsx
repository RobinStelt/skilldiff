import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { MarketplaceApiClient } from "../api/client.js";
import type { Category, SkillSummary } from "../api/types.js";
import { hasEnoughData } from "../api/types.js";
import { CategoryFilter } from "../components/CategoryFilter.js";

const CATEGORY_LABEL: Record<string, string> = {
  debugging: "Debugging",
  feature: "Feature work",
  refactoring: "Refactoring",
  docs: "Documentation",
  marketing: "Marketing",
  other: "Other",
};

export function MarketplaceOverviewPage({ apiClient }: { apiClient: MarketplaceApiClient }) {
  const [category, setCategory] = useState<Category | null>(null);
  const [skills, setSkills] = useState<SkillSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setSkills(null);
    setError(null);
    apiClient
      .listSkills({ category: category ?? undefined })
      .then((response) => {
        if (!cancelled) setSkills(response.skills);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [apiClient, category]);

  return (
    <main className="overview-page">
      <h1>Skill-A/B Marketplace</h1>
      <p className="overview-page__intro">
        Real usage comparisons: each skill run twice on the same task, once with and once without the skill loaded.
        Numbers below are deltas, per category, never a single overall score.
      </p>

      <CategoryFilter selected={category} onChange={setCategory} />

      {error && <p role="alert">Failed to load skills: {error}</p>}
      {!error && skills === null && <p role="status">Loading…</p>}
      {!error && skills !== null && skills.length === 0 && (
        <p role="status">No skills with data in this category yet.</p>
      )}

      <ul className="skill-list">
        {skills?.map((skill) => (
          <li key={skill.skillId} className="skill-list__item">
            <Link to={`/skills/${encodeURIComponent(skill.skillId)}`} className="skill-list__link">
              <span className="skill-list__id">{skill.skillId}</span>
              <span className="skill-list__categories">
                {skill.categories.map((c) => (
                  <span key={c.category} className="skill-list__category-chip">
                    {CATEGORY_LABEL[c.category] ?? c.category}:{" "}
                    {hasEnoughData(c.sampleSize) ? `n=${c.sampleSize}` : "not enough data yet"}
                  </span>
                ))}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
