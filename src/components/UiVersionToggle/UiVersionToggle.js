import React from "react";
import { Link } from "react-router-dom";
import "./UiVersionToggle.css";

// Bottom-right switch between the new homepage (V2, at /) and the old one
// (V1, at /v1).

const VERSIONS = [
  { id: "v1", label: "V1", to: "/v1" },
  { id: "v2", label: "V2", to: "/" },
];

const UiVersionToggle = ({ current }) => (
  <nav className={`ui-toggle is-${current}`} aria-label="UI version">
    <span className="ui-toggle-label">UI version</span>
    <span className="ui-toggle-switch">
      <span className="ui-toggle-thumb" aria-hidden="true" />
      {VERSIONS.map((v) => (
        <Link
          key={v.id}
          to={v.to}
          className={v.id === current ? "ui-toggle-option is-active" : "ui-toggle-option"}
          aria-current={v.id === current ? "page" : undefined}
        >
          {v.label}
        </Link>
      ))}
    </span>
  </nav>
);

export default UiVersionToggle;
