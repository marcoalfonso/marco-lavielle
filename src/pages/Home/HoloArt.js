import React from "react";

// Holograms drawn over a whole face of the cube while it's looked at: line
// and dot art in cyan light, one theme per link. Each is a 100 x 100 SVG
// that fills the face; Home.css colours and animates them.

const Holo = ({ children, className }) => (
  <svg className={className ? `holo-art ${className}` : "holo-art"} viewBox="0 0 100 100" preserveAspectRatio="none">
    {children}
  </svg>
);

// Software: the dotted world map, Sydney pulsing, links arcing out to the world
const SYDNEY = [86.5, 71.8];
const CITIES = [
  [18.5, 41],
  [47, 33.5],
  [83, 43],
  [30, 70],
];
export const SoftwareArt = () => (
  <Holo className="holo-software">
    <image className="holo-map" href="/images/maps/250.png" x="2" y="20" width="96" height="61.4" preserveAspectRatio="none" />
    {CITIES.map(([x, y], i) => {
      const mx = (x + SYDNEY[0]) / 2;
      const my = Math.min(y, SYDNEY[1]) - 18;
      return (
        <g key={i}>
          <path className="holo-flow" style={{ animationDelay: `${i * 0.6}s` }} d={`M${SYDNEY[0]} ${SYDNEY[1]} Q${mx} ${my} ${x} ${y}`} />
          <circle className="holo-node" cx={x} cy={y} r="0.9" />
        </g>
      );
    })}
    <circle className="holo-pulse" cx={SYDNEY[0]} cy={SYDNEY[1]} r="2" />
    <circle className="holo-pulse" cx={SYDNEY[0]} cy={SYDNEY[1]} r="2" style={{ animationDelay: "1s" }} />
    <circle className="holo-node is-bright" cx={SYDNEY[0]} cy={SYDNEY[1]} r="1.3" />
  </Holo>
);

// Paintings: a colour wheel of light dots with a brush stroke sweeping through
const wheelDots = [];
for (let ring = 0; ring < 4; ring++) {
  const r = 12 + ring * 7;
  const n = 12 + ring * 6;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    wheelDots.push([50 + Math.cos(a) * r, 50 + Math.sin(a) * r, ring]);
  }
}
export const PaintingsArt = () => (
  <Holo className="holo-paintings">
    <g className="holo-spin-slow">
      {wheelDots.map(([x, y, ring], i) => (
        <circle key={i} className="holo-dot" cx={x.toFixed(2)} cy={y.toFixed(2)} r={(0.55 + ring * 0.12).toFixed(2)} />
      ))}
    </g>
    <circle className="holo-line faint" cx="50" cy="50" r="42" />
    <path className="holo-stroke" d="M14 70 C 28 52, 38 76, 52 56 S 74 30, 88 40" />
    <path className="holo-stroke thin" d="M16 74 C 30 57, 40 80, 54 60 S 76 34, 90 44" />
  </Holo>
);

// Thoughts: a constellation of ideas, pulses running between them (kept
// clear of the centre square, where the name sits)
const NODES = [
  [20, 24], [42, 16], [66, 22], [84, 34], [28, 44], [60, 30], [76, 52],
  [16, 62], [34, 70], [62, 72], [86, 72], [28, 86], [52, 88], [74, 86],
];
const EDGES = [
  [0, 1], [1, 2], [2, 3], [0, 4], [1, 5], [2, 5], [3, 6], [4, 5], [5, 6], [4, 7],
  [4, 8], [5, 8], [5, 9], [6, 9], [6, 10], [7, 8], [8, 9], [9, 10], [7, 11], [8, 12], [9, 13], [11, 12], [12, 13], [10, 13],
];
export const ThoughtsArt = () => (
  <Holo className="holo-thoughts">
    {EDGES.map(([a, b], i) => (
      <line key={`e${i}`} className="holo-line faint" x1={NODES[a][0]} y1={NODES[a][1]} x2={NODES[b][0]} y2={NODES[b][1]} />
    ))}
    {EDGES.filter((_, i) => i % 3 === 0).map(([a, b], i) => (
      <line
        key={`p${i}`}
        className="holo-flow"
        style={{ animationDelay: `${(i * 0.37).toFixed(2)}s` }}
        x1={NODES[a][0]}
        y1={NODES[a][1]}
        x2={NODES[b][0]}
        y2={NODES[b][1]}
      />
    ))}
    {NODES.map(([x, y], i) => (
      <circle key={`n${i}`} className="holo-node twinkle" style={{ animationDelay: `${((i * 0.29) % 2).toFixed(2)}s` }} cx={x} cy={y} r="1.4" />
    ))}
  </Holo>
);

// About: an identity scan, fingerprint ridges under a sweeping scan line
const ridges = [];
for (let i = 0; i < 9; i++) {
  const rx = 6 + i * 3.6;
  const ry = 8 + i * 4.2;
  // leave a gap in each ridge, like a fingerprint's breaks
  const gap = 0.35 + (i % 3) * 0.25;
  ridges.push(`M${(50 - rx * Math.sin(gap)).toFixed(2)} ${(54 - ry * Math.cos(gap)).toFixed(2)} A${rx} ${ry} 0 1 0 ${(50 + rx * Math.sin(gap)).toFixed(2)} ${(54 - ry * Math.cos(gap)).toFixed(2)}`);
}
export const AboutArt = () => (
  <Holo className="holo-about">
    {ridges.map((d, i) => (
      <path key={i} className="holo-line" d={d} />
    ))}
    <path className="holo-line faint" d="M10 10 h10 M10 10 v10 M90 10 h-10 M90 10 v10 M10 90 h10 M10 90 v-10 M90 90 h-10 M90 90 v-10" />
    <rect className="holo-scanbar" x="8" y="0" width="84" height="0.6" />
  </Holo>
);

// Game: a neon grid racing toward you under a wireframe horizon
const gridX = [];
for (let i = -8; i <= 8; i++) gridX.push(`M${50 + i * 3} 46 L${50 + i * 16} 100`);
export const GameArt = () => (
  <Holo className="holo-game">
    <path className="holo-line faint" d="M0 46 L100 46" />
    <path className="holo-line" d="M4 46 L18 34 L27 41 L38 28 L49 40 L58 32 L70 42 L82 30 L96 46" />
    <circle className="holo-line faint" cx="50" cy="30" r="10" />
    <path className="holo-line faint" d={gridX.join(" ")} />
    <g className="holo-grid-rows">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <path key={i} className="holo-line" d="M0 0 L100 0" style={{ animationDelay: `${(-i * 0.5).toFixed(1)}s` }} />
      ))}
    </g>
  </Holo>
);

// GitHub: branches splitting off and merging back round the edges of the
// face (clear of the name in the middle), commits travelling along
const MAIN = "M14 6 L14 94";
const FEATURE = "M14 16 C 14 26, 86 18, 86 30 L86 70 C 86 82, 14 74, 14 84";
const FIX = "M86 40 C 86 46, 64 44, 64 50 L64 56 C 64 62, 86 58, 86 62";
const COMMITS = [
  [14, 10], [14, 16], [14, 34], [14, 50], [14, 66], [14, 84], [14, 91],
  [86, 30], [86, 40], [70, 52], [86, 62], [86, 70],
];
export const GitHubArt = () => (
  <Holo className="holo-github">
    <path className="holo-line" d={MAIN} />
    <path className="holo-line" d={FEATURE} />
    <path className="holo-line faint" d={FIX} />
    <path className="holo-flow" d={MAIN} />
    <path className="holo-flow" style={{ animationDelay: "0.8s" }} d={FEATURE} />
    {COMMITS.map(([x, y], i) => (
      <circle key={i} className="holo-commit" cx={x} cy={y} r="1.9" />
    ))}
  </Holo>
);
