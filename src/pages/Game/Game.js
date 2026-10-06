import React, { useRef, useEffect, useState, useCallback } from "react";
import HoloPanel from "components/holo/HoloPanel";
import loadOrbitron from "components/fonts/loadOrbitron";
import { createGame } from "./engine/createGame";
import { TOTAL_CRYSTALS } from "./engine/layout";
import "components/holo/holo.css";
import "./Game.css";

// The playground: drive a little neon world, knock the name over, collect
// the crystals. The HUD and its cards are drawn in the site's holo style.

const isMobile = () =>
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
  window.innerWidth <= 768;

const BEST_KEY = "marco-game-best-time";
const readBest = () => {
  try {
    const v = parseFloat(window.localStorage.getItem(BEST_KEY));
    return Number.isFinite(v) ? v : null;
  } catch (e) {
    return null;
  }
};
const writeBest = (t) => {
  try {
    window.localStorage.setItem(BEST_KEY, String(t));
  } catch (e) {
    // storage unavailable (private mode) — best time just isn't kept
  }
};

const formatTime = (s) => {
  const m = Math.floor(s / 60);
  const sec = (s % 60).toFixed(1).padStart(4, "0");
  return `${m}:${sec}`;
};

// line icons for the HUD buttons
const Icon = ({ name }) => {
  const common = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };
  if (name === "sound")
    return (
      <svg {...common}>
        <path d="M4 9v6h4l5 4V5L8 9H4z" />
        <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" />
      </svg>
    );
  if (name === "muted")
    return (
      <svg {...common}>
        <path d="M4 9v6h4l5 4V5L8 9H4z" />
        <path d="M17 9l5 6M22 9l-5 6" />
      </svg>
    );
  if (name === "reset")
    return (
      <svg {...common}>
        <path d="M4 12a8 8 0 1 0 2.4-5.7" />
        <path d="M4 4v4.5h4.5" />
      </svg>
    );
  if (name === "help")
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M9.6 9.3a2.5 2.5 0 0 1 4.8.9c0 1.8-2.4 2.2-2.4 3.8" />
        <path d="M12 17.2h.01" />
      </svg>
    );
  // arrows: up, down, left, right
  const turn = { up: 0, right: 90, down: 180, left: 270 }[name];
  return (
    <svg {...common} width={26} height={26} style={{ transform: `rotate(${turn}deg)` }}>
      <path d="M12 19V5M6 11l6-6 6 6" />
    </svg>
  );
};

const HoldButton = ({ label, name, children, pressed, onChange, className = "" }) => {
  const start = (e) => {
    e.preventDefault();
    onChange(name, true);
  };
  const end = (e) => {
    e.preventDefault();
    onChange(name, false);
  };
  return (
    <div
      className={`game-pad-btn ${pressed ? "is-pressed" : ""} ${className}`}
      aria-label={label}
      onTouchStart={start}
      onTouchEnd={end}
      onTouchCancel={end}
      onMouseDown={start}
      onMouseUp={end}
      onMouseLeave={(e) => pressed && end(e)}
    >
      {children}
    </div>
  );
};

// waits (briefly) for the display font, so the world's painted labels use it
const fontReady = () => {
  loadOrbitron();
  if (!document.fonts || !document.fonts.load) return Promise.resolve();
  // the font is only known once its stylesheet has arrived
  const link = document.getElementById("orbitron-font");
  const sheet =
    link && !link.sheet
      ? new Promise((resolve) => {
          link.addEventListener("load", resolve, { once: true });
          link.addEventListener("error", resolve, { once: true });
        })
      : Promise.resolve();
  const timeout = new Promise((resolve) => setTimeout(resolve, 3000));
  return Promise.race([
    sheet.then(() => Promise.all([document.fonts.load("700 64px Orbitron"), document.fonts.load("600 32px Orbitron")])),
    timeout,
  ]).catch(() => {});
};

const CarGame = () => {
  const mountRef = useRef(null);
  const gameRef = useRef(null);
  const toastId = useRef(0);
  const [mobile] = useState(isMobile);
  const [score, setScore] = useState(0);
  const [hud, setHud] = useState({ speed: 0, time: 0, boosting: false });
  const [toasts, setToasts] = useState([]);
  const [zone, setZone] = useState(null);
  const [flipped, setFlipped] = useState(false);
  const [muted, setMuted] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [intro, setIntro] = useState(true);
  const [win, setWin] = useState(null);
  const [pressed, setPressed] = useState({});

  const toast = useCallback((text) => {
    const id = ++toastId.current;
    setToasts((list) => [...list.slice(-2), { id, text }]);
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 2400);
  }, []);

  useEffect(() => {
    document.documentElement.classList.add("game-html");
    let game = null;
    let cancelled = false;
    fontReady().then(() => {
      if (cancelled || !mountRef.current) return;
      game = createGame(mountRef.current, {
        isMobile: mobile,
        callbacks: {
          onCrystal: (n) => {
            setScore(n);
            if (n < TOTAL_CRYSTALS) toast(`Crystal ${n} / ${TOTAL_CRYSTALS}`);
          },
          onWin: ({ time }) => {
            const best = readBest();
            const isBest = best === null || time < best;
            if (isBest) writeBest(time);
            setTimeout(() => setWin({ time, best: isBest ? time : best, isBest }), 1200);
          },
          onZone: setZone,
          onToast: toast,
          onFlipped: setFlipped,
          onHud: setHud,
          onMute: setMuted,
        },
      });
      gameRef.current = game;
    });
    return () => {
      cancelled = true;
      document.documentElement.classList.remove("game-html");
      if (game) game.dispose();
      gameRef.current = null;
    };
  }, [mobile, toast]);

  // Dismiss the intro card on the first interaction
  useEffect(() => {
    if (!intro) return undefined;
    const dismiss = (e) => {
      if (e && e.target && e.target.closest && e.target.closest(".game-home")) return;
      setIntro(false);
    };
    const timer = setTimeout(dismiss, 8000);
    window.addEventListener("keydown", dismiss);
    window.addEventListener("pointerdown", dismiss);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", dismiss);
      window.removeEventListener("pointerdown", dismiss);
    };
  }, [intro]);

  const setVirtual = (name, value) => {
    if (gameRef.current) gameRef.current.setVirtual(name, value);
    setPressed((prev) => ({ ...prev, [name]: value }));
  };
  const call = (fn) => () => gameRef.current && gameRef.current[fn]();

  return (
    <div className={`game-root holo-ui${mobile ? " is-touch" : ""}`}>
      <div ref={mountRef} className="game-canvas" />
      <div className="game-vignette" aria-hidden="true" />

      <a className="game-home" href="/">
        <span aria-hidden="true">&lsaquo;</span> Marco Lavielle
      </a>

      {/* progress */}
      <div className="game-readouts">
        <div className="game-readout">
          <span className="game-readout-label">Crystals</span>
          <span className="game-readout-value">
            {String(score).padStart(2, "0")}
            <small> / {String(TOTAL_CRYSTALS).padStart(2, "0")}</small>
          </span>
        </div>
        <div className="game-readout">
          <span className="game-readout-label">Time</span>
          <span className="game-readout-value">{formatTime(hud.time)}</span>
        </div>
      </div>

      {/* toggles */}
      <div className="game-tools">
        <button type="button" className="game-tool" title="Sound (M)" aria-label={muted ? "Sound on" : "Mute"} onClick={call("toggleMute")}>
          <Icon name={muted ? "muted" : "sound"} />
        </button>
        <button type="button" className="game-tool" title="Reset car (R)" aria-label="Reset car" onClick={call("resetCar")}>
          <Icon name="reset" />
        </button>
        <button
          type="button"
          className={helpOpen ? "game-tool is-on" : "game-tool"}
          title="Help"
          aria-label="Help"
          aria-expanded={helpOpen}
          onClick={() => setHelpOpen((v) => !v)}
        >
          <Icon name="help" />
        </button>
      </div>

      {!mobile && (
        <div className={`game-speed ${hud.boosting ? "is-boost" : ""}`}>
          <span className="game-speed-value">{String(hud.speed).padStart(3, "0")}</span>
          <span className="game-speed-unit">km/h{hud.boosting ? " · boost" : ""}</span>
        </div>
      )}

      <div className="game-toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="game-toast">
            {t.text}
          </div>
        ))}
      </div>

      {zone && (
        <button type="button" className="game-zone" onClick={call("openActivePad")}>
          <span className="game-zone-title">{zone.title}</span>
          <span className="game-zone-cta">{mobile ? "Tap to open ›" : "Press Enter to open ›"}</span>
        </button>
      )}

      {flipped && !zone && (
        <button type="button" className="game-zone" onClick={call("resetCar")}>
          <span className="game-zone-title">Upside down?</span>
          <span className="game-zone-cta">{mobile ? "Tap to flip back" : "Press R to flip back"}</span>
        </button>
      )}

      {intro && (
        <HoloPanel as="div" className="game-card game-intro">
          <p className="holo-kicker">Playground · ML-01</p>
          <h1 className="holo-title game-card-title">Marco Lavielle</h1>
          <p>
            A little world to drive around. Knock over the letters, bowl a strike, score a goal, fly through the hoop,
            and collect all {TOTAL_CRYSTALS} crystals.
          </p>
          <p className="game-hint">
            {mobile ? "Tap anywhere to start" : "Arrows / WASD to drive · Shift boost · Space drift · press any key"}
          </p>
        </HoloPanel>
      )}

      {helpOpen && (
        <HoloPanel as="div" className="game-card game-help" onClick={() => setHelpOpen(false)}>
          <p className="holo-kicker">Controls</p>
          <ul>
            <li><b>↑ ↓ ← →</b> / <b>WASD</b> drive</li>
            <li><b>Shift</b> boost · <b>Space</b> handbrake drift</li>
            <li><b>H</b> horn · <b>R</b> reset / flip · <b>M</b> mute</li>
            <li><b>Enter</b> open a project pad · scroll to zoom</li>
          </ul>
          <p className="holo-kicker">Things to do</p>
          <ul>
            <li>Bowl a strike in the playground</li>
            <li>Push the ball into a goal in the stadium</li>
            <li>Jump through the glowing hoop in the jump park</li>
            <li>Smash the brick wall, topple the dominoes</li>
            <li>Follow the beams of light to all {TOTAL_CRYSTALS} crystals</li>
          </ul>
          <p className="game-hint">psst… ↑ ↑ ↓ ↓ ← → ← → B A</p>
        </HoloPanel>
      )}

      {win && (
        <div className="game-win-backdrop">
          <HoloPanel as="div" className="game-card game-win" role="dialog" aria-label="All crystals found">
            <p className="holo-kicker">All {TOTAL_CRYSTALS} crystals found</p>
            <p className="game-win-time">{formatTime(win.time)}</p>
            <p className="game-win-best">{win.isBest ? "New best time" : `Best ${formatTime(win.best)}`}</p>
            <div className="game-win-actions">
              <button type="button" className="holo-button" onClick={() => window.location.reload()}>
                Play again
              </button>
              <button type="button" className="holo-button is-quiet" onClick={() => setWin(null)}>
                Keep driving
              </button>
              <a className="holo-button is-quiet" href="/">
                Back to site
              </a>
            </div>
          </HoloPanel>
        </div>
      )}

      {mobile && (
        <>
          <div className="game-pad steer">
            <HoldButton label="Steer left" name="left" pressed={!!pressed.left} onChange={setVirtual}>
              <Icon name="left" />
            </HoldButton>
            <HoldButton label="Steer right" name="right" pressed={!!pressed.right} onChange={setVirtual}>
              <Icon name="right" />
            </HoldButton>
          </div>
          <div className="game-pad extras">
            <HoldButton label="Boost" name="boost" pressed={!!pressed.boost} onChange={setVirtual} className="small">
              Boost
            </HoldButton>
            <HoldButton label="Drift" name="brake" pressed={!!pressed.brake} onChange={setVirtual} className="small">
              Drift
            </HoldButton>
            <HoldButton label="Horn" name="horn" pressed={!!pressed.horn} onChange={setVirtual} className="small">
              Horn
            </HoldButton>
          </div>
          <div className="game-pad throttle">
            <HoldButton label="Accelerate" name="up" pressed={!!pressed.up} onChange={setVirtual}>
              <Icon name="up" />
            </HoldButton>
            <HoldButton label="Reverse" name="down" pressed={!!pressed.down} onChange={setVirtual}>
              <Icon name="down" />
            </HoldButton>
          </div>
        </>
      )}
    </div>
  );
};

export default CarGame;
