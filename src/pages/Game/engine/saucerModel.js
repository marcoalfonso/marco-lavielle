import * as THREE from "three";
import { NEON, ACCENTS, matte, glow, outline, canvasTexture } from "./materials.js";

// The player's flying saucer. It rides on the same physics as the old car
// (an invisible chassis on raycast wheels), floating above it: the hull
// spins, the rim lights chase round, it bobs as it hovers and leans into
// turns. A small pilot sits under the glass dome.
//
// Model coordinates: the floor at y = 0 below the chassis, nose on +X.

const BODY_OFFSET_Y = -0.96; // the chassis origin sits this far above the floor at rest
const HOVER = 1.9; // the disc's centre above the floor

export const createSaucerModel = (scene) => {
  const group = new THREE.Group(); // follows the chassis body
  const body = new THREE.Group(); // hover, bob and lean
  body.position.y = BODY_OFFSET_Y + HOVER;
  group.add(body);
  const spin = new THREE.Group(); // the hull and rim lights turn
  body.add(spin);

  // the hull: a lathed disc, metal on top, darker underneath
  const profile = [
    [0, -0.42],
    [1.1, -0.5],
    [2.3, -0.3],
    [3.05, -0.02],
    [3.1, 0.06],
    [2.4, 0.26],
    [1.4, 0.4],
    [0, 0.44],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  const hullGeo = new THREE.LatheGeometry(profile, 40);
  const hull = new THREE.Mesh(hullGeo, matte(0x2a3448, { shininess: 110, specular: 0x9fd8ff, emissive: 0x070b16 }));
  hull.castShadow = true;
  outline(hull, NEON.holo, 0.55, 18);
  spin.add(hull);

  // a lit band round the rim
  const rim = new THREE.Mesh(new THREE.TorusGeometry(3.06, 0.06, 6, 64), glow(NEON.cyan, 1.2));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.02;
  spin.add(rim);

  // rim lights, chasing round in the accent colours
  const LIGHTS = 12;
  const lightGeo = new THREE.SphereGeometry(0.17, 10, 8);
  const lights = Array.from({ length: LIGHTS }, (_, i) => {
    const a = (i / LIGHTS) * Math.PI * 2;
    const m = new THREE.Mesh(lightGeo, new THREE.MeshBasicMaterial({ color: ACCENTS[i % ACCENTS.length] }));
    m.position.set(Math.cos(a) * 2.72, 0.14, Math.sin(a) * 2.72);
    spin.add(m);
    return m;
  });

  // the dome, with the pilot inside
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(1.25, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    glow(0x3fc8ff, 0.18, { transparent: true, opacity: 0.38, shininess: 120, specular: 0xffffff, depthWrite: false }),
  );
  dome.position.y = 0.36;
  body.add(dome);
  const domeRing = new THREE.Mesh(new THREE.TorusGeometry(1.27, 0.07, 6, 40), glow(NEON.holo, 0.9));
  domeRing.rotation.x = Math.PI / 2;
  domeRing.position.y = 0.38;
  body.add(domeRing);

  const pilot = new THREE.Group();
  pilot.position.y = 0.42;
  body.add(pilot);
  const skin = matte(0x7fe07a, { emissive: 0x1a4a18, shininess: 40 });
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.5, 18, 14), skin);
  head.scale.set(1, 1.15, 1);
  head.position.y = 0.62;
  pilot.add(head);
  const eyeMat = matte(0x05060a, { shininess: 120, specular: 0xffffff });
  [0.2, -0.2].forEach((z) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10), eyeMat);
    eye.scale.set(0.6, 1, 0.8);
    eye.position.set(0.4, 0.66, z);
    eye.rotation.y = z > 0 ? -0.3 : 0.3;
    pilot.add(eye);
  });
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.4, 0.5, 12), matte(0x1d2a44, { emissive: 0x0a1020 }));
  torso.position.y = 0.12;
  pilot.add(torso);
  const antennaTip = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), new THREE.MeshBasicMaterial({ color: NEON.magenta }));
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.42, 5), matte(0x7fe07a));
  antenna.position.y = 1.32;
  antennaTip.position.y = 1.55;
  pilot.add(antenna, antennaTip);

  // underneath: a glowing core and a faint tractor beam to the floor
  const coreMat = new THREE.MeshBasicMaterial({ color: NEON.magenta });
  const core = new THREE.Mesh(new THREE.CircleGeometry(0.85, 24), coreMat);
  core.rotation.x = Math.PI / 2;
  core.position.y = -0.51;
  body.add(core);
  const beamGeo = new THREE.CylinderGeometry(0.85, 2.2, HOVER - 0.5, 24, 1, true);
  beamGeo.translate(0, -(HOVER - 0.5) / 2 - 0.5, 0);
  const beamMat = new THREE.MeshBasicMaterial({
    color: NEON.magenta,
    transparent: true,
    opacity: 0.1,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  body.add(new THREE.Mesh(beamGeo, beamMat));

  scene.add(group);

  // a pool of light on the floor: world space, so it stays flat
  const poolTex = canvasTexture(128, 128, (ctx) => {
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, "rgba(255, 255, 255, 0.9)");
    g.addColorStop(0.5, "rgba(255, 255, 255, 0.3)");
    g.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  });
  const poolMat = new THREE.MeshBasicMaterial({
    map: poolTex,
    color: NEON.cyan,
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), poolMat);
  pool.rotation.x = -Math.PI / 2;
  scene.add(pool);
  const underLight = new THREE.PointLight(NEON.cyan, 1.4, 16, 1.6);
  scene.add(underLight);

  let time = 0;
  let lean = 0;
  let pitch = 0;
  const prevVel = new THREE.Vector3();
  const accel = new THREE.Vector3();
  const invQuat = new THREE.Quaternion();
  const poolColor = new THREE.Color();

  const update = ({ chassisBody, state, dt }) => {
    time += dt;
    group.position.copy(chassisBody.position);
    group.quaternion.copy(chassisBody.quaternion);

    // acceleration in the saucer's own frame, for the lean
    if (dt > 0) {
      accel.copy(chassisBody.velocity).sub(prevVel).divideScalar(dt);
      invQuat.copy(group.quaternion).invert();
      accel.applyQuaternion(invQuat);
    }
    prevVel.copy(chassisBody.velocity);
    lean += (state.steer * 0.32 - lean) * Math.min(1, dt * 5);
    pitch += (Math.max(-0.22, Math.min(0.22, -accel.x * 0.012)) - pitch) * Math.min(1, dt * 4);
    body.rotation.x = lean;
    body.rotation.z = pitch;
    body.position.y = BODY_OFFSET_Y + HOVER + Math.sin(time * 2.4) * 0.14;

    // the hull turns faster with speed; the rim lights chase
    const speed = chassisBody.velocity.length();
    spin.rotation.y += dt * (1.2 + speed * 0.08);
    lights.forEach((l, i) => {
      const k = 0.5 + 0.5 * Math.sin(time * 6 - i * 0.9);
      l.scale.setScalar(0.6 + k * 0.7);
    });
    antennaTip.position.y = 1.55 + Math.sin(time * 5) * 0.03;

    // boost: the core and beam flare; otherwise they breathe
    const flare = state.boosting ? 1 : 0;
    beamMat.opacity = 0.08 + Math.sin(time * 3) * 0.03 + flare * 0.12;
    coreMat.color.setHex(state.boosting ? NEON.ice : NEON.magenta);
    poolColor.setHex(NEON.cyan).lerp(new THREE.Color(NEON.magenta), 0.5 + Math.sin(time * 1.3) * 0.5);
    poolMat.color.copy(poolColor);
    underLight.color.copy(poolColor);

    pool.position.set(chassisBody.position.x, 0.06, chassisBody.position.z);
    underLight.position.set(chassisBody.position.x, chassisBody.position.y + 0.4, chassisBody.position.z);
  };

  // boost plasma leaves from the back of the hull (body coordinates)
  const exhaust = new THREE.Vector3(-3.1, 0, 0);

  return { group, body, update, exhaust };
};
