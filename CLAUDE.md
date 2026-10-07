# marcolavielle.com

Marco Lavielle's personal site: software portfolio, paintings, a journal ("Thoughts"), About, and a small 3D game. Live at https://www.marcolavielle.com (Cloudflare in front of one Heroku dyno, `marcolavielle`).

## Working agreements (always follow)

- **Branch → PR → preview.** Never commit to `master`. Open a PR and point Marco at the local preview (http://localhost:4030). Merge and deploy **only** when he says "merge and deploy".
- **Deploy** = merge the PR on GitHub, `git checkout master && git pull`, `git push heroku master`, then check the live site (pages load, `heroku logs`).
- **No Claude attribution** in commits or PRs (also set in `.claude/settings.json`).
- **Never commit** `public/dist/*` or `.DS_Store`. Both show as modified all the time: `public/dist` is in `.gitignore` but still tracked, and Heroku builds the bundle itself (`heroku-postbuild`). `git checkout -- public/dist` before switching branches.
- **`.env.local` points at the LIVE MongoDB Atlas database.** Never run tests or scripts that write data against it. For server or API testing, use a throwaway `mongodb-memory-server` and start the server with `DB_URI=mongodb://127.0.0.1:<port>/<name>` (env vars beat `.env.local`).
- **Keep private things off the public site:** no CV references (names, phones, emails of referees). Do not add Evangelion/MAGI references anywhere.
- When Marco rejects a redesign, revert completely to what was there before; don't keep "improved" bits.
- PR descriptions: what changed, why, and what was checked (and what wasn't, e.g. "not tried on a real iPhone").

## Stack

- **Front end:** React 16.14 function components with hooks (no classes), Redux 4 + thunk (`useSelector` and `useDispatch`, no `connect`), React Router 5.2 (`useParams` and `useHistory`, no `withRouter`), react-cookie (`useCookies`). Webpack 5 → `public/dist/bundle.js`. Imports resolve from `src/` (e.g. `import notify from "components/notify/notify"`).
- **Server:** Node 24, Express 5, Mongoose 9, Passport 0.7 (local strategy), express-session, EJS views. CommonJS with modern syntax (const, arrows, async/await, `node:` imports).
  - `server.js`: entry point, with graceful SIGTERM shutdown.
  - `server/config/`: Express setup and static caching, routes on an `express.Router` with Express 5 wildcards (`/{*rest}`), passport, the auth and login throttle (per IP and per username; trusts `CF-Connecting-IP` only from Cloudflare ranges), and the `assets.js` versioned URLs.
  - `server/controllers/crud.js`: shared list, find, create, update and delete for posts and clients, with a 60 s in-memory read cache cleared on every write.
  - `server/models/plugins/slug.js`: our slug plugin (replaced monguurl; keeps its rules).
  - Passwords: scrypt (`server/utilities/encryption.js`); old SHA1 hashes upgrade on login. Reset with `node scripts/set-password.js <user> [--create-admin]` (interactive prompt; on Heroku `heroku run node scripts/set-password.js marco`).
- **Pages:** `/art` renders its own template (`server/views/index-art.ejs`, its own CSS `public/css/art-page.css`); everything else renders `index-react.ejs`. Asset URLs in templates use `<%= asset('/dist/bundle.js') %>` (versioned `?v=hash` in production).
- **Notifications:** `notify("Post saved")` or `notify.error(...)` from `components/notify/notify`, rendered by `<Notifications />` in `App.js` (holo pills at the bottom; replaces react-toastify). `appActions` save and delete actions reject on failure (`orFail`), so forms show their errors.

## Commands

- `npm run start-server`: webpack watch + nodemon on :4030 (uses `.env.local` = live DB!).
- `npx webpack --mode development` / `--mode production`.
- Local preview has usually been run as `node server.js` (port 4030).

## Design system ("holo")

Futuristic, dark, light-drawn UI. Reuse these; new pages should look like they belong.

- **Colours:**
  - black `#010207`;
  - cyan `#00bff3`;
  - holo / light cyan `#6ff5ee`;
  - text `#ccd4de`, muted `#788b94`, dim `#4e5f76`;
  - error `#ff6b86`.

  CSS variables come from `.holo-ui` in `src/components/holo/holo.css` (`--holo-cyan`, `--holo-light`, `--holo-muted`, `--holo-dim`, `--holo-font`, `--holo-display`).
- **Type:**
  - **Orbitron** for display text: titles, numbers, labels. Load it on demand with `loadOrbitron()` from `components/fonts/loadOrbitron`.
  - Body text is the DINWeb / Lucida Grande / Verdana stack. The DIN files aren't actually loaded, so it falls back.
  - Small labels: 9–11px, uppercase, wide letter-spacing (0.2–0.4em).
- **HUD corner brackets:** `HoloPanel` (`components/holo/HoloPanel.js`) is a pane of dark glass with scan lines and 4 corner brackets (`.holo-corner`). Use it for cards, modals and forms.
- **Buttons:** `.holo-button` (glowing outline), `.is-quiet`, `.is-small`, `.is-danger`, `.is-busy`. Pills are round-ended (`border-radius: 999px`).
- **Page chrome:**
  - top-left back link "‹ Marco Lavielle" (muted, uppercase, letter-spaced, goes to `/`);
  - top-right page name in Orbitron with a cyan glow (e.g. "Thoughts");
  - kicker (small cyan label) above titles;
  - two-tone statements (white point, dimmer rest).
- **Motion:**
  - drag to rotate, plus phone tilt via `useDeviceTilt` (`components/motion/useDeviceTilt.js`), which works from the phone's orientation as a quaternion.
  - On iPhones, show the pill **"Tap, then move your phone"** (phone icon wobbling). On denial, show **"Motion blocked in Safari settings"**.
  - Respect `prefers-reduced-motion`. Text that must be read never moves.
- **Phones:** `.mobile` / `.desktop` classes are set on `<html>` and `<body>` by width (< 812px) in `App.js`. Legacy `public/css/site.css` gives `.mobile body` a 3D perspective, which breaks `position: fixed`. Pages with fixed UI turn it off via an html class (`software-html`, `entry-html`, `journal-html`, `home-v1`).
- **Platform:** `HoloPlatform` is the glowing disc under the homepage cube and the sign-in form.

## Pages (what Marco has approved; don't undo without asking)

- **Home (`/`, V2):** a Rubik's cube of light (`src/pages/Home/RubikCube.js`). Centre squares are links (Software, Paintings, Thoughts, About, Game, GitHub). Each face shows a line-art hologram (`HoloArt.js`). It tumbles, can be dragged, and follows phone tilt (capped at 30°). Picking a face whirls, flattens and shrinks to a dot, then navigates. Marco prefers the original cube start (no intro animation). He rejected redesigns of the Paintings and About holograms, so keep them as they are. There's a colour toggle and a V1/V2 toggle.
- **V1 (`/v1`):** the old homepage, black background, kept as is.
- **Software (`/software`):**
  - an Earth that forms from a point of light, then a black hole, then the Earth, with a gold arc from **Mexico** (dot on Mexico City) to Sydney;
  - an experience timeline (data in `src/pages/Software/experience.js`): site screenshots in `public/images/software/` (1200px plus `-640` for phones), joined by a path drawn as you scroll (centred on phones), with a details modal per role;
  - Education, Languages and Tech at the end.
- **Art (`/art`):** its own template. Paintings float on a holo pedestal with a colour spill. The list is in `src/reducers/appReducer.js` (15 paintings; each has a `-960` phone copy). It has its own brush-script name and menu.
- **Thoughts (`/journal`):** a star-chart globe with the social channels as callouts, HUD readouts with live counters, and an entry log. **Entries (`/journal/:slug`):** readable glass panel, a small globe header, a reading-progress bar, no social links.
- **About (`/about`):** body hologram plus contact details. Marco wants the header left as it is (he rejected a redesign).
- **Game (`/game`):** space theme (three.js + cannon-es, `src/pages/Game/engine/`):
  - a flying saucer with an alien pilot, on the same raycast-vehicle physics as the old car;
  - planets you can slingshot round (each named), a sun that throws you back, and a black hole (`blackHole.js`) that swallows you and spits you out at the far corner;
  - games: a satellite swarm (comet), a ring course to fly in order, a wormhole arena, and launch pads;
  - your name (MARCO / LAVIELLE) can be knocked over;
  - the HUD (crystals, time, **warp** instead of km/h) uses the holo style, with a "‹ Marco Lavielle" back link.

  Palette: cyan base plus magenta, violet, amber, lime and coral accents (`engine/materials.js`). A dev hook (`window.__carGame`) exists outside production for tests.
- **Sign in (`/signin`):** 3D layered form leaning toward the mouse on desktop. On touch screens it's flat; a motion pill enables tilt after permission, and it stays still while typing.
- **Admin (`/admin/...`):** holo dashboard, post editor (built-in rich-text editor), client editor, two-click delete.

## Navigation gotcha

Animated exits (cube, Journal) use `components/navigation/navigateAfter.js`: `pushState` inside the click, then a `popstate` makes the router show the page when the animation ends. This keeps Back working in Safari, and Safari stops painting while a real load is in flight. `/art` has its own template, so it is loaded with `location.reload()` at the end instead. Pages must remove any `<html>` or `<body>` classes they add when they unmount (in-app navigation).

## Hosting, caching, resilience

- One **Heroku Basic** dyno (512 MB; Basic can't scale past 1). No add-ons. MongoDB Atlas holds the data.
- **Cloudflare** is in front, with the proxy on (orange cloud). Heroku's automatic certificates are disabled, so don't turn the proxy off without `heroku certs:auto:enable` first.
- **Caching (production only):**
  - versioned assets (`?v=`) are immutable for a year;
  - images, fonts and icons are kept for a week (with stale-while-revalidate and stale-if-error);
  - other static files for 5 minutes;
  - HTML pages `s-maxage=60` with stale-if-error for a day (Cloudflare only caches HTML if a Cache Rule makes it eligible);
  - the API is not cached by browsers or Cloudflare, but the server caches reads for 60 s.
- Sessions use the default MemoryStore, so everyone is signed out on each restart (daily, and on deploy).
- Favicon (`public/favicon.ico`, `.svg`, and the app icons) is a translucent glass cube. The social card is `public/images/social/marcolavielle.jpg` (1200×630), with Open Graph and Twitter meta in both templates.

## Testing habits

- Puppeteer (Chrome) and Playwright WebKit (iPhone profile) scripts in a scratch folder. Take screenshots and look at them.
- For refactors, compare before and after (pixel diffs of pages; an API contract run against an in-memory DB).
- For motion, simulate `DeviceOrientationEvent` (and `requestPermission`) in WebKit.
- Say plainly what wasn't tested: real iPhone, Safari, live admin saves.
