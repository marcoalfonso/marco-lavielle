import React, { useEffect } from "react";
import { useSelector } from "react-redux";

import BodyHologram from "./BodyHologram";
import "./About.css";

const About = () => {
  const device = useSelector((state) => state.app.device);

  useEffect(() => {
    document.body.classList.add("level-0");
    // pages change inside the app, so take this page's class away on leaving
    return () => document.body.classList.remove("level-0");
  }, []);

  return (
    <main
      className={`page loaded level-1 ${device} detected scan-faster`}
      id="page"
    >
      <div className="column-1">
        {/* the back link the other pages use; the bar keeps the old header's
            height, so nothing below moves */}
        <div className="uplevel about-bar">
          <a className="about-home" href="/">
            <span aria-hidden="true">&lsaquo;</span> Marco Lavielle
          </a>
          <h1 className="section-title mobile-only">About</h1>
        </div>
      </div>
      <div className="about-content">
        <div className="fancy-header">
          <h1>Thanks for visiting</h1>
          <h2>I Design & Build Things</h2>
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
};

export default About;
