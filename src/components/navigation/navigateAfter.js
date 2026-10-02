// Navigate with a leaving animation, without upsetting the Back button.
//
// Browsers (Safari in particular) treat a page that navigates away on its
// own, with no click behind it, like an automatic redirect, and skip it when
// you press Back. An animation that plays before the page changes outlasts
// the click, so a navigation started at its end no longer counts as yours.
//
// So the navigation starts right away, inside the click: an ordinary
// navigation that every browser keeps in its history as usual. A short-lived
// cookie asks the server to hold the page back for `delay` ms (see
// server/config/express.js), and this page stays on screen, animating, until
// the next one arrives. Links to other sites go straight away.
//
// If the page is still here well after it should have changed (the load was
// stopped, or failed), onCancel() runs so the page can put itself back.
const navigateAfter = (href, { delay = 0, onCancel } = {}) => {
  const target = new URL(href, window.location.href);
  if (target.origin === window.location.origin && delay > 0) {
    document.cookie = `nav-delay=${Math.round(delay)}|${encodeURIComponent(target.pathname)}; max-age=15; path=/; SameSite=Lax`;
  }
  window.location.assign(target.href);
  const watchdog = setTimeout(() => {
    if (onCancel) onCancel();
  }, delay + 8000);
  // the page is being left: nothing more to do
  window.addEventListener("pagehide", () => clearTimeout(watchdog), { once: true });
};

export default navigateAfter;
