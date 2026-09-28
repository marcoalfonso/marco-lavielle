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

// Tag parts with the bone they move with. Limb bones get a side suffix from
// the point's x ("P" = +x, "N" = -x); "torso" splits at the waist.
const on = (bone, parts) => (Array.isArray(parts) ? parts : [parts]).map((part) => ({ ...part, bone }));

const SHOULDER = [0.2, 1.405, 0.0];
const ELBOW = [0.305, 1.14, -0.015];
const WRIST = [0.395, 0.895, 0.02];
const HIP = [0.088, 0.92, 0.0];
const KNEE = [0.108, 0.51, 0.015];
const ANKLE = [0.12, 0.085, -0.01];

export const PARTS = [
  ...on("head", ellipsoid([0, 1.665, 0.005], [0.075, 0.1, 0.09])), // cranium
  ...on("head", ellipsoid([0, 1.6, 0.03], [0.055, 0.055, 0.06])), // face / jaw
  ...on("head", capsule([0, 1.47, -0.01], [0, 1.6, 0.0], 0.056, 0.048)), // neck
  ...on("chest", ellipsoid([0, 1.33, 0.005], [0.16, 0.165, 0.1])), // ribcage
  ...on("chest", ellipsoid([0, 1.29, -0.035], [0.17, 0.14, 0.08])), // upper back / lats
  ...on("torso", ellipsoid([0, 1.14, 0.012], [0.135, 0.13, 0.088])), // abdomen
  ...on("pelvis", ellipsoid([0, 0.99, 0.0], [0.155, 0.1, 0.098])), // pelvis
  ...on("chest", mirrored(ellipsoid([0.075, 1.365, 0.055], [0.085, 0.055, 0.05]))), // pecs
  ...on("pelvis", mirrored(ellipsoid([0.07, 0.925, -0.045], [0.085, 0.09, 0.075]))), // glutes
  ...on("chest", mirrored(capsule([0.03, 1.49, -0.02], [0.16, 1.44, -0.015], 0.05, 0.045))), // trapezius
  ...on("upperArm", mirrored(ellipsoid([0.188, 1.42, 0.0], [0.07, 0.075, 0.068]))), // deltoid
  ...on("upperArm", mirrored(capsule(SHOULDER, ELBOW, 0.05, 0.038))), // upper arm
  ...on("upperArm", mirrored(capsule([0.27, 1.26, 0.0], [0.29, 1.19, 0.0], 0.046, 0.04))), // biceps
  ...on("forearm", mirrored(capsule(ELBOW, WRIST, 0.042, 0.026))), // forearm
  ...on("forearm", mirrored(capsule([0.4, 0.875, 0.025], [0.43, 0.75, 0.035], 0.03, 0.021))), // hand
  ...on("thigh", mirrored(capsule(HIP, KNEE, 0.088, 0.05))), // thigh
  ...on("thigh", mirrored(capsule([0.085, 0.8, 0.02], [0.1, 0.62, 0.03], 0.075, 0.055))), // quads
  ...on("shin", mirrored(ellipsoid([KNEE[0], KNEE[1], 0.022], [0.048, 0.052, 0.048]))), // knee
  ...on("shin", mirrored(capsule(KNEE, [0.115, 0.33, -0.02], 0.05, 0.05))), // upper calf
  ...on("shin", mirrored(ellipsoid([0.112, 0.38, -0.03], [0.048, 0.08, 0.045]))), // calf muscle
  ...on("shin", mirrored(capsule([0.115, 0.33, -0.015], ANKLE, 0.047, 0.03))), // shin
  ...on("shin", mirrored(capsule([0.12, 0.05, -0.03], [0.135, 0.028, 0.13], 0.036, 0.025))), // foot
  ...on("shin", mirrored(ellipsoid([0.12, 0.04, -0.035], [0.032, 0.04, 0.038]))), // heel
];

// ---------------------------------------------------------------------------
// Skeleton for the rag doll. Each bone is a segment a→b (rest pose) with a
// thickness r; "joint" is where it hangs from its parent. cone/twist are the
// joint limits (radians), blend is how far skin weights fade across a joint.
// ---------------------------------------------------------------------------
const WAIST_Y = 1.1;
const HAND_TIP = [0.43, 0.75, 0.035];
const TOE = [0.125, 0.065, 0.03]; // collision box ends just above the floor
const limb = (name, parent, joint, a, b, r, mass, cone, twist, blend) => [
  { name: name + "P", parent: parent + (parent === "chest" || parent === "pelvis" ? "" : "P"), joint, a, b, r, mass, cone, twist, blend },
  {
    name: name + "N",
    parent: parent + (parent === "chest" || parent === "pelvis" ? "" : "N"),
    joint: mirror(joint),
    a: mirror(a),
    b: mirror(b),
    r,
    mass,
    cone,
    twist,
    blend,
  },
];

export const BONES = [
  { name: "pelvis", parent: null, a: [0, 0.9, 0], b: [0, WAIST_Y, 0], r: 0.15, box: [0.15, 0.1, 0.1], mass: 18 },
  { name: "chest", parent: "pelvis", joint: [0, WAIST_Y, 0], a: [0, WAIST_Y, 0], b: [0, 1.48, 0], r: 0.16, box: [0.165, 0.19, 0.1], mass: 20, cone: 0.35, twist: 0.35, blend: 0.09 },
  { name: "head", parent: "chest", joint: [0, 1.5, 0], a: [0, 1.5, 0], b: [0, 1.77, 0.01], r: 0.09, mass: 5, cone: 0.55, twist: 0.7, blend: 0.05 },
  ...limb("upperArm", "chest", SHOULDER, SHOULDER, ELBOW, 0.055, 2.5, 1.35, 0.7, 0.08),
  ...limb("forearm", "upperArm", ELBOW, ELBOW, HAND_TIP, 0.045, 2, 1.1, 0.4, 0.06),
  ...limb("thigh", "pelvis", HIP, HIP, KNEE, 0.085, 7, 1.25, 0.3, 0.07),
  ...limb("shin", "thigh", KNEE, KNEE, TOE, 0.06, 4, 1.2, 0.2, 0.06),
];
BONES.forEach((bone, i) => {
  bone.index = i;
  bone.center = bone.a.map((v, k) => (v + bone.b[k]) / 2);
});
export const boneIndex = (name) => BONES.findIndex((bone) => bone.name === name);
BONES.forEach((bone) => {
  bone.parentIndex = bone.parent ? boneIndex(bone.parent) : -1;
});

// side comes from the part's own centre, not the point: inner-thigh points
// sit on (or just past) the midline and must stay with their own leg
const resolveBone = (part, y) => {
  const tag = part.bone;
  if (tag === "torso") return y > WAIST_Y ? "chest" : "pelvis";
  if (tag === "head" || tag === "chest" || tag === "pelvis") return tag;
  return tag + (part.bc[0] >= 0 ? "P" : "N");
};

// After projection onto the blended surface, a point belongs to whichever
// part it now lies closest to (it may have slid onto a neighbour).
const nearestPart = (parts, x, y, z) => {
  let best = parts[0];
  let bestD = Infinity;
  for (let i = 0; i < parts.length; i++) {
    const d = partDistance(parts[i], x, y, z);
    if (d < bestD) {
      bestD = d;
      best = parts[i];
    }
  }
  return best;
};

const smoothstep = (e0, e1, x) => {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

// Skin weights: each point follows its own bone, blending up to 50/50 with
// the neighbouring bone across the nearest joint, so bends stay smooth.
const skinPoint = (part, x, y, z) => {
  const own = boneIndex(resolveBone(part, y));
  let other = own;
  let weight = 0;
  const consider = (jointBone, neighbour) => {
    // distance to the joint plane (across the child bone's axis) and to the joint
    const j = jointBone.joint;
    const ax = jointBone.b[0] - jointBone.a[0];
    const ay = jointBone.b[1] - jointBone.a[1];
    const az = jointBone.b[2] - jointBone.a[2];
    const al = Math.sqrt(ax * ax + ay * ay + az * az);
    const dx = x - j[0];
    const dy = y - j[1];
    const dz = z - j[2];
    const plane = Math.abs((dx * ax + dy * ay + dz * az) / al);
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const R = jointBone.blend;
    const w = 0.5 * (1 - smoothstep(0, R, plane)) * (1 - smoothstep(1.6 * R, 2.8 * R, dist));
    if (w > weight) {
      weight = w;
      other = neighbour;
    }
  };
  const bone = BONES[own];
  if (bone.parentIndex >= 0) consider(bone, bone.parentIndex);
  BONES.forEach((child) => {
    if (child.parentIndex === own) consider(child, child.index);
  });
  return [own, other, weight];
};

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
  const bones = new Float32Array(count);
  const bones2 = new Float32Array(count);
  const weights = new Float32Array(count);
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
      const [own, other, weight] = skinPoint(nearestPart(near, p[0], p[1], p[2]), p[0], p[1], p[2]);
      bones[n] = own;
      bones2[n] = other;
      weights[n] = weight;
      n++;
      kept++;
    }
  }
  return {
    positions: positions.subarray(0, n * 3),
    normals: normals.subarray(0, n * 3),
    randoms: randoms.subarray(0, n),
    bones: bones.subarray(0, n),
    bones2: bones2.subarray(0, n),
    weights: weights.subarray(0, n),
    count: n,
  };
};
