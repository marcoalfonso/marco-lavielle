import React, { useRef } from "react";
import useDeviceTilt, { prefersReducedMotion } from "components/motion/useDeviceTilt";
import Globe, { AXES } from "./Globe";

// The journal's star chart: a wireframe globe whose
// three axes end in the social channels (rounded callouts); on the left an
// entry-activity chart and a gauge, on the right a live readout of Sydney's
// coordinates and time.

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

const Channel = ({ ch, side }) => (
  <a
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

// where each channel sits: at the end of one of the globe's axes (the
// axis is its leader line); "left" callouts put their marker on the right,
// towards the axis
const AXIS_OF = { linkedin: 0, instagram: 1, twitter: 2 };
const SIDE_OF_AXIS = ["left", "right", "right"];

const PHONE_GAIN = 1.3; // globe turn per degree of phone tilt

const StarChart = ({ channels, posts, now, leaving }) => {
  // phones: the globe follows the phone's tilt, as the homepage cube does
  // (on iPhone, after a tap on the hint)
  const tiltRef = useRef({ x: 0, y: 0 });
  const { showHint, requestPermission, denied } = useDeviceTilt((x, y) => {
    tiltRef.current = { x: (x * PHONE_GAIN * Math.PI) / 180, y: (y * PHONE_GAIN * Math.PI) / 180 };
  }, !prefersReducedMotion());

  return (
    <div className="chart">
      <div className="chart-side is-left">
        <ActivityChart data={activity(posts)} />
        <Gauge />
      </div>

      <div className="chart-globe-wrap">
        <div className="chart-globe">
          <Globe className="chart-globe-canvas" leaving={leaving} tiltRef={tiltRef} />
          {showHint && (
            <button type="button" className="chart-motion-hint" onClick={requestPermission}>
              <span className="chart-motion-icon" aria-hidden="true" />
              Tap, then move your phone
            </button>
          )}
          {denied && (
            <p className="chart-motion-hint is-passive" aria-live="polite">
              Motion blocked in Safari settings
            </p>
          )}
        </div>
        <div className="chart-channels">
          {channels.map((ch) => {
            const axis = AXIS_OF[ch.id];
            const [dx, dy] = AXES[axis];
            return (
              <div
                key={ch.id}
                className={`chart-channel-slot is-axis-${axis}`}
                style={{ "--ax": dx, "--ay": dy }}
              >
                <Channel ch={ch} side={SIDE_OF_AXIS[axis]} />
              </div>
            );
          })}
        </div>
      </div>

      <div className="chart-side is-right">
        <Readout now={now} />
      </div>
    </div>
  );
};

export default StarChart;
