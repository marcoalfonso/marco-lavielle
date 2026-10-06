import * as THREE from "three";
import * as CANNON from "cannon-es";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import fontJson from "three/examples/fonts/helvetiker_bold.typeface.json";
import { COLORS, NEON, matte, glow, outline, canvasTexture } from "./materials.js";
import {
  BOWLING,
  BRICK_WALL,
  DOMINOES,
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
  const pinMat = glow(COLORS.pin, 0.35, { shininess: 40 });
  const stripeGeo = new THREE.CylinderGeometry(0.262, 0.226, 0.14, 10, 1, true);
  const stripeMat = glow(COLORS.pinStripe, 1, { side: THREE.DoubleSide });
  const pins = [];
  const rowSpacing = 1.9;
  for (let row = 0; row < 4; row++) {
    for (let j = 0; j <= row; j++) {
      const x = BOWLING.apex.x - row * rowSpacing * 0.87;
      const z = BOWLING.apex.z + (j - row / 2) * rowSpacing;
      const mesh = new THREE.Mesh(pinGeo, pinMat);
      const stripe = new THREE.Mesh(stripeGeo, stripeMat);
      stripe.position.y = 0.7;
      mesh.add(stripe);
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
    matte(0x0b1624, { shininess: 90, specular: 0x3a6a88 }),
  );
  outline(bowlingBall, NEON.cyan, 0.75, 1);
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
  const brickMats = [matte(COLORS.brick), matte(0x0f2840), matte(0x173a56)];
  for (let row = 0; row < BRICK_WALL.rows; row++) {
    const offset = row % 2 ? 1 : 0;
    const cols = BRICK_WALL.cols - (row % 2);
    for (let c = 0; c < cols; c++) {
      const x = BRICK_WALL.x - BRICK_WALL.cols + 1 + c * 2 + offset;
      const y = 0.5 + row * 1.0;
      const body = new CANNON.Body({ mass: 1.4, material: materials.prop });
      body.addShape(new CANNON.Box(new CANNON.Vec3(0.98, 0.48, 0.48)));
      body.position.set(x, y, BRICK_WALL.z);
      const brick = new THREE.Mesh(brickGeo, brickMats[(row + c) % brickMats.length]);
      outline(brick, NEON.cyan, 0.65);
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
  // Domino spiral
  // ------------------------------------------------------------------
  const dominoGeo = new THREE.BoxGeometry(0.5, 3.2, 1.6);
  const dominoMat = matte(COLORS.domino, { shininess: 30 });
  const dotMat = new THREE.MeshBasicMaterial({ color: COLORS.dominoDot });
  const dotGeo = new THREE.CircleGeometry(0.16, 8);
  for (let i = 0; i < DOMINOES.count; i++) {
    const t = i / (DOMINOES.count - 1);
    const a = DOMINOES.a0 + (DOMINOES.a1 - DOMINOES.a0) * t;
    const r = DOMINOES.r * (1 - t * 0.35);
    const x = DOMINOES.cx + Math.cos(a) * r;
    const z = DOMINOES.cz + Math.sin(a) * r;
    const mesh = new THREE.Mesh(dominoGeo, dominoMat);
    outline(mesh, NEON.cyan, 0.6);
    // pips on both faces
    [0.26, -0.26].forEach((fx) => {
      [-0.8, 0.8].forEach((py) => {
        const dot = new THREE.Mesh(dotGeo, dotMat);
        dot.position.set(fx, py, 0);
        dot.rotation.y = fx > 0 ? Math.PI / 2 : -Math.PI / 2;
        mesh.add(dot);
      });
    });
    const body = new CANNON.Body({ mass: 0.8, material: materials.prop });
    body.addShape(new CANNON.Box(new CANNON.Vec3(0.25, 1.6, 0.8)));
    body.position.set(x, 1.61, z);
    // thin axis along the path tangent so they topple into each other
    body.quaternion.setFromEuler(0, Math.PI / 2 - a, 0);
    add({ mesh, body, kind: "domino", group: "dominoes", asleep: true });
  }

  // ------------------------------------------------------------------
  // Crate pyramid
  // ------------------------------------------------------------------
  const crateTex = canvasTexture(128, 128, (ctx) => {
    ctx.fillStyle = "#0a1622";
    ctx.fillRect(0, 0, 128, 128);
    ctx.strokeStyle = "rgba(0, 191, 243, 0.85)";
    ctx.lineWidth = 6;
    ctx.strokeRect(6, 6, 116, 116);
    ctx.strokeStyle = "rgba(0, 191, 243, 0.4)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(12, 12);
    ctx.lineTo(116, 116);
    ctx.moveTo(116, 12);
    ctx.lineTo(12, 116);
    ctx.stroke();
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
  // Traffic cones (slalom on the north spoke)
  // ------------------------------------------------------------------
  const coneMat = glow(COLORS.cone, 0.55);
  const coneWhite = glow(NEON.ice, 1);
  const coneGeo = new THREE.ConeGeometry(0.62, 1.7, 10);
  const coneBaseGeo = new THREE.BoxGeometry(1.4, 0.16, 1.4);
  const coneBandGeo = new THREE.CylinderGeometry(0.34, 0.44, 0.24, 10, 1, true);
  CONES.forEach(({ x, z }) => {
    const mesh = new THREE.Group();
    const c = new THREE.Mesh(coneGeo, coneMat);
    c.position.y = 0.1;
    c.castShadow = true;
    mesh.add(c);
    const base = new THREE.Mesh(coneBaseGeo, coneMat);
    base.position.y = -0.77;
    base.castShadow = true;
    mesh.add(base);
    const band = new THREE.Mesh(coneBandGeo, coneWhite);
    band.position.y = 0.05;
    mesh.add(band);
    const body = new CANNON.Body({ mass: 0.5, material: materials.prop });
    body.addShape(new CANNON.Cylinder(0.12, 0.62, 1.7, 8), new CANNON.Vec3(0, 0.1, 0));
    body.addShape(new CANNON.Box(new CANNON.Vec3(0.7, 0.08, 0.7)), new CANNON.Vec3(0, -0.77, 0));
    body.position.set(x, 0.86, z);
    add({ mesh, body, kind: "cone", group: "cones", asleep: true });
  });

  // ------------------------------------------------------------------
  // Football — truncated-icosahedron look via per-face colours
  // ------------------------------------------------------------------
  const BALL_R = 1.5;
  const footGeo = new THREE.IcosahedronGeometry(BALL_R, 1);
  const baseIco = new THREE.IcosahedronGeometry(1, 0).getAttribute("position");
  const corners = [];
  for (let i = 0; i < baseIco.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(baseIco, i).normalize();
    if (!corners.some((c) => c.distanceTo(v) < 1e-3)) corners.push(v);
  }
  const fpos = footGeo.getAttribute("position");
  const fcol = [];
  const centroid = new THREE.Vector3();
  const vtx = new THREE.Vector3();
  for (let i = 0; i < fpos.count; i += 3) {
    centroid.set(0, 0, 0);
    for (let k = 0; k < 3; k++) centroid.add(vtx.fromBufferAttribute(fpos, i + k));
    centroid.normalize();
    const dark = corners.some((c) => c.dot(centroid) > 0.9);
    const col = dark ? [0.0, 0.75, 0.95] : [0.05, 0.09, 0.14];
    for (let k = 0; k < 3; k++) fcol.push(...col);
  }
  footGeo.setAttribute("color", new THREE.Float32BufferAttribute(fcol, 3));
  const football = new THREE.Mesh(
    footGeo,
    matte(0xffffff, { vertexColors: true, shininess: 30 }),
  );
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
      const color = new THREE.Color().setHSL(0.5 + Math.random() * 0.12, 0.9, 0.6);
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
  };
};
