import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { AdminApiClient, AdminSkillRecord } from "../api/adminClient.js";

export function AdminSkillsPage({ adminApiClient }: { adminApiClient: AdminApiClient }) {
  const [skills, setSkills] = useState<AdminSkillRecord[] | null>(null);
  const [newSkillId, setNewSkillId] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    adminApiClient
      .listSkills()
      .then((result) => {
        if (!cancelled) setSkills(result);
      })
      .catch(() => {
        if (!cancelled) navigate("/admin/login");
      });
    return () => {
      cancelled = true;
    };
  }, [adminApiClient, navigate]);

  async function handleLogout() {
    await adminApiClient.logout();
    navigate("/admin/login");
  }

  return (
    <main className="admin-skills-page">
      <h1>Skill catalog</h1>
      <button type="button" onClick={handleLogout}>
        Sign out
      </button>

      {skills === null && <p role="status">Loading…</p>}

      {skills !== null && (
        <ul className="admin-skill-list">
          {skills.map((skill) => (
            <li key={skill.skillId}>
              <Link to={`/admin/skills/${encodeURIComponent(skill.skillId)}`}>{skill.name}</Link>{" "}
              {skill.githubStars !== null && (
                <span className="skill-metadata__stars" title="GitHub repository stars">
                  ★ {skill.githubStars.toLocaleString("en-US")}
                </span>
              )}
              <span className="skill-list__technical-id">{skill.skillId}</span>
            </li>
          ))}
          {skills.length === 0 && <li>No skills catalogued yet.</li>}
        </ul>
      )}

      <h2>Catalog a new skill</h2>
      <form
        className="admin-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (newSkillId.trim()) navigate(`/admin/skills/${encodeURIComponent(newSkillId.trim())}`);
        }}
      >
        <label>
          skill_id (must match the id used by real run uploads)
          <input value={newSkillId} onChange={(e) => setNewSkillId(e.target.value)} required />
        </label>
        <button type="submit">Continue</button>
      </form>
    </main>
  );
}
