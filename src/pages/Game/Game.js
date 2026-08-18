import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";

const isMobile = () => {
  return (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    ) || window.innerWidth <= 768
  );
};

const TOTAL_CRYSTALS = 8;

const ArrowButton = ({ label, keyName, glyph, pressed, onStart, onEnd }) => (
  <div
    className="mobile-ctrl-btn"
    aria-label={label}
    style={{
      transform: pressed ? "scale(0.9)" : "scale(1)",
      background: pressed
        ? "linear-gradient(180deg, #e2c14d 0%, #d1a934 100%)"
        : "linear-gradient(180deg, #fffdf7 0%, #ece5d4 100%)",
      boxShadow: pressed
        ? "0 2px 6px rgba(70,66,58,0.35), inset 0 2px 4px rgba(0,0,0,0.15)"
        : "0 6px 14px rgba(70,66,58,0.3), inset 0 1px 0 rgba(255,255,255,0.6)",
    }}
    onTouchStart={(e) => {
      e.preventDefault();
      onStart(keyName);
    }}
    onTouchEnd={(e) => {
      e.preventDefault();
      onEnd(keyName);
    }}
    onTouchCancel={(e) => {
      e.preventDefault();
      onEnd(keyName);
    }}
    onMouseDown={() => onStart(keyName)}
    onMouseUp={() => onEnd(keyName)}
    onMouseLeave={() => onEnd(keyName)}
  >
    {glyph}
  </div>
);

// ---------------------------------------------------------------------------
// Palette — soft, matte, low-poly look. The background, fog and
// ground share one colour so the world has no visible horizon.
// ---------------------------------------------------------------------------
const COLORS = {
  world: 0xdcd8cf,
  road: 0xc7c2b6,
  sidewalk: 0xcfcabf,
  line: 0xefebe0,
  carBody: 0xe8581c,
  carDark: 0xb6430f,
  tire: 0x33312e,
  hub: 0xe5e0d6,
  glass: 0xaccfdd,
  buildings: [0xc9856a, 0x9db08a, 0x8a9bb0, 0xd3b98a, 0xc08a8a, 0x9fa68f],
  roofs: [0xa86a52, 0x7e9070, 0x6f8094, 0xb09a6e, 0xa17070, 0x848a76],
  window: 0x6e7b8a,
  trunk: 0x8a6a4c,
  leaf: 0x6fa06b,
  leafDark: 0x5d8d5c,
  pine: 0x5b8a66,
  bush: 0x7fae74,
  rock: 0xaaa49a,
  pole: 0x6b675f,
  wood: 0xb08a5a,
  ramp: 0xc9a36a,
  brick: 0xc96f4a,
  pin: 0xf5f2ea,
  pinStripe: 0xd14b3a,
  dust: 0xbfb8aa,
};

const CarGame = () => {
  const mountRef = useRef(null);
  const keysPressed = useRef({});
  const [loading, setLoading] = useState(true);
  const [score, setScore] = useState(0);
  const [gameWon, setGameWon] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [instructionsVisible, setInstructionsVisible] = useState(true);
  const [showInstructions, setShowInstructions] = useState(true);
  const [pressedButtons, setPressedButtons] = useState({});
  const animationIdRef = useRef(null);
  const fireworksRef = useRef([]);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setInstructionsVisible(false), 4500);
    const removeTimer = setTimeout(() => setShowInstructions(false), 5200);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  useEffect(() => {
    setIsMobileDevice(isMobile());
    if (!mountRef.current) return;

    // ------------------------------------------------------------------
    // Scene / camera / renderer
    // ------------------------------------------------------------------
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(COLORS.world);
    scene.fog = new THREE.Fog(COLORS.world, 70, 190);

    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
    camera.position.set(18, 21, 18);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current.appendChild(renderer.domElement);

    // ------------------------------------------------------------------
    // Lighting — bright, soft, matte
    // ------------------------------------------------------------------
    scene.add(new THREE.HemisphereLight(0xffffff, 0xc8c2b4, 0.75));

    const sun = new THREE.DirectionalLight(0xfff6e0, 0.85);
    sun.position.set(60, 110, 40);
    sun.castShadow = true;
    sun.shadow.camera.left = -120;
    sun.shadow.camera.right = 120;
    sun.shadow.camera.top = 120;
    sun.shadow.camera.bottom = -120;
    sun.shadow.camera.near = 0.1;
    sun.shadow.camera.far = 300;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    scene.add(sun);

    const matte = (color, extra = {}) =>
      new THREE.MeshPhongMaterial({
        color,
        shininess: 8,
        flatShading: true,
        ...extra,
      });

    // ------------------------------------------------------------------
    // COLLISION SYSTEM — explicit 2D footprints, independent of visuals
    // ------------------------------------------------------------------
    const colliders = []; // {x, z, hw, hd} = AABB footprint | {x, z, r} = circle

    const addBoxCollider = (x, z, width, depth) =>
      colliders.push({ x, z, hw: width / 2, hd: depth / 2 });
    const addCircleCollider = (x, z, r) => colliders.push({ x, z, r });

    const CAR_RADIUS = 2.1;

    const collidesAt = (x, z, radius = CAR_RADIUS) => {
      for (let i = 0; i < colliders.length; i++) {
        const c = colliders[i];
        if (c.r !== undefined) {
          const dx = x - c.x;
          const dz = z - c.z;
          const rr = radius + c.r;
          if (dx * dx + dz * dz < rr * rr) return true;
        } else {
          const px = Math.max(c.x - c.hw, Math.min(x, c.x + c.hw));
          const pz = Math.max(c.z - c.hd, Math.min(z, c.z + c.hd));
          const dx = x - px;
          const dz = z - pz;
          if (dx * dx + dz * dz < radius * radius) return true;
        }
      }
      return false;
    };

    // ------------------------------------------------------------------
    // Ground, road grid, sidewalks, markings
    // ------------------------------------------------------------------
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(600, 600),
      new THREE.MeshPhongMaterial({ color: COLORS.world, shininess: 0 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const roadMaterial = new THREE.MeshPhongMaterial({
      color: COLORS.road,
      shininess: 0,
    });
    const sidewalkMaterial = new THREE.MeshPhongMaterial({
      color: COLORS.sidewalk,
      shininess: 0,
    });
    const lineMaterial = new THREE.MeshBasicMaterial({ color: COLORS.line });

    const addFlat = (geometry, material, x, z, y = 0.02) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(x, y, z);
      mesh.receiveShadow = true;
      scene.add(mesh);
      return mesh;
    };

    const AVENUES = [0, -50, 50]; // z positions (east-west roads)
    const STREETS = [-45, 20, 75]; // x positions (north-south roads)
    const ROAD_HALF = 6;

    AVENUES.forEach((z) => {
      addFlat(new THREE.PlaneGeometry(190, 12), roadMaterial, 0, z);
    });
    STREETS.forEach((x) => {
      addFlat(new THREE.PlaneGeometry(12, 112), roadMaterial, x, 0);
    });

    const xEdges = [-95];
    STREETS.forEach((sx) => {
      xEdges.push(sx - ROAD_HALF - 0.5, sx + ROAD_HALF + 0.5);
    });
    xEdges.push(95);
    for (let i = 0; i < xEdges.length; i += 2) {
      const x0 = xEdges[i];
      const x1 = xEdges[i + 1];
      const segLength = x1 - x0;
      const segCenter = (x0 + x1) / 2;
      AVENUES.forEach((z) => {
        addFlat(
          new THREE.PlaneGeometry(segLength, 2.5),
          sidewalkMaterial,
          segCenter,
          z + 7.5,
          0.03,
        );
        addFlat(
          new THREE.PlaneGeometry(segLength, 2.5),
          sidewalkMaterial,
          segCenter,
          z - 7.5,
          0.03,
        );
      });
    }

    AVENUES.forEach((z) => {
      for (let x = -90; x <= 90; x += 8) {
        if (STREETS.some((sx) => Math.abs(x - sx) < 8)) continue;
        addFlat(new THREE.PlaneGeometry(3.5, 0.35), lineMaterial, x, z, 0.04);
      }
    });
    STREETS.forEach((x) => {
      for (let z = -54; z <= 54; z += 8) {
        if (AVENUES.some((az) => Math.abs(z - az) < 8)) continue;
        addFlat(new THREE.PlaneGeometry(0.35, 3.5), lineMaterial, x, z, 0.04);
      }
    });

    // ------------------------------------------------------------------
    // Instructions painted on the ground at spawn
    // ------------------------------------------------------------------
    const textCanvas = document.createElement("canvas");
    textCanvas.width = 1024;
    textCanvas.height = 256;
    const ctx = textCanvas.getContext("2d");
    ctx.fillStyle = "rgba(70, 66, 58, 0.85)";
    ctx.textAlign = "center";
    ctx.font = "900 110px Arial, sans-serif";
    ctx.fillText("MARCO LAVIELLE", 512, 110);
    ctx.font = "600 44px Arial, sans-serif";
    ctx.fillText(
      isMobile()
        ? "Use the on-screen buttons to drive"
        : "WASD / arrows to drive  —  R to reset",
      512,
      195,
    );
    const textTexture = new THREE.CanvasTexture(textCanvas);
    const groundText = new THREE.Mesh(
      new THREE.PlaneGeometry(34, 8.5),
      new THREE.MeshBasicMaterial({ map: textTexture, transparent: true }),
    );
    groundText.rotation.x = -Math.PI / 2;
    groundText.position.set(0, 0.05, 0);
    scene.add(groundText);

    // ------------------------------------------------------------------
    // The car — boxy low-poly jeep, built so physics can tilt it
    // ------------------------------------------------------------------
    const carGroup = new THREE.Group(); // moves + yaws
    const carBodyGroup = new THREE.Group(); // pitches + rolls (cosmetic)
    carGroup.add(carBodyGroup);

    const paint = matte(COLORS.carBody, { shininess: 30 });
    const darkPaint = matte(COLORS.carDark, { shininess: 30 });
    const glass = matte(COLORS.glass, {
      transparent: true,
      opacity: 0.75,
      shininess: 60,
    });
    const tireMat = matte(COLORS.tire);
    const hubMat = matte(COLORS.hub);

    const chassis = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.9, 2.3), paint);
    chassis.position.y = 1.0;
    chassis.castShadow = true;
    carBodyGroup.add(chassis);

    const hood = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.35, 2.1),
      darkPaint,
    );
    hood.position.set(1.5, 1.6, 0);
    hood.castShadow = true;
    carBodyGroup.add(hood);

    // Open jeep cabin: windshield frame + seats + roll bar
    const windshield = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 1.0, 2.0),
      glass,
    );
    windshield.position.set(0.7, 2.0, 0);
    windshield.rotation.z = -0.25;
    carBodyGroup.add(windshield);

    const seatMat = matte(0x4a443c);
    [-0.55, 0.55].forEach((z) => {
      const seat = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 0.8, 0.8),
        seatMat,
      );
      seat.position.set(-0.7, 1.8, z);
      seat.castShadow = true;
      carBodyGroup.add(seat);
    });

    const rollBar = new THREE.Mesh(
      new THREE.BoxGeometry(0.25, 1.1, 2.2),
      darkPaint,
    );
    rollBar.position.set(-1.6, 2.0, 0);
    rollBar.castShadow = true;
    carBodyGroup.add(rollBar);

    // Spare tire on the back
    const spareGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.35, 12);
    spareGeo.rotateZ(Math.PI / 2);
    const spare = new THREE.Mesh(spareGeo, tireMat);
    spare.position.set(-2.5, 1.4, 0);
    spare.castShadow = true;
    carBodyGroup.add(spare);

    // Bumpers + lights
    const bumperMat = matte(0x5a564e);
    [2.4, -2.4].forEach((x) => {
      const bumper = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.4, 2.35),
        bumperMat,
      );
      bumper.position.set(x, 0.8, 0);
      bumper.castShadow = true;
      carBodyGroup.add(bumper);
    });
    const headMat = matte(0xfff3c0, {
      emissive: 0xddc878,
      emissiveIntensity: 0.5,
    });
    const tailMat = matte(0xd14b3a, {
      emissive: 0x8a2418,
      emissiveIntensity: 0.5,
    });
    [0.8, -0.8].forEach((z) => {
      const head = new THREE.Mesh(
        new THREE.BoxGeometry(0.15, 0.3, 0.4),
        headMat,
      );
      head.position.set(2.32, 1.35, z);
      carBodyGroup.add(head);
      const tail = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.25, 0.4),
        tailMat,
      );
      tail.position.set(-2.32, 1.35, z);
      carBodyGroup.add(tail);
    });

    // Wheels: outer group steers (front only), inner group spins
    const wheelGeometry = new THREE.CylinderGeometry(0.62, 0.62, 0.45, 12);
    wheelGeometry.rotateX(Math.PI / 2);
    const hubGeometry = new THREE.CylinderGeometry(0.32, 0.32, 0.47, 8);
    hubGeometry.rotateX(Math.PI / 2);
    const spokeGeometry = new THREE.BoxGeometry(1.0, 0.14, 0.49);

    const wheels = [];
    [
      { x: 1.55, z: 1.15, front: true },
      { x: 1.55, z: -1.15, front: true },
      { x: -1.55, z: 1.15, front: false },
      { x: -1.55, z: -1.15, front: false },
    ].forEach((pos) => {
      const outer = new THREE.Group();
      const spin = new THREE.Group();
      const tire = new THREE.Mesh(wheelGeometry, tireMat);
      tire.castShadow = true;
      spin.add(tire);
      spin.add(new THREE.Mesh(hubGeometry, hubMat));
      spin.add(new THREE.Mesh(spokeGeometry, hubMat));
      outer.add(spin);
      outer.position.set(pos.x, 0.62, pos.z);
      carGroup.add(outer);
      wheels.push({ outer, spin, front: pos.front });
    });

    scene.add(carGroup);

    // ------------------------------------------------------------------
    // Car physics state
    // ------------------------------------------------------------------
    const car = {
      x: 0,
      z: 0,
      y: 0,
      vy: 0,
      heading: -Math.PI / 2, // forward = (sin(heading), cos(heading)); -X = up-screen for the fixed camera
      speed: 0, // signed: + forward, - reverse
      onGround: true,
      pitch: 0,
      roll: 0,
    };

    const PHYSICS = {
      accel: 0.024,
      revAccel: 0.014,
      maxSpeed: 1.05,
      maxReverse: 0.45,
      drag: 0.982,
      steer: 0.052,
      gravity: 0.016,
    };

    const resetCar = () => {
      car.x = 0;
      car.z = 0;
      car.y = 0;
      car.vy = 0;
      car.heading = -Math.PI / 2;
      car.speed = 0;
      car.onGround = true;
    };

    // ------------------------------------------------------------------
    // Ramps — drive up, fly off the end. Physics uses a ground-height
    // function; meshes are just wedges drawn to match it.
    // ------------------------------------------------------------------
    // dir = +1: you climb while moving toward +X; dir = -1: toward -X
    const ramps = [
      { x: 48, z: -14, len: 16, width: 9, h: 3.6, dir: 1 },
      { x: 0, z: 25, len: 18, width: 10, h: 4.4, dir: -1 },
    ];

    const groundHeightAt = (x, z) => {
      let h = 0;
      for (let i = 0; i < ramps.length; i++) {
        const r = ramps[i];
        const dx = (x - r.x) * r.dir;
        const dz = z - r.z;
        if (Math.abs(dz) < r.width / 2 && dx > -r.len / 2 && dx < r.len / 2) {
          h = Math.max(h, (r.h * (dx + r.len / 2)) / r.len);
        }
      }
      return h;
    };

    const rampMat = matte(COLORS.ramp);
    ramps.forEach((r) => {
      const shape = new THREE.Shape();
      shape.moveTo(-r.len / 2, 0);
      shape.lineTo(r.len / 2, 0);
      shape.lineTo(r.len / 2, r.h);
      shape.lineTo(-r.len / 2, 0);
      const geo = new THREE.ExtrudeGeometry(shape, {
        depth: r.width,
        bevelEnabled: false,
      });
      geo.translate(0, 0, -r.width / 2);
      const wedge = new THREE.Mesh(geo, rampMat);
      if (r.dir === -1) wedge.rotation.y = Math.PI;
      wedge.position.set(r.x, 0, r.z);
      wedge.castShadow = true;
      wedge.receiveShadow = true;
      scene.add(wedge);
    });

    // ------------------------------------------------------------------
    // Buildings — flat-shaded pastel blocks
    // ------------------------------------------------------------------
    const windowMat = matte(COLORS.window);
    const createBuilding = (x, z, w, h, d, colorIndex) => {
      const group = new THREE.Group();

      const walls = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        matte(COLORS.buildings[colorIndex % COLORS.buildings.length]),
      );
      walls.position.y = h / 2;
      walls.castShadow = true;
      walls.receiveShadow = true;
      group.add(walls);

      const roof = new THREE.Mesh(
        new THREE.BoxGeometry(w + 0.6, 0.6, d + 0.6),
        matte(COLORS.roofs[colorIndex % COLORS.roofs.length]),
      );
      roof.position.y = h + 0.3;
      roof.castShadow = true;
      group.add(roof);

      const floors = Math.max(2, Math.floor(h / 4.5));
      const cols = Math.max(2, Math.floor(w / 4.5));
      const winGeo = new THREE.PlaneGeometry(1.5, 1.9);
      for (let f = 0; f < floors; f++) {
        for (let c = 0; c < cols; c++) {
          const wx = -w / 2 + (c + 0.5) * (w / cols);
          const wy = 2.4 + (f * (h - 3.5)) / floors;
          const front = new THREE.Mesh(winGeo, windowMat);
          front.position.set(wx, wy, d / 2 + 0.02);
          group.add(front);
          const back = new THREE.Mesh(winGeo, windowMat);
          back.position.set(wx, wy, -d / 2 - 0.02);
          back.rotation.y = Math.PI;
          group.add(back);
        }
      }

      group.position.set(x, 0, z);
      scene.add(group);
      addBoxCollider(x, z, w, d);
    };

    createBuilding(-30, -25, 15, 22, 15, 0);
    createBuilding(45, 25, 18, 30, 16, 1);
    createBuilding(-68, 30, 20, 16, 20, 2);
    createBuilding(62, -30, 14, 26, 14, 3);
    createBuilding(-20, 30, 12, 18, 12, 4);
    createBuilding(38, -28, 12, 20, 12, 5);

    // ------------------------------------------------------------------
    // Trees, bushes, rocks (muted low-poly)
    // ------------------------------------------------------------------
    const trunkMat = matte(COLORS.trunk);
    const leafMat = matte(COLORS.leaf);
    const leafMatDark = matte(COLORS.leafDark);
    const pineMat = matte(COLORS.pine);

    const createLeafyTree = (x, z, scale = 1) => {
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5 * scale, 0.8 * scale, 6 * scale, 7),
        trunkMat,
      );
      trunk.position.y = 3 * scale;
      trunk.castShadow = true;
      tree.add(trunk);
      [
        { x: 0, y: 7.5, z: 0, r: 3.2, mat: leafMat },
        { x: 1.8, y: 6.3, z: 0.8, r: 2.2, mat: leafMatDark },
        { x: -1.6, y: 6.5, z: -0.9, r: 2.4, mat: leafMatDark },
      ].forEach((b) => {
        const leaves = new THREE.Mesh(
          new THREE.SphereGeometry(b.r * scale, 7, 6),
          b.mat,
        );
        leaves.position.set(b.x * scale, b.y * scale, b.z * scale);
        leaves.castShadow = true;
        tree.add(leaves);
      });
      tree.position.set(x, 0, z);
      scene.add(tree);
      addCircleCollider(x, z, 1.0 * scale);
    };

    const createPineTree = (x, z, scale = 1) => {
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.4 * scale, 0.6 * scale, 3 * scale, 7),
        trunkMat,
      );
      trunk.position.y = 1.5 * scale;
      trunk.castShadow = true;
      tree.add(trunk);
      [
        { y: 4, r: 3.0 },
        { y: 6.2, r: 2.3 },
        { y: 8.1, r: 1.5 },
      ].forEach((tier) => {
        const cone = new THREE.Mesh(
          new THREE.ConeGeometry(tier.r * scale, 3 * scale, 8),
          pineMat,
        );
        cone.position.y = tier.y * scale;
        cone.castShadow = true;
        tree.add(cone);
      });
      tree.position.set(x, 0, z);
      scene.add(tree);
      addCircleCollider(x, z, 0.9 * scale);
    };

    createLeafyTree(-15, 15, 1.1);
    createLeafyTree(30, -15, 1.0);
    createLeafyTree(88, 40, 1.3);
    createLeafyTree(8, 38, 0.9);
    createLeafyTree(-25, -12, 1.0);
    createLeafyTree(-60, -15, 1.2);
    createPineTree(-55, -40, 1.2);
    createPineTree(55, 12, 1.0);
    createPineTree(-12, -40, 1.1);
    createPineTree(33, 36, 1.0);
    createPineTree(88, -14, 1.3);
    createPineTree(-80, 12, 1.1);

    const bushMat = matte(COLORS.bush);
    [
      { x: -10, z: 12 },
      { x: 12, z: -12 },
      { x: 40, z: 12 },
      { x: -35, z: 12 },
      { x: 28, z: 35 },
      { x: -58, z: 40 },
      { x: 50, z: -14 },
      { x: -70, z: -30 },
    ].forEach((p, i) => {
      const r = 1 + (i % 3) * 0.4;
      const bush = new THREE.Mesh(new THREE.SphereGeometry(r, 7, 5), bushMat);
      bush.position.set(p.x, r * 0.6, p.z);
      bush.scale.y = 0.7;
      bush.castShadow = true;
      scene.add(bush);
      addCircleCollider(p.x, p.z, r * 0.8);
    });

    const rockMat = matte(COLORS.rock);
    [
      { x: -18, z: -63, s: 1.6 },
      { x: 52, z: 63, s: 2.2 },
      { x: 88, z: 18, s: 1.3 },
      { x: -75, z: 63, s: 1.8 },
      { x: 5, z: -66, s: 1.5 },
    ].forEach((p) => {
      const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(p.s, 0),
        rockMat,
      );
      rock.position.set(p.x, p.s * 0.5, p.z);
      rock.rotation.set(Math.random(), Math.random(), Math.random());
      rock.castShadow = true;
      scene.add(rock);
      addCircleCollider(p.x, p.z, p.s);
    });

    // ------------------------------------------------------------------
    // Lamps + benches
    // ------------------------------------------------------------------
    const poleMat = matte(COLORS.pole);
    const lampMat = matte(0xf3e9c8, {
      emissive: 0xc9b878,
      emissiveIntensity: 0.4,
    });
    [-75, -30, 0, 40, 85].forEach((x, i) => {
      const side = i % 2 === 0 ? 8.8 : -8.8;
      const lamp = new THREE.Group();
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.2, 7, 7),
        poleMat,
      );
      pole.position.y = 3.5;
      pole.castShadow = true;
      lamp.add(pole);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 2), poleMat);
      arm.position.set(0, 6.9, side > 0 ? -1 : 1);
      lamp.add(arm);
      const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.35, 8, 6),
        lampMat,
      );
      bulb.position.set(0, 6.8, side > 0 ? -2 : 2);
      lamp.add(bulb);
      lamp.position.set(x, 0, side);
      scene.add(lamp);
      addCircleCollider(x, side, 0.5);
    });

    const woodMat = matte(COLORS.wood);
    [-60, 0, 50].forEach((x) => {
      const bench = new THREE.Group();
      const seat = new THREE.Mesh(new THREE.BoxGeometry(3, 0.2, 1), woodMat);
      seat.position.y = 0.8;
      seat.castShadow = true;
      bench.add(seat);
      const back = new THREE.Mesh(new THREE.BoxGeometry(3, 0.9, 0.15), woodMat);
      back.position.set(0, 1.4, -0.45);
      back.castShadow = true;
      bench.add(back);
      [-1.3, 1.3].forEach((lx) => {
        const leg = new THREE.Mesh(
          new THREE.BoxGeometry(0.2, 0.8, 0.9),
          poleMat,
        );
        leg.position.set(lx, 0.4, 0);
        bench.add(leg);
      });
      bench.position.set(x, 0, 9.2);
      scene.add(bench);
      addBoxCollider(x, 9.2, 3, 1.2);
    });

    // ------------------------------------------------------------------
    // Fountain plaza
    // ------------------------------------------------------------------
    const fountain = new THREE.Group();
    const basin = new THREE.Mesh(
      new THREE.CylinderGeometry(6, 6.5, 1, 14),
      matte(0xb5afa3),
    );
    basin.position.y = 0.5;
    basin.castShadow = true;
    basin.receiveShadow = true;
    fountain.add(basin);
    const water = new THREE.Mesh(
      new THREE.CylinderGeometry(5.4, 5.4, 0.2, 14),
      matte(0x7db4c9, { transparent: true, opacity: 0.85, shininess: 60 }),
    );
    water.position.y = 1.0;
    fountain.add(water);
    const column = new THREE.Mesh(
      new THREE.CylinderGeometry(0.8, 1.2, 3.2, 9),
      matte(0xc4beb2),
    );
    column.position.y = 2.2;
    column.castShadow = true;
    fountain.add(column);
    const topBowl = new THREE.Mesh(
      new THREE.CylinderGeometry(2.2, 1.6, 0.6, 11),
      matte(0xb5afa3),
    );
    topBowl.position.y = 3.9;
    topBowl.castShadow = true;
    fountain.add(topBowl);
    fountain.position.set(-12, 0, -32);
    scene.add(fountain);
    addCircleCollider(-12, -32, 6.8);

    // ------------------------------------------------------------------
    // KNOCKABLES: bowling pins + a brick wall to smash through
    // ------------------------------------------------------------------
    const knockables = []; // shared car-contact handling

    // --- Bowling pins (triangle formation, pivot at base so they tip over)
    const pinMat = matte(COLORS.pin);
    const stripeMat = matte(COLORS.pinStripe);
    const pins = [];
    const PIN_BASE = { x: 2, z: -32 };
    const pinRows = [
      [{ dx: 0, dz: 0 }],
      [
        { dx: -1.1, dz: -1.8 },
        { dx: 1.1, dz: -1.8 },
      ],
      [
        { dx: -2.2, dz: -3.6 },
        { dx: 0, dz: -3.6 },
        { dx: 2.2, dz: -3.6 },
      ],
      [
        { dx: -3.3, dz: -5.4 },
        { dx: -1.1, dz: -5.4 },
        { dx: 1.1, dz: -5.4 },
        { dx: 3.3, dz: -5.4 },
      ],
    ];
    pinRows.flat().forEach((offset) => {
      const group = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.42, 1.7, 8),
        pinMat,
      );
      body.position.y = 0.85;
      body.castShadow = true;
      group.add(body);
      const neck = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), pinMat);
      neck.position.y = 1.85;
      neck.castShadow = true;
      group.add(neck);
      const stripe = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.33, 0.2, 8),
        stripeMat,
      );
      stripe.position.y = 1.45;
      group.add(stripe);

      const x = PIN_BASE.x + offset.dx;
      const z = PIN_BASE.z + offset.dz;
      group.position.set(x, 0, z);
      scene.add(group);

      const pin = {
        kind: "pin",
        group,
        homeX: x,
        homeZ: z,
        x,
        z,
        vx: 0,
        vz: 0,
        r: 0.55,
        tilt: 0,
        tiltVel: 0,
        axis: new THREE.Vector3(1, 0, 0),
      };
      pins.push(pin);
      knockables.push(pin);
    });

    // Bowling "lane" hint on the ground leading from the road to the pins
    addFlat(new THREE.PlaneGeometry(5, 18), sidewalkMaterial, 2, -19, 0.025);

    // --- Brick wall (frozen stack; wakes up and tumbles when rammed)
    const brickMat = matte(COLORS.brick);
    const brickGeo = new THREE.BoxGeometry(1.9, 0.95, 0.95);
    const bricks = [];
    const WALL = { x: 50, z: 38 };
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 5; col++) {
        const stagger = row % 2 === 0 ? 0 : 1.0;
        const bx = WALL.x - 4 + col * 2.0 + stagger;
        const by = 0.5 + row * 0.97;
        const mesh = new THREE.Mesh(brickGeo, brickMat);
        mesh.position.set(bx, by, WALL.z);
        mesh.castShadow = true;
        scene.add(mesh);
        const brick = {
          kind: "brick",
          mesh,
          x: bx,
          z: WALL.z,
          y: by,
          vx: 0,
          vy: 0,
          vz: 0,
          avx: 0,
          avy: 0,
          avz: 0,
          r: 1.0,
          awake: false,
        };
        bricks.push(brick);
        knockables.push(brick);
      }
    }

    const wakeBrick = (brick, dirX, dirZ, power) => {
      if (brick.awake) return;
      brick.awake = true;
      brick.vx = dirX * power * (0.8 + Math.random() * 0.5);
      brick.vz = dirZ * power * (0.8 + Math.random() * 0.5);
      brick.vy = 0.12 + Math.random() * 0.12 * power;
      brick.avx = (Math.random() - 0.5) * 0.25;
      brick.avy = (Math.random() - 0.5) * 0.25;
      brick.avz = (Math.random() - 0.5) * 0.25;
    };

    // ------------------------------------------------------------------
    // Dust particles behind the wheels
    // ------------------------------------------------------------------
    const dustPool = [];
    const dustGeo = new THREE.SphereGeometry(0.28, 5, 4);
    for (let i = 0; i < 36; i++) {
      const mesh = new THREE.Mesh(
        dustGeo,
        new THREE.MeshBasicMaterial({
          color: COLORS.dust,
          transparent: true,
          opacity: 0,
        }),
      );
      mesh.visible = false;
      scene.add(mesh);
      dustPool.push({ mesh, life: 0 });
    }
    let dustIndex = 0;
    const emitDust = (x, y, z) => {
      const d = dustPool[dustIndex];
      dustIndex = (dustIndex + 1) % dustPool.length;
      d.life = 1;
      d.mesh.visible = true;
      d.mesh.position.set(
        x + (Math.random() - 0.5) * 0.8,
        y + 0.2,
        z + (Math.random() - 0.5) * 0.8,
      );
      d.mesh.scale.setScalar(0.6 + Math.random() * 0.5);
    };

    // ------------------------------------------------------------------
    // Crystals — random spawn, validated against colliders + playground
    // ------------------------------------------------------------------
    const crystalExclusions = [
      { x: PIN_BASE.x, z: PIN_BASE.z - 3, r: 10 },
      { x: WALL.x, z: WALL.z, r: 10 },
      ...ramps.map((r) => ({ x: r.x, z: r.z, r: Math.max(r.len, r.width) })),
    ];

    const collectibles = [];
    const collectibleGeometry = new THREE.OctahedronGeometry(1, 0);
    const collectibleMaterial = new THREE.MeshPhongMaterial({
      color: 0xffd700,
      emissive: 0xc9a227,
      emissiveIntensity: 0.4,
      shininess: 80,
      flatShading: true,
    });
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xe2c14d,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
    });

    const collectiblePositions = [];
    let minSpacing = 30;
    let attempts = 0;
    while (collectiblePositions.length < TOTAL_CRYSTALS) {
      attempts++;
      if (attempts > 300) {
        attempts = 0;
        minSpacing = Math.max(8, minSpacing - 6);
      }
      const x = (Math.random() - 0.5) * 175;
      const z = (Math.random() - 0.5) * 175;
      if (Math.sqrt(x * x + z * z) < 18) continue;
      if (collidesAt(x, z, 3.5)) continue;
      if (
        crystalExclusions.some(
          (e) => Math.sqrt((e.x - x) ** 2 + (e.z - z) ** 2) < e.r,
        )
      )
        continue;
      if (
        collectiblePositions.some(
          (p) => Math.sqrt((p.x - x) ** 2 + (p.z - z) ** 2) < minSpacing,
        )
      )
        continue;
      collectiblePositions.push({ x, z });
    }

    collectiblePositions.forEach((pos, index) => {
      const collectible = new THREE.Mesh(
        collectibleGeometry,
        collectibleMaterial.clone(),
      );
      collectible.position.set(pos.x, 3, pos.z);
      collectible.castShadow = true;
      collectible.userData = { id: index, collected: false };
      collectibles.push(collectible);
      scene.add(collectible);

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(1.6, 2.4, 22),
        ringMat,
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(pos.x, 0.05, pos.z);
      collectible.userData.ring = ring;
      scene.add(ring);
    });

    // ------------------------------------------------------------------
    // Controls
    // ------------------------------------------------------------------
    const handleKeyDown = (event) => {
      keysPressed.current[event.key.toLowerCase()] = true;
    };
    const handleKeyUp = (event) => {
      keysPressed.current[event.key.toLowerCase()] = false;
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.simulateKeyPress = (key, pressed) => {
      keysPressed.current[key] = pressed;
    };

    // ------------------------------------------------------------------
    // Fireworks
    // ------------------------------------------------------------------
    const createFireworks = () => {
      for (let i = 0; i < 10; i++) {
        setTimeout(() => {
          const firework = { particles: [], life: 60 };
          const origin = new THREE.Vector3(
            car.x + (Math.random() - 0.5) * 50,
            Math.random() * 18 + 14,
            car.z + (Math.random() - 0.5) * 50,
          );
          for (let j = 0; j < 24; j++) {
            const particle = new THREE.Mesh(
              new THREE.SphereGeometry(0.25, 5, 5),
              new THREE.MeshBasicMaterial({
                color: new THREE.Color().setHSL(Math.random(), 0.9, 0.6),
                transparent: true,
              }),
            );
            particle.position.copy(origin);
            particle.userData.velocity = new THREE.Vector3(
              (Math.random() - 0.5) * 2,
              Math.random() * 2,
              (Math.random() - 0.5) * 2,
            );
            scene.add(particle);
            firework.particles.push(particle);
          }
          fireworksRef.current.push(firework);
        }, i * 300);
      }
    };

    const updateFireworks = () => {
      for (let i = fireworksRef.current.length - 1; i >= 0; i--) {
        const firework = fireworksRef.current[i];
        firework.life--;
        firework.particles.forEach((particle) => {
          particle.position.add(particle.userData.velocity);
          particle.userData.velocity.y -= 0.02;
          particle.material.opacity = Math.max(0, firework.life / 60);
        });
        if (firework.life <= 0) {
          firework.particles.forEach((particle) => {
            scene.remove(particle);
            particle.geometry.dispose();
            particle.material.dispose();
          });
          fireworksRef.current.splice(i, 1);
        }
      }
    };

    // ------------------------------------------------------------------
    // Animation loop
    // ------------------------------------------------------------------
    let frame = 0;

    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      frame++;

      const k = keysPressed.current;
      const throttle =
        k["arrowup"] || k["w"] ? 1 : k["arrowdown"] || k["s"] ? -1 : 0;
      const steer =
        (k["arrowleft"] || k["a"] ? 1 : 0) -
        (k["arrowright"] || k["d"] ? 1 : 0);
      if (k["r"]) resetCar();

      // --- longitudinal physics
      if (throttle > 0) car.speed += PHYSICS.accel;
      else if (throttle < 0) car.speed -= PHYSICS.revAccel;
      car.speed *= PHYSICS.drag;
      car.speed = Math.max(
        -PHYSICS.maxReverse,
        Math.min(PHYSICS.maxSpeed, car.speed),
      );
      if (Math.abs(car.speed) < 0.002 && throttle === 0) car.speed = 0;

      // --- steering scales with speed (no turning on the spot), flips in reverse
      const speedFactor = Math.max(-1, Math.min(1, car.speed / 0.45));
      if (car.onGround) car.heading += steer * PHYSICS.steer * speedFactor;

      const fwdX = Math.sin(car.heading);
      const fwdZ = Math.cos(car.heading);
      let moveX = fwdX * car.speed;
      let moveZ = fwdZ * car.speed;

      // --- horizontal collision (axis-separated so the car slides on walls)
      let newX = car.x + moveX;
      let newZ = car.z + moveZ;
      if (collidesAt(newX, newZ)) {
        if (!collidesAt(newX, car.z)) {
          newZ = car.z;
        } else if (!collidesAt(car.x, newZ)) {
          newX = car.x;
        } else {
          newX = car.x;
          newZ = car.z;
        }
        car.speed *= 0.4;
      }

      // --- ramps & vertical physics
      const newGround = groundHeightAt(newX, newZ);
      if (car.onGround && newGround - car.y > 0.9) {
        // Too tall to step onto (e.g. the cliff side of a ramp): treat as wall
        newX = car.x;
        newZ = car.z;
        car.speed *= 0.3;
      } else {
        const boundary = 95;
        newX = Math.max(-boundary, Math.min(boundary, newX));
        newZ = Math.max(-boundary, Math.min(boundary, newZ));
      }

      const groundH = groundHeightAt(newX, newZ);
      if (car.onGround) {
        if (groundH >= car.y - 0.3) {
          car.vy = groundH - car.y; // vertical speed from following the slope
          car.y = groundH;
        } else {
          car.onGround = false; // launched off a ramp edge, keep climbing vy
        }
      } else {
        car.vy -= PHYSICS.gravity;
        car.y += car.vy;
        if (car.y <= groundH) {
          car.y = groundH;
          car.vy = 0;
          car.onGround = true;
        }
      }

      car.x = newX;
      car.z = newZ;

      // --- cosmetic body tilt: pitch follows the slope/air, roll follows steering
      const hAhead = groundHeightAt(car.x + fwdX * 1.6, car.z + fwdZ * 1.6);
      const hBehind = groundHeightAt(car.x - fwdX * 1.6, car.z - fwdZ * 1.6);
      const targetPitch = car.onGround
        ? Math.atan2(hAhead - hBehind, 3.2)
        : Math.max(-0.35, car.vy * 0.6);
      const targetRoll = steer * speedFactor * 0.1;
      car.pitch += (targetPitch - car.pitch) * 0.15;
      car.roll += (targetRoll - car.roll) * 0.15;

      carGroup.position.set(car.x, car.y, car.z);
      // -PI/2 (not +PI/2): the model's nose is its local +X axis, and this
      // yaw maps local +X onto the physics forward vector (sin h, cos h),
      // so W drives nose-first and S reverses.
      carGroup.rotation.y = car.heading - Math.PI / 2;
      carBodyGroup.rotation.z = car.pitch;
      carBodyGroup.rotation.x = car.roll;

      // --- wheels: spin with speed, front pair steers
      wheels.forEach((wheel) => {
        wheel.spin.rotation.z -= car.speed * 1.7;
        if (wheel.front) {
          wheel.outer.rotation.y +=
            (steer * 0.45 - wheel.outer.rotation.y) * 0.25;
        }
      });

      // --- dust from the rear wheels
      if (car.onGround && Math.abs(car.speed) > 0.35 && frame % 3 === 0) {
        emitDust(car.x - fwdX * 2.2, car.y, car.z - fwdZ * 2.2);
      }
      dustPool.forEach((d) => {
        if (d.life > 0) {
          d.life -= 0.04;
          d.mesh.position.y += 0.03;
          d.mesh.scale.multiplyScalar(1.04);
          d.mesh.material.opacity = Math.max(0, d.life) * 0.5;
          if (d.life <= 0) d.mesh.visible = false;
        }
      });

      // --- knockables: car impacts
      const carSpeedMag = Math.abs(car.speed);
      knockables.forEach((obj) => {
        const dx = obj.x - car.x;
        const dz = obj.z - car.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < CAR_RADIUS + obj.r && carSpeedMag > 0.12) {
          const nx = dx / (dist || 1);
          const nz = dz / (dist || 1);
          const power = Math.max(carSpeedMag, 0.25);
          if (obj.kind === "pin") {
            obj.vx = nx * power * 1.1;
            obj.vz = nz * power * 1.1;
            if (obj.tiltVel === 0 && obj.tilt < 1.4) {
              obj.tiltVel = 0.1 + power * 0.1;
              obj.axis.set(nz, 0, -nx).normalize(); // tips away from the car
            }
          } else if (obj.kind === "brick") {
            wakeBrick(obj, nx, nz, power);
            // bricks resting above/near this one come down too
            bricks.forEach((other) => {
              if (
                !other.awake &&
                Math.abs(other.x - obj.x) < 2.2 &&
                other.y > obj.y
              ) {
                wakeBrick(other, nx, nz, power * 0.7);
              }
            });
          }
          car.speed *= 0.85; // ramming costs a little momentum
        }
      });

      // --- pins: slide, tip over, knock each other
      pins.forEach((pin) => {
        pin.x += pin.vx;
        pin.z += pin.vz;
        pin.vx *= 0.92;
        pin.vz *= 0.92;
        if (pin.tiltVel > 0) {
          pin.tilt += pin.tiltVel;
          if (pin.tilt >= 1.45) {
            pin.tilt = 1.45;
            pin.tiltVel = 0;
          }
        }
        pin.group.position.set(pin.x, 0, pin.z);
        pin.group.setRotationFromAxisAngle(pin.axis, pin.tilt);
      });
      for (let i = 0; i < pins.length; i++) {
        for (let j = i + 1; j < pins.length; j++) {
          const a = pins[i];
          const b = pins[j];
          const dx = b.x - a.x;
          const dz = b.z - a.z;
          const d2 = dx * dx + dz * dz;
          if (d2 < 1.21 && d2 > 0.0001) {
            const d = Math.sqrt(d2);
            const nx = dx / d;
            const nz = dz / d;
            const overlap = (1.1 - d) / 2;
            a.x -= nx * overlap;
            a.z -= nz * overlap;
            b.x += nx * overlap;
            b.z += nz * overlap;
            const aSpeed = Math.sqrt(a.vx * a.vx + a.vz * a.vz);
            const bSpeed = Math.sqrt(b.vx * b.vx + b.vz * b.vz);
            if (aSpeed > 0.08 && b.tiltVel === 0 && b.tilt < 1.4) {
              b.vx += nx * aSpeed * 0.6;
              b.vz += nz * aSpeed * 0.6;
              b.tiltVel = 0.08;
              b.axis.set(nz, 0, -nx).normalize();
            }
            if (bSpeed > 0.08 && a.tiltVel === 0 && a.tilt < 1.4) {
              a.vx -= nx * bSpeed * 0.6;
              a.vz -= nz * bSpeed * 0.6;
              a.tiltVel = 0.08;
              a.axis.set(-nz, 0, nx).normalize();
            }
          }
        }
      }

      // --- bricks: tumble, fall, settle
      bricks.forEach((brick) => {
        if (!brick.awake) return;
        brick.vy -= 0.02;
        brick.x += brick.vx;
        brick.z += brick.vz;
        brick.y += brick.vy;
        if (brick.y < 0.5) {
          brick.y = 0.5;
          brick.vy *= -0.2;
          brick.vx *= 0.7;
          brick.vz *= 0.7;
          brick.avx *= 0.6;
          brick.avy *= 0.6;
          brick.avz *= 0.6;
        }
        brick.mesh.position.set(brick.x, brick.y, brick.z);
        brick.mesh.rotation.x += brick.avx;
        brick.mesh.rotation.y += brick.avy;
        brick.mesh.rotation.z += brick.avz;
      });

      // --- fixed-angle camera (doesn't rotate with the car), zooms with speed
      const zoom = 1 + Math.min(carSpeedMag / PHYSICS.maxSpeed, 1) * 0.35;
      const camTarget = new THREE.Vector3(
        car.x + 18 * zoom,
        car.y + 21 * zoom,
        car.z + 18 * zoom,
      );
      camera.position.lerp(camTarget, 0.08);
      camera.lookAt(car.x, car.y + 1.5, car.z);

      // --- crystals: spin, bob, collect
      collectibles.forEach((collectible, index) => {
        if (!collectible.userData.collected && collectible.parent) {
          collectible.rotation.y += 0.02;
          collectible.position.y =
            3 + Math.sin(Date.now() * 0.001 + index) * 0.5;
          if (collectible.userData.ring) {
            const pulse = 1 + Math.sin(Date.now() * 0.003 + index) * 0.12;
            collectible.userData.ring.scale.set(pulse, pulse, 1);
          }

          const dx = collectible.position.x - car.x;
          const dz = collectible.position.z - car.z;
          if (Math.sqrt(dx * dx + dz * dz) < 3.2) {
            collectible.userData.collected = true;
            collectible.material.emissiveIntensity = 1;

            setScore((prevScore) => {
              const newScore = prevScore + 1;
              if (newScore === TOTAL_CRYSTALS) {
                setGameWon(true);
                setTimeout(() => {
                  createFireworks();
                }, 100);
                setTimeout(() => {
                  window.location.href = "/";
                }, 6000);
              }
              return newScore;
            });

            setTimeout(() => {
              if (collectible.parent) scene.remove(collectible);
              if (
                collectible.userData.ring &&
                collectible.userData.ring.parent
              ) {
                scene.remove(collectible.userData.ring);
              }
            }, 100);
          }
        }
      });

      updateFireworks();
      renderer.render(scene, camera);
    };

    setLoading(false);
    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("resize", handleResize);
      delete window.simulateKeyPress;
      if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      textTexture.dispose();
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material))
            obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
      });
      renderer.dispose();
    };
  }, []);

  const handleTouchStart = (key) => {
    if (window.simulateKeyPress) window.simulateKeyPress(key, true);
    setPressedButtons((prev) => ({ ...prev, [key]: true }));
  };
  const handleTouchEnd = (key) => {
    if (window.simulateKeyPress) window.simulateKeyPress(key, false);
    setPressedButtons((prev) => ({ ...prev, [key]: false }));
  };

  return (
    <div
      className="cargame-root"
      style={{
        position: isMobileDevice ? "fixed" : "relative",
        top: isMobileDevice ? "0" : "auto",
        left: isMobileDevice ? "0" : "auto",
        width: "100vw",
        overflow: "hidden",
        zIndex: isMobileDevice ? 999 : "auto",
      }}
    >
      <div ref={mountRef} style={{ width: "100%", height: "100%" }} />

      {loading && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            color: "#55514a",
            fontSize: "24px",
            fontFamily: "Arial, sans-serif",
          }}
        >
          Loading...
        </div>
      )}

      {showInstructions && (
        <div
          style={{
            position: "absolute",
            top: isMobileDevice ? "16px" : "24px",
            left: "50%",
            transform: `translateX(-50%) translateY(${
              instructionsVisible ? "0" : "-14px"
            })`,
            opacity: instructionsVisible ? 1 : 0,
            transition: "opacity 0.6s ease, transform 0.6s ease",
            pointerEvents: "none",
            color: "#46423a",
            fontFamily: "Arial, sans-serif",
            fontSize: isMobileDevice ? "13px" : "15px",
            background: "rgba(255,253,247,0.92)",
            backdropFilter: "blur(6px)",
            padding: isMobileDevice ? "14px 18px" : "18px 26px",
            borderRadius: "18px",
            border: "1px solid rgba(70,66,58,0.12)",
            boxShadow: "0 10px 30px rgba(70,66,58,0.22)",
            lineHeight: 1.5,
            textAlign: "center",
            maxWidth: isMobileDevice ? "88vw" : "480px",
          }}
        >
          <h3 style={{ margin: "0 0 8px 0", fontSize: isMobileDevice ? "17px" : "20px" }}>
            🚙 Drive Around!
          </h3>
          <p style={{ margin: "4px 0" }}>
            {isMobileDevice
              ? "Use the on-screen buttons to drive"
              : "WASD / arrows to drive · R to reset"}
          </p>
          <p style={{ margin: "4px 0" }}>
            Collect crystals — and feel free to smash the pins, the brick
            wall, and hit the ramps!
          </p>
        </div>
      )}

      <div
        style={{
          position: "absolute",
          top: isMobileDevice ? "16px" : "20px",
          left: isMobileDevice ? "16px" : "20px",
          opacity: showInstructions && instructionsVisible ? 0 : 1,
          transform: `translateY(${
            showInstructions && instructionsVisible ? "-8px" : "0"
          })`,
          transition: "opacity 0.6s ease 0.15s, transform 0.6s ease 0.15s",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          color: "#46423a",
          fontFamily: "Arial, sans-serif",
          fontWeight: "bold",
          fontSize: isMobileDevice ? "15px" : "17px",
          background: "rgba(255,253,247,0.92)",
          padding: isMobileDevice ? "8px 14px" : "10px 18px",
          borderRadius: "999px",
          border: "1px solid rgba(70,66,58,0.12)",
          boxShadow: "0 4px 14px rgba(70,66,58,0.18)",
        }}
      >
        <span style={{ fontSize: isMobileDevice ? "18px" : "20px" }}>💎</span>
        {score}/{TOTAL_CRYSTALS}
      </div>

      {gameWon && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            color: "#46423a",
            fontSize: isMobileDevice ? "28px" : "48px",
            fontFamily: "Arial, sans-serif",
            textAlign: "center",
            backgroundColor: "rgba(255,255,255,0.92)",
            padding: isMobileDevice ? "20px 15px" : "30px 40px",
            borderRadius: "20px",
            border: "3px solid #e2c14d",
            boxShadow: "0 8px 30px rgba(70,66,58,0.25)",
            zIndex: 1000,
            animation: "pulse 1s infinite",
            maxWidth: isMobileDevice ? "90vw" : "auto",
            boxSizing: "border-box",
            whiteSpace: isMobileDevice ? "nowrap" : "normal",
          }}
        >
          🎉 YOU WIN! 🎉
          <div
            style={{
              fontSize: isMobileDevice ? "16px" : "24px",
              marginTop: isMobileDevice ? "10px" : "20px",
              whiteSpace: "normal",
            }}
          >
            Returning to homepage...
          </div>
        </div>
      )}

      <style>{`
        .cargame-root {
          height: 100vh;
          height: 100dvh;
        }
        @keyframes pulse {
          0% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-50%, -50%) scale(1.05); }
          100% { transform: translate(-50%, -50%) scale(1); }
        }
        .mobile-ctrl-btn {
          width: 66px;
          height: 66px;
          border-radius: 18px;
          border: 1px solid rgba(70,66,58,0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 30px;
          font-weight: 900;
          color: #55514a;
          user-select: none;
          -webkit-user-select: none;
          touch-action: none;
          cursor: pointer;
          transition: transform 0.08s ease, background 0.08s ease, box-shadow 0.08s ease;
        }
        .mobile-ctrl-cluster {
          position: fixed;
          display: flex;
          gap: 12px;
          z-index: 1000;
        }
        .mobile-ctrl-cluster.steer {
          left: calc(env(safe-area-inset-left, 0px) + 16px);
          bottom: calc(env(safe-area-inset-bottom, 0px) + 22px);
          flex-direction: row;
        }
        .mobile-ctrl-cluster.throttle {
          right: calc(env(safe-area-inset-right, 0px) + 16px);
          bottom: calc(env(safe-area-inset-bottom, 0px) + 22px);
          flex-direction: column;
        }
      `}</style>

      {isMobileDevice && (
        <>
          <div className="mobile-ctrl-cluster steer">
            <ArrowButton
              label="Steer left"
              keyName="arrowleft"
              glyph="←"
              pressed={!!pressedButtons.arrowleft}
              onStart={handleTouchStart}
              onEnd={handleTouchEnd}
            />
            <ArrowButton
              label="Steer right"
              keyName="arrowright"
              glyph="→"
              pressed={!!pressedButtons.arrowright}
              onStart={handleTouchStart}
              onEnd={handleTouchEnd}
            />
          </div>

          <div className="mobile-ctrl-cluster throttle">
            <ArrowButton
              label="Accelerate"
              keyName="arrowup"
              glyph="↑"
              pressed={!!pressedButtons.arrowup}
              onStart={handleTouchStart}
              onEnd={handleTouchEnd}
            />
            <ArrowButton
              label="Reverse"
              keyName="arrowdown"
              glyph="↓"
              pressed={!!pressedButtons.arrowdown}
              onStart={handleTouchStart}
              onEnd={handleTouchEnd}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default CarGame;
