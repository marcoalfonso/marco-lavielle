import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getClients, getPosts } from "actions/appActions";
import HoloPlatform from "components/HoloPlatform/HoloPlatform";
import UiVersionToggle from "components/UiVersionToggle/UiVersionToggle";
import { isTouchDevice } from "components/motion/useDeviceTilt";
import FlashName from "./FlashName";
import { AboutHolo, GameHolo, GitHubHolo, PaintingsHolo, SoftwareHolo, ThoughtsHolo } from "./HoloCards";
import RubikCube from "./RubikCube";
import "./Home.css";

// Homepage, V2: a Rubik's cube of light hovering over the holo platform,
// one page per face. Self-contained (its own styles, no heavy libraries) so
// it can be split into its own bundle later.

const smallSrc = (painting) => painting.link.replace(/\.jpg$/, "-960.jpg");

const Home = () => {
  const [motion, setMotion] = useState(null); // { showHint, requestPermission } from the cube
  const [touch] = useState(isTouchDevice);
  const dispatch = useDispatch();
  const clients = useSelector((state) => state.app.clients);
  const posts = useSelector((state) => state.app.posts);
  const paintings = useSelector((state) => state.app.paintings);
  // a different painting in the Paintings hologram each visit
  const [painting] = useState(() => paintings[Math.floor(Math.random() * paintings.length)]);

  useEffect(() => {
    // for the holograms' numbers, as V1 showed
    if (!clients) dispatch(getClients());
    if (!posts) dispatch(getPosts());
  }, []);

  // one per face: front, right, back, left, top, bottom
  const links = [
    { href: "/software", label: "Software", sub: "Portfolio", holo: <SoftwareHolo clients={clients && clients.length} /> },
    { href: "/art", label: "Paintings", sub: "Gallery", holo: <PaintingsHolo painting={smallSrc(painting)} count={paintings.length} /> },
    {
      href: "/journal",
      label: "Thoughts",
      sub: "Blog",
      holo: <ThoughtsHolo post={posts && posts[posts.length - 1]} count={posts && posts.length} />,
    },
    { href: "/about", label: "About", sub: "Contact", holo: <AboutHolo /> },
    { href: "/game", label: "Game", sub: "Play", holo: <GameHolo /> },
    { href: "https://github.com/marcoalfonso", label: "GitHub", sub: "Code", holo: <GitHubHolo /> },
  ];

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
          <RubikCube links={links} onHint={setMotion} />
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
            {touch ? "Swipe to turn, tap a face, then its centre" : "Drag to turn, click a centre square"}
          </p>
        )}
      </div>

      <UiVersionToggle current="v2" />
    </main>
  );
};

export default Home;
