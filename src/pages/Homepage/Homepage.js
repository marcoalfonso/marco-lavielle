import React, { Component } from "react";
import { withRouter } from "react-router-dom";
import { connect } from "react-redux";

import { getClients, getPosts } from "actions/appActions";
import UiVersionToggle from "components/UiVersionToggle/UiVersionToggle";
import loadOrbitron from "components/fonts/loadOrbitron";
import { prefersReducedMotion } from "components/motion/useDeviceTilt";
import Orbital from "./Orbital";
import "components/holo/holo.css";
import "./Homepage.css";

// Homepage V1: the three sections on an orbital instrument drawn in light.
// Pointing at a section (or tapping it) turns the orbit to bring its node to
// the top and shows its details in the centre; left alone, it cycles through
// them.

const CYCLE_MS = 6500;
const IDLE_MS = 15000; // after an interaction, before cycling resumes

const pad = (n) => String(n).padStart(2, "0");
const plural = (n, one, many) => (n === 1 ? one : many);

export class Homepage extends Component {
  state = { selected: 0, cycleStart: Date.now() };

  componentDidMount() {
    loadOrbitron();
    if (!this.props.clients) this.props.getClients();
    if (!this.props.posts) this.props.getPosts();
    // on the site's black, like V2
    document.documentElement.classList.add("home-v1");
    this.lastInteraction = 0;
    if (!prefersReducedMotion()) this.timer = setInterval(this.tick, 250);
  }

  componentWillUnmount() {
    clearInterval(this.timer);
    document.documentElement.classList.remove("home-v1");
  }

  tick = () => {
    const now = Date.now();
    if (now - this.lastInteraction < IDLE_MS || document.hidden) return;
    if (now - this.state.cycleStart >= CYCLE_MS) {
      this.setState(({ selected }) => ({ selected: (selected + 1) % 3, cycleStart: now }));
    }
  };

  select = (index) => {
    this.lastInteraction = Date.now();
    if (index !== this.state.selected) this.setState({ selected: index, cycleStart: Date.now() });
  };

  // first tap on a phone picks the section; the next one goes there
  onSectionClick = (e, index) => {
    if (index !== this.state.selected) {
      e.preventDefault();
      this.select(index);
    }
  };

  sections() {
    const { clients, posts, paintings } = this.props;
    const latest = posts && posts.length ? posts[posts.length - 1] : null;
    return [
      {
        label: "Software",
        sub: "Portfolio",
        href: "/software",
        count: clients ? clients.length : null,
        unit: clients ? plural(clients.length, "Client", "Clients") : "Clients",
        title: "Coding portfolio",
        detail: "Software and companies",
        action: "See work",
      },
      {
        label: "Paintings",
        sub: "Gallery",
        href: "/art",
        count: paintings ? paintings.length : null,
        unit: paintings ? plural(paintings.length, "Painting", "Paintings") : "Paintings",
        title: "Painting portfolio",
        detail: "Gallery",
        action: "See gallery",
      },
      {
        label: "Thoughts",
        sub: "Blog",
        href: latest ? `/journal/${latest.slug}` : "/journal",
        listHref: "/journal",
        count: posts ? posts.length : null,
        unit: posts ? plural(posts.length, "Post", "Posts") : "Posts",
        title: latest ? latest.title : "Journal",
        detail: latest ? latest.subtitle : "Notes and write-ups",
        action: "Read",
      },
    ];
  }

  render() {
    const { selected, cycleStart } = this.state;
    const sections = this.sections();
    const current = sections[selected];
    return (
      <main className="home-v1-page holo-ui">
        <aside className="v1-side">
          <header className="v1-brand">
            <h1 className="v1-name">Marco Lavielle</h1>
            <p className="v1-tagline">Coder &middot; Painter &middot; Sydney</p>
          </header>

          <nav className="v1-sections" aria-label="Sections">
            {sections.map((section, i) => (
              <a
                key={section.label}
                href={section.listHref || section.href}
                className={i === selected ? "v1-section is-selected" : "v1-section"}
                aria-current={i === selected ? "true" : undefined}
                onPointerEnter={(e) => e.pointerType === "mouse" && this.select(i)}
                onFocus={(e) => e.target.matches(":focus-visible") && this.select(i)}
                onClick={(e) => this.onSectionClick(e, i)}
              >
                <span className="v1-section-index">{pad(i + 1)}</span>
                <span className="v1-section-text">
                  <strong>{section.label}</strong>
                  <small>{section.sub}</small>
                </span>
              </a>
            ))}
          </nav>

          <nav className="v1-more" aria-label="More">
            <a href="/about">About &amp; contact</a>
            <a href="/game">Play the game</a>
          </nav>
        </aside>

        <section className="v1-stage" aria-label={`${current.label} preview`}>
          <Orbital
            sections={sections}
            selected={selected}
            cycleStart={cycleStart}
            cycleMs={CYCLE_MS}
            onSelect={this.select}
          />
        </section>

        <UiVersionToggle current="v1" />
      </main>
    );
  }
}

const mapStateToProps = (state) => ({
  clients: state.app.clients,
  posts: state.app.posts,
  paintings: state.app.paintings,
});

const mapDispatchToProps = (dispatch) => ({
  getClients: () => dispatch(getClients()),
  getPosts: () => dispatch(getPosts()),
});

export default connect(mapStateToProps, mapDispatchToProps)(withRouter(Homepage));
