import * as THREE from "three";
import {
  COLORS,
  matte,
  windify,
  canvasTexture,
  roundRect,
} from "./materials.js";
import {
  RING,
  ROAD_W,
  PLAZA_R,
  BOUNDARY,
  RAMPS,
  HOOPS,
  BUILDINGS,
  FOUNTAIN,
  PITCH,
  GOAL,
  BOWLING,
  PADS,
  LAMPS,
  DOMINOES,
  CRATES,
  BRICK_WALL,
  SPAWN,
  CRYSTALS,
  mulberry32,
  onRoad,
  buildPrism,
  prismProfile,
} from "./layout.js";

const Q = Math.PI / 4; // yaw that makes flat text / boards face the camera

// Collects transforms, then emits one InstancedMesh (one draw call).
const createInstancer = (geometry, material, { cast = true, receive = false } = {}) => {
  const matrices = [];
  const colors = [];
  const add = (matrix, color) => {
    matrices.push(matrix.clone());
    colors.push(color);
  };
  const build = (scene) => {
    if (!matrices.length) return null;
    const mesh = new THREE.InstancedMesh(geometry, material, matrices.length);
    matrices.forEach((m, i) => {
      mesh.setMatrixAt(i, m);
      if (colors[i] !== undefined) mesh.setColorAt(i, new THREE.Color(colors[i]));
    });
    mesh.castShadow = cast;
    mesh.receiveShadow = receive;
    scene.add(mesh);
    return mesh;
  };
  return { add, build };
};

const tmpMatrix = new THREE.Matrix4();
const tmpPos = new THREE.Vector3();
const tmpQuat = new THREE.Quaternion();
const tmpScale = new THREE.Vector3();
const tmpEuler = new THREE.Euler();
const compose = (x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) =>
  tmpMatrix.compose(
    tmpPos.set(x, y, z),
    tmpQuat.setFromEuler(tmpEuler.set(rx, ry, rz)),
    tmpScale.set(sx, sy, sz),
  );

export const prismGeometry = (profile, width) => {
  const { vertices, faces } = buildPrism(profile, width);
  const positions = [];
  faces.forEach((f) => {
    for (let i = 1; i < f.length - 1; i++) {
      [f[0], f[i], f[i + 1]].forEach((vi) => positions.push(...vertices[vi]));
    }
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  return geo;
};

export const buildWorld = ({ scene, physics, isMobile }) => {
  const night = { windows: null, lamps: null, glows: [], pads: [] };
  const updaters = [];
  const rng = mulberry32(7);

  // Areas that scenery generators (trees, grass, rocks) must keep clear of.
  const keepOut = [
    { x: FOUNTAIN.x, z: FOUNTAIN.z, r: FOUNTAIN.r + 3 },
    { x: PITCH.x, z: PITCH.z, w: PITCH.w + 10, d: PITCH.d + 6 },
    {
      x: (BOWLING.lane.x0 + BOWLING.lane.x1) / 2,
      z: BOWLING.lane.z,
      w: Math.abs(BOWLING.lane.x1 - BOWLING.lane.x0) + 8,
      d: BOWLING.lane.width + 6,
    },
    { x: DOMINOES.cx, z: DOMINOES.cz, r: DOMINOES.r + 4 },
    { x: CRATES.x, z: CRATES.z, r: 7 },
    { x: BRICK_WALL.x, z: BRICK_WALL.z, w: BRICK_WALL.cols * 2 + 8, d: 10 },
    ...PADS.map((p) => ({ x: p.x, z: p.z, r: p.size * 0.8 + 3 })),
    ...PADS.filter((p) => p.kind === "link").map((p) => ({
      x: p.x - 5.5,
      z: p.z - 5.5,
      r: 7,
    })),
    ...RAMPS.map((r) => ({ x: r.x, z: r.z, r: Math.max(r.len, r.width) * 0.75 + 2 })),
    ...BUILDINGS.map((b) => ({ x: b.x, z: b.z, w: b.w + 6, d: b.d + 6 })),
    { x: SPAWN.x, z: SPAWN.z, r: 10 },
    ...CRYSTALS.map((c) => ({ x: c.x, z: c.z, r: 5 })),
  ];
  const isClear = (x, z, pad = 0) =>
    !keepOut.some((k) =>
      k.r !== undefined
        ? Math.hypot(x - k.x, z - k.z) < k.r + pad
        : Math.abs(x - k.x) < k.w / 2 + pad && Math.abs(z - k.z) < k.d / 2 + pad,
    );

  // ------------------------------------------------------------------
  // Ground, lawns, roads
  // ------------------------------------------------------------------
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(900, 900),
    new THREE.MeshPhongMaterial({ color: COLORS.world, shininess: 0 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const flatMat = (color) => new THREE.MeshPhongMaterial({ color, shininess: 0 });
  const addFlat = (geometry, material, x, z, y = 0.02, yaw = 0) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.set(-Math.PI / 2, 0, yaw);
    mesh.position.set(x, y, z);
    mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
  };

  const lawnMat = flatMat(COLORS.lawn);
  const lawnSize = RING - ROAD_W / 2 - 2.75 - 1 - (ROAD_W / 2 + 2.75 + 1);
  const lawnCenter = ROAD_W / 2 + 2.75 + 1 + lawnSize / 2;
  [-1, 1].forEach((sx) =>
    [-1, 1].forEach((sz) =>
      addFlat(
        new THREE.PlaneGeometry(lawnSize, lawnSize),
        lawnMat,
        sx * lawnCenter,
        sz * lawnCenter,
        0.01,
      ),
    ),
  );

  const roadMat = flatMat(COLORS.road);
  const sidewalkMat = flatMat(COLORS.sidewalk);
  const lineMat = new THREE.MeshBasicMaterial({ color: COLORS.line });
  const ringLen = RING * 2 + ROAD_W;
  // ring road
  addFlat(new THREE.PlaneGeometry(ringLen, ROAD_W), roadMat, 0, -RING);
  addFlat(new THREE.PlaneGeometry(ringLen, ROAD_W), roadMat, 0, RING);
  addFlat(new THREE.PlaneGeometry(ROAD_W, ringLen), roadMat, -RING, 0);
  addFlat(new THREE.PlaneGeometry(ROAD_W, ringLen), roadMat, RING, 0);
  // spokes
  const spokeLen = RING - PLAZA_R + 2;
  const spokeMid = PLAZA_R - 2 + spokeLen / 2;
  addFlat(new THREE.PlaneGeometry(ROAD_W, spokeLen), roadMat, 0, -spokeMid);
  addFlat(new THREE.PlaneGeometry(ROAD_W, spokeLen), roadMat, 0, spokeMid);
  addFlat(new THREE.PlaneGeometry(spokeLen, ROAD_W), roadMat, -spokeMid, 0);
  addFlat(new THREE.PlaneGeometry(spokeLen, ROAD_W), roadMat, spokeMid, 0);

  // sidewalks
  const swW = 2.5;
  const innerEdge = RING - ROAD_W / 2 - swW / 2;
  const outerEdge = RING + ROAD_W / 2 + swW / 2;
  [
    [innerEdge, innerEdge * 2 + swW],
    [outerEdge, outerEdge * 2 + swW],
  ].forEach(([off, len]) => {
    addFlat(new THREE.PlaneGeometry(len, swW), sidewalkMat, 0, -off, 0.025);
    addFlat(new THREE.PlaneGeometry(len, swW), sidewalkMat, 0, off, 0.025);
    addFlat(new THREE.PlaneGeometry(swW, len), sidewalkMat, -off, 0, 0.025);
    addFlat(new THREE.PlaneGeometry(swW, len), sidewalkMat, off, 0, 0.025);
  });
  const spokeSwLen = RING - ROAD_W / 2 - swW - PLAZA_R + 1;
  const spokeSwMid = PLAZA_R - 1 + spokeSwLen / 2;
  const lateral = ROAD_W / 2 + swW / 2;
  [-1, 1].forEach((s) => {
    [-lateral, lateral].forEach((l) => {
      addFlat(new THREE.PlaneGeometry(swW, spokeSwLen), sidewalkMat, l, s * spokeSwMid, 0.025);
      addFlat(new THREE.PlaneGeometry(spokeSwLen, swW), sidewalkMat, s * spokeSwMid, l, 0.025);
    });
  });

  // dashed centre lines (one instanced mesh)
  const dash = createInstancer(new THREE.PlaneGeometry(3.4, 0.32), lineMat, { cast: false });
  for (let t = -RING + 8; t <= RING - 8; t += 8) {
    [-RING, RING].forEach((c) => {
      dash.add(compose(t, 0.04, c, -Math.PI / 2));
      dash.add(compose(c, 0.04, t, -Math.PI / 2, 0, Math.PI / 2));
    });
  }
  for (let t = PLAZA_R + 4; t <= RING - 10; t += 8) {
    [-t, t].forEach((v) => {
      dash.add(compose(0, 0.04, v, -Math.PI / 2, 0, Math.PI / 2));
      dash.add(compose(v, 0.04, 0, -Math.PI / 2));
    });
  }
  // zebra crossings where spokes meet the ring
  const zebraAt = RING - ROAD_W / 2 - 3.5;
  for (let i = -2; i <= 2; i++) {
    const o = i * 2.2;
    dash.add(compose(o, 0.045, -zebraAt, -Math.PI / 2, 0, Math.PI / 2, 1.1, 2.4, 1));
    dash.add(compose(o, 0.045, zebraAt, -Math.PI / 2, 0, Math.PI / 2, 1.1, 2.4, 1));
    dash.add(compose(-zebraAt, 0.045, o, -Math.PI / 2, 0, 0, 1.1, 2.4, 1));
    dash.add(compose(zebraAt, 0.045, o, -Math.PI / 2, 0, 0, 1.1, 2.4, 1));
  }
  dash.build(scene).receiveShadow = true;

  // plaza
  addFlat(new THREE.CircleGeometry(PLAZA_R, 64), flatMat(COLORS.plaza), 0, 0, 0.035);
  addFlat(
    new THREE.RingGeometry(PLAZA_R - 0.9, PLAZA_R, 64),
    flatMat(COLORS.sidewalk),
    0,
    0,
    0.04,
  );
  addFlat(
    new THREE.RingGeometry(PLAZA_R - 6.5, PLAZA_R - 6.1, 64),
    new THREE.MeshBasicMaterial({ color: COLORS.line, transparent: true, opacity: 0.6 }),
    0,
    0,
    0.04,
  );

  // ------------------------------------------------------------------
  // Painted ground text: area labels + controls legend
  // ------------------------------------------------------------------
  const ink = "rgba(70, 66, 58, 0.78)";
  const paintLabel = (text, sub, x, z, w = 18) => {
    const tex = canvasTexture(1024, 256, (ctx, W, H) => {
      ctx.fillStyle = ink;
      ctx.textAlign = "center";
      ctx.font = "900 118px Arial, sans-serif";
      ctx.fillText(text, W / 2, 120);
      if (sub) {
        ctx.font = "600 46px Arial, sans-serif";
        ctx.fillText(sub, W / 2, 200);
      }
    });
    addFlat(
      new THREE.PlaneGeometry(w, w / 4),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }),
      x,
      z,
      0.06,
      Q,
    );
  };
  paintLabel("PLAYGROUND", "bowling · bricks · dominoes", -30, -30);
  paintLabel("PROJECTS", "drive onto a pad", 30, -24);
  paintLabel("JUMP PARK", "full speed ahead", -28, 30);
  paintLabel("STADIUM", "push the ball in the goal", 28, 28);

  const legendTex = canvasTexture(1024, 512, (ctx, W) => {
    const key = (x, y, w, label, h = 88) => {
      ctx.fillStyle = "rgba(255, 253, 247, 0.55)";
      roundRect(ctx, x, y, w, h, 16);
      ctx.fill();
      ctx.strokeStyle = ink;
      ctx.lineWidth = 6;
      roundRect(ctx, x, y, w, h, 16);
      ctx.stroke();
      ctx.fillStyle = ink;
      ctx.font = `900 ${label.length > 2 ? 34 : 50}px Arial, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, x + w / 2, y + h / 2 + 2);
    };
    const caption = (x, y, text) => {
      ctx.fillStyle = ink;
      ctx.font = "700 34px Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.fillText(text, x, y);
    };
    if (isMobile) {
      ctx.fillStyle = ink;
      ctx.font = "900 64px Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Use the buttons to drive", W / 2, 200);
      ctx.font = "700 40px Arial, sans-serif";
      ctx.fillText("⚡ boost  ·  ✋ drift  ·  📣 horn", W / 2, 290);
      return;
    }
    key(160, 70, 92, "↑");
    key(60, 170, 92, "←");
    key(160, 170, 92, "↓");
    key(260, 170, 92, "→");
    caption(206, 310, "DRIVE");
    key(420, 120, 170, "SHIFT");
    caption(505, 250, "BOOST");
    key(630, 120, 250, "SPACE");
    caption(755, 250, "DRIFT");
    key(60, 360, 88, "H");
    caption(200, 418, "HORN");
    key(300, 360, 88, "R");
    caption(446, 418, "RESET");
    key(560, 360, 88, "N");
    caption(698, 418, "NIGHT");
    key(790, 360, 88, "M");
    caption(930, 418, "MUTE");
  });
  addFlat(
    new THREE.PlaneGeometry(20, 10),
    new THREE.MeshBasicMaterial({ map: legendTex, transparent: true, depthWrite: false }),
    15,
    15,
    0.06,
    Q,
  );

  // ------------------------------------------------------------------
  // Boundary (invisible walls hidden in the forest)
  // ------------------------------------------------------------------
  physics.addStaticBox(0, 5, -BOUNDARY - 1, BOUNDARY * 2 + 4, 10, 2);
  physics.addStaticBox(0, 5, BOUNDARY + 1, BOUNDARY * 2 + 4, 10, 2);
  physics.addStaticBox(-BOUNDARY - 1, 5, 0, 2, 10, BOUNDARY * 2 + 4);
  physics.addStaticBox(BOUNDARY + 1, 5, 0, 2, 10, BOUNDARY * 2 + 4);

  // ------------------------------------------------------------------
  // Buildings (windows are two instanced meshes: some light up at night)
  // ------------------------------------------------------------------
  const windowGeo = new THREE.PlaneGeometry(1.5, 1.9);
  const windowDarkMat = matte(COLORS.window);
  const windowLitMat = matte(COLORS.window, { emissive: COLORS.windowLit, emissiveIntensity: 0 });
  const winDark = createInstancer(windowGeo, windowDarkMat, { cast: false });
  const winLit = createInstancer(windowGeo, windowLitMat, { cast: false });
  const roofBitMat = matte(0x8f8a80);

  BUILDINGS.forEach((b) => {
    const walls = new THREE.Mesh(
      new THREE.BoxGeometry(b.w, b.h, b.d),
      matte(COLORS.buildings[b.c % COLORS.buildings.length]),
    );
    walls.position.set(b.x, b.h / 2, b.z);
    walls.castShadow = true;
    walls.receiveShadow = true;
    scene.add(walls);

    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(b.w + 0.6, 0.6, b.d + 0.6),
      matte(COLORS.roofs[b.c % COLORS.roofs.length]),
    );
    roof.position.set(b.x, b.h + 0.3, b.z);
    roof.castShadow = true;
    scene.add(roof);

    // rooftop clutter: AC units / water tank
    const ac = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.2, 1.6), roofBitMat);
    ac.position.set(b.x - b.w * 0.2, b.h + 1.2, b.z + b.d * 0.15);
    ac.castShadow = true;
    scene.add(ac);
    if (b.h > 20) {
      const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 2.4, 10), matte(COLORS.wood));
      tank.position.set(b.x + b.w * 0.2, b.h + 2.6, b.z - b.d * 0.15);
      tank.castShadow = true;
      scene.add(tank);
    }

    // windows on all four faces
    const floors = Math.max(2, Math.floor(b.h / 4.5));
    const faces = [
      { len: b.w, off: b.d / 2 + 0.03, ry: 0, axis: "x" },
      { len: b.w, off: -b.d / 2 - 0.03, ry: Math.PI, axis: "x" },
      { len: b.d, off: b.w / 2 + 0.03, ry: Math.PI / 2, axis: "z" },
      { len: b.d, off: -b.w / 2 - 0.03, ry: -Math.PI / 2, axis: "z" },
    ];
    faces.forEach((f) => {
      const cols = Math.max(2, Math.floor(f.len / 4.2));
      for (let fl = 0; fl < floors; fl++) {
        for (let c = 0; c < cols; c++) {
          const along = -f.len / 2 + (c + 0.5) * (f.len / cols);
          const y = 2.6 + (fl * (b.h - 4)) / floors;
          const x = f.axis === "x" ? b.x + along : b.x + f.off;
          const z = f.axis === "x" ? b.z + f.off : b.z + along;
          (rng() < 0.55 ? winLit : winDark).add(compose(x, y, z, 0, f.ry, 0));
        }
      }
    });
    physics.addStaticBox(b.x, b.h / 2, b.z, b.w, b.h, b.d);
  });
  winDark.build(scene);
  night.windows = { mesh: winLit.build(scene), mat: windowLitMat };

  // ------------------------------------------------------------------
  // Trees, bushes, rocks, grass — instanced
  // ------------------------------------------------------------------
  const trunkMat = matte(COLORS.trunk);
  const trunkGeo = new THREE.CylinderGeometry(0.5, 0.8, 6, 7);
  const pineTrunkGeo = new THREE.CylinderGeometry(0.4, 0.6, 3, 7);
  const blobGeo = new THREE.IcosahedronGeometry(1, 1);
  const coneGeo = new THREE.ConeGeometry(1, 1, 8);
  const leafMat = windify(matte(0xffffff), 0.22, "whole");
  const pineMat = windify(matte(0xffffff), 0.14, "whole");
  const trunks = createInstancer(trunkGeo, trunkMat);
  const pineTrunks = createInstancer(pineTrunkGeo, trunkMat);
  const blobs = createInstancer(blobGeo, leafMat);
  const cones = createInstancer(coneGeo, pineMat);
  const leafColors = [COLORS.leaf, COLORS.leafDark, 0x86ad6e, 0x7a9d62];
  const pineColors = [COLORS.pine, 0x4f7c5a, 0x668f6b];

  const trees = [];
  const addLeafy = (x, z, s, collide = true) => {
    trunks.add(compose(x, 3 * s, z, 0, 0, 0, s));
    [
      [0, 7.5, 0, 3.2],
      [1.8, 6.3, 0.8, 2.2],
      [-1.6, 6.5, -0.9, 2.4],
    ].forEach(([bx, by, bz, r], i) => {
      blobs.add(
        compose(x + bx * s, by * s, z + bz * s, rng(), rng(), 0, r * s),
        leafColors[(i + Math.floor(rng() * 4)) % leafColors.length],
      );
    });
    if (collide) physics.addStaticCylinder(x, z, 0.9 * s, 6);
    trees.push({ x, z });
  };
  const addPine = (x, z, s, collide = true) => {
    pineTrunks.add(compose(x, 1.5 * s, z, 0, 0, 0, s));
    const color = pineColors[Math.floor(rng() * pineColors.length)];
    [
      [4, 3.0],
      [6.2, 2.3],
      [8.1, 1.5],
    ].forEach(([y, r]) => {
      cones.add(compose(x, y * s, z, 0, rng() * 3, 0, r * s, 3 * s, r * s), color);
    });
    if (collide) physics.addStaticCylinder(x, z, 0.8 * s, 6);
    trees.push({ x, z });
  };

  // hand-placed trees inside the ring
  [
    [-14, 36, 1.1, "leafy"],
    [-66, 40, 1.0, "pine"],
    [-20, 64, 1.2, "leafy"],
    [-68, -60, 1.1, "pine"],
    [-24, -64, 1.0, "leafy"],
    [-64, -48, 1.2, "leafy"],
    [64, -24, 1.0, "pine"],
    [64, -66, 1.2, "leafy"],
    [18, -66, 1.1, "pine"],
    [24, 38, 1.0, "leafy"],
    [30, 22, 0.9, "pine"],
    [66, 22, 1.1, "leafy"],
    [34, 68, 1.2, "pine"],
  ].forEach(([x, z, s, kind]) => (kind === "pine" ? addPine : addLeafy)(x, z, s));

  // forest band between the outer sidewalk and beyond the boundary
  let placed = 0;
  let guard = 0;
  const forestCount = isMobile ? 110 : 190;
  while (placed < forestCount && guard++ < 5000) {
    const x = (rng() - 0.5) * 2 * 128;
    const z = (rng() - 0.5) * 2 * 128;
    const m = Math.max(Math.abs(x), Math.abs(z));
    if (m < RING + ROAD_W / 2 + swW + 3) continue;
    if (!isClear(x, z, 2)) continue;
    if (trees.some((t) => Math.hypot(t.x - x, t.z - z) < 6.5)) continue;
    const s = 0.9 + rng() * 0.6;
    const inside = m < BOUNDARY - 1;
    (rng() < 0.55 ? addPine : addLeafy)(x, z, s, inside);
    placed++;
  }
  trunks.build(scene);
  pineTrunks.build(scene);
  blobs.build(scene);
  cones.build(scene);

  // bushes + rocks
  const bushes = createInstancer(new THREE.IcosahedronGeometry(1, 0), matte(COLORS.bush));
  const rocks = createInstancer(new THREE.DodecahedronGeometry(1, 0), matte(COLORS.rock));
  for (let i = 0; i < 70; i++) {
    const x = (rng() - 0.5) * 2 * 118;
    const z = (rng() - 0.5) * 2 * 118;
    if (onRoad(x, z, 2) || !isClear(x, z, 2)) continue;
    if (trees.some((t) => Math.hypot(t.x - x, t.z - z) < 3)) continue;
    const s = 0.8 + rng() * 1.4;
    if (i % 3 === 0) {
      rocks.add(compose(x, s * 0.45, z, rng() * 3, rng() * 3, rng() * 3, s, s * 0.8, s));
      if (Math.max(Math.abs(x), Math.abs(z)) < BOUNDARY) physics.addStaticSphere(x, 0, z, s * 0.9);
    } else {
      bushes.add(compose(x, s * 0.5, z, 0, rng() * 3, 0, s, s * 0.7, s));
    }
  }
  bushes.build(scene);
  rocks.build(scene);

  // grass tufts + flowers (visual only, sway in the wind)
  const tuftGeo = new THREE.ConeGeometry(0.28, 1.3, 3);
  tuftGeo.translate(0, 0.65, 0);
  const grass = createInstancer(tuftGeo, windify(matte(0xffffff), 0.28, "height"), {
    cast: false,
  });
  const flowerGeo = new THREE.IcosahedronGeometry(0.28, 0);
  flowerGeo.translate(0, 1.0, 0);
  const flowers = createInstancer(flowerGeo, windify(matte(0xffffff), 0.22, "height"), {
    cast: false,
  });
  const grassColors = [COLORS.grass, 0x86a070, 0xa3b88a, 0x7f9a6a];
  const flowerColors = [0xf5f2ea, 0xe2c14d, 0xe59a8a, 0xc9a0d6];
  const tuftTarget = isMobile ? 1100 : 2600;
  let tufts = 0;
  guard = 0;
  while (tufts < tuftTarget && guard++ < 30000) {
    // clumps: pick a centre, scatter a few blades around it
    const cx = (rng() - 0.5) * 2 * 120;
    const cz = (rng() - 0.5) * 2 * 120;
    if (onRoad(cx, cz, 1.5) || !isClear(cx, cz, 0)) continue;
    const n = 3 + Math.floor(rng() * 5);
    for (let i = 0; i < n; i++) {
      const x = cx + (rng() - 0.5) * 2.2;
      const z = cz + (rng() - 0.5) * 2.2;
      const s = 0.6 + rng() * 0.8;
      grass.add(
        compose(x, 0, z, (rng() - 0.5) * 0.4, rng() * 3, (rng() - 0.5) * 0.4, s, s * (0.7 + rng() * 0.6), s),
        grassColors[Math.floor(rng() * grassColors.length)],
      );
      tufts++;
    }
    if (rng() < 0.18) {
      flowers.add(compose(cx, 0, cz, 0, 0, 0, 1), flowerColors[Math.floor(rng() * flowerColors.length)]);
    }
  }
  grass.build(scene);
  flowers.build(scene);

  // ------------------------------------------------------------------
  // Street lamps (+ ground glow pools that fade in at night)
  // ------------------------------------------------------------------
  const poleMat = matte(COLORS.pole);
  const lampMat = matte(0xf3e9c8, { emissive: 0xffd98a, emissiveIntensity: 0.15 });
  night.lamps = lampMat;
  const glowTex = canvasTexture(128, 128, (ctx) => {
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, "rgba(255, 222, 150, 1)");
    g.addColorStop(0.5, "rgba(255, 210, 130, 0.35)");
    g.addColorStop(1, "rgba(255, 200, 120, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  });
  const glowMat = new THREE.MeshBasicMaterial({
    map: glowTex,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  night.glows.push(glowMat);
  const poleGeo = new THREE.CylinderGeometry(0.15, 0.22, 7, 7);
  const armGeo = new THREE.BoxGeometry(0.15, 0.15, 2);
  const bulbGeo = new THREE.SphereGeometry(0.38, 8, 6);
  const glowGeo = new THREE.PlaneGeometry(11, 11);
  LAMPS.forEach(({ x, z }) => {
    const lamp = new THREE.Group();
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.y = 3.5;
    pole.castShadow = true;
    lamp.add(pole);
    // arm reaches toward the nearest road centre line
    let best = null;
    [0, RING, -RING].forEach((c) => {
      if (!best || Math.abs(c - x) < Math.abs(best.d)) best = { axis: "x", d: c - x };
      if (Math.abs(c - z) < Math.abs(best.d)) best = { axis: "z", d: c - z };
    });
    const toRoad =
      best.axis === "x"
        ? new THREE.Vector2(Math.sign(best.d), 0)
        : new THREE.Vector2(0, Math.sign(best.d));
    const arm = new THREE.Mesh(armGeo, poleMat);
    arm.position.set(toRoad.x, 6.9, toRoad.y);
    arm.rotation.y = toRoad.x !== 0 ? Math.PI / 2 : 0;
    lamp.add(arm);
    const bulb = new THREE.Mesh(bulbGeo, lampMat);
    bulb.position.set(toRoad.x * 2, 6.75, toRoad.y * 2);
    lamp.add(bulb);
    lamp.position.set(x, 0, z);
    scene.add(lamp);
    addFlat(glowGeo, glowMat, x + toRoad.x * 2, z + toRoad.y * 2, 0.07);
    physics.addStaticCylinder(x, z, 0.35, 7);
  });

  // benches around the plaza
  const woodMat = matte(COLORS.wood);
  [0.35, 1.2, 2.6, 4.1, 5.3].forEach((a) => {
    const r = PLAZA_R - 2.5;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const bench = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.BoxGeometry(3, 0.2, 1), woodMat);
    seat.position.y = 0.8;
    seat.castShadow = true;
    bench.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(3, 0.9, 0.15), woodMat);
    back.position.set(0, 1.4, 0.45);
    back.castShadow = true;
    bench.add(back);
    [-1.3, 1.3].forEach((lx) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.8, 0.9), poleMat);
      leg.position.set(lx, 0.4, 0);
      bench.add(leg);
    });
    bench.position.set(x, 0, z);
    bench.rotation.y = -a - Math.PI / 2;
    scene.add(bench);
    physics.addStaticBox(x, 0.7, z, 3, 1.4, 1.2, -a - Math.PI / 2);
  });

  // ------------------------------------------------------------------
  // Fountain with animated spray
  // ------------------------------------------------------------------
  const stoneMat = matte(0xb5afa3);
  const fountain = new THREE.Group();
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(6, 6.5, 1, 18), stoneMat);
  basin.position.y = 0.5;
  basin.castShadow = true;
  basin.receiveShadow = true;
  fountain.add(basin);
  const waterMat = matte(0x7db4c9, { transparent: true, opacity: 0.85, shininess: 80 });
  const water = new THREE.Mesh(new THREE.CylinderGeometry(5.4, 5.4, 0.2, 18), waterMat);
  water.position.y = 1.0;
  fountain.add(water);
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.2, 3.2, 9), matte(0xc4beb2));
  column.position.y = 2.2;
  column.castShadow = true;
  fountain.add(column);
  const topBowl = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 1.6, 0.6, 11), stoneMat);
  topBowl.position.y = 3.9;
  topBowl.castShadow = true;
  fountain.add(topBowl);
  fountain.position.set(FOUNTAIN.x, 0, FOUNTAIN.z);
  scene.add(fountain);
  physics.addStaticCylinder(FOUNTAIN.x, FOUNTAIN.z, 6.5, 2.4);

  const DROPS = 90;
  const dropMat = new THREE.MeshBasicMaterial({ color: 0xcfe7f0, transparent: true, opacity: 0.85 });
  const drops = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.14, 0), dropMat, DROPS);
  const dropState = Array.from({ length: DROPS }, (_, i) => ({ t: i / DROPS, a: rng() * Math.PI * 2, s: 0.8 + rng() * 0.4 }));
  scene.add(drops);
  updaters.push((time, dt) => {
    water.scale.setScalar(1 + Math.sin(time * 2.2) * 0.012);
    dropState.forEach((d, i) => {
      d.t += dt * 0.55 * d.s;
      if (d.t > 1) {
        d.t -= 1;
        d.a = rng() * Math.PI * 2;
      }
      const r = d.t * 4.3;
      const y = 4.3 + d.t * 5.5 * d.s - d.t * d.t * 8.2;
      drops.setMatrixAt(
        i,
        compose(FOUNTAIN.x + Math.cos(d.a) * r, Math.max(1.05, y), FOUNTAIN.z + Math.sin(d.a) * r),
      );
    });
    drops.instanceMatrix.needsUpdate = true;
  });

  // ------------------------------------------------------------------
  // Stadium pitch + goals
  // ------------------------------------------------------------------
  const pitchTex = canvasTexture(1024, 740, (ctx, W, H) => {
    const stripes = 10;
    for (let i = 0; i < stripes; i++) {
      ctx.fillStyle = i % 2 ? "#a9bf8e" : "#b3c898";
      ctx.fillRect((i * W) / stripes, 0, W / stripes + 1, H);
    }
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.lineWidth = 8;
    const m = 20;
    ctx.strokeRect(m, m, W - 2 * m, H - 2 * m);
    ctx.beginPath();
    ctx.moveTo(W / 2, m);
    ctx.lineTo(W / 2, H - m);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, 95, 0, Math.PI * 2);
    ctx.stroke();
    const boxH = (GOAL.width / PITCH.d) * H * 1.6;
    ctx.strokeRect(m, H / 2 - boxH / 2, 120, boxH);
    ctx.strokeRect(W - m - 120, H / 2 - boxH / 2, 120, boxH);
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, 10, 0, Math.PI * 2);
    ctx.fill();
  });
  addFlat(
    new THREE.PlaneGeometry(PITCH.w, PITCH.d),
    new THREE.MeshPhongMaterial({ map: pitchTex, shininess: 0 }),
    PITCH.x,
    PITCH.z,
    0.03,
  );

  const postMat = matte(0xf5f2ea);
  const netTex = canvasTexture(128, 128, (ctx) => {
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = 3;
    for (let i = 0; i <= 128; i += 16) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 128);
      ctx.moveTo(0, i);
      ctx.lineTo(128, i);
      ctx.stroke();
    }
  });
  netTex.wrapS = netTex.wrapT = THREE.RepeatWrapping;
  const netMatFor = (w, h) => {
    const t = netTex.clone();
    t.needsUpdate = true;
    t.repeat.set(w / 1.2, h / 1.2);
    return new THREE.MeshBasicMaterial({
      map: t,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
  };
  [-1, 1].forEach((side) => {
    const lineX = PITCH.x + (side * PITCH.w) / 2;
    const backX = lineX + side * GOAL.depth;
    const g = new THREE.Group();
    const postGeo = new THREE.CylinderGeometry(0.22, 0.22, GOAL.height, 8);
    [-1, 1].forEach((s) => {
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.set(lineX, GOAL.height / 2, PITCH.z + (s * GOAL.width) / 2);
      post.castShadow = true;
      g.add(post);
      physics.addStaticCylinder(lineX, PITCH.z + (s * GOAL.width) / 2, 0.3, GOAL.height);
      // side net
      const sideNet = new THREE.Mesh(new THREE.PlaneGeometry(GOAL.depth, GOAL.height), netMatFor(GOAL.depth, GOAL.height));
      sideNet.position.set((lineX + backX) / 2, GOAL.height / 2, PITCH.z + (s * GOAL.width) / 2);
      g.add(sideNet);
      physics.addStaticBox((lineX + backX) / 2, GOAL.height / 2, PITCH.z + (s * (GOAL.width + 0.4)) / 2, GOAL.depth, GOAL.height, 0.4);
    });
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, GOAL.width, 8), postMat);
    bar.rotation.x = Math.PI / 2;
    bar.position.set(lineX, GOAL.height, PITCH.z);
    bar.castShadow = true;
    g.add(bar);
    physics.addStaticBox(lineX, GOAL.height, PITCH.z, 0.4, 0.4, GOAL.width);
    const backNet = new THREE.Mesh(new THREE.PlaneGeometry(GOAL.width, GOAL.height), netMatFor(GOAL.width, GOAL.height));
    backNet.rotation.y = Math.PI / 2;
    backNet.position.set(backX, GOAL.height / 2, PITCH.z);
    g.add(backNet);
    physics.addStaticBox(backX + side * 0.2, GOAL.height / 2, PITCH.z, 0.4, GOAL.height, GOAL.width);
    const topNet = new THREE.Mesh(new THREE.PlaneGeometry(GOAL.depth, GOAL.width), netMatFor(GOAL.depth, GOAL.width));
    topNet.rotation.x = -Math.PI / 2;
    topNet.position.set((lineX + backX) / 2, GOAL.height, PITCH.z);
    g.add(topNet);
    physics.addStaticBox((lineX + backX) / 2, GOAL.height + 0.2, PITCH.z, GOAL.depth, 0.4, GOAL.width);
    scene.add(g);
  });

  // ------------------------------------------------------------------
  // Bowling lane
  // ------------------------------------------------------------------
  const laneTex = canvasTexture(1024, 180, (ctx, W, H) => {
    ctx.fillStyle = "#d8c29a";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(160, 128, 80, 0.35)";
    ctx.lineWidth = 2;
    for (let y = 0; y < H; y += 18) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(180, 70, 50, 0.7)";
    for (let i = 0; i < 5; i++) {
      const x = W * 0.45;
      const y = H * (0.2 + i * 0.15);
      ctx.beginPath();
      ctx.moveTo(x - 30, y);
      ctx.lineTo(x, y - 12);
      ctx.lineTo(x, y + 12);
      ctx.fill();
    }
  });
  const laneLen = Math.abs(BOWLING.lane.x1 - BOWLING.lane.x0);
  addFlat(
    new THREE.PlaneGeometry(laneLen, BOWLING.lane.width),
    new THREE.MeshPhongMaterial({ map: laneTex, shininess: 20 }),
    (BOWLING.lane.x0 + BOWLING.lane.x1) / 2,
    BOWLING.lane.z,
    0.03,
  );
  // gutters (low curbs that keep the ball roughly on the lane)
  [-1, 1].forEach((s) => {
    const curb = new THREE.Mesh(new THREE.BoxGeometry(laneLen * 0.55, 0.4, 0.4), matte(0x9c9588));
    const cx = BOWLING.lane.x1 + laneLen * 0.275;
    const cz = BOWLING.lane.z + (s * (BOWLING.lane.width + 0.4)) / 2;
    curb.position.set(cx, 0.2, cz);
    curb.castShadow = true;
    scene.add(curb);
    physics.addStaticBox(cx, 0.2, cz, laneLen * 0.55, 0.4, 0.4);
  });

  // ------------------------------------------------------------------
  // Ramps + hoop
  // ------------------------------------------------------------------
  const rampMat = matte(COLORS.ramp);
  const stripeMat = new THREE.MeshBasicMaterial({ color: 0xf5f2ea });
  RAMPS.forEach((r) => {
    const mesh = new THREE.Mesh(prismGeometry(prismProfile(r), r.width), rampMat);
    mesh.position.set(r.x, 0, r.z);
    mesh.rotation.y = r.yaw;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    if (r.type === "ramp") {
      // white chevrons painted on the slope
      const slope = Math.atan2(r.h, r.len);
      for (let i = 0; i < 3; i++) {
        const t = -0.25 + i * 0.25;
        const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.5, r.width * 0.8), stripeMat);
        const lx = t * r.len;
        const ly = (r.h * (lx + r.len / 2)) / r.len + 0.03;
        stripe.position.set(lx, ly, 0);
        // lay flat, then tilt onto the slope
        stripe.quaternion.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)).premultiply(
          new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), slope),
        );
        mesh.add(stripe);
      }
    }
    physics.addRamp(r);
  });

  const hoopMat = matte(0xe2c14d, { emissive: 0xc9a227, emissiveIntensity: 0.35, shininess: 60 });
  const hoops = HOOPS.map((h) => {
    const mesh = new THREE.Mesh(new THREE.TorusGeometry(h.r, 0.32, 8, 40), hoopMat);
    mesh.position.set(h.x, h.y, h.z);
    mesh.rotation.y = h.yaw;
    mesh.castShadow = true;
    scene.add(mesh);
    return { ...h, mesh };
  });
  updaters.push((time) => {
    hoops.forEach((h, i) => {
      h.mesh.rotation.z = Math.sin(time * 0.8 + i) * 0.08;
      h.mesh.position.y = h.y + Math.sin(time * 1.3 + i) * 0.15;
    });
  });

  // ------------------------------------------------------------------
  // Project billboards + drive-in pads
  // ------------------------------------------------------------------
  const pads = PADS.map((p) => {
    const tex = canvasTexture(512, 512, (ctx, W, H) => {
      ctx.strokeStyle = p.kind === "link" ? "rgba(255,253,247,0.95)" : ink;
      ctx.lineWidth = 18;
      ctx.setLineDash([46, 26]);
      roundRect(ctx, 24, 24, W - 48, H - 48, 40);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = p.kind === "link" ? "rgba(255,253,247,0.95)" : ink;
      ctx.textAlign = "center";
      ctx.font = `900 ${p.title.length > 8 ? 58 : 76}px Arial, sans-serif`;
      ctx.fillText(p.title, W / 2, H / 2 + 6);
      ctx.font = "700 40px Arial, sans-serif";
      ctx.fillText(p.kind === "link" ? (isMobile ? "tap to open" : "ENTER ⏎") : "drive in", W / 2, H / 2 + 80);
    });
    const baseMat = new THREE.MeshBasicMaterial({
      color: p.kind === "link" ? new THREE.Color(p.color) : new THREE.Color(0xe2c14d),
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    const base = addFlat(new THREE.PlaneGeometry(p.size, p.size), baseMat, p.x, p.z, 0.05, Q);
    const labelMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
    addFlat(new THREE.PlaneGeometry(p.size, p.size), labelMat, p.x, p.z, 0.065, Q);

    if (p.kind === "link") {
      const bx = p.x - 5.5;
      const bz = p.z - 5.5;
      const boardTex = canvasTexture(1024, 600, (ctx, W, H) => {
        ctx.fillStyle = "#fffdf7";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = p.color;
        ctx.fillRect(0, 0, W, 90);
        ctx.fillStyle = "#46423a";
        ctx.textAlign = "center";
        ctx.font = "900 150px Arial, sans-serif";
        ctx.fillText(p.title, W / 2, 300);
        ctx.font = "600 56px Arial, sans-serif";
        ctx.fillStyle = "#6b675f";
        ctx.fillText(p.subtitle, W / 2, 400);
        ctx.font = "700 44px Arial, sans-serif";
        ctx.fillStyle = p.color;
        ctx.fillText("drive onto the pad ↓", W / 2, 520);
      });
      const frameMat = matte(0x5a564e);
      const board = new THREE.Mesh(new THREE.BoxGeometry(11, 6.4, 0.4), [
        frameMat,
        frameMat,
        frameMat,
        frameMat,
        new THREE.MeshPhongMaterial({ map: boardTex, shininess: 5 }),
        frameMat,
      ]);
      board.position.set(bx, 7, bz);
      board.rotation.y = Q;
      board.castShadow = true;
      scene.add(board);
      const postGeo = new THREE.BoxGeometry(0.45, 3.9, 0.45);
      [-4, 4].forEach((o) => {
        const px = bx + o * Math.cos(Q);
        const pz = bz - o * Math.sin(Q);
        const post = new THREE.Mesh(postGeo, frameMat);
        post.position.set(px, 1.95, pz);
        post.rotation.y = Q;
        post.castShadow = true;
        scene.add(post);
        physics.addStaticBox(px, 1.95, pz, 0.5, 3.9, 0.5, Q);
      });
    }
    night.pads.push(baseMat);
    return { ...p, baseMat, active: false };
  });

  // ------------------------------------------------------------------
  // Clouds drifting overhead
  // ------------------------------------------------------------------
  const cloudMat = matte(COLORS.cloud, { transparent: true, opacity: 0.95 });
  const cloudGeo = new THREE.IcosahedronGeometry(1, 0);
  const clouds = [];
  for (let i = 0; i < (isMobile ? 6 : 11); i++) {
    const cloud = new THREE.Group();
    const puffs = 3 + Math.floor(rng() * 4);
    for (let j = 0; j < puffs; j++) {
      const puff = new THREE.Mesh(cloudGeo, cloudMat);
      const s = 3 + rng() * 3.5;
      puff.scale.set(s, s * 0.7, s);
      puff.position.set(j * 3.6 - puffs * 1.8, rng() * 1.5, (rng() - 0.5) * 4);
      cloud.add(puff);
    }
    cloud.position.set((rng() - 0.5) * 300, 42 + rng() * 14, (rng() - 0.5) * 300);
    cloud.userData.speed = 1.5 + rng() * 2;
    scene.add(cloud);
    clouds.push(cloud);
  }
  updaters.push((time, dt) => {
    clouds.forEach((c) => {
      c.position.x += c.userData.speed * dt;
      if (c.position.x > 170) c.position.x = -170;
    });
  });

  // Stars for the night sky (hidden by day)
  const starGeo = new THREE.BufferGeometry();
  const starPos = [];
  for (let i = 0; i < 500; i++) {
    const theta = rng() * Math.PI * 2;
    const phi = rng() * Math.PI * 0.42;
    starPos.push(
      Math.sin(phi) * Math.cos(theta) * 420,
      Math.cos(phi) * 420,
      Math.sin(phi) * Math.sin(theta) * 420,
    );
  }
  starGeo.setAttribute("position", new THREE.Float32BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 2.2,
    sizeAttenuation: false,
    transparent: true,
    opacity: 0,
    fog: false,
    depthWrite: false,
  });
  const stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);
  night.stars = { points: stars, mat: starMat };

  const update = (time, dt) => updaters.forEach((u) => u(time, dt));

  return { update, pads, hoops, night, ground };
};
