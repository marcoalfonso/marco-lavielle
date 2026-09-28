import React, { useEffect, useRef } from "react";
import * as THREE from "three";

import { buildBodyPoints, BODY_HEIGHT } from "./bodyPoints";

// ---------------------------------------------------------------------------
// Holographic body scan (in the spirit of gyrosco.pe): a standing figure drawn
// as a glowing point cloud, a scan band sweeping up and down, and a HUD
// platform under the feet. The figure itself comes from ./bodyPoints.
// ---------------------------------------------------------------------------

const bodyVertexShader = `
  uniform float uTime;
  uniform float uScan;
  uniform float uReveal;
  uniform float uSize;
  uniform float uPixelRatio;
  attribute float aRand;
  varying float vRim;
  varying float vScan;
  varying float vTwinkle;
  varying float vY;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vec3 n = normalize(normalMatrix * normal);
    vRim = 1.0 - abs(dot(n, normalize(-mv.xyz)));
    float d = position.y - uScan;
    vScan = exp(-d * d / 0.0016);
    vTwinkle = 0.7 + 0.3 * sin(uTime * 2.3 + aRand * 60.0);
    vY = position.y;
    float revealed = step(position.y, uReveal * ${BODY_HEIGHT.toFixed(2)} + aRand * 0.05);
    gl_PointSize = revealed * uSize * uPixelRatio * (1.0 + vScan * 0.9) / -mv.z;
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
  void main() {
    float r = length(gl_PointCoord - 0.5);
    if (r > 0.5) discard;
    float soft = smoothstep(0.5, 0.05, r);
    float body = 0.42 + 0.75 * pow(vRim, 2.0);
    float lines = 0.8 + 0.2 * sin(vY * 430.0);
    vec3 color = mix(uColor, uScanColor, clamp(vScan * 1.2, 0.0, 1.0));
    float a = (body * lines * vTwinkle + vScan * 0.85) * soft;
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

const BodyHologram = ({ className }) => {
  const mountRef = useRef(null);

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
    camera.position.set(0, 1.08, 4.3);
    camera.lookAt(0, 0.9, 0);

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
        },
        vertexShader: bodyVertexShader,
        fragmentShader: bodyFragmentShader,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    const figure = new THREE.Group();
    figure.add(new THREE.Points(bodyGeometry, bodyMaterial));
    scene.add(figure);

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
    const resize = () => {
      const w = mount.clientWidth || 1;
      const h = mount.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      // Fit the platform (~0.8 m either side) horizontally and the full
      // height vertically, whichever needs the wider field of view.
      const distance = camera.position.z;
      const fitWidth = (2 * Math.atan(0.8 / (distance * camera.aspect)) * 180) / Math.PI;
      camera.fov = Math.max(28, fitWidth);
      camera.updateProjectionMatrix();
      if (redrawStatic) redrawStatic();
    };
    resize();
    const resizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
    if (resizeObserver) resizeObserver.observe(mount);
    else window.addEventListener("resize", resize);

    let visible = true;
    const intersection =
      typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting;
          })
        : null;
    if (intersection) intersection.observe(mount);

    let pointerX = 0;
    const onPointerMove = (e) => {
      const r = mount.getBoundingClientRect();
      pointerX = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
    };
    window.addEventListener("pointermove", onPointerMove);

    // --- loop
    const clock = new THREE.Clock();
    let raf = null;
    let turn = 0;
    const renderFrame = () => {
      const t = clock.getElapsedTime();
      const u = bodyMaterial.uniforms;
      u.uTime.value = t;
      if (reduceMotion) {
        u.uScan.value = 1.25;
      } else {
        u.uReveal.value = Math.min(1.1, t / 1.6);
        // sweep once up while revealing, then keep scanning up and down
        u.uScan.value = t < 1.6 ? (t / 1.6) * BODY_HEIGHT : 0.95 + 0.9 * Math.sin((t - 1.6) * 0.75 + Math.PI / 2);
        const targetTurn = Math.sin(t * 0.22) * 0.55 + pointerX * 0.35;
        turn += (targetTurn - turn) * 0.04;
        figure.rotation.y = turn;
        dashed.rotation.y = t * 0.12;
        tickLines.rotation.y = -t * 0.05;
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
      window.removeEventListener("pointermove", onPointerMove);
      if (resizeObserver) resizeObserver.disconnect();
      else window.removeEventListener("resize", resize);
      if (intersection) intersection.disconnect();
      disposables.forEach((d) => d.dispose && d.dispose());
      renderer.dispose();
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    };
  }, []);

  return <div className={className} ref={mountRef} aria-hidden="true" />;
};

export default BodyHologram;
