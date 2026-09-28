import * as CANNON from "cannon-es";
import { BONES } from "./bodyPoints.js";

// ---------------------------------------------------------------------------
// "Active" rag doll for the About page hologram.
//
// One rigid body per bone, joined with cone-twist joints (so limbs can't bend
// the wrong way), plus soft "muscles" that pull every body back toward the
// standing pose. It stays standing on its platform, flops when grabbed or
// shaken, and settles back when left alone.
//
// Coordinates are the figure's own: metres, y up, feet at y = 0. The rest
// pose has identity orientation for every body, so a body's transform
// relative to rest is exactly what the skinning shader needs.
// Pure module (no DOM, no three.js) so it can be tuned headlessly.
// ---------------------------------------------------------------------------

const TUNING = {
  gravity: 9.8,
  step: 1 / 120,
  // Muscles are springs at the joints (equal and opposite torques on parent
  // and child) pulling each bone back to its rest angle. omega is the spring's
  // natural frequency (rad/s), zeta its damping ratio (lower = floppier).
  root: { omega: 8, zeta: 0.9 }, // pelvis anchor to its standing spot
  muscle: {
    pelvis: { omega: 7, zeta: 0.9 }, // pelvis upright (absolute)
    chest: { omega: 7, zeta: 0.7 },
    head: { omega: 6, zeta: 0.6 },
    upperArm: { omega: 5, zeta: 0.4 },
    forearm: { omega: 5, zeta: 0.4 },
    thigh: { omega: 7, zeta: 0.7 },
    shin: { omega: 7, zeta: 0.7 },
  },
  // Muscles cancel standing gravity, so the pose holds without sagging.
  // Tilting the phone only adds the difference from normal gravity, which is
  // what pushes the doll around.
  support: { pelvis: 1, chest: 1, head: 1, thigh: 1, shin: 1, upperArm: 1, forearm: 1 },
  dragMaxForce: 180, // how hard the mouse can pull; limbs rubber-band beyond this
  // keep parts inside the visible frame (figure space, metres): the mouse
  // can't drag beyond it, and tilting/shaking the phone can't fling limbs out
  dragBounds: { x: [-0.72, 0.72], y: [0.05, 1.9], z: [-0.5, 0.5] },
  frameX: 0.62, // soft wall for any body part's centre
  maxInertial: 18, // m/s², clamp for phone shakes
  // the pelvis anchor holds the body over the platform, so it resists tilt
  // and jolts much less than the limbs: let phone motion move it too
  rootFollow: 0.6,
};

const group = (name) => name.replace(/[PN]$/, "");

const quatFromTo = (from, to) => {
  const q = new CANNON.Quaternion();
  q.setFromVectors(from, to);
  return q;
};

export const createRagdoll = () => {
  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -TUNING.gravity, 0) });
  world.solver.iterations = 14;
  world.allowSleep = false;

  const ground = new CANNON.Body({ mass: 0, collisionFilterGroup: 1, collisionFilterMask: 2 });
  ground.addShape(new CANNON.Plane());
  ground.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
  world.addBody(ground);

  const Y = new CANNON.Vec3(0, 1, 0);
  const bodies = BONES.map((bone) => {
    const a = new CANNON.Vec3(...bone.a);
    const b = new CANNON.Vec3(...bone.b);
    const dir = b.vsub(a);
    const len = dir.length();
    dir.normalize();
    const body = new CANNON.Body({
      mass: bone.mass,
      linearDamping: 0.1,
      angularDamping: bone.parent ? 0.25 : 0.9,
    });
    const half = bone.box
      ? new CANNON.Vec3(...bone.box)
      : new CANNON.Vec3(bone.r * 0.8, len / 2, bone.r * 0.8);
    // shape axis follows the bone; the body itself keeps identity orientation
    body.addShape(new CANNON.Box(half), new CANNON.Vec3(), bone.box ? undefined : quatFromTo(Y, dir));
    // Even (isotropic) inertia: a thin limb's tiny spin inertia would make
    // the explicit muscle springs unstable around the bone's long axis.
    const iso = (body.inertia.x + body.inertia.y + body.inertia.z) / 3;
    body.inertia.set(iso, iso, iso);
    body.invInertia.set(1 / iso, 1 / iso, 1 / iso);
    body.updateInertiaWorld(true);
    body.position.set(...bone.center);
    // parts only collide with the floor: limbs of a hologram can pass through
    // each other, and it stops them hooking on the torso after a big swing
    body.collisionFilterGroup = 2;
    body.collisionFilterMask = 1;
    world.addBody(body);
    return {
      body,
      bone,
      support: TUNING.support[group(bone.name)] * bone.mass * TUNING.gravity,
      rest: new CANNON.Vec3(...bone.center),
      axis: dir,
      halfLength: len / 2,
    };
  });

  // Muscle strength: a bone swings about its joint carrying everything below
  // it, so size each spring by that subtree's inertia about the joint, then
  // cap it at what an explicit spring can take at this step size.
  const subtree = (i) => [i, ...BONES.filter((b) => b.parentIndex === i).flatMap((b) => subtree(b.index))];
  const ownInertia = (entry) => entry.body.inertia.x;
  const h = TUNING.step;
  bodies.forEach((entry, i) => {
    const pivot = entry.bone.joint || entry.bone.center;
    let inertia = 0;
    subtree(i).forEach((j) => {
      const other = bodies[j];
      const dx = other.rest.x - pivot[0];
      const dy = other.rest.y - pivot[1];
      const dz = other.rest.z - pivot[2];
      inertia += ownInertia(other) + other.body.mass * (dx * dx + dy * dy + dz * dz);
    });
    const parent = entry.bone.parentIndex >= 0 ? bodies[entry.bone.parentIndex] : null;
    const lightest = parent ? Math.min(ownInertia(entry), ownInertia(parent)) : ownInertia(entry);
    const m = TUNING.muscle[group(entry.bone.name)];
    entry.parent = parent;
    entry.kr = Math.min(inertia * m.omega * m.omega, (0.4 * lightest) / (h * h));
    entry.dr = Math.min(inertia * 2 * m.zeta * m.omega, (0.4 * lightest) / h);
  });
  const totalMass = bodies.reduce((sum, e) => sum + e.body.mass, 0);
  // soles: the shin segment's end point, in the shin body's own frame
  const feet = bodies
    .filter((e) => group(e.bone.name) === "shin")
    .map((e) => ({
      body: e.body,
      sole: new CANNON.Vec3(...e.bone.b.map((v, k) => v - e.bone.center[k])),
      restY: e.bone.b[1],
    }));
  const soleWorld = new CANNON.Vec3();
  const footPull = new CANNON.Vec3();
  const footK = Math.min(300 * 4 * 9.8, (0.3 * 4) / (h * h));

  BONES.forEach((bone, i) => {
    if (bone.parentIndex < 0) return;
    const child = bodies[i];
    const parent = bodies[bone.parentIndex];
    const joint = new CANNON.Vec3(...bone.joint);
    const constraint = new CANNON.ConeTwistConstraint(parent.body, child.body, {
      pivotA: joint.vsub(parent.rest),
      pivotB: joint.vsub(child.rest),
      axisA: child.axis.clone(),
      axisB: child.axis.clone(),
      angle: bone.cone,
      twistAngle: bone.twist,
      maxForce: 1e5,
    });
    constraint.collideConnected = false;
    world.addConstraint(constraint);
  });

  // --- muscles + inputs, applied every physics sub-step
  const inertial = new CANNON.Vec3();
  const qErr = new CANNON.Quaternion();
  const qParentInv = new CANNON.Quaternion();
  const torque = new CANNON.Vec3();
  const root = bodies[0];
  const rootK = Math.min(totalMass * TUNING.root.omega ** 2, (0.4 * root.body.mass) / (h * h));
  const rootD = Math.min(totalMass * 2 * TUNING.root.zeta * TUNING.root.omega, (0.4 * root.body.mass) / h);
  world.addEventListener("preStep", () => {
    // pelvis anchor: a spring back to its standing spot
    const rb = root.body;
    // Where the pelvis "wants" to be shifts with phone tilt and movement, so
    // the whole body rides the motion instead of only the limbs swinging.
    const gx = world.gravity.x;
    const gy = world.gravity.y + TUNING.gravity;
    const gz = world.gravity.z;
    const shift = (TUNING.rootFollow * totalMass) / rootK;
    const tx = root.rest.x + (gx + inertial.x) * shift;
    // never lift the feet off the platform: the pelvis can drop, not rise
    const ty = root.rest.y + Math.min(0, (gy + inertial.y) * shift);
    const tz = root.rest.z + (gz + inertial.z) * shift;
    rb.force.x += (tx - rb.position.x) * rootK - rb.velocity.x * rootD;
    rb.force.y += (ty - rb.position.y) * rootK - rb.velocity.y * rootD;
    // Muscle support cancels normal gravity; while the phone is tilted away
    // from upright, the leftover pull along "up" would float the doll off
    // the platform. Cancel just that vertical part on the pelvis.
    if (gy > 0) rb.force.y -= gy * totalMass;
    // Plant the feet: the shins' own support would still lift a tilted leg,
    // so pull each foot's sole back down to the platform (never up).
    feet.forEach((foot) => {
      foot.body.pointToWorldFrame(foot.sole, soleWorld);
      if (soleWorld.y > foot.restY) foot.body.applyForce(footPull.set(0, (foot.restY - soleWorld.y) * footK, 0), soleWorld);
    });
    rb.force.z += (tz - rb.position.z) * rootK - rb.velocity.z * rootD;

    bodies.forEach((entry) => {
      const { body, parent, kr, dr } = entry;
      // Error rotation that brings the bone back to rest: relative to its
      // parent (rest relative orientation is identity), or absolute for the
      // pelvis. Expressed as an axis * angle in world space.
      if (parent) {
        parent.body.quaternion.conjugate(qParentInv);
        qParentInv.mult(body.quaternion, qErr); // child in parent frame
        qErr.conjugate(qErr);
      } else {
        body.quaternion.conjugate(qErr);
      }
      if (qErr.w < 0) {
        qErr.x = -qErr.x;
        qErr.y = -qErr.y;
        qErr.z = -qErr.z;
        qErr.w = -qErr.w;
      }
      const w = Math.min(1, qErr.w);
      const s = Math.sqrt(1 - w * w);
      const k = s > 1e-6 ? (2 * Math.acos(w) * kr) / s : 0;
      torque.set(qErr.x * k, qErr.y * k, qErr.z * k);
      if (parent) parent.body.quaternion.vmult(torque, torque); // parent frame -> world
      // damping on the joint's relative spin
      const pw = parent ? parent.body.angularVelocity : null;
      torque.x -= (body.angularVelocity.x - (pw ? pw.x : 0)) * dr;
      torque.y -= (body.angularVelocity.y - (pw ? pw.y : 0)) * dr;
      torque.z -= (body.angularVelocity.z - (pw ? pw.z : 0)) * dr;
      body.torque.vadd(torque, body.torque);
      if (parent) parent.body.torque.vsub(torque, parent.body.torque);

      // soft side walls: nothing drifts out of the frame
      const over = Math.abs(body.position.x) - TUNING.frameX;
      if (over > 0) {
        const sign = Math.sign(body.position.x);
        body.force.x -= sign * over * body.mass * 400;
        if (body.velocity.x * sign > 0) body.velocity.x *= 0.9;
      }

      // hold the pose against normal gravity; phone movement pushes the doll
      // opposite to the phone's acceleration
      body.force.x += inertial.x * body.mass;
      body.force.y += inertial.y * body.mass + entry.support;
      body.force.z += inertial.z * body.mass;
    });
  });

  // --- dragging with a mouse "hand"
  const hand = new CANNON.Body({ mass: 0, type: CANNON.Body.KINEMATIC });
  hand.collisionFilterGroup = 0;
  hand.collisionFilterMask = 0;
  world.addBody(hand);
  let grip = null;

  const startDrag = (index, point) => {
    endDrag();
    const body = bodies[index].body;
    hand.position.set(point[0], point[1], point[2]);
    const pivot = body.pointToLocalFrame(new CANNON.Vec3(...point));
    grip = new CANNON.PointToPointConstraint(body, pivot, hand, new CANNON.Vec3(), TUNING.dragMaxForce);
    world.addConstraint(grip);
  };
  const clamp = (v, [lo, hi]) => Math.max(lo, Math.min(hi, v));
  const moveDrag = (point) => {
    if (!grip) return;
    const b = TUNING.dragBounds;
    hand.position.set(clamp(point[0], b.x), clamp(point[1], b.y), clamp(point[2], b.z));
  };
  function endDrag() {
    if (grip) world.removeConstraint(grip);
    grip = null;
  }

  // --- picking: which bone does a ray (in figure space) hit first?
  const tmp = new CANNON.Vec3();
  const segA = new CANNON.Vec3();
  const segB = new CANNON.Vec3();
  const pick = (origin, direction) => {
    const o = origin;
    const d = direction;
    let best = null;
    bodies.forEach((entry, index) => {
      const { body, axis, halfLength, bone } = entry;
      body.quaternion.vmult(axis, tmp);
      body.position.addScaledVector(-halfLength, tmp, segA);
      body.position.addScaledVector(halfLength, tmp, segB);
      // closest points between the ray o + t d and the segment A + s (B - A)
      const ux = segB.x - segA.x;
      const uy = segB.y - segA.y;
      const uz = segB.z - segA.z;
      const wx = o[0] - segA.x;
      const wy = o[1] - segA.y;
      const wz = o[2] - segA.z;
      const a = d[0] * d[0] + d[1] * d[1] + d[2] * d[2];
      const b = d[0] * ux + d[1] * uy + d[2] * uz;
      const c = ux * ux + uy * uy + uz * uz;
      const dd = d[0] * wx + d[1] * wy + d[2] * wz;
      const e = ux * wx + uy * wy + uz * wz;
      const den = a * c - b * b;
      let s = den > 1e-9 ? (a * e - b * dd) / den : 0;
      s = Math.max(0, Math.min(1, s));
      const px = segA.x + ux * s;
      const py = segA.y + uy * s;
      const pz = segA.z + uz * s;
      const t = Math.max(0, ((px - o[0]) * d[0] + (py - o[1]) * d[1] + (pz - o[2]) * d[2]) / a);
      const qx = o[0] + d[0] * t;
      const qy = o[1] + d[1] * t;
      const qz = o[2] + d[2] * t;
      const dist = Math.sqrt((qx - px) ** 2 + (qy - py) ** 2 + (qz - pz) ** 2);
      const reach = (bone.box ? Math.max(bone.box[0], bone.box[2]) : bone.r) * 1.15 + 0.015;
      if (dist < reach && (!best || t < best.t)) best = { index, t, point: [qx, qy, qz] };
    });
    return best;
  };

  // --- driving inputs
  const setGravity = (x, y, z) => world.gravity.set(x, y, z);
  const resetGravity = () => world.gravity.set(0, -TUNING.gravity, 0);
  const setInertial = (x, y, z) => {
    const m = TUNING.maxInertial;
    inertial.set(Math.max(-m, Math.min(m, x)), Math.max(-m, Math.min(m, y)), Math.max(-m, Math.min(m, z)));
  };

  const step = (dt) => world.step(TUNING.step, Math.min(dt, 1 / 20), 8);

  // Column-major 4x4 per bone: T(position) · R(orientation) · T(-rest centre)
  const writeBoneMatrices = (out) => {
    bodies.forEach((entry, i) => {
      const { x, y, z, w } = entry.body.quaternion;
      const p = entry.body.position;
      const c = entry.rest;
      const xx = x * x;
      const yy = y * y;
      const zz = z * z;
      const xy = x * y;
      const xz = x * z;
      const yz = y * z;
      const wx = w * x;
      const wy = w * y;
      const wz = w * z;
      const r00 = 1 - 2 * (yy + zz);
      const r01 = 2 * (xy - wz);
      const r02 = 2 * (xz + wy);
      const r10 = 2 * (xy + wz);
      const r11 = 1 - 2 * (xx + zz);
      const r12 = 2 * (yz - wx);
      const r20 = 2 * (xz - wy);
      const r21 = 2 * (yz + wx);
      const r22 = 1 - 2 * (xx + yy);
      const o = i * 16;
      out[o] = r00;
      out[o + 1] = r10;
      out[o + 2] = r20;
      out[o + 3] = 0;
      out[o + 4] = r01;
      out[o + 5] = r11;
      out[o + 6] = r21;
      out[o + 7] = 0;
      out[o + 8] = r02;
      out[o + 9] = r12;
      out[o + 10] = r22;
      out[o + 11] = 0;
      out[o + 12] = p.x - (r00 * c.x + r01 * c.y + r02 * c.z);
      out[o + 13] = p.y - (r10 * c.x + r11 * c.y + r12 * c.z);
      out[o + 14] = p.z - (r20 * c.x + r21 * c.y + r22 * c.z);
      out[o + 15] = 1;
    });
    return out;
  };

  return {
    step,
    pick,
    startDrag,
    moveDrag,
    endDrag,
    isDragging: () => !!grip,
    setGravity,
    resetGravity,
    setInertial,
    writeBoneMatrices,
    bodies,
    boneCount: bodies.length,
    gravity: TUNING.gravity,
  };
};
