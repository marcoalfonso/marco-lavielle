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

const normalize = (v) => {
  const len = Math.hypot(...v) || 1;
  return v.map((c) => c / len);
};

const useDeviceTilt = (onTilt, enabled = true) => {
  const onTiltRef = useRef(onTilt);
  onTiltRef.current = onTilt;
  const startRef = useRef(null);
  const [showHint, setShowHint] = useState(false);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (!enabled || !isTouchDevice() || typeof window.DeviceOrientationEvent === "undefined") return undefined;

    // The tilt is worked out from the direction of gravity rather than from
    // the raw angles: near upright (beta ~ 90deg, how a phone is usually
    // held) gamma can flip by 180deg from one event to the next, which threw
    // whatever followed the tilt halfway round. Gravity has no such jump.
    let seen = false;
    let base = null; // gravity when first held, slowly re-centring
    let cur = null; // gravity now, smoothed a little
    const onOrientation = (e) => {
      if (e.beta === null || e.beta === undefined || e.gamma === null || e.gamma === undefined) return;
      const b = (e.beta * Math.PI) / 180;
      const g = (e.gamma * Math.PI) / 180;
      // gravity in the phone's frame (x right, y to the top edge, z out of the screen)
      let gx = Math.cos(b) * Math.sin(g);
      let gy = -Math.sin(b);
      const gz = -Math.cos(b) * Math.cos(g);
      // ...turned into the screen's frame when the screen is rotated
      const angle =
        (window.screen && window.screen.orientation && window.screen.orientation.angle) || window.orientation || 0;
      const r = (angle * Math.PI) / 180;
      const sx = gx * Math.cos(r) + gy * Math.sin(r);
      const sy = -gx * Math.sin(r) + gy * Math.cos(r);
      gx = sx;
      gy = sy;
      const now = [gx, gy, gz];
      if (!seen) {
        // data is flowing: no need to ask for it
        seen = true;
        clearTimeout(hintTimer);
        setShowHint(false);
        base = now.slice();
        cur = now.slice();
      }
      cur = normalize(cur.map((v, i) => v + (now[i] - v) * SMOOTH));
      base = normalize(base.map((v, i) => v + (cur[i] - v) * RECENTRE));
      // the turn from the baseline to now, as angles about the screen's axes
      const cross = [
        base[1] * cur[2] - base[2] * cur[1],
        base[2] * cur[0] - base[0] * cur[2],
        base[0] * cur[1] - base[1] * cur[0],
      ];
      const sin = Math.hypot(...cross);
      const cos = base[0] * cur[0] + base[1] * cur[1] + base[2] * cur[2];
      const turn = Math.atan2(sin, cos); // radians
      const k = sin > 1e-6 ? ((turn / sin) * 180) / Math.PI : 0;
      // x > 0: right edge dipped; y > 0: top edge raised (as before)
      onTiltRef.current(-cross[1] * k, -cross[0] * k);
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
