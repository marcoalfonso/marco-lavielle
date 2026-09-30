import React, { useEffect, useRef, useState } from "react";

// The orbital instrument: rings of light turning at different speeds, and an
// orbit carrying one square node per section. The orbit turns (the short way
// round) to bring the selected node to the top; the centre shows that
// section's details. An arc on the inner ring fills while the instrument
// waits to move on to the next section.

const NODE_ANGLES = [0, 120, 240];

const ticks = (count, r0, rLong, rShort, every) => {
  const out = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const r1 = i % every === 0 ? rLong : rShort;
    out.push(`M${(Math.cos(a) * r0).toFixed(2)} ${(Math.sin(a) * r0).toFixed(2)}L${(Math.cos(a) * r1).toFixed(2)} ${(Math.sin(a) * r1).toFixed(2)}`);
  }
  return out.join("");
};
const OUTER_TICKS = ticks(120, 190, 181, 186, 10);

// three arcs with gaps, the gyro ring
const arc = (r, from, to) => {
  const p = (deg) => {
    const a = ((deg - 90) * Math.PI) / 180;
    return `${(Math.cos(a) * r).toFixed(2)} ${(Math.sin(a) * r).toFixed(2)}`;
  };
  return `M${p(from)} A${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${p(to)}`;
};
const GYRO = [arc(160, 8, 112), arc(160, 128, 232), arc(160, 248, 352)].join(" ");

const pad = (n) => String(n).padStart(2, "0");

const Orbital = ({ sections, selected, cycleStart, cycleMs, onSelect }) => {
  // cumulative turn, so moving from the last node to the first goes forward
  const [turn, setTurn] = useState(-NODE_ANGLES[selected]);
  const turnRef = useRef(turn);
  const progressRef = useRef(null);

  useEffect(() => {
    const target = -NODE_ANGLES[selected];
    let delta = (target - turnRef.current) % 360;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    turnRef.current += delta;
    setTurn(turnRef.current);
  }, [selected]);

  // the waiting arc: drawn from script so it restarts with each section
  useEffect(() => {
    let raf;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const el = progressRef.current;
      if (!el) return;
      const k = Math.min(1, (Date.now() - cycleStart) / cycleMs);
      el.style.strokeDashoffset = String(1 - k);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [cycleStart, cycleMs]);

  const current = sections[selected];

  const onNodeClick = (e, i) => {
    // first tap on a phone picks the section; the next one goes there
    if (i !== selected) {
      e.preventDefault();
      onSelect(i);
    }
  };

  return (
    <div className="orbital" style={{ "--turn": `${turn}deg` }}>
      <svg className="orbital-rings" viewBox="-200 -200 400 400" aria-hidden="true">
        <defs>
          <radialGradient id="orbital-core">
            <stop offset="0%" stopColor="#00bff3" stopOpacity="0.16" />
            <stop offset="60%" stopColor="#3d8bff" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#3d8bff" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle r="150" fill="url(#orbital-core)" />
        <g className="orbital-spin is-slow">
          <path className="orbital-line is-faint" d={OUTER_TICKS} />
          <circle className="orbital-line is-faint" r="194" />
        </g>
        <circle className="orbital-line is-dashed orbital-spin is-reverse" r="172" />
        <path className="orbital-line is-gyro orbital-spin is-medium" d={GYRO} />
        {/* the orbit the nodes ride on */}
        <circle className="orbital-line is-orbit" r="138" />
        <circle className="orbital-line is-faint" r="112" />
        <circle
          ref={progressRef}
          className="orbital-progress"
          r="112"
          pathLength="1"
          transform="rotate(-90)"
        />
        <path className="orbital-line is-faint" d="M0 -200 V-178 M0 178 V200 M-200 0 H-178 M178 0 H200" />
      </svg>

      <div className="orbital-orbit">
        {sections.map((section, i) => (
          <a
            key={section.label}
            href={section.listHref || section.href}
            className={i === selected ? "orbital-node is-selected" : "orbital-node"}
            style={{ "--angle": `${NODE_ANGLES[i]}deg` }}
            // a real mouse only: phones send a hover just before a tap
            onPointerEnter={(e) => e.pointerType === "mouse" && onSelect(i)}
            // keyboard focus only: a tap focuses the link too, just before its click
            onFocus={(e) => e.target.matches(":focus-visible") && onSelect(i)}
            onClick={(e) => onNodeClick(e, i)}
            aria-label={section.label}
          >
            <span className="orbital-node-face">
              <span className="orbital-node-index">{pad(i + 1)}</span>
              <span className="orbital-node-label">{section.label}</span>
            </span>
          </a>
        ))}
      </div>

      <div className="orbital-core" key={selected}>
        <p className="orbital-count">
          <strong>{current.count === null ? "··" : pad(current.count)}</strong>
          <span>{current.unit}</span>
        </p>
        <h2 className="orbital-title">{current.title}</h2>
        <p className="orbital-detail">{current.detail}</p>
        <a className="holo-button is-small orbital-go" href={current.href}>
          {current.action}
        </a>
      </div>
    </div>
  );
};

export default Orbital;
