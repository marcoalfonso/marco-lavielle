import React, { useState } from "react";

// "MARCO LAVIELLE", each letter flashing on like a tube light, in a
// shuffled order, as the page loads. Once all are lit, a glow runs through
// the name from left to right, one letter at a time, every few seconds.

const NAME = "MARCO LAVIELLE";
const GLOW_START = 2800; // ms: after the last letter has struck
const GLOW_STEP = 110; // ms between neighbouring letters

const shuffledDelays = () => {
  const order = NAME.split("").map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const delays = [];
  order.forEach((letter, n) => {
    delays[letter] = 200 + n * 90 + Math.random() * 60;
  });
  return delays;
};

const FlashName = ({ className }) => {
  const [delays] = useState(shuffledDelays);
  return (
    <h1 className={className} aria-label="Marco Lavielle">
      {NAME.split("").map((ch, i) =>
        ch === " " ? (
          <span key={i} className="flash-space" aria-hidden="true" />
        ) : (
          <span
            key={i}
            className="flash-letter"
            style={{ "--flash-delay": `${Math.round(delays[i])}ms`, "--glow-delay": `${GLOW_START + i * GLOW_STEP}ms` }}
            aria-hidden="true"
          >
            {ch}
          </span>
        ),
      )}
    </h1>
  );
};

export default FlashName;
