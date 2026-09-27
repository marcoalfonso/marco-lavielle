import React, { useRef, useEffect, useState, useCallback } from "react";
import { createGame } from "./engine/createGame";
import { TOTAL_CRYSTALS } from "./engine/layout";

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

const HoldButton = ({ label, name, glyph, pressed, onChange, className = "" }) => {
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
      className={`mobile-ctrl-btn ${pressed ? "is-pressed" : ""} ${className}`}
      aria-label={label}
      onTouchStart={start}
      onTouchEnd={end}
      onTouchCancel={end}
      onMouseDown={start}
      onMouseUp={end}
      onMouseLeave={(e) => pressed && end(e)}
    >
      {glyph}
    </div>
  );
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
  const [nightMode, setNightMode] = useState(false);
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
    if (!mountRef.current) return undefined;
    const game = createGame(mountRef.current, {
      isMobile: mobile,
      callbacks: {
        onCrystal: (n) => {
          setScore(n);
          if (n < TOTAL_CRYSTALS) toast(`💎 ${n} / ${TOTAL_CRYSTALS}`);
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
        onNight: setNightMode,
        onMute: setMuted,
      },
    });
    gameRef.current = game;
    return () => {
      game.dispose();
      gameRef.current = null;
    };
  }, [mobile, toast]);

  // Dismiss the intro card on the first interaction
  useEffect(() => {
    if (!intro) return undefined;
    const dismiss = () => setIntro(false);
    const timer = setTimeout(dismiss, 7000);
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
    <div className={`cargame-root ${nightMode ? "is-night" : ""}`}>
      <div ref={mountRef} className="cargame-canvas" />
      <div className="cargame-vignette" />

      {/* top-left: progress */}
      <div className="hud-group hud-left">
        <div className="hud-pill">
          <span className="hud-icon">💎</span>
          {score}/{TOTAL_CRYSTALS}
        </div>
        <div className="hud-pill hud-muted">
          <span className="hud-icon">⏱</span>
          {formatTime(hud.time)}
        </div>
      </div>

      {/* top-right: toggles */}
      <div className="hud-group hud-right">
        <button type="button" className="hud-btn" title="Day / night (N)" onClick={call("toggleNight")}>
          {nightMode ? "☀️" : "🌙"}
        </button>
        <button type="button" className="hud-btn" title="Sound (M)" onClick={call("toggleMute")}>
          {muted ? "🔇" : "🔊"}
        </button>
        <button type="button" className="hud-btn" title="Reset car (R)" onClick={call("resetCar")}>
          ↺
        </button>
        <button type="button" className="hud-btn" title="Help" onClick={() => setHelpOpen((v) => !v)}>
          ?
        </button>
      </div>

      {!mobile && (
        <div className={`hud-speed ${hud.boosting ? "is-boost" : ""}`}>
          <span className="hud-speed-value">{hud.speed}</span>
          <span className="hud-speed-unit">km/h</span>
        </div>
      )}

      <div className="hud-toasts">
        {toasts.map((t) => (
          <div key={t.id} className="hud-toast">
            {t.text}
          </div>
        ))}
      </div>

      {zone && (
        <button type="button" className="hud-zone" onClick={call("openActivePad")}>
          <span className="hud-zone-title">{zone.title}</span>
          <span className="hud-zone-cta">{mobile ? "Tap to open →" : "Press Enter ⏎ to open"}</span>
        </button>
      )}

      {flipped && !zone && (
        <button type="button" className="hud-zone hud-flip" onClick={call("resetCar")}>
          <span className="hud-zone-title">Upside down?</span>
          <span className="hud-zone-cta">{mobile ? "Tap to flip back" : "Press R to flip back"}</span>
        </button>
      )}

      {intro && (
        <div className="hud-card hud-intro">
          <h3>🚙 Marco Lavielle</h3>
          <p>A little world to drive around. Knock over the letters, bowl a strike, score a goal, fly through the hoop — and collect all {TOTAL_CRYSTALS} crystals.</p>
          <p className="hud-hint">
            {mobile ? "Tap anywhere to start" : "Arrows / WASD to drive · Shift boost · Space drift · press any key"}
          </p>
        </div>
      )}

      {helpOpen && (
        <div className="hud-card hud-help" onClick={() => setHelpOpen(false)}>
          <h3>Controls</h3>
          <ul>
            <li><b>↑ ↓ ← →</b> / <b>WASD</b> drive</li>
            <li><b>Shift</b> boost · <b>Space</b> handbrake drift</li>
            <li><b>H</b> horn · <b>R</b> reset / flip · <b>N</b> night · <b>M</b> mute</li>
            <li><b>Enter</b> open a project pad · scroll to zoom</li>
          </ul>
          <h3>Things to do</h3>
          <ul>
            <li>🎳 Bowl a strike in the playground</li>
            <li>⚽ Push the ball into a goal in the stadium</li>
            <li>🎯 Jump through the golden hoop in the jump park</li>
            <li>🧱 Smash the brick wall, topple the dominoes</li>
            <li>💎 Follow the light beams to all {TOTAL_CRYSTALS} crystals</li>
          </ul>
          <p className="hud-hint">psst… ↑ ↑ ↓ ↓ ← → ← → B A</p>
        </div>
      )}

      {win && (
        <div className="hud-card hud-win">
          <h2>🎉 You found them all!</h2>
          <p className="hud-win-time">{formatTime(win.time)}</p>
          <p>{win.isBest ? "New best time!" : `Best: ${formatTime(win.best)}`}</p>
          <div className="hud-win-actions">
            <button type="button" onClick={() => window.location.reload()}>
              Play again
            </button>
            <button type="button" onClick={() => setWin(null)}>
              Keep driving
            </button>
            <button type="button" onClick={() => (window.location.href = "/")}>
              Back to site
            </button>
          </div>
        </div>
      )}

      {mobile && (
        <>
          <div className="mobile-ctrl-cluster steer">
            <HoldButton label="Steer left" name="left" glyph="←" pressed={!!pressed.left} onChange={setVirtual} />
            <HoldButton label="Steer right" name="right" glyph="→" pressed={!!pressed.right} onChange={setVirtual} />
          </div>
          <div className="mobile-ctrl-cluster extras">
            <HoldButton label="Boost" name="boost" glyph="⚡" pressed={!!pressed.boost} onChange={setVirtual} className="small" />
            <HoldButton label="Drift" name="brake" glyph="✋" pressed={!!pressed.brake} onChange={setVirtual} className="small" />
            <HoldButton label="Horn" name="horn" glyph="📣" pressed={!!pressed.horn} onChange={setVirtual} className="small" />
          </div>
          <div className="mobile-ctrl-cluster throttle">
            <HoldButton label="Accelerate" name="up" glyph="↑" pressed={!!pressed.up} onChange={setVirtual} />
            <HoldButton label="Reverse" name="down" glyph="↓" pressed={!!pressed.down} onChange={setVirtual} />
          </div>
        </>
      )}

      <style>{`
        .cargame-root {
          /* pinned to the viewport: 100vw/100vh in normal flow overflowed
             by the body margin and the scrollbar width */
          position: fixed;
          inset: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
          z-index: 999;
          font-family: Arial, sans-serif;
          color: #46423a;
          user-select: none;
          -webkit-user-select: none;
        }
        .cargame-canvas { width: 100%; height: 100%; }
        .cargame-canvas canvas { display: block; }
        .cargame-vignette {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(70,66,58,0.22) 100%);
          transition: background 1s ease;
        }
        .is-night .cargame-vignette {
          background: radial-gradient(ellipse at center, rgba(0,0,0,0) 45%, rgba(8,10,24,0.55) 100%);
        }
        .hud-group {
          position: absolute;
          top: ${mobile ? "14px" : "20px"};
          display: flex;
          gap: 8px;
          z-index: 5;
        }
        .hud-left { left: ${mobile ? "14px" : "20px"}; }
        .hud-right { right: ${mobile ? "14px" : "20px"}; }
        .hud-pill, .hud-btn, .hud-speed, .hud-toast, .hud-card, .hud-zone {
          background: rgba(255,253,247,0.92);
          border: 1px solid rgba(70,66,58,0.12);
          box-shadow: 0 4px 14px rgba(70,66,58,0.18);
          color: #46423a;
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
        }
        .hud-pill {
          display: flex;
          align-items: center;
          gap: 7px;
          font-weight: bold;
          font-size: ${mobile ? "14px" : "17px"};
          padding: ${mobile ? "7px 12px" : "10px 18px"};
          border-radius: 999px;
          font-variant-numeric: tabular-nums;
        }
        .hud-muted { font-weight: 600; }
        .hud-icon { font-size: ${mobile ? "16px" : "19px"}; }
        .hud-btn {
          width: ${mobile ? "38px" : "44px"};
          height: ${mobile ? "38px" : "44px"};
          border-radius: 50%;
          font-size: ${mobile ? "16px" : "19px"};
          font-weight: 900;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          transition: transform 0.12s ease;
        }
        .hud-btn:hover { transform: scale(1.08); }
        .hud-btn:active { transform: scale(0.94); }
        .hud-speed {
          position: absolute;
          left: 20px;
          bottom: 20px;
          padding: 10px 18px;
          border-radius: 16px;
          display: flex;
          align-items: baseline;
          gap: 6px;
          font-variant-numeric: tabular-nums;
          transition: background 0.2s ease, color 0.2s ease;
        }
        .hud-speed.is-boost { background: rgba(232,88,28,0.92); color: #fffdf7; }
        .hud-speed-value { font-size: 26px; font-weight: 900; min-width: 48px; text-align: right; }
        .hud-speed-unit { font-size: 13px; font-weight: 700; opacity: 0.75; }
        .hud-toasts {
          position: absolute;
          top: ${mobile ? "64px" : "84px"};
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          pointer-events: none;
          z-index: 6;
        }
        .hud-toast {
          padding: ${mobile ? "9px 16px" : "12px 22px"};
          border-radius: 999px;
          font-weight: 900;
          font-size: ${mobile ? "15px" : "19px"};
          white-space: nowrap;
          animation: hud-pop 2.4s ease forwards;
        }
        @keyframes hud-pop {
          0% { opacity: 0; transform: translateY(-10px) scale(0.85); }
          10% { opacity: 1; transform: translateY(0) scale(1.06); }
          16% { transform: scale(1); }
          85% { opacity: 1; }
          100% { opacity: 0; transform: translateY(-6px); }
        }
        .hud-zone {
          position: absolute;
          left: 50%;
          bottom: ${mobile ? "118px" : "34px"};
          transform: translateX(-50%);
          padding: 14px 26px;
          border-radius: 18px;
          border: 2px solid #e2c14d;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          cursor: pointer;
          z-index: 6;
          animation: hud-rise 0.3s ease;
          font-family: inherit;
        }
        .hud-flip { border-color: rgba(70,66,58,0.3); }
        @keyframes hud-rise {
          from { opacity: 0; transform: translate(-50%, 12px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        .hud-zone-title { font-size: ${mobile ? "17px" : "21px"}; font-weight: 900; letter-spacing: 1px; }
        .hud-zone-cta { font-size: 13px; font-weight: 700; opacity: 0.7; }
        .hud-card {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          border-radius: 18px;
          padding: ${mobile ? "14px 18px" : "20px 28px"};
          line-height: 1.5;
          text-align: center;
          z-index: 7;
          max-width: ${mobile ? "88vw" : "500px"};
          box-sizing: border-box;
          box-shadow: 0 10px 30px rgba(70,66,58,0.22);
        }
        .hud-card h2, .hud-card h3 { margin: 0 0 8px 0; }
        .hud-card h3 { font-size: ${mobile ? "17px" : "20px"}; }
        .hud-card p { margin: 6px 0; font-size: ${mobile ? "13px" : "15px"}; }
        .hud-hint { opacity: 0.65; font-weight: 700; }
        .hud-intro { top: ${mobile ? "64px" : "84px"}; animation: hud-rise-card 0.5s ease; }
        @keyframes hud-rise-card {
          from { opacity: 0; transform: translate(-50%, -10px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        .hud-help { top: ${mobile ? "64px" : "84px"}; text-align: left; cursor: pointer; }
        .hud-help ul { margin: 0 0 12px 0; padding-left: 18px; font-size: ${mobile ? "13px" : "15px"}; }
        .hud-win {
          top: 50%;
          transform: translate(-50%, -50%);
          border: 3px solid #e2c14d;
          padding: ${mobile ? "22px 18px" : "30px 40px"};
        }
        .hud-win h2 { font-size: ${mobile ? "24px" : "34px"}; }
        .hud-win-time { font-size: ${mobile ? "34px" : "48px"}; font-weight: 900; margin: 4px 0 !important; font-variant-numeric: tabular-nums; }
        .hud-win-actions { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin-top: 14px; }
        .hud-win-actions button {
          font-family: inherit;
          font-weight: 800;
          font-size: 15px;
          padding: 10px 16px;
          border-radius: 999px;
          border: 1px solid rgba(70,66,58,0.25);
          background: #fffdf7;
          color: #46423a;
          cursor: pointer;
        }
        .hud-win-actions button:first-child { background: #e8581c; color: #fffdf7; border-color: #b6430f; }
        .mobile-ctrl-btn {
          width: 66px;
          height: 66px;
          border-radius: 18px;
          border: 1px solid rgba(70,66,58,0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 30px;
          font-weight: 900;
          color: #55514a;
          touch-action: none;
          cursor: pointer;
          background: linear-gradient(180deg, #fffdf7 0%, #ece5d4 100%);
          box-shadow: 0 6px 14px rgba(70,66,58,0.3), inset 0 1px 0 rgba(255,255,255,0.6);
          transition: transform 0.08s ease, background 0.08s ease, box-shadow 0.08s ease;
        }
        .mobile-ctrl-btn.small { width: 50px; height: 50px; font-size: 22px; border-radius: 14px; }
        .mobile-ctrl-btn.is-pressed {
          transform: scale(0.9);
          background: linear-gradient(180deg, #e2c14d 0%, #d1a934 100%);
          box-shadow: 0 2px 6px rgba(70,66,58,0.35), inset 0 2px 4px rgba(0,0,0,0.15);
        }
        .mobile-ctrl-cluster { position: fixed; display: flex; gap: 12px; z-index: 1000; }
        .mobile-ctrl-cluster.steer {
          left: calc(env(safe-area-inset-left, 0px) + 16px);
          bottom: calc(env(safe-area-inset-bottom, 0px) + 22px);
        }
        .mobile-ctrl-cluster.throttle {
          right: calc(env(safe-area-inset-right, 0px) + 16px);
          bottom: calc(env(safe-area-inset-bottom, 0px) + 22px);
          flex-direction: column;
        }
        .mobile-ctrl-cluster.extras {
          right: calc(env(safe-area-inset-right, 0px) + 96px);
          bottom: calc(env(safe-area-inset-bottom, 0px) + 22px);
          flex-direction: column;
          gap: 10px;
        }
      `}</style>
    </div>
  );
};

export default CarGame;
