import { useEffect, useRef, useState } from "react";

// Phone tilt, shared by the pages that react to it (Art, Home).
//
// Calls onTilt(x, y) with the phone's tilt in degrees relative to however it
// was held at first (the baseline slowly re-centres, so any comfortable angle
// works): x > 0 when the right edge dips, y > 0 when the top edge rises.
// Screen rotation is accounted for.
//
// Android sends orientation straight away. iPhones only share it after the
// visitor grants permission from a tap, so when nothing arrives and the
// browser can ask, showHint turns true: render a button that calls
// requestPermission. If the phone refuses (the visitor said no, now or
// earlier), denied turns true, so the page can say so rather than just
// losing the button.

// Ask for both motion and orientation in one tap: pages use one or the
// other, and a grant for one doesn't always cover the other on iOS. Both
// asks start synchronously, inside the tap. Resolves true if either is
// granted.
export const askForMotion = () => {
  const asks = [window.DeviceOrientationEvent, window.DeviceMotionEvent]
    .filter((E) => E && typeof E.requestPermission === "function")
    .map((E) => E.requestPermission().catch(() => "denied"));
  return Promise.all(asks).then((states) => states.includes("granted"));
};

export const canAskForOrientation = () =>
  typeof window !== "undefined" &&
  typeof window.DeviceOrientationEvent !== "undefined" &&
  typeof window.DeviceOrientationEvent.requestPermission === "function";

export const isTouchDevice = () =>
  typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(pointer: coarse)").matches;

export const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  !!window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const RECENTRE = 0.004; // per event (~60/s): the baseline drifts toward the current tilt
const SMOOTH = 0.35; // per event: how quickly the reading follows the phone

const DEG = Math.PI / 180;

// The phone's orientation as a quaternion [w, x, y, z] (device frame to
// Earth frame), from the orientation event's Z-X'-Y'' angles.
const toQuat = (alpha, beta, gamma) => {
  const [cx, cy, cz] = [beta, gamma, alpha].map((a) => Math.cos((a * DEG) / 2));
  const [sx, sy, sz] = [beta, gamma, alpha].map((a) => Math.sin((a * DEG) / 2));
  return [
    cx * cy * cz - sx * sy * sz,
    sx * cy * cz - cx * sy * sz,
    cx * sy * cz + sx * cy * sz,
    cx * cy * sz + sx * sy * cz,
  ];
};

const mul = (a, b) => [
  a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3],
  a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2],
  a[0] * b[2] - a[1] * b[3] + a[2] * b[0] + a[3] * b[1],
  a[0] * b[3] + a[1] * b[2] - a[2] * b[1] + a[3] * b[0],
];

const conj = (q) => [q[0], -q[1], -q[2], -q[3]];

// a step of k from a toward b, the short way round
const toward = (a, b, k) => {
  const dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  const s = dot < 0 ? -1 : 1;
  const q = a.map((v, i) => v + (s * b[i] - v) * k);
  const len = Math.hypot(...q) || 1;
  return q.map((v) => v / len);
};

const useDeviceTilt = (onTilt, enabled = true) => {
  const onTiltRef = useRef(onTilt);
  onTiltRef.current = onTilt;
  const startRef = useRef(null);
  const [showHint, setShowHint] = useState(false);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (!enabled || !isTouchDevice() || typeof window.DeviceOrientationEvent === "undefined") return undefined;

    // The tilt is worked out from the phone's whole orientation, as a turn
    // from how it was held: the raw angles jump near upright (beta ~ 90deg,
    // how a phone is usually held, gamma can flip by 180deg between events),
    // and gravity alone misses turns about the vertical, such as rolling an
    // upright phone left and right. The orientation has neither problem.
    let seen = false;
    let base = null; // the orientation when first held, slowly re-centring
    let cur = null; // the orientation now, smoothed a little
    const onOrientation = (e) => {
      if (e.beta === null || e.beta === undefined || e.gamma === null || e.gamma === undefined) return;
      const now = toQuat(e.alpha || 0, e.beta, e.gamma);
      if (!seen) {
        // data is flowing: no need to ask for it
        seen = true;
        clearTimeout(hintTimer);
        setShowHint(false);
        base = now;
        cur = now;
      }
      cur = toward(cur, now, SMOOTH);
      base = toward(base, cur, RECENTRE);
      // the turn from the baseline to now, in the phone's own frame
      // (x right, y to the top edge, z out of the screen), as axis * angle
      let d = mul(conj(base), cur);
      if (d[0] < 0) d = d.map((v) => -v);
      const sin = Math.hypot(d[1], d[2], d[3]);
      const k = sin > 1e-6 ? (2 * Math.atan2(sin, d[0])) / sin / DEG : 0;
      let rx = d[1] * k;
      let ry = d[2] * k;
      const rz = d[3] * k;
      // ...turned into the screen's frame when the screen is rotated
      const angle =
        (window.screen && window.screen.orientation && window.screen.orientation.angle) || window.orientation || 0;
      const r = angle * DEG;
      [rx, ry] = [rx * Math.cos(r) + ry * Math.sin(r), -rx * Math.sin(r) + ry * Math.cos(r)];
      // x > 0: right edge dipped (tipped sideways, or rolled clockwise like
      // a steering wheel); y > 0: top edge raised
      onTiltRef.current(ry - rz, rx);
    };

    let listening = false;
    const start = () => {
      if (listening) return;
      listening = true;
      window.addEventListener("deviceorientation", onOrientation);
    };
    startRef.current = start;
    start();
    const hintTimer = setTimeout(() => {
      if (!seen && canAskForOrientation()) setShowHint(true);
    }, 1000);

    return () => {
      clearTimeout(hintTimer);
      window.removeEventListener("deviceorientation", onOrientation);
      startRef.current = null;
    };
  }, [enabled]);

  const requestPermission = () => {
    setShowHint(false);
    askForMotion().then((granted) => {
      if (!granted) setDenied(true);
      else if (startRef.current) startRef.current();
    });
  };

  return { showHint, requestPermission, denied };
};

export default useDeviceTilt;
