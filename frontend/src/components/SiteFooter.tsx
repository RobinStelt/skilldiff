import { Link } from "react-router-dom";
import { Brand, REPOSITORY_URL } from "./SiteHeader.js";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div>
        <Link to="/" className="site-footer__brand" aria-label="Skilldiff home">
          <Brand />
        </Link>
        <p>Every skill makes a promise. See the difference.</p>
      </div>
      <div className="site-footer__right">
        <nav aria-label="Footer navigation">
          <a href={REPOSITORY_URL} target="_blank" rel="noreferrer">
            GitHub ↗
          </a>
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
          <Link to="/admin/login">Admin</Link>
        </nav>
        <span>Built for curious developers.</span>
      </div>
    </footer>
  );
}
