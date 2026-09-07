import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import type { AdminApiClient, AdminSkillInput } from "../api/adminClient.js";

const EMPTY_FORM: AdminSkillInput = {
  name: "",
  description: "",
  githubUrl: "",
  license: "",
  maintainer: "",
  declaredCategory: "",
  githubStars: null,
};

export function AdminSkillEditPage({ adminApiClient }: { adminApiClient: AdminApiClient }) {
  const { skillId } = useParams<{ skillId: string }>();
  const navigate = useNavigate();
  const [form, setForm] = useState<AdminSkillInput>(EMPTY_FORM);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!skillId) return;
    let cancelled = false;
    setLoaded(false);
    setForm(EMPTY_FORM);
    setError(null);
    adminApiClient
      .listSkills()
      .then((skills) => {
        if (cancelled) return;
        const existing = skills.find((s) => s.skillId === skillId);
        if (existing) {
          setForm({
            name: existing.name,
            description: existing.description ?? "",
            githubUrl: existing.githubUrl ?? "",
            license: existing.license ?? "",
            maintainer: existing.maintainer ?? "",
            declaredCategory: existing.declaredCategory ?? "",
            githubStars: existing.githubStars,
          });
        }
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) navigate("/admin/login");
      });
    return () => {
      cancelled = true;
    };
  }, [adminApiClient, skillId, navigate]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!skillId) return;
    setError(null);
    setSubmitting(true);
    try {
      await adminApiClient.upsertSkill(skillId, form);
      navigate("/admin/skills");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (!loaded) {
    return (
      <main className="admin-skill-edit-page">
        <p role="status">Loading…</p>
      </main>
    );
  }

  return (
    <main className="admin-skill-edit-page">
      <Link to="/admin/skills">← Back to catalog</Link>
      <h1>{form.name ? `Edit ${form.name}` : `Catalog ${skillId}`}</h1>
      <p className="skill-list__technical-id">{skillId}</p>
      <form className="admin-form" onSubmit={handleSubmit}>
        <label>
          Name
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </label>
        <label>
          Description
          <textarea
            value={form.description ?? ""}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
          />
        </label>
        <label>
          GitHub URL
          <input
            type="url"
            value={form.githubUrl ?? ""}
            onChange={(e) => setForm({ ...form, githubUrl: e.target.value, githubStars: null })}
            placeholder="https://github.com/owner/repo"
          />
        </label>
        <label>
          GitHub stars
          <input
            type="number"
            min="0"
            max="2147483647"
            step="1"
            value={form.githubStars ?? ""}
            onChange={(event) =>
              setForm({ ...form, githubStars: event.target.value === "" ? null : event.target.valueAsNumber })
            }
            aria-describedby="github-stars-help"
          />
        </label>
        <p id="github-stars-help" className="admin-form__help">
          Leave blank if unknown. A scheduled GitHub refresh may update this count. Repository stars are not a
          skill performance score.
        </p>
        <label>
          License
          <input value={form.license ?? ""} onChange={(e) => setForm({ ...form, license: e.target.value })} />
        </label>
        <label>
          Maintainer
          <input
            value={form.maintainer ?? ""}
            onChange={(e) => setForm({ ...form, maintainer: e.target.value })}
          />
        </label>
        <label>
          Category (catalog/browse only — never affects measured deltas)
          <input
            value={form.declaredCategory ?? ""}
            onChange={(e) => setForm({ ...form, declaredCategory: e.target.value })}
          />
        </label>
        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : "Save"}
        </button>
      </form>
    </main>
  );
}
