// Navigate after a leaving animation, without upsetting the Back button.
//
// Browsers (Safari in particular) treat a page that navigates away on its
// own, with no click behind it, like an automatic redirect, and skip it when
// you press Back. An animation that plays before the page changes outlasts
// the click, so the navigation at its end no longer counts as yours.
//
// So the history step is taken right away, inside the click: begin() adds
// the destination to history (for another site, a stand-in for this page).
// When the animation ends, finish() loads the page in place of that step,
// adding no entry of its own. If Back is pressed while the animation is
// still playing, onCancel() runs and nothing loads.
const navigateAfter = (href, { onCancel } = {}) => {
  const target = new URL(href, window.location.href);
  const sameSite = target.origin === window.location.origin;
  let cancelled = false;
  const onPopState = () => {
    cancelled = true;
    window.removeEventListener("popstate", onPopState);
    if (onCancel) onCancel();
  };
  try {
    window.history.pushState(window.history.state, "", sameSite ? target.href : window.location.href);
    window.addEventListener("popstate", onPopState);
  } catch (e) {
    // pushState refused: fall back to a plain navigation at the end
  }
  return {
    finish() {
      if (cancelled) return;
      window.removeEventListener("popstate", onPopState);
      window.location.replace(target.href);
    },
  };
};

export default navigateAfter;
