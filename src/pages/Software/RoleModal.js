import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import HoloPanel from "components/holo/HoloPanel";
import { duration, monthYear } from "./experience";

// More about a role, from the CV: what was built, with what, and a link to
// the site. Closes on Escape, the close button or a click outside; the page
// behind doesn't scroll while it's open, and focus returns to the card.

const RoleModal = ({ item, onClose }) => {
  const closeRef = useRef(null);

  useEffect(() => {
    if (!item) return undefined;
    const before = document.activeElement;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    const scrollY = window.scrollY;
    document.documentElement.classList.add("xp-modal-open");
    window.addEventListener("keydown", onKey);
    if (closeRef.current) closeRef.current.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.documentElement.classList.remove("xp-modal-open");
      window.scrollTo(0, scrollY);
      if (before && before.focus) before.focus();
    };
  }, [item]);

  if (!item) return null;
  return createPortal(
    <div
      className="xp-modal holo-ui"
      role="dialog"
      aria-modal="true"
      aria-labelledby="xp-modal-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <HoloPanel as="div" className="xp-modal-panel">
        <button type="button" className="xp-modal-close" onClick={onClose} ref={closeRef} aria-label="Close">
          <span aria-hidden="true">×</span>
        </button>
        <img className="xp-modal-image" src={item.image} alt={`${item.company} website`} />
        <div className="xp-modal-body">
          <p className="holo-kicker">
            {monthYear(item.from)} – {monthYear(item.to)} · {duration(item.from, item.to)}
          </p>
          <h2 className="xp-modal-title" id="xp-modal-title">
            {item.company}
          </h2>
          <p className="xp-modal-role">
            {item.role}
            {item.client && <span> · {item.client}</span>}
          </p>
          <p className="xp-modal-summary">{item.summary}</p>
          <ul className="xp-chips" aria-label="Technology">
            {item.tech.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          <div className="xp-modal-links">
            <a className="holo-button is-small" href={item.url} target="_blank" rel="noopener noreferrer">
              Visit site
            </a>
            {item.extraLink && (
              <a className="holo-button is-quiet is-small" href={item.extraLink.href} target="_blank" rel="noopener noreferrer">
                {item.extraLink.label}
              </a>
            )}
          </div>
        </div>
      </HoloPanel>
    </div>,
    document.body,
  );
};

export default RoleModal;
