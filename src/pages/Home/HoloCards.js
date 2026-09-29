import React from "react";

// The holograms that appear over a face of the cube while it's hovered, one
// per link, in the spirit of V1's ring previews (map and client count,
// paintings, latest post...). Pure markup; Home.css tints and animates them.

const plural = (n, one, many) => (n === 1 ? one : many);

const Stat = ({ value, label }) => (
  <span className="holo-stat">
    <strong>{value}</strong>
    <small>{label}</small>
  </span>
);

export const SoftwareHolo = ({ clients }) => (
  <>
    <span className="holo-map" style={{ backgroundImage: "url(/images/maps/250.png)" }}>
      {/* Sydney */}
      <span className="holo-blip" style={{ left: "88%", top: "85%" }}>
        <span className="holo-blip-ring" />
        <span className="holo-blip-ring" />
      </span>
    </span>
    {clients ? <Stat value={clients} label={plural(clients, "Client", "Clients")} /> : null}
  </>
);

export const PaintingsHolo = ({ painting, count }) => (
  <>
    <span className="holo-image holo-painting" style={{ backgroundImage: `url(${painting})` }} />
    <Stat value={count} label={plural(count, "Painting", "Paintings")} />
  </>
);

export const ThoughtsHolo = ({ post, count }) => (
  <>
    <span className="holo-post">
      <span className="holo-post-kicker">Latest post</span>
      <span className="holo-post-title">{post ? post.title : "Journal"}</span>
      <span className="holo-post-lines" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
    </span>
    {count ? <Stat value={count} label={plural(count, "Post", "Posts")} /> : null}
  </>
);

export const AboutHolo = () => (
  <>
    <span className="holo-image holo-portrait" style={{ backgroundImage: "url(/images/marco_lavielle.jpg)" }} />
    <span className="holo-caption">Sydney, Australia</span>
  </>
);

// a little off-roader in wireframe, like the one in the game
export const GameHolo = () => (
  <>
    <svg className="holo-svg" viewBox="0 0 120 70" aria-hidden="true">
      <path d="M12 44 L16 30 L34 28 L44 16 L78 16 L90 28 L106 31 L110 44 Z" />
      <path d="M46 19 L42 28 M60 17 L60 28 M76 19 L84 28 M34 28 L90 28" />
      <circle cx="32" cy="46" r="10" />
      <circle cx="32" cy="46" r="4" />
      <circle cx="90" cy="46" r="10" />
      <circle cx="90" cy="46" r="4" />
      <path className="holo-svg-ground" d="M2 57 L118 57" />
    </svg>
    <span className="holo-caption">Drive a little world</span>
  </>
);

export const GitHubHolo = () => (
  <>
    <svg className="holo-svg holo-svg-fill" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
    <span className="holo-caption">@marcoalfonso</span>
  </>
);
