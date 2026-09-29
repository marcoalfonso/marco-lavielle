import React, { useEffect, useRef, useState } from "react";

// The painting hovers above a holo platform. On desktop it leans toward the
// pointer; on phones it slides the way the phone is tilted (sideways, up and
// down). No library: a small spring eases an {x, y} offset in [-1, 1] toward
// its target every frame and writes CSS transforms.

// iPhones only share orientation data after the visitor grants permission,
// and the request has to come from a tap.
const canAskForOrientation = () =>
  typeof window !== "undefined" &&
  typeof window.DeviceOrientationEvent !== "undefined" &&
  typeof window.DeviceOrientationEvent.requestPermission === "function";

const isTouchDevice = () =>
  typeof window !== "undefined" && window.matchMedia && window.matchMedia("(pointer: coarse)").matches;

const clamp = (v) => Math.max(-1, Math.min(1, v));

const PHONE_TILT = 20; // deg of tilt (from however the phone was held) for the full offset
const SPRING = 38; // stiffness; with DAMPING the painting overshoots a touch, like it's floating
const DAMPING = 9;
const SWIPE = 45; // px

// sideways / up-down shift (px) and lean (deg) at full offset
const desktopMove = { x: 18, y: 12, turn: 14, tip: 10 };
const phoneMove = () => ({ x: window.innerWidth * 0.08, y: window.innerHeight * 0.05, turn: 12, tip: 9 });

const Platform = ({ spillSrc }) => {
  const ticks = [];
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    const r1 = i % 6 === 0 ? 64 : 61.5;
    ticks.push(`M${Math.cos(a) * 59} ${Math.sin(a) * 59}L${Math.cos(a) * r1} ${Math.sin(a) * r1}`);
  }
  return (
    <div className="art-platform" aria-hidden="true">
      <div className="art-platform-disc">
        {/* the painting's colours spilling onto the platform */}
        <div className="art-platform-spill" style={{ backgroundImage: `url(${spillSrc})` }} />
        <svg viewBox="-72 -72 144 144">
          <defs>
            <radialGradient id="art-platform-glow">
              <stop offset="0%" stopColor="#6ff5ee" stopOpacity="0.35" />
              <stop offset="35%" stopColor="#3d8bff" stopOpacity="0.16" />
              <stop offset="100%" stopColor="#3d8bff" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle r="75" fill="url(#art-platform-glow)" />
          <circle className="art-ring" r="34" strokeOpacity="0.55" />
          <circle className="art-ring" r="38" strokeOpacity="0.28" />
          <circle className="art-ring art-ring-dashed" r="47" strokeOpacity="0.45" />
          <circle className="art-ring" r="56" strokeOpacity="0.18" />
          <path className="art-ring art-ring-ticks" d={ticks.join("")} strokeOpacity="0.22" />
          <circle className="art-ring" r="68" strokeOpacity="0.08" />
        </svg>
      </div>
    </div>
  );
};

const PaintingStage = ({ src, spillSrc, name, index, onNext, onPrev, onLoaded }) => {
  const floatRef = useRef(null);
  const baseRef = useRef(null);
  const orientationRef = useRef(null); // { start } once listening is set up
  const swipeRef = useRef(null);
  const [showHint, setShowHint] = useState(false);
  // The painting on show only changes once the next one has fully
  // downloaded, so a half-loaded image never appears; until then the
  // previous one stays up, dimmed, with a loading readout.
  const [shown, setShown] = useState(null); // { src, name, index }
  const loading = !shown || shown.src !== src;

  useEffect(() => {
    let cancelled = false;
    const img = new Image();
    img.onload = img.onerror = () => {
      if (cancelled) return;
      setShown({ src, name, index });
      if (onLoaded) onLoaded();
    };
    img.src = src;
    return () => {
      cancelled = true;
    };
  }, [src]);

  const requestOrientation = (e) => {
    e.stopPropagation();
    setShowHint(false);
    window.DeviceOrientationEvent.requestPermission()
      .then((state) => {
        if (state === "granted" && orientationRef.current) orientationRef.current.start();
      })
      .catch(() => {
        // denied or unavailable: the painting just keeps floating
      });
  };

  useEffect(() => {
    const reduceMotion =
      window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return undefined;

    const touch = isTouchDevice();
    const target = { x: 0, y: 0 };
    const pos = { x: 0, y: 0 };
    const vel = { x: 0, y: 0 };

    // --- desktop: lean toward the pointer (its offset from the page centre)
    const onPointerMove = (e) => {
      if (e.pointerType === "touch") return;
      target.x = clamp((e.clientX / window.innerWidth) * 2 - 1);
      target.y = clamp((e.clientY / window.innerHeight) * 2 - 1);
    };
    const onPointerOut = (e) => {
      if (!e.relatedTarget) target.x = target.y = 0; // left the window
    };
    window.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerout", onPointerOut);

    // --- phones: slide the way the phone tilts, relative to however it was
    // held at first (slowly re-centring, so any comfortable angle works)
    let seen = false;
    let hintTimer = null;
    const base = { x: 0, y: 0 };
    const onOrientation = (e) => {
      if (e.beta === null || e.beta === undefined || e.gamma === null || e.gamma === undefined) return;
      const angle =
        (window.screen && window.screen.orientation && window.screen.orientation.angle) || window.orientation || 0;
      let x = e.gamma; // right edge down: +
      let y = e.beta; // top edge up: +
      switch (((angle % 360) + 360) % 360) {
        case 90:
          x = e.beta;
          y = -e.gamma;
          break;
        case 180:
          x = -e.gamma;
          y = -e.beta;
          break;
        case 270:
          x = -e.beta;
          y = e.gamma;
          break;
        default:
      }
      if (!seen) {
        // data is flowing: no need to ask for it
        seen = true;
        clearTimeout(hintTimer);
        setShowHint(false);
        base.x = x;
        base.y = y;
      }
      base.x += (x - base.x) * 0.004;
      base.y += (y - base.y) * 0.004;
      // like a marble on a tray: it slides toward the lower edge
      target.x = clamp((x - base.x) / PHONE_TILT);
      target.y = clamp((y - base.y) / PHONE_TILT);
    };
    let listening = false;
    const start = () => {
      if (listening) return;
      listening = true;
      window.addEventListener("deviceorientation", onOrientation);
    };
    orientationRef.current = { start };
    if (touch && typeof window.DeviceOrientationEvent !== "undefined") {
      // Listen straight away: Android sends orientation without asking. If
      // nothing arrives and the browser can ask (iPhone), offer the hint.
      start();
      hintTimer = setTimeout(() => {
        if (!seen && canAskForOrientation()) setShowHint(true);
      }, 1000);
    }

    // --- loop
    let raf = null;
    let last = performance.now();
    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(1 / 30, (now - last) / 1000);
      last = now;
      if (document.hidden) return;
      ["x", "y"].forEach((k) => {
        vel[k] += (SPRING * (target[k] - pos[k]) - DAMPING * vel[k]) * dt;
        pos[k] += vel[k] * dt;
      });
      const move = touch ? phoneMove() : desktopMove;
      const tx = pos.x * move.x;
      const ty = pos.y * move.y;
      if (floatRef.current) {
        floatRef.current.style.transform =
          `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0) ` +
          `rotateX(${(-pos.y * move.tip).toFixed(2)}deg) rotateY(${(pos.x * move.turn).toFixed(2)}deg)`;
      }
      // the beam and the painting's shadow follow it across the platform
      if (baseRef.current) {
        baseRef.current.style.setProperty("--art-shift", `${(tx * 0.6).toFixed(2)}px`);
        baseRef.current.style.setProperty("--art-lift", (pos.y * 0.5).toFixed(3));
      }
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(hintTimer);
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerout", onPointerOut);
      window.removeEventListener("deviceorientation", onOrientation);
      orientationRef.current = null;
    };
  }, []);

  // tap the painting for the next one; swipe for either direction
  const onTouchStart = (e) => {
    const t = e.touches[0];
    swipeRef.current = { x: t.clientX, y: t.clientY, swiped: false };
  };
  const onTouchEnd = (e) => {
    const s = swipeRef.current;
    if (!s) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - s.x;
    if (Math.abs(dx) > SWIPE && Math.abs(dx) > Math.abs(t.clientY - s.y)) {
      s.swiped = true;
      if (dx < 0) onNext();
      else onPrev();
    }
  };
  const onClick = () => {
    if (swipeRef.current && swipeRef.current.swiped) {
      swipeRef.current = null;
      return;
    }
    onNext();
  };

  return (
    <main className="art-stage" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className="art-float-wrap">
        <div className="art-float" ref={floatRef}>
          <div className="art-bob">
            <button
              type="button"
              className={loading ? "art-painting is-loading" : "art-painting"}
              onClick={onClick}
              aria-label="Next painting"
              aria-busy={loading}
            >
              {shown ? (
                <>
                  <img key={shown.index} className="art-painting-img" src={shown.src} alt={shown.name} />
                  <span key={`scan-${shown.index}`} className="art-scan" aria-hidden="true" />
                </>
              ) : (
                <span className="art-painting-placeholder" />
              )}
              {loading && (
                <span className="art-loading" aria-hidden="true">
                  <span className="art-loading-dot" />
                  Loading
                </span>
              )}
            </button>
            <span className="art-corner art-corner-tl" aria-hidden="true" />
            <span className="art-corner art-corner-tr" aria-hidden="true" />
            <span className="art-corner art-corner-bl" aria-hidden="true" />
            <span className="art-corner art-corner-br" aria-hidden="true" />
          </div>
        </div>
      </div>
      <div className="art-base" ref={baseRef}>
        <div className="art-beam" aria-hidden="true" />
        <div className="art-shadow" aria-hidden="true" />
        <Platform spillSrc={spillSrc} />
        {showHint && (
          <button type="button" className="art-hint" onClick={requestOrientation}>
            <span className="art-hint-icon" aria-hidden="true" />
            Tap, then move your phone
          </button>
        )}
      </div>
    </main>
  );
};

export default PaintingStage;
