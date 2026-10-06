import * as THREE from "three";

// The site's holo palette: a near-black world, dark glass surfaces, and
// neon cyan for everything that should catch the eye. Background, fog and
// ground share one colour so the world has no visible horizon.
export const NEON = {
  cyan: 0x00bff3,
  holo: 0x6ff5ee,
  ice: 0xbff6ff,
  blue: 0x2a7fff,
  pink: 0xff3b6b,
};

export const COLORS = {
  world: 0x02050b,
  ground: 0x04080f,
  road: 0x080e17,
  sidewalk: 0x0c1520,
  plaza: 0x0a121c,
  line: NEON.cyan,
  lawn: 0x050f15,
  carBody: 0x0c1622,
  carDark: 0x070d15,
  tire: 0x05080c,
  hub: NEON.cyan,
  glass: 0x1f6f95,
  buildings: [0x0c1724, 0x0e1a29, 0x0a1420, 0x101c2c, 0x0b1622, 0x0d1826],
  roofs: [0x13212f, 0x15243a, 0x112033, 0x182838, 0x13202d, 0x16253a],
  window: 0x0b1724,
  windowLit: 0x4fd8ff,
  trunk: 0x0d1a24,
  leaf: 0x0b3440,
  leafDark: 0x0a2a35,
  pine: 0x0a2e3c,
  bush: 0x0a2a33,
  grass: 0x0c3a40,
  rock: 0x121c28,
  pole: 0x162231,
  wood: 0x142030,
  ramp: 0x0e1b2a,
  brick: 0x12304a,
  pin: 0xdff8ff,
  pinStripe: NEON.cyan,
  dust: 0x3fa9c9,
  domino: 0x0a131e,
  dominoDot: NEON.holo,
  cone: NEON.cyan,
};

export const matte = (color, extra = {}) =>
  new THREE.MeshPhongMaterial({
    color,
    shininess: 8,
    flatShading: true,
    ...extra,
  });

// One shared clock uniform drives every swaying material.
export const windUniform = { value: 0 };

// Make a material sway in the wind. mode "height": displacement grows with
// the vertex height (grass). mode "whole": the mesh drifts as a block
// (tree foliage), phase-shifted by its world position.
export const windify = (material, amount, mode = "height") => {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uWindTime = windUniform;
    shader.vertexShader = `uniform float uWindTime;\n${shader.vertexShader}`.replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
      #ifdef USE_INSTANCING
        vec3 windOrigin = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
      #else
        vec3 windOrigin = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
      #endif
      float windPhase = uWindTime * 1.7 + windOrigin.x * 0.13 + windOrigin.z * 0.09;
      float windK = ${mode === "height" ? "max(position.y, 0.0)" : "1.0"} * ${amount.toFixed(3)};
      transformed.x += sin(windPhase) * windK;
      transformed.z += cos(windPhase * 0.8) * windK * 0.6;`,
    );
  };
  material.customProgramCacheKey = () => `wind-${mode}-${amount}`;
  return material;
};

// Canvas → texture helper for painted ground text and billboards.
export const canvasTexture = (width, height, draw) => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext("2d"), width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 4;
  return texture;
};

export const roundRect = (ctx, x, y, w, h, r) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

// Glowing, unshaded-looking material: lit by itself at the given strength.
export const glow = (color, intensity = 1, extra = {}) =>
  matte(color, { emissive: color, emissiveIntensity: intensity, ...extra });

// Edge outlines in neon (like the homepage cube): thin lines along a mesh's
// hard edges, added as a child so they move with it.
const lineMats = new Map();
const lineMat = (color, opacity) => {
  const key = `${color}-${opacity}`;
  if (!lineMats.has(key)) {
    lineMats.set(
      key,
      new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 }),
    );
  }
  return lineMats.get(key);
};
export const outline = (mesh, color = NEON.holo, opacity = 0.6, threshold = 25) => {
  const lines = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, threshold), lineMat(color, opacity));
  lines.raycast = () => {};
  mesh.add(lines);
  return lines;
};

// the site's display face for painted text (loaded by the page before the game starts)
export const DISPLAY_FONT = "Orbitron, 'DINWeb', Arial, sans-serif";
