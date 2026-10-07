// "mobile" or "desktop", by the page's width. Worked out straight away (not
// after the first render), so a page's first frame already has the right
// layout.
export const MOBILE_BELOW = 812; // px of page width

export const deviceFor = () => {
  if (typeof document === "undefined") return null;
  const width = document.documentElement.clientWidth || window.innerWidth;
  if (!width) return null;
  return width < MOBILE_BELOW ? "mobile" : "desktop";
};
