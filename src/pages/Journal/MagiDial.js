import React from "react";

// The journal's dial, after the MAGI screens: concentric rings of maze-like
// segments turning slowly (two sets, opposite ways), an outer band of glyph
// blocks, and a three-armed core whose arms are social channels. Each ring set is
// its own <svg> so its turning is a cheap layer rotation.

// seeded, so the maze is the same on every visit
const seeded = (seed) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const polar = (r, deg) => {
  const a = (deg * Math.PI) / 180;
  return [(Math.cos(a) * r).toFixed(2), (Math.sin(a) * r).toFixed(2)];
};
const arc = (r, from, to) => {
  const [x1, y1] = polar(r, from);
  const [x2, y2] = polar(r, to);
  return `M${x1} ${y1}A${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${x2} ${y2}`;
};

const RING_START = 78;
const RING_STEP = 12;
const RING_COUNT = 15;

// rings broken into segments, with short radial links to the next ring out
const buildMaze = () => {
  const rnd = seeded(1995);
  const sets = [[], []];
  for (let k = 0; k < RING_COUNT; k++) {
    const r = RING_START + k * RING_STEP;
    let a = rnd() * 20;
    const paths = [];
    while (a < 360) {
      const len = 8 + rnd() * 46;
      const end = Math.min(a + len, 359.9);
      paths.push(arc(r, a, end));
      if (rnd() < 0.45 && k < RING_COUNT - 1) {
        const [x1, y1] = polar(r, end);
        const [x2, y2] = polar(r + RING_STEP, end);
        paths.push(`M${x1} ${y1}L${x2} ${y2}`);
      }
      a = end + 3 + rnd() * 7;
    }
    sets[k % 2].push(paths.join(""));
  }
  return sets.map((s) => s.join(""));
};
const [MAZE_A, MAZE_B] = buildMaze();

// crosshair struts with brackets, as on the MAGI screens
const STRUTS = [0, 90, 180, 270]
  .map((deg) => {
    const [x1, y1] = polar(262, deg);
    const [x2, y2] = polar(300, deg);
    const [bx1, by1] = polar(278, deg - 2.2);
    const [bx2, by2] = polar(278, deg + 2.2);
    return `M${x1} ${y1}L${x2} ${y2}M${bx1} ${by1}L${bx2} ${by2}`;
  })
  .join("");

const TICKS = Array.from({ length: 180 }, (_, i) => {
  const deg = i * 2;
  const [x1, y1] = polar(252, deg);
  const [x2, y2] = polar(i % 5 === 0 ? 246 : 249, deg);
  return `M${x1} ${y1}L${x2} ${y2}`;
}).join("");

const ARM_ANGLES = [0, -120, 120]; // right, upper left, lower left

// line icons, drawn in the dial's light
const ICONS = {
  linkedin: (
    <>
      <rect x="2" y="2" width="20" height="20" rx="4" />
      <path d="M7 10v7M7 7v.01M11 17v-7M11 13.5c0-2 1.2-3.5 3-3.5s3 1.2 3 3.5V17" />
    </>
  ),
  instagram: (
    <>
      <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" />
      <circle cx="12" cy="12" r="4.5" />
      <path d="M17.5 6.5v.01" />
    </>
  ),
  twitter: <path d="M4 4l16 16M20 4L4 20" />,
};

const SocialIcon = ({ name }) => (
  <svg className="magi-social-icon" viewBox="0 0 24 24" aria-hidden="true">
    {ICONS[name]}
  </svg>
);

const MagiDial = ({ channels }) => (
  <div className="magi">
    <svg className="magi-layer magi-static" viewBox="-300 -300 600 600" aria-hidden="true">
      <circle className="magi-line is-faint" r="72" />
      <path className="magi-line is-faint" d={TICKS} />
      <path className="magi-line" d={STRUTS} />
      <circle className="magi-line is-faint" r="298" />
    </svg>
    <svg className="magi-layer magi-spin is-a" viewBox="-300 -300 600 600" aria-hidden="true">
      <path className="magi-maze" d={MAZE_A} />
    </svg>
    <svg className="magi-layer magi-spin is-b" viewBox="-300 -300 600 600" aria-hidden="true">
      <path className="magi-maze is-dim" d={MAZE_B} />
    </svg>
    <svg className="magi-layer magi-spin is-glyphs" viewBox="-300 -300 600 600" aria-hidden="true">
      <circle className="magi-glyphs" r="268" />
      <circle className="magi-glyphs is-fine" r="284" />
    </svg>

    {/* the three arms: one social channel each, a single link made of four
        slanted rows (header, identity, a ticker of what's there, and a call
        to action with a live signal) */}
    {/* the channels turn together, against the outer rings; the core stays put */}
    <div className="magi-arms">
      {channels.map((ch, a) => {
        const angle = ARM_ANGLES[a];
        const flipped = Math.abs(angle) > 90;
        return (
          <div
            key={ch.id}
            className={flipped ? "magi-arm is-flipped" : "magi-arm"}
            style={{ transform: `rotate(${flipped ? angle + 180 : angle}deg)`, "--arm": a }}
          >
            <a
              className="magi-social"
              href={ch.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${ch.name}, ${ch.handle} (opens in a new tab)`}
            >
              <span className="magi-social-row is-head" style={{ "--build": 0 }}>
                <span className="magi-social-signal" aria-hidden="true" />
                <SocialIcon name={ch.id} />
                <span className="magi-social-name">{ch.name}</span>
                <span className="magi-social-channel">{ch.channel}</span>
              </span>
              <span className="magi-social-row is-handle" style={{ "--build": 1 }}>
                {ch.handle}
              </span>
              <span className="magi-social-row is-ticker" style={{ "--build": 2 }} aria-hidden="true">
                <span className="magi-ticker">
                  <span className="magi-ticker-track">
                    {ch.feed.concat(ch.feed[0]).map((line, i) => (
                      <span key={i} className="magi-ticker-line">
                        {line}
                      </span>
                    ))}
                  </span>
                </span>
              </span>
              <span className="magi-social-row is-action" style={{ "--build": 3 }}>
                <span className="magi-social-bars" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                </span>
                <span className="magi-social-cta">{ch.action}</span>
              </span>
            </a>
          </div>
        );
      })}
    </div>

    <div className="magi-core">
      <span className="magi-core-kicker">Marco-1</span>
      <strong>ML</strong>
      <strong>01</strong>
      <span className="magi-core-sub">Journal</span>
    </div>
  </div>
);

export default MagiDial;
