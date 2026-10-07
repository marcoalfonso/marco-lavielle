import * as THREE from "three";
import { COLORS } from "./materials.js";

const HIDDEN = new THREE.Matrix4().makeScale(0, 0, 0);

// Pooled particles drawn as one InstancedMesh. Instanced meshes share one
// opacity, so particles "fade" by shrinking instead.
const createSystem = (scene, geometry, material, max, { gravity = 0, drag = 0.98, spin = 0 } = {}) => {
  const mesh = new THREE.InstancedMesh(geometry, material, max);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  for (let i = 0; i < max; i++) {
    mesh.setMatrixAt(i, HIDDEN);
    mesh.setColorAt(i, new THREE.Color(0xffffff));
  }
  scene.add(mesh);

  const parts = Array.from({ length: max }, () => ({
    life: 0,
    max: 1,
    size: 1,
    grow: 0,
    pos: new THREE.Vector3(),
    vel: new THREE.Vector3(),
    rot: new THREE.Euler(),
    rotVel: new THREE.Vector3(),
    color: new THREE.Color(),
    color2: null,
  }));
  let cursor = 0;
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const c = new THREE.Color();

  const emit = ({ pos, vel, life = 1, size = 1, grow = 0, color = 0xffffff, color2 = null }) => {
    const index = cursor;
    const p = parts[index];
    cursor = (cursor + 1) % max;
    p.life = life;
    p.max = life;
    p.size = size;
    p.grow = grow;
    p.pos.copy(pos);
    p.vel.copy(vel);
    p.rot.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
    p.rotVel.set((Math.random() - 0.5) * spin, (Math.random() - 0.5) * spin, (Math.random() - 0.5) * spin);
    p.color.set(color);
    p.color2 = color2 !== null ? new THREE.Color(color2) : null;
    mesh.setColorAt(index, p.color);
    mesh.instanceColor.needsUpdate = true;
  };

  const update = (dt) => {
    let colorDirty = false;
    for (let i = 0; i < max; i++) {
      const p = parts[i];
      if (p.life <= 0) continue;
      p.life -= dt;
      if (p.life <= 0) {
        mesh.setMatrixAt(i, HIDDEN);
        continue;
      }
      p.vel.y -= gravity * dt;
      p.vel.multiplyScalar(Math.pow(drag, dt * 60));
      p.pos.addScaledVector(p.vel, dt);
      if (p.pos.y < 0.05) {
        p.pos.y = 0.05;
        p.vel.y *= -0.3;
        p.vel.x *= 0.7;
        p.vel.z *= 0.7;
      }
      p.rot.x += p.rotVel.x * dt;
      p.rot.y += p.rotVel.y * dt;
      p.rot.z += p.rotVel.z * dt;
      const t = 1 - p.life / p.max; // 0 → 1
      const scale = p.size * (1 + p.grow * t) * Math.min(1, (1 - t) * 3);
      m.compose(p.pos, q.setFromEuler(p.rot), s.setScalar(Math.max(scale, 0.0001)));
      mesh.setMatrixAt(i, m);
      if (p.color2) {
        mesh.setColorAt(i, c.copy(p.color).lerp(p.color2, t));
        colorDirty = true;
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (colorDirty && mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  };

  return { emit, update, mesh };
};

const SPARK_COLORS = [0x00bff3, 0xff4fd8, 0x9b6bff, 0xffb347, 0x6ff5ee];

export const createEffects = (scene, isMobile) => {
  const dust = createSystem(
    scene,
    new THREE.IcosahedronGeometry(0.4, 0),
    new THREE.MeshPhongMaterial({ color: 0xffffff, flatShading: true, transparent: true, opacity: 0.55 }),
    isMobile ? 80 : 160,
    { gravity: -1.2, drag: 0.94, spin: 2 },
  );
  const flames = createSystem(
    scene,
    new THREE.IcosahedronGeometry(0.32, 0),
    new THREE.MeshBasicMaterial({ color: 0xffffff }),
    90,
    { gravity: -2, drag: 0.9, spin: 6 },
  );
  const confetti = createSystem(
    scene,
    new THREE.PlaneGeometry(0.4, 0.6),
    new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }),
    isMobile ? 350 : 700,
    { gravity: 14, drag: 0.965, spin: 12 },
  );

  // Skid marks: ring buffer of dark quads laid on the ground
  const SKIDS = isMobile ? 300 : 700;
  const skidMesh = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(0.55, 0.9),
    // light trails rather than rubber
    new THREE.MeshBasicMaterial({
      color: 0x00bff3,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    }),
    SKIDS,
  );
  for (let i = 0; i < SKIDS; i++) skidMesh.setMatrixAt(i, HIDDEN);
  skidMesh.frustumCulled = false;
  scene.add(skidMesh);
  let skidCursor = 0;
  const skidM = new THREE.Matrix4();
  const skidQ = new THREE.Quaternion();
  const skidE = new THREE.Euler();
  const skidS = new THREE.Vector3(1, 1, 1);
  const skidP = new THREE.Vector3();
  const addSkid = (x, y, z, yaw) => {
    skidM.compose(skidP.set(x, y + 0.06, z), skidQ.setFromEuler(skidE.set(-Math.PI / 2, 0, yaw, "YXZ")), skidS);
    skidMesh.setMatrixAt(skidCursor, skidM);
    skidCursor = (skidCursor + 1) % SKIDS;
    skidMesh.instanceMatrix.needsUpdate = true;
  };

  // Horn: expanding rings on the ground
  const waves = Array.from({ length: 4 }, () => {
    const mesh = new THREE.Mesh(
      new THREE.RingGeometry(0.85, 1, 40),
      new THREE.MeshBasicMaterial({ color: 0x6ff5ee, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.visible = false;
    scene.add(mesh);
    return { mesh, t: 1 };
  });
  let waveCursor = 0;
  const hornWave = (x, y, z) => {
    const w = waves[waveCursor];
    waveCursor = (waveCursor + 1) % waves.length;
    w.t = 0;
    w.mesh.position.set(x, y + 0.12, z);
    w.mesh.visible = true;
  };

  const tmp = new THREE.Vector3();
  const tmpV = new THREE.Vector3();

  const emitDust = (pos, strength = 1) => {
    dust.emit({
      pos: tmp.set(pos.x + (Math.random() - 0.5) * 0.8, pos.y + 0.2, pos.z + (Math.random() - 0.5) * 0.8),
      vel: tmpV.set((Math.random() - 0.5) * 2, 1 + Math.random() * 1.5, (Math.random() - 0.5) * 2),
      life: 0.9 + Math.random() * 0.5,
      size: 0.6 + Math.random() * 0.5 * strength,
      grow: 1.4,
      color: SPARK_COLORS[Math.floor(Math.random() * SPARK_COLORS.length)],
    });
  };

  const emitFlame = (pos, back) => {
    flames.emit({
      pos: tmp.set(pos.x + (Math.random() - 0.5) * 0.3, pos.y + (Math.random() - 0.5) * 0.3, pos.z + (Math.random() - 0.5) * 0.3),
      vel: tmpV.copy(back).multiplyScalar(6 + Math.random() * 5).add(tmp.set(0, 1, 0)),
      life: 0.25 + Math.random() * 0.2,
      size: 0.9 + Math.random() * 0.6,
      grow: -0.4,
      color: 0xeafcff,
      color2: 0xff4fd8,
    });
  };

  const CONFETTI_COLORS = [0x6ff5ee, 0x00bff3, 0xff4fd8, 0x9b6bff, 0xffb347, 0x9dff6b, 0xffffff];
  const burst = (pos, { count = 80, power = 12, up = 10, colors = CONFETTI_COLORS, life = 2.4 } = {}) => {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * power;
      confetti.emit({
        pos: tmp.set(pos.x, pos.y, pos.z),
        vel: tmpV.set(Math.cos(a) * r, up * (0.5 + Math.random()), Math.sin(a) * r),
        life: life * (0.6 + Math.random() * 0.6),
        size: 0.8 + Math.random() * 0.6,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
  };

  const update = (dt) => {
    dust.update(dt);
    flames.update(dt);
    confetti.update(dt);
    waves.forEach((w) => {
      if (w.t >= 1) return;
      w.t = Math.min(1, w.t + dt * 1.6);
      const s = 1 + w.t * 12;
      w.mesh.scale.set(s, s, 1);
      w.mesh.material.opacity = (1 - w.t) * 0.7;
      if (w.t >= 1) w.mesh.visible = false;
    });
  };

  return { emitDust, emitFlame, burst, addSkid, hornWave, update };
};
