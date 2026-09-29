import React from "react";
import "./HoloPlatform.css";

// The holo platform things hover over (Art, Home): glowing rings seen at a
// low angle, the dashed and tick rings slowly turning. Children render on the
// platform's surface, under the rings (e.g. the Art page's colour spill).
// Size it with the className's width; its height follows.

const ticks = [];
for (let i = 0; i < 72; i++) {
  const a = (i / 72) * Math.PI * 2;
  const r1 = i % 6 === 0 ? 64 : 61.5;
  ticks.push(`M${Math.cos(a) * 59} ${Math.sin(a) * 59}L${Math.cos(a) * r1} ${Math.sin(a) * r1}`);
}
const tickPath = ticks.join("");

const HoloPlatform = ({ className, children }) => (
  <div className={className ? `holo-platform ${className}` : "holo-platform"} aria-hidden="true">
    <div className="holo-platform-disc">
      {children}
      <svg viewBox="-72 -72 144 144">
        <defs>
          <radialGradient id="holo-platform-glow">
            <stop offset="0%" stopColor="#6ff5ee" stopOpacity="0.35" />
            <stop offset="35%" stopColor="#3d8bff" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#3d8bff" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle r="75" fill="url(#holo-platform-glow)" />
        <circle className="holo-ring" r="34" strokeOpacity="0.55" />
        <circle className="holo-ring" r="38" strokeOpacity="0.28" />
        <circle className="holo-ring holo-ring-dashed" r="47" strokeOpacity="0.45" />
        <circle className="holo-ring" r="56" strokeOpacity="0.18" />
        <path className="holo-ring holo-ring-ticks" d={tickPath} strokeOpacity="0.22" />
        <circle className="holo-ring" r="68" strokeOpacity="0.08" />
      </svg>
    </div>
  </div>
);

export default HoloPlatform;
