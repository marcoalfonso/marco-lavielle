import React, { useEffect, useRef, useState } from "react";
import useDeviceTilt, { isTouchDevice, prefersReducedMotion } from "components/motion/useDeviceTilt";
import { IDENTITY, conjugate, fromAxisAngle, multiply, normalize, rotate, slerp, toCss } from "./quat";

// A Rubik's cube drawn in light: 6 faces of 3 x 3 squares whose edges glow.
// Each face's centre square is a link. The cube tumbles on its own; drag it
// (mouse or touch) to turn it, and on phones it also follows the phone's
// tilt. Picking a link turns that face to the front, flattens the cube to a
// square, shrinks it to a dot, then navigates.
//
// The links' names float over their faces as flat, screen-facing labels (so
// they stay legible at any angle), placed each frame by projecting the face
// centres. Hovering a face (tapping it on phones) holds the cube still and
// shows that link's hologram over it.

const Q = (x, y, z, deg) => fromAxisAngle(x, y, z, (deg * Math.PI) / 180);

// each face's orientation on the cube and the way it faces (CSS: y points
// down, z at the viewer)
const FACES = [
  { name: "front", rotate: "", q: IDENTITY, normal: [0, 0, 1] },
  { name: "right", rotate: "rotateY(90deg)", q: Q(0, 1, 0, 90), normal: [1, 0, 0] },
  { name: "back", rotate: "rotateY(180deg)", q: Q(0, 1, 0, 180), normal: [0, 0, -1] },
  { name: "left", rotate: "rotateY(-90deg)", q: Q(0, 1, 0, -90), normal: [-1, 0, 0] },
  { name: "top", rotate: "rotateX(90deg)", q: Q(1, 0, 0, 90), normal: [0, -1, 0] },
  { name: "bottom", rotate: "rotateX(-90deg)", q: Q(1, 0, 0, -90), normal: [0, 1, 0] },
];

const PERSPECTIVE = 1500; // px; keep in step with .rc-scene in Home.css

const START = multiply(Q(1, 0, 0, -24), Q(0, 1, 0, 34)); // three faces in view
const AUTO_SPEED = 0.32; // rad/s
const DRAG_SLOP = 6; // px of movement before a press becomes a drag
const PHONE_GAIN = 1.3; // cube turn per degree of phone tilt
const ALIGN_MS = 650;
const FLATTEN_MS = 380;
const DOT_MS = 460;

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

const clamp01 = (v) => Math.max(0, Math.min(1, v));

const RubikCube = ({ links, onHint }) => {
  const sceneRef = useRef(null);
  const labelRefs = useRef([]);
  const holoRef = useRef(null);
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
  const [reduceMotion] = useState(prefersReducedMotion);
  const [collapsing, setCollapsing] = useState(false);
  const [active, setActive] = useState(-1);

  // phones: the cube follows the phone's tilt, on top of its own tumbling
  const { showHint, requestPermission } = useDeviceTilt((x, y) => {
    // dip the right edge and the cube turns right; raise the top and it tips back
    state.tilt = multiply(Q(0, 1, 0, x * PHONE_GAIN), Q(1, 0, 0, -y * PHONE_GAIN));
  }, !reduceMotion);

  useEffect(() => {
    if (onHint) onHint({ showHint, requestPermission });
  }, [showHint]);

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
        state.tapped = -1;
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
    const onLeave = () => {
      state.near = false;
    };
    scene.addEventListener("pointerenter", onEnter);
    scene.addEventListener("pointerleave", onLeave);
    scene.addEventListener("pointerdown", onDown);
    scene.addEventListener("pointermove", onMove);
    scene.addEventListener("pointerup", onUp);
    scene.addEventListener("pointercancel", onUp);
    return () => {
      scene.removeEventListener("pointerenter", onEnter);
      scene.removeEventListener("pointerleave", onLeave);
      scene.removeEventListener("pointerdown", onDown);
      scene.removeEventListener("pointermove", onMove);
      scene.removeEventListener("pointerup", onUp);
      scene.removeEventListener("pointercancel", onUp);
    };
  }, []);

  // --- the animation loop
  useEffect(() => {
    const touch = isTouchDevice();
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
      // the face being looked at: hovered (read from :hover rather than
      // enter/leave events, which flicker as squares press in), or tapped
      let hovered = -1;
      if (!touch) {
        const el = sceneRef.current.querySelector(".rc-face:hover");
        hovered = el ? Number(el.dataset.face) : state.tapped;
      } else hovered = state.tapped;
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
        const k = 1 - Math.exp(-dt * (paused ? 6 : 1.1));
        state.omega = state.omega.map((v, i) => v + (axis[i] * speed - v) * k);
        const w = Math.hypot(...state.omega);
        if (w > 1e-5) state.q = normalize(multiply(fromAxisAngle(...state.omega, w * dt), state.q));
      }
      const shown = state.select ? state.q : multiply(state.tilt, state.q);
      if (cubeRef.current) {
        cubeRef.current.style.transform = toCss(shown);
        placeOverlays(shown, cubeRef.current.offsetWidth / 2);
      }
    };

    // labels (and the hologram) sit over the projected centres of the faces
    // that face the viewer, fading out as a face turns away
    const placeOverlays = (q, half) => {
      FACES.forEach((face, f) => {
        const n = rotate(q, face.normal);
        const s = PERSPECTIVE / (PERSPECTIVE - n[2] * half);
        const x = n[0] * half * s;
        const y = n[1] * half * s;
        const visible = clamp01((n[2] - 0.15) / 0.45);
        const label = labelRefs.current[f];
        if (label) {
          label.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%) scale(${(0.82 + 0.18 * visible).toFixed(3)})`;
          label.style.opacity = visible.toFixed(3);
        }
        if (f === state.active && holoRef.current) {
          holoRef.current.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%) scale(${s.toFixed(3)})`;
          holoRef.current.style.opacity = clamp01((n[2] - 0.1) / 0.3).toFixed(3);
        }
      });
    };

    // pick: face forward, flatten to a square, shrink to a dot, go
    const runSelect = (now) => {
      const s = state.select;
      const e = now - s.start;
      if (e < ALIGN_MS) {
        state.q = slerp(s.from, s.to, easeInOut(e / ALIGN_MS));
        return;
      }
      state.q = s.to;
      const squash = squashRef.current;
      const dot = dotRef.current;
      if (e < ALIGN_MS + FLATTEN_MS) {
        const k = easeInOut((e - ALIGN_MS) / FLATTEN_MS);
        squash.style.transform = `scale3d(1, 1, ${Math.max(0.001, 1 - k)})`;
        return;
      }
      const k = Math.min(1, (e - ALIGN_MS - FLATTEN_MS) / DOT_MS);
      const shrink = Math.max(0.012, 1 - easeInOut(k));
      squash.style.transform = `scale3d(${shrink}, ${shrink}, 0.001)`;
      dot.style.opacity = String(Math.min(1, k * 2.2));
      dot.style.transform = `translate(-50%, -50%) scale(${0.4 + 0.6 * Math.sin(Math.min(1, k * 1.4) * Math.PI * 0.5)})`;
      if (k >= 1 && !s.done) {
        s.done = true;
        window.location.assign(s.href);
      }
    };

    raf = requestAnimationFrame(loop);

    // back button from the next page: the browser may restore this page as
    // it was left (collapsed to a dot), so put the cube back
    const onPageShow = (e) => {
      if (!e.persisted) return;
      state.select = null;
      state.omega = [0, 0, 0];
      if (squashRef.current) squashRef.current.style.transform = "";
      if (dotRef.current) dotRef.current.style.opacity = "0";
      setCollapsing(false);
    };
    window.addEventListener("pageshow", onPageShow);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);

  // the rotation that brings a face to the front, upright, the short way round
  const facing = (face) => {
    const to = conjugate(face.q);
    const d = to[0] * state.q[0] + to[1] * state.q[1] + to[2] * state.q[2] + to[3] * state.q[3];
    return d < 0 ? to.map((v) => -v) : to;
  };

  // phones: tapping a square shows its face's hologram and holds the cube
  const look = (f) => {
    if (state.dragged) {
      state.dragged = false;
      return;
    }
    if (isTouchDevice()) state.tapped = state.tapped === f ? -1 : f;
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
    state.select = { start: performance.now(), from, to: facing(face), href: link.href };
    setCollapsing(true);
  };

  return (
    <div className={collapsing ? "rc-scene is-collapsing" : "rc-scene"} ref={sceneRef}>
      <div className="rc-squash" ref={squashRef}>
        <div className="rc-cube" ref={cubeRef} style={{ transform: toCss(START) }}>
          {FACES.map((face, f) => {
            const link = links[f];
            return (
              <div key={face.name} data-face={f} className={`rc-face rc-face-${face.name}`} style={{ transform: `${face.rotate} translateZ(var(--rc-half))` }}>
                {Array.from({ length: 9 }, (_, i) =>
                  i === 4 ? (
                    <a
                      key={i}
                      className="rc-cell rc-link"
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
                      <span className="rc-sr">{`${link.label}: ${link.sub}`}</span>
                    </a>
                  ) : (
                    <span
                      key={i}
                      className="rc-cell"
                      onClick={() => look(f)}
                      style={{ "--rc-wave": `${(((i % 3) + Math.floor(i / 3) + f * 2) * 0.35).toFixed(2)}s` }}
                    />
                  ),
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div className="rc-overlays" aria-hidden="true">
        <div className="rc-holo" ref={holoRef}>
          {active >= 0 && (
            <div key={active} className={`holo-card holo-card-${FACES[active].name}`}>
              {links[active].holo}
            </div>
          )}
        </div>
        {links.map((link, f) => (
          <span
            key={link.href}
            ref={(el) => {
              labelRefs.current[f] = el;
            }}
            className={f === active ? "rc-label is-active" : "rc-label"}
          >
            <span className="rc-label-index">{String(f + 1).padStart(2, "0")}</span>
            <span className="rc-label-text">{link.label}</span>
            <span className="rc-label-sub">{link.sub}</span>
          </span>
        ))}
      </div>
      <span className="rc-dot" ref={dotRef} aria-hidden="true" />
    </div>
  );
};

export default RubikCube;
