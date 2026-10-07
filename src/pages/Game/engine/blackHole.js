import * as THREE from "three";
import { NEON, canvasTexture } from "./materials.js";
import { BLACK_HOLE, EXIT_HOLE } from "./layout.js";

// The black hole in the corner (like the one that opens the Software page,
// in 3D): an event horizon with a photon ring, a lensing glow, a tilted
// accretion disc, matter spiralling in, and a dark vortex on the floor that
// marks how far its pull reaches. Across the map, a small bright portal
// where it spits things out.

const HOLE_Y = 3.6;
const HORIZON = 3.2;

const radial = (stops) =>
  canvasTexture(256, 256, (ctx) => {
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    stops.forEach(([at, color]) => g.addColorStop(at, color));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
  });

export const createBlackHole = (scene) => {
  const group = new THREE.Group();
  group.position.set(BLACK_HOLE.x, 0, BLACK_HOLE.z);
  scene.add(group);

  // lensing glow behind it all
  const lens = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: radial([
        [0, "rgba(255, 210, 150, 0.0)"],
        [0.18, "rgba(255, 200, 140, 0.9)"],
        [0.32, "rgba(255, 120, 80, 0.45)"],
        [0.6, "rgba(155, 107, 255, 0.18)"],
        [1, "rgba(0, 191, 243, 0)"],
      ]),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  lens.scale.setScalar(30);
  lens.position.y = HOLE_Y;
  group.add(lens);

  // the accretion disc: banded light, hot inside, cooler out
  const discTex = canvasTexture(512, 512, (ctx, W, H) => {
    ctx.translate(W / 2, H / 2);
    for (let r = 70; r < 250; r += 2) {
      const t = (r - 70) / 180;
      const hot = [255, Math.round(220 - t * 120), Math.round(160 - t * 60)];
      const cool = [Math.round(155 - t * 60), Math.round(107 - t * 40), 255];
      const c = t < 0.45 ? hot : cool;
      ctx.strokeStyle = `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${(1 - t) * (0.25 + Math.random() * 0.55)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    // streaks of matter
    for (let i = 0; i < 160; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 80 + Math.random() * 160;
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.1 + Math.random() * 0.3})`;
      ctx.lineWidth = 1 + Math.random() * 2;
      ctx.beginPath();
      ctx.arc(0, 0, r, a, a + 0.2 + Math.random() * 0.5);
      ctx.stroke();
    }
  });
  const disc = new THREE.Mesh(
    new THREE.RingGeometry(HORIZON * 1.15, HORIZON * 4.2, 96, 1),
    new THREE.MeshBasicMaterial({ map: discTex, transparent: true, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  // ring UVs map across the whole square texture, centred, so it lines up
  const tilt = new THREE.Group();
  tilt.position.y = HOLE_Y;
  tilt.rotation.set(-Math.PI / 2 + 0.32, 0, 0.18);
  tilt.add(disc);
  group.add(tilt);

  // the event horizon and its photon ring
  const horizon = new THREE.Mesh(new THREE.SphereGeometry(HORIZON, 32, 24), new THREE.MeshBasicMaterial({ color: 0x000000 }));
  horizon.position.y = HOLE_Y;
  group.add(horizon);
  const photon = new THREE.Mesh(
    new THREE.TorusGeometry(HORIZON * 1.04, 0.09, 8, 64),
    new THREE.MeshBasicMaterial({ color: 0xffe0b0 }),
  );
  photon.position.y = HOLE_Y;
  group.add(photon);

  // matter spiralling in
  const SPECKS = 180;
  const specks = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(0.12, 0),
    new THREE.MeshBasicMaterial({ color: 0xffffff }),
    SPECKS,
  );
  const speckColors = [0xffd6a0, 0xffb347, NEON.magenta, NEON.violet, NEON.ice];
  const speckState = Array.from({ length: SPECKS }, (_, i) => {
    specks.setColorAt(i, new THREE.Color(speckColors[i % speckColors.length]));
    return { a: Math.random() * Math.PI * 2, r: HORIZON * (1.2 + Math.random() * 3.2), y: (Math.random() - 0.5) * 0.8 };
  });
  specks.instanceColor.needsUpdate = true;
  tilt.add(specks);

  // the floor: a dark vortex out to the edge of the pull
  const vortexTex = canvasTexture(512, 512, (ctx, W, H) => {
    ctx.translate(W / 2, H / 2);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 256);
    g.addColorStop(0, "rgba(0, 0, 0, 0.95)");
    g.addColorStop(0.5, "rgba(10, 4, 30, 0.6)");
    g.addColorStop(1, "rgba(10, 4, 30, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(-256, -256, 512, 512);
    for (let k = 0; k < 7; k++) {
      ctx.strokeStyle = k % 2 ? "rgba(155, 107, 255, 0.5)" : "rgba(255, 79, 216, 0.35)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let t = 0; t <= 1; t += 0.01) {
        const a = t * Math.PI * 2.4 + (k * Math.PI * 2) / 7;
        const r = 250 - t * 230;
        ctx[t ? "lineTo" : "moveTo"](Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(155, 107, 255, 0.8)";
    ctx.lineWidth = 3;
    ctx.setLineDash([14, 12]);
    ctx.beginPath();
    ctx.arc(0, 0, 250, 0, Math.PI * 2);
    ctx.stroke();
  });
  const vortex = new THREE.Mesh(
    new THREE.PlaneGeometry(BLACK_HOLE.pull * 2, BLACK_HOLE.pull * 2),
    new THREE.MeshBasicMaterial({ map: vortexTex, transparent: true, depthWrite: false }),
  );
  vortex.rotation.x = -Math.PI / 2;
  vortex.position.y = 0.05;
  group.add(vortex);

  // the far side: a small bright portal
  const exit = new THREE.Group();
  exit.position.set(EXIT_HOLE.x, 0, EXIT_HOLE.z);
  scene.add(exit);
  const exitGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: radial([
        [0, "rgba(255, 255, 255, 0.95)"],
        [0.2, "rgba(111, 245, 238, 0.7)"],
        [0.5, "rgba(155, 107, 255, 0.25)"],
        [1, "rgba(155, 107, 255, 0)"],
      ]),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  exitGlow.scale.setScalar(9);
  exitGlow.position.y = 2.4;
  exit.add(exitGlow);
  const exitRing = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.12, 8, 48), new THREE.MeshBasicMaterial({ color: NEON.holo }));
  exitRing.position.y = 2.4;
  exit.add(exitRing);
  const exitPad = new THREE.Mesh(
    new THREE.RingGeometry(3.2, 3.6, 48),
    new THREE.MeshBasicMaterial({ color: NEON.violet, transparent: true, opacity: 0.7, side: THREE.DoubleSide }),
  );
  exitPad.rotation.x = -Math.PI / 2;
  exitPad.position.y = 0.06;
  exit.add(exitPad);

  const m = new THREE.Matrix4();
  const update = (time, dt) => {
    disc.rotation.z -= dt * 0.35;
    lens.scale.setScalar(30 + Math.sin(time * 1.4) * 1.2);
    vortex.rotation.z += dt * 0.5;
    speckState.forEach((sp, i) => {
      sp.a += dt * (6 / sp.r);
      sp.r -= dt * (0.8 + 3 / sp.r);
      if (sp.r < HORIZON * 1.05) {
        sp.r = HORIZON * (3 + Math.random() * 1.4);
        sp.a = Math.random() * Math.PI * 2;
      }
      m.makeTranslation(Math.cos(sp.a) * sp.r, Math.sin(sp.a) * sp.r, sp.y);
      specks.setMatrixAt(i, m);
    });
    specks.instanceMatrix.needsUpdate = true;
    exitRing.rotation.y += dt * 1.4;
    exitRing.rotation.x = Math.sin(time * 0.8) * 0.4;
    exitGlow.scale.setScalar(9 + Math.sin(time * 3) * 0.8);
  };

  return { update, holeY: HOLE_Y };
};
