import React, { useEffect, useLayoutEffect } from "react";
import { useDispatch } from "react-redux";
import { setDevice } from "actions/appActions";

import Routes from "./routes";
import Notifications from "components/notify/Notifications";
import { deviceFor } from "device";

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
  // page's width, kept up to date as the window resizes. A layout effect, so
  // the classes are on before the first frame is painted.
  useLayoutEffect(() => {
    let device = null;
    const update = () => {
      const next = deviceFor();
      if (!next || next === device) return;
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

  return (
    <>
      <Routes />
      <Notifications />
    </>
  );
};

export default App;
