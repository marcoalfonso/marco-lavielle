import React, { Component, useRef } from "react";
import { withRouter } from "react-router-dom";
import { connect } from "react-redux";

import { getPostBySlug, getPosts } from "actions/appActions";
import HoloPanel from "components/holo/HoloPanel";
import loadOrbitron from "components/fonts/loadOrbitron";
import useDeviceTilt, { prefersReducedMotion } from "components/motion/useDeviceTilt";
import Globe from "pages/Journal/Globe";
import "components/holo/holo.css";
import "./Post.css";

// A journal entry: the post on a pane of glass with the HUD brackets, under
// a header with a small globe that turns with the mouse or the phone's tilt.
// The text itself never moves, so it stays readable, and the page scrolls
// normally however long the post is.

const pad = (n, w = 3) => String(n).padStart(w, "0");
const stamp = (date) => (date ? date.slice(0, 10).replace(/-/g, ".") : "");
const wordCount = (html) => ((html || "").replace(/<[^>]*>/g, " ").match(/\S+/g) || []).length;
const PHONE_GAIN = 1.3; // globe turn per degree of phone tilt

// the header's globe, following the phone's tilt (on iPhone after a tap)
const EntryGlobe = () => {
  const tiltRef = useRef({ x: 0, y: 0 });
  const { showHint, requestPermission, denied } = useDeviceTilt((x, y) => {
    tiltRef.current = { x: (x * PHONE_GAIN * Math.PI) / 180, y: (y * PHONE_GAIN * Math.PI) / 180 };
  }, !prefersReducedMotion());
  return (
    <div className="entry-globe-wrap">
      <div className="entry-globe">
        <Globe className="entry-globe-canvas" tiltRef={tiltRef} showAxes={false} />
      </div>
      {showHint && (
        <button type="button" className="entry-motion-hint" onClick={requestPermission}>
          <span className="entry-motion-icon" aria-hidden="true" />
          Tap, then move your phone
        </button>
      )}
      {denied && (
        <p className="entry-motion-hint is-passive" aria-live="polite">
          Motion blocked in Safari settings
        </p>
      )}
    </div>
  );
};

export class Post extends Component {
  state = { progress: 0 };

  componentDidMount() {
    loadOrbitron();
    document.documentElement.classList.add("entry-html");
    this.load();
    if (!this.props.posts) this.props.getPosts();
    window.addEventListener("scroll", this.onScroll, { passive: true });
    window.addEventListener("resize", this.onScroll);
  }

  componentDidUpdate(prevProps) {
    if (prevProps.match.params.post !== this.props.match.params.post) {
      this.load();
      window.scrollTo(0, 0);
    }
    if (prevProps.post !== this.props.post) this.onScroll();
  }

  componentWillUnmount() {
    document.documentElement.classList.remove("entry-html");
    window.removeEventListener("scroll", this.onScroll);
    window.removeEventListener("resize", this.onScroll);
    cancelAnimationFrame(this.raf);
  }

  load = () => this.props.getPostBySlug(this.props.match.params.post);

  // how far through the post the reader is, for the bar along the top
  onScroll = () => {
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(() => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      this.setState({ progress: max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 1 });
    });
  };

  render() {
    const { posts } = this.props;
    const slug = this.props.match.params.post;
    const post = this.props.post && this.props.post.slug === slug ? this.props.post : null;
    // oldest first, so entries are numbered in the order they were written
    const ordered = posts ? [...posts].sort((a, b) => (a.published || "").localeCompare(b.published || "")) : [];
    const at = ordered.findIndex((p) => p.slug === slug);
    const older = at > 0 ? ordered[at - 1] : null;
    const newer = at >= 0 && at < ordered.length - 1 ? ordered[at + 1] : null;
    const words = post ? wordCount(post.body) : 0;
    const minutes = Math.max(1, Math.round(words / 220));

    return (
      <main className="entry-page holo-ui">
        <div className="entry-progress" aria-hidden="true">
          <span style={{ transform: `scaleX(${this.state.progress})` }} />
        </div>

        <header className="entry-top">
          <a className="entry-back" href="/journal">
            <span aria-hidden="true">&lsaquo;</span> Journal
          </a>
          <span className="entry-section">Thoughts</span>
        </header>

        <section className="entry-head">
          <EntryGlobe />
          <div className="entry-head-text">
            <p className="entry-kicker">
              <span>Entry {at >= 0 ? pad(at + 1) : "···"}</span>
              <span>{post ? stamp(post.published) : "····.··.··"}</span>
              {post && <span>{minutes} min read</span>}
            </p>
            <h1 className="entry-title">{post ? post.title : " "}</h1>
            {post && post.subtitle && <p className="entry-subtitle">{post.subtitle}</p>}
            {post && post.author && <p className="entry-author">By {post.author}</p>}
          </div>
        </section>

        <HoloPanel as="article" className="entry-panel">
          {post ? (
            <div className="entry-body" dangerouslySetInnerHTML={{ __html: post.body }} />
          ) : (
            <p className="entry-loading">Loading entry…</p>
          )}
        </HoloPanel>

        <nav className="entry-nav" aria-label="More entries">
          {older ? (
            <a className="entry-nav-link is-older" href={`/journal/${older.slug}`}>
              <small>‹ Previous entry</small>
              <strong>{older.title}</strong>
            </a>
          ) : (
            <span />
          )}
          {newer ? (
            <a className="entry-nav-link is-newer" href={`/journal/${newer.slug}`}>
              <small>Next entry ›</small>
              <strong>{newer.title}</strong>
            </a>
          ) : (
            <span />
          )}
        </nav>

        <p className="entry-foot">
          <a href="/journal">All entries</a>
          <span aria-hidden="true">·</span>
          <a href="/about">About</a>
        </p>
      </main>
    );
  }
}

const mapStateToProps = (state) => ({
  post: state.app.post,
  posts: state.app.posts,
});

const mapDispatchToProps = (dispatch) => ({
  getPostBySlug: (slug) => dispatch(getPostBySlug(slug)),
  getPosts: () => dispatch(getPosts()),
});

export default connect(mapStateToProps, mapDispatchToProps)(withRouter(Post));
