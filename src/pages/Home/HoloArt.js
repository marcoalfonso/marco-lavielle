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

// Paintings: a canvas being painted in light. A frame round the face;
// gestural strokes paint themselves across the top one after another, a
// palette with glowing wells sits bottom left and a brush bottom right lays
// down the last stroke; splatters at the sides. The centre square, where the
// name sits, stays clear.
const STROKES = [
  // across the top: a sweep, a counter-sweep, a flick
  "M12 22 C 22 12, 34 28, 46 18 S 66 10, 76 20 S 86 26, 90 16",
  "M14 28 C 26 22, 38 30, 52 24 S 74 22, 88 27",
  "M58 13 C 64 9, 70 12, 76 9",
  // the brush's stroke along the bottom
  "M66 76 C 58 82, 52 74, 44 80 S 40 86, 38 84",
];
const SPLATTER = [
  [17, 42, 1.1], [21, 47, 0.6], [14, 51, 0.8], [24, 55, 0.5], [19, 60, 0.7],
  [83, 40, 0.7], [79, 46, 1], [86, 52, 0.6], [81, 58, 0.9], [76, 54, 0.5],
];
const WELLS = [
  [16, 79, 2.1], [22, 74, 1.8], [29, 76, 1.9], [27, 83, 1.7],
];
export const PaintingsArt = () => (
  <Holo className="holo-paintings">
    {/* the frame */}
    <path className="holo-line" d="M5 5 H95 V95 H5 Z" />
    <path className="holo-line faint" d="M8.5 8.5 H91.5 V91.5 H8.5 Z" />
    <path className="holo-line faint" d="M5 5 L8.5 8.5 M95 5 L91.5 8.5 M5 95 L8.5 91.5 M95 95 L91.5 91.5" />
    {/* strokes painting themselves */}
    {STROKES.map((d, i) => (
      <g key={i}>
        <path className="holo-line faint" d={d} />
        <path className={i === 1 ? "holo-paint is-thin" : "holo-paint"} pathLength="100" style={{ animationDelay: `${(i * 0.9).toFixed(1)}s` }} d={d} />
      </g>
    ))}
    {/* palette, its thumb hole and the paint wells */}
    <path className="holo-line" d="M10 80 C 10 70, 22 66, 32 70 C 36 72, 34 77, 31 78 C 28 79, 30 83, 33 84 C 35 90, 24 93, 16 91 C 11 89, 10 85, 10 80 Z" />
    <circle className="holo-line faint" cx="30.5" cy="81" r="1.6" />
    {WELLS.map(([x, y, r], i) => (
      <circle key={i} className="holo-node twinkle" style={{ animationDelay: `${(i * 0.45).toFixed(2)}s` }} cx={x} cy={y} r={r} />
    ))}
    {/* the brush, its tip on the bottom stroke */}
    <path className="holo-line" d="M91 92 L74 75 M89.5 93.5 L72.5 76.5" />
    <path className="holo-line" d="M74 75 L70 73 L68 76 L72.5 76.5 Z" />
    <path className="holo-line faint" d="M90 88 L93 91 M86.5 84.5 L89 87" />
    {/* splatters */}
    {SPLATTER.map(([x, y, r], i) => (
      <circle key={i} className="holo-dot" cx={x} cy={y} r={r} />
    ))}
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

// About: an identity scan. A fingerprint drawn in ridges of light, a scan
// beam passing down over it, corner brackets and two small readouts.
const ridgeRng = (() => {
  let seed = 9;
  return () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
})();
const RIDGES = [];
for (let k = 0; k < 12; k++) {
  const r = 15 + k * 2.65;
  const segs = 2 + (k % 3);
  let a = -Math.PI / 2 + ridgeRng() * 0.8;
  for (let sgi = 0; sgi < segs; sgi++) {
    const span = ((Math.PI * 2) / segs) * (0.74 + ridgeRng() * 0.18);
    const pts = [];
    for (let t = 0; t <= 1.0001; t += 0.05) {
      const ang = a + span * t;
      const wob = 1 + Math.sin(ang * 3 + k) * 0.03;
      // a loop pattern: taller than it is wide, drawn up from the base
      pts.push(`${(50 + Math.cos(ang) * r * 0.82 * wob).toFixed(2)} ${(54 + Math.sin(ang) * r * wob).toFixed(2)}`);
    }
    RIDGES.push(`M${pts.join(" L")}`);
    a += (Math.PI * 2) / segs;
  }
}
export const AboutArt = () => (
  <Holo className="holo-about">
    <defs>
      <linearGradient id="holo-scan" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#6ff5ee" stopOpacity="0" />
        <stop offset="85%" stopColor="#6ff5ee" stopOpacity="0.35" />
        <stop offset="100%" stopColor="#ffffff" stopOpacity="0.9" />
      </linearGradient>
      <clipPath id="holo-print">
        <rect x="6" y="6" width="88" height="88" />
      </clipPath>
    </defs>
    <g clipPath="url(#holo-print)">
      {RIDGES.map((d, i) => (
        <path key={i} className={i % 2 === 0 ? "holo-line" : "holo-line faint"} d={d} />
      ))}
      {RIDGES.filter((_, i) => i % 4 === 1).map((d, i) => (
        <path key={`f${i}`} className="holo-flow" pathLength="100" style={{ animationDelay: `${(i * 0.6).toFixed(1)}s` }} d={d} />
      ))}
    </g>
    {/* the scan beam */}
    <g className="holo-scan">
      <rect x="6" y="-14" width="88" height="14" fill="url(#holo-scan)" />
      <path className="holo-line" d="M6 0 H94" />
    </g>
    {/* brackets and readouts */}
    <path className="holo-line" d="M4 14 V4 H14 M86 4 H96 V14 M96 86 V96 H86 M14 96 H4 V86" />
    <text className="holo-readout" x="7" y="11">ID · ML-01</text>
    <text className="holo-readout twinkle" x="93" y="93" textAnchor="end">MATCH 99.8%</text>
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
