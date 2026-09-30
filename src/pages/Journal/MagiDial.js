import React from "react";

// The journal's dial, after the MAGI screens: concentric rings of maze-like
// segments turning slowly (two sets, opposite ways), an outer band of glyph
// blocks, and a three-armed core whose arms hold the posts. Each ring set is
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
const pad = (n) => String(n).padStart(3, "0");

const MagiDial = ({ arms, selected, onSelect }) => (
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

    {arms.map((arm, a) => {
      const angle = ARM_ANGLES[a];
      const flipped = Math.abs(angle) > 90;
      return (
        <div
          key={arm.name}
          className={flipped ? "magi-arm is-flipped" : "magi-arm"}
          style={{ transform: `rotate(${flipped ? angle + 180 : angle}deg)` }}
        >
          <div className="magi-arm-stack">
            <span className="magi-arm-head">{arm.name}</span>
            {arm.entries.map(({ post, index, number }) => (
              <a
                key={post.slug}
                href={`/journal/${post.slug}`}
                className={index === selected ? "magi-arm-row is-selected" : "magi-arm-row"}
                onPointerEnter={(e) => e.pointerType === "mouse" && onSelect(index)}
                onFocus={() => onSelect(index)}
                tabIndex={-1}
              >
                <span className="magi-arm-num">{pad(number)}</span>
                <span className="magi-arm-title">{post.title}</span>
              </a>
            ))}
          </div>
        </div>
      );
    })}

    <div className="magi-core">
      <span className="magi-core-kicker">Marco-1</span>
      <strong>ML</strong>
      <strong>01</strong>
      <span className="magi-core-sub">Journal</span>
    </div>
  </div>
);

export default MagiDial;
