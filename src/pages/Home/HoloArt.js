import React from "react";

// Holograms drawn over a whole face of the cube while it's looked at: line
// and dot art in cyan light, one theme per link. Each is a 100 x 100 SVG
// that fills the face; Home.css colours and animates them.

const Holo = ({ children, className }) => (
  <svg className={className ? `holo-art ${className}` : "holo-art"} viewBox="0 0 100 100" preserveAspectRatio="none">
    {children}
  </svg>
);

// Software: a circuit board, a chip framing the centre square and traces
// running out to the edges, pulses of data travelling along them
const TRACES = [
  "M40 31 L40 18 L22 18 L22 8",
  "M47 31 L47 6",
  "M60 31 L60 14 L80 14 L80 6",
  "M42 69 L42 84 L14 84",
  "M52 69 L52 94",
  "M60 69 L60 80 L86 80 L86 92",
  "M31 42 L8 42",
  "M31 56 L18 56 L18 70 L6 70",
  "M69 40 L84 40 L84 24 L94 24",
  "M69 58 L94 58",
];
const PADS = [
  [22, 8], [47, 6], [80, 6], [14, 84], [52, 94], [86, 92], [8, 42], [6, 70], [94, 24], [94, 58],
];
const PINS = [];
for (let i = 0; i < 5; i++) {
  const t = 38 + i * 6;
  PINS.push(`M${t} 31 v-2`, `M${t} 69 v2`, `M31 ${t} h-2`, `M69 ${t} h2`);
}
export const SoftwareArt = () => (
  <Holo className="holo-software">
    <path className="holo-line faint" d={TRACES.join(" ")} />
    {TRACES.map((d, i) => (
      <path key={i} className="holo-flow" pathLength="100" style={{ animationDelay: `${((i * 0.43) % 2.4).toFixed(2)}s` }} d={d} />
    ))}
    <path className="holo-line" d="M31 31 H69 V69 H31 Z M31 36 L36 31" />
    <path className="holo-line" d={PINS.join(" ")} />
    {PADS.map(([x, y], i) => (
      <circle key={i} className="holo-pad" cx={x} cy={y} r="1.6" />
    ))}
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

// About: a radar, a sweep turning round and contacts pinging back
const BLIPS = [
  [72, 30, 0.2],
  [24, 64, 1.1],
  [66, 76, 1.9],
  [30, 26, 2.7],
];
const radarTicks = [];
for (let i = 0; i < 48; i++) {
  const a = (i / 48) * Math.PI * 2;
  const r1 = i % 4 === 0 ? 43 : 45;
  radarTicks.push(`M${(50 + Math.cos(a) * 47).toFixed(2)} ${(50 + Math.sin(a) * 47).toFixed(2)} L${(50 + Math.cos(a) * r1).toFixed(2)} ${(50 + Math.sin(a) * r1).toFixed(2)}`);
}
export const AboutArt = () => (
  <Holo className="holo-about">
    <defs>
      <linearGradient id="holo-sweep" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#6ff5ee" stopOpacity="0" />
        <stop offset="100%" stopColor="#6ff5ee" stopOpacity="0.45" />
      </linearGradient>
    </defs>
    <circle className="holo-line faint" cx="50" cy="50" r="22" />
    <circle className="holo-line faint" cx="50" cy="50" r="32" />
    <circle className="holo-line" cx="50" cy="50" r="42" />
    <path className="holo-line faint" d="M50 4 V28 M50 72 V96 M4 50 H28 M72 50 H96" />
    <path className="holo-line faint" d={radarTicks.join(" ")} />
    <g className="holo-radar-sweep">
      <path d="M50 50 L92 50 A42 42 0 0 0 82.2 23 Z" fill="url(#holo-sweep)" />
      <path className="holo-line" d="M50 50 L92 50" />
    </g>
    {BLIPS.map(([x, y, delay], i) => (
      <g key={i}>
        <circle className="holo-pulse" style={{ animationDelay: `${delay}s` }} cx={x} cy={y} r="1.6" />
        <circle className="holo-node twinkle" style={{ animationDelay: `${delay}s` }} cx={x} cy={y} r="1.2" />
      </g>
    ))}
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
