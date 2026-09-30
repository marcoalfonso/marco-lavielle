import React, { useEffect, useState } from "react";
import HoloPlatform from "components/HoloPlatform/HoloPlatform";
import UiVersionToggle from "components/UiVersionToggle/UiVersionToggle";
import { isTouchDevice } from "components/motion/useDeviceTilt";
import loadOrbitron from "components/fonts/loadOrbitron";
import ColourToggle from "./ColourToggle";
import FlashName from "./FlashName";
import { AboutArt, GameArt, GitHubArt, PaintingsArt, SoftwareArt, ThoughtsArt } from "./HoloArt";
import RubikCube from "./RubikCube";
import "./Home.css";

// Homepage, V2: a Rubik's cube of light hovering over the holo platform,
// one page per face. Self-contained (its own styles, no heavy libraries) so
// it can be split into its own bundle later.

// one per face: front, right, back, left, top, bottom
const LINKS = [
  { href: "/software", label: "Software", holo: <SoftwareArt /> },
  { href: "/art", label: "Paintings", holo: <PaintingsArt /> },
  { href: "/journal", label: "Thoughts", holo: <ThoughtsArt /> },
  { href: "/about", label: "About", holo: <AboutArt /> },
  { href: "/game", label: "Game", holo: <GameArt /> },
  { href: "https://github.com/marcoalfonso", label: "GitHub", holo: <GitHubArt /> },
];

// the cube colour a visitor picked, remembered in their own browser
const COLOUR_KEY = "home-cube-colours";
const savedColours = () => {
  try {
    return window.localStorage.getItem(COLOUR_KEY) === "spectrum" ? "spectrum" : "cyan";
  } catch (e) {
    return "cyan";
  }
};

const Home = () => {
  const [motion, setMotion] = useState(null); // { showHint, requestPermission } from the cube
  const [touch] = useState(isTouchDevice);
  const [colours, setColours] = useState(savedColours);

  const pickColours = (value) => {
    setColours(value);
    try {
      window.localStorage.setItem(COLOUR_KEY, value);
    } catch (e) {
      // private browsing etc.: it just won't be remembered
    }
  };

  useEffect(() => {
    loadOrbitron(); // the cube's lettering
    document.documentElement.classList.add("home-v2-html");
    document.body.classList.add("home-v2-body");
    // iOS can still drag (and pull-to-refresh) a locked page; nothing here
    // scrolls, so stop touch moves from doing anything but turn the cube
    const noScroll = (e) => e.preventDefault();
    document.addEventListener("touchmove", noScroll, { passive: false });
    return () => {
      document.documentElement.classList.remove("home-v2-html");
      document.body.classList.remove("home-v2-body");
      document.removeEventListener("touchmove", noScroll);
    };
  }, []);

  return (
    <main className={colours === "spectrum" ? "home-v2 is-spectrum" : "home-v2"}>
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
        {motion && motion.denied ? (
          <p className="home-v2-hint" aria-live="polite">
            Motion blocked in Safari settings
          </p>
        ) : motion && motion.showHint ? (
          <button type="button" className="home-v2-hint is-button" onClick={motion.requestPermission}>
            <span className="home-v2-hint-icon is-phone" aria-hidden="true" />
            Tap, then move your phone
          </button>
        ) : (
          <p className="home-v2-hint" aria-hidden="true">
            <span className="home-v2-hint-icon" aria-hidden="true" />
            {touch ? "Swipe to spin, tap center to open" : "Drag to turn, click a centre square"}
          </p>
        )}
      </div>

      <ColourToggle value={colours} onChange={pickColours} />
      <UiVersionToggle current="v2" />
    </main>
  );
};

export default Home;
