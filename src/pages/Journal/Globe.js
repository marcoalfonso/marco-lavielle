import React, { useEffect, useRef } from "react";

// A wireframe globe drawn in dots of light, after the Evangelion star-chart
// screens: an outer sphere of dotted meridians and parallels turning on a
// tilted axis, a smaller inner sphere turning the other way, bright bands
// sweeping round it, and three axes reaching out. Lines on the far side are
// dimmer.
// Drawn on a canvas each frame (a few thousand dots is cheap there).
//
// It assembles out of a point when the page opens, and collapses back into
// one when `leaving` turns true.

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;

const ENTER_DELAY = 150;
const ENTER_MS = 1200;
const LEAVE_DELAY = 520;
const LEAVE_MS = 760;

const CANVAS_SCALE = 1.5; // canvas size / globe box size; keep in step with Journal.css

// the axes' directions on screen (x right, y down); the social channels
// sit at their ends (StarChart.js, .chart-channel-slot in Journal.css)
export const AXES = [
  [-0.5, -0.866],
  [0.5, -0.866],
  [-0.2, 0.98],
];
export const AXIS_LENGTH = 1.3; // times the globe's radius

const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeIn = (t) => t * t * t;

// the site's cyan, as rgb, at a given alpha
const cyan = (a) => `rgba(111, 245, 238, ${a})`;
const blue = (a) => `rgba(0, 191, 243, ${a})`;
const white = (a) => `rgba(236, 255, 254, ${a})`;

// point on a unit sphere, rotated about y (spin), then tilted about x and z
const project = (lat, lon, spin, tiltX, tiltZ) => {
  let x = Math.cos(lat) * Math.sin(lon + spin);
  let y = Math.sin(lat);
  let z = Math.cos(lat) * Math.cos(lon + spin);
  // tilt towards the viewer
  const y1 = y * Math.cos(tiltX) - z * Math.sin(tiltX);
  const z1 = y * Math.sin(tiltX) + z * Math.cos(tiltX);
  y = y1;
  z = z1;
  // lean sideways
  const x2 = x * Math.cos(tiltZ) - y * Math.sin(tiltZ);
  const y2 = x * Math.sin(tiltZ) + y * Math.cos(tiltZ);
  return [x2, y2, z];
};

export { CANVAS_SCALE };

const Globe = ({ leaving, className }) => {
  const canvasRef = useRef(null);
  const leaveAt = useRef(null);

  useEffect(() => {
    if (leaving && leaveAt.current === null) leaveAt.current = performance.now();
    if (!leaving) leaveAt.current = null;
  }, [leaving]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let size = 0;
    let dpr = 1;

    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      size = canvas.clientWidth;
      canvas.width = Math.round(size * dpr);
      canvas.height = Math.round(size * dpr);
    };
    resize();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
    if (ro) ro.observe(canvas);

    const started = performance.now();
    let raf = null;

    const dots = (points, r, cx, cy, frontAlpha, backAlpha, dotSize) => {
      points.forEach(([x, y, z]) => {
        const a = z >= 0 ? frontAlpha * (0.55 + 0.45 * z) : backAlpha * (1 + z * 0.6);
        if (a <= 0.01) return;
        ctx.fillStyle = z >= 0 ? cyan(a) : blue(a);
        const s = z >= 0 ? dotSize : dotSize * 0.75;
        ctx.fillRect(cx + x * r - s / 2, cy + y * r - s / 2, s, s);
      });
    };

    const line = (points, r, cx, cy, width, style, frontOnly) => {
      ctx.lineWidth = width;
      ctx.strokeStyle = style;
      ctx.beginPath();
      let pen = false;
      points.forEach(([x, y, z]) => {
        if (frontOnly && z < 0) {
          pen = false;
          return;
        }
        if (pen) ctx.lineTo(cx + x * r, cy + y * r);
        else ctx.moveTo(cx + x * r, cy + y * r);
        pen = true;
      });
      ctx.stroke();
    };

    const draw = (now) => {
      const t = (now - started) / 1000;
      const px = size * dpr;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, px, px);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // how assembled the globe is: grows out of a point, collapses into one
      let k = reduceMotion ? 1 : easeOut(Math.min(1, Math.max(0, (now - started - ENTER_DELAY) / ENTER_MS)));
      if (leaveAt.current !== null) {
        const out = Math.min(1, Math.max(0, (now - leaveAt.current - LEAVE_DELAY) / LEAVE_MS));
        k *= 1 - easeIn(out);
      }
      const cx = size / 2;
      const cy = size / 2;
      // the canvas reaches past the globe's box (see .chart-globe-canvas), so
      // the axes have room: the globe is 0.37 of the box
      const R = (size / CANVAS_SCALE) * 0.37 * k;
      const spin = reduceMotion ? 0.6 : t * 0.22;
      const tiltX = -0.38;
      const tiltZ = 0.32;

      // the collapse ends in a flash of light at the centre
      if (k < 0.12 && leaveAt.current !== null) {
        const f = k / 0.12;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.08);
        g.addColorStop(0, white(0.9 * f + 0.1));
        g.addColorStop(1, cyan(0));
        ctx.fillStyle = g;
        ctx.fillRect(cx - size * 0.08, cy - size * 0.08, size * 0.16, size * 0.16);
      }
      if (R < 1) return;

      // soft core glow
      const glow = ctx.createRadialGradient(cx, cy, R * 0.1, cx, cy, R * 1.25);
      glow.addColorStop(0, blue(0.16 * k));
      glow.addColorStop(1, blue(0));
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, size, size);

      // axes, fixed on the screen, reaching past the sphere
      ctx.lineWidth = 1;
      ctx.strokeStyle = cyan(0.35 * k);
      ctx.beginPath();
      AXES.forEach(([dx, dy]) => {
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + dx * R * AXIS_LENGTH, cy + dy * R * AXIS_LENGTH);
      });
      ctx.stroke();

      // outer sphere: dotted meridians and parallels
      const outer = [];
      for (let m = 0; m < 24; m++) {
        const lon = (m / 24) * TAU;
        for (let lat = -84; lat <= 84; lat += 3) outer.push(project(lat * DEG, lon, spin, tiltX, tiltZ));
      }
      for (let lat = -75; lat <= 75; lat += 15) {
        for (let lon = 0; lon < 360; lon += 3) outer.push(project(lat * DEG, lon * DEG, spin, tiltX, tiltZ));
      }
      dots(outer, R, cx, cy, 0.95 * k, 0.28 * k, 1.8);

      // silhouette
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = cyan(0.55 * k);
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, TAU);
      ctx.stroke();

      // inner sphere: solid thin lines, turning the other way
      const innerR = R * 0.52;
      for (let m = 0; m < 12; m++) {
        const lon = (m / 12) * TAU;
        const pts = [];
        for (let lat = -90; lat <= 90; lat += 6) pts.push(project(lat * DEG, lon, -spin * 1.6, tiltX, tiltZ));
        line(pts, innerR, cx, cy, 1, blue(0.4 * k), false);
      }
      for (let lat = -60; lat <= 60; lat += 30) {
        const pts = [];
        for (let lon = 0; lon <= 360; lon += 6) pts.push(project(lat * DEG, lon * DEG, -spin * 1.6, tiltX, tiltZ));
        line(pts, innerR, cx, cy, 1, blue(0.4 * k), false);
      }

      // bright bands sweeping round, front side only
      ctx.lineCap = "round";
      [
        { lat: -12, from: 20, len: 120, speed: 1, w: 5 },
        { lat: 22, from: 200, len: 90, speed: 1.35, w: 4 },
        { lat: 48, from: 90, len: 70, speed: 0.8, w: 3.5 },
        { lat: -42, from: 300, len: 80, speed: 1.2, w: 3.5 },
      ].forEach((band) => {
        const pts = [];
        const start = band.from + (reduceMotion ? 0 : t * 40 * band.speed);
        for (let lon = start; lon <= start + band.len; lon += 3) pts.push(project(band.lat * DEG, lon * DEG, spin, tiltX, tiltZ));
        line(pts, R * 1.015, cx, cy, band.w + 6, cyan(0.12 * k), true);
        line(pts, R * 1.015, cx, cy, band.w, white(0.9 * k), true);
      });
      ctx.lineCap = "butt";
    };

    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      if (document.hidden) return;
      draw(now);
    };
    if (reduceMotion) {
      // one still frame (redrawn on resize); the leave collapse is skipped
      const still = () => draw(performance.now());
      still();
      if (ro) {
        ro.disconnect();
        const ro2 = new ResizeObserver(() => {
          resize();
          still();
        });
        ro2.observe(canvas);
        return () => ro2.disconnect();
      }
      return undefined;
    }
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      if (ro) ro.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
};

export default Globe;
