import { Arrow } from "./SiteHeader.js";

export function LandingHero() {
  return (
    <section className="landing-hero" aria-labelledby="hero-title">
      <img
        className="landing-hero__image"
        src="/images/skilldiff-signal.webp"
        alt=""
        width="1659"
        height="948"
        loading="eager"
        decoding="async"
      />
      <div className="landing-hero__shade" aria-hidden="true" />
      <div className="hero-shell">
        <div className="hero-kicker">
          <span className="status-dot" /> REAL TASKS. MEASURABLE DIFFERENCES.
          <span className="hero-kicker__index">SD—001</span>
        </div>
        <div className="landing-hero__copy">
          <h1 id="hero-title">
            Every skill makes
            <br />a promise.
            <br />
            <span>See the difference.</span>
          </h1>
          <p className="landing-hero__description">
            Find the skills that earn their place.
            <br />
            Real tasks. Paired runs. Evidence you can inspect.
          </p>
          <div className="landing-hero__actions">
            <a className="button button--primary" href="#explore">
              Explore the skills <Arrow diagonal />
            </a>
            <a className="button button--quiet" href="#how-it-works">
              Inside the experiment <Arrow />
            </a>
          </div>
        </div>
        <div className="hero-annotation" aria-hidden="true">
          <span className="hero-annotation__cross">+</span>
          <span>
            ONE VARIABLE.
            <br />
            TWO POSSIBILITIES.
          </span>
          <span className="hero-annotation__line" />
        </div>
        <div className="hero-bottomline">
          <span>BUILT FOR CLAUDE CODE</span>
          <a href="#how-it-works">
            <span className="hero-scroll" aria-hidden="true">
              ↓
            </span>{" "}
            FOLLOW THE EVIDENCE
          </a>
          <span>VISUAL STUDY / 01</span>
        </div>
      </div>
    </section>
  );
}
