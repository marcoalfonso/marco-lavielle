// A tiny notification store (in place of react-toastify): anything can call
// notify("Post deleted") or notify.error("..."); <Notifications /> shows them.

let nextId = 0;
const listeners = new Set();

const push = (text, kind) => {
  const note = { id: ++nextId, text, kind };
  listeners.forEach((fn) => fn(note));
  return note.id;
};

const notify = (text) => push(text, "success");
notify.success = notify;
notify.error = (text) => push(text, "error");

// returns an unsubscribe function
notify.subscribe = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export default notify;
