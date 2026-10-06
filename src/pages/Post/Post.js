import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

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

const Post = () => {
  const { post: slug } = useParams();
  const dispatch = useDispatch();
  const current = useSelector((state) => state.app.post);
  const posts = useSelector((state) => state.app.posts);
  const [progress, setProgress] = useState(0);
  const raf = useRef(null);
  const firstSlug = useRef(true);

  // how far through the post the reader is, for the bar along the top
  const onScroll = () => {
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 1);
    });
  };

  useEffect(() => {
    loadOrbitron();
    document.documentElement.classList.add("entry-html");
    if (!posts) dispatch(getPosts());
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      document.documentElement.classList.remove("entry-html");
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf.current);
    };
  }, []);

  // this entry, and another one when the address changes (from the top)
  useEffect(() => {
    dispatch(getPostBySlug(slug));
    if (firstSlug.current) firstSlug.current = false;
    else window.scrollTo(0, 0);
  }, [slug]);

  // the post's arrival changes the page's length
  useEffect(onScroll, [current]);

  const post = current && current.slug === slug ? current : null;
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
        <span style={{ transform: `scaleX(${progress})` }} />
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
};

export default Post;
