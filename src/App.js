import React, { useEffect } from "react";
import { useDispatch } from "react-redux";
import { setDevice } from "actions/appActions";

import Routes from "./routes";

const MOBILE_BELOW = 812; // px of page width

const App = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    document.documentElement.classList.add("detected");
    document.documentElement.classList.add("cursor");
    document.body.classList.add("loaded");
    document.body.classList.add("home");
    document.body.classList.add("detected");
  }, []);

  // "mobile" or "desktop" on <html> and <body> (and in the store), by the
  // page's width, kept up to date as the window resizes
  useEffect(() => {
    let device = null;
    const update = () => {
      const width = document.documentElement.clientWidth;
      if (!width) return;
      const next = width < MOBILE_BELOW ? "mobile" : "desktop";
      if (next === device) return;
      device = next;
      const other = next === "mobile" ? "desktop" : "mobile";
      [document.documentElement, document.body].forEach((el) => {
        el.classList.remove(other);
        el.classList.add(next);
      });
      dispatch(setDevice(next));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [dispatch]);

  return <Routes />;
};

export default App;
