import React, { useEffect, useRef } from "react";
import LAND from "./land";

// The Software page's Earth, drawn on a canvas each frame: land as dots of
// light, a faint graticule, an atmosphere, and a gold flight arc from
// Mexico City to Sydney with a pulse travelling along it.
//
// It opens with a sequence: a point of light, which becomes a black hole
// (an accretion disc, matter spiralling in), which collapses in a flash out
// of which the Earth forms. Then it turns slowly, swaying about the
// Pacific so the arc stays in view. Drag it to spin it (a mouse can also tip
// it; a finger only spins it sideways so the page still scrolls);
// `tiltRef.current` ({ x, y } in radians, e.g. the phone's tilt) turns it too.

const DEG = Math.PI / 180;
const TAU = Math.PI * 2;

const MEXICO = { lat: 19.4326, lon: -99.1332, label: "Mexico" };
const SYDNEY = { lat: -33.8688, lon: 151.2093, label: "Sydney" };
// the view rests over the eastern Pacific, a little north: the Americas
// fill the disc and Australia sits towards the edge
const REST_LON = -138;
const REST_LAT = 8;

// the opening, in ms
const T_DOT = 450; // a point of light
const T_HOLE = 1700; // the black hole grows and spins
const T_COLLAPSE = 2150; // ... and collapses
const T_FLASH = 2400;
const T_EARTH = 3500; // the Earth has formed
const T_ARC = 4500; // the arc has drawn

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const span = (t, a, b) => clamp01((t - a) / (b - a));
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOutBack = (t) => 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2);

const toVec = (lat, lon) => {
  const a = lat * DEG;
  const b = lon * DEG;
  return [Math.cos(a) * Math.sin(b), Math.sin(a), Math.cos(a) * Math.cos(b)];
};

// land, precomputed as unit vectors
const LAND_VECS = [];
for (let i = 0; i < LAND.length; i += 2) LAND_VECS.push(toVec(LAND[i] / 10, LAND[i + 1] / 10));

// a sparser, fainter lattice over the whole sphere, so the oceans have some
// texture (the land dots sit brighter on top)
const SEA_VECS = [];
for (let lat = -84; lat <= 84; lat += 4.5) {
  const n = Math.max(1, Math.round((360 * Math.cos(lat * DEG)) / 4.5));
  for (let i = 0; i < n; i++) SEA_VECS.push(toVec(lat, -180 + (i + 0.5) * (360 / n)));
}

// a parallel or meridian, as unit vectors
const GRATICULE = [];
for (let lat = -60; lat <= 60; lat += 30) {
  const ring = [];
  for (let lon = -180; lon <= 180; lon += 4) ring.push(toVec(lat, lon));
  GRATICULE.push(ring);
}
for (let lon = -180; lon < 180; lon += 30) {
  const ring = [];
  for (let lat = -90; lat <= 90; lat += 4) ring.push(toVec(lat, lon));
  GRATICULE.push(ring);
}

// the great circle from Mexico City to Sydney, lifted off the surface
const slerp = (a, b, t) => {
  const d = Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
  const w = Math.acos(d);
  const s = Math.sin(w) || 1;
  const k0 = Math.sin((1 - t) * w) / s;
  const k1 = Math.sin(t * w) / s;
  return [a[0] * k0 + b[0] * k1, a[1] * k0 + b[1] * k1, a[2] * k0 + b[2] * k1];
};
const ARC = [];
{
  const a = toVec(MEXICO.lat, MEXICO.lon);
  const b = toVec(SYDNEY.lat, SYDNEY.lon);
  for (let i = 0; i <= 120; i++) {
    const t = i / 120;
    const p = slerp(a, b, t);
    const lift = 1 + 0.2 * Math.sin(Math.PI * t);
    ARC.push([p[0] * lift, p[1] * lift, p[2] * lift]);
  }
}

// a few hundred bits of matter for the black hole's disc and infall
const MATTER = Array.from({ length: 260 }, (_, i) => ({
  r: 0.55 + Math.random() * 1.4, // in core radii
  a: Math.random() * TAU,
  speed: 0.6 + Math.random() * 1.4,
  size: 0.6 + Math.random() * 1.6,
  warm: i % 3 === 0,
}));

const Earth = ({ className, tiltRef, onReady }) => {
  const canvasRef = useRef(null);
  const tiltSource = useRef(tiltRef);
  tiltSource.current = tiltRef;
  const readyRef = useRef(onReady);
  readyRef.current = onReady;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0;
    let h = 0;
    let dpr = 1;
    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    };
    resize();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
    if (ro) ro.observe(canvas);

    // --- turning it by hand
    const view = { yaw: 0, pitch: 0, vYaw: 0, vPitch: 0, tiltX: 0, tiltY: 0, drag: null };
    const onDown = (e) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      view.drag = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), mouse: e.pointerType === "mouse" };
      view.vYaw = view.vPitch = 0;
      canvas.setPointerCapture(e.pointerId);
      canvas.classList.add("is-dragging");
    };
    const onMove = (e) => {
      const d = view.drag;
      if (!d || e.pointerId !== d.id) return;
      const now = performance.now();
      const dt = Math.max(0.008, (now - d.t) / 1000);
      const R = earthRadius();
      const dYaw = ((e.clientX - d.x) / R) * 0.9;
      const dPitch = d.mouse ? ((e.clientY - d.y) / R) * 0.9 : 0;
      view.yaw += dYaw;
      view.pitch = Math.max(-1, Math.min(1, view.pitch + dPitch));
      view.vYaw = dYaw / dt;
      view.vPitch = dPitch / dt;
      d.x = e.clientX;
      d.y = e.clientY;
      d.t = now;
    };
    const onUp = (e) => {
      const d = view.drag;
      if (!d || e.pointerId !== d.id) return;
      if (performance.now() - d.t > 80) view.vYaw = view.vPitch = 0;
      view.drag = null;
      canvas.classList.remove("is-dragging");
    };
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);

    // where the Earth sits and how big: right of centre on wide screens,
    // centred near the top on narrow ones
    const wide = () => w > 800;
    const earthRadius = () => (wide() ? Math.min(w * 0.25, h * 0.37) : Math.min(w * 0.34, h * 0.19));
    // (on phones just under the top bar, leaving the rest of the screen to the intro)
    const earthCentre = () => (wide() ? [w * 0.67, h * 0.48] : [w / 2, 56 + earthRadius()]);

    const started = performance.now();
    let last = started;
    let readySent = false;
    let raf = null;

    const draw = (now) => {
      const t = reduceMotion ? T_ARC + 1000 : now - started;
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const R = earthRadius();
      const [cx, cy] = earthCentre();

      // --- the opening: a point, a black hole, a flash
      if (t < T_FLASH) drawOpening(t, cx, cy, R);
      const form = easeOutBack(span(t, T_FLASH - 150, T_EARTH)); // 0 -> 1 (overshooting a touch)
      if (form <= 0.001) return;

      // --- the Earth's orientation
      if (!view.drag) {
        view.yaw += view.vYaw * dt;
        view.pitch = Math.max(-1, Math.min(1, view.pitch + view.vPitch * dt));
        view.vYaw *= Math.exp(-dt * 2.2);
        view.vPitch *= Math.exp(-dt * 2.2);
        // a slow sway about the Pacific, and the pitch eases back to rest
        if (Math.abs(view.vPitch) < 0.01) view.pitch *= Math.exp(-dt * 0.5);
      }
      const tilt = (tiltSource.current && tiltSource.current.current) || { x: 0, y: 0 };
      view.tiltX += (tilt.x - view.tiltX) * Math.min(1, dt * 6);
      view.tiltY += (tilt.y - view.tiltY) * Math.min(1, dt * 6);
      const sway = reduceMotion ? 0 : Math.sin(t / 9000) * 0.55;
      const yaw = -REST_LON * DEG + sway + view.yaw + view.tiltX;
      const pitch = REST_LAT * DEG + view.pitch - view.tiltY;
      const cyw = Math.cos(yaw);
      const syw = Math.sin(yaw);
      const cp = Math.cos(pitch);
      const sp = Math.sin(pitch);
      const rot = (v) => {
        // turn about the polar axis, then tip towards the viewer
        const x1 = v[0] * cyw + v[2] * syw;
        const z1 = -v[0] * syw + v[2] * cyw;
        const y2 = v[1] * cp - z1 * sp;
        const z2 = v[1] * sp + z1 * cp;
        return [x1, y2, z2];
      };
      const r = R * form;
      const sx = (p) => cx + p[0] * r;
      const sy = (p) => cy - p[1] * r;
      const fade = clamp01(form);

      // atmosphere and ocean
      const halo = ctx.createRadialGradient(cx, cy, r * 0.9, cx, cy, r * 1.35);
      halo.addColorStop(0, `rgba(0, 191, 243, ${0.22 * fade})`);
      halo.addColorStop(1, "rgba(0, 191, 243, 0)");
      ctx.fillStyle = halo;
      ctx.fillRect(cx - r * 1.4, cy - r * 1.4, r * 2.8, r * 2.8);
      const ocean = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r);
      ocean.addColorStop(0, `rgba(14, 40, 64, ${0.95 * fade})`);
      ocean.addColorStop(0.7, `rgba(4, 14, 26, ${0.95 * fade})`);
      ocean.addColorStop(1, `rgba(2, 8, 16, ${0.95 * fade})`);
      ctx.fillStyle = ocean;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, TAU);
      ctx.fill();

      // graticule, front side only
      ctx.lineWidth = 1;
      ctx.strokeStyle = `rgba(111, 245, 238, ${0.09 * fade})`;
      GRATICULE.forEach((ring) => {
        ctx.beginPath();
        let pen = false;
        ring.forEach((v) => {
          const p = rot(v);
          if (p[2] < 0) {
            pen = false;
            return;
          }
          if (pen) ctx.lineTo(sx(p), sy(p));
          else ctx.moveTo(sx(p), sy(p));
          pen = true;
        });
        ctx.stroke();
      });

      // the sea's faint lattice
      const seaDot = Math.max(1, r / 220);
      ctx.fillStyle = `rgba(0, 191, 243, ${(0.16 * fade).toFixed(3)})`;
      for (let i = 0; i < SEA_VECS.length; i++) {
        const p = rot(SEA_VECS[i]);
        if (p[2] <= 0.05) continue;
        ctx.fillRect(sx(p) - seaDot / 2, sy(p) - seaDot / 2, seaDot, seaDot);
      }

      // land, as dots; brighter towards the middle of the disc
      const dot = Math.max(1.4, r / 140);
      for (let i = 0; i < LAND_VECS.length; i++) {
        const p = rot(LAND_VECS[i]);
        if (p[2] <= 0.02) continue;
        const a = (0.25 + 0.75 * p[2]) * fade;
        ctx.fillStyle = `rgba(111, 245, 238, ${a.toFixed(3)})`;
        ctx.fillRect(sx(p) - dot / 2, sy(p) - dot / 2, dot, dot);
      }

      // rim light
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = `rgba(111, 245, 238, ${0.55 * fade})`;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, TAU);
      ctx.stroke();

      // the flight arc, drawing on once the Earth has formed
      const arcK = easeInOut(span(t, T_EARTH - 300, T_ARC));
      if (arcK > 0) {
        const upto = Math.max(1, Math.round(arcK * (ARC.length - 1)));
        const pts = ARC.slice(0, upto + 1).map(rot);
        // hidden behind the globe where it dips round the back
        const shown = (p) => p[2] > 0 || Math.hypot(p[0], p[1]) > 1;
        const stroke = (width, style) => {
          ctx.lineWidth = width;
          ctx.strokeStyle = style;
          ctx.lineCap = "round";
          ctx.beginPath();
          let pen = false;
          pts.forEach((p) => {
            if (!shown(p)) {
              pen = false;
              return;
            }
            if (pen) ctx.lineTo(sx(p), sy(p));
            else ctx.moveTo(sx(p), sy(p));
            pen = true;
          });
          ctx.stroke();
        };
        stroke(7, "rgba(255, 196, 107, 0.12)");
        stroke(1.8, "rgba(255, 206, 128, 0.9)");
        // a pulse travelling Mexico City -> Sydney
        if (arcK >= 1 && !reduceMotion) {
          const k = ((t - T_ARC) / 2600) % 1;
          const p = rot(ARC[Math.round(k * (ARC.length - 1))]);
          if (shown(p)) {
            const g = ctx.createRadialGradient(sx(p), sy(p), 0, sx(p), sy(p), 9);
            g.addColorStop(0, "rgba(255, 240, 210, 1)");
            g.addColorStop(1, "rgba(255, 196, 107, 0)");
            ctx.fillStyle = g;
            ctx.fillRect(sx(p) - 9, sy(p) - 9, 18, 18);
          }
        }
        ctx.lineCap = "butt";
      }

      // the two places: a pulsing ring at Sydney (now), a dot at Mexico City
      const placeK = span(t, T_EARTH - 200, T_EARTH + 400);
      const ends = [MEXICO, SYDNEY].map((place) => rot(toVec(place.lat, place.lon)));
      [MEXICO, SYDNEY].forEach((place, i) => {
        const p = ends[i];
        if (p[2] <= 0.05 || placeK <= 0) return;
        const x = sx(p);
        const y = sy(p);
        const isHome = place === SYDNEY;
        ctx.fillStyle = isHome ? "rgba(236, 255, 254, 1)" : "rgba(255, 206, 128, 1)";
        ctx.beginPath();
        ctx.arc(x, y, (isHome ? 4 : 3) * placeK, 0, TAU);
        ctx.fill();
        if (isHome && !reduceMotion) {
          const k = (t / 1800) % 1;
          ctx.lineWidth = 2;
          ctx.strokeStyle = `rgba(236, 255, 254, ${(1 - k) * 0.8 * placeK})`;
          ctx.beginPath();
          ctx.arc(x, y, 5 + k * 11, 0, TAU);
          ctx.stroke();
        }
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = `rgba(236, 255, 254, ${0.35 * placeK})`;
        ctx.beginPath();
        ctx.arc(x, y, 9, 0, TAU);
        ctx.stroke();
        ctx.font = `600 ${Math.max(9, r / 26)}px Orbitron, "DINWeb", sans-serif`;
        ctx.fillStyle = `rgba(236, 255, 254, ${0.85 * placeK * clamp01(p[2] * 3)})`;
        ctx.textBaseline = "middle";
        // each label sits on the far side from the other place, clear of the
        // arc between them, and leans inwards so it never runs off the screen
        const o = ends[1 - i];
        let dx = x - sx(o);
        let dy = y - sy(o);
        const len = Math.hypot(dx, dy) || 1;
        dx /= len;
        dy /= len;
        if (Math.abs(dx) > 0.5 && (dx > 0) === x > cx) dx = 0;
        ctx.textAlign = dx > 0.5 ? "left" : dx < -0.5 ? "right" : "center";
        ctx.fillText(place.label.toUpperCase(), x + dx * 20, y + dy * 26);
      });

      if (!readySent && t > T_EARTH) {
        readySent = true;
        if (readyRef.current) readyRef.current();
      }
    };

    // the point of light, the black hole, its collapse
    const drawOpening = (t, cx, cy, R) => {
      // a point of light
      if (t < T_HOLE) {
        const k = easeOut(span(t, 0, T_DOT));
        const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 26 * k + 1);
        glow.addColorStop(0, `rgba(236, 255, 254, ${k})`);
        glow.addColorStop(0.3, `rgba(111, 245, 238, ${0.6 * k})`);
        glow.addColorStop(1, "rgba(0, 191, 243, 0)");
        ctx.fillStyle = glow;
        ctx.fillRect(cx - 30, cy - 30, 60, 60);
      }
      // the black hole: grows out of the point, spins up, then collapses
      const grow = easeOut(span(t, T_DOT - 150, T_HOLE));
      const fall = easeInOut(span(t, T_HOLE, T_COLLAPSE));
      const core = R * 0.28 * grow * (1 - fall);
      if (core > 0.5) {
        const spin = (t / 1000) * (2 + fall * 10);
        // lensing glow round the event horizon
        const ring = ctx.createRadialGradient(cx, cy, core * 0.9, cx, cy, core * 2.6);
        ring.addColorStop(0, "rgba(255, 210, 150, 0.55)");
        ring.addColorStop(0.25, "rgba(255, 150, 80, 0.25)");
        ring.addColorStop(0.6, "rgba(0, 191, 243, 0.08)");
        ring.addColorStop(1, "rgba(0, 191, 243, 0)");
        ctx.fillStyle = ring;
        ctx.fillRect(cx - core * 2.7, cy - core * 2.7, core * 5.4, core * 5.4);
        // the accretion disc: matter orbiting on a tilted ellipse, falling in
        MATTER.forEach((m) => {
          const rr = core * (1.15 + (m.r - 0.55) * (1 - fall * 0.9));
          const a = m.a + spin * m.speed * (1.6 / m.r);
          const x = cx + Math.cos(a) * rr;
          const y = cy + Math.sin(a) * rr * 0.32;
          const behind = Math.sin(a) < 0; // far side of the disc, dimmer
          const alpha = (behind ? 0.35 : 0.9) * grow;
          ctx.fillStyle = m.warm ? `rgba(255, 196, 120, ${alpha})` : `rgba(160, 240, 255, ${alpha})`;
          ctx.fillRect(x - m.size / 2, y - m.size / 2, m.size, m.size);
        });
        // the event horizon itself, with a thin photon ring
        ctx.fillStyle = "#000";
        ctx.beginPath();
        ctx.arc(cx, cy, core, 0, TAU);
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = "rgba(255, 220, 170, 0.85)";
        ctx.beginPath();
        ctx.arc(cx, cy, core * 1.04, 0, TAU);
        ctx.stroke();
      }
      // the flash as it collapses, out of which the Earth forms
      const flash = span(t, T_COLLAPSE - 100, T_COLLAPSE + 50) * (1 - span(t, T_COLLAPSE + 50, T_FLASH));
      if (flash > 0) {
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.9);
        g.addColorStop(0, `rgba(255, 255, 255, ${flash})`);
        g.addColorStop(0.2, `rgba(160, 240, 255, ${0.6 * flash})`);
        g.addColorStop(1, "rgba(0, 191, 243, 0)");
        ctx.fillStyle = g;
        ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
      }
    };

    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      if (document.hidden) return;
      draw(now);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      if (ro) ro.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
    };
  }, []);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
};

export default Earth;
