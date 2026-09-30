import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import Globe from "./Globe";

// The journal's star chart, after Evangelion's: a wireframe globe with
// callouts around it. The social channels are rounded callouts joined to the
// globe by leader lines; on the left an entry-activity chart and a gauge, on
// the right a live readout of Sydney's coordinates and time.

// line icons, drawn in the chart's light
const ICONS = {
  linkedin: (
    <>
      <rect x="2" y="2" width="20" height="20" rx="4" />
      <path d="M7 10v7M7 7v.01M11 17v-7M11 13.5c0-2 1.2-3.5 3-3.5s3 1.2 3 3.5V17" />
    </>
  ),
  instagram: (
    <>
      <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" />
      <circle cx="12" cy="12" r="4.5" />
      <path d="M17.5 6.5v.01" />
    </>
  ),
  twitter: <path d="M4 4l16 16M20 4L4 20" />,
};

// where each channel's leader line meets the globe (degrees, 0 = right,
// clockwise), by channel id
const TARGETS = { linkedin: -20, instagram: 200, twitter: 35 };

const pad = (n, w = 2) => String(n).padStart(w, "0");

// posts per year, first year to last
const activity = (posts) => {
  if (!posts || !posts.length) return [];
  const years = posts.map((p) => Number((p.published || "").slice(0, 4))).filter(Boolean);
  const first = Math.min(...years);
  const last = Math.max(...years);
  const out = [];
  for (let y = first; y <= last; y++) out.push({ year: y, count: years.filter((v) => v === y).length });
  return out;
};

const ActivityChart = ({ data }) => {
  const max = Math.max(1, ...data.map((d) => d.count));
  const w = 100 / Math.max(1, data.length);
  // a stepped mountain, like the chart screens' graphs
  const area = data.length
    ? `M0 40 ${data.map((d, i) => `L${i * w} ${40 - (d.count / max) * 34} L${(i + 1) * w} ${40 - (d.count / max) * 34}`).join(" ")} L100 40 Z`
    : "";
  return (
    <div className="chart-panel chart-activity">
      <span className="chart-panel-label">Entry activity · per year</span>
      <svg viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true">
        <path className="chart-area" d={area} />
        {data.map((d, i) => (
          <line key={d.year} className="chart-tick" x1={i * w} x2={i * w} y1="0" y2="40" />
        ))}
      </svg>
      <span className="chart-axis">
        {data.length ? (
          <>
            <span>{data[0].year}</span>
            <span>{data[data.length - 1].year}</span>
          </>
        ) : (
          <span>···</span>
        )}
      </span>
      <span className="sr-only">
        {data.map((d) => `${d.year}: ${d.count}`).join(", ")}
      </span>
    </div>
  );
};

// "21:27-50": Sydney's time, in the chart screens' format
const Readout = ({ now }) => {
  const [h, m, s] = new Date(now)
    .toLocaleTimeString("en-AU", { timeZone: "Australia/Sydney", hour12: false })
    .split(":");
  return (
    <div className="chart-readout">
      <span className="chart-readout-row">
        {pad(Number(h) % 24)}:{m}
        <small>-{s}</small>
      </span>
      <span className="chart-readout-row">33°52′S</span>
      <span className="chart-readout-row">151°12′E</span>
      <span className="chart-panel-label">Sydney · local</span>
    </div>
  );
};

const Gauge = () => (
  <div className="chart-panel chart-gauge" aria-hidden="true">
    <span className="chart-gauge-scan" />
    <span className="chart-gauge-scale">
      {[0, 2, 4, 6, 8].map((n) => (
        <span key={n}>{n}</span>
      ))}
    </span>
  </div>
);

const Channel = ({ ch, side, refFn }) => (
  <a
    ref={refFn}
    className={`chart-channel is-${side}`}
    data-channel={ch.id}
    href={ch.href}
    target="_blank"
    rel="noopener noreferrer"
    aria-label={`${ch.name}, ${ch.handle} (opens in a new tab)`}
  >
    <span className="chart-channel-marker" aria-hidden="true" />
    <svg className="chart-channel-icon" viewBox="0 0 24 24" aria-hidden="true">
      {ICONS[ch.id]}
    </svg>
    <span className="chart-channel-text">
      <strong>{ch.name}</strong>
      <small>{ch.handle}</small>
    </span>
    <span className="chart-channel-cta">
      <span className="chart-channel-cta-word">{ch.action} </span>›
    </span>
  </a>
);

const StarChart = ({ channels, posts, now, leaving }) => {
  const chartRef = useRef(null);
  const globeRef = useRef(null);
  const channelRefs = useRef({});
  const [leaders, setLeaders] = useState([]);

  // leader lines from each channel's inner end to its point on the globe
  const measure = () => {
    const chart = chartRef.current;
    const globe = globeRef.current;
    if (!chart || !globe) return;
    const c = chart.getBoundingClientRect();
    const g = globe.getBoundingClientRect();
    const cx = g.left + g.width / 2 - c.left;
    const cy = g.top + g.height / 2 - c.top;
    const R = g.width * 0.37;
    const out = [];
    channels.forEach((ch) => {
      const el = channelRefs.current[ch.id];
      if (!el || el.offsetParent === null) return;
      const r = el.getBoundingClientRect();
      const right = r.left + r.width / 2 - c.left < cx;
      const sx = right ? r.right - c.left : r.left - c.left;
      const sy = r.top + r.height / 2 - c.top;
      const a = (TARGETS[ch.id] * Math.PI) / 180;
      const tx = cx + Math.cos(a) * R;
      const ty = cy + Math.sin(a) * R;
      // out from the callout a little, then straight to the globe
      const kx = sx + (right ? 24 : -24);
      out.push({ id: ch.id, d: `M${sx.toFixed(1)} ${sy.toFixed(1)} H${kx.toFixed(1)} L${tx.toFixed(1)} ${ty.toFixed(1)}`, tx, ty });
    });
    setLeaders(out);
  };

  useLayoutEffect(measure, [channels]);
  useEffect(() => {
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    if (ro) ro.observe(chartRef.current);
    window.addEventListener("resize", measure);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  const left = channels.filter((ch) => ch.side === "left");
  const right = channels.filter((ch) => ch.side === "right");

  return (
    <div className="chart" ref={chartRef}>
      <svg className="chart-leaders" aria-hidden="true">
        {leaders.map((l) => (
          <g key={l.id}>
            <path className="chart-leader" d={l.d} pathLength="1" />
            <circle className="chart-leader-dot" cx={l.tx} cy={l.ty} r="3.5" />
          </g>
        ))}
      </svg>

      <div className="chart-side is-left">
        <ActivityChart data={activity(posts)} />
        {left.map((ch) => (
          <Channel key={ch.id} ch={ch} side="left" refFn={(el) => (channelRefs.current[ch.id] = el)} />
        ))}
        <Gauge />
      </div>

      <div className="chart-globe" ref={globeRef}>
        <Globe className="chart-globe-canvas" leaving={leaving} labels={["Y · towards\nfirst entry", "X · towards\nlast entry", "Z · Sydney"]} />
      </div>

      <div className="chart-side is-right">
        <Readout now={now} />
        {right.map((ch) => (
          <Channel key={ch.id} ch={ch} side="right" refFn={(el) => (channelRefs.current[ch.id] = el)} />
        ))}
      </div>
    </div>
  );
};

export default StarChart;
