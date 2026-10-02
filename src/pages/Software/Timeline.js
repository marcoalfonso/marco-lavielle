import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { duration, monthYear } from "./experience";

// The work history, latest first: a card per role (the client's site, name,
// role, dates), alternating left and right. A path joins them, leaving each
// card sideways, running across, and turning down into the next (right,
// down, left, down...). It draws itself as the page scrolls, a point of
// light at its tip, and lights each card as it arrives. On phones the cards
// stack and the path runs down a rail on their left.

const RADIUS = 28; // the path's corners
const RAIL = 6; // phones: the rail's distance from the left edge
const SAMPLE = 6; // px between samples along the path (for the scroll lookup)

// a path through the card centres: across, a rounded corner, then down
const buildPath = (points, stacked) => {
  if (points.length < 2) return "";
  let d = `M${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (stacked || Math.abs(a.x - b.x) < 2) {
      d += ` L${b.x} ${b.y}`;
      continue;
    }
    const dir = b.x > a.x ? 1 : -1;
    const r = Math.min(RADIUS, Math.abs(b.x - a.x) / 2, Math.abs(b.y - a.y) / 2);
    d += ` L${b.x - dir * r} ${a.y} Q${b.x} ${a.y} ${b.x} ${a.y + r} L${b.x} ${b.y}`;
  }
  return d;
};

const Timeline = ({ items, onOpen }) => {
  const wrapRef = useRef(null);
  const cardRefs = useRef([]);
  const pathRef = useRef(null);
  const glowRef = useRef(null);
  const headRef = useRef(null);
  const samples = useRef([]); // [{ len, y, x }]
  const [path, setPath] = useState({ d: "", w: 0, h: 0 });
  const [lit, setLit] = useState(-1);

  // where the cards are, and the path through them
  const measure = () => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const box = wrap.getBoundingClientRect();
    const stacked = window.matchMedia("(max-width: 800px)").matches;
    const points = cardRefs.current.filter(Boolean).map((el) => {
      const r = el.getBoundingClientRect();
      const media = el.querySelector(".xp-media").getBoundingClientRect();
      return { x: stacked ? RAIL : r.left + r.width / 2 - box.left, y: media.top + media.height / 2 - box.top };
    });
    setPath({ d: buildPath(points, stacked), w: box.width, h: box.height });
  };

  useLayoutEffect(measure, [items]);
  useEffect(() => {
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    if (ro) ro.observe(wrapRef.current);
    window.addEventListener("resize", measure);
    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  // sample the path once it's drawn, so scroll position -> length is cheap
  useLayoutEffect(() => {
    const el = pathRef.current;
    if (!el || !path.d) return;
    const total = el.getTotalLength();
    const out = [];
    for (let len = 0; len <= total; len += SAMPLE) {
      const p = el.getPointAtLength(len);
      out.push({ len, x: p.x, y: p.y });
    }
    const end = el.getPointAtLength(total);
    out.push({ len: total, x: end.x, y: end.y });
    samples.current = out;
    [pathRef.current, glowRef.current].forEach((p) => {
      p.style.strokeDasharray = `${total} ${total}`;
    });
    onScroll();
  }, [path.d]);

  // draw the path down to the line two thirds of the way down the screen
  const onScroll = () => {
    const wrap = wrapRef.current;
    const list = samples.current;
    if (!wrap || !list.length) return;
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const top = wrap.getBoundingClientRect().top;
    const reach = reduce ? Infinity : window.innerHeight * 0.66 - top;
    // the path only ever runs across or down, so y never decreases along it
    let lo = 0;
    let hi = list.length - 1;
    if (list[0].y > reach) hi = -1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (list[mid].y <= reach) lo = mid;
      else hi = mid - 1;
    }
    const total = list[list.length - 1].len;
    const at = hi < 0 ? null : list[lo];
    const drawn = at ? at.len : 0;
    [pathRef.current, glowRef.current].forEach((p) => {
      if (p) p.style.strokeDashoffset = String(total - drawn);
    });
    const head = headRef.current;
    if (head) {
      head.style.opacity = at && drawn < total - 1 ? "1" : "0";
      if (at) head.setAttribute("transform", `translate(${at.x} ${at.y})`);
    }
    // a card lights up once the path reaches it
    const cards = cardRefs.current.filter(Boolean);
    let reached = -1;
    cards.forEach((el, i) => {
      const r = el.getBoundingClientRect();
      if (r.top + Math.min(r.height * 0.3, 80) - top <= reach) reached = i;
    });
    setLit(reached);
  };

  useEffect(() => {
    let raf = null;
    const handler = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(onScroll);
    };
    window.addEventListener("scroll", handler, { passive: true });
    window.addEventListener("resize", handler);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", handler);
      window.removeEventListener("resize", handler);
    };
  }, []);

  return (
    <div className="xp-timeline" ref={wrapRef}>
      <svg className="xp-path" width={path.w} height={path.h} aria-hidden="true">
        <path className="xp-path-track" d={path.d} />
        <path className="xp-path-glow" ref={glowRef} d={path.d} />
        <path className="xp-path-line" ref={pathRef} d={path.d} />
        <g className="xp-path-head" ref={headRef}>
          <circle r="10" className="xp-path-head-halo" />
          <circle r="4" className="xp-path-head-dot" />
        </g>
      </svg>

      <ol className="xp-list">
        {items.map((item, i) => (
          <li
            key={item.id}
            ref={(el) => {
              cardRefs.current[i] = el;
            }}
            className={`xp-card ${i % 2 ? "is-right" : "is-left"}${i <= lit ? " is-lit" : ""}`}
          >
            <button type="button" className="xp-media" onClick={() => onOpen(item)} aria-label={`${item.company}: more about this role`}>
              <span className="xp-media-frame" aria-hidden="true">
                <span className="holo-corner is-tl" />
                <span className="holo-corner is-tr" />
                <span className="holo-corner is-bl" />
                <span className="holo-corner is-br" />
              </span>
              <img src={item.image} alt="" loading="lazy" />
              <span className="xp-media-more" aria-hidden="true">
                Details
              </span>
            </button>
            <div className="xp-meta">
              <span className="xp-dates">
                {monthYear(item.from)} – {monthYear(item.to)}
                <small>{duration(item.from, item.to)}</small>
              </span>
              <h3 className="xp-company">{item.company}</h3>
              <p className="xp-role">
                {item.role}
                {item.client && <span className="xp-client"> · {item.client}</span>}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
};

export default Timeline;
