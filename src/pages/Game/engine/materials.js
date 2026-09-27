import * as THREE from "three";

// Soft, matte, low-poly palette. Background, fog and ground share one colour
// so the world has no visible horizon.
export const COLORS = {
  world: 0xdcd8cf,
  worldNight: 0x1f2436,
  road: 0xc7c2b6,
  sidewalk: 0xcfcabf,
  plaza: 0xd3cec3,
  line: 0xefebe0,
  lawn: 0xc9cfb2,
  pitch: 0xa9bf8e,
  pitchStripe: 0xb3c898,
  carBody: 0xe8581c,
  carDark: 0xb6430f,
  tire: 0x33312e,
  hub: 0xe5e0d6,
  glass: 0xaccfdd,
  buildings: [0xc9856a, 0x9db08a, 0x8a9bb0, 0xd3b98a, 0xc08a8a, 0x9fa68f],
  roofs: [0xa86a52, 0x7e9070, 0x6f8094, 0xb09a6e, 0xa17070, 0x848a76],
  window: 0x6e7b8a,
  windowLit: 0xffd98a,
  trunk: 0x8a6a4c,
  leaf: 0x6fa06b,
  leafDark: 0x5d8d5c,
  pine: 0x5b8a66,
  bush: 0x7fae74,
  grass: 0x93ab7c,
  rock: 0xaaa49a,
  pole: 0x6b675f,
  wood: 0xb08a5a,
  ramp: 0xc9a36a,
  rampSide: 0xb38c55,
  brick: 0xc96f4a,
  pin: 0xf5f2ea,
  pinStripe: 0xd14b3a,
  dust: 0xbfb8aa,
  crate: 0xc49a62,
  crateDark: 0x9c7646,
  domino: 0x46423a,
  dominoDot: 0xf5f2ea,
  cone: 0xf07b2c,
  letters: [0xe8581c, 0xe2c14d, 0x6fa06b, 0x6f8094, 0xc08a8a],
  cloud: 0xfbfaf6,
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
