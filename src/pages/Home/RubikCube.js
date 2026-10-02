import React, { useEffect, useRef, useState } from "react";
import useDeviceTilt, { prefersReducedMotion } from "components/motion/useDeviceTilt";
import navigateAfter from "components/navigation/navigateAfter";
import { IDENTITY, conjugate, fromAxisAngle, multiply, normalize, slerp, toCss } from "./quat";

// A Rubik's cube drawn in light: 6 faces of 3 x 3 squares whose edges glow.
// Each face's centre square is a link. The cube tumbles on its own; drag it
// (mouse or touch) to turn it, and on phones it also follows the phone's
// tilt. Picking a link whirls the cube round, lands that face at the front,
// flattens the cube to a square, shrinks it to a dot, then navigates.
//
// Hovering a face (tapping it on phones) holds the cube still and lights up
// that face's hologram, which covers the whole face.

const Q = (x, y, z, deg) => fromAxisAngle(x, y, z, (deg * Math.PI) / 180);

// each face's orientation on the cube (CSS: y points down, z at the viewer)
const FACES = [
  { name: "front", rotate: "", q: IDENTITY },
  { name: "right", rotate: "rotateY(90deg)", q: Q(0, 1, 0, 90) },
  { name: "back", rotate: "rotateY(180deg)", q: Q(0, 1, 0, 180) },
  { name: "left", rotate: "rotateY(-90deg)", q: Q(0, 1, 0, -90) },
  { name: "top", rotate: "rotateX(90deg)", q: Q(1, 0, 0, 90) },
  { name: "bottom", rotate: "rotateX(-90deg)", q: Q(1, 0, 0, -90) },
];

const START = multiply(Q(1, 0, 0, -24), Q(0, 1, 0, 34)); // three faces in view
const AUTO_SPEED = 0.32; // rad/s
const DRAG_SLOP = 6; // px of movement before a press becomes a drag
const PHONE_GAIN = 1.3; // cube turn per degree of phone tilt
const SPIN_MS = 1100; // the whirl before the fold
const SPIN_TURNS = [2, 1]; // whole turns about each of two random axes
const FLATTEN_MS = 380;
const DOT_MS = 460;

// Colours mode: every square has its own colour, and rises and sinks on its
// own random timing (fixed for the visit).
const rand = (min, max) => min + Math.random() * (max - min);
const makeCellTimings = () =>
  FACES.map(() =>
    Array.from({ length: 9 }, () => ({
      "--rise-dur": `${rand(1.4, 3.2).toFixed(2)}s`,
      "--rise-delay": `${rand(-3.2, 0).toFixed(2)}s`,
      "--cell-hue": Math.round(rand(0, 360)),
    })),
  );

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

const RubikCube = ({ links, onHint }) => {
  const sceneRef = useRef(null);
  const squashRef = useRef(null);
  const cubeRef = useRef(null);
  const dotRef = useRef(null);
  const state = useRef({
    q: START,
    omega: [0, 0, 0], // angular velocity (view space, rad/s)
    near: false, // mouse is over the cube: slow down so a face can be aimed at
    drag: null,
    dragged: false, // the last press turned into a drag: swallow its click
    focus: null, // a link has keyboard focus: hold its face to the front
    tapped: -1, // phones: the face last tapped (shows its hologram, holds still)
    active: -1, // the face whose hologram is showing
    select: null, // the pick animation in progress
    tilt: IDENTITY,
  }).current;
  const release = () => {
    state.focus = null;
    state.tapped = -1;
  };
  const [reduceMotion] = useState(prefersReducedMotion);
  const [collapsing, setCollapsing] = useState(false);
  const [active, setActive] = useState(-1);
  const [timings] = useState(makeCellTimings);

  // phones: the cube follows the phone's tilt, on top of its own tumbling
  const { showHint, requestPermission, denied } = useDeviceTilt((x, y) => {
    // dip the right edge and the cube turns right; raise the top and it tips back
    state.tilt = multiply(Q(0, 1, 0, x * PHONE_GAIN), Q(1, 0, 0, -y * PHONE_GAIN));
  }, !reduceMotion);

  useEffect(() => {
    if (onHint) onHint({ showHint, requestPermission, denied });
  }, [showHint, denied]);

  // --- turning the cube by hand
  useEffect(() => {
    const scene = sceneRef.current;
    const size = () => (cubeRef.current ? cubeRef.current.offsetWidth : 300);

    const onDown = (e) => {
      if (state.select || (e.pointerType === "mouse" && e.button !== 0)) return;
      state.drag = { id: e.pointerId, x: e.clientX, y: e.clientY, lastX: e.clientX, lastY: e.clientY, t: performance.now(), moved: false };
      state.dragged = false;
    };
    const onMove = (e) => {
      const d = state.drag;
      if (!d || e.pointerId !== d.id) return;
      if (!d.moved) {
        if (Math.hypot(e.clientX - d.x, e.clientY - d.y) < DRAG_SLOP) return;
        d.moved = true;
        state.dragged = true;
        release();
        // only capture once it's a drag, so plain clicks still reach the links
        scene.setPointerCapture(e.pointerId);
        scene.classList.add("is-dragging");
      }
      const dx = e.clientX - d.lastX;
      const dy = e.clientY - d.lastY;
      d.lastX = e.clientX;
      d.lastY = e.clientY;
      const dist = Math.hypot(dx, dy);
      if (!dist) return;
      // dragging across the cube's width turns it half a turn
      const angle = (dist / size()) * Math.PI;
      const axis = [-dy / dist, dx / dist, 0];
      state.q = normalize(multiply(fromAxisAngle(axis[0], axis[1], axis[2], angle), state.q));
      const now = performance.now();
      const dt = Math.max(0.008, (now - d.t) / 1000);
      d.t = now;
      const w = angle / dt;
      state.omega = state.omega.map((v, i) => v * 0.5 + axis[i] * w * 0.5);
    };
    const onUp = (e) => {
      const d = state.drag;
      if (!d || e.pointerId !== d.id) return;
      state.drag = null;
      scene.classList.remove("is-dragging");
      if (performance.now() - d.t > 80) state.omega = [0, 0, 0]; // held still before letting go
    };
    const onEnter = (e) => {
      if (e.pointerType === "mouse") state.near = true;
    };
    const onLeave = (e) => {
      state.near = false;
      // the mouse has moved on: let a face that was turned to the front go
      if (e.pointerType === "mouse" && !state.select) release();
    };
    // a click beside the cube lets a face that was turned to the front go
    const onClick = (e) => {
      if (!e.target.closest(".rc-face") && !state.dragged) release();
    };
    scene.addEventListener("click", onClick);
    scene.addEventListener("pointerenter", onEnter);
    scene.addEventListener("pointerleave", onLeave);
    scene.addEventListener("pointerdown", onDown);
    scene.addEventListener("pointermove", onMove);
    scene.addEventListener("pointerup", onUp);
    scene.addEventListener("pointercancel", onUp);
    return () => {
      scene.removeEventListener("pointerenter", onEnter);
      scene.removeEventListener("pointerleave", onLeave);
      scene.removeEventListener("click", onClick);
      scene.removeEventListener("pointerdown", onDown);
      scene.removeEventListener("pointermove", onMove);
      scene.removeEventListener("pointerup", onUp);
      scene.removeEventListener("pointercancel", onUp);
    };
  }, []);

  // --- the animation loop
  useEffect(() => {
    let raf = null;
    let last = performance.now();
    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(1 / 30, (now - last) / 1000);
      last = now;
      if (document.hidden) return;
      const t = now / 1000;

      if (state.select) {
        runSelect(now);
      } else if (state.focus) {
        state.q = slerp(state.q, state.focus, 1 - Math.exp(-dt * 8));
      }
      // the face being looked at: hovered, else tapped (phones) or focused.
      // Checked every frame rather than fixed at load, so it keeps working
      // when a window switches between touch and mouse.
      const el = sceneRef.current.querySelector(".rc-face:hover");
      const hovered = el ? Number(el.dataset.face) : state.tapped;
      const nextActive = state.select ? state.active : hovered;
      if (nextActive !== state.active) {
        state.active = nextActive;
        setActive(nextActive);
      }
      if (!state.select && !state.focus && !state.drag) {
        // hold still while a face is being looked at, so it can be picked
        const paused = hovered >= 0;
        // tumble about a slowly wandering axis; a flick's spin eases into it
        const speed = reduceMotion || paused ? 0 : state.near ? AUTO_SPEED * 0.25 : AUTO_SPEED;
        const axis = normalize([Math.sin(t * 0.13 + 0.5), Math.cos(t * 0.09), 0.6 * Math.sin(t * 0.07 + 1.3), 0]);
        // stop dead under the mouse: easing to a stop would slide the square
        // being aimed at out from under the cursor
        const k = paused ? 1 : 1 - Math.exp(-dt * 1.1);
        state.omega = state.omega.map((v, i) => v + (axis[i] * speed - v) * k);
        const w = Math.hypot(...state.omega);
        if (w > 1e-5) state.q = normalize(multiply(fromAxisAngle(...state.omega, w * dt), state.q));
      }
      if (cubeRef.current) {
        cubeRef.current.style.transform = toCss(state.select ? state.q : multiply(state.tilt, state.q));
      }
    };

    // pick: whirl round onto the face, flatten to a square, shrink to a dot, go
    const runSelect = (now) => {
      const s = state.select;
      const e = now - s.start;
      if (e < SPIN_MS) {
        // whirl round two axes at once, fastest mid-way, while easing to the
        // picked face; the turns are whole, so it lands exactly face-on
        const k = easeInOut(e / SPIN_MS);
        const whirl = multiply(
          fromAxisAngle(...s.axes[0], SPIN_TURNS[0] * 2 * Math.PI * k),
          fromAxisAngle(...s.axes[1], SPIN_TURNS[1] * 2 * Math.PI * k),
        );
        state.q = multiply(whirl, slerp(s.from, s.to, k));
        // swells a little as it spins up
        squashRef.current.style.transform = `scale(${(1 + 0.1 * Math.sin(k * Math.PI)).toFixed(4)})`;
        return;
      }
      state.q = s.to;
      const squash = squashRef.current;
      const dot = dotRef.current;
      if (e < SPIN_MS + FLATTEN_MS) {
        const k = easeInOut((e - SPIN_MS) / FLATTEN_MS);
        squash.style.transform = `scale3d(1, 1, ${Math.max(0.001, 1 - k)})`;
        return;
      }
      const k = Math.min(1, (e - SPIN_MS - FLATTEN_MS) / DOT_MS);
      const shrink = Math.max(0.012, 1 - easeInOut(k));
      squash.style.transform = `scale3d(${shrink}, ${shrink}, 0.001)`;
      dot.style.opacity = String(Math.min(1, k * 2.2));
      dot.style.transform = `translate(-50%, -50%) scale(${0.4 + 0.6 * Math.sin(Math.min(1, k * 1.4) * Math.PI * 0.5)})`;
      if (k >= 1 && !s.done) {
        s.done = true;
        s.nav.finish();
      }
    };

    raf = requestAnimationFrame(loop);

    // back button from the next page: the browser may restore this page as
    // it was left (collapsed to a dot), so put the cube back
    const onPageShow = (e) => {
      if (e.persisted) restore();
    };
    window.addEventListener("pageshow", onPageShow);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);

  // put the cube back as it was before a pick (Back pressed mid-animation,
  // or this page restored from the browser's cache)
  const restore = () => {
    state.select = null;
    state.omega = [0, 0, 0];
    if (squashRef.current) squashRef.current.style.transform = "";
    if (dotRef.current) {
      dotRef.current.style.opacity = "0";
      dotRef.current.style.transform = "";
    }
    setCollapsing(false);
  };

  // the rotation that brings a face to the front, upright, the short way round
  const facing = (face) => {
    const to = conjugate(face.q);
    const d = to[0] * state.q[0] + to[1] * state.q[1] + to[2] * state.q[2] + to[3] * state.q[3];
    return d < 0 ? to.map((v) => -v) : to;
  };

  // Clicking (or tapping) any other square of a face turns that face to the
  // front, upright, as a pick does before it folds away, and holds it there
  // so its name reads straight; its hologram shows too. Dragging, clicking
  // beside the cube or moving the mouse off it lets the cube tumble again.
  const look = (f) => {
    if (state.dragged) {
      state.dragged = false;
      return;
    }
    state.focus = facing(FACES[f]);
    state.tapped = f;
  };

  const pick = (e, face, link) => {
    e.preventDefault();
    if (state.dragged) {
      state.dragged = false;
      return;
    }
    if (state.select) return;
    if (reduceMotion) {
      window.location.assign(link.href);
      return;
    }
    const from = multiply(state.tilt, state.q);
    state.q = from;
    state.tilt = IDENTITY;
    state.focus = null;
    const randomAxis = () => normalize([Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5, 0]).slice(0, 3);
    // the history step is taken now, inside the click (see navigateAfter);
    // Back during the animation puts the cube back
    const nav = navigateAfter(link.href, { onCancel: restore });
    state.select = { start: performance.now(), from, to: facing(face), nav, axes: [randomAxis(), randomAxis()] };
    setCollapsing(true);
  };

  return (
    <div className={collapsing ? "rc-scene is-collapsing" : "rc-scene"} ref={sceneRef}>
      <div className="rc-squash" ref={squashRef}>
        <div className="rc-cube" ref={cubeRef} style={{ transform: toCss(START) }}>
          {FACES.map((face, f) => {
            const link = links[f];
            return (
              <div
                key={face.name}
                data-face={f}
                className={`rc-face rc-face-${face.name}${f === active ? " is-active" : ""}`}
                style={{ transform: `${face.rotate} translateZ(var(--rc-half))` }}>
                {Array.from({ length: 9 }, (_, i) =>
                  i === 4 ? (
                    <a
                      key={i}
                      className="rc-cell rc-link"
                      style={timings[f][i]}
                      href={link.href}
                      onClick={(e) => pick(e, face, link)}
                      onFocus={() => {
                        state.focus = facing(face);
                        state.tapped = f;
                      }}
                      onBlur={() => {
                        state.focus = null;
                        state.tapped = -1;
                      }}
                    >
                      <span className="rc-cell-glow" aria-hidden="true" />
                      <span className="rc-link-text">{link.label}</span>
                    </a>
                  ) : (
                    <span
                      key={i}
                      className="rc-cell"
                      onClick={() => look(f)}
                      style={{ ...timings[f][i], "--rc-wave": `${(((i % 3) + Math.floor(i / 3) + f * 2) * 0.35).toFixed(2)}s` }}
                    >
                      <span className="rc-cell-glow" aria-hidden="true" />
                    </span>
                  ),
                )}
                {/* this face's hologram, lit while the face is looked at */}
                <div className="rc-holo" aria-hidden="true">
                  {link.holo}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <span className="rc-dot" ref={dotRef} aria-hidden="true" />
    </div>
  );
};

export default RubikCube;
