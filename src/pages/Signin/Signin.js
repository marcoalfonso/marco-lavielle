import React, { Component } from "react";
import { withRouter } from "react-router-dom";
import { connect } from "react-redux";
import { withCookies } from "react-cookie";
import { signin } from "actions/appActions";
import HoloPlatform from "components/HoloPlatform/HoloPlatform";
import loadOrbitron from "components/fonts/loadOrbitron";
import { isTouchDevice, prefersReducedMotion } from "components/motion/useDeviceTilt";
import "./Signin.css";

// Sign in: a form drawn in lines of light, hovering over the holo platform.
// Its layers stand at different depths (frame, fields, button) and the
// whole panel leans toward the pointer, so the depth shows.

const MAX_TILT = { x: 7, y: 10 }; // deg

export class Signin extends Component {
  state = {
    username: "",
    password: "",
    errors: {},
    message: null, // why the last attempt failed
    busy: false,
  };

  panelRef = React.createRef();

  componentDidMount() {
    loadOrbitron();
    document.body.classList.add("signin-v2-body");
    this.touch = isTouchDevice();
    if (!prefersReducedMotion() && !this.touch) window.addEventListener("pointermove", this.onPointerMove);
  }

  componentWillUnmount() {
    document.body.classList.remove("signin-v2-body");
    window.removeEventListener("pointermove", this.onPointerMove);
  }

  // lean toward the pointer (CSS eases it)
  onPointerMove = (e) => {
    const panel = this.panelRef.current;
    if (!panel) return;
    const x = (e.clientX / window.innerWidth) * 2 - 1;
    const y = (e.clientY / window.innerHeight) * 2 - 1;
    panel.style.setProperty("--tilt-x", `${(-y * MAX_TILT.x).toFixed(2)}deg`);
    panel.style.setProperty("--tilt-y", `${(x * MAX_TILT.y).toFixed(2)}deg`);
  };

  onChange = (e) => {
    const { name, value } = e.target;
    this.setState(({ errors }) => ({ [name]: value, errors: { ...errors, [name]: null }, message: null }));
  };

  onSubmit = (e) => {
    e.preventDefault();
    const { username, password, busy } = this.state;
    if (busy) return;
    const errors = {};
    if (!username.trim()) errors.username = "Username is required";
    if (!password) errors.password = "Password is required";
    if (errors.username || errors.password) {
      this.setState({ errors, message: null });
      return;
    }
    this.setState({ busy: true, message: null });
    this.props
      .signin({ username: username.trim(), password }, this.props.history)
      .then((response) => {
        if (response.data.success) {
          this.props.cookies.set("loggedIn", true);
          this.props.history.push(`/admin/dashboard`);
        } else {
          this.setState({ busy: false, message: "Username and password don't match" });
        }
      })
      .catch((err) => {
        const reason = err && err.response && err.response.data && err.response.data.reason;
        this.setState({ busy: false, message: reason || "Couldn't sign in. Try again." });
      });
  };

  render() {
    const { username, password, errors, message, busy } = this.state;
    return (
      <main className="signin-v2">
        <a className="signin-v2-home" href="/">
          <span aria-hidden="true">&lsaquo;</span> Marco Lavielle
        </a>

        <div className="signin-v2-stage">
          <div className="signin-v2-float">
            <div className="signin-v2-panel" ref={this.panelRef}>
              <div className="signin-v2-frame" aria-hidden="true">
                <span className="signin-v2-corner is-tl" />
                <span className="signin-v2-corner is-tr" />
                <span className="signin-v2-corner is-bl" />
                <span className="signin-v2-corner is-br" />
              </div>

              <form className="signin-v2-form" onSubmit={this.onSubmit} noValidate>
                <header className="signin-v2-heading">
                  <p className="signin-v2-kicker">Restricted access</p>
                  <h1 className="signin-v2-title">Sign in</h1>
                  <p className="signin-v2-legend">Only the best make it this far</p>
                </header>

                <label className={errors.username ? "signin-v2-field has-error" : "signin-v2-field"}>
                  <span className="signin-v2-label">Username</span>
                  <input
                    name="username"
                    type="text"
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck="false"
                    value={username}
                    onChange={this.onChange}
                    aria-invalid={!!errors.username}
                  />
                  {errors.username && <span className="signin-v2-error">{errors.username}</span>}
                </label>

                <label className={errors.password ? "signin-v2-field has-error" : "signin-v2-field"}>
                  <span className="signin-v2-label">Password</span>
                  <input
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={this.onChange}
                    aria-invalid={!!errors.password}
                  />
                  {errors.password && <span className="signin-v2-error">{errors.password}</span>}
                </label>

                <button type="submit" className={busy ? "signin-v2-submit is-busy" : "signin-v2-submit"} disabled={busy}>
                  {busy ? "Authenticating" : "Sign in"}
                </button>

                <p className="signin-v2-message" role="alert">
                  {message}
                </p>
              </form>
            </div>
          </div>
          <HoloPlatform className="signin-v2-platform" />
        </div>
      </main>
    );
  }
}

const mapStateToProps = () => ({});

const mapDispatchToProps = (dispatch) => ({
  signin: (formData, history) => dispatch(signin(formData, history)),
});

export default connect(mapStateToProps, mapDispatchToProps)(withRouter(withCookies(Signin)));
