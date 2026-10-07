import * as THREE from "three";
import * as CANNON from "cannon-es";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import fontJson from "three/examples/fonts/helvetiker_bold.typeface.json";
import { COLORS, NEON, ACCENTS, matte, glow, outline, canvasTexture, roundRect } from "./materials.js";
import {
  BOWLING,
  BRICK_WALL,
  CRATES,
  CONES,
  PITCH,
  GOAL,
  BOUNDARY,
} from "./layout.js";

const Q = Math.PI / 4;
const UP = new CANNON.Vec3(0, 1, 0);

export const buildProps = ({ scene, physics, emit, audio }) => {
  const { world, materials } = physics;
  const props = [];

  const add = ({ mesh, body, kind, group, asleep = false }) => {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    world.addBody(body);
    body.sleepSpeedLimit = 0.4;
    body.sleepTimeLimit = 0.6;
    const prop = {
      mesh,
      body,
      kind,
      group,
      home: { p: body.position.clone(), q: body.quaternion.clone() },
      lastSound: 0,
    };
    mesh.position.copy(body.position);
    mesh.quaternion.copy(body.quaternion);
    body.addEventListener("collide", (e) => {
      const v = Math.abs(e.contact.getImpactVelocityAlongNormal());
      const now = performance.now();
      if (v > 2 && now - prop.lastSound > 120) {
        prop.lastSound = now;
        audio.impact(kind, Math.min(v / 14, 1), body.position);
      }
    });
    if (asleep) body.sleep();
    props.push(prop);
    return prop;
  };

  const resetGroup = (group) => {
    props.forEach((p) => {
      if (p.group !== group) return;
      p.body.position.copy(p.home.p);
      p.body.quaternion.copy(p.home.q);
      p.body.velocity.setZero();
      p.body.angularVelocity.setZero();
      p.body.sleep();
      p.mesh.position.copy(p.body.position);
      p.mesh.quaternion.copy(p.body.quaternion);
    });
  };

  // ------------------------------------------------------------------
  // Name letters — knockable 3D type on the plaza, like a title card
  // ------------------------------------------------------------------
  const font = new FontLoader().parse(fontJson);
  const rightDir = new THREE.Vector3(Math.cos(Q), 0, -Math.sin(Q)); // screen-right on the ground
  // style: "light" letters glow solid; "glass" letters are dark with lit edges
  const layoutWord = (word, cx, cz, style, size) => {
    const mat = style === "light" ? glow(NEON.holo, 0.85, { shininess: 25 }) : matte(0x0b1826, { shininess: 70 });
    const glyphs = word.split("").map((ch) => {
      const geo = new TextGeometry(ch, {
        font,
        size,
        height: size * 0.36,
        curveSegments: 3,
        bevelEnabled: true,
        bevelThickness: 0.06,
        bevelSize: 0.05,
        bevelSegments: 1,
      });
      geo.computeBoundingBox();
      const bb = geo.boundingBox;
      const w = bb.max.x - bb.min.x;
      geo.center();
      return { geo, w, h: bb.max.y - bb.min.y, d: bb.max.z - bb.min.z };
    });
    const gap = size * 0.16;
    const total = glyphs.reduce((s, g) => s + g.w, 0) + gap * (glyphs.length - 1);
    let cursor = -total / 2;
    glyphs.forEach((g) => {
      const along = cursor + g.w / 2;
      cursor += g.w + gap;
      const body = new CANNON.Body({ mass: 5, material: materials.prop });
      body.addShape(new CANNON.Box(new CANNON.Vec3(g.w / 2, g.h / 2, g.d / 2)));
      body.position.set(cx + rightDir.x * along, g.h / 2 + 0.02, cz + rightDir.z * along);
      body.quaternion.setFromEuler(0, Q, 0);
      const mesh = new THREE.Mesh(g.geo, mat);
      outline(mesh, style === "light" ? NEON.ice : NEON.holo, style === "light" ? 0.9 : 0.95, 30);
      add({ mesh, body, kind: "letter", group: "letters", asleep: true });
    });
  };
  layoutWord("MARCO", -8.5, -8.5, "light", 3.4);
  layoutWord("LAVIELLE", -2.6, -2.6, "glass", 2.6);

  // ------------------------------------------------------------------
  // Bowling: lathe-turned pins + a heavy ball
  // ------------------------------------------------------------------
  const PIN_H = 2.4;
  const pinProfile = [
    [0, 0],
    [0.34, 0],
    [0.44, 0.35],
    [0.5, 0.8],
    [0.42, 1.25],
    [0.24, 1.6],
    [0.2, 1.8],
    [0.27, 2.05],
    [0.22, 2.3],
    [0, 2.4],
  ].map(([x, y]) => new THREE.Vector2(x, y - PIN_H / 2));
  const pinGeo = new THREE.LatheGeometry(pinProfile, 10);
  const satHullGeo = new THREE.CylinderGeometry(0.34, 0.34, PIN_H * 0.75, 8);
  const satPanelGeo = new THREE.BoxGeometry(1.0, 1.1, 0.06);
  const satPanelMat = matte(0x101a3a, { emissive: 0x0a1440, shininess: 90, specular: 0x6f9fff });
  const satDishGeo = new THREE.ConeGeometry(0.42, 0.3, 14, 1, true);
  const pinMat = glow(COLORS.pin, 0.35, { shininess: 40 });
  const pins = [];
  // ten satellites holding two rings round the swarm's centre
  const SWARM = [
    ...Array.from({ length: 7 }, (_, k) => [3.6, (k / 7) * Math.PI * 2]),
    ...Array.from({ length: 3 }, (_, k) => [1.4, (k / 3) * Math.PI * 2 + 0.5]),
  ];
  for (let row = 0; row < 1; row++) {
    for (let j = 0; j < SWARM.length; j++) {
      const [sr, sa] = SWARM[j];
      const x = BOWLING.apex.x + Math.cos(sa) * sr;
      const z = BOWLING.apex.z + Math.sin(sa) * sr;
      // a little satellite: a body, two solar panels and a dish, the size
      // of the old pin so it falls the same way
      const mesh = new THREE.Group();
      const hull = new THREE.Mesh(satHullGeo, pinMat);
      mesh.add(hull);
      const tint = ACCENTS[(row + j) % ACCENTS.length];
      [-1, 1].forEach((side) => {
        const panel = new THREE.Mesh(satPanelGeo, satPanelMat);
        panel.position.set(side * 0.78, 0.25, 0);
        outline(panel, tint, 0.9);
        mesh.add(panel);
      });
      const dish = new THREE.Mesh(satDishGeo, glow(tint, 0.9, { side: THREE.DoubleSide }));
      dish.position.y = 1.05;
      dish.rotation.x = Math.PI;
      mesh.add(dish);
      hull.castShadow = true;
      const body = new CANNON.Body({ mass: 0.8, material: materials.prop });
      body.addShape(new CANNON.Cylinder(0.3, 0.45, PIN_H, 10));
      body.position.set(x, PIN_H / 2 + 0.01, z);
      pins.push(add({ mesh, body, kind: "pin", group: "bowling", asleep: true }));
    }
  }
  const ballBody = new CANNON.Body({
    mass: 22,
    material: materials.prop,
    linearDamping: 0.12,
    angularDamping: 0.12,
  });
  ballBody.addShape(new CANNON.Sphere(1.3));
  ballBody.position.set(BOWLING.ball.x, 1.3, BOWLING.ball.z);
  const bowlingBall = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.3, 1),
    matte(0x3a1c08, { emissive: NEON.amber, emissiveIntensity: 0.35, shininess: 90, specular: 0xffd6a0 }),
  );
  outline(bowlingBall, NEON.amber, 0.75, 1);
  add({ mesh: bowlingBall, body: ballBody, kind: "ball", group: "bowling", asleep: true });

  const pinUp = new CANNON.Vec3();
  const pinDown = (p) => {
    p.body.quaternion.vmult(UP, pinUp);
    return pinUp.y < 0.6 || p.body.position.distanceTo(p.home.p) > 2.2;
  };
  const bowling = { watching: false, timer: 0, counted: 0 };
  const updateBowling = (dt) => {
    const down = pins.filter(pinDown).length;
    if (!bowling.watching && down > bowling.counted) {
      bowling.watching = true;
      bowling.timer = 0;
    }
    if (bowling.watching) {
      bowling.timer += dt;
      if (bowling.timer > 3) {
        bowling.watching = false;
        const fresh = down - bowling.counted;
        if (fresh > 0) {
          if (down === pins.length && bowling.counted === 0) emit("strike", {});
          else emit("pins", { down, total: pins.length });
        }
        bowling.counted = down;
      }
    }
  };

  // ------------------------------------------------------------------
  // Brick wall
  // ------------------------------------------------------------------
  const brickGeo = new THREE.BoxGeometry(1.96, 0.96, 0.96);
  // a force field of hex energy panels (where the brick wall was)
  const hexTex = canvasTexture(128, 64, (ctx, W, H) => {
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = 2;
    const r = 9;
    for (let y = 0, row = 0; y < H + r; y += r * 1.5, row++) {
      for (let x = row % 2 ? r * 0.87 : 0; x < W + r; x += r * 1.74) {
        ctx.beginPath();
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * Math.PI * 2 + Math.PI / 6;
          ctx[k ? "lineTo" : "moveTo"](x + Math.cos(a) * r, y + Math.sin(a) * r);
        }
        ctx.closePath();
        ctx.stroke();
      }
    }
  });
  const brickMats = [NEON.cyan, NEON.magenta, NEON.violet].map(
    (c) =>
      new THREE.MeshBasicMaterial({ map: hexTex, color: c, transparent: true, opacity: 0.75, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }),
  );
  for (let row = 0; row < BRICK_WALL.rows; row++) {
    const offset = row % 2 ? 1 : 0;
    const cols = BRICK_WALL.cols - (row % 2);
    for (let c = 0; c < cols; c++) {
      const x = BRICK_WALL.x - BRICK_WALL.cols + 1 + c * 2 + offset;
      const y = 0.5 + row * 1.0;
      const body = new CANNON.Body({ mass: 1.4, material: materials.prop });
      body.addShape(new CANNON.Box(new CANNON.Vec3(0.98, 0.48, 0.48)));
      body.position.set(x, y, BRICK_WALL.z);
      const k = (row + c) % brickMats.length;
      const brick = new THREE.Mesh(brickGeo, brickMats[k]);
      outline(brick, [NEON.cyan, NEON.magenta, NEON.violet][k], 0.9);
      add({
        mesh: brick,
        body,
        kind: "brick",
        group: "bricks",
        asleep: true,
      });
    }
  }

  // ------------------------------------------------------------------
  // Crate pyramid
  // ------------------------------------------------------------------
  const crateTex = canvasTexture(128, 128, (ctx) => {
    // a supply pod's panel: a lit frame, a status strip, a hatch
    ctx.fillStyle = "#14102a";
    ctx.fillRect(0, 0, 128, 128);
    ctx.strokeStyle = "rgba(255, 179, 71, 0.9)";
    ctx.lineWidth = 5;
    roundRect(ctx, 8, 8, 112, 112, 18);
    ctx.stroke();
    ctx.fillStyle = "rgba(157, 255, 107, 0.9)";
    ctx.fillRect(22, 26, 84, 8);
    ctx.strokeStyle = "rgba(255, 179, 71, 0.5)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(64, 78, 22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(255, 179, 71, 0.8)";
    ctx.beginPath();
    ctx.arc(64, 78, 6, 0, Math.PI * 2);
    ctx.fill();
  });
  const crateMat = new THREE.MeshPhongMaterial({ map: crateTex, shininess: 5, emissive: 0xffffff, emissiveMap: crateTex, emissiveIntensity: 0.6 });
  const CRATE = 1.8;
  const crateGeo = new THREE.BoxGeometry(CRATE, CRATE, CRATE);
  for (let layer = 0; layer < 4; layer++) {
    const n = 4 - layer;
    for (let i = 0; i < n; i++) {
      const z = CRATES.z + (i - (n - 1) / 2) * (CRATE + 0.05);
      const body = new CANNON.Body({ mass: 1.2, material: materials.prop });
      body.addShape(new CANNON.Box(new CANNON.Vec3(CRATE / 2, CRATE / 2, CRATE / 2)));
      body.position.set(CRATES.x, CRATE / 2 + layer * (CRATE + 0.01), z);
      add({ mesh: new THREE.Mesh(crateGeo, crateMat), body, kind: "crate", group: "crates", asleep: true });
    }
  }

  // ------------------------------------------------------------------
  // Space buoys (a slalom where the cones were): a lit core in a ring
  // ------------------------------------------------------------------
  const buoyGeo = new THREE.SphereGeometry(0.6, 16, 12);
  const buoyRingGeo = new THREE.TorusGeometry(0.95, 0.07, 6, 28);
  CONES.forEach(({ x, z }, i) => {
    const tint = i % 2 ? NEON.magenta : NEON.cyan;
    const mesh = new THREE.Group();
    const core = new THREE.Mesh(buoyGeo, glow(tint, 0.9));
    core.castShadow = true;
    mesh.add(core);
    const ring = new THREE.Mesh(buoyRingGeo, glow(NEON.ice, 1));
    ring.rotation.x = Math.PI / 2 - 0.3;
    mesh.add(ring);
    const body = new CANNON.Body({ mass: 0.5, material: materials.bouncy, linearDamping: 0.3 });
    body.addShape(new CANNON.Sphere(0.6));
    body.position.set(x, 0.62, z);
    add({ mesh, body, kind: "cone", group: "cones", asleep: true });
  });

  // ------------------------------------------------------------------
  // Football — truncated-icosahedron look via per-face colours
  // ------------------------------------------------------------------
  const BALL_R = 1.5;
  // the ball is a little banded planet with a ring
  const planetTex = canvasTexture(256, 128, (ctx, W, H) => {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#4a1450");
    g.addColorStop(0.5, "#ff4fd8");
    g.addColorStop(1, "#4a1450");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    for (let k = 0; k < 9; k++) {
      ctx.globalAlpha = 0.25 + Math.random() * 0.4;
      ctx.fillStyle = k % 2 ? "#ffd6f4" : "#9b6bff";
      ctx.fillRect(0, Math.random() * H, W, 4 + Math.random() * 10);
    }
  });
  const football = new THREE.Mesh(
    new THREE.SphereGeometry(BALL_R, 28, 18),
    new THREE.MeshPhongMaterial({ map: planetTex, emissive: 0xffffff, emissiveMap: planetTex, emissiveIntensity: 0.35, shininess: 30 }),
  );
  const ballRing = new THREE.Mesh(
    new THREE.RingGeometry(BALL_R * 1.35, BALL_R * 1.8, 40),
    new THREE.MeshBasicMaterial({ color: NEON.violet, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false }),
  );
  ballRing.rotation.x = Math.PI / 2 - 0.4;
  football.add(ballRing);
  const footBody = new CANNON.Body({
    mass: 5,
    material: materials.bouncy,
    linearDamping: 0.28,
    angularDamping: 0.35,
  });
  footBody.addShape(new CANNON.Sphere(BALL_R));
  footBody.position.set(PITCH.x, BALL_R + 0.02, PITCH.z);
  const footProp = add({ mesh: football, body: footBody, kind: "football", group: "football" });

  const match = { cooldown: 0, goals: 0 };
  const updateFootball = (dt) => {
    const p = footBody.position;
    if (match.cooldown > 0) {
      match.cooldown -= dt;
      if (match.cooldown <= 0) {
        p.set(PITCH.x, 8, PITCH.z);
        footBody.velocity.setZero();
        footBody.angularVelocity.setZero();
      }
      return;
    }
    const halfW = PITCH.w / 2;
    const inMouth = Math.abs(p.z - PITCH.z) < GOAL.width / 2 && p.y < GOAL.height;
    if (inMouth && Math.abs(p.x - PITCH.x) > halfW + BALL_R * 0.9) {
      match.goals++;
      match.cooldown = 2.5;
      emit("goal", { goals: match.goals, x: p.x, y: p.y, z: p.z });
    }
    // escaped the world somehow → put it back
    if (p.y < -10 || Math.abs(p.x) > BOUNDARY + 20 || Math.abs(p.z) > BOUNDARY + 20) {
      match.cooldown = 0.01;
    }
  };

  // ------------------------------------------------------------------
  // Easter egg: rain of bouncy balls
  // ------------------------------------------------------------------
  const rainGeo = new THREE.IcosahedronGeometry(0.7, 1);
  const rain = [];
  const ballRain = (x, z) => {
    for (let i = 0; i < 40; i++) {
      const color = new THREE.Color(ACCENTS[Math.floor(Math.random() * ACCENTS.length)]);
      const mesh = new THREE.Mesh(rainGeo, glow(color, 0.6, { shininess: 60 }));
      const body = new CANNON.Body({ mass: 0.6, material: materials.bouncy, linearDamping: 0.1 });
      body.addShape(new CANNON.Sphere(0.7));
      body.position.set(x + (Math.random() - 0.5) * 30, 18 + Math.random() * 25, z + (Math.random() - 0.5) * 30);
      rain.push(add({ mesh, body, kind: "rain", group: "rain" }));
    }
    // keep the scene light: drop the oldest beyond 120
    while (rain.length > 120) {
      const old = rain.shift();
      scene.remove(old.mesh);
      old.mesh.material.dispose();
      world.removeBody(old.body);
      props.splice(props.indexOf(old), 1);
    }
  };

  const update = (dt) => {
    for (let i = 0; i < props.length; i++) {
      const p = props[i];
      if (p.body.sleepState === CANNON.Body.SLEEPING) continue;
      p.mesh.position.copy(p.body.position);
      p.mesh.quaternion.copy(p.body.quaternion);
    }
    updateBowling(dt);
    updateFootball(dt);
  };

  const resetBowling = () => {
    resetGroup("bowling");
    bowling.watching = false;
    bowling.counted = 0;
  };

  return {
    update,
    resetGroup,
    resetBowling,
    ballRain,
    football: footProp,
    comet: ballBody,
  };
};
