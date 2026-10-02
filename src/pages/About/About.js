import React, { Component } from "react";
import { withRouter } from "react-router-dom";
import { connect } from "react-redux";

import styles from "./About.module.css";
import BodyHologram from "./BodyHologram";
import loadOrbitron from "components/fonts/loadOrbitron";
import "components/holo/holo.css";
import "./About.css";

export class About extends Component {
  componentDidMount() {
    loadOrbitron();
    document.documentElement.classList.add("about-html");
    document.body.classList.add("level-0");
  }

  componentWillUnmount() {
    document.documentElement.classList.remove("about-html");
    document.body.classList.remove("level-0");
  }

  render() {
    return (
      <main
        className={`page loaded level-1 ${this.props.device} detected scan-faster`}
        id="page"
      >
        <header className="about-top holo-ui">
          <a className="about-home" href="/">
            <span aria-hidden="true">&lsaquo;</span> Marco Lavielle
          </a>
          <span className="about-section">About</span>
        </header>
        <div className="about-content">
          <div className="about-heading holo-ui">
            <p className="about-kicker">Thanks for visiting</p>
            <h1 className="about-title">I Design &amp; Build Things</h1>
          </div>
          <div className="personal-info">
            <div className="container">
              <BodyHologram className="body-hologram" />
              <div className="text">
                <p>
                  Hi, I'm Marco Lavielle, I design and develop web apps and VR
                  apps. In my free time I work on my paintings and VR art
                  projects.
                </p>
                <p>
                  This site is a showcase of my work. Get in touch if you want
                  to explore collaborating on a project.
                </p>
              </div>
              <div className="stats">
                <dl className="stats-1">
                  <dt>Name</dt>
                  <dd>Marco Lavielle</dd>
                  <dt>Location</dt>
                  <dd>Little Bay, NSW, Sydney</dd>
                  <dt>Telephone</dt>
                  <dd>
                    <a href="tel:+61423478156">0423 478 156</a>
                  </dd>
                  <dt>Email</dt>
                  <dd>
                    <a href="mailto:marcoalfonso@gmail.com">
                      marcoalfonso@gmail.com
                    </a>
                  </dd>
                </dl>
                <dl className="stats-2 smaller">
                  <dt>
                    <a href="/signin" data-section="about">
                      Login
                    </a>
                  </dt>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }
}

const mapStateToProps = (state) => ({
  loading: state.app.loading,
  device: state.app.device,
});

const mapDispatchToProps = (dispatch) => ({});

export default connect(mapStateToProps, mapDispatchToProps)(withRouter(About));
