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

const CarGame = () => {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const carRef = useRef(null);
  const cameraRef = useRef(null);
  const keysPressed = useRef({});
  const carVelocity = useRef({ x: 0, z: 0 });
  const carRotation = useRef(0);
  const [loading, setLoading] = useState(true);
  const [score, setScore] = useState(0);
  const [gameWon, setGameWon] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const animationIdRef = useRef(null);
  const fireworksRef = useRef([]);

  useEffect(() => {
    setIsMobileDevice(isMobile());
    if (!mountRef.current) return;

    // ------------------------------------------------------------------
    // Scene / camera / renderer
    // ------------------------------------------------------------------
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x87ceeb, 80, 260);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
    camera.position.set(0, 12, 22);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    mountRef.current.appendChild(renderer.domElement);

    // ------------------------------------------------------------------
    // Lighting
    // ------------------------------------------------------------------
    const hemiLight = new THREE.HemisphereLight(0xbfdfff, 0x6fae4e, 0.55);
    scene.add(hemiLight);

    const sun = new THREE.DirectionalLight(0xfff4d6, 0.9);
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

    // ------------------------------------------------------------------
    // COLLISION SYSTEM
    // ------------------------------------------------------------------
    // Instead of computing Box3.setFromObject(mesh) every frame (which wraps
    // the WHOLE object — tall buildings, tree foliage, anything attached —
    // and previously made "shadows"/canopies block the car), we keep a list
    // of explicit 2D footprint colliders that are completely independent of
    // the rendered meshes. Visuals can be as fancy as we like; physics only
    // sees these footprints.
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
          // closest point on the box footprint to the car centre
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
    // Ground, roads, sidewalks, markings
    // ------------------------------------------------------------------
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(300, 300),
      new THREE.MeshLambertMaterial({ color: 0x6fbf44 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const roadMaterial = new THREE.MeshLambertMaterial({ color: 0x3a3a3a });
    const sidewalkMaterial = new THREE.MeshLambertMaterial({ color: 0xb8b2a7 });
    const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xf5e642 });

    const addFlat = (geometry, material, x, z, y = 0.02) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(x, y, z);
      mesh.receiveShadow = true;
      scene.add(mesh);
      return mesh;
    };

    // Road network — a fully connected city grid: three avenues running
    // east-west and three streets running north-south, all meeting at
    // intersections so every road links to every other.
    const AVENUES = [0, -50, 50]; // z positions (east-west roads)
    const STREETS = [-45, 20, 75]; // x positions (north-south roads)
    const ROAD_HALF = 6;

    AVENUES.forEach((z) => {
      addFlat(new THREE.PlaneGeometry(190, 12), roadMaterial, 0, z);
    });
    STREETS.forEach((x) => {
      addFlat(new THREE.PlaneGeometry(12, 112), roadMaterial, x, 0);
    });

    // Sidewalks along the avenues, broken into segments so they don't run
    // across the streets at intersections
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

    // Dashed centre lines, skipping intersections
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
    // The car — a much nicer model
    // ------------------------------------------------------------------
    const carGroup = new THREE.Group();
    const paint = new THREE.MeshPhongMaterial({
      color: 0xd62828,
      shininess: 90,
      specular: 0x888888,
    });
    const darkPaint = new THREE.MeshPhongMaterial({
      color: 0x9a1f1f,
      shininess: 90,
    });
    const glass = new THREE.MeshPhongMaterial({
      color: 0x9fd8ef,
      shininess: 120,
      transparent: true,
      opacity: 0.65,
    });
    const chrome = new THREE.MeshPhongMaterial({
      color: 0xdddddd,
      shininess: 150,
    });
    const tireMat = new THREE.MeshPhongMaterial({ color: 0x1c1c1c });
    const hubMat = new THREE.MeshPhongMaterial({
      color: 0xcfcfcf,
      shininess: 140,
    });

    // Lower chassis
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.7, 2.2), paint);
    chassis.position.y = 0.85;
    chassis.castShadow = true;
    carGroup.add(chassis);

    // Main body
    const body = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.6, 2.1), paint);
    body.position.y = 1.45;
    body.castShadow = true;
    carGroup.add(body);

    // Cabin
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 0.85, 1.9),
      darkPaint,
    );
    cabin.position.set(-0.3, 2.1, 0);
    cabin.castShadow = true;
    carGroup.add(cabin);

    // Sloped windshield (front) and rear window
    const windshield = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 1.0, 1.75),
      glass,
    );
    windshield.position.set(0.95, 2.0, 0);
    windshield.rotation.z = -0.45;
    carGroup.add(windshield);

    const rearWindow = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.95, 1.75),
      glass,
    );
    rearWindow.position.set(-1.55, 2.0, 0);
    rearWindow.rotation.z = 0.5;
    carGroup.add(rearWindow);

    // Side windows
    [-0.98, 0.98].forEach((side) => {
      const sideWindow = new THREE.Mesh(
        new THREE.BoxGeometry(1.9, 0.6, 0.05),
        glass,
      );
      sideWindow.position.set(-0.3, 2.15, side);
      carGroup.add(sideWindow);
    });

    // Bumpers
    [2.35, -2.35].forEach((x) => {
      const bumper = new THREE.Mesh(
        new THREE.BoxGeometry(0.25, 0.45, 2.25),
        chrome,
      );
      bumper.position.set(x, 0.75, 0);
      bumper.castShadow = true;
      carGroup.add(bumper);
    });

    // Headlights and taillights
    const headlightMat = new THREE.MeshPhongMaterial({
      color: 0xfff7c2,
      emissive: 0xfff2a0,
      emissiveIntensity: 0.8,
    });
    const taillightMat = new THREE.MeshPhongMaterial({
      color: 0xff3333,
      emissive: 0xaa0000,
      emissiveIntensity: 0.8,
    });
    [0.75, -0.75].forEach((z) => {
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 10, 10),
        headlightMat,
      );
      head.position.set(2.3, 1.25, z);
      carGroup.add(head);

      const tail = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.2, 0.45),
        taillightMat,
      );
      tail.position.set(-2.32, 1.3, z);
      carGroup.add(tail);
    });

    // Wheels (with hubcaps + spokes so the spin is visible)
    const wheelGeometry = new THREE.CylinderGeometry(0.55, 0.55, 0.4, 18);
    wheelGeometry.rotateX(Math.PI / 2); // axle along Z
    const hubGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.42, 12);
    hubGeometry.rotateX(Math.PI / 2);
    const spokeGeometry = new THREE.BoxGeometry(0.9, 0.12, 0.44);

    const wheels = [];
    [
      { x: -1.55, z: 1.05 },
      { x: -1.55, z: -1.05 },
      { x: 1.55, z: 1.05 },
      { x: 1.55, z: -1.05 },
    ].forEach((pos) => {
      const wheel = new THREE.Group();
      const tire = new THREE.Mesh(wheelGeometry, tireMat);
      tire.castShadow = true;
      wheel.add(tire);
      const hub = new THREE.Mesh(hubGeometry, hubMat);
      wheel.add(hub);
      const spoke = new THREE.Mesh(spokeGeometry, hubMat);
      wheel.add(spoke);
      wheel.position.set(pos.x, 0.55, pos.z);
      carGroup.add(wheel);
      wheels.push(wheel);
    });

    carGroup.position.set(0, 0, 0);
    carGroup.rotation.y = Math.PI / 2;
    scene.add(carGroup);
    carRef.current = carGroup;

    // ------------------------------------------------------------------
    // Buildings — with windows, doors and roofs
    // ------------------------------------------------------------------
    const windowLitMat = new THREE.MeshPhongMaterial({
      color: 0xfff0b3,
      emissive: 0xffe082,
      emissiveIntensity: 0.45,
    });
    const windowDarkMat = new THREE.MeshPhongMaterial({ color: 0x2e3b4e });
    const doorMat = new THREE.MeshPhongMaterial({ color: 0x4a2f1b });

    const createBuilding = (x, z, w, h, d, color, roofColor) => {
      const group = new THREE.Group();

      const wallMat = new THREE.MeshPhongMaterial({ color });
      const walls = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
      walls.position.y = h / 2;
      walls.castShadow = true;
      walls.receiveShadow = true;
      group.add(walls);

      // Flat roof with a ledge
      const roof = new THREE.Mesh(
        new THREE.BoxGeometry(w + 0.6, 0.5, d + 0.6),
        new THREE.MeshPhongMaterial({ color: roofColor }),
      );
      roof.position.y = h + 0.25;
      roof.castShadow = true;
      group.add(roof);

      // Rooftop unit
      const unit = new THREE.Mesh(
        new THREE.BoxGeometry(w * 0.25, 1.2, d * 0.25),
        new THREE.MeshPhongMaterial({ color: 0x8c8c8c }),
      );
      unit.position.set(w * 0.15, h + 1.1, -d * 0.15);
      unit.castShadow = true;
      group.add(unit);

      // Windows on front/back faces (z+ / z-) in a grid
      const floors = Math.max(2, Math.floor(h / 4));
      const cols = Math.max(2, Math.floor(w / 4));
      const winGeo = new THREE.PlaneGeometry(1.4, 1.8);
      for (let f = 0; f < floors; f++) {
        for (let c = 0; c < cols; c++) {
          const wx = -w / 2 + (c + 0.5) * (w / cols);
          const wy = 2.2 + (f * (h - 3)) / floors;
          const lit = (f * 7 + c * 3 + Math.abs(x) + Math.abs(z)) % 3 === 0;
          const mat = lit ? windowLitMat : windowDarkMat;

          const front = new THREE.Mesh(winGeo, mat);
          front.position.set(wx, wy, d / 2 + 0.02);
          group.add(front);

          const back = new THREE.Mesh(winGeo, mat);
          back.position.set(wx, wy, -d / 2 - 0.02);
          back.rotation.y = Math.PI;
          group.add(back);
        }
      }

      // Door on the front face
      const door = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.6), doorMat);
      door.position.set(0, 1.3, d / 2 + 0.03);
      group.add(door);

      group.position.set(x, 0, z);
      scene.add(group);

      // Physics only ever sees the footprint of the walls — never the roof
      // ledge, the shadow, or anything decorative.
      addBoxCollider(x, z, w, d);
    };

    createBuilding(-30, -25, 15, 22, 15, 0x9c5b34, 0x5e3a22);
    createBuilding(45, 25, 18, 30, 16, 0x7d8597, 0x4a4e57);
    createBuilding(-68, 30, 20, 16, 20, 0x4870b8, 0x2c4a80);
    createBuilding(62, -30, 14, 26, 14, 0xc9a86a, 0x8a703f);
    createBuilding(-20, 30, 12, 18, 12, 0xa84e4e, 0x6e2f2f);
    createBuilding(38, -28, 12, 20, 12, 0x5f8f6b, 0x3c5e45);

    // ------------------------------------------------------------------
    // Trees — two species, varied sizes
    // ------------------------------------------------------------------
    const trunkMat = new THREE.MeshPhongMaterial({ color: 0x7a4a21 });
    const leafMat = new THREE.MeshPhongMaterial({ color: 0x2e8b2e });
    const leafMatDark = new THREE.MeshPhongMaterial({ color: 0x1f6e33 });
    const pineMat = new THREE.MeshPhongMaterial({ color: 0x1d5e3a });

    const createLeafyTree = (x, z, scale = 1) => {
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5 * scale, 0.8 * scale, 6 * scale, 8),
        trunkMat,
      );
      trunk.position.y = 3 * scale;
      trunk.castShadow = true;
      tree.add(trunk);

      // Clump of three spheres reads much more like foliage than one ball
      const blobs = [
        { x: 0, y: 7.5, z: 0, r: 3.2, mat: leafMat },
        { x: 1.8, y: 6.3, z: 0.8, r: 2.2, mat: leafMatDark },
        { x: -1.6, y: 6.5, z: -0.9, r: 2.4, mat: leafMatDark },
      ];
      blobs.forEach((b) => {
        const leaves = new THREE.Mesh(
          new THREE.SphereGeometry(b.r * scale, 9, 7),
          b.mat,
        );
        leaves.position.set(b.x * scale, b.y * scale, b.z * scale);
        leaves.castShadow = true;
        tree.add(leaves);
      });

      tree.position.set(x, 0, z);
      scene.add(tree);
      // Only the trunk blocks the car — driving under the canopy is fine
      addCircleCollider(x, z, 1.0 * scale);
    };

    const createPineTree = (x, z, scale = 1) => {
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.4 * scale, 0.6 * scale, 3 * scale, 8),
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
          new THREE.ConeGeometry(tier.r * scale, 3 * scale, 9),
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
    createPineTree(-12, -35, 1.1);
    createPineTree(33, 36, 1.0);
    createPineTree(88, -14, 1.3);
    createPineTree(-80, 12, 1.1);

    // ------------------------------------------------------------------
    // Bushes and rocks (small, scattered)
    // ------------------------------------------------------------------
    const bushMat = new THREE.MeshPhongMaterial({ color: 0x3a9d3a });
    const rockMat = new THREE.MeshPhongMaterial({
      color: 0x8d8d8d,
      flatShading: true,
    });

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
      const bush = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), bushMat);
      bush.position.set(p.x, r * 0.6, p.z);
      bush.scale.y = 0.7;
      bush.castShadow = true;
      scene.add(bush);
      addCircleCollider(p.x, p.z, r * 0.8);
    });

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
    // Street lamps along the main road
    // ------------------------------------------------------------------
    const poleMat = new THREE.MeshPhongMaterial({ color: 0x444444 });
    const lampMat = new THREE.MeshPhongMaterial({
      color: 0xfff4c2,
      emissive: 0xffe9a0,
      emissiveIntensity: 0.9,
    });

    [-75, -30, 0, 40, 85].forEach((x, i) => {
      const side = i % 2 === 0 ? 8.8 : -8.8;
      const lamp = new THREE.Group();
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.2, 7, 8),
        poleMat,
      );
      pole.position.y = 3.5;
      pole.castShadow = true;
      lamp.add(pole);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 2), poleMat);
      arm.position.set(0, 6.9, side > 0 ? -1 : 1);
      lamp.add(arm);
      const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.35, 10, 8),
        lampMat,
      );
      bulb.position.set(0, 6.8, side > 0 ? -2 : 2);
      lamp.add(bulb);
      lamp.position.set(x, 0, side);
      scene.add(lamp);
      addCircleCollider(x, side, 0.5);
    });

    // ------------------------------------------------------------------
    // Benches on the sidewalk + traffic cones near the intersection
    // ------------------------------------------------------------------
    const woodMat = new THREE.MeshPhongMaterial({ color: 0x8a5a2b });
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

    const coneMat = new THREE.MeshPhongMaterial({ color: 0xff6a00 });
    [
      { x: 14, z: 6.8 },
      { x: 17, z: 7.2 },
      { x: 26, z: -6.8 },
    ].forEach((p) => {
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(0.5, 1.3, 10),
        coneMat,
      );
      cone.position.set(p.x, 0.65, p.z);
      cone.castShadow = true;
      scene.add(cone);
      addCircleCollider(p.x, p.z, 0.6);
    });

    // ------------------------------------------------------------------
    // Fountain plaza
    // ------------------------------------------------------------------
    const fountain = new THREE.Group();
    const basin = new THREE.Mesh(
      new THREE.CylinderGeometry(6, 6.5, 1, 24),
      new THREE.MeshPhongMaterial({ color: 0xb0aaa0 }),
    );
    basin.position.y = 0.5;
    basin.castShadow = true;
    basin.receiveShadow = true;
    fountain.add(basin);
    const water = new THREE.Mesh(
      new THREE.CylinderGeometry(5.4, 5.4, 0.2, 24),
      new THREE.MeshPhongMaterial({
        color: 0x3aa8d8,
        transparent: true,
        opacity: 0.85,
        shininess: 120,
      }),
    );
    water.position.y = 1.0;
    fountain.add(water);
    const column = new THREE.Mesh(
      new THREE.CylinderGeometry(0.8, 1.2, 3.2, 12),
      new THREE.MeshPhongMaterial({ color: 0xc8c2b8 }),
    );
    column.position.y = 2.2;
    column.castShadow = true;
    fountain.add(column);
    const topBowl = new THREE.Mesh(
      new THREE.CylinderGeometry(2.2, 1.6, 0.6, 16),
      new THREE.MeshPhongMaterial({ color: 0xb0aaa0 }),
    );
    topBowl.position.y = 3.9;
    topBowl.castShadow = true;
    fountain.add(topBowl);
    fountain.position.set(-12, 0, -32);
    scene.add(fountain);
    addCircleCollider(-12, -32, 6.8);

    // ------------------------------------------------------------------
    // Clouds (drift slowly, no collision)
    // ------------------------------------------------------------------
    const cloudMat = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.92,
    });
    const clouds = [];
    for (let i = 0; i < 6; i++) {
      const cloud = new THREE.Group();
      const puffs = 3 + (i % 3);
      for (let p = 0; p < puffs; p++) {
        const puff = new THREE.Mesh(
          new THREE.SphereGeometry(3 + Math.random() * 2.5, 8, 6),
          cloudMat,
        );
        puff.position.set(
          p * 4 - puffs * 2,
          Math.random() * 1.5,
          Math.random() * 3,
        );
        cloud.add(puff);
      }
      cloud.position.set(
        (Math.random() - 0.5) * 220,
        38 + Math.random() * 14,
        (Math.random() - 0.5) * 220,
      );
      scene.add(cloud);
      clouds.push({ mesh: cloud, speed: 0.015 + Math.random() * 0.02 });
    }

    // ------------------------------------------------------------------
    // Collectible crystals
    // ------------------------------------------------------------------
    const collectibles = [];
    const collectibleGeometry = new THREE.OctahedronGeometry(1, 0);
    const collectibleMaterial = new THREE.MeshPhongMaterial({
      color: 0xffd700,
      emissive: 0xffd700,
      emissiveIntensity: 0.35,
      shininess: 120,
    });
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffe680,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
    });

    // Random spawn positions, validated against the collision footprints.
    // Because this runs AFTER every collider has been registered, a crystal
    // can never end up inside a building, tree, rock, fountain, etc. We also
    // keep crystals away from the car's start point and spread out from each
    // other; if the map gets too crowded to satisfy the spacing, it relaxes
    // gradually instead of looping forever.
    const collectiblePositions = [];
    const CRYSTAL_CLEARANCE = 3.5; // generous margin so they're reachable
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
      if (Math.sqrt(x * x + z * z) < 15) continue; // not on top of the car
      if (collidesAt(x, z, CRYSTAL_CLEARANCE)) continue; // not inside anything
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

      // Soft glowing ring on the ground so crystals are easy to spot
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(1.6, 2.4, 24),
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

    const simulateKeyPress = (key, pressed) => {
      keysPressed.current[key] = pressed;
    };
    window.simulateKeyPress = simulateKeyPress;

    // ------------------------------------------------------------------
    // Fireworks
    // ------------------------------------------------------------------
    const createFireworks = () => {
      for (let i = 0; i < 10; i++) {
        setTimeout(() => {
          const firework = {
            particles: [],
            life: 60,
          };
          const origin = new THREE.Vector3(
            (Math.random() - 0.5) * 60,
            Math.random() * 20 + 15,
            (Math.random() - 0.5) * 60,
          );
          for (let j = 0; j < 24; j++) {
            const particle = new THREE.Mesh(
              new THREE.SphereGeometry(0.25, 5, 5),
              new THREE.MeshBasicMaterial({
                color: new THREE.Color().setHSL(Math.random(), 1, 0.7),
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
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);

      const acceleration = 0.05;
      const maxSpeed = 1.0;
      const friction = 0.95;
      const turnSpeed = 0.05;

      if (keysPressed.current["arrowup"] || keysPressed.current["w"]) {
        carVelocity.current.x += Math.sin(carRotation.current) * acceleration;
        carVelocity.current.z += Math.cos(carRotation.current) * acceleration;
      }
      if (keysPressed.current["arrowdown"] || keysPressed.current["s"]) {
        carVelocity.current.x -=
          Math.sin(carRotation.current) * acceleration * 0.5;
        carVelocity.current.z -=
          Math.cos(carRotation.current) * acceleration * 0.5;
      }
      if (keysPressed.current["arrowleft"] || keysPressed.current["a"]) {
        carRotation.current += turnSpeed;
      }
      if (keysPressed.current["arrowright"] || keysPressed.current["d"]) {
        carRotation.current -= turnSpeed;
      }

      carVelocity.current.x *= friction;
      carVelocity.current.z *= friction;

      const speed = Math.sqrt(
        carVelocity.current.x ** 2 + carVelocity.current.z ** 2,
      );
      if (speed > maxSpeed) {
        carVelocity.current.x = (carVelocity.current.x / speed) * maxSpeed;
        carVelocity.current.z = (carVelocity.current.z / speed) * maxSpeed;
      }

      if (carRef.current) {
        const oldX = carRef.current.position.x;
        const oldZ = carRef.current.position.z;
        let newX = oldX + carVelocity.current.x;
        let newZ = oldZ + carVelocity.current.z;

        // Axis-separated collision test: if the full move is blocked, we
        // still try each axis alone so the car slides along walls instead of
        // freezing in place.
        if (collidesAt(newX, newZ)) {
          if (!collidesAt(newX, oldZ)) {
            newZ = oldZ;
            carVelocity.current.z *= 0.2;
          } else if (!collidesAt(oldX, newZ)) {
            newX = oldX;
            carVelocity.current.x *= 0.2;
          } else {
            newX = oldX;
            newZ = oldZ;
            carVelocity.current.x *= 0.1;
            carVelocity.current.z *= 0.1;
          }
        }

        // World boundary
        const boundary = 95;
        newX = Math.max(-boundary, Math.min(boundary, newX));
        newZ = Math.max(-boundary, Math.min(boundary, newZ));

        carRef.current.position.x = newX;
        carRef.current.position.z = newZ;
        carRef.current.rotation.y = carRotation.current + Math.PI / 2;

        // Spin the wheels with the car's forward speed
        const forwardSpeed =
          carVelocity.current.x * Math.sin(carRotation.current) +
          carVelocity.current.z * Math.cos(carRotation.current);
        wheels.forEach((wheel) => {
          wheel.rotation.z -= forwardSpeed * 1.8;
        });
      }

      // Camera follows the car
      if (cameraRef.current && carRef.current) {
        const cameraOffset = new THREE.Vector3(
          -Math.sin(carRotation.current) * 20,
          11,
          -Math.cos(carRotation.current) * 20,
        );
        cameraRef.current.position.lerp(
          carRef.current.position.clone().add(cameraOffset),
          0.1,
        );
        const lookTarget = carRef.current.position.clone();
        lookTarget.y += 2;
        cameraRef.current.lookAt(lookTarget);
      }

      // Clouds drift
      clouds.forEach((cloud) => {
        cloud.mesh.position.x += cloud.speed;
        if (cloud.mesh.position.x > 130) cloud.mesh.position.x = -130;
      });

      // Collectibles: spin, bob, check pickup
      collectibles.forEach((collectible, index) => {
        if (!collectible.userData.collected && collectible.parent) {
          collectible.rotation.y += 0.02;
          collectible.position.y =
            3 + Math.sin(Date.now() * 0.001 + index) * 0.5;
          if (collectible.userData.ring) {
            const pulse = 1 + Math.sin(Date.now() * 0.003 + index) * 0.12;
            collectible.userData.ring.scale.set(pulse, pulse, 1);
          }

          if (carRef.current) {
            const distance = collectible.position.distanceTo(
              carRef.current.position,
            );
            if (distance < 4) {
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
                if (collectible.parent) {
                  scene.remove(collectible);
                }
                if (
                  collectible.userData.ring &&
                  collectible.userData.ring.parent
                ) {
                  scene.remove(collectible.userData.ring);
                }
              }, 100);
            }
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

    // Cleanup
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("resize", handleResize);
      delete window.simulateKeyPress;
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
      renderer.dispose();
    };
  }, []);

  const mobileControlStyle = {
    position: "absolute",
    bottom: "20px",
    width: "80px",
    height: "80px",
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    border: "3px solid #333",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "24px",
    fontWeight: "bold",
    userSelect: "none",
    touchAction: "manipulation",
    cursor: "pointer",
    zIndex: 1000,
    color: "grey",
  };

  const handleTouchStart = (key) => {
    if (window.simulateKeyPress) {
      window.simulateKeyPress(key, true);
    }
  };

  const handleTouchEnd = (key) => {
    if (window.simulateKeyPress) {
      window.simulateKeyPress(key, false);
    }
  };

  return (
    <div
      style={{
        position: isMobileDevice ? "fixed" : "relative",
        top: isMobileDevice ? "0" : "auto",
        left: isMobileDevice ? "0" : "auto",
        width: "100vw",
        height: "100vh",
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
            color: "white",
            fontSize: "24px",
            fontFamily: "Arial, sans-serif",
          }}
        >
          Loading...
        </div>
      )}

      <div
        style={{
          position: "absolute",
          top: "20px",
          left: "20px",
          color: "white",
          fontFamily: "Arial, sans-serif",
          fontSize: "16px",
          textShadow: "2px 2px 4px rgba(0,0,0,0.5)",
          backgroundColor: "rgba(0,0,0,0.5)",
          padding: "15px",
          borderRadius: "10px",
        }}
      >
        <h3 style={{ margin: "0 0 10px 0" }}>🚗 Drive Around!</h3>
        <p style={{ margin: "5px 0" }}>
          {isMobileDevice
            ? "Use Screen Buttons to move"
            : "Use Arrow Keys or WASD to move"}
        </p>
        <p style={{ margin: "5px 0" }}>Collect the golden crystals!</p>
        <p style={{ margin: "5px 0", fontWeight: "bold" }}>
          Score: {score}/{TOTAL_CRYSTALS}
        </p>
      </div>

      {gameWon && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            color: "white",
            fontSize: isMobileDevice ? "28px" : "48px",
            fontFamily: "Arial, sans-serif",
            textAlign: "center",
            textShadow: "4px 4px 8px rgba(0,0,0,0.8)",
            backgroundColor: "rgba(0,0,0,0.7)",
            padding: isMobileDevice ? "20px 15px" : "30px",
            borderRadius: "20px",
            border: "3px solid gold",
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
        @keyframes pulse {
          0% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-50%, -50%) scale(1.05); }
          100% { transform: translate(-50%, -50%) scale(1); }
        }
      `}</style>

      {isMobileDevice && (
        <>
          {/* Up Arrow */}
          <div
            style={{
              ...mobileControlStyle,
              right: "50%",
              transform: "translateX(50%)",
              bottom: "180px",
            }}
            onTouchStart={(e) => {
              e.preventDefault();
              handleTouchStart("arrowup");
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              handleTouchEnd("arrowup");
            }}
            onMouseDown={() => handleTouchStart("arrowup")}
            onMouseUp={() => handleTouchEnd("arrowup")}
            onMouseLeave={() => handleTouchEnd("arrowup")}
          >
            ↑
          </div>

          {/* Down Arrow */}
          <div
            style={{
              ...mobileControlStyle,
              right: "50%",
              transform: "translateX(50%)",
              bottom: "20px",
            }}
            onTouchStart={(e) => {
              e.preventDefault();
              handleTouchStart("arrowdown");
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              handleTouchEnd("arrowdown");
            }}
            onMouseDown={() => handleTouchStart("arrowdown")}
            onMouseUp={() => handleTouchEnd("arrowdown")}
            onMouseLeave={() => handleTouchEnd("arrowdown")}
          >
            ↓
          </div>

          {/* Left Arrow */}
          <div
            style={{
              ...mobileControlStyle,
              right: "50%",
              transform: "translateX(calc(50% - 100px))",
              bottom: "100px",
            }}
            onTouchStart={(e) => {
              e.preventDefault();
              handleTouchStart("arrowleft");
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              handleTouchEnd("arrowleft");
            }}
            onMouseDown={() => handleTouchStart("arrowleft")}
            onMouseUp={() => handleTouchEnd("arrowleft")}
            onMouseLeave={() => handleTouchEnd("arrowleft")}
          >
            ←
          </div>

          {/* Right Arrow */}
          <div
            style={{
              ...mobileControlStyle,
              right: "50%",
              transform: "translateX(calc(50% + 100px))",
              bottom: "100px",
            }}
            onTouchStart={(e) => {
              e.preventDefault();
              handleTouchStart("arrowright");
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              handleTouchEnd("arrowright");
            }}
            onMouseDown={() => handleTouchStart("arrowright")}
            onMouseUp={() => handleTouchEnd("arrowright")}
            onMouseLeave={() => handleTouchEnd("arrowright")}
          >
            →
          </div>
        </>
      )}
    </div>
  );
};

export default CarGame;
