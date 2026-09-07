import { Link } from "react-router-dom";
import { DiffMark } from "./EvidenceGraphics.js";

export const REPOSITORY_URL = "https://github.com/RobinStelt/skilldiff";
export const GETTING_STARTED_URL = `${REPOSITORY_URL}/blob/master/GETTING_STARTED.md`;

export function Brand() {
  return (
    <span className="brand">
      <DiffMark />
      <span>
        Skilldiff<span className="brand__period">.</span>
      </span>
    </span>
  );
}

export function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={diagonal ? "M6 18 18 6M6 6h12v12" : "M4 12h16m-6-6 6 6-6 6"} />
    </svg>
  );
}

export function SiteHeader() {
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="site-header">
        <Link to="/" className="site-header__brand" aria-label="Skilldiff home">
          <Brand />
        </Link>
        <nav className="site-header__nav" aria-label="Main navigation">
          <a href="/#explore">Explore skills</a>
          <a href="/#how-it-works">How it works</a>
          <a href={GETTING_STARTED_URL} target="_blank" rel="noreferrer">
            Documentation <Arrow diagonal />
          </a>
        </nav>
        <a
          className="button button--small button--outline"
          href={REPOSITORY_URL}
          target="_blank"
          rel="noreferrer"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 .9a11.1 11.1 0 0 0-3.51 21.63c.56.1.76-.24.76-.54v-2.07c-3.1.68-3.76-1.31-3.76-1.31-.5-1.28-1.23-1.63-1.23-1.63-1.01-.69.08-.68.08-.68 1.12.08 1.7 1.14 1.7 1.14 1 1.7 2.6 1.21 3.24.92.1-.72.39-1.21.71-1.49-2.47-.28-5.07-1.23-5.07-5.5 0-1.22.44-2.21 1.14-2.99-.12-.28-.5-1.42.1-2.95 0 0 .94-.3 3.06 1.14a10.66 10.66 0 0 1 5.57 0c2.12-1.44 3.05-1.14 3.05-1.14.61 1.53.23 2.67.12 2.95.71.78 1.14 1.77 1.14 2.99 0 4.28-2.61 5.21-5.1 5.49.4.35.76 1.02.76 2.06v3.07c0 .3.2.65.77.54A11.1 11.1 0 0 0 12 .9Z" />
          </svg>
          <span>GitHub</span>
          <Arrow diagonal />
        </a>
      </header>
    </>
  );
}
