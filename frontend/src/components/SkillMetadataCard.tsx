import type { SkillMetadata } from "../api/types.js";

/**
 * Purely descriptive catalog info an admin attached to this skill_id
 * (backend/src/admin/skillMetadataStore.ts) — never derived from or fed
 * into the measured deltas below it on the page. `declaredCategory` here
 * is a browse label, not the auto-detected run category that drives
 * aggregation — the two are shown far apart on purpose, never merged.
 */
export function SkillMetadataCard({ metadata }: { metadata: SkillMetadata | null }) {
  if (!metadata) {
    return (
      <div className="skill-metadata skill-metadata--uncatalogued" role="status">
        No catalog information yet for this skill — the measured deltas below are unaffected.
      </div>
    );
  }

  const repoLabel = metadata.githubUrl ? metadata.githubUrl.replace(/^https?:\/\/(www\.)?github\.com\//i, "") : null;

  return (
    <div className="skill-metadata">
      <p className="skill-metadata__name">{metadata.name}</p>
      {metadata.description && <p className="skill-metadata__description">{metadata.description}</p>}
      <ul className="skill-metadata__facts">
        {metadata.githubUrl && (
          <li>
            <a href={metadata.githubUrl} target="_blank" rel="noreferrer">
              {repoLabel}
            </a>
            {metadata.githubStars !== null && (
              <span className="skill-metadata__stars" title="GitHub stars">{` ★ ${metadata.githubStars.toLocaleString()}`}</span>
            )}
          </li>
        )}
        {metadata.maintainer && (
          <li>
            <span className="skill-metadata__label">Maintainer:</span> {metadata.maintainer}
          </li>
        )}
        {metadata.license && (
          <li>
            <span className="skill-metadata__label">License:</span> {metadata.license}
          </li>
        )}
        {metadata.declaredCategory && (
          <li>
            <span className="skill-metadata__label">Category:</span> {metadata.declaredCategory}
          </li>
        )}
      </ul>
    </div>
  );
}
