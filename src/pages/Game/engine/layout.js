// ---------------------------------------------------------------------------
// World layout — pure data shared by the renderer and the physics world.
//
// The camera sits at a fixed isometric angle looking toward (-1, -1, -1), so
// "up the screen" is the -X/-Z diagonal. The map is a central plaza with four
// spoke roads meeting a square ring road; each quadrant is a themed area:
//
//   NW (x<0, z<0)  Playground — bowling, brick wall, dominoes, crates
//   NE (x>0, z<0)  Projects   — portfolio billboards with drive-in pads
//   SW (x<0, z>0)  Jump park  — ramps, humps, a hoop
//   SE (x>0, z>0)  Stadium    — football pitch + fountain
//
// Tall things only live north/west of the ring so they never sit between the
// camera and the car.
// ---------------------------------------------------------------------------

export const SPAWN = { x: 7, z: 7, yaw: (3 * Math.PI) / 4 }; // nose toward (-1, -1)

export const RING = 80; // ring road centre line
export const ROAD_W = 12;
export const PLAZA_R = 26;
export const BOUNDARY = 112;

export const TOTAL_CRYSTALS = 10;

// type: "ramp" climbs along its local +X; "hump" is a symmetric bump.
// yaw rotates local +X onto (cos yaw, 0, -sin yaw).
export const RAMPS = [
  { type: "ramp", x: -26, z: 48, yaw: Math.PI, len: 14, width: 9, h: 3.6 },
  { type: "ramp", x: -46, z: 66, yaw: Math.PI / 2, len: 12, width: 9, h: 3.2 },
  { type: "hump", x: -32, z: 14, yaw: 0, len: 7, width: 8, h: 1.3 },
  { type: "hump", x: -42, z: 14, yaw: 0, len: 7, width: 8, h: 1.3 },
  { type: "hump", x: -52, z: 14, yaw: 0, len: 7, width: 8, h: 1.3 },
  { type: "hump", x: -62, z: 14, yaw: 0, len: 7, width: 8, h: 1.3 },
];

export const HOOPS = [{ x: -56, y: 5.2, z: 48, r: 3.8, yaw: Math.PI / 2 }];

// Buildings sit outside the ring on the far (north / west) sides only.
export const BUILDINGS = [
  { x: -78, z: -102, w: 18, h: 26, d: 14, c: 0 },
  { x: -34, z: -100, w: 22, h: 18, d: 16, c: 1 },
  { x: 6, z: -103, w: 16, h: 32, d: 12, c: 2 },
  { x: 42, z: -100, w: 20, h: 22, d: 16, c: 3 },
  { x: 80, z: -102, w: 16, h: 16, d: 14, c: 4 },
  { x: -102, z: -60, w: 14, h: 20, d: 20, c: 5 },
  { x: -100, z: -14, w: 16, h: 28, d: 16, c: 2 },
  { x: -102, z: 30, w: 14, h: 16, d: 18, c: 0 },
  { x: -100, z: 74, w: 16, h: 22, d: 16, c: 3 },
];

export const FOUNTAIN = { x: 17, z: 62, r: 6.8 };

export const PITCH = { x: 52, z: 48, w: 36, d: 26 }; // goals on the ±X ends
export const GOAL = { width: 11, height: 4.4, depth: 3.2 };

export const BOWLING = {
  ball: { x: -22, z: -46 },
  apex: { x: -44, z: -46 }, // head pin; rows extend toward -X
  lane: { x0: -18, x1: -58, z: -46, width: 7 },
};

export const BRICK_WALL = { x: -38, z: -66, cols: 8, rows: 5 };
export const DOMINOES = { cx: -50, cz: -22, r: 9, count: 30, a0: -0.2, a1: Math.PI * 1.55 };
export const CRATES = { x: -66, z: -30 };
export const CONES = (() => {
  const list = [];
  for (let i = 0; i < 7; i++) list.push({ x: i % 2 ? 2.8 : -2.8, z: -34 - i * 6 });
  return list;
})();

// Drive-in pads. "link" pads show an Enter prompt, "reset" pads fire on entry.
export const PADS = [
  {
    id: "software",
    kind: "link",
    x: 30,
    z: -34,
    size: 8,
    title: "SOFTWARE",
    subtitle: "Apps, sites & experiments",
    href: "/software",
    color: "#e8581c",
  },
  {
    id: "art",
    kind: "link",
    x: 52,
    z: -34,
    size: 8,
    title: "ART",
    subtitle: "Paintings & visual work",
    href: "/art",
    color: "#6f8094",
  },
  {
    id: "journal",
    kind: "link",
    x: 30,
    z: -56,
    size: 8,
    title: "JOURNAL",
    subtitle: "Writing & notes",
    href: "/journal",
    color: "#7e9070",
  },
  {
    id: "about",
    kind: "link",
    x: 52,
    z: -56,
    size: 8,
    title: "ABOUT",
    subtitle: "Who is Marco?",
    href: "/about",
    color: "#b09a6e",
  },
  { id: "bowling-reset", kind: "reset", x: -22, z: -56, size: 6, title: "RESET PINS" },
  { id: "props-reset", kind: "reset", x: -14, z: -14, size: 5, title: "RESET NAME" },
];

// Crystal spots — some need a jump or a detour. y is the hover height.
export const CRYSTALS = [
  { x: -44, y: 6.2, z: 48 }, // over the jump park crossing
  { x: -60, y: 2.6, z: -46 }, // behind the bowling pins
  { x: -50, y: 2.6, z: -22 }, // inside the domino spiral
  { x: 71.5, y: 2.6, z: 48 }, // in the east goal
  { x: 41, y: 2.6, z: -45 }, // between the project pads
  { x: -80, y: 2.6, z: -80 }, // far ring corner
  { x: 98, y: 2.6, z: 60 }, // out past the east ring
  { x: -56, y: 2.6, z: -93 }, // between the northern buildings
  { x: -52, y: 4.4, z: 14 }, // over the humps
  { x: 60, y: 2.6, z: 92 }, // south of the stadium
];

export const LAMPS = (() => {
  const list = [];
  const inner = RING - 7.6;
  [-60, -20, 20, 60].forEach((t) => {
    list.push({ x: t, z: -inner }, { x: t, z: inner }, { x: -inner, z: t }, { x: inner, z: t });
  });
  [-50, 50].forEach((t) => {
    list.push({ x: 8.6, z: t }, { x: -8.6, z: t + 12 }, { x: t, z: 8.6 }, { x: t - 12, z: -8.6 });
  });
  return list;
})();

// Deterministic RNG so the forest is the same on every load.
export const mulberry32 = (seed) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// Is (x, z) on any paved surface (roads / plaza)?
export const onRoad = (x, z, margin = 0) => {
  const half = ROAD_W / 2 + 2.75 + margin; // road + sidewalk
  if (Math.hypot(x, z) < PLAZA_R + margin) return true;
  const ax = Math.abs(x);
  const az = Math.abs(z);
  const ringHit =
    (Math.abs(ax - RING) < half && az < RING + half) ||
    (Math.abs(az - RING) < half && ax < RING + half);
  if (ringHit) return true;
  if (ax < half && az < RING) return true;
  if (az < half && ax < RING) return true;
  return false;
};

// Height of a ramp/hump profile in its local frame (for hover placement).
export const prismProfile = (r) =>
  r.type === "hump"
    ? [
        [-r.len / 2, 0],
        [r.len / 2, 0],
        [0, r.h],
      ]
    : [
        [-r.len / 2, 0],
        [r.len / 2, 0],
        [r.len / 2, r.h],
      ];

// Prism (extruded convex profile) with faces wound CCW seen from outside —
// the convention both three.js and cannon-es expect.
export const buildPrism = (profile, width) => {
  const n = profile.length;
  const vertices = [];
  profile.forEach(([x, y]) => vertices.push([x, y, -width / 2]));
  profile.forEach(([x, y]) => vertices.push([x, y, width / 2]));
  const faces = [];
  faces.push(profile.map((_, i) => i));
  faces.push(profile.map((_, i) => i + n));
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    faces.push([i, j, j + n, i + n]);
  }
  const centroid = [0, 0, 0];
  vertices.forEach((v) => v.forEach((c, k) => (centroid[k] += c / vertices.length)));
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
  const oriented = faces.map((f) => {
    const [a, b, c] = f.map((i) => vertices[i]);
    const normal = cross(sub(b, a), sub(c, a));
    const fc = [0, 0, 0];
    f.forEach((i) => vertices[i].forEach((v, k) => (fc[k] += v / f.length)));
    const out = sub(fc, centroid);
    const dot = normal[0] * out[0] + normal[1] * out[1] + normal[2] * out[2];
    return dot < 0 ? f.slice().reverse() : f;
  });
  return { vertices, faces: oriented };
};
