import * as THREE from "three";
import {
  COLORS,
  NEON,
  ACCENTS,
  DISPLAY_FONT,
  matte,
  glow,
  outline,
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
  LAUNCH_PADS,
  COURSE,
  HOOPS,
  BUILDINGS,
  FOUNTAIN,
  BLACK_HOLE,
  EXIT_HOLE,
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
  // wire: an optional material drawn over the same instances (a glowing
  // wireframe on the facets)
  const build = (scene, wire = null) => {
    if (!matrices.length) return null;
    const mesh = new THREE.InstancedMesh(geometry, material, matrices.length);
    matrices.forEach((m, i) => {
      mesh.setMatrixAt(i, m);
      if (colors[i] !== undefined) mesh.setColorAt(i, new THREE.Color(colors[i]));
    });
    mesh.castShadow = cast;
    mesh.receiveShadow = receive;
    scene.add(mesh);
    if (wire) {
      const lines = new THREE.InstancedMesh(geometry, wire, matrices.length);
      matrices.forEach((m, i) => lines.setMatrixAt(i, m));
      scene.add(lines);
    }
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
    { x: DOMINOES.cx, z: DOMINOES.cz, r: 19 },
    { x: CRATES.x, z: CRATES.z, r: 7 },
    { x: BRICK_WALL.x, z: BRICK_WALL.z, w: BRICK_WALL.cols * 2 + 8, d: 10 },
    ...PADS.map((p) => ({ x: p.x, z: p.z, r: p.size * 0.8 + 3 })),
    ...PADS.filter((p) => p.kind === "link").map((p) => ({
      x: p.x - 5.5,
      z: p.z - 5.5,
      r: 7,
    })),
    ...LAUNCH_PADS.map((p) => ({ x: p.x, z: p.z, r: 7 })),
    ...BUILDINGS.map((b) => ({ x: b.x, z: b.z, w: b.w + 6, d: b.d + 6 })),
    { x: SPAWN.x, z: SPAWN.z, r: 10 },
    { x: BLACK_HOLE.x, z: BLACK_HOLE.z, r: BLACK_HOLE.pull + 2 },
    { x: EXIT_HOLE.x, z: EXIT_HOLE.z, r: 9 },
    ...CRYSTALS.map((c) => ({ x: c.x, z: c.z, r: 5 })),
  ];
  const isClear = (x, z, pad = 0) =>
    !keepOut.some((k) =>
      k.r !== undefined
        ? Math.hypot(x - k.x, z - k.z) < k.r + pad
        : Math.abs(x - k.x) < k.w / 2 + pad && Math.abs(z - k.z) < k.d / 2 + pad,
    );

  // ------------------------------------------------------------------
  // The floor of space: deep indigo, scattered with stars, a nebula
  // drifting under the middle, and space lanes where the roads were
  // ------------------------------------------------------------------
  // unlit, so the starlight doesn't wash it out
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.MeshBasicMaterial({ color: COLORS.ground }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const floorLayer = (tex, size, y, opacity = 1) => {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(size, size),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = y;
    scene.add(mesh);
    return mesh;
  };
  // star dust: a tile of tiny stars in a few colours, repeated
  const starRng = mulberry32(3);
  const starTex = canvasTexture(512, 512, (ctx, W, H) => {
    const tints = ["#ffffff", "#bff6ff", "#ffd6a0", "#e2ccff", "#9fe9ff", "#ffc2ec"];
    for (let i = 0; i < 300; i++) {
      const big = starRng() < 0.07;
      ctx.globalAlpha = 0.35 + starRng() * 0.65;
      ctx.fillStyle = tints[Math.floor(starRng() * tints.length)];
      ctx.beginPath();
      ctx.arc(starRng() * W, starRng() * H, big ? 2.4 : 0.6 + starRng() * 0.9, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  starTex.wrapS = starTex.wrapT = THREE.RepeatWrapping;
  starTex.repeat.set(900 / 48, 900 / 48);
  floorLayer(starTex, 900, 0.008);
  // the nebula: soft clouds of colour across the playable area
  const nebRng = mulberry32(11);
  const nebulaTex = canvasTexture(1024, 1024, (ctx, W, H) => {
    const tints = ["155, 107, 255", "255, 79, 216", "0, 191, 243", "42, 127, 255", "255, 122, 89", "111, 245, 238"];
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 34; i++) {
      const x = W * (0.08 + nebRng() * 0.84);
      const y = H * (0.08 + nebRng() * 0.84);
      const r = 90 + nebRng() * 260;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      const tint = tints[Math.floor(nebRng() * tints.length)];
      g.addColorStop(0, `rgba(${tint}, ${0.1 + nebRng() * 0.14})`);
      g.addColorStop(1, `rgba(${tint}, 0)`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }
  });
  floorLayer(nebulaTex, 300, 0.012, 0.5);

  const flatMat = (color) => new THREE.MeshPhongMaterial({ color, shininess: 0 });
  const addFlat = (geometry, material, x, z, y = 0.02, yaw = 0) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.set(-Math.PI / 2, 0, yaw);
    mesh.position.set(x, y, z);
    mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
  };

  // no roads in space: faint orbit rings round the docking platform, each
  // dotted with a few marker lights travelling along it
  const ORBITS = [
    { r: 48, color: NEON.violet, opacity: 0.32, speed: 0.05 },
    { r: 80, color: NEON.cyan, opacity: 0.28, speed: -0.035 },
    { r: 104, color: NEON.magenta, opacity: 0.2, speed: 0.025 },
  ];
  ORBITS.forEach((o) => {
    addFlat(
      new THREE.RingGeometry(o.r - 0.18, o.r + 0.18, 160),
      new THREE.MeshBasicMaterial({ color: o.color, transparent: true, opacity: o.opacity, depthWrite: false, blending: THREE.AdditiveBlending }),
      0,
      0,
      0.03,
    );
    const markers = new THREE.Group();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const dot = new THREE.Mesh(new THREE.CircleGeometry(0.55, 16), new THREE.MeshBasicMaterial({ color: o.color }));
      dot.rotation.x = -Math.PI / 2;
      dot.position.set(Math.cos(a) * o.r, 0.05, Math.sin(a) * o.r);
      markers.add(dot);
    }
    scene.add(markers);
    updaters.push((time, dt) => (markers.rotation.y += dt * o.speed));
  });

  // plaza
  // the middle: a docking platform
  addFlat(new THREE.CircleGeometry(PLAZA_R, 64), new THREE.MeshBasicMaterial({ color: COLORS.plaza }), 0, 0, 0.035);
  addFlat(
    new THREE.RingGeometry(PLAZA_R - 0.35, PLAZA_R, 64),
    new THREE.MeshBasicMaterial({ color: NEON.cyan, transparent: true, opacity: 0.55 }),
    0,
    0,
    0.04,
  );
  addFlat(
    new THREE.RingGeometry(PLAZA_R - 6.5, PLAZA_R - 6.1, 64),
    new THREE.MeshBasicMaterial({ color: NEON.magenta, transparent: true, opacity: 0.7 }),
    0,
    0,
    0.04,
  );

  // ------------------------------------------------------------------
  // Painted ground text: area labels + controls legend
  // ------------------------------------------------------------------
  const ink = "rgba(111, 245, 238, 0.85)";
  const inkDim = "rgba(111, 245, 238, 0.5)";
  const paintLabel = (text, sub, x, z, w = 18, tint = "111, 245, 238") => {
    const tex = canvasTexture(1024, 256, (ctx, W, H) => {
      ctx.fillStyle = `rgba(${tint}, 0.9)`;
      ctx.textAlign = "center";
      ctx.shadowColor = `rgba(${tint}, 0.9)`;
      ctx.shadowBlur = 18;
      ctx.font = `700 104px ${DISPLAY_FONT}`;
      ctx.fillText(text, W / 2, 120);
      if (sub) {
        ctx.shadowBlur = 0;
        ctx.fillStyle = `rgba(${tint}, 0.55)`;
        ctx.font = `600 40px ${DISPLAY_FONT}`;
        ctx.fillText(sub.toUpperCase(), W / 2, 200);
      }
    });
    addFlat(
      new THREE.PlaneGeometry(w, w / 4),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
      x,
      z,
      0.06,
      Q,
    );
  };
  paintLabel("CARGO BAY", "satellites · cargo · ring course", -30, -30, 18, "255, 179, 71");
  paintLabel("STAR PORTS", "fly onto a pad", 30, -24, 18, "0, 191, 243");
  paintLabel("LAUNCH ZONE", "fly onto a launch pad", -28, 30, 18, "157, 255, 107");
  paintLabel("ORBIT ARENA", "push the planet into a portal", 28, 28, 18, "255, 79, 216");
  paintLabel("EVENT HORIZON", "keep your distance", 78, 70, 18, "155, 107, 255");

  const legendTex = canvasTexture(1024, 512, (ctx, W) => {
    const key = (x, y, w, label, h = 88) => {
      ctx.fillStyle = "rgba(0, 191, 243, 0.12)";
      roundRect(ctx, x, y, w, h, 12);
      ctx.fill();
      ctx.strokeStyle = ink;
      ctx.lineWidth = 4;
      roundRect(ctx, x, y, w, h, 12);
      ctx.stroke();
      ctx.fillStyle = ink;
      ctx.font = `700 ${label.length > 2 ? 30 : 46}px ${DISPLAY_FONT}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, x + w / 2, y + h / 2 + 2);
    };
    const caption = (x, y, text) => {
      ctx.fillStyle = inkDim;
      ctx.font = `600 28px ${DISPLAY_FONT}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.fillText(text, x, y);
    };
    if (isMobile) {
      ctx.fillStyle = ink;
      ctx.font = `700 54px ${DISPLAY_FONT}`;
      ctx.textAlign = "center";
      ctx.fillText("USE THE BUTTONS TO FLY", W / 2, 200);
      ctx.fillStyle = inkDim;
      ctx.font = `600 34px ${DISPLAY_FONT}`;
      ctx.fillText("BOOST  ·  DRIFT  ·  HORN", W / 2, 290);
      return;
    }
    key(160, 70, 92, "↑");
    key(60, 170, 92, "←");
    key(160, 170, 92, "↓");
    key(260, 170, 92, "→");
    caption(206, 310, "FLY");
    key(420, 120, 170, "SHIFT");
    caption(505, 250, "BOOST");
    key(630, 120, 250, "SPACE");
    caption(755, 250, "DRIFT");
    key(120, 360, 88, "H");
    caption(270, 418, "HORN");
    key(410, 360, 88, "R");
    caption(565, 418, "RESET");
    key(700, 360, 88, "M");
    caption(850, 418, "MUTE");
  });
  addFlat(
    new THREE.PlaneGeometry(20, 10),
    new THREE.MeshBasicMaterial({ map: legendTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
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
  // Planets where the town's buildings stood (out past the ring, north and
  // west): banded gas giants with a soft glow, some ringed, some with moons
  // ------------------------------------------------------------------
  const PLANET_TINTS = [
    ["#ff7a59", "#ffd6a0", "#7a2a3a"],
    ["#9b6bff", "#ff4fd8", "#2a1a5a"],
    ["#00bff3", "#bff6ff", "#0a2a5a"],
    ["#ffb347", "#ff7a59", "#5a2a12"],
    ["#9dff6b", "#00bff3", "#123a2a"],
    ["#ff4fd8", "#9b6bff", "#4a123a"],
  ];
  const glowTexFor = (tint) =>
    canvasTexture(128, 128, (ctx) => {
      const g = ctx.createRadialGradient(64, 64, 20, 64, 64, 64);
      g.addColorStop(0, `${tint}cc`);
      g.addColorStop(0.45, `${tint}44`);
      g.addColorStop(1, `${tint}00`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 128, 128);
    });
  const planetMoons = [];
  const planets = [];
  const PLANET_NAMES = ["Corvax", "Nyxara", "Halcyon", "Ember-9", "Viridia", "Lumen", "Oberon", "Talos", "Quill"];
  BUILDINGS.forEach((b, i) => {
    const [base, band, deep] = PLANET_TINTS[b.c % PLANET_TINTS.length];
    const r = Math.max(6, Math.min(11, b.h * 0.34));
    const bandRng = mulberry32(100 + i);
    const tex = canvasTexture(512, 256, (ctx, W, H) => {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, deep);
      g.addColorStop(0.5, base);
      g.addColorStop(1, deep);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      // wavy bands of cloud
      for (let k = 0; k < 16; k++) {
        const y0 = bandRng() * H;
        const h = 4 + bandRng() * 22;
        const amp = 3 + bandRng() * 8;
        const freq = 1 + Math.floor(bandRng() * 4);
        ctx.globalAlpha = 0.2 + bandRng() * 0.45;
        ctx.fillStyle = bandRng() < 0.6 ? band : deep;
        ctx.beginPath();
        ctx.moveTo(0, y0);
        for (let x = 0; x <= W; x += 16) ctx.lineTo(x, y0 + Math.sin((x / W) * Math.PI * 2 * freq) * amp);
        for (let x = W; x >= 0; x -= 16) ctx.lineTo(x, y0 + h + Math.sin((x / W) * Math.PI * 2 * freq + 1) * amp);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    });
    const planet = new THREE.Mesh(
      new THREE.SphereGeometry(r, 40, 24),
      new THREE.MeshPhongMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.32, shininess: 12 }),
    );
    planet.position.set(b.x, r, b.z);
    planet.rotation.z = 0.25 - bandRng() * 0.5;
    planet.castShadow = true;
    scene.add(planet);
    updaters.push((time, dt) => (planet.rotation.y += dt * (0.05 + (i % 3) * 0.03 + (planets[i] ? planets[i].spin : 0))));
    // atmosphere
    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: glowTexFor(base), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    halo.scale.setScalar(r * 2.9);
    halo.position.copy(planet.position);
    scene.add(halo);
    planets.push({ name: PLANET_NAMES[i % PLANET_NAMES.length], x: b.x, z: b.z, r, mesh: planet, halo, color: base, spin: 0 });
    if (i % 2 === 0) {
      // a ring, banded from the inside out
      const ringTex = canvasTexture(256, 8, (ctx, W) => {
        for (let x = 0; x < W; x += 2) {
          ctx.globalAlpha = 0.15 + bandRng() * 0.6;
          ctx.fillStyle = bandRng() < 0.5 ? band : base;
          ctx.fillRect(x, 0, 2, 8);
        }
      });
      const ringGeo = new THREE.RingGeometry(r * 1.3, r * 2, 72, 1);
      // map the texture's x from the inner to the outer edge
      const pos = ringGeo.getAttribute("position");
      const uv = ringGeo.getAttribute("uv");
      for (let k = 0; k < pos.count; k++) {
        const d = Math.hypot(pos.getX(k), pos.getY(k));
        uv.setXY(k, (d - r * 1.3) / (r * 0.7), 0.5);
      }
      const ring = new THREE.Mesh(
        ringGeo,
        new THREE.MeshBasicMaterial({ map: ringTex, transparent: true, side: THREE.DoubleSide, depthWrite: false }),
      );
      ring.position.copy(planet.position);
      ring.rotation.set(-Math.PI / 2 + 0.45, 0.2, 0.3);
      scene.add(ring);
    } else {
      // a moon or two
      for (let m = 0; m < 1 + (i % 2); m++) {
        const moon = new THREE.Mesh(
          new THREE.SphereGeometry(r * (0.16 + m * 0.06), 16, 12),
          matte(m ? 0xd8d4ff : 0xbfc4d6, { emissive: 0x2a2a40 }),
        );
        scene.add(moon);
        planetMoons.push({ moon, cx: b.x, cy: r, cz: b.z, d: r * (1.7 + m * 0.5), speed: 0.4 + m * 0.25, phase: i + m * 2, tilt: 0.4 });
      }
    }
    physics.addStaticSphere(b.x, r, b.z, r);
  });
  updaters.push((time) => {
    planetMoons.forEach((m) => {
      const a = time * m.speed + m.phase;
      m.moon.position.set(m.cx + Math.cos(a) * m.d, m.cy + Math.sin(a) * m.d * m.tilt, m.cz + Math.sin(a) * m.d);
    });
  });

  // ------------------------------------------------------------------
  // Trees, bushes, rocks, grass — instanced
  // ------------------------------------------------------------------
  // asteroids (where the leafy trees were) and crystal spires (the pines)
  const rockGeo = new THREE.DodecahedronGeometry(1, 0);
  const shardGeo = new THREE.ConeGeometry(1, 1, 5);
  const wire = (color, opacity) =>
    new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity, depthWrite: false });
  const asteroids = createInstancer(rockGeo, matte(0xffffff, { emissive: 0x0a0818, shininess: 20 }));
  const shards = createInstancer(shardGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 }));
  const rockColors = [0x3a3450, 0x4a3c3a, 0x2e3a4c, 0x51405e, 0x3c3c48];

  const trees = [];
  const addLeafy = (x, z, s, collide = true) => {
    // a little cluster of rocks, hanging a few metres up
    [
      [0, 3.2, 0, 2.4],
      [1.9, 2.2, 1.1, 1.3],
      [-1.6, 2.6, -1.2, 1.1],
    ].forEach(([bx, by, bz, r]) => {
      asteroids.add(
        compose(x + bx * s, by * s + 1, z + bz * s, rng() * 3, rng() * 3, rng() * 3, r * s, r * s * (0.7 + rng() * 0.3), r * s),
        rockColors[Math.floor(rng() * rockColors.length)],
      );
    });
    if (collide) physics.addStaticCylinder(x, z, 2 * s, 6);
    trees.push({ x, z });
  };
  const addPine = (x, z, s, collide = true) => {
    // a cluster of glowing crystals growing out of the floor
    const color = ACCENTS[Math.floor(rng() * ACCENTS.length)];
    [
      [0, 0, 1.1, 6],
      [1.1, 0.6, 0.7, 3.6],
      [-0.9, -0.7, 0.6, 3],
      [0.3, -1.2, 0.5, 2.4],
    ].forEach(([bx, bz, r, h]) => {
      const lean = (rng() - 0.5) * 0.5;
      shards.add(compose(x + bx * s, (h * s) / 2, z + bz * s, lean, rng() * 3, -lean, r * s, h * s, r * s), color);
    });
    if (collide) physics.addStaticCylinder(x, z, 1.2 * s, 6);
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
    if (m < RING + ROAD_W / 2 + 5.5) continue;
    if (!isClear(x, z, 2)) continue;
    if (trees.some((t) => Math.hypot(t.x - x, t.z - z) < 6.5)) continue;
    const s = 0.9 + rng() * 0.6;
    const inside = m < BOUNDARY - 1;
    (rng() < 0.55 ? addPine : addLeafy)(x, z, s, inside);
    placed++;
  }
  asteroids.build(scene, wire(NEON.violet, 0.35));
  shards.build(scene, wire(0xffffff, 0.35));

  // bushes + rocks
  const bushes = createInstancer(new THREE.IcosahedronGeometry(1, 0), matte(0xffffff, { emissive: 0x0a0818 }));
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
      bushes.add(compose(x, s * 0.5 + 0.6, z, rng() * 3, rng() * 3, 0, s * 0.7, s * 0.6, s * 0.7), rockColors[Math.floor(rng() * rockColors.length)]);
    }
  }
  bushes.build(scene, wire(NEON.violet, 0.3));
  rocks.build(scene, wire(NEON.cyan, 0.3));

  // sparkles: little points of light hanging just above the floor
  const sparkGeo = new THREE.OctahedronGeometry(0.16, 0);
  const sparks = createInstancer(sparkGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }), { cast: false });
  const sparkColors = [...ACCENTS, 0xffffff, NEON.ice];
  const sparkTarget = isMobile ? 140 : 280;
  let sparkCount = 0;
  guard = 0;
  while (sparkCount < sparkTarget && guard++ < 20000) {
    const x = (rng() - 0.5) * 2 * 120;
    const z = (rng() - 0.5) * 2 * 120;
    if (onRoad(x, z, 1) || !isClear(x, z, 0)) continue;
    const s = 0.6 + rng() * 1.2;
    sparks.add(compose(x, 0.4 + rng() * 2.2, z, rng() * 3, rng() * 3, 0, s), sparkColors[Math.floor(rng() * sparkColors.length)]);
    sparkCount++;
  }
  const sparkMesh = sparks.build(scene);
  // a slow twinkle: the whole field breathes
  updaters.push((time) => {
    if (sparkMesh) sparkMesh.material.opacity = 0.7 + Math.sin(time * 2.3) * 0.3;
  });
  if (sparkMesh) sparkMesh.material.transparent = true;

  // ------------------------------------------------------------------
  // Beacons: lights floating along the orbit rings, each a lit core in a
  // spinning frame, in the accent colours, with a pool of light below
  // ------------------------------------------------------------------
  const glowTex = canvasTexture(128, 128, (ctx) => {
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, "rgba(255, 255, 255, 0.9)");
    g.addColorStop(0.5, "rgba(255, 255, 255, 0.28)");
    g.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  });
  const glowMats = ACCENTS.map(
    (c) =>
      new THREE.MeshBasicMaterial({ map: glowTex, color: c, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  const beaconCore = new THREE.OctahedronGeometry(0.55, 0);
  const beaconFrame = new THREE.OctahedronGeometry(1.1, 0);
  const glowGeo = new THREE.PlaneGeometry(10, 10);
  const beacons = [];
  [
    [48, 8, 0.2],
    [80, 12, 0.5],
  ].forEach(([r, n, offset]) => {
    for (let i = 0; i < n; i++) {
      const a = ((i + offset) / n) * Math.PI * 2;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (!isClear(x, z, -2)) continue;
      const k = beacons.length % ACCENTS.length;
      const group = new THREE.Group();
      group.position.set(x, 4.2, z);
      group.add(new THREE.Mesh(beaconCore, new THREE.MeshBasicMaterial({ color: ACCENTS[k] })));
      const frame = new THREE.Mesh(
        beaconFrame,
        new THREE.MeshBasicMaterial({ color: ACCENTS[k], wireframe: true, transparent: true, opacity: 0.7 }),
      );
      group.add(frame);
      scene.add(group);
      addFlat(glowGeo, glowMats[k], x, z, 0.07);
      beacons.push({ group, frame, phase: i * 0.8 });
    }
  });
  updaters.push((time, dt) => {
    beacons.forEach((b) => {
      b.frame.rotation.y += dt * 0.9;
      b.frame.rotation.x += dt * 0.4;
      b.group.position.y = 4.2 + Math.sin(time * 1.6 + b.phase) * 0.35;
    });
  });

  // ------------------------------------------------------------------
  // A small sun where the fountain was: a burning core, a corona, flares
  // looping off its surface and a ring of embers in orbit
  // ------------------------------------------------------------------
  const sunGroup = new THREE.Group();
  sunGroup.position.set(FOUNTAIN.x, 0, FOUNTAIN.z);
  scene.add(sunGroup);
  const sunTex = canvasTexture(256, 128, (ctx, W, H) => {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#ff7a2a");
    g.addColorStop(0.5, "#ffd36b");
    g.addColorStop(1, "#ff7a2a");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    const r = mulberry32(21);
    for (let i = 0; i < 260; i++) {
      ctx.globalAlpha = 0.15 + r() * 0.35;
      ctx.fillStyle = r() < 0.5 ? "#fff3c0" : "#ff5a1f";
      ctx.beginPath();
      ctx.arc(r() * W, r() * H, 2 + r() * 7, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  const core = new THREE.Mesh(new THREE.SphereGeometry(3.6, 32, 20), new THREE.MeshBasicMaterial({ map: sunTex }));
  core.position.y = 4.6;
  sunGroup.add(core);
  const corona = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: glowTexFor("#ffb347"), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  corona.scale.setScalar(17);
  corona.position.y = 4.6;
  sunGroup.add(corona);
  // the plinth it hovers over, and a pool of its light
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(6, 6.5, 0.6, 32), matte(0x14102a));
  plinth.position.y = 0.3;
  outline(plinth, NEON.amber, 0.8, 40);
  sunGroup.add(plinth);
  const sunPool = new THREE.Mesh(
    new THREE.PlaneGeometry(26, 26),
    new THREE.MeshBasicMaterial({ map: glowTex, color: NEON.amber, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  sunPool.rotation.x = -Math.PI / 2;
  sunPool.position.y = 0.66;
  sunGroup.add(sunPool);
  const sunLight = new THREE.PointLight(0xffb347, 2.2, 40, 1.4);
  sunLight.position.y = 4.6;
  sunGroup.add(sunLight);
  physics.addStaticCylinder(FOUNTAIN.x, FOUNTAIN.z, 6.5, 2.4);

  const EMBERS = 90;
  const emberMat = new THREE.MeshBasicMaterial({ color: 0xffd36b, transparent: true, opacity: 0.9 });
  const embers = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.16, 0), emberMat, EMBERS);
  const emberState = Array.from({ length: EMBERS }, (_, i) => ({
    a: rng() * Math.PI * 2,
    r: 5 + rng() * 3.5,
    y: 3.4 + (rng() - 0.5) * 2.2,
    speed: 0.3 + rng() * 0.5,
    flare: i < 24, // these loop off the surface instead
    t: rng(),
  }));
  scene.add(embers);
  updaters.push((time, dt) => {
    core.rotation.y += dt * 0.25;
    corona.scale.setScalar(17 + Math.sin(time * 1.7) * 0.8);
    emberState.forEach((e, i) => {
      let x;
      let y;
      let z;
      if (e.flare) {
        // an arc that leaves the surface and falls back
        e.t += dt * 0.35;
        if (e.t > 1) {
          e.t -= 1;
          e.a = rng() * Math.PI * 2;
        }
        const lift = Math.sin(e.t * Math.PI) * 2.6;
        const rr = 3.7 + lift;
        x = Math.cos(e.a + e.t * 0.8) * rr;
        z = Math.sin(e.a + e.t * 0.8) * rr;
        y = 4.6 + Math.sin(e.t * Math.PI) * 1.4;
      } else {
        e.a += dt * e.speed;
        x = Math.cos(e.a) * e.r;
        z = Math.sin(e.a) * e.r;
        y = e.y;
      }
      embers.setMatrixAt(i, compose(FOUNTAIN.x + x, y, FOUNTAIN.z + z));
    });
    embers.instanceMatrix.needsUpdate = true;
  });

  // ------------------------------------------------------------------
  // Orbit Arena (where the football pitch was): a field of light with a
  // wormhole at each end; push the planet ball through one
  // ------------------------------------------------------------------
  const arenaTex = canvasTexture(1024, 740, (ctx, W, H) => {
    ctx.strokeStyle = "rgba(255,79,216,0.85)";
    ctx.shadowColor = "rgba(255,79,216,1)";
    ctx.shadowBlur = 14;
    ctx.lineWidth = 6;
    roundRect(ctx, 24, 24, W - 48, H - 48, 160);
    ctx.stroke();
    // concentric orbits round the middle
    ctx.lineWidth = 3;
    [90, 170, 250].forEach((r, i) => {
      ctx.strokeStyle = `rgba(${i % 2 ? "155,107,255" : "255,79,216"}, ${0.55 - i * 0.12})`;
      ctx.beginPath();
      ctx.ellipse(W / 2, H / 2, r * 1.2, r, 0, 0, Math.PI * 2);
      ctx.stroke();
    });
    ctx.fillStyle = "rgba(255,79,216,0.9)";
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, 10, 0, Math.PI * 2);
    ctx.fill();
  });
  addFlat(
    new THREE.PlaneGeometry(PITCH.w, PITCH.d),
    new THREE.MeshBasicMaterial({ map: arenaTex, transparent: true, depthWrite: false }),
    PITCH.x,
    PITCH.z,
    0.03,
  );
  const swirlTex = canvasTexture(256, 256, (ctx, W, H) => {
    ctx.translate(W / 2, H / 2);
    for (let k = 0; k < 6; k++) {
      ctx.strokeStyle = k % 2 ? "rgba(255, 79, 216, 0.55)" : "rgba(155, 107, 255, 0.55)";
      ctx.lineWidth = 6;
      ctx.beginPath();
      for (let t = 0; t < 1; t += 0.02) {
        const a = t * Math.PI * 3 + (k * Math.PI) / 3;
        const rr = t * 120;
        ctx[t ? "lineTo" : "moveTo"](Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.stroke();
    }
  });
  const portalRing = (r, color) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.3, 10, 56), glow(color, 1.1, { shininess: 60 }));
    const swirl = new THREE.Mesh(
      new THREE.CircleGeometry(r - 0.2, 48),
      new THREE.MeshBasicMaterial({ map: swirlTex, transparent: true, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    ring.add(swirl);
    updaters.push((time, dt) => (swirl.rotation.z -= dt * 1.8));
    return ring;
  };
  // wormholes standing on each goal line, facing along the arena
  [-1, 1].forEach((side) => {
    const r = GOAL.width / 2;
    const wormhole = portalRing(r, side < 0 ? NEON.violet : NEON.magenta);
    wormhole.scale.y = GOAL.height / r;
    wormhole.position.set(PITCH.x + (side * PITCH.w) / 2 + side * 0.6, GOAL.height, PITCH.z);
    wormhole.rotation.y = Math.PI / 2;
    scene.add(wormhole);
  });

  // ------------------------------------------------------------------
  // Satellite swarm (where the bowling lane was): the comet starts at the
  // near end; the satellites hold a ring round the far end
  // ------------------------------------------------------------------
  const swarmTex = canvasTexture(256, 256, (ctx, W, H) => {
    ctx.strokeStyle = "rgba(255, 179, 71, 0.8)";
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 8]);
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, 118, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = "rgba(255, 179, 71, 0.35)";
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, 70, 0, Math.PI * 2);
    ctx.stroke();
  });
  addFlat(
    new THREE.PlaneGeometry(16, 16),
    new THREE.MeshBasicMaterial({ map: swarmTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
    BOWLING.apex.x,
    BOWLING.apex.z,
    0.05,
  );
  // a trail of light from the comet's start towards the swarm
  const trailTex = canvasTexture(512, 32, (ctx, W, H) => {
    const g = ctx.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, "rgba(255, 179, 71, 0)");
    g.addColorStop(1, "rgba(255, 179, 71, 0.5)");
    ctx.fillStyle = g;
    for (let x = 0; x < W; x += 40) ctx.fillRect(x, H / 2 - 3, 24, 6);
  });
  addFlat(
    new THREE.PlaneGeometry(Math.abs(BOWLING.apex.x - BOWLING.ball.x) - 6, 2),
    new THREE.MeshBasicMaterial({ map: trailTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
    (BOWLING.apex.x + 6 + BOWLING.ball.x) / 2,
    BOWLING.ball.z,
    0.05,
    Math.PI,
  );

  // ------------------------------------------------------------------
  // Launch pads (where the ramps were) and the portal ring to fly through
  // ------------------------------------------------------------------
  const launchTex = canvasTexture(256, 256, (ctx, W, H) => {
    const g = ctx.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, 128);
    g.addColorStop(0, "rgba(157, 255, 107, 0.55)");
    g.addColorStop(1, "rgba(157, 255, 107, 0.02)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, 124, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(157, 255, 107, 0.95)";
    ctx.lineWidth = 6;
    ctx.stroke();
    // chevrons pointing along +X
    ctx.fillStyle = "rgba(220, 255, 200, 0.95)";
    [-50, 0, 50].forEach((o) => {
      ctx.beginPath();
      ctx.moveTo(W / 2 + o + 26, H / 2);
      ctx.lineTo(W / 2 + o - 10, H / 2 - 34);
      ctx.lineTo(W / 2 + o - 10, H / 2 - 16);
      ctx.lineTo(W / 2 + o + 8, H / 2);
      ctx.lineTo(W / 2 + o - 10, H / 2 + 16);
      ctx.lineTo(W / 2 + o - 10, H / 2 + 34);
      ctx.closePath();
      ctx.fill();
    });
  });
  const launchPads = LAUNCH_PADS.map((pad) => {
    const mat = new THREE.MeshBasicMaterial({ map: launchTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const yaw = Math.atan2(-pad.dir[1], pad.dir[0]);
    const mesh = addFlat(new THREE.CircleGeometry(4, 40), mat, pad.x, pad.z, 0.06, yaw);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(4.2, 0.12, 6, 48), new THREE.MeshBasicMaterial({ color: NEON.lime }));
    ring.rotation.x = Math.PI / 2;
    ring.position.set(pad.x, 0.3, pad.z);
    scene.add(ring);
    updaters.push((time) => {
      ring.position.y = 0.3 + ((time * 1.2) % 1) * 2.4;
      ring.material.opacity = 1 - ((time * 1.2) % 1);
      ring.material.transparent = true;
    });
    return { ...pad, mesh };
  });

  // the portal ring in the launch zone
  const hoops = HOOPS.map((h) => {
    const mesh = portalRing(h.r, NEON.lime);
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
  // The ring course (where the dominoes were): rings standing in a spiral,
  // to fly through in order; the next one glows
  // ------------------------------------------------------------------
  const courseRings = COURSE.map((c, i) => {
    const mat = new THREE.MeshBasicMaterial({ color: NEON.violet, transparent: true, opacity: 0.55 });
    const mesh = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.22, 8, 40), mat);
    mesh.position.set(c.x, 3.2, c.z);
    // facing along the spiral, so you fly through it going round
    mesh.rotation.y = -c.a;
    scene.add(mesh);
    const label = canvasTexture(128, 128, (ctx, W, H) => {
      ctx.fillStyle = "rgba(220, 210, 255, 0.95)";
      ctx.font = `700 64px ${DISPLAY_FONT}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(i + 1), W / 2, H / 2 + 4);
    });
    const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: label, transparent: true, depthWrite: false }));
    tag.scale.setScalar(1.8);
    tag.position.set(c.x, 7.4, c.z);
    scene.add(tag);
    return { ...c, mesh, mat, r: 3.2, y: 3.2, yaw: -c.a };
  });

  // ------------------------------------------------------------------
  // Project billboards + drive-in pads
  // ------------------------------------------------------------------
  const PAD_TINTS = { software: "0, 191, 243", art: "255, 79, 216", journal: "255, 179, 71", about: "157, 255, 107" };
  const pads = PADS.map((p) => {
    const tint = PAD_TINTS[(p.title || "").toLowerCase()] || "111, 245, 238";
    const tintHex = new THREE.Color(`rgb(${tint})`);
    const tex = canvasTexture(512, 512, (ctx, W, H) => {
      ctx.strokeStyle = `rgba(${tint}, 0.9)`;
      ctx.shadowColor = `rgba(${tint}, 1)`;
      ctx.shadowBlur = 16;
      ctx.lineWidth = 10;
      // HUD corner brackets rather than a full frame
      const m = 30;
      const L = 110;
      [
        [m, m, 1, 1],
        [W - m, m, -1, 1],
        [m, H - m, 1, -1],
        [W - m, H - m, -1, -1],
      ].forEach(([x, y, dx, dy]) => {
        ctx.beginPath();
        ctx.moveTo(x, y + dy * L);
        ctx.lineTo(x, y);
        ctx.lineTo(x + dx * L, y);
        ctx.stroke();
      });
      ctx.fillStyle = `rgba(${tint}, 0.95)`;
      ctx.textAlign = "center";
      ctx.font = `700 ${p.title.length > 8 ? 50 : 66}px ${DISPLAY_FONT}`;
      ctx.fillText(p.title, W / 2, H / 2 + 6);
      ctx.shadowBlur = 0;
      ctx.fillStyle = `rgba(${tint}, 0.6)`;
      ctx.font = `600 32px ${DISPLAY_FONT}`;
      ctx.fillText(p.kind === "link" ? (isMobile ? "TAP TO OPEN" : "ENTER ⏎") : "FLY IN", W / 2, H / 2 + 80);
    });
    const baseMat = new THREE.MeshBasicMaterial({
      color: tintHex,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const base = addFlat(new THREE.PlaneGeometry(p.size, p.size), baseMat, p.x, p.z, 0.05, Q);
    const labelMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    addFlat(new THREE.PlaneGeometry(p.size, p.size), labelMat, p.x, p.z, 0.065, Q);

    if (p.kind === "link") {
      const bx = p.x - 5.5;
      const bz = p.z - 5.5;
      const boardTex = canvasTexture(1024, 600, (ctx, W, H) => {
        // a holo screen: dark glass, scan lines, a lit title
        const bg = ctx.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, "#071725");
        bg.addColorStop(1, "#03080f");
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = `rgba(${tint}, 0.05)`;
        for (let y = 0; y < H; y += 6) ctx.fillRect(0, y, W, 2);
        ctx.strokeStyle = `rgba(${tint}, 0.85)`;
        ctx.lineWidth = 6;
        ctx.strokeRect(14, 14, W - 28, H - 28);
        ctx.textAlign = "center";
        ctx.fillStyle = `rgba(${tint}, 0.9)`;
        ctx.font = `700 34px ${DISPLAY_FONT}`;
        ctx.fillText("· STAR PORT ·", W / 2, 120);
        ctx.shadowColor = `rgba(${tint}, 1)`;
        ctx.shadowBlur = 24;
        ctx.fillStyle = "#eafcff";
        ctx.font = `700 ${p.title.length > 6 ? 118 : 140}px ${DISPLAY_FONT}`;
        ctx.fillText(p.title, W / 2, 300);
        ctx.shadowBlur = 0;
        ctx.font = `500 46px ${DISPLAY_FONT}`;
        ctx.fillStyle = "rgba(204, 228, 236, 0.8)";
        ctx.fillText(p.subtitle, W / 2, 400);
        ctx.font = `700 36px ${DISPLAY_FONT}`;
        ctx.fillStyle = `rgba(${tint}, 0.95)`;
        ctx.fillText("FLY ONTO THE PAD ↓", W / 2, 520);
      });
      const frameMat = matte(0x0e1a28);
      const board = new THREE.Mesh(new THREE.BoxGeometry(11, 6.4, 0.4), [
        frameMat,
        frameMat,
        frameMat,
        frameMat,
        new THREE.MeshBasicMaterial({ map: boardTex }),
        frameMat,
      ]);
      board.position.set(bx, 7, bz);
      board.rotation.y = Q;
      board.castShadow = true;
      outline(board, tintHex.getHex(), 0.8);
      scene.add(board);
      // no legs: the screen floats, projected by a cone of light from a
      // small emitter on the floor
      const emitter = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, 0.3, 20), glow(tintHex.getHex(), 0.9));
      emitter.position.set(bx, 0.15, bz);
      scene.add(emitter);
      const projGeo = new THREE.CylinderGeometry(4.6, 0.6, 6, 4, 1, true);
      projGeo.translate(0, 3, 0);
      const projection = new THREE.Mesh(
        projGeo,
        new THREE.MeshBasicMaterial({ color: tintHex, transparent: true, opacity: 0.08, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }),
      );
      projection.position.set(bx, 0.3, bz);
      projection.rotation.y = Q + Math.PI / 4;
      projection.scale.z = 0.12;
      scene.add(projection);
      const phase = bx * 0.1;
      updaters.push((time) => {
        board.position.y = 7.4 + Math.sin(time * 1.1 + phase) * 0.3;
      });
    }
    night.pads.push(baseMat);
    return { ...p, baseMat, active: false };
  });

  // Stars
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
    color: NEON.ice,
    size: 2.2,
    sizeAttenuation: false,
    transparent: true,
    opacity: 0,
    fog: false,
    depthWrite: false,
  });
  const stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);

  // giants on the horizon: big, far away, beyond the fog
  [
    { x: -330, y: -40, z: -260, r: 90, tint: PLANET_TINTS[1] },
    { x: -120, y: -60, z: -380, r: 60, tint: PLANET_TINTS[3] },
    { x: -380, y: -30, z: 40, r: 50, tint: PLANET_TINTS[4] },
  ].forEach(({ x, y, z, r, tint }, i) => {
    const bandRng = mulberry32(500 + i);
    const tex = canvasTexture(256, 128, (ctx, W, H) => {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, tint[2]);
      g.addColorStop(0.5, tint[0]);
      g.addColorStop(1, tint[2]);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      for (let k = 0; k < 12; k++) {
        ctx.globalAlpha = 0.2 + bandRng() * 0.4;
        ctx.fillStyle = bandRng() < 0.5 ? tint[1] : tint[2];
        ctx.fillRect(0, bandRng() * H, W, 3 + bandRng() * 14);
      }
    });
    const giant = new THREE.Mesh(new THREE.SphereGeometry(r, 48, 32), new THREE.MeshBasicMaterial({ map: tex, fog: false }));
    giant.position.set(x, y, z);
    scene.add(giant);
    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: glowTexFor(tint[0]), transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }),
    );
    halo.scale.setScalar(r * 2.7);
    halo.position.copy(giant.position);
    scene.add(halo);
  });

  // shooting stars, now and then, across the far side of the map
  const streakGeo = new THREE.PlaneGeometry(14, 0.35);
  streakGeo.translate(-7, 0, 0);
  const streakTex = canvasTexture(256, 8, (ctx, W) => {
    const g = ctx.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, "rgba(255,255,255,0)");
    g.addColorStop(1, "rgba(255,255,255,1)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, 8);
  });
  const streaks = [0, 1, 2].map((k) => {
    const mesh = new THREE.Mesh(
      streakGeo,
      new THREE.MeshBasicMaterial({ map: streakTex, color: ACCENTS[k * 2], transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }),
    );
    scene.add(mesh);
    return { mesh, t: 1 + k * 2.3, vx: 0, vz: 0 };
  });
  updaters.push((time, dt) => {
    streaks.forEach((st) => {
      st.t += dt;
      if (st.t > 6) {
        st.t = 0;
        const a = -0.6 - rng() * 0.6;
        st.vx = Math.cos(a) * 70;
        st.vz = Math.sin(a) * 70;
        st.mesh.position.set(-140 + rng() * 160, 22 + rng() * 18, -40 + rng() * 80);
        st.mesh.rotation.set(Math.PI / 2, 0, -a);
      }
      st.mesh.position.x += st.vx * dt;
      st.mesh.position.z += st.vz * dt;
      st.mesh.material.opacity = st.t < 1.4 ? Math.sin((st.t / 1.4) * Math.PI) * 0.9 : 0;
    });
  });
  night.stars = { points: stars, mat: starMat };

  const update = (time, dt) => updaters.forEach((u) => u(time, dt));

  return { update, pads, hoops, launchPads, courseRings, planets, sun: { x: FOUNTAIN.x, z: FOUNTAIN.z, r: 4 }, night, ground };
};
