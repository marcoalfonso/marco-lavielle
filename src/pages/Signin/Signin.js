import React, { useEffect, useRef, useState } from "react";
import { useHistory } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useCookies } from "react-cookie";
import { signin } from "actions/appActions";
import HoloPlatform from "components/HoloPlatform/HoloPlatform";
import HoloPanel from "components/holo/HoloPanel";
import loadOrbitron from "components/fonts/loadOrbitron";
import { isTouchDevice, prefersReducedMotion } from "components/motion/useDeviceTilt";
import "./Signin.css";

// Sign in: a form drawn in lines of light, hovering over the holo platform.
// Its layers stand at different depths (frame, fields, button) and the
// whole panel leans toward the pointer, so the depth shows.

const MAX_TILT = { x: 7, y: 10 }; // deg

const Signin = () => {
  const dispatch = useDispatch();
  const history = useHistory();
  const [, setCookie] = useCookies(["loggedIn"]);
  const [values, setValues] = useState({ username: "", password: "" });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null); // why the last attempt failed
  const [busy, setBusy] = useState(false);
  const panelRef = useRef(null);
  const { username, password } = values;

  useEffect(() => {
    loadOrbitron();
    document.body.classList.add("signin-v2-body");
    // lean toward the pointer (CSS eases it)
    const onPointerMove = (e) => {
      const panel = panelRef.current;
      if (!panel) return;
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = (e.clientY / window.innerHeight) * 2 - 1;
      panel.style.setProperty("--tilt-x", `${(-y * MAX_TILT.x).toFixed(2)}deg`);
      panel.style.setProperty("--tilt-y", `${(x * MAX_TILT.y).toFixed(2)}deg`);
    };
    const lean = !prefersReducedMotion() && !isTouchDevice();
    if (lean) window.addEventListener("pointermove", onPointerMove);
    return () => {
      document.body.classList.remove("signin-v2-body");
      window.removeEventListener("pointermove", onPointerMove);
    };
  }, []);

  const onChange = (e) => {
    const { name, value } = e.target;
    setValues((v) => ({ ...v, [name]: value }));
    setErrors((errs) => ({ ...errs, [name]: null }));
    setMessage(null);
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (busy) return;
    const found = {};
    if (!username.trim()) found.username = "Username is required";
    if (!password) found.password = "Password is required";
    if (found.username || found.password) {
      setErrors(found);
      setMessage(null);
      return;
    }
    setBusy(true);
    setMessage(null);
    dispatch(signin({ username: username.trim(), password }, history))
      .then((response) => {
        if (response.data.success) {
          setCookie("loggedIn", true);
          history.push(`/admin/dashboard`);
        } else {
          setBusy(false);
          setMessage("Username and password don't match");
        }
      })
      .catch((err) => {
        const reason = err && err.response && err.response.data && err.response.data.reason;
        setBusy(false);
        setMessage(reason || "Couldn't sign in. Try again.");
      });
  };

  return (
    <main className="signin-v2 holo-ui">
      <a className="signin-v2-home" href="/">
        <span aria-hidden="true">&lsaquo;</span> Marco Lavielle
      </a>

      <div className="signin-v2-stage">
        <div className="signin-v2-float">
          <HoloPanel as="div" className="signin-v2-panel" ref={panelRef}>
            <form className="signin-v2-form" onSubmit={onSubmit} noValidate>
              <header className="signin-v2-heading">
                <p className="holo-kicker">Restricted access</p>
                <h1 className="holo-title signin-v2-title">Sign in</h1>
                <p className="signin-v2-legend">Only the best make it this far</p>
              </header>

              <label className={errors.username ? "holo-field signin-v2-field has-error" : "holo-field signin-v2-field"}>
                <span className="holo-label">Username</span>
                <input
                  className="holo-input"
                  name="username"
                  type="text"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck="false"
                  value={username}
                  onChange={onChange}
                  aria-invalid={!!errors.username}
                />
                {errors.username && <span className="holo-error">{errors.username}</span>}
              </label>

              <label className={errors.password ? "holo-field signin-v2-field has-error" : "holo-field signin-v2-field"}>
                <span className="holo-label">Password</span>
                <input
                  className="holo-input"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={onChange}
                  aria-invalid={!!errors.password}
                />
                {errors.password && <span className="holo-error">{errors.password}</span>}
              </label>

              <button
                type="submit"
                className={busy ? "holo-button signin-v2-submit is-busy" : "holo-button signin-v2-submit"}
                disabled={busy}
              >
                {busy ? "Authenticating" : "Sign in"}
              </button>

              <p className="signin-v2-message" role="alert">
                {message}
              </p>
            </form>
          </HoloPanel>
        </div>
        <HoloPlatform className="signin-v2-platform" />
      </div>
    </main>
  );
};

export default Signin;
