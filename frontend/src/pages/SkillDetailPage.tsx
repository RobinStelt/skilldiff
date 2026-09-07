import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { MarketplaceApiClient } from "../api/client.js";
import type { SkillDetail } from "../api/types.js";
import { CategorySection } from "../components/CategorySection.js";
import { SkillMetadataCard } from "../components/SkillMetadataCard.js";

export function SkillDetailPage({ apiClient }: { apiClient: MarketplaceApiClient }) {
  const { skillId } = useParams<{ skillId: string }>();
  const [detail, setDetail] = useState<SkillDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!skillId) return;
    let cancelled = false;
    setDetail(null);
    setError(null);
    apiClient
      .getSkill(skillId)
      .then((result) => {
        if (!cancelled) setDetail(result);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [apiClient, skillId]);

  if (error) {
    return (
      <main className="skill-detail-page">
        <p role="alert">Failed to load skill: {error}</p>
        <Link to="/">← Back to overview</Link>
      </main>
    );
  }

  if (!detail) {
    return (
      <main className="skill-detail-page">
        <p role="status">Loading…</p>
      </main>
    );
  }

  return (
    <main className="skill-detail-page">
      <Link to="/" className="skill-detail-page__back">
        ← Back to overview
      </Link>
      <h1>{detail.skillId}</h1>
      <SkillMetadataCard metadata={detail.metadata} />
      {detail.categories.length === 0 && (
        <p role="status">
          No A/B comparisons yet. Catalog information is available; measured results will appear after runs
          are contributed.
        </p>
      )}
      <p className="skill-detail-page__intro">
        Every metric below is shown separately per category — there is no combined score across categories.
      </p>

      {detail.categories.map((categoryDetail) => (
        <CategorySection key={categoryDetail.category} detail={categoryDetail} />
      ))}

      <p className="skill-detail-page__source">
        <a href={detail.aggregationSourceUrl}>
          View the aggregation logic behind these numbers (open source)
        </a>
      </p>
    </main>
  );
}
