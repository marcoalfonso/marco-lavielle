import React, { useEffect, useState } from "react";
import notify from "./notify";
import "./Notifications.css";

const SHOW_MS = 3600;

// The notifications raised with notify(): holo pills stacked at the bottom
// of the screen, each fading out on its own after a few seconds.
const Notifications = () => {
  const [notes, setNotes] = useState([]);

  useEffect(() => {
    const timers = new Set();
    const unsubscribe = notify.subscribe((note) => {
      setNotes((list) => [...list.slice(-3), note]);
      const timer = setTimeout(() => {
        timers.delete(timer);
        setNotes((list) => list.filter((n) => n.id !== note.id));
      }, SHOW_MS);
      timers.add(timer);
    });
    return () => {
      unsubscribe();
      timers.forEach(clearTimeout);
    };
  }, []);

  return (
    <div className="notes" role="status" aria-live="polite">
      {notes.map((n) => (
        <div key={n.id} className={`notes-item is-${n.kind}`}>
          <span className="notes-dot" aria-hidden="true" />
          {n.text}
        </div>
      ))}
    </div>
  );
};

export default Notifications;
