// Minimal quaternion helpers for the cube's orientation. Quaternions are
// [x, y, z, w] in CSS's 3D space (x right, y down, z toward the viewer).

export const IDENTITY = [0, 0, 0, 1];

export const fromAxisAngle = (x, y, z, angle) => {
  const len = Math.hypot(x, y, z) || 1;
  const s = Math.sin(angle / 2) / len;
  return [x * s, y * s, z * s, Math.cos(angle / 2)];
};

// a then b: the rotation that applies a first, then b
export const multiply = (b, a) => [
  b[3] * a[0] + b[0] * a[3] + b[1] * a[2] - b[2] * a[1],
  b[3] * a[1] - b[0] * a[2] + b[1] * a[3] + b[2] * a[0],
  b[3] * a[2] + b[0] * a[1] - b[1] * a[0] + b[2] * a[3],
  b[3] * a[3] - b[0] * a[0] - b[1] * a[1] - b[2] * a[2],
];

export const normalize = (q) => {
  const len = Math.hypot(q[0], q[1], q[2], q[3]) || 1;
  return [q[0] / len, q[1] / len, q[2] / len, q[3] / len];
};

export const conjugate = (q) => [-q[0], -q[1], -q[2], q[3]];

export const slerp = (a, b, t) => {
  let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  let e = b;
  if (d < 0) {
    // the short way round
    d = -d;
    e = [-b[0], -b[1], -b[2], -b[3]];
  }
  if (d > 0.9995) return normalize(a.map((v, i) => v + (e[i] - v) * t));
  const theta = Math.acos(d);
  const s = Math.sin(theta);
  const wa = Math.sin((1 - t) * theta) / s;
  const wb = Math.sin(t * theta) / s;
  return a.map((v, i) => v * wa + e[i] * wb);
};

// CSS matrix3d() (column-major) for the rotation
export const toCss = (q) => {
  const [x, y, z, w] = q;
  const m = [
    1 - 2 * (y * y + z * z), 2 * (x * y + z * w), 2 * (x * z - y * w), 0,
    2 * (x * y - z * w), 1 - 2 * (x * x + z * z), 2 * (y * z + x * w), 0,
    2 * (x * z + y * w), 2 * (y * z - x * w), 1 - 2 * (x * x + y * y), 0,
    0, 0, 0, 1,
  ];
  return `matrix3d(${m.map((v) => v.toFixed(6)).join(",")})`;
};

// rotate the vector v = [x, y, z] by q
export const rotate = (q, v) => {
  const [qx, qy, qz, qw] = q;
  const tx = 2 * (qy * v[2] - qz * v[1]);
  const ty = 2 * (qz * v[0] - qx * v[2]);
  const tz = 2 * (qx * v[1] - qy * v[0]);
  return [
    v[0] + qw * tx + (qy * tz - qz * ty),
    v[1] + qw * ty + (qz * tx - qx * tz),
    v[2] + qw * tz + (qx * ty - qy * tx),
  ];
};
