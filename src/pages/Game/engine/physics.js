import * as CANNON from "cannon-es";
import { buildPrism, prismProfile } from "./layout.js";

export const GRAVITY = 25;

export const createPhysics = () => {
  const world = new CANNON.World({
    gravity: new CANNON.Vec3(0, -GRAVITY, 0),
    allowSleep: true,
  });
  world.broadphase = new CANNON.SAPBroadphase(world);
  world.solver.iterations = 10;
  world.defaultContactMaterial.friction = 0.3;
  world.defaultContactMaterial.restitution = 0.15;

  const materials = {
    ground: new CANNON.Material("ground"),
    chassis: new CANNON.Material("chassis"),
    prop: new CANNON.Material("prop"),
    bouncy: new CANNON.Material("bouncy"),
  };
  const pair = (a, b, friction, restitution) =>
    world.addContactMaterial(
      new CANNON.ContactMaterial(materials[a], materials[b], { friction, restitution }),
    );
  pair("ground", "chassis", 0.05, 0.1);
  pair("ground", "prop", 0.45, 0.15);
  pair("prop", "prop", 0.35, 0.1);
  pair("chassis", "prop", 0.1, 0.25);
  pair("ground", "bouncy", 0.4, 0.65);
  pair("chassis", "bouncy", 0.05, 0.55);
  pair("prop", "bouncy", 0.2, 0.5);

  const groundBody = new CANNON.Body({ mass: 0, material: materials.ground });
  groundBody.addShape(new CANNON.Plane());
  groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
  world.addBody(groundBody);

  const addStatic = (shape, x, y, z, yaw = 0) => {
    const body = new CANNON.Body({ mass: 0, material: materials.ground });
    body.addShape(shape);
    body.position.set(x, y, z);
    if (yaw) body.quaternion.setFromEuler(0, yaw, 0);
    world.addBody(body);
    return body;
  };

  const addStaticBox = (x, y, z, w, h, d, yaw = 0) =>
    addStatic(new CANNON.Box(new CANNON.Vec3(w / 2, h / 2, d / 2)), x, y, z, yaw);

  const addStaticCylinder = (x, z, r, h) =>
    addStatic(new CANNON.Cylinder(r, r, h, 10), x, h / 2, z);

  const addStaticSphere = (x, y, z, r) => addStatic(new CANNON.Sphere(r), x, y, z);

  const addRamp = (r) => {
    const { vertices, faces } = buildPrism(prismProfile(r), r.width);
    const shape = new CANNON.ConvexPolyhedron({
      vertices: vertices.map(([x, y, z]) => new CANNON.Vec3(x, y, z)),
      faces,
    });
    return addStatic(shape, r.x, 0, r.z, r.yaw);
  };

  return {
    world,
    materials,
    groundBody,
    addStaticBox,
    addStaticCylinder,
    addStaticSphere,
    addRamp,
  };
};
