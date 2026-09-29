import React, { useEffect, useState } from "react";
import HoloPlatform from "components/HoloPlatform/HoloPlatform";
import UiVersionToggle from "components/UiVersionToggle/UiVersionToggle";
import { isTouchDevice } from "components/motion/useDeviceTilt";
import FlashName from "./FlashName";
import RubikCube from "./RubikCube";
import "./Home.css";

// Homepage, V2: a Rubik's cube of light hovering over the holo platform,
// one page per face. Self-contained (its own styles, no heavy libraries) so
// it can be split into its own bundle later.

// one per face: front, right, back, left, top, bottom
const LINKS = [
  { href: "/software", label: "Software", sub: "Portfolio" },
  { href: "/art", label: "Paintings", sub: "Gallery" },
  { href: "/journal", label: "Thoughts", sub: "Blog" },
  { href: "/about", label: "About", sub: "Contact" },
  { href: "/game", label: "Game", sub: "Play" },
  { href: "https://github.com/marcoalfonso", label: "GitHub", sub: "Code" },
];

const Home = () => {
  const [motion, setMotion] = useState(null); // { showHint, requestPermission } from the cube
  const [touch] = useState(isTouchDevice);

  useEffect(() => {
    document.body.classList.add("home-v2-body");
    return () => document.body.classList.remove("home-v2-body");
  }, []);

  return (
    <main className="home-v2">
      <header className="home-v2-header">
        <FlashName className="home-v2-name" />
        <p className="home-v2-tagline">Coder &middot; Painter</p>
      </header>

      <div className="home-v2-stage">
        <div className="home-v2-float">
          <RubikCube links={LINKS} onHint={setMotion} />
        </div>
        <div className="home-v2-base">
          <div className="home-v2-shadow" aria-hidden="true" />
          <HoloPlatform className="home-v2-platform" />
        </div>
      </div>

      <div className="home-v2-hints">
        {motion && motion.showHint ? (
          <button type="button" className="home-v2-hint is-button" onClick={motion.requestPermission}>
            <span className="home-v2-hint-icon is-phone" aria-hidden="true" />
            Tap, then move your phone
          </button>
        ) : (
          <p className="home-v2-hint" aria-hidden="true">
            <span className="home-v2-hint-icon" aria-hidden="true" />
            {touch ? "Swipe to turn, tap a centre square" : "Drag to turn, click a centre square"}
          </p>
        )}
      </div>

      <UiVersionToggle current="v2" />
    </main>
  );
};

export default Home;
