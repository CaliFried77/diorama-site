# Güvenlik modeli

Diorama is designed as a same-origin, local-first application. Browser features do not call arbitrary RSS publishers directly; RSS retrieval is handled by the Cloudflare Worker.

## Static response headers

The root `_headers` file is copied into `dist/` and applied by Cloudflare Static Assets. It defines the Content Security Policy and browser security headers for static files. Worker-generated API responses are separate responses, so `cloudflare/worker.mjs` applies their security headers directly.

The static CSP uses `default-src 'none'` and explicitly allows only same-origin application scripts, styles, fonts, images and the three Open-Meteo API hosts used for weather, city lookup and air quality. Inline scripts are not allowed. Existing interface effects write element style properties, so `style-src 'unsafe-inline'` remains necessary until those style updates are moved to classes or CSS custom properties.

Static and Worker API responses also send HSTS (`max-age=31536000`, without `includeSubDomains` or `preload`), `Cross-Origin-Resource-Policy: same-origin`, and `Cross-Origin-Opener-Policy: same-origin`. HSTS is limited to this exact workers.dev hostname; it does not opt other workers.dev subdomains into HSTS. Camera, microphone and geolocation access remain denied by Permissions Policy.

## RSS and request validation

- Built-in news endpoints accept only source IDs present in the selected category in `config/news-feeds.js`.
- Custom feed URLs are accepted only as HTTPS URLs on the default port, with no credentials, literal IP address, or local/reserved hostname suffix.
- Custom feed requests require a matching `Origin` header or `Sec-Fetch-Site: same-origin`; requests with no browser-origin metadata are rejected. They also require JSON content type and a streamed request body no larger than 4 KB. This is a CSRF/abuse barrier, not user authentication.
- The RSS transport follows redirects manually and validates every destination before making the next request.
- Built-in feed responses are bounded to 1 MB and user-supplied custom feeds to 256 KiB; the parser returns at most 12 articles and requests have an abort timeout.
- Cloudflare's `global_fetch_strictly_public` compatibility behavior is enabled for Worker outbound fetches. This is a platform routing setting, not a substitute for application-level URL validation.
- The Worker applies separate IP-keyed rate-limit bindings to built-in and custom RSS APIs. Cloudflare rate-limit decisions are approximate and local to Cloudflare locations; they are an abuse-control layer, not authentication.

Cloudflare's public-network fetch behavior and runtime restrictions should be rechecked when the compatibility date or transport changes. This implementation does not use the Netlify implementation's DNS-to-IPv4 pinning method; do not describe it as DNS-pinned protection.

## Static asset routing

Workers Static Assets uses `not_found_handling = "none"`. This app has a single root entry and no client-side page router, so unknown paths should remain real 404 responses instead of silently returning the home page with status 200. This also prevents missing files from being mistaken for valid application assets.

## Caching

Built-in category responses may be cached at the Cloudflare edge for four minutes when at least one configured source succeeds. A forced refresh bypasses that cache. Custom feed responses use `private, no-store` and are never added to the shared cache.

## Browser data

Tasks, notes, shortcuts, calendar events, preferences, saved articles and source configuration are stored locally in the browser. The air-quality card displays Open-Meteo's CAMS model forecast, not a measurement from a nearby physical sensor. Backups may contain personal notes; keep exported JSON files private and inspect them before sharing.

## Maintenance rules

1. Do not add secrets or API keys to browser-delivered code.
2. Keep custom feed URLs in POST request bodies, not query strings or logs.
3. Keep allowlists and input limits close to the server handler.
4. Validate redirects individually; never enable automatic redirect following for user-provided URLs.
5. Apply response security headers to every new Worker-generated route.
6. Review Cloudflare platform limits and rate-limit accuracy before changing production traffic.
