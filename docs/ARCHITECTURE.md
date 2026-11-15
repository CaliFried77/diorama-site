# Mimari ve geliştirme sınırları

## Katmanlar

```text
Browser (index.html, js/, css/, config/)
        |
        | same-origin /api/*
        v
Cloudflare Worker (cloudflare/worker.mjs)
        |
        +-- server/news-handler.mjs
        +-- server/custom-news-handler.mjs
        +-- cloudflare/rss-fetch.mjs
                   |
                   v
             server/rss-parser.mjs

Static files -> Cloudflare Workers Static Assets (dist/)
Offline shell -> generated dist/sw.js from sw.template.js
```

## Sorumluluklar

- `js/`: browser-only UI and local state. No hosting-provider imports.
- `config/`: data-only habitat and news publisher catalog.
- `server/`: Request/Response API contracts, RSS XML parsing and URL validation. Keep this layer runtime-neutral; avoid Node-only APIs.
- `cloudflare/`: Cloudflare-specific fetch transport, Worker routing, cache and rate-limit bindings.
- `scripts/`: deterministic CSS, build, dependency-graph and security checks.
- `tests/`: pure unit tests first, then Worker adapter and browser smoke tests.

## Change rules

1. Prefer one responsibility per module; keep runtime adapters small.
2. Keep browser APIs separate from Worker runtime APIs.
3. Inject outbound-fetch functions into shared server handlers so behavior can be tested without the network.
4. Treat every RSS publisher response and user-provided URL as untrusted input.
5. Never enable automatic redirects for custom feeds.
6. Cache only validated successful built-in feed responses; keep custom feed responses private.
7. Update tests and this documentation when API contracts or platform bindings change.
8. Run the full quality gate before preview deployment.
9. Keep the Cloudflare migration on `migration/cloudflare-pages`; do not merge into `main` until preview validation and explicit release approval.
