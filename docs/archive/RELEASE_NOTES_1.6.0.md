# Diorama v1.6.0 — First-party RSS API

## Highlights

- Replaced the browser-side RSS2JSON dependency for built-in and custom sources with same-origin Netlify Functions.
- Added a category batch endpoint at `/api/news`; it accepts only category-scoped, allowlisted built-in source IDs.
- Added POST `/api/custom-news` for user-added public HTTPS feeds; feed URLs stay out of query strings and CDN caches.
- Implemented RSS 2.0 and Atom parsing without third-party runtime packages.
- Added DNS resolution checks, pinned public IPv4 requests, TLS hostname verification, redirect revalidation, 9-second built-in and 6.5-second custom feed timeouts, 1 MB feed-response limit, and 3-redirect maximum.
- Added IP-based function rate limits and Netlify CDN caching for built-in category responses. Forced refresh and custom feeds are not shared-cached.
- Removed `api.rss2json.com` from browser CSP and front-end code.
- Added deterministic API/parser/security tests and integrated Netlify functions into syntax/import/security checks.

## Deployment

This release requires Netlify Functions. Deploy the source project through Netlify using `netlify.toml` and the configured `netlify/functions` directory. For local development use `npm run dev` (`npx netlify-cli dev`). Uploading only the static `dist/` directory to a static-only host will not provide the `/api/*` endpoints.

## Important behavior

- Built-in sources are selected by server-side source IDs from `config/news-feeds.js`; the browser cannot ask the server to fetch an arbitrary URL through `/api/news`.
- User-added feeds are fetched by `/api/custom-news`, which accepts only public HTTPS hostnames, resolves and pins a public IPv4 address, checks redirects again, and does not follow redirects into local/private networks.
- Custom sources are browser-cached locally; their API response is private and `no-store`. Built-in category responses use Netlify durable CDN caching for four minutes with stale-while-revalidate.
- RSS feeds remain third-party publisher content and may be unavailable or malformed. The API reports per-source failures and does not fabricate headlines.
