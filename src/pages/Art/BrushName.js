import React from "react";

// "Marco Lavielle" painted on: a brush script with dry-brush bristle marks
// and ragged edges from SVG noise filters, plus a cyan underline stroke.
// The letters' bristles run along the script's slant (the filter is applied
// in a skewed space); the underline's run along the stroke.

const bristleFilter = (id, frequency) => (
  <filter id={id} x="-10%" y="-20%" width="120%" height="140%">
    <feTurbulence type="fractalNoise" baseFrequency={frequency} numOctaves="2" seed="7" result="noise" />
    {/* thin gaps where the brush ran dry */}
    <feColorMatrix
      in="noise"
      type="matrix"
      values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  3 0 0 0 -0.4"
      result="bristles"
    />
    <feComposite in="SourceGraphic" in2="bristles" operator="in" result="dry" />
    {/* paint ridges: a little light and shade along the bristles */}
    <feComposite in="dry" in2="noise" operator="arithmetic" k1="0.35" k2="0.78" k3="0" k4="0" result="lit" />
    <feComposite in="lit" in2="dry" operator="in" result="paint" />
    {/* ragged edges */}
    <feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves="2" seed="2" result="wobble" />
    <feDisplacementMap in="paint" in2="wobble" scale="2.5" xChannelSelector="R" yChannelSelector="G" />
  </filter>
);

const SLANT = 16; // deg, roughly the script's slant

const BrushName = ({ className }) => (
  <svg className={className} viewBox="0 0 300 160" role="img" aria-label="Marco Lavielle">
    <defs>
      {bristleFilter("art-brush-letters", "0.5 0.01")}
      {bristleFilter("art-brush-swash", "0.01 0.5")}
    </defs>
    <path
      className="art-name-swash"
      filter="url(#art-brush-swash)"
      d="M14 146 C 90 132, 190 152, 288 134"
      pathLength="1"
    />
    <g filter="url(#art-brush-letters)" transform={`skewX(${-SLANT})`}>
      <g transform={`skewX(${SLANT})`} className="art-name-letters">
        <text className="art-name-line art-name-line-1" x="8" y="66">
          Marco
        </text>
        <text className="art-name-line art-name-line-2" x="40" y="124">
          Lavielle
        </text>
      </g>
    </g>
  </svg>
);

export default BrushName;
