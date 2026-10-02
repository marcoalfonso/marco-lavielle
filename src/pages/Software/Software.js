import React, { useEffect, useRef, useState } from "react";
import loadOrbitron from "components/fonts/loadOrbitron";
import useDeviceTilt, { prefersReducedMotion } from "components/motion/useDeviceTilt";
import Earth from "./Earth";
import Timeline from "./Timeline";
import RoleModal from "./RoleModal";
import { EDUCATION, EXPERIENCE, LANGUAGES, TECH, monthYear } from "./experience";
import "components/holo/holo.css";
import "./Software.css";

// Software: a career, from Mexico to Sydney. An Earth that forms out of
// a black hole with a flight arc between the two, then the work history as
// a path of cards drawn as the page scrolls, then education, languages and
// tech.

const PHONE_GAIN = 1.2; // Earth turn per degree of phone tilt

const yearsSince = (ym) => new Date().getFullYear() - Number(ym.slice(0, 4));

const Software = () => {
  const [open, setOpen] = useState(null);
  const [ready, setReady] = useState(false);
  const tiltRef = useRef({ x: 0, y: 0 });
  const xpRef = useRef(null);
  const { showHint, requestPermission, denied } = useDeviceTilt((x, y) => {
    const cap = (v) => Math.max(-25, Math.min(25, v));
    tiltRef.current = { x: (cap(x) * PHONE_GAIN * Math.PI) / 180, y: (cap(y) * PHONE_GAIN * Math.PI) / 180 };
  }, !prefersReducedMotion());

  useEffect(() => {
    loadOrbitron();
    document.documentElement.classList.add("software-html");
    return () => document.documentElement.classList.remove("software-html");
  }, []);

  const first = EXPERIENCE[EXPERIENCE.length - 1];

  return (
    <main className={`software-page holo-ui${ready ? " is-ready" : ""}`}>
      <header className="software-top">
        <a className="software-back" href="/">
          <span aria-hidden="true">&lsaquo;</span> Marco Lavielle
        </a>
      </header>

      <section className="software-hero">
        <Earth className="software-earth" tiltRef={tiltRef} onReady={() => setReady(true)} />
        <div className="software-intro">
          <p className="software-label">Work · Mexico → Sydney</p>
          <h1 className="software-title">Software</h1>
          <p className="software-lede">
            I like to design and build pixel perfect products.
            <span> Early stage startups, enterprise and government.</span>
          </p>
          <dl className="software-stats">
            <div>
              <dt>Years building</dt>
              <dd>{yearsSince(first.from)}+</dd>
            </div>
            <div>
              <dt>Since</dt>
              <dd>{monthYear(first.from)}</dd>
            </div>
          </dl>
        </div>
        {showHint && (
          <button type="button" className="software-motion-hint" onClick={requestPermission}>
            <span className="software-motion-icon" aria-hidden="true" />
            Tap, then move your phone
          </button>
        )}
        {denied && (
          <p className="software-motion-hint is-passive" aria-live="polite">
            Motion blocked in Safari settings
          </p>
        )}
        <button
          type="button"
          className="software-scroll-cue"
          onClick={() => xpRef.current && xpRef.current.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth" })}
        >
          Scroll down
        </button>
      </section>

      <section className="software-block" aria-labelledby="xp-heading" ref={xpRef}>
        <div className="software-heading">
          <p className="software-label" id="xp-heading">
            Experience
          </p>
          <h2 className="software-statement">
            Where I&rsquo;ve built things.
            <span> Most recent first. Open a site for the details.</span>
          </h2>
        </div>
        <Timeline items={EXPERIENCE} onOpen={setOpen} />
      </section>

      <section className="software-block software-more">
        <div className="software-col">
          <p className="software-label">Education</p>
          <ul className="software-edu">
            {EDUCATION.map((e) => (
              <li key={e.degree}>
                <strong>{e.degree}</strong>
                <span>{e.school}</span>
                <small>
                  {monthYear(e.from)} – {monthYear(e.to)}
                </small>
              </li>
            ))}
          </ul>
        </div>
        <div className="software-col">
          <p className="software-label">Languages</p>
          <ul className="software-langs">
            {LANGUAGES.map((l, i) => (
              <li key={l}>
                <span className="software-lang-index">{String(i + 1).padStart(2, "0")}</span>
                {l}
              </li>
            ))}
          </ul>
          <p className="software-label">Tech</p>
          <ul className="xp-chips is-large">
            {TECH.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      </section>

      <footer className="software-foot">
        <a href="https://www.linkedin.com/in/marcolavielle/" target="_blank" rel="noopener noreferrer">
          LinkedIn
        </a>
        <a href="https://github.com/marcoalfonso" target="_blank" rel="noopener noreferrer">
          GitHub
        </a>
        <a href="/about">Contact</a>
      </footer>

      <RoleModal item={open} onClose={() => setOpen(null)} />
    </main>
  );
};

export default Software;
