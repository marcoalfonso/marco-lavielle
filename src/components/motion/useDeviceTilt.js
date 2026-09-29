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

const useDeviceTilt = (onTilt, enabled = true) => {
  const onTiltRef = useRef(onTilt);
  onTiltRef.current = onTilt;
  const startRef = useRef(null);
  const [showHint, setShowHint] = useState(false);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (!enabled || !isTouchDevice() || typeof window.DeviceOrientationEvent === "undefined") return undefined;

    let seen = false;
    const base = { x: 0, y: 0 };
    const onOrientation = (e) => {
      if (e.beta === null || e.beta === undefined || e.gamma === null || e.gamma === undefined) return;
      const angle =
        (window.screen && window.screen.orientation && window.screen.orientation.angle) || window.orientation || 0;
      let x = e.gamma;
      let y = e.beta;
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
      base.x += (x - base.x) * RECENTRE;
      base.y += (y - base.y) * RECENTRE;
      onTiltRef.current(x - base.x, y - base.y);
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
