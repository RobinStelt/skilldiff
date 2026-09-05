import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { AdminApiClient } from "../api/adminClient.js";

export function AdminLoginPage({ adminApiClient }: { adminApiClient: AdminApiClient }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await adminApiClient.login(username, password);
      navigate("/admin/skills");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="admin-login-page">
      <h1>Admin login</h1>
      <p>
        Curates the skill catalog (name, GitHub link, license, maintainer) — never affects measured deltas, which
        come exclusively from real CLI runs.
      </p>
      <form className="admin-form" onSubmit={handleSubmit}>
        <label>
          Username
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={submitting}>
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
