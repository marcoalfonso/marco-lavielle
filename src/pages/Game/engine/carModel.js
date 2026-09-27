import * as THREE from "three";
import { COLORS, matte } from "./materials.js";

// Model coordinates: ground at y = 0, wheel centres at y = 0.62, nose on +X.
// The physics body origin sits 0.96 above the ground at rest, so the body
// group is shifted down by that much.
const BODY_OFFSET_Y = -0.96;

export const createCarModel = (scene) => {
  const group = new THREE.Group(); // follows the chassis body
  const body = new THREE.Group();
  body.position.y = BODY_OFFSET_Y;
  group.add(body);

  const paint = matte(COLORS.carBody, { shininess: 40 });
  const darkPaint = matte(COLORS.carDark, { shininess: 30 });
  const glass = matte(COLORS.glass, { transparent: true, opacity: 0.75, shininess: 80 });
  const tireMat = matte(COLORS.tire);
  const hubMat = matte(COLORS.hub);
  const trimMat = matte(0x5a564e);

  const box = (w, h, d, mat, x, y, z, cast = true) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = cast;
    body.add(m);
    return m;
  };

  box(4.6, 0.9, 2.3, paint, 0, 1.0, 0);
  box(1.5, 0.35, 2.1, darkPaint, 1.5, 1.6, 0);
  // wheel arches
  [1.55, -1.55].forEach((x) =>
    [1.2, -1.2].forEach((z) => box(1.7, 0.18, 0.5, darkPaint, x, 1.5, z)),
  );
  // windshield leans back toward the cabin, with a painted frame
  const windshield = box(0.1, 1.0, 1.9, glass, 0.78, 2.05, 0, false);
  windshield.rotation.z = 0.28;
  const frameTop = box(0.14, 0.12, 2.1, darkPaint, 0.64, 2.53, 0);
  frameTop.rotation.z = 0.28;
  [0.98, -0.98].forEach((z) => {
    const post = box(0.12, 1.05, 0.12, darkPaint, 0.78, 2.05, z);
    post.rotation.z = 0.28;
  });
  // dashboard
  box(0.4, 0.34, 2.05, trimMat, 0.46, 1.9, 0);
  const seatMat = matte(0x4a443c);
  [-0.55, 0.55].forEach((z) => {
    box(0.8, 0.35, 0.78, seatMat, -0.7, 2.02, z); // cushion
    const back = box(0.2, 0.95, 0.78, seatMat, -1.12, 2.55, z);
    back.rotation.z = -0.12;
  });
  box(0.25, 1.1, 2.2, darkPaint, -1.6, 2.0, 0);
  box(0.25, 0.25, 2.2, darkPaint, -1.6, 2.55, 0);

  // spare tyre
  const spareGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.35, 14);
  spareGeo.rotateZ(Math.PI / 2);
  const spare = new THREE.Mesh(spareGeo, tireMat);
  spare.position.set(-2.5, 1.4, 0);
  spare.castShadow = true;
  body.add(spare);

  // bumpers
  [2.4, -2.4].forEach((x) => box(0.3, 0.4, 2.35, trimMat, x, 0.8, 0));

  // lights
  const headMat = matte(0xfff3c0, { emissive: 0xffe9a8, emissiveIntensity: 0.4 });
  const tailMat = matte(0xd14b3a, { emissive: 0xff2a10, emissiveIntensity: 0.25 });
  const reverseMat = matte(0xf5f2ea, { emissive: 0xffffff, emissiveIntensity: 0 });
  [0.8, -0.8].forEach((z) => {
    box(0.15, 0.3, 0.4, headMat, 2.32, 1.35, z, false);
    box(0.12, 0.25, 0.4, tailMat, -2.32, 1.35, z, false);
  });
  box(0.1, 0.18, 0.25, reverseMat, -2.33, 1.08, 0.45, false);

  // driver (sits on the right-hand seat, z = +0.55)
  const DZ = 0.55;
  const shirt = matte(0x6f8094);
  const skin = matte(0xe8c3a0);
  const cap = matte(0xe2c14d);
  const torso = box(0.44, 0.72, 0.6, shirt, -0.78, 2.56, DZ);
  torso.rotation.z = -0.12; // leaning back into the seat
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3, 1), skin);
  head.position.set(-0.8, 3.2, DZ);
  head.castShadow = true;
  body.add(head);
  const capTop = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.2, 10), cap);
  capTop.position.set(-0.8, 3.42, DZ);
  body.add(capTop);
  box(0.32, 0.05, 0.46, cap, -0.52, 3.35, DZ, false);

  // steering wheel: column from the dashboard, wheel tilted toward the
  // driver. wheelPivot sets the tilt; wheelSpin turns with the steering.
  const WHEEL_R = 0.34;
  const WHEEL_CENTER = new THREE.Vector3(-0.08, 2.42, DZ);
  const tilt = 0.55;
  const wheelNormal = new THREE.Vector3(-Math.cos(tilt), Math.sin(tilt), 0); // faces the driver
  const wheelAcross = new THREE.Vector3(0, 0, 1);
  const wheelUp = new THREE.Vector3().crossVectors(wheelNormal, wheelAcross);
  const wheelPivot = new THREE.Group();
  wheelPivot.position.copy(WHEEL_CENTER);
  wheelPivot.quaternion.setFromRotationMatrix(
    new THREE.Matrix4().makeBasis(wheelAcross, wheelUp, wheelNormal),
  );
  body.add(wheelPivot);
  const wheelSpin = new THREE.Group();
  wheelPivot.add(wheelSpin);
  const wheelMat = matte(0x2f2c28);
  wheelSpin.add(new THREE.Mesh(new THREE.TorusGeometry(WHEEL_R, 0.045, 6, 18), wheelMat));
  const hubCap = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.06, 8), wheelMat);
  hubCap.rotation.x = Math.PI / 2;
  wheelSpin.add(hubCap);
  [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3].forEach((a) => {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.04, WHEEL_R, 0.03), wheelMat);
    spoke.position.set(Math.sin(a) * (WHEEL_R / 2), -Math.cos(a) * (WHEEL_R / 2), 0);
    spoke.rotation.z = a;
    wheelSpin.add(spoke);
  });
  // column: from the dashboard to the back of the wheel
  const columnFrom = new THREE.Vector3(0.42, 2.0, DZ);
  const columnTo = WHEEL_CENTER.clone().addScaledVector(wheelNormal, -0.05);
  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  const place = (mesh, from, to) => {
    const dir = new THREE.Vector3().subVectors(to, from);
    mesh.position.copy(from).addScaledVector(dir, 0.5);
    mesh.scale.y = dir.length();
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  };
  const column = new THREE.Mesh(unitBox, wheelMat);
  column.scale.set(0.07, 1, 0.07);
  place(column, columnFrom, columnTo);
  body.add(column);

  // legs: thighs along the cushion, knees bent under the wheel, feet in the
  // footwell below the dashboard
  const pants = matte(0x3f4a5c);
  const shoe = matte(0x2f2c28);
  const limb = (mat, from, to, thickness) => {
    const mesh = new THREE.Mesh(unitBox, mat);
    place(mesh, from, to);
    mesh.scale.x = mesh.scale.z = thickness;
    mesh.castShadow = true;
    body.add(mesh);
  };
  box(0.36, 0.2, 0.52, pants, -0.8, 2.28, DZ); // hips / lap
  [-1, 1].forEach((side) => {
    const z = DZ + side * 0.15;
    const hip = new THREE.Vector3(-0.78, 2.3, z);
    const knee = new THREE.Vector3(-0.05, 2.36, z + side * 0.03);
    const ankle = new THREE.Vector3(0.2, 1.62, z + side * 0.03);
    limb(pants, hip, knee, 0.2);
    limb(pants, knee, ankle, 0.17);
    const kneeCap = new THREE.Mesh(new THREE.IcosahedronGeometry(0.11, 0), pants);
    kneeCap.position.copy(knee);
    body.add(kneeCap);
    box(0.34, 0.14, 0.18, shoe, ankle.x + 0.1, 1.54, ankle.z);
  });

  // hands ride on the rim at "ten and two"; arms are re-solved every frame
  const grips = [-1, 1].map((side) => {
    const marker = new THREE.Object3D();
    const a = side * 0.95; // radians from the top of the wheel
    marker.position.set(Math.sin(a) * WHEEL_R, Math.cos(a) * WHEEL_R, 0.02);
    wheelSpin.add(marker);
    const hand = new THREE.Mesh(new THREE.IcosahedronGeometry(0.085, 0), skin);
    body.add(hand);
    const upper = new THREE.Mesh(unitBox, shirt);
    upper.scale.set(0.15, 1, 0.15);
    upper.castShadow = true;
    const fore = new THREE.Mesh(unitBox, skin);
    fore.scale.set(0.11, 1, 0.11);
    body.add(upper, fore);
    return { side, marker, hand, upper, fore, shoulder: new THREE.Vector3(-0.72, 2.84, DZ + side * 0.3) };
  });
  const handPos = new THREE.Vector3();
  const elbow = new THREE.Vector3();
  const updateDriver = (steer) => {
    wheelSpin.rotation.z = steer * 2.2;
    group.updateMatrixWorld(true);
    grips.forEach((g) => {
      body.worldToLocal(g.marker.getWorldPosition(handPos));
      g.hand.position.copy(handPos);
      // elbow: halfway, dropped a little and pushed outward
      elbow.addVectors(g.shoulder, handPos).multiplyScalar(0.5);
      elbow.y -= 0.14;
      elbow.z += g.side * 0.1;
      place(g.upper, g.shoulder, elbow);
      g.upper.scale.x = g.upper.scale.z = 0.15;
      place(g.fore, elbow, handPos);
      g.fore.scale.x = g.fore.scale.z = 0.11;
    });
  };

  // antenna: pivots at the roll bar, wobbles on a spring
  const antennaPivot = new THREE.Group();
  antennaPivot.position.set(-1.6, 2.65, -0.9);
  body.add(antennaPivot);
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.045, 2.4, 5), trimMat);
  antenna.position.y = 1.2;
  antennaPivot.add(antenna);
  const flag = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 0), matte(COLORS.pinStripe));
  flag.position.y = 2.4;
  antennaPivot.add(flag);
  const spring = { x: 0, z: 0, vx: 0, vz: 0 };

  // headlights: one spot + two soft beams, only visible at night
  const headlight = new THREE.SpotLight(0xfff1c8, 0, 55, 0.55, 0.6, 1.2);
  headlight.position.set(2.4, 1.4, 0);
  headlight.target.position.set(14, -1.5, 0);
  body.add(headlight);
  body.add(headlight.target);
  const beamGeo = new THREE.ConeGeometry(1.8, 9, 16, 4, true);
  beamGeo.translate(0, -4.5, 0);
  // fade toward the far end (black = invisible with additive blending)
  const beamPos = beamGeo.getAttribute("position");
  const beamCol = [];
  for (let i = 0; i < beamPos.count; i++) {
    const k = Math.max(0, 1 + beamPos.getY(i) / 9);
    beamCol.push(k, k, k);
  }
  beamGeo.setAttribute("color", new THREE.Float32BufferAttribute(beamCol, 3));
  beamGeo.rotateZ(Math.PI / 2 + 0.12);
  const beamMat = new THREE.MeshBasicMaterial({
    vertexColors: true,
    color: 0xfff1c8,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  [0.8, -0.8].forEach((z) => {
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.set(2.4, 1.35, z);
    body.add(beam);
  });

  scene.add(group);

  // wheels live in world space, driven by the raycast vehicle
  const wheelGeo = new THREE.CylinderGeometry(0.62, 0.62, 0.45, 14);
  wheelGeo.rotateX(Math.PI / 2);
  const hubGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.47, 8);
  hubGeo.rotateX(Math.PI / 2);
  const spokeGeo = new THREE.BoxGeometry(1.0, 0.14, 0.49);
  const wheels = [0, 1, 2, 3].map(() => {
    const w = new THREE.Group();
    const tire = new THREE.Mesh(wheelGeo, tireMat);
    tire.castShadow = true;
    w.add(tire);
    w.add(new THREE.Mesh(hubGeo, hubMat));
    w.add(new THREE.Mesh(spokeGeo, hubMat));
    const spoke2 = new THREE.Mesh(spokeGeo, hubMat);
    spoke2.rotation.z = Math.PI / 2;
    w.add(spoke2);
    scene.add(w);
    return w;
  });

  const prevVel = new THREE.Vector3();
  const accel = new THREE.Vector3();
  const invQuat = new THREE.Quaternion();

  const update = ({ chassisBody, vehicle, state, dt, night }) => {
    group.position.copy(chassisBody.position);
    group.quaternion.copy(chassisBody.quaternion);

    for (let i = 0; i < 4; i++) {
      // updateWheelTransform() clears isInContact as a side effect; keep it
      // so ground contact stays readable until the next physics step.
      const contact = vehicle.wheelInfos[i].isInContact;
      vehicle.updateWheelTransform(i);
      vehicle.wheelInfos[i].isInContact = contact;
      const t = vehicle.wheelInfos[i].worldTransform;
      wheels[i].position.copy(t.position);
      wheels[i].quaternion.copy(t.quaternion);
    }

    // antenna spring driven by the body's acceleration in local space
    if (dt > 0) {
      accel.copy(chassisBody.velocity).sub(prevVel).divideScalar(dt);
      invQuat.copy(group.quaternion).invert();
      accel.applyQuaternion(invQuat);
    }
    prevVel.copy(chassisBody.velocity);
    const k = 120;
    const damping = 6;
    spring.vz += (-k * spring.z - damping * spring.vz + accel.x * 0.9) * dt;
    spring.vx += (-k * spring.x - damping * spring.vx - accel.z * 0.9) * dt;
    spring.z = Math.max(-0.9, Math.min(0.9, spring.z + spring.vz * dt));
    spring.x = Math.max(-0.9, Math.min(0.9, spring.x + spring.vx * dt));
    antennaPivot.rotation.z = spring.z;
    antennaPivot.rotation.x = spring.x;

    updateDriver(state.steer);

    tailMat.emissiveIntensity = state.braking ? 1.6 : 0.25 + night * 0.5;
    reverseMat.emissiveIntensity = state.reversing ? 1.2 : 0;
    headMat.emissiveIntensity = 0.4 + night * 1.2;
    headlight.intensity = night * 2.2;
    beamMat.opacity = night * 0.14;
  };

  // exhaust in body-group coordinates (behind the rear bumper, low)
  const exhaust = new THREE.Vector3(-2.6, 0.75, -0.7);

  return { group, body, update, exhaust };
};
