import React from "react";
import "./holo.css";

// A pane of dark glass with the paintings' HUD brackets at its corners.
// Extra layers (e.g. the sign-in page's depth) hang off className.
const HoloPanel = React.forwardRef(({ className, frameClassName, children, as: Tag = "section", ...rest }, ref) => (
  <Tag ref={ref} className={className ? `holo-panel ${className}` : "holo-panel"} {...rest}>
    <div className={frameClassName ? `holo-panel-frame ${frameClassName}` : "holo-panel-frame"} aria-hidden="true">
      <span className="holo-corner is-tl" />
      <span className="holo-corner is-tr" />
      <span className="holo-corner is-bl" />
      <span className="holo-corner is-br" />
    </div>
    <div className="holo-panel-body">{children}</div>
  </Tag>
));

export default HoloPanel;
