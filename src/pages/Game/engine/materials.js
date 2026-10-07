import * as THREE from "three";

// Space, in the site's holo palette: deep indigo space, dark glass
// surfaces, neon cyan for the HUD-like details, and a few bright accents
// (magenta, violet, amber, lime, coral) for planets, lights and props.
export const NEON = {
  cyan: 0x00bff3,
  holo: 0x6ff5ee,
  ice: 0xbff6ff,
  blue: 0x2a7fff,
  pink: 0xff3b6b,
  magenta: 0xff4fd8,
  violet: 0x9b6bff,
  amber: 0xffb347,
  lime: 0x9dff6b,
  coral: 0xff7a59,
};

// the accents in turn, for things that come in sets
export const ACCENTS = [NEON.cyan, NEON.magenta, NEON.amber, NEON.violet, NEON.lime, NEON.coral];

export const COLORS = {
  world: 0x04030d,
  ground: 0x030209,
  road: 0x0b0a1e,
  sidewalk: 0x120f2c,
  plaza: 0x0c0a22,
  line: NEON.cyan,
  carBody: 0x1a2232,
  carDark: 0x0b111c,
  hub: NEON.cyan,
  glass: 0x3fc8ff,
  rock: 0x2a2638,
  pole: 0x1a1830,
  wood: 0x16142c,
  ramp: 0x120f2a,
  pin: 0xf2f4ff,
  pinStripe: NEON.magenta,
  dust: 0x9b6bff,
  domino: 0x0a0918,
  dominoDot: NEON.amber,
  cone: NEON.magenta,
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
