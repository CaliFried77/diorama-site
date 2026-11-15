# Living Pixel Diorama

**Current development line:** `2.0.0-dev.1`  
**Hosting/runtime target:** Cloudflare Workers Static Assets + Worker API  
**Application license:** MIT. Bundled fonts retain their individual SIL Open Font License 1.1 notices.

Diorama is a local-first personal new-tab experience with living pixel-art habitats, weather, multi-source news, a focus timer, notes, tasks and shortcuts.

## Project structure

- `index.html` — application markup and native ES-module entrypoint
- `js/` — browser features, state and rendering
- `css/` — hand-authored styles and generated utility stylesheet
- `config/` — habitat and news-source catalogs
- `server/` — platform-independent RSS parser and API handlers
- `cloudflare/` — Worker entrypoint and Cloudflare RSS transport
- `sw.template.js` — source template for the generated offline Service Worker
- `build.mjs` — creates the deployable `dist/` directory and app-shell fingerprint
- `wrangler.toml` — Worker, Static Assets and rate-limit bindings
- `docs/` — current architecture, security, quality and feature-extension guides

## Run locally

Node.js 22 or newer is required.

```bash
npm run dev
```

Wrangler `4.162.0` is pinned in the project scripts. The first run downloads that exact CLI version through `npx`; local and CI builds therefore use the same Worker toolchain.

## Validate and build

```bash
npm run check
npm test
npm run security
npm run build
```

The generated site is written to `dist/`. The Worker is bundled by Wrangler; do not publish `dist/` to a static-only host because the news APIs need the Worker runtime.

For a local Cloudflare bundle check without publishing:

```bash
npm run deploy:dry-run
```

For a real deployment, use `npm run deploy` only after the branch, account bindings and preview checks have been confirmed.

## Architecture principles

- Browser code does not import hosting-platform modules.
- Shared RSS parsing, URL validation and API request validation live in `server/`.
- Runtime-specific network transport and routing live in `cloudflare/`.
- RSS requests accept only HTTPS hostnames, reject literal IP and reserved/local hostnames, validate every redirect manually, cap response size and use request timeouts.
- Built-in feed IDs are allowlisted by category; arbitrary source IDs are rejected.
- Custom RSS URLs are sent in a bounded same-origin POST body, never in the query string.
- API rate-limit bindings are separate for built-in and custom RSS routes.
- The Worker caches successful built-in category results; custom feed results are private and not cached.
- Local user data remains in browser storage. JSON backup and restore are available in the Data Manager.

## Deployment strategy

The Cloudflare migration is developed on the dedicated Git branch `migration/cloudflare-pages`. Keep `main` separate. Netlify is an archived fallback and is not part of this development branch.

The Worker name is `diorama-cloudflare`. Its static assets come from `dist/`; only `/api/*` is routed through Worker code. The Wrangler CLI is pinned to `4.162.0` for repeatable builds. The GitHub Actions workflow runs syntax/import checks, unit tests, the security audit, a Wrangler dry-run on the migration branch, and Chromium/Firefox browser smoke tests.

See:

- [Cloudflare deployment guide](docs/DEPLOY_CLOUDFLARE_TR.md)
- [Architecture overview](docs/ARCHITECTURE.md)
- [Security model](docs/SECURITY.md)
- [Quality checklist](docs/QA_CHECKLIST.md)
- [Adding news sources](docs/ADDING_NEWS_SOURCES.md)
- [Adding habitats](docs/ADDING_HABITATS.md)

## Local CSS, fonts and offline behavior

Tailwind's CDN runtime is not used. `scripts/build-css.mjs` scans the markup and JavaScript templates and emits only the utility classes used by Diorama. Fonts are self-hosted in `fonts/`, with their license notices in `licenses/fonts/`.

The build copies the static app, generates module-preload hints and creates `dist/sw.js` from the current asset list. The cache name combines the package version and a SHA-256 fingerprint, so changed assets receive a fresh offline shell. The source tree's generated legacy root `sw.js` is intentionally not kept.

## License

The application source is MIT licensed. Font binaries are third-party assets and are not relicensed under MIT; their upstream OFL notices are included in `licenses/fonts/` and summarized in `THIRD_PARTY_NOTICES.md`.
