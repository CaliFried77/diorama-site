# Living Pixel Diorama — Native ES Module Architecture

Current release: **v1.6.5** (MIT application source; third-party fonts retain their own OFL 1.1 notices).

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
- `sw.template.js` — build-time template for the generated, content-hashed offline app-shell cache
- `manifest.webmanifest` and `icons/` — install metadata and Diorama app icons

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
- A small service registry in `services.js` breaks dependencies that would otherwise create cycles (weather preview refresh and data-manager stats refresh). Scene resize is handled locally without reinitializing the habitat.
- Mutable state remains owned by the module that creates it. Other modules use explicit setter functions rather than assigning imported bindings.
- The dependency graph is checked for missing local imports and circular dependencies.

## Local CSS and offline behavior

- Tailwind's CDN runtime has been removed. `scripts/build-css.mjs` scans the existing markup and JavaScript templates and emits a project-scoped stylesheet containing only the utility classes used by this app. This is a small Tailwind-compatible utility compiler, not the upstream Tailwind CLI/package.
- `npm run build` regenerates `css/utilities.css`, copies the static app to `dist/`, adds module-preload hints, and generates the Service Worker asset list/cache key from the actual output files.
- Inter, JetBrains Mono, Pixelify Sans and Silkscreen are self-hosted as local WOFF2 assets in `fonts/`. Their `@font-face` declarations live in `css/base.css`; there are no Google Fonts requests or third-party font origins.
- The generated `dist/sw.js` precaches the HTML, local CSS, ES modules, fonts, manifest and icons after the first successful visit over HTTPS or localhost. The file list is discovered from `dist/`; the cache key combines the package version with a SHA-256 content fingerprint.
- Service-worker updates replace the previous app-shell cache when a new build is installed. There is no hand-maintained asset list or manual cache-version bump.


## Deployment notes

- **For the first-party news API, deploy the full source project through Netlify Git integration or Netlify CLI.** `netlify.toml` points to `netlify/functions/` and publishes the generated `dist/` folder. Do not deploy only `dist/` if you expect `/api/news` and `/api/custom-news` to work.
- Service workers require HTTPS in production (localhost is allowed for development). Opening `index.html` with `file://` does not enable offline caching.
- The first successful visit must be online so the app shell can be cached. After that, the core interface and habitat can reopen offline; news and weather remain network-dependent.
- Self-hosted WOFF2 fonts are part of the precached app shell, so typography remains consistent after a successful first online visit.


## Quality and security

- `npm run security` checks the deployment CSP, inline handlers, dynamic-code execution sinks, generated Service Worker strategy and removal of the RSS2JSON dependency.
- `npm run test:news` runs the dedicated RSS parser, SSRF policy and API contract tests.
- `netlify.toml` configures the serverless function directory and same-origin `/api/news` and `/api/custom-news` routes; the RSS backend therefore requires a Netlify Functions-capable deployment. A static-only host must provide an equivalent backend adapter.
- The application source code is licensed under MIT (`LICENSE`). Bundled font files are third-party assets and remain under their individual SIL Open Font License 1.1 notices in `licenses/fonts/`; see `THIRD_PARTY_NOTICES.md`.
- `.github/workflows/quality.yml` runs checks, tests, static security audit, build and Chromium/Firefox/WebKit browser smoke tests on pushes and pull requests. The browser job uploads viewport screenshots as artifacts. `.gitignore` excludes `dist/`, `node_modules/` and local artifacts; if `dist/` was already committed, remove it from the Git index once with `git rm -r --cached dist/` and commit that change.
- `_headers` is copied into `dist/` for static hosts that support it. `netlify.toml` stays at the source root for Netlify build deployments and is not copied into the ready-to-upload `dist/` package. Apply equivalent headers when using another host.
- `?debug=perf` enables a small local FPS/render-cost diagnostic overlay. Heap metrics appear only where the browser exposes them.
- `config/news-feeds.js` controls news categories and built-in multi-source feeds; user-added feeds and preferences are stored locally; version 1.6.1 replaces the browser-side RSS2JSON converter with the first-party same-origin Netlify API. Built-in feeds are fetched in one category request and cached at Netlify's CDN; custom feeds use a bounded HTTPS fetcher that rejects private/reserved IP destinations and manually validates redirects. The app uses BBC Türkçe, TRT Haber, Anadolu Ajansı, DW Türkçe, NTV, CNN Türk, Webrazzi, Webtekno, Technopat, ShiftDelete, DonanımHaber, Evrim Ağacı, TÜBİTAK and Arkeofili. Users can enable/disable sources, add public HTTPS RSS feeds, search headlines, filter unread/saved items and keep local read/bookmark state. See `docs/ADDING_NEWS_SOURCES.md`.
- `config/habitat-catalog.js` controls habitat palettes and reusable profiles; see `docs/ADDING_HABITATS.md`.
- Security and deployment caveats are documented in `docs/SECURITY.md`.

## Release QA checklist

Before deploying a release, follow [`docs/QA_CHECKLIST.md`](docs/QA_CHECKLIST.md) for cross-browser, responsive, performance, offline, security-header and visual-regression checks. See [`MIGRATION_1.6.5_TR.md`](MIGRATION_1.6.5_TR.md) for the GitHub/Netlify upload notes for the MIT and self-hosted-font release. The optional browser suite can be run locally after installing `requirements-browser.txt` and the Playwright browsers with `python -m playwright install chromium firefox webkit`, then `npm run build && python scripts/browser-smoke.py`. Automated tests do not replace manual checks on physical devices or Lighthouse reviews.


## v1.6.3 interface update

- News panel uses a compact single-column feed and a fully scrollable panel; category controls stay on one desktop row and become a complete three-column set on mobile.
- Focus timer is habitat-aware, supports custom durations from 1 to 180 minutes and resumes correctly after refresh using a persisted deadline.
- Active focus sessions move into a floating pixel-art HUD at the top center. Fixed widget labels use pixel typography; live headlines and user content remain in the regular reading font.
- Fixed widget labels use Pixelify/Silkscreen styling where appropriate; entered search terms, task names, focus goals and live news headlines remain in the regular reading font.


## v1.6.4 project review follow-up (historical)

- The package already contains `.github/workflows/quality.yml` and `.gitignore`; they are retained.
- The scene math is separated into pure, deterministic helpers; resize now scales live entity coordinates rather than rebuilding the habitat.
- The habitat name is announced via a polite live region and the active habitat menu item exposes `aria-current`.
- The custom RSS proxy rejects browser requests with a mismatched `Origin` and cross-site Fetch Metadata when no Origin is supplied. The IP rate limit and SSRF checks remain the primary server-side abuse controls; this is not user authentication.
- News metadata and small labels have been made more legible.
- An open-source license is intentionally not selected by the project maintainer yet. No license should be assumed; choose one before inviting external contributions.


## v1.6.5 licensing and self-hosted fonts

- The Diorama application source code is licensed under MIT. Third-party font files are excluded from the project MIT grant and retain their individual OFL 1.1 licenses.
- Inter (300/400/500/600), JetBrains Mono (400/500), Pixelify Sans (variable 400–700) and Silkscreen (400/700) are served from the local `fonts/` directory as WOFF2.
- Google Fonts preconnects and the asynchronous Google Fonts injection were removed. CSP now permits font and stylesheet resources only from the same origin (inline styles remain allowed for the existing UI).
- The build copies local font assets into `dist/`; the generated content-hashed Service Worker app shell includes them automatically for offline use.
- Full font license texts and upstream notices are stored under `licenses/fonts/` and summarized in `THIRD_PARTY_NOTICES.md`.
