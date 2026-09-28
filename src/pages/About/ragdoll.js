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
  frameMargin: 0.1, // soft walls sit this far inside the drag bounds
  maxInertial: 18, // m/s², clamp for phone shakes
  coreInertia: { pelvis: 5, chest: 3 },
  muscleReaction: 0.25,
  footMaxPull: 120, // N
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
    // (the core gets extra rotational inertia so it can carry stiffer
    // springs: pulling a limb bends the limb, not the whole torso)
    const iso = ((body.inertia.x + body.inertia.y + body.inertia.z) / 3) * (TUNING.coreInertia[bone.name] || 1);
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
    const m = TUNING.muscle[group(entry.bone.name)];
    entry.parent = parent;
    if (!parent) {
      // pelvis: upright torque (it has no joint to pivot on)
      const own = ownInertia(entry);
      entry.kr = Math.min(inertia * m.omega * m.omega, (0.4 * own) / (h * h));
      entry.dr = Math.min(inertia * 2 * m.zeta * m.omega, (0.4 * own) / h);
      return;
    }
    // Jointed bones: a spring pulls the bone's tip toward where the standing
    // pose puts it relative to the parent. A pull at the far end of a pinned
    // bone turns it about its joint without loading the joint.
    const b = entry.bone;
    const tipRest = new CANNON.Vec3(...b.b);
    const jointRest = new CANNON.Vec3(...b.joint);
    const length = tipRest.vsub(jointRest).length();
    const effMass = inertia / (length * length); // subtree, felt at the tip
    const ownTipMass = entry.body.mass / 3; // a pinned rod, felt at its tip
    entry.tipLocal = tipRest.vsub(entry.rest);
    entry.jointInParent = jointRest.vsub(parent.rest);
    entry.tipFromJoint = tipRest.vsub(jointRest); // rest pose: parent frame = world
    entry.kt = Math.min(effMass * m.omega * m.omega, (0.3 * ownTipMass) / (h * h));
    entry.ct = Math.min(effMass * 2 * m.zeta * m.omega, (0.3 * ownTipMass) / h);
    // twist about the bone's own axis: a torque is safe there (the joint and
    // centre both lie on that axis)
    const own = ownInertia(entry);
    entry.kr = Math.min(own * m.omega * m.omega * 4, (0.4 * own) / (h * h));
    entry.dr = Math.min(own * 2 * m.zeta * m.omega * 2, (0.4 * own) / h);
  });
  const totalMass = bodies.reduce((sum, e) => sum + e.body.mass, 0);
  // soles: the shin segment's end point, in the shin body's own frame
  const feet = bodies
    .filter((e) => group(e.bone.name) === "shin")
    .map((e) => ({
      body: e.body,
      leg: [e.body, e.parent.body], // shin + thigh
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
    // stiff joints: the default is soft enough to visibly stretch under load
    constraint.equations.forEach((eq) => eq.setSpookParams(1e9, 3, TUNING.step));
    world.addConstraint(constraint);
  });

  // --- muscles + inputs, applied every physics sub-step
  const inertial = new CANNON.Vec3();
  const qErr = new CANNON.Quaternion();
  const qParentInv = new CANNON.Quaternion();
  const torque = new CANNON.Vec3();
  const jointWorld = new CANNON.Vec3();
  const tipTarget = new CANNON.Vec3();
  const tipWorld = new CANNON.Vec3();
  const tipVel = new CANNON.Vec3();
  const targetVel = new CANNON.Vec3();
  const pull = new CANNON.Vec3();
  const boneAxis = new CANNON.Vec3();
  const relPoint = new CANNON.Vec3();
  // quaternion (shortest way round) -> axis * angle * gain
  const axisAngle = (q, gain, out) => {
    if (q.w < 0) {
      q.x = -q.x;
      q.y = -q.y;
      q.z = -q.z;
      q.w = -q.w;
    }
    const w = Math.min(1, q.w);
    const sn = Math.sqrt(1 - w * w);
    const k = sn > 1e-6 ? (2 * Math.acos(w) * gain) / sn : 0;
    return out.set(q.x * k, q.y * k, q.z * k);
  };

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
      // a leg that's being dragged is free to lift off the platform
      if (grip && foot.leg.includes(grip.bodyA)) return;
      foot.body.pointToWorldFrame(foot.sole, soleWorld);
      if (soleWorld.y > foot.restY) {
        // capped: a hard yank on the body lifts the foot rather than
        // tearing the knee apart
        footPull.set(0, Math.max(-TUNING.footMaxPull, (foot.restY - soleWorld.y) * footK), 0);
        foot.body.applyForce(footPull, soleWorld.vsub(foot.body.position, relPoint));
      }
    });
    rb.force.z += (tz - rb.position.z) * rootK - rb.velocity.z * rootD;

    bodies.forEach((entry) => {
      const { body, parent, kr, dr } = entry;
      if (!parent) {
        // pelvis: rotate back upright (absolute)
        body.quaternion.conjugate(qErr);
        axisAngle(qErr, kr, torque);
        torque.x -= body.angularVelocity.x * dr;
        torque.y -= body.angularVelocity.y * dr;
        torque.z -= body.angularVelocity.z * dr;
        body.torque.vadd(torque, body.torque);
      } else {
        // swing: spring the tip toward its standing-pose spot on the parent
        const pb = parent.body;
        pb.pointToWorldFrame(entry.jointInParent, jointWorld);
        pb.quaternion.vmult(entry.tipFromJoint, tipTarget);
        tipTarget.vadd(jointWorld, tipTarget);
        body.pointToWorldFrame(entry.tipLocal, tipWorld);
        body.getVelocityAtWorldPoint(tipWorld, tipVel);
        pb.getVelocityAtWorldPoint(tipTarget, targetVel);
        pull.set(
          (tipTarget.x - tipWorld.x) * entry.kt + (targetVel.x - tipVel.x) * entry.ct,
          (tipTarget.y - tipWorld.y) * entry.kt + (targetVel.y - tipVel.y) * entry.ct,
          (tipTarget.z - tipWorld.z) * entry.kt + (targetVel.z - tipVel.z) * entry.ct,
        );
        // (cannon-es wants the point relative to the body's centre)
        body.applyForce(pull, tipWorld.vsub(body.position, relPoint));
        // Only part of the reaction goes back into the parent: with the full
        // equal-and-opposite pull, holding a leg up would twist the pelvis
        // and fold the whole torso.
        pull.scale(-TUNING.muscleReaction, pull);
        pb.applyForce(pull, jointWorld.vsub(pb.position, relPoint));

        // twist: only the part of the error about the bone's own axis
        pb.quaternion.conjugate(qParentInv);
        qParentInv.mult(body.quaternion, qErr);
        qErr.conjugate(qErr);
        axisAngle(qErr, kr, torque);
        pb.quaternion.vmult(torque, torque);
        body.quaternion.vmult(entry.axis, boneAxis);
        const twist = torque.dot(boneAxis);
        const spin = body.angularVelocity.vsub(pb.angularVelocity).dot(boneAxis);
        body.torque.addScaledVector(twist - spin * dr, boneAxis, body.torque);
      }

      // soft side walls: nothing drifts out of the frame
      const px = body.position.x;
      const over = px > 0 ? px - (bounds.x[1] - TUNING.frameMargin) : bounds.x[0] + TUNING.frameMargin - px;
      if (over > 0) {
        const sign = Math.sign(px);
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
  // drag / frame limits (figure space); the page can widen them to the
  // visible area with setBounds()
  let bounds = { ...TUNING.dragBounds };
  const setBounds = (next) => {
    bounds = { ...bounds, ...next };
  };
  const hand = new CANNON.Body({ mass: 0, type: CANNON.Body.KINEMATIC });
  hand.collisionFilterGroup = 0;
  hand.collisionFilterMask = 0;
  world.addBody(hand);
  let grip = null;

  // A limb can only reach so far from where it attaches to the torso
  // (shoulder, hip, neck, waist). Pulling past that would drag and fold the
  // whole body, so the target is held on the edge of that reach instead.
  let reach = null; // { centre, min, max } while dragging a limb/head/chest
  const limbRoot = (index) => {
    let bone = BONES[index];
    while (bone.parentIndex >= 0 && !["chest", "pelvis"].includes(BONES[bone.parentIndex].name)) {
      bone = BONES[bone.parentIndex];
    }
    return bone;
  };
  const dist3 = (a, b) => Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);

  const startDrag = (index, point) => {
    endDrag();
    const body = bodies[index].body;
    hand.position.set(point[0], point[1], point[2]);
    const pivot = body.pointToLocalFrame(new CANNON.Vec3(...point));
    grip = new CANNON.PointToPointConstraint(body, pivot, hand, new CANNON.Vec3(), TUNING.dragMaxForce);
    world.addConstraint(grip);

    reach = null;
    if (BONES[index].parentIndex < 0) return; // the pelvis itself: bounds only
    const root = limbRoot(index);
    // rest-pose path from the root joint down to the grabbed point
    const restPoint = [pivot.x + bodies[index].rest.x, pivot.y + bodies[index].rest.y, pivot.z + bodies[index].rest.z];
    const segments = [];
    let cone = 0;
    let bone = BONES[index];
    let from = restPoint;
    while (bone) {
      segments.push(dist3(from, bone.joint));
      cone += bone.cone;
      from = bone.joint;
      if (bone === root) break;
      bone = BONES[bone.parentIndex];
    }
    // reachable region is a shell: a single bone's end can only be exactly
    // its length away; a two-bone chain can fold in to |a - b|
    const total = segments.reduce((sum, v) => sum + v, 0);
    const longest = Math.max(...segments);
    // centred on where the root joint sits in the standing pose: following
    // the moving joint instead would feed back (the pull tips the torso, the
    // target follows, the torso tips further) until the body flips over
    reach = {
      centre: new CANNON.Vec3(...root.joint),
      // the limb can only swing so far from its standing direction (joint
      // limits); pulling beyond that would rotate the whole body instead
      axis: new CANNON.Vec3(root.b[0] - root.joint[0], root.b[1] - root.joint[1], root.b[2] - root.joint[2]).unit(),
      cone: Math.min(Math.PI, cone) * 0.95,
      min: Math.max(0, longest - (total - longest)) * 0.98,
      max: total * 0.98,
    };
  };
  const clamp = (v, [lo, hi]) => Math.max(lo, Math.min(hi, v));
  const moveDrag = (point) => {
    if (!grip) return;
    let [x, y, z] = point;
    if (reach) {
      let dx = x - reach.centre.x;
      let dy = y - reach.centre.y;
      let dz = z - reach.centre.z;
      const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const a = reach.axis;
      const along = (dx * a.x + dy * a.y + dz * a.z) / (len || 1);
      if (len > 1e-6 && Math.acos(Math.max(-1, Math.min(1, along))) > reach.cone) {
        // rotate the target back onto the edge of the cone
        let px = dx / len - along * a.x;
        let py = dy / len - along * a.y;
        let pz = dz / len - along * a.z;
        const pl = Math.sqrt(px * px + py * py + pz * pz);
        if (pl < 1e-6) {
          // straight opposite the axis: pick any sideways direction
          px = a.y !== 0 || a.z !== 0 ? 1 : 0;
          py = px ? 0 : 1;
          pz = 0;
        } else {
          px /= pl;
          py /= pl;
          pz /= pl;
        }
        const c = Math.cos(reach.cone);
        const sn = Math.sin(reach.cone);
        dx = (a.x * c + px * sn) * len;
        dy = (a.y * c + py * sn) * len;
        dz = (a.z * c + pz * sn) * len;
        x = reach.centre.x + dx;
        y = reach.centre.y + dy;
        z = reach.centre.z + dz;
      }
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const limit = d > reach.max ? reach.max : d < reach.min ? reach.min : d;
      if (limit !== d && d > 1e-6) {
        const k = limit / d;
        x = reach.centre.x + dx * k;
        y = reach.centre.y + dy * k;
        z = reach.centre.z + dz * k;
      }
    }
    const b = bounds;
    hand.position.set(clamp(x, b.x), clamp(y, b.y), clamp(z, b.z));
  };
  function endDrag() {
    if (grip) world.removeConstraint(grip);
    grip = null;
    reach = null;
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
    // The pelvis is the anchor: dragging it would just slide the whole body
    // and strain every joint. A click on the hips grabs that side's thigh.
    if (best && best.index === 0) {
      const side = best.point[0] >= 0 ? "thighP" : "thighN";
      best.index = BONES.findIndex((b) => b.name === side);
    }
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
  // Joints can open a little under hard pulls (the solver is iterative). For
  // drawing, each child is shifted so its joint sits exactly on its parent's:
  // the skeleton you see is always connected. Parents come before children
  // in BONES, so offsets accumulate down each chain.
  const drawOffset = BONES.map(() => new CANNON.Vec3());
  const jointA = new CANNON.Vec3();
  const jointB = new CANNON.Vec3();
  const jointRel = new CANNON.Vec3();
  const writeBoneMatrices = (out) => {
    bodies.forEach((entry, i) => {
      const bone = entry.bone;
      if (bone.parentIndex < 0) drawOffset[i].setZero();
      else {
        const parent = bodies[bone.parentIndex];
        jointRel.set(bone.joint[0] - parent.rest.x, bone.joint[1] - parent.rest.y, bone.joint[2] - parent.rest.z);
        parent.body.pointToWorldFrame(jointRel, jointA);
        jointRel.set(bone.joint[0] - entry.rest.x, bone.joint[1] - entry.rest.y, bone.joint[2] - entry.rest.z);
        entry.body.pointToWorldFrame(jointRel, jointB);
        jointA.vsub(jointB, drawOffset[i]);
        drawOffset[i].vadd(drawOffset[bone.parentIndex], drawOffset[i]);
      }
    });
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
      const off = drawOffset[i];
      out[o + 12] = p.x + off.x - (r00 * c.x + r01 * c.y + r02 * c.z);
      out[o + 13] = p.y + off.y - (r10 * c.x + r11 * c.y + r12 * c.z);
      out[o + 14] = p.z + off.z - (r20 * c.x + r21 * c.y + r22 * c.z);
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
    setBounds,
    setGravity,
    resetGravity,
    setInertial,
    writeBoneMatrices,
    bodies,
    boneCount: bodies.length,
    gravity: TUNING.gravity,
  };
};
