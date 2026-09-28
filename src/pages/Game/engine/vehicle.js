import * as CANNON from "cannon-es";

// Raycast-vehicle tuning. The car model is ~4.6 units long, with its nose on
// local +X and the axle along local Z.
export const VEHICLE = {
  mass: 150,
  wheelRadius: 0.62,
  wheelX: 1.55,
  wheelZ: 1.15,
  engineForce: 900,
  reverseForce: 520,
  maxSpeed: 36,
  maxSpeedBoost: 56,
  maxReverse: 14,
  brake: 14,
  idleBrake: 1.2,
  maxSteer: 0.6,
  minSteer: 0.2, // steering lock at top speed
  steerSpeed: 9,
  grip: 4.2,
  driftGrip: 2.3,
};

const FORWARD = new CANNON.Vec3(1, 0, 0);
const UP = new CANNON.Vec3(0, 1, 0);

export const createVehicle = ({ world, materials }, spawn) => {
  const chassisBody = new CANNON.Body({
    mass: VEHICLE.mass,
    material: materials.chassis,
    allowSleep: false,
    angularDamping: 0.45,
    linearDamping: 0.02,
  });
  // Low slab for the body plus a smaller cabin block, so a flipped car rests
  // on its roll bar instead of sinking into the ground.
  chassisBody.addShape(
    new CANNON.Box(new CANNON.Vec3(2.4, 0.5, 1.15)),
    new CANNON.Vec3(0, 0.2, 0),
  );
  chassisBody.addShape(
    new CANNON.Box(new CANNON.Vec3(1.1, 0.45, 1.0)),
    new CANNON.Vec3(-0.6, 1.1, 0),
  );

  const vehicle = new CANNON.RaycastVehicle({
    chassisBody,
    indexRightAxis: 2,
    indexUpAxis: 1,
    indexForwardAxis: 0,
  });

  const wheelOptions = {
    radius: VEHICLE.wheelRadius,
    directionLocal: new CANNON.Vec3(0, -1, 0),
    axleLocal: new CANNON.Vec3(0, 0, 1),
    suspensionStiffness: 38,
    suspensionRestLength: 0.5,
    frictionSlip: VEHICLE.grip,
    dampingRelaxation: 2.6,
    dampingCompression: 4.2,
    maxSuspensionForce: 1e6,
    rollInfluence: 0.02,
    maxSuspensionTravel: 0.45,
    customSlidingRotationalSpeed: -30,
    useCustomSlidingRotationalSpeed: true,
    chassisConnectionPointLocal: new CANNON.Vec3(),
  };
  // 0: front-left, 1: front-right, 2: rear-left, 3: rear-right
  [
    [VEHICLE.wheelX, VEHICLE.wheelZ],
    [VEHICLE.wheelX, -VEHICLE.wheelZ],
    [-VEHICLE.wheelX, VEHICLE.wheelZ],
    [-VEHICLE.wheelX, -VEHICLE.wheelZ],
  ].forEach(([x, z]) => {
    wheelOptions.chassisConnectionPointLocal.set(x, 0, z);
    vehicle.addWheel({ ...wheelOptions, chassisConnectionPointLocal: new CANNON.Vec3(x, 0, z) });
  });
  vehicle.addToWorld(world);

  const state = {
    steer: 0,
    forwardSpeed: 0,
    braking: false,
    reversing: false,
    drifting: false,
    boosting: false,
    wheelsOnGround: 0,
    upright: 1,
    flippedTime: 0,
  };

  const forward = new CANNON.Vec3();
  const up = new CANNON.Vec3();

  const place = (x, y, z, yaw) => {
    chassisBody.position.set(x, y, z);
    chassisBody.quaternion.setFromEuler(0, yaw, 0);
    chassisBody.velocity.setZero();
    chassisBody.angularVelocity.setZero();
    chassisBody.force.setZero();
    chassisBody.torque.setZero();
    state.steer = 0;
    state.flippedTime = 0;
  };
  place(spawn.x, 1.6, spawn.z, spawn.yaw);

  // Keep position, drop it upright a little above where it is.
  const unflip = () => {
    const p = chassisBody.position;
    chassisBody.quaternion.vmult(FORWARD, forward);
    const yaw = Math.atan2(-forward.z, forward.x);
    place(p.x, Math.max(p.y, 0) + 2.5, p.z, yaw);
  };

  const update = (input, dt) => {
    chassisBody.quaternion.vmult(FORWARD, forward);
    chassisBody.quaternion.vmult(UP, up);
    const speed = chassisBody.velocity.dot(forward);
    state.forwardSpeed = speed;
    state.upright = up.y;

    state.wheelsOnGround = 0;
    for (let i = 0; i < 4; i++) {
      if (vehicle.wheelInfos[i].isInContact) state.wheelsOnGround++;
    }

    // Steering: tighter at low speed, eases toward the target.
    const speedRatio = Math.min(Math.abs(speed) / VEHICLE.maxSpeed, 1);
    const lock = VEHICLE.maxSteer + (VEHICLE.minSteer - VEHICLE.maxSteer) * speedRatio;
    const target = input.steer * lock;
    state.steer += (target - state.steer) * Math.min(1, dt * VEHICLE.steerSpeed);
    vehicle.setSteeringValue(state.steer, 0);
    vehicle.setSteeringValue(state.steer, 1);

    // Throttle / brake / reverse
    let engine = 0;
    let brake = 0;
    state.braking = false;
    state.reversing = false;
    state.boosting = false;
    const maxSpeed = input.boost ? VEHICLE.maxSpeedBoost : VEHICLE.maxSpeed;
    if (input.throttle > 0) {
      if (speed < -1) {
        brake = VEHICLE.brake;
        state.braking = true;
      } else if (speed < maxSpeed) {
        engine = VEHICLE.engineForce * (input.boost ? 1.7 : 1);
        state.boosting = !!input.boost;
      }
    } else if (input.throttle < 0) {
      if (speed > 1) {
        brake = VEHICLE.brake;
        state.braking = true;
      } else if (speed > -VEHICLE.maxReverse) {
        engine = -VEHICLE.reverseForce;
        state.reversing = true;
      }
    } else {
      brake = VEHICLE.idleBrake;
    }

    for (let i = 0; i < 4; i++) {
      vehicle.applyEngineForce(engine, i);
      vehicle.setBrake(brake, i);
    }

    // Handbrake: lock + loosen the rear so the tail steps out.
    state.drifting = !!input.handbrake;
    const rearGrip = input.handbrake ? VEHICLE.driftGrip : VEHICLE.grip;
    for (let i = 2; i < 4; i++) {
      vehicle.wheelInfos[i].frictionSlip = rearGrip;
      if (input.handbrake) {
        vehicle.setBrake(VEHICLE.brake * 0.12, i);
        vehicle.applyEngineForce(0, i);
      }
    }
    if (input.handbrake) {
      state.braking = true;
      // Cap the yaw rate so a handbrake turn slides instead of spinning out.
      const av = chassisBody.angularVelocity;
      av.y = Math.max(-2.8, Math.min(2.8, av.y));
    }

    // Upside down and nearly stopped for a while → the UI offers a reset.
    if (up.y < 0.3 && chassisBody.velocity.length() < 3) state.flippedTime += dt;
    else state.flippedTime = 0;
  };

  return { vehicle, chassisBody, state, update, place, unflip };
};
