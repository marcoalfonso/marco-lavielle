import * as THREE from "three";
import { createPhysics } from "./physics.js";
import { createVehicle, VEHICLE } from "./vehicle.js";
import { buildWorld } from "./world.js";
import { buildProps } from "./props.js";
import { createEffects } from "./effects.js";
import { createAudio } from "./audio.js";
import { createSaucerModel } from "./saucerModel.js";
import { createBlackHole } from "./blackHole.js";
import { COLORS, NEON, ACCENTS, windUniform } from "./materials.js";
import { SPAWN, CRYSTALS, TOTAL_CRYSTALS, BLACK_HOLE, EXIT_HOLE } from "./layout.js";

const CAMERA_OFFSET = new THREE.Vector3(18, 21, 18);
const KONAMI = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "KeyB",
  "KeyA",
];
const GAME_KEYS = new Set([
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Space",
]);

// Space: deep indigo, lit by starlight from above and the glow of things.
const LIGHT = {
  sky: new THREE.Color(COLORS.world),
  hemiSky: new THREE.Color(0x8f7fe0),
  hemiGround: new THREE.Color(0x140a2a),
  hemi: 0.8,
  sun: new THREE.Color(0xd8e8ff),
  sunI: 0.5,
};
const WARP_IN = 1.3; // s: swallowed
const WARP_OUT = 0.7; // s: thrown out

export const createGame = (container, { isMobile, callbacks }) => {
  const cb = {
    onCrystal: () => {},
    onWin: () => {},
    onZone: () => {},
    onToast: () => {},
    onFlipped: () => {},
    onHud: () => {},
    onMute: () => {},
    ...callbacks,
  };

  // ------------------------------------------------------------------
  // Renderer / scene / camera / lights
  // ------------------------------------------------------------------
  const scene = new THREE.Scene();
  scene.background = LIGHT.sky.clone();
  scene.fog = new THREE.Fog(LIGHT.sky.clone(), 80, 220);

  const width = () => container.clientWidth || window.innerWidth;
  const height = () => container.clientHeight || window.innerHeight;
  const camera = new THREE.PerspectiveCamera(45, width() / height(), 0.5, 900);

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setSize(width(), height());
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const hemi = new THREE.HemisphereLight(LIGHT.hemiSky, LIGHT.hemiGround, LIGHT.hemi);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(LIGHT.sun, LIGHT.sunI);
  const SUN_OFFSET = new THREE.Vector3(40, 80, 26);
  sun.castShadow = true;
  const S = 55;
  Object.assign(sun.shadow.camera, { left: -S, right: S, top: S, bottom: -S, near: 1, far: 220 });
  sun.shadow.mapSize.set(isMobile ? 1024 : 2048, isMobile ? 1024 : 2048);
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.04;
  scene.add(sun);
  scene.add(sun.target);

  // ------------------------------------------------------------------
  // Systems
  // ------------------------------------------------------------------
  const physics = createPhysics();
  const audio = createAudio();
  const effects = createEffects(scene, isMobile);
  const world = buildWorld({ scene, physics, isMobile });

  const events = [];
  const props = buildProps({
    scene,
    physics,
    audio,
    emit: (type, payload) => events.push({ type, payload }),
  });

  const car = createVehicle(physics, SPAWN);
  const carModel = createSaucerModel(scene);

  let shake = 0;
  car.chassisBody.addEventListener("collide", (e) => {
    const v = Math.abs(e.contact.getImpactVelocityAlongNormal());
    if (v > 4) {
      audio.impact("car", Math.min(v / 20, 1), car.chassisBody.position);
      shake = Math.max(shake, Math.min(v / 30, 0.8));
    }
  });

  // ------------------------------------------------------------------
  // Crystals (+ light beams so you can spot them from afar)
  // ------------------------------------------------------------------
  const crystalGeo = new THREE.OctahedronGeometry(1, 0);
  // each crystal in its own colour, beam and all
  const crystalMats = ACCENTS.map(
    (c) => new THREE.MeshPhongMaterial({ color: 0xffffff, emissive: c, emissiveIntensity: 0.9, shininess: 90, flatShading: true }),
  );
  const ringMats = ACCENTS.map(
    (c) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false }),
  );
  const beamMats = ACCENTS.map(
    (c) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  const beamGeo = new THREE.CylinderGeometry(0.5, 0.9, 40, 10, 1, true);
  beamGeo.translate(0, 20, 0);
  const crystals = CRYSTALS.map((c, i) => {
    const tint = i % ACCENTS.length;
    const mesh = new THREE.Mesh(crystalGeo, crystalMats[tint]);
    mesh.position.set(c.x, c.y, c.z);
    mesh.castShadow = true;
    scene.add(mesh);
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.6, 2.3, 28), ringMats[tint]);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(c.x, 0.08, c.z);
    scene.add(ring);
    const beam = new THREE.Mesh(beamGeo, beamMats[tint]);
    beam.position.set(c.x, 0, c.z);
    scene.add(beam);
    return { ...c, mesh, ring, beam, color: ACCENTS[tint], collected: false, phase: i * 0.7 };
  });
  let collected = 0;

  // arrow on the ground pointing at the nearest crystal
  const arrowShape = new THREE.Shape();
  arrowShape.moveTo(0, 0.9);
  arrowShape.lineTo(0.75, -0.5);
  arrowShape.lineTo(0, -0.15);
  arrowShape.lineTo(-0.75, -0.5);
  arrowShape.closePath();
  const arrowGeo = new THREE.ShapeGeometry(arrowShape);
  arrowGeo.rotateX(-Math.PI / 2);
  const arrow = new THREE.Mesh(
    arrowGeo,
    new THREE.MeshBasicMaterial({ color: NEON.holo, transparent: true, opacity: 0.85, depthWrite: false }),
  );
  arrow.scale.setScalar(1.3);
  scene.add(arrow);

  // ------------------------------------------------------------------
  // Input
  // ------------------------------------------------------------------
  const keys = {};
  const virtual = {};
  let konami = 0;
  const night = 1; // the lights the world used to switch on at night stay on
  let muted = false;
  let activePad = null;

  const pressed = (...codes) => codes.some((c) => keys[c]);

  const openPad = (pad) => {
    if (!pad || pad.kind !== "link") return;
    audio.chime(4);
    cb.onToast(`Opening ${pad.title.toLowerCase()}`);
    setTimeout(() => {
      window.location.href = pad.href;
    }, 350);
  };

  const toggleMute = () => {
    muted = !muted;
    audio.setMuted(muted);
    cb.onMute(muted);
  };
  const horn = (on) => {
    if (on) {
      audio.hornStart();
      const p = car.chassisBody.position;
      effects.hornWave(p.x, 0, p.z);
    } else audio.hornStop();
  };

  const onKeyDown = (e) => {
    audio.unlock();
    if (GAME_KEYS.has(e.code)) e.preventDefault();
    if (!e.repeat) {
      konami = e.code === KONAMI[konami] ? konami + 1 : e.code === KONAMI[0] ? 1 : 0;
      if (konami === KONAMI.length) {
        konami = 0;
        props.ballRain(car.chassisBody.position.x, car.chassisBody.position.z);
        cb.onToast("Meteor shower");
        audio.fanfare();
      }
      if (e.code === "KeyR") resetCar();
      if (e.code === "KeyM") toggleMute();
      if (e.code === "KeyH") horn(true);
      if (e.code === "Enter") openPad(activePad);
    }
    keys[e.code] = true;
  };
  const onKeyUp = (e) => {
    keys[e.code] = false;
    if (e.code === "KeyH") horn(false);
  };
  const onBlur = () => {
    Object.keys(keys).forEach((k) => (keys[k] = false));
    audio.hornStop();
  };
  const onPointer = () => audio.unlock();

  let zoom = 1;
  let zoomTarget = 1;
  // Portrait screens see less sideways, so pull the camera back.
  const aspectZoom = () => {
    const aspect = width() / height();
    return aspect < 1 ? 1 + (1 - aspect) * 0.9 : 1;
  };
  let fit = aspectZoom();
  const onWheel = (e) => {
    zoomTarget = Math.max(0.6, Math.min(1.8, zoomTarget * (e.deltaY > 0 ? 1.08 : 0.92)));
  };

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);
  window.addEventListener("pointerdown", onPointer);
  renderer.domElement.addEventListener("wheel", onWheel, { passive: true });

  const resetCar = () => {
    const p = car.chassisBody.position;
    if (Math.abs(p.x) > 110 || Math.abs(p.z) > 110 || p.y < -5) {
      car.place(SPAWN.x, 2, SPAWN.z, SPAWN.yaw);
    } else {
      car.unflip();
    }
    effects.burst({ x: p.x, y: p.y, z: p.z }, { count: 25, power: 5, up: 5, colors: [NEON.ice, NEON.cyan] });
  };

  // ------------------------------------------------------------------
  // Game rules
  // ------------------------------------------------------------------
  let startTime = null;
  let won = false;
  let elapsed = 0;

  const fireworks = () => {
    for (let i = 0; i < 9; i++) {
      setTimeout(() => {
        const p = car.chassisBody.position;
        const pos = {
          x: p.x + (Math.random() - 0.5) * 40,
          y: 16 + Math.random() * 12,
          z: p.z + (Math.random() - 0.5) * 40,
        };
        // the site's blues: cyan through to ice and electric blue
        const hue = 0.5 + Math.random() * 0.12;
        const colors = [0, 0.03, 0.06].map((o) => new THREE.Color().setHSL(hue + o, 0.9, 0.62).getHex());
        effects.burst(pos, { count: 70, power: 16, up: 4, colors, life: 2.2 });
        audio.impact("ball", 0.5, null);
      }, i * 320);
    }
  };

  const collectCrystal = (c) => {
    c.collected = true;
    collected++;
    scene.remove(c.mesh, c.ring, c.beam);
    effects.burst(c.mesh.position, { count: 60, power: 8, up: 9, colors: [c.color, 0xffffff, NEON.ice] });
    audio.chime(collected);
    cb.onCrystal(collected, TOTAL_CRYSTALS);
    if (collected === TOTAL_CRYSTALS && !won) {
      won = true;
      elapsed = (performance.now() - (startTime || performance.now())) / 1000;
      audio.fanfare();
      fireworks();
      cb.onWin({ time: elapsed });
    }
  };

  const handleEvents = () => {
    while (events.length) {
      const { type, payload } = events.shift();
      if (type === "strike") {
        cb.onToast("All satellites down");
        audio.fanfare();
        effects.burst({ x: -50, y: 3, z: -46 }, { count: 120, power: 12, up: 12 });
      } else if (type === "pins") {
        cb.onToast(`${payload.down} / ${payload.total} satellites down`);
      } else if (type === "goal") {
        cb.onToast(payload.goals > 1 ? `Through the portal · ${payload.goals}` : "Planet through the portal");
        audio.fanfare();
        effects.burst(payload, { count: 140, power: 14, up: 14 });
      }
    }
  };

  const localPad = new THREE.Vector2();
  const updatePads = (p, time) => {
    let inside = null;
    world.pads.forEach((pad) => {
      const dx = p.x - pad.x;
      const dz = p.z - pad.z;
      // pads are rotated 45°: test in the pad's own frame
      localPad.set(dx * Math.cos(Math.PI / 4) - dz * Math.sin(Math.PI / 4), dx * Math.sin(Math.PI / 4) + dz * Math.cos(Math.PI / 4));
      const hit = Math.abs(localPad.x) < pad.size / 2 && Math.abs(localPad.y) < pad.size / 2;
      if (hit && !pad.active && pad.kind === "reset") {
        if (pad.id === "bowling-reset") {
          props.resetBowling();
          cb.onToast("Satellites back in orbit");
        } else {
          props.resetGroup("letters");
          props.resetGroup("dominoes");
          props.resetGroup("bricks");
          props.resetGroup("crates");
          props.resetGroup("cones");
          cb.onToast("Everything back in place");
        }
        audio.chime(2);
      }
      pad.active = hit;
      pad.baseMat.opacity = hit ? 0.5 + Math.sin(time * 8) * 0.12 : 0.22;
      if (hit && pad.kind === "link") inside = pad;
    });
    if (inside !== activePad) {
      activePad = inside;
      cb.onZone(inside ? { id: inside.id, title: inside.title, href: inside.href } : null);
      if (inside) audio.chime(1);
    }
  };

  const hoopSide = world.hoops.map(() => 0);
  const hoopRel = new THREE.Vector3();
  const updateHoops = (p) => {
    world.hoops.forEach((h, i) => {
      const n = { x: Math.sin(h.yaw), z: Math.cos(h.yaw) };
      hoopRel.set(p.x - h.x, p.y - h.mesh.position.y, p.z - h.z);
      const side = hoopRel.x * n.x + hoopRel.z * n.z;
      const s = Math.sign(side);
      if (hoopSide[i] !== 0 && s !== 0 && s !== hoopSide[i]) {
        const inPlane = Math.hypot(hoopRel.x - side * n.x, hoopRel.y, hoopRel.z - side * n.z);
        if (inPlane < h.r - 0.4) {
          cb.onToast("Through the portal");
          audio.whoosh();
          audio.chime(5);
          effects.burst(h.mesh.position, { count: 110, power: 10, up: 8 });
        }
      }
      hoopSide[i] = s || hoopSide[i];
    });
  };

  // the night lights, on for good
  world.night.stars.mat.opacity = 0.9;

  // ------------------------------------------------------------------
  // The black hole: a pull that grows as you get closer. Cross the horizon
  // and the saucer is swallowed, then thrown out at the far corner.
  // ------------------------------------------------------------------
  const blackHole = createBlackHole(scene);
  let warp = null; // { phase: "in" | "out", t, a, d }
  let inWell = false;
  const holeForce = new THREE.Vector2();
  const handleBlackHole = (dt) => {
    const b = car.chassisBody;
    const p = b.position;
    if (warp && warp.phase === "in") {
      warp.t += dt;
      const k = Math.min(1, warp.t / WARP_IN);
      warp.a += dt * (3 + k * 12);
      const r = warp.d * (1 - k);
      car.place(BLACK_HOLE.x + Math.cos(warp.a) * r, 1.4 + k * (blackHole.holeY - 1.4), BLACK_HOLE.z + Math.sin(warp.a) * r, warp.a);
      carModel.group.scale.setScalar(Math.max(0.04, 1 - k * 0.96));
      if (k >= 1) {
        // out the other side, heading for the middle of the map
        const dx = -EXIT_HOLE.x;
        const dz = -EXIT_HOLE.z;
        const len = Math.hypot(dx, dz);
        car.place(EXIT_HOLE.x, 2.6, EXIT_HOLE.z, Math.atan2(-dz / len, dx / len));
        b.velocity.set((dx / len) * 26, 4, (dz / len) * 26);
        warp = { phase: "out", t: 0 };
        effects.burst({ x: EXIT_HOLE.x, y: 2.4, z: EXIT_HOLE.z }, { count: 140, power: 14, up: 8, colors: ACCENTS });
        audio.whoosh();
        audio.chime(6);
        shake = Math.max(shake, 0.9);
        cb.onToast("Spat out across the galaxy");
      }
      return;
    }
    if (warp && warp.phase === "out") {
      warp.t += dt;
      const k = Math.min(1, warp.t / WARP_OUT);
      carModel.group.scale.setScalar(0.04 + k * 0.96);
      if (k >= 1) warp = null;
    }
    const dx = BLACK_HOLE.x - p.x;
    const dz = BLACK_HOLE.z - p.z;
    const d = Math.hypot(dx, dz);
    if (d < BLACK_HOLE.pull) {
      if (!inWell) {
        inWell = true;
        cb.onToast("Gravity well · full thrust to escape");
      }
      // stronger the closer you get, with a little swirl
      const k = 1 - d / BLACK_HOLE.pull;
      const acc = 62 * k * k + 5 * k;
      holeForce.set(dx / d, dz / d);
      b.velocity.x += (holeForce.x - holeForce.y * 0.35) * acc * dt;
      b.velocity.z += (holeForce.y + holeForce.x * 0.35) * acc * dt;
      if (d < BLACK_HOLE.capture + 1.4 && !warp) {
        warp = { phase: "in", t: 0, a: Math.atan2(p.z - BLACK_HOLE.z, p.x - BLACK_HOLE.x), d };
        audio.whoosh();
        cb.onToast("Swallowed by the black hole");
      }
    } else if (d > BLACK_HOLE.pull + 4) inWell = false;
  };

  // ------------------------------------------------------------------
  // Main loop
  // ------------------------------------------------------------------
  const clock = new THREE.Clock();
  let raf = null;
  let time = 0;
  let airTime = 0;
  let dustTimer = 0;
  let hudTimer = 0;
  let wasFlipped = false;
  const camPos = new THREE.Vector3().copy(CAMERA_OFFSET).multiplyScalar(3).add(new THREE.Vector3(SPAWN.x, 0, SPAWN.z));
  camera.position.copy(camPos);
  const camLook = new THREE.Vector3(SPAWN.x, 1, SPAWN.z);
  const lookTarget = new THREE.Vector3();
  const camTarget = new THREE.Vector3();
  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();
  const wheelPos = new THREE.Vector3();
  const exhaust = new THREE.Vector3();
  const back = new THREE.Vector3();

  const input = { throttle: 0, steer: 0, boost: false, handbrake: false };
  let debugCamera = null;

  const tick = () => {
    raf = requestAnimationFrame(tick);
    const dt = Math.min(clock.getDelta(), 1 / 20);
    time += dt;
    windUniform.value = time;

    // input → vehicle
    input.throttle =
      (pressed("ArrowUp", "KeyW") || virtual.up ? 1 : 0) - (pressed("ArrowDown", "KeyS") || virtual.down ? 1 : 0);
    input.steer =
      (pressed("ArrowLeft", "KeyA") || virtual.left ? 1 : 0) - (pressed("ArrowRight", "KeyD") || virtual.right ? 1 : 0);
    input.boost = pressed("ShiftLeft", "ShiftRight") || !!virtual.boost;
    input.handbrake = pressed("Space") || !!virtual.brake;
    if (startTime === null && (input.throttle || input.steer)) startTime = performance.now();
    if (warp && warp.phase === "in") {
      input.throttle = 0;
      input.steer = 0;
      input.boost = false;
    }
    handleBlackHole(dt);

    car.update(input, dt);
    physics.world.step(1 / 60, dt, 4);
    props.update(dt);
    handleEvents();

    const body = car.chassisBody;
    const p = body.position;
    const state = car.state;
    forward.set(1, 0, 0).applyQuaternion(carModel.group.quaternion);
    right.set(0, 0, 1).applyQuaternion(carModel.group.quaternion);

    carModel.update({ chassisBody: body, vehicle: car.vehicle, state, dt, night });

    // airborne / landing
    const airborne = state.wheelsOnGround === 0;
    if (airborne) airTime += dt;
    else {
      if (airTime > 0.45) {
        const strength = Math.min(airTime / 1.2, 1);
        audio.impact("car", 0.4 + strength * 0.6, p);
        shake = Math.max(shake, 0.25 + strength * 0.5);
        for (let i = 0; i < 14; i++) effects.emitDust(p, 1.6);
      }
      airTime = 0;
    }

    // dust, skids, flames
    const speed = body.velocity.length();
    const lateral = Math.abs(body.velocity.x * right.x + body.velocity.z * right.z);
    const sliding = !airborne && speed > 6 && (state.drifting || lateral > 6);
    dustTimer += dt;
    if (!airborne && speed > 10 && dustTimer > (sliding ? 0.045 : 0.08)) {
      dustTimer = 0;
      [2, 3].forEach((i) => {
        const info = car.vehicle.wheelInfos[i];
        if (info.isInContact) {
          wheelPos.copy(info.raycastResult.hitPointWorld);
          effects.emitDust(wheelPos, sliding ? 1 : 0.7);
        }
      });
    }
    if (sliding) {
      const yaw = Math.atan2(forward.x, forward.z);
      [0, 1, 2, 3].forEach((i) => {
        const info = car.vehicle.wheelInfos[i];
        if (!info.isInContact) return;
        const h = info.raycastResult.hitPointWorld;
        effects.addSkid(h.x, h.y, h.z, yaw);
      });
    }
    audio.setSkid(sliding ? Math.min(1, lateral / 12 + (state.drifting ? 0.4 : 0)) : 0);
    if (state.boosting) {
      back.copy(forward).negate();
      exhaust.copy(carModel.exhaust);
      carModel.body.localToWorld(exhaust);
      effects.emitFlame(exhaust, back);
      effects.emitFlame(exhaust, back);
    }
    audio.updateEngine({
      speedRatio: Math.abs(state.forwardSpeed) / VEHICLE.maxSpeed,
      throttle: input.throttle,
      boost: state.boosting,
      airborne,
    });
    audio.setListener(p.x, p.z);

    // fell out of the world?
    if (p.y < -20) car.place(SPAWN.x, 2, SPAWN.z, SPAWN.yaw);

    const flipped = state.flippedTime > 1.2;
    if (flipped !== wasFlipped) {
      wasFlipped = flipped;
      cb.onFlipped(flipped);
    }

    // crystals
    let nearest = null;
    let nearestD = Infinity;
    crystals.forEach((c) => {
      if (c.collected) return;
      c.mesh.rotation.y += dt * 1.4;
      c.mesh.position.y = c.y + Math.sin(time * 2 + c.phase) * 0.4;
      const pulse = 1 + Math.sin(time * 3 + c.phase) * 0.12;
      c.ring.scale.set(pulse, pulse, 1);
      const d = Math.hypot(c.x - p.x, c.mesh.position.y - p.y, c.z - p.z);
      if (d < 3.6) collectCrystal(c);
      const flat = Math.hypot(c.x - p.x, c.z - p.z);
      if (flat < nearestD) {
        nearestD = flat;
        nearest = c;
      }
    });
    if (nearest && nearestD > 22 && !won) {
      const dx = nearest.x - p.x;
      const dz = nearest.z - p.z;
      const a = Math.atan2(dx, dz);
      arrow.visible = true;
      arrow.position.set(p.x + Math.sin(a) * 5, 0.12, p.z + Math.cos(a) * 5);
      arrow.rotation.y = a + Math.PI;
      arrow.material.opacity = 0.55 + Math.sin(time * 5) * 0.25;
    } else arrow.visible = false;

    updatePads(p, time);
    updateHoops(p);

    world.update(time, dt);
    blackHole.update(time, dt);
    effects.update(dt);

    // camera: fixed isometric angle, eases in on load, zooms out with speed
    zoom += (zoomTarget - zoom) * Math.min(1, dt * 4);
    const speedZoom = 1 + Math.min(speed / VEHICLE.maxSpeedBoost, 1) * 0.3;
    lookTarget.set(p.x + body.velocity.x * 0.12, Math.max(p.y, 0) + 1, p.z + body.velocity.z * 0.12);
    camLook.lerp(lookTarget, Math.min(1, dt * 5));
    camTarget.copy(CAMERA_OFFSET).multiplyScalar(zoom * speedZoom * fit).add(camLook);
    camPos.lerp(camTarget, Math.min(1, dt * (time < 2.5 ? 1.6 : 4)));
    camera.position.copy(camPos);
    if (shake > 0.001) {
      camera.position.x += (Math.random() - 0.5) * shake;
      camera.position.y += (Math.random() - 0.5) * shake;
      camera.position.z += (Math.random() - 0.5) * shake;
      shake *= Math.pow(0.02, dt);
    }
    camera.lookAt(camLook);
    if (debugCamera) {
      // dev-only: fixed inspection camera expressed in the car's frame
      camera.position.copy(debugCamera.pos).applyQuaternion(carModel.group.quaternion).add(carModel.group.position);
      camera.lookAt(carModel.group.position.x, carModel.group.position.y + debugCamera.lookY, carModel.group.position.z);
    }
    const fovTarget = state.boosting ? 52 : 45;
    if (Math.abs(camera.fov - fovTarget) > 0.05) {
      camera.fov += (fovTarget - camera.fov) * Math.min(1, dt * 4);
      camera.updateProjectionMatrix();
    }

    // shadows follow the car so they stay crisp
    sun.position.set(camLook.x + SUN_OFFSET.x, SUN_OFFSET.y, camLook.z + SUN_OFFSET.z);
    sun.target.position.set(camLook.x, 0, camLook.z);

    hudTimer += dt;
    if (hudTimer > 0.1) {
      hudTimer = 0;
      cb.onHud({
        // speed as a warp factor, 0 to 9.9 at full boost
        warp: Math.min(9.9, (Math.abs(state.forwardSpeed) / VEHICLE.maxSpeedBoost) * 9.9),
        time: won ? elapsed : startTime ? (performance.now() - startTime) / 1000 : 0,
        boosting: state.boosting,
      });
    }

    renderer.render(scene, camera);
  };
  tick();

  // Dev-only hook for automated screenshots / debugging.
  if (process.env.NODE_ENV !== "production") {
    window.__carGame = {
      place: (x, z, yaw = SPAWN.yaw) => car.place(x, 2, z, yaw),
      scene,
      car,
      inspect: (x, y, z, lookY = 1.5) => {
        debugCamera = x === undefined ? null : { pos: new THREE.Vector3(x, y, z), lookY };
      },
    };
  }

  const onResize = () => {
    camera.aspect = width() / height();
    camera.updateProjectionMatrix();
    fit = aspectZoom();
    renderer.setSize(width(), height());
  };
  window.addEventListener("resize", onResize);

  return {
    setVirtual: (name, value) => {
      audio.unlock();
      virtual[name] = value;
      if (name === "horn") horn(value);
    },
    openActivePad: () => openPad(activePad),
    resetCar,
    toggleMute,
    dispose: () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("resize", onResize);
      renderer.domElement.removeEventListener("wheel", onWheel);
      audio.dispose();
      delete window.__carGame;
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        const mats = Array.isArray(obj.material) ? obj.material : obj.material ? [obj.material] : [];
        mats.forEach((m) => {
          if (m.map) m.map.dispose();
          m.dispose();
        });
      });
      renderer.dispose();
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    },
  };
};
