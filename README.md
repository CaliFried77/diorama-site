# Living Pixel Diorama — Native ES Module Architecture

This iteration converts the previous ordered classic-script layout into browser-native ES modules with explicit imports and exports.

## Structure

- `index.html` — application markup and one native module entrypoint
- `js/main.js` — application entrypoint
- `js/storage.js` — guarded local-storage and text helpers
- `js/services.js` — callback registration to invert cross-feature dependencies
- `js/scene-state.js` — shared background cache and invalidation
- `js/01-core-ui.js` — theme, clock, search, shortcuts and popovers
- `js/02-news.js` — RSS/news feed state and rendering
- `netlify/functions/news.mjs` — same-origin API for the built-in news publishers
- `netlify/functions/custom-news.mjs` — SSRF-hardened reader for user-added public HTTPS feeds
- `netlify/lib/rss-core.mjs` — RSS 2.0/Atom parser, DNS pinning, HTTPS fetch and feed validation
- `js/03-weather.js` — Open-Meteo integration and scene weather effects
- `js/04-focus-audio.js` — focus timer and Web Audio ambience
- `js/05-workspace.js` — tasks and notes
- `js/06-data-manager.js` — validated export/import and storage management
- `js/07-habitat-state.js` — canvas, habitat definitions and simulation state
- `js/08-creatures.js` — creature behavior, interaction and drawing
- `js/09-scenery.js` — environment, flora and scene rendering
- `js/10-glass-renderer.js` — optical glass and animation loop
- `css/base.css` — reset, typography and bespoke Diorama effects
- `css/utilities.css` — generated local utility classes (built from used HTML/JS classes)
- `css/responsive.css` — mobile and reduced-motion rules
- `sw.js` — offline app-shell cache

## Run locally

Use Netlify Dev for local development. It serves the static app and the first-party RSS API functions under the same origin. Native ES modules and the server functions are intentionally not loaded from `file://` URLs or a plain static HTTP server.

```bash
npm run dev
```

Open the local URL printed by Netlify CLI (usually `http://localhost:8888`).

## Checks, tests and build

```bash
npm run check
npm test
npm run build
```

The build output is written to `dist/`. Upload the contents of that folder to static hosting.

## Architecture notes

- Each feature file declares cross-file dependencies using named `import` and `export` statements.
- Shared storage helpers are centralized in `storage.js`.
- A small service registry in `services.js` breaks dependencies that would otherwise create cycles (weather preview refresh, data-manager stats refresh and habitat initialization after resize).
- Mutable state remains owned by the module that creates it. Other modules use explicit setter functions rather than assigning imported bindings.
- The dependency graph is checked for missing local imports and circular dependencies.

## Local CSS and offline behavior

- Tailwind's CDN runtime has been removed. `scripts/build-css.mjs` scans the existing markup and JavaScript templates and emits a project-scoped stylesheet containing only the utility classes used by this app. This is a small Tailwind-compatible utility compiler, not the upstream Tailwind CLI/package.
- `npm run build` regenerates `css/utilities.css` and copies the static app to `dist/`.
- Google Fonts are optional and loaded asynchronously for typography enhancement. The UI uses local system fallbacks when offline.
- `sw.js` precaches the HTML, local CSS and ES modules after the first successful visit over HTTPS or localhost. The core habitat and interface can then reopen offline. News and weather still need internet; their existing error/cache states handle loss of connectivity.
- Service-worker updates replace the previous app-shell cache when a new version is installed. Increase the cache version in `sw.js` when changing the app shell release.


## Deployment notes

- **For the first-party news API, deploy the full source project through Netlify Git integration or Netlify CLI.** `netlify.toml` points to `netlify/functions/` and publishes the generated `dist/` folder. Do not deploy only `dist/` if you expect `/api/news` and `/api/custom-news` to work.
- Service workers require HTTPS in production (localhost is allowed for development). Opening `index.html` with `file://` does not enable offline caching.
- The first successful visit must be online so the app shell can be cached. After that, the core interface and habitat can reopen offline; news and weather remain network-dependent.
- Optional Google Fonts may not load offline; local system fallbacks keep the interface usable.


## Quality and security

- `npm run security` checks the deployment CSP, inline handlers, dynamic-code execution sinks and removal of the RSS2JSON dependency.
- `npm run test:news` runs the dedicated RSS parser, SSRF policy and API contract tests.
- `netlify.toml` configures the serverless function directory and same-origin `/api/news` and `/api/custom-news` routes; the RSS backend therefore requires a Netlify Functions-capable deployment. A static-only host must provide an equivalent backend adapter.
- `.github/workflows/quality.yml` runs checks, tests, static security audit, build and Chromium/Firefox/WebKit browser smoke tests on pushes and pull requests. The browser job uploads viewport screenshots as artifacts.
- `_headers` is copied into `dist/` for static hosts that support it. `netlify.toml` stays at the source root for Netlify build deployments and is not copied into the ready-to-upload `dist/` package. Apply equivalent headers when using another host.
- `?debug=perf` enables a small local FPS/render-cost diagnostic overlay. Heap metrics appear only where the browser exposes them.
- `config/news-feeds.js` controls news categories and built-in multi-source feeds; user-added feeds and preferences are stored locally; version 1.6.1 replaces the browser-side RSS2JSON converter with the first-party same-origin Netlify API. Built-in feeds are fetched in one category request and cached at Netlify's CDN; custom feeds use a bounded HTTPS fetcher that rejects private/reserved IP destinations and manually validates redirects. The app uses BBC Türkçe, TRT Haber, Anadolu Ajansı, DW Türkçe, NTV, CNN Türk, Webrazzi, Webtekno, Technopat, ShiftDelete, DonanımHaber, Evrim Ağacı, TÜBİTAK and Arkeofili. Users can enable/disable sources, add public HTTPS RSS feeds, search headlines, filter unread/saved items and keep local read/bookmark state. See `docs/ADDING_NEWS_SOURCES.md`.
- `config/habitat-catalog.js` controls habitat palettes and reusable profiles; see `docs/ADDING_HABITATS.md`.
- Security and deployment caveats are documented in `docs/SECURITY.md`.

## Release QA checklist

Before deploying a release, follow [`docs/QA_CHECKLIST.md`](docs/QA_CHECKLIST.md) for cross-browser, responsive, performance, offline, security-header and visual-regression checks. The optional browser suite can be run locally after installing `requirements-browser.txt` and the Playwright browsers with `python -m playwright install chromium firefox webkit`, then `npm run build && python scripts/browser-smoke.py`. Automated tests do not replace manual checks on physical devices or Lighthouse reviews.


## v1.6.3 interface update

- News panel uses a compact single-column feed and a fully scrollable panel; category controls stay on one desktop row and become a complete three-column set on mobile.
- Focus timer is habitat-aware, supports custom durations from 1 to 180 minutes and resumes correctly after refresh using a persisted deadline.
- Active focus sessions move into a floating pixel-art HUD at the top center. Fixed widget labels use pixel typography; live headlines and user content remain in the regular reading font.
- Fixed widget labels use Pixelify/Silkscreen styling where appropriate; entered search terms, task names, focus goals and live news headlines remain in the regular reading font.
