import React, { Component } from "react";
import { withRouter } from "react-router-dom";
import { connect } from "react-redux";

import { getPosts } from "actions/appActions";
import loadOrbitron from "components/fonts/loadOrbitron";
import StarChart from "./StarChart";
import "components/holo/holo.css";
import "./Journal.css";

// Journal: an Evangelion-style star chart in the site's light. A wireframe
// globe with the social channels as callouts, corner readouts giving the
// entry count and two live counters, and the entry log below listing every
// post.

const LEAVE_MS = 1450; // keep in step with the .is-leaving timings in Journal.css

const pad = (n, width = 3) => String(n).padStart(width, "0");
const withCommas = (n) => pad(n, 9).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const seconds = (date) => Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 1000));

// "2020-12-01T..." -> "2020.12.01"
const stamp = (date) => (date ? date.slice(0, 10).replace(/-/g, ".") : "");

// the social channels, shown as callouts around the globe
const CHANNELS = [
  {
    id: "linkedin",
    name: "LinkedIn",
    side: "right",
    handle: "Marco Lavielle",
    href: "https://www.linkedin.com/in/marcolavielle/",
    action: "Connect",
  },
  {
    id: "instagram",
    name: "Instagram",
    side: "left",
    handle: "@cuban_papi_chulo",
    href: "http://instagram.com/cuban_papi_chulo",
    action: "Follow",
  },
  {
    id: "twitter",
    name: "X / Twitter",
    side: "right",
    handle: "@marcolavielle",
    href: "https://twitter.com/marcolavielle",
    action: "Follow",
  },
];

const HudBox = ({ className, label, value, unit, note }) => (
  <div className={`magi-hud ${className}`}>
    <span className="magi-hud-bar" aria-hidden="true" />
    <div className="magi-hud-box">
      <span className="magi-hud-label">{label}</span>
      {value !== undefined && (
        <span className="magi-hud-value">
          {value}
          {unit && <small> {unit}</small>}
        </span>
      )}
      {note && <span className="magi-hud-note">{note}</span>}
    </div>
  </div>
);

export class Journal extends Component {
  state = { selected: 0, now: Date.now(), leaving: false };

  componentDidMount() {
    loadOrbitron();
    document.documentElement.classList.add("journal-html");
    if (!this.props.posts) this.props.getPosts();
    this.clock = setInterval(() => this.setState({ now: Date.now() }), 1000);
    window.addEventListener("pageshow", this.onPageShow);
  }

  componentWillUnmount() {
    clearInterval(this.clock);
    clearTimeout(this.leaveTimer);
    window.removeEventListener("pageshow", this.onPageShow);
    document.documentElement.classList.remove("journal-html");
  }

  select = (index) => this.setState({ selected: index });

  // Leaving by a link on the page: the screen compresses back into its core
  // (the opening in reverse), then the link is followed. Links that open a
  // new tab (the social channels) go straight away: this page stays open,
  // and browsers only allow a new tab straight from the click.
  onClickCapture = (e) => {
    const link = e.target.closest && e.target.closest("a[href]");
    if (!link || this.state.leaving || this.centring) return;
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (link.target === "_blank" || link.origin !== window.location.origin) return;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    e.preventDefault();
    // from further down the page (the entry log), bring the globe to the
    // middle of the screen first, so the compress can be seen
    this.centring = true;
    this.centreGlobe().then(() => {
      this.centring = false;
      this.setState({ leaving: true });
      this.leaveTimer = setTimeout(() => window.location.assign(link.href), LEAVE_MS);
    });
  };

  // smooth-scroll the globe to the middle of the screen; resolves once there
  // (or straight away if it already is)
  centreGlobe = () =>
    new Promise((done) => {
      const globe = document.querySelector(".chart-globe");
      if (!globe) return done();
      const r = globe.getBoundingClientRect();
      const target = Math.max(0, Math.round(window.scrollY + r.top + r.height / 2 - window.innerHeight / 2));
      if (Math.abs(target - window.scrollY) < 40) return done();
      window.scrollTo({ top: target, behavior: "smooth" });
      // wait until the page stops moving (scrollend isn't everywhere yet)
      const started = Date.now();
      let last = window.scrollY;
      let still = 0;
      const check = () => {
        const y = window.scrollY;
        still = Math.abs(y - last) < 1 ? still + 1 : 0;
        last = y;
        if (still >= 4 || Date.now() - started > 1200) done();
        else requestAnimationFrame(check);
      };
      requestAnimationFrame(check);
    });

  // back to this page from the next one: undo the compress if the browser
  // restored it as it was left
  onPageShow = (e) => {
    if (e.persisted) this.setState({ leaving: false });
  };

  render() {
    const { selected } = this.state;
    const sorted = this.props.posts
      ? [...this.props.posts].sort((a, b) => (b.published || "").localeCompare(a.published || ""))
      : null;
    const entries = sorted ? sorted.map((post, index) => ({ post, index, number: sorted.length - index })) : [];
    const latest = sorted && sorted[0];
    const first = sorted && sorted[sorted.length - 1];

    return (
      <main className={this.state.leaving ? "journal-magi holo-ui is-leaving" : "journal-magi holo-ui"} onClickCapture={this.onClickCapture}>
        <header className="magi-top">
          <a className="magi-home" href="/">
            <span aria-hidden="true">&lsaquo;</span> Marco Lavielle
          </a>
          <h1 className="magi-title">Thoughts</h1>
        </header>

        <section className="magi-screen" aria-label="Journal index">
          <HudBox className="is-tl" label="Journal index" note="on ML-01 original" />
          <HudBox
            className="is-tr"
            label="Time since last entry"
            value={latest ? withCommas(seconds(latest.published)) : "···,···,···"}
            unit="sec."
          />
          <HudBox
            className="is-bl"
            label={`Entries no. ${sorted ? pad(sorted.length) : "···"}`}
            note="on ML-01 original"
          />
          <HudBox
            className="is-br"
            label="Time since first entry"
            value={first ? withCommas(seconds(first.published)) : "···,···,···"}
            unit="sec."
          />
          <StarChart channels={CHANNELS} posts={sorted} now={this.state.now} leaving={this.state.leaving} />
        </section>

        <section className="magi-log" aria-label="All entries">
          <h2 className="magi-log-title">
            <span>Entry log</span>
            <small>{sorted ? `${pad(sorted.length)} records` : "Loading records"}</small>
          </h2>
          <ol className="magi-log-list">
            {entries.map(({ post, index, number }) => (
              <li key={post.slug} style={{ "--i": index }}>
                <a
                  href={`/journal/${post.slug}`}
                  className={index === selected ? "magi-entry is-selected" : "magi-entry"}
                  onPointerEnter={(e) => e.pointerType === "mouse" && this.select(index)}
                  onFocus={() => this.select(index)}
                >
                  <span className="magi-entry-id">
                    <small>Entry</small>
                    <strong>{pad(number)}</strong>
                  </span>
                  <span className="magi-entry-main">
                    <span className="magi-entry-title">{post.title}</span>
                    <span className="magi-entry-sub">{post.subtitle}</span>
                  </span>
                  <span className="magi-entry-date">{stamp(post.published)}</span>
                  <span className="magi-entry-go" aria-hidden="true">
                    Read &rsaquo;
                  </span>
                </a>
              </li>
            ))}
          </ol>
        </section>
      </main>
    );
  }
}

const mapStateToProps = (state) => ({
  posts: state.app.posts,
});

const mapDispatchToProps = (dispatch) => ({
  getPosts: () => dispatch(getPosts()),
});

export default connect(mapStateToProps, mapDispatchToProps)(withRouter(Journal));
