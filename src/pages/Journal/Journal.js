import React, { Component } from "react";
import { withRouter } from "react-router-dom";
import { connect } from "react-redux";

import { getPosts } from "actions/appActions";
import loadOrbitron from "components/fonts/loadOrbitron";
import MagiDial from "./MagiDial";
import "components/holo/holo.css";
import "./Journal.css";

// Journal: the post index as a MAGI-style screen in the site's light. The
// dial's three arms hold the posts (newest first, in three archive groups),
// corner readouts give the count and two live counters, and the entry log
// below lists every post. Pointing at a post in either lights it in both.

const pad = (n, width = 3) => String(n).padStart(width, "0");
const withCommas = (n) => pad(n, 9).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const seconds = (date) => Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 1000));

// "2020-12-01T..." -> "2020.12.01"
const stamp = (date) => (date ? date.slice(0, 10).replace(/-/g, ".") : "");

// the arms' heads: a link to each profile, with a ticker rolling through
// five lines about it
const SOCIALS = [
  {
    name: "LinkedIn",
    href: "https://www.linkedin.com/in/marcolavielle/",
    info: ["LinkedIn", "Marco Lavielle", "Software engineer", "Sydney, Australia", "Connect ›"],
  },
  {
    name: "Instagram",
    href: "http://instagram.com/cuban_papi_chulo",
    info: ["Instagram", "@cuban_papi_chulo", "Paintings & life", "Behind the canvas", "Follow ›"],
  },
  {
    name: "Twitter",
    href: "https://twitter.com/marcolavielle",
    info: ["Twitter / X", "@marcolavielle", "Code & thoughts", "Short-form notes", "Follow ›"],
  },
];

// the posts, newest first, split across the three arms
const toArms = (posts) => {
  const size = Math.ceil(posts.length / 3);
  return SOCIALS.map((social, a) => ({ ...social, entries: posts.slice(a * size, (a + 1) * size) }));
};

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
  state = { selected: 0, now: Date.now() };

  componentDidMount() {
    loadOrbitron();
    document.documentElement.classList.add("journal-html");
    if (!this.props.posts) this.props.getPosts();
    this.clock = setInterval(() => this.setState({ now: Date.now() }), 1000);
  }

  componentWillUnmount() {
    clearInterval(this.clock);
    document.documentElement.classList.remove("journal-html");
  }

  select = (index) => this.setState({ selected: index });

  render() {
    const { selected } = this.state;
    const sorted = this.props.posts
      ? [...this.props.posts].sort((a, b) => (b.published || "").localeCompare(a.published || ""))
      : null;
    const entries = sorted ? sorted.map((post, index) => ({ post, index, number: sorted.length - index })) : [];
    const latest = sorted && sorted[0];
    const first = sorted && sorted[sorted.length - 1];

    return (
      <main className="journal-magi holo-ui">
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
          <MagiDial arms={toArms(entries)} selected={selected} onSelect={this.select} />
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
