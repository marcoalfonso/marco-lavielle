// ---------------------------------------------------------------------------
// Point cloud for the About page hologram: a standing figure sampled on the
// surface of a "smooth union" of simple parts (ellipsoids + tapered capsules),
// so the parts melt into one continuous body instead of showing seams.
//
// Units: metres, y up (feet at 0), x to the figure's side, z forward.
// Pure module (no DOM) so it can be benchmarked outside the browser.
// ---------------------------------------------------------------------------

const ellipsoid = (c, r) => ({ type: "e", c, r });
const capsule = (a, b, ra, rb) => ({ type: "c", a, b, ra, rb });
const mirror = ([x, y, z]) => [-x, y, z];
const mirrored = (part) =>
  part.type === "e"
    ? [part, ellipsoid(mirror(part.c), part.r)]
    : [part, capsule(mirror(part.a), mirror(part.b), part.ra, part.rb)];

const SHOULDER = [0.2, 1.405, 0.0];
const ELBOW = [0.305, 1.14, -0.015];
const WRIST = [0.395, 0.895, 0.02];
const HIP = [0.088, 0.92, 0.0];
const KNEE = [0.108, 0.51, 0.015];
const ANKLE = [0.12, 0.085, -0.01];

export const PARTS = [
  ellipsoid([0, 1.665, 0.005], [0.075, 0.1, 0.09]), // cranium
  ellipsoid([0, 1.6, 0.03], [0.055, 0.055, 0.06]), // face / jaw
  capsule([0, 1.47, -0.01], [0, 1.6, 0.0], 0.056, 0.048), // neck
  ellipsoid([0, 1.33, 0.005], [0.16, 0.165, 0.1]), // ribcage
  ellipsoid([0, 1.29, -0.035], [0.17, 0.14, 0.08]), // upper back / lats
  ellipsoid([0, 1.14, 0.012], [0.135, 0.13, 0.088]), // abdomen
  ellipsoid([0, 0.99, 0.0], [0.155, 0.1, 0.098]), // pelvis
  ...mirrored(ellipsoid([0.075, 1.365, 0.055], [0.085, 0.055, 0.05])), // pecs
  ...mirrored(ellipsoid([0.07, 0.925, -0.045], [0.085, 0.09, 0.075])), // glutes
  ...mirrored(capsule([0.03, 1.49, -0.02], [0.16, 1.44, -0.015], 0.05, 0.045)), // trapezius
  ...mirrored(ellipsoid([0.188, 1.42, 0.0], [0.07, 0.075, 0.068])), // deltoid
  ...mirrored(capsule(SHOULDER, ELBOW, 0.05, 0.038)), // upper arm
  ...mirrored(capsule([0.27, 1.26, 0.0], [0.29, 1.19, 0.0], 0.046, 0.04)), // biceps
  ...mirrored(capsule(ELBOW, WRIST, 0.042, 0.026)), // forearm
  ...mirrored(capsule([0.4, 0.875, 0.025], [0.43, 0.75, 0.035], 0.03, 0.021)), // hand
  ...mirrored(capsule(HIP, KNEE, 0.088, 0.05)), // thigh
  ...mirrored(capsule([0.085, 0.8, 0.02], [0.1, 0.62, 0.03], 0.075, 0.055)), // quads
  ...mirrored(ellipsoid([KNEE[0], KNEE[1], 0.022], [0.048, 0.052, 0.048])), // knee
  ...mirrored(capsule(KNEE, [0.115, 0.33, -0.02], 0.05, 0.05)), // upper calf
  ...mirrored(ellipsoid([0.112, 0.38, -0.03], [0.048, 0.08, 0.045])), // calf muscle
  ...mirrored(capsule([0.115, 0.33, -0.015], ANKLE, 0.047, 0.03)), // shin
  ...mirrored(capsule([0.12, 0.05, -0.03], [0.135, 0.028, 0.13], 0.036, 0.025)), // foot
  ...mirrored(ellipsoid([0.12, 0.04, -0.035], [0.032, 0.04, 0.038])), // heel
];

export const BODY_HEIGHT = 1.8;
const BLEND = 0.035; // smooth-union radius: how softly parts melt together

// Bounding sphere per part, used to skip parts that can't affect a point.
PARTS.forEach((part) => {
  if (part.type === "e") {
    part.bc = part.c;
    part.br = Math.max(...part.r);
  } else {
    part.bc = part.a.map((v, i) => (v + part.b[i]) / 2);
    const half = Math.hypot(part.b[0] - part.a[0], part.b[1] - part.a[1], part.b[2] - part.a[2]) / 2;
    part.br = half + Math.max(part.ra, part.rb);
  }
});

// Neighbours: parts whose bounding spheres come within the blend radius of
// each other. A point sampled on a part only ever needs these.
const MARGIN = BLEND + 0.03;
PARTS.forEach((part) => {
  part.near = PARTS.filter((other) => {
    const dx = part.bc[0] - other.bc[0];
    const dy = part.bc[1] - other.bc[1];
    const dz = part.bc[2] - other.bc[2];
    return Math.sqrt(dx * dx + dy * dy + dz * dz) < part.br + other.br + MARGIN;
  });
});

const len3 = (x, y, z) => Math.sqrt(x * x + y * y + z * z);

// Deterministic RNG so the figure is identical on every load.
const mulberry32 = (seed) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// Approximate signed distance from (x, y, z) to one part; negative = inside.
const partDistance = (part, x, y, z) => {
  if (part.type === "e") {
    const [rx, ry, rz] = part.r;
    const px = x - part.c[0];
    const py = y - part.c[1];
    const pz = z - part.c[2];
    const k0 = len3(px / rx, py / ry, pz / rz);
    const k1 = len3(px / (rx * rx), py / (ry * ry), pz / (rz * rz));
    return k1 === 0 ? -Math.min(rx, ry, rz) : (k0 * (k0 - 1)) / k1;
  }
  const { a, b, ra, rb } = part;
  const bax = b[0] - a[0];
  const bay = b[1] - a[1];
  const baz = b[2] - a[2];
  const pax = x - a[0];
  const pay = y - a[1];
  const paz = z - a[2];
  const t = Math.max(0, Math.min(1, (pax * bax + pay * bay + paz * baz) / (bax * bax + bay * bay + baz * baz)));
  return len3(pax - bax * t, pay - bay * t, paz - baz * t) - (ra + (rb - ra) * t);
};

// Smooth union of the given parts (a part's neighbour list, since a point near
// that part can't be affected by anything else).
const bodyDistance = (parts, x, y, z) => {
  let res = 1e9;
  for (let i = 0; i < parts.length; i++) {
    const d = partDistance(parts[i], x, y, z);
    const h = Math.max(BLEND - Math.abs(res - d), 0) / BLEND;
    res = Math.min(res, d) - h * h * BLEND * 0.25;
  }
  return res;
};

const areaOf = (part) => {
  if (part.type === "e") {
    const [a, b, c] = part.r;
    const p = 1.6075;
    return 4 * Math.PI * Math.pow((Math.pow(a * b, p) + Math.pow(a * c, p) + Math.pow(b * c, p)) / 3, 1 / p);
  }
  const len = Math.hypot(part.b[0] - part.a[0], part.b[1] - part.a[1], part.b[2] - part.a[2]);
  return Math.PI * (part.ra + part.rb) * len + 2 * Math.PI * (part.ra * part.ra + part.rb * part.rb);
};

const randomUnit = (rand, out) => {
  let x;
  let y;
  let s;
  do {
    x = rand() * 2 - 1;
    y = rand() * 2 - 1;
    s = x * x + y * y;
  } while (s >= 1 || s === 0);
  const k = 2 * Math.sqrt(1 - s);
  out[0] = x * k;
  out[1] = y * k;
  out[2] = 1 - 2 * s;
  return out;
};

// A candidate point on a part's own surface (roughly uniform by area).
const samplePart = (part, rand, out) => {
  const u = randomUnit(rand, [0, 0, 0]);
  if (part.type === "e") {
    out[0] = part.c[0] + u[0] * part.r[0];
    out[1] = part.c[1] + u[1] * part.r[1];
    out[2] = part.c[2] + u[2] * part.r[2];
    return out;
  }
  // tapered capsule: pick a point along the axis, push it out by the radius
  const t = rand();
  const r = part.ra + (part.rb - part.ra) * t;
  out[0] = part.a[0] + (part.b[0] - part.a[0]) * t + u[0] * r;
  out[1] = part.a[1] + (part.b[1] - part.a[1]) * t + u[1] * r;
  out[2] = part.a[2] + (part.b[2] - part.a[2]) * t + u[2] * r;
  return out;
};

export const buildBodyPoints = (count) => {
  const rand = mulberry32(1337);
  const totalArea = PARTS.reduce((s, part) => s + areaOf(part), 0);
  const positions = new Float32Array(count * 3);
  const normals = new Float32Array(count * 3);
  const randoms = new Float32Array(count);
  const p = [0, 0, 0];
  const e = 0.0015;
  let n = 0;
  for (let pi = 0; pi < PARTS.length && n < count; pi++) {
    const part = PARTS[pi];
    const near = part.near;
    const target = pi === PARTS.length - 1 ? count - n : Math.round((count * areaOf(part)) / totalArea);
    let kept = 0;
    for (let tries = 0; kept < target && n < count && tries < target * 8; tries++) {
      samplePart(part, rand, p);
      // Pull the point onto the blended surface; the gradient is the normal.
      let gx = 0;
      let gy = 1;
      let gz = 0;
      let d = 0;
      for (let it = 0; it < 2; it++) {
        d = bodyDistance(near, p[0], p[1], p[2]);
        gx = bodyDistance(near, p[0] + e, p[1], p[2]) - d;
        gy = bodyDistance(near, p[0], p[1] + e, p[2]) - d;
        gz = bodyDistance(near, p[0], p[1], p[2] + e) - d;
        const g = len3(gx, gy, gz) || 1;
        gx /= g;
        gy /= g;
        gz /= g;
        p[0] -= d * gx;
        p[1] -= d * gy;
        p[2] -= d * gz;
      }
      // Points that started deep inside another part don't land cleanly.
      if (Math.abs(bodyDistance(near, p[0], p[1], p[2])) > 0.003) continue;
      positions[n * 3] = p[0];
      positions[n * 3 + 1] = p[1];
      positions[n * 3 + 2] = p[2];
      normals[n * 3] = gx;
      normals[n * 3 + 1] = gy;
      normals[n * 3 + 2] = gz;
      randoms[n] = rand();
      n++;
      kept++;
    }
  }
  return {
    positions: positions.subarray(0, n * 3),
    normals: normals.subarray(0, n * 3),
    randoms: randoms.subarray(0, n),
    count: n,
  };
};
