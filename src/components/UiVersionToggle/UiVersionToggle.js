import React from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import "./UiVersionToggle.css";

// Bottom-right switch between the new homepage (V2, at /) and the old one
// (V1, at /v1). Rendered straight into <body>, so nothing in a page's own
// layout (transforms, overflow, stacking) can hide or clip it.

const VERSIONS = [
  { id: "v1", label: "V1", to: "/v1" },
  { id: "v2", label: "V2", to: "/" },
];

// Hidden for the launch; set to true to bring the switch back (/v1 still works).
const SHOW_TOGGLE = false;

const UiVersionToggle = ({ current }) =>
  SHOW_TOGGLE &&
  createPortal(
    <nav className={`ui-toggle is-${current}`} aria-label="UI version">
      <span className="ui-toggle-label">UI version</span>
      <span className="ui-toggle-switch">
        <span className="ui-toggle-thumb" aria-hidden="true" />
        {VERSIONS.map((v) => (
          <Link
            key={v.id}
            to={v.to}
            className={
              v.id === current
                ? "ui-toggle-option is-active"
                : "ui-toggle-option"
            }
            aria-current={v.id === current ? "page" : undefined}
          >
            {v.label}
          </Link>
        ))}
      </span>
    </nav>,
    document.body,
  );

export default UiVersionToggle;
