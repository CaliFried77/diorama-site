# Diorama v1.6.1 — RSS API hardening

## Changes

- Removed the custom RSS URL from the browser request query string; it is sent only in the same-origin POST body.
- Enforced the 4 KB custom-feed request-body limit while streaming the actual body, even when `Content-Length` is absent or incorrect.
- Required `Content-Type: application/json` for custom-feed requests.
- Kept private/no-store response behavior for custom feeds.
- Updated the service-worker cache version so clients refresh the app shell.
- Added regression tests for streamed-body limits and query-string privacy.

## Verification

- `npm run check` — passed (21 modules/functions, imports, cycles and syntax).
- `npm test` — passed (46 tests).
- `npm run security` — passed.
- `npm run build` — passed.
- Real Chromium/Firefox/WebKit smoke tests were not run in this environment because the browser binaries are unavailable.

## Deployment

Deploy the complete source project with Netlify Git integration or Netlify CLI. The static `dist/` folder alone does not contain the serverless `/api/news` and `/api/custom-news` handlers.
