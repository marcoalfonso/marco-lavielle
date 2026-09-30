import React from "react";

// Bottom-left switch for the cube's light: the site's cyan (default) or
// every colour. Same look as the UI version toggle, without a label.

const OPTIONS = [
  { id: "cyan", label: "Cyan light" },
  { id: "spectrum", label: "All colours" },
];

const ColourToggle = ({ value, onChange }) => (
  <div className={`ui-toggle colour-toggle is-${value}`} role="group" aria-label="Cube colours">
    <span className="ui-toggle-switch">
      <span className="ui-toggle-thumb" aria-hidden="true" />
      {OPTIONS.map((option) => (
        <button
          key={option.id}
          type="button"
          className={option.id === value ? "ui-toggle-option is-active" : "ui-toggle-option"}
          aria-pressed={option.id === value}
          aria-label={option.label}
          title={option.label}
          onClick={() => onChange(option.id)}
        >
          <span className={`colour-swatch is-${option.id}`} aria-hidden="true" />
        </button>
      ))}
    </span>
  </div>
);

export default ColourToggle;
