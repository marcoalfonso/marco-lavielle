import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { askForMotion } from "components/motion/useDeviceTilt";

import { buildBodyPoints, BODY_HEIGHT, BONES } from "./bodyPoints";
import { createRagdoll } from "./ragdoll";

// ---------------------------------------------------------------------------
// Holographic body scan (in the spirit of gyrosco.pe): a standing figure drawn
// as a glowing point cloud, a scan band sweeping up and down, and a HUD
// platform under the feet. The figure itself comes from ./bodyPoints.
//
// The figure is an active rag doll (./ragdoll): on desktop its parts can be
// grabbed and dragged with the mouse; on phones, tilting and moving the phone
// sways and jostles it. Points are skinned to the rag doll's bones in the
// vertex shader, blending across joints so bends stay smooth.
// ---------------------------------------------------------------------------

const BONE_COUNT = BONES.length;

const bodyVertexShader = `
  uniform float uTime;
  uniform float uScan;
  uniform float uReveal;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform mat4 uBones[${BONE_COUNT}];
  uniform float uHot;
  uniform float uHotAmount;
  attribute float aRand;
  attribute float aBone;
  attribute float aBone2;
  attribute float aWeight;
  varying float vRim;
  varying float vScan;
  varying float vTwinkle;
  varying float vY;
  varying float vHot;
  void main() {
    mat4 boneA = uBones[int(aBone + 0.5)];
    mat4 boneB = uBones[int(aBone2 + 0.5)];
    vec4 skinned = mix(boneA * vec4(position, 1.0), boneB * vec4(position, 1.0), aWeight);
    vec3 skinnedNormal = mix(mat3(boneA) * normal, mat3(boneB) * normal, aWeight);
    vec4 mv = modelViewMatrix * skinned;
    vec3 n = normalize(normalMatrix * skinnedNormal);
    vRim = 1.0 - abs(dot(n, normalize(-mv.xyz)));
    // the scan band follows the body (rest-pose height): a limb lifted
    // horizontal must not light up and swell along its whole length
    float d = position.y - uScan;
    vScan = exp(-d * d / 0.0016);
    vTwinkle = 0.7 + 0.3 * sin(uTime * 2.3 + aRand * 60.0);
    vY = skinned.y;
    vHot = uHotAmount * ((abs(aBone - uHot) < 0.5 ? 1.0 - aWeight : 0.0) + (abs(aBone2 - uHot) < 0.5 ? aWeight : 0.0));
    float revealed = step(position.y, uReveal * ${BODY_HEIGHT.toFixed(2)} + aRand * 0.05);
    gl_PointSize = revealed * uSize * uPixelRatio * (1.0 + vScan * 0.45 + vHot * 0.25) / -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const bodyFragmentShader = `
  uniform vec3 uColor;
  uniform vec3 uScanColor;
  varying float vRim;
  varying float vScan;
  varying float vTwinkle;
  varying float vY;
  varying float vHot;
  void main() {
    float r = length(gl_PointCoord - 0.5);
    if (r > 0.5) discard;
    float soft = smoothstep(0.5, 0.05, r);
    float body = 0.42 + 0.75 * pow(vRim, 2.0);
    float lines = 0.8 + 0.2 * sin(vY * 430.0);
    vec3 color = mix(uColor, uScanColor, clamp(vScan * 1.2 + vHot * 0.55, 0.0, 1.0));
    float a = (body * lines * vTwinkle + vScan * 0.85 + vHot * 0.3) * soft;
    gl_FragColor = vec4(color * a, a);
  }
`;

const glowTexture = () => {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d");
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(90, 190, 255, 0.55)");
  g.addColorStop(0.45, "rgba(60, 140, 255, 0.16)");
  g.addColorStop(1, "rgba(40, 110, 255, 0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
};

const circlePoints = (radius, segments = 128) => {
  const pts = [];
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
  }
  return pts;
};

// iPhones only share motion data after the visitor grants permission, and
// the request has to come from a tap.
const canAskForMotion = () =>
  typeof window !== "undefined" &&
  typeof window.DeviceMotionEvent !== "undefined" &&
  typeof window.DeviceMotionEvent.requestPermission === "function";

const isTouchDevice = () =>
  typeof window !== "undefined" && window.matchMedia && window.matchMedia("(pointer: coarse)").matches;

const BodyHologram = ({ className }) => {
  const slotRef = useRef(null); // the figure's place in the layout
  const mountRef = useRef(null); // the canvas: stretched over the whole section
  const motionRef = useRef(null); // { start } once the scene is set up
  const [showMotionHint, setShowMotionHint] = useState(false);
  const [motionDenied, setMotionDenied] = useState(false);
  const [showDragHint, setShowDragHint] = useState(false);

  const requestMotion = () => {
    setShowMotionHint(false);
    askForMotion().then((granted) => {
      if (!granted) setMotionDenied(true);
      else if (motionRef.current) motionRef.current.start();
    });
  };

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const reduceMotion =
      window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const small = window.innerWidth < 768;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
    // aimed slightly low so the figure + platform sit centred in the frame
    camera.position.set(0, 1.02, 4.3);
    camera.lookAt(0, 0.84, 0);

    const disposables = [];
    const track = (...items) => {
      disposables.push(...items);
      return items[0];
    };

    // --- the body
    const points = buildBodyPoints(small ? 18000 : 34000);
    const bodyGeometry = track(new THREE.BufferGeometry());
    bodyGeometry.setAttribute("position", new THREE.BufferAttribute(points.positions, 3));
    bodyGeometry.setAttribute("normal", new THREE.BufferAttribute(points.normals, 3));
    bodyGeometry.setAttribute("aRand", new THREE.BufferAttribute(points.randoms, 1));
    bodyGeometry.setAttribute("aBone", new THREE.BufferAttribute(points.bones, 1));
    bodyGeometry.setAttribute("aBone2", new THREE.BufferAttribute(points.bones2, 1));
    bodyGeometry.setAttribute("aWeight", new THREE.BufferAttribute(points.weights, 1));
    // skinning moves points outside the rest-pose bounds; never cull the doll
    bodyGeometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.9, 0), 3);
    const boneMatrices = BONES.map(() => new THREE.Matrix4());
    const boneBuffer = new Float32Array(BONE_COUNT * 16);
    const bodyMaterial = track(
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uScan: { value: 1.2 },
          uReveal: { value: reduceMotion ? 1.1 : 0 },
          uSize: { value: small ? 13 : 11 },
          uPixelRatio: { value: renderer.getPixelRatio() },
          uColor: { value: new THREE.Color(0x3d8bff) },
          uScanColor: { value: new THREE.Color(0x6ff5ee) },
          uBones: { value: boneMatrices },
          uHot: { value: -1 },
          uHotAmount: { value: 0 },
        },
        vertexShader: bodyVertexShader,
        fragmentShader: bodyFragmentShader,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    const figure = new THREE.Group();
    const cloud = new THREE.Points(bodyGeometry, bodyMaterial);
    cloud.frustumCulled = false;
    figure.add(cloud);
    scene.add(figure);

    const ragdoll = createRagdoll();

    // --- HUD: platform rings, glow, background circles
    const hud = new THREE.Group();
    scene.add(hud);
    const lineMaterial = (opacity, color = 0x5fb4ff) =>
      track(
        new THREE.LineBasicMaterial({
          color,
          transparent: true,
          opacity,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
    const ring = (radius, opacity, y = 0.002) => {
      const geo = track(new THREE.BufferGeometry().setFromPoints(circlePoints(radius)));
      const line = new THREE.Line(geo, lineMaterial(opacity));
      line.position.y = y;
      hud.add(line);
      return line;
    };
    ring(0.34, 0.55);
    ring(0.38, 0.28);
    ring(0.56, 0.18);
    ring(0.68, 0.08);

    const dashedGeo = track(new THREE.BufferGeometry().setFromPoints(circlePoints(0.47, 180)));
    const dashed = new THREE.Line(
      dashedGeo,
      track(
        new THREE.LineDashedMaterial({
          color: 0x7cc8ff,
          dashSize: 0.03,
          gapSize: 0.045,
          transparent: true,
          opacity: 0.45,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      ),
    );
    dashed.computeLineDistances();
    dashed.position.y = 0.003;
    hud.add(dashed);

    // tick marks around the outer ring
    const ticks = [];
    for (let i = 0; i < 72; i++) {
      const a = (i / 72) * Math.PI * 2;
      const r0 = 0.59;
      const r1 = i % 6 === 0 ? 0.64 : 0.615;
      ticks.push(
        new THREE.Vector3(Math.cos(a) * r0, 0, Math.sin(a) * r0),
        new THREE.Vector3(Math.cos(a) * r1, 0, Math.sin(a) * r1),
      );
    }
    const tickLines = new THREE.LineSegments(
      track(new THREE.BufferGeometry().setFromPoints(ticks)),
      lineMaterial(0.22),
    );
    tickLines.position.y = 0.002;
    hud.add(tickLines);

    const glowTex = track(glowTexture());
    const glow = new THREE.Mesh(
      track(new THREE.PlaneGeometry(1.5, 1.5)),
      track(
        new THREE.MeshBasicMaterial({
          map: glowTex,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      ),
    );
    glow.rotation.x = -Math.PI / 2;
    hud.add(glow);

    // faint vertical circles behind the figure
    const backdrop = new THREE.Group();
    [0.72, 0.79].forEach((radius, i) => {
      const geo = track(new THREE.BufferGeometry().setFromPoints(circlePoints(radius, 160)));
      const line = new THREE.Line(geo, lineMaterial(i === 0 ? 0.1 : 0.06));
      line.rotation.x = Math.PI / 2;
      backdrop.add(line);
    });
    backdrop.position.set(0, 0.92, -0.45);
    scene.add(backdrop);

    // scan plane: a thin halo that rides the scan band
    const halo = new THREE.Line(
      track(new THREE.BufferGeometry().setFromPoints(circlePoints(0.34, 96))),
      lineMaterial(0.0, 0x7ff7ef),
    );
    scene.add(halo);

    // --- sizing, visibility, pointer
    let redrawStatic = null; // set when there's no animation loop (reduced motion)
    // The canvas covers the whole black section so dragged limbs never hit a
    // visible edge; the camera is offset so the figure stays framed in its
    // own slot (the first column), exactly as if the canvas were that size.
    const slot = slotRef.current;
    const section = slot.closest(".personal-info") || slot;
    const edgeNdc = [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ];
    const edgeRay = new THREE.Raycaster();
    const edgeHit = new THREE.Vector3();
    const facingPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const ndcPoint = new THREE.Vector2();
    const resize = () => {
      const slotBox = slot.getBoundingClientRect();
      const sectionBox = section.getBoundingClientRect();
      const left = sectionBox.left - slotBox.left;
      const top = sectionBox.top - slotBox.top;
      const w = Math.max(1, sectionBox.width);
      const h = Math.max(1, sectionBox.height);
      Object.assign(mount.style, { left: `${left}px`, top: `${top}px`, width: `${w}px`, height: `${h}px` });
      renderer.setSize(w, h, false);

      const sw = Math.max(1, slotBox.width);
      const sh = Math.max(1, slotBox.height);
      camera.aspect = sw / sh;
      // Fit the platform (~0.8 m either side) horizontally and the full
      // height vertically, whichever needs the wider field of view.
      const distance = camera.position.z;
      const fitWidth = (2 * Math.atan(0.8 / (distance * camera.aspect)) * 180) / Math.PI;
      camera.fov = Math.max(28, fitWidth);
      // the canvas starts (left, top) from the slot's corner, in slot pixels
      camera.setViewOffset(sw, sh, left, top, w, h);
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();

      // Everything the canvas shows, on the figure's plane: that's how far
      // dragged limbs may go (a little inside the edges).
      let minX = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      edgeNdc.forEach(([x, y]) => {
        edgeRay.setFromCamera(ndcPoint.set(x, y), camera);
        if (edgeRay.ray.intersectPlane(facingPlane, edgeHit)) {
          minX = Math.min(minX, edgeHit.x);
          maxX = Math.max(maxX, edgeHit.x);
          maxY = Math.max(maxY, edgeHit.y);
        }
      });
      if (Number.isFinite(minX)) {
        const margin = 0.12;
        ragdoll.setBounds({ x: [minX + margin, maxX - margin], y: [0.05, maxY - margin] });
      }
      if (redrawStatic) redrawStatic();
    };
    resize();
    // the slot slides in on load (a transform, which resize observers don't
    // report): measure again once it has settled
    slot.addEventListener("transitionend", resize);
    const resizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
    if (resizeObserver) {
      resizeObserver.observe(slot);
      // border box: padding changes (e.g. the site's mobile class arriving
      // after first render) move and resize the section too
      resizeObserver.observe(section, { box: "border-box" });
    } else window.addEventListener("resize", resize);

    let visible = true;
    const intersection =
      typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting;
          })
        : null;
    if (intersection) intersection.observe(mount);

    // --- desktop: hover to highlight a body part, drag to pull it around
    const canvas = renderer.domElement;
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const toLocal = new THREE.Matrix4();
    const rayOrigin = new THREE.Vector3();
    const rayDir = new THREE.Vector3();
    const planeNormal = new THREE.Vector3();
    const planePoint = new THREE.Vector3();
    let pointerX = 0;
    let hot = -1;
    let dragging = false;
    const localRay = (e) => {
      const r = canvas.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      figure.updateMatrixWorld();
      toLocal.copy(figure.matrixWorld).invert();
      rayOrigin.copy(raycaster.ray.origin).applyMatrix4(toLocal);
      rayDir.copy(raycaster.ray.direction).transformDirection(toLocal);
      return [rayOrigin.toArray(), rayDir.toArray()];
    };
    const isMouse = (e) => e.pointerType === "mouse" || e.pointerType === "pen";
    const onWindowPointerMove = (e) => {
      if (!isMouse(e)) return;
      const r = slot.getBoundingClientRect();
      pointerX = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
    };
    const onCanvasPointerMove = (e) => {
      if (!isMouse(e) || reduceMotion) return;
      const [o, d] = localRay(e);
      if (dragging) {
        // keep the grabbed point on a plane facing the camera
        const denom = planeNormal.x * d[0] + planeNormal.y * d[1] + planeNormal.z * d[2];
        if (Math.abs(denom) > 1e-6) {
          const t =
            ((planePoint.x - o[0]) * planeNormal.x + (planePoint.y - o[1]) * planeNormal.y + (planePoint.z - o[2]) * planeNormal.z) /
            denom;
          ragdoll.moveDrag([o[0] + d[0] * t, o[1] + d[1] * t, o[2] + d[2] * t]);
        }
        return;
      }
      const hit = ragdoll.pick(o, d);
      hot = hit ? hit.index : -1;
      canvas.style.cursor = hit ? "grab" : "";
    };
    const onCanvasPointerDown = (e) => {
      if (!isMouse(e) || e.button !== 0 || reduceMotion) return;
      const [o, d] = localRay(e);
      const hit = ragdoll.pick(o, d);
      if (!hit) return;
      e.preventDefault();
      dragging = true;
      hot = hit.index;
      planePoint.fromArray(hit.point);
      planeNormal.set(0, 0, -1).applyQuaternion(camera.quaternion).transformDirection(toLocal);
      ragdoll.startDrag(hit.index, hit.point);
      canvas.setPointerCapture(e.pointerId);
      canvas.style.cursor = "grabbing";
      setShowDragHint(false);
    };
    const onCanvasPointerUp = (e) => {
      if (!dragging) return;
      dragging = false;
      ragdoll.endDrag();
      if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
      canvas.style.cursor = hot >= 0 ? "grab" : "";
    };
    const onCanvasPointerLeave = () => {
      if (dragging) return;
      hot = -1;
      canvas.style.cursor = "";
    };
    window.addEventListener("pointermove", onWindowPointerMove);
    canvas.addEventListener("pointermove", onCanvasPointerMove);
    canvas.addEventListener("pointerdown", onCanvasPointerDown);
    canvas.addEventListener("pointerup", onCanvasPointerUp);
    canvas.addEventListener("pointercancel", onCanvasPointerUp);
    canvas.addEventListener("pointerleave", onCanvasPointerLeave);

    // --- phones: motion in every direction drives the rag doll
    // Tilt: gravity in the scene rotates with the phone, relative to however
    // it was held at first (slowly re-centring). Movement: the doll is pushed
    // opposite to the phone's acceleration, like a passenger in a car.
    const TILT_GAIN = 1.4;
    const MAX_TILT = 1.05; // rad
    const MOVE_GAIN = 2.4; // phones move in short, small bursts: amplify
    let motionSeen = false;
    let hintTimer = null;
    const reading = new THREE.Vector3();
    const gravityNow = new THREE.Vector3();
    const gravityBase = new THREE.Vector3();
    const moveRaw = new THREE.Vector3();
    const move = new THREE.Vector3();
    const tiltQuat = new THREE.Quaternion();
    const localQuat = new THREE.Quaternion();
    const gravityLocal = new THREE.Vector3();
    const tiltAxis = new THREE.Vector3();
    // device axes -> screen axes (x right, y up, z toward the viewer)
    const toScreen = (x, y, z, out) => {
      const deg =
        (window.screen && window.screen.orientation && window.screen.orientation.angle) || window.orientation || 0;
      const a = (deg * Math.PI) / 180;
      return out.set(x * Math.cos(a) + y * Math.sin(a), -x * Math.sin(a) + y * Math.cos(a), z);
    };
    const onMotion = (e) => {
      const g = e.accelerationIncludingGravity;
      if (!g || g.x === null || g.x === undefined) return;
      toScreen(g.x, g.y, g.z, reading);
      if (!motionSeen) {
        // motion data is flowing: no need to ask for it
        motionSeen = true;
        clearTimeout(hintTimer);
        setShowMotionHint(false);
        gravityNow.copy(reading);
        gravityBase.copy(reading);
      }
      gravityNow.lerp(reading, 0.15);
      gravityBase.lerp(gravityNow, 0.002);
      const a = e.acceleration;
      if (a && a.x !== null && a.x !== undefined) toScreen(a.x, a.y, a.z, moveRaw);
      else moveRaw.copy(reading).sub(gravityNow); // no separate reading: remove gravity ourselves
      move.lerp(moveRaw, 0.6);
    };
    let listening = false;
    const startMotion = () => {
      if (listening) return;
      listening = true;
      window.addEventListener("devicemotion", onMotion);
    };
    motionRef.current = { start: startMotion };
    const touch = isTouchDevice();
    if (!reduceMotion && touch && typeof window.DeviceMotionEvent !== "undefined") {
      // Listen straight away: Android sends motion without asking. If nothing
      // arrives and the browser can ask (iPhone), offer the hint.
      startMotion();
      hintTimer = setTimeout(() => {
        if (!motionSeen && canAskForMotion()) setShowMotionHint(true);
      }, 1000);
    }
    if (!reduceMotion && !touch) setShowDragHint(true);

    const applyMotion = () => {
      if (!motionSeen) return;
      // tilt: rotation from the baseline gravity reading to the current one
      tiltQuat.setFromUnitVectors(gravityBase.clone().normalize(), gravityNow.clone().normalize());
      const angle = 2 * Math.acos(Math.min(1, Math.abs(tiltQuat.w)));
      if (angle > 1e-4) {
        tiltAxis.set(tiltQuat.x, tiltQuat.y, tiltQuat.z).normalize();
        if (tiltQuat.w < 0) tiltAxis.negate();
        tiltQuat.setFromAxisAngle(tiltAxis, Math.min(angle * TILT_GAIN, MAX_TILT));
      } else tiltQuat.identity();
      localQuat.copy(figure.quaternion).invert();
      gravityLocal.set(0, -ragdoll.gravity, 0).applyQuaternion(tiltQuat).applyQuaternion(localQuat);
      ragdoll.setGravity(gravityLocal.x, gravityLocal.y, gravityLocal.z);
      gravityLocal.copy(move).multiplyScalar(-MOVE_GAIN).applyQuaternion(localQuat);
      ragdoll.setInertial(gravityLocal.x, gravityLocal.y, gravityLocal.z);
    };

    // --- loop
    const clock = new THREE.Clock();
    let raf = null;
    let turn = 0;
    const syncBones = () => {
      ragdoll.writeBoneMatrices(boneBuffer);
      boneMatrices.forEach((m, i) => m.fromArray(boneBuffer, i * 16));
    };
    syncBones();
    const renderFrame = () => {
      const dt = clock.getDelta();
      const t = clock.elapsedTime;
      const u = bodyMaterial.uniforms;
      u.uTime.value = t;
      if (reduceMotion) {
        u.uScan.value = 1.25;
      } else {
        u.uReveal.value = Math.min(1.1, t / 1.6);
        // sweep once up while revealing, then keep scanning up and down
        u.uScan.value = t < 1.6 ? (t / 1.6) * BODY_HEIGHT : 0.95 + 0.9 * Math.sin((t - 1.6) * 0.75 + Math.PI / 2);
        // gentle idle sway + a little turn toward the mouse; hold still while
        // a part is being dragged so it stays under the cursor
        if (!dragging) {
          const targetTurn = Math.sin(t * 0.22) * (touch ? 0.3 : 0.35) + pointerX * 0.2;
          turn += (targetTurn - turn) * 0.04;
        }
        figure.rotation.y = turn;
        dashed.rotation.y = t * 0.12;
        tickLines.rotation.y = -t * 0.05;
        applyMotion();
        ragdoll.step(dt);
        syncBones();
        u.uHot.value = hot;
        u.uHotAmount.value += ((hot >= 0 ? 1 : 0) - u.uHotAmount.value) * 0.2;
      }
      halo.position.y = u.uScan.value;
      halo.material.opacity = 0.35 * Math.sin(Math.min(1, Math.max(0, u.uScan.value / BODY_HEIGHT)) * Math.PI);
      renderer.render(scene, camera);
    };
    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (!visible || document.hidden) return;
      renderFrame();
    };
    if (reduceMotion) {
      redrawStatic = renderFrame;
      renderFrame();
    } else loop();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onWindowPointerMove);
      canvas.removeEventListener("pointermove", onCanvasPointerMove);
      canvas.removeEventListener("pointerdown", onCanvasPointerDown);
      canvas.removeEventListener("pointerup", onCanvasPointerUp);
      canvas.removeEventListener("pointercancel", onCanvasPointerUp);
      canvas.removeEventListener("pointerleave", onCanvasPointerLeave);
      window.removeEventListener("devicemotion", onMotion);
      clearTimeout(hintTimer);
      motionRef.current = null;
      slot.removeEventListener("transitionend", resize);
      if (resizeObserver) resizeObserver.disconnect();
      else window.removeEventListener("resize", resize);
      if (intersection) intersection.disconnect();
      disposables.forEach((d) => d.dispose && d.dispose());
      renderer.dispose();
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div className={className} ref={slotRef} onClick={showMotionHint ? requestMotion : undefined}>
      <div className="body-hologram-canvas" ref={mountRef} aria-hidden="true" />
      {showMotionHint && (
        <button type="button" className="body-hologram-hint">
          <span className="body-hologram-hint-icon" aria-hidden="true" />
          Tap, then move your phone
        </button>
      )}
      {motionDenied && (
        <div className="body-hologram-hint is-passive" aria-live="polite">
          Motion blocked in Safari settings
        </div>
      )}
      {showDragHint && (
        <div className="body-hologram-hint is-passive" aria-hidden="true">
          <span className="body-hologram-hint-icon is-hand" />
          Drag the body
        </div>
      )}
    </div>
  );
};

export default BodyHologram;
