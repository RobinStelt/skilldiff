/** Extracts "owner/repo" from a github.com URL, tolerant of trailing slashes/paths/.git. `null` if it doesn't look like a GitHub repo URL. */
export function parseGithubRepo(githubUrl: string): string | null {
  const match = /^https?:\/\/(?:www\.)?github\.com\/([^/\s]+)\/([^/\s#?]+)/i.exec(githubUrl.trim());
  if (!match) return null;
  const repo = match[2]!.replace(/\.git$/, "");
  return `${match[1]}/${repo}`;
}

/**
 * Unauthenticated GitHub REST call — 60 requests/hour per IP, which is
 * fine for a periodic batch refresh over a catalog of this size (not for
 * fetching on every page view, which is why this is a separate script,
 * not part of the request path — see scripts/refresh-github-stars.ts).
 */
export async function fetchGithubStars(githubUrl: string, fetchImpl: typeof fetch = fetch): Promise<number | null> {
  const repo = parseGithubRepo(githubUrl);
  if (!repo) return null;
  const response = await fetchImpl(`https://api.github.com/repos/${repo}`, {
    headers: { accept: "application/vnd.github+json", "user-agent": "skill-ab-marktplatz" },
  });
  if (!response.ok) return null;
  const body = (await response.json()) as { stargazers_count?: unknown };
  return typeof body.stargazers_count === "number" ? body.stargazers_count : null;
}
