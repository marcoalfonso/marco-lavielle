// Navigate with a leaving animation, without upsetting the Back button.
//
// Browsers (Safari in particular) treat a history entry that a page adds on
// its own, with no click behind it, like an automatic redirect, and skip it
// when you press Back. An animation that plays before the page changes
// outlasts the click, so a navigation started at its end no longer counts
// as yours.
//
// So the new address goes into the history right away, inside the click,
// and this page stays on screen, animating, until `delay` ms later, when the
// router is told to show the page for it (a page change inside the app, so
// nothing is loading while the animation plays: Safari stops drawing a page
// once a load is under way, which froze the animation).
//
// Pages the server sends with their own stylesheets (see
// server/config/routes.js) can't be shown by the router: for those, once the
// animation has played, the new address is loaded in place, which reuses the
// history entry made by the click rather than adding one.
//
// Pressing Back before then cancels it: onCancel() runs so the page can put
// itself back. Links to other sites go once the animation has played.
const OWN_PAGE = ["/art"];

const navigateAfter = (href, { delay = 0, onCancel } = {}) => {
  const target = new URL(href, window.location.href);
  if (target.origin !== window.location.origin) {
    setTimeout(() => window.location.assign(target.href), delay);
    return;
  }
  const path = target.pathname + target.search + target.hash;
  window.history.pushState(null, "", path);
  const here = () => window.location.pathname + window.location.search + window.location.hash === path;
  const onPop = () => {
    clearTimeout(timer);
    if (onCancel) onCancel();
  };
  window.addEventListener("popstate", onPop, { once: true });
  const timer = setTimeout(() => {
    window.removeEventListener("popstate", onPop);
    if (!here()) return;
    if (OWN_PAGE.includes(target.pathname)) {
      window.location.reload();
      return;
    }
    // the router listens for popstate and shows the page for the address
    window.dispatchEvent(new PopStateEvent("popstate", { state: null }));
    window.scrollTo(0, 0);
  }, delay);
};

export default navigateAfter;
