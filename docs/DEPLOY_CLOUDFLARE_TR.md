# Diorama — Cloudflare Workers dağıtım rehberi

Bu dal yalnızca Cloudflare geçişi içindir: `migration/cloudflare-pages`. Mevcut `main` dalı ve Netlify sitesi bu çalışmanın dışında tutulur.

## Mimari

- Statik uygulama `npm run build` ile `dist/` içine üretilir.
- Cloudflare Workers Static Assets, `dist/` dosyalarını sunar.
- `cloudflare/worker.mjs` yalnızca `/api/*` isteklerini işler.
- Ortak RSS parser ve API handler'ları `server/` altındadır; Cloudflare'a özel ağ taşıması `cloudflare/rss-fetch.mjs` içindedir.
- `_headers`, statik dosyalara güvenlik başlıklarını uygular. Worker API yanıtları kendi başlıklarını doğrudan ekler.
- Uygulamanın offline shell Service Worker dosyası build sırasında `dist/sw.js` olarak üretilir.

## Yerel geliştirme

Node.js 22+:

```bash
npm install
npm run dev
```

Wrangler ilk çalıştırmada `npx` üzerinden indirilir. Yerel Worker / Static Assets ortamı `wrangler.toml` dosyasındaki yapılandırmayı kullanır.

## GitHub bağlantısı ve güvenli önizleme

1. Cloudflare Dashboard'da **Workers & Pages → Create → Worker** yoluyla GitHub deposunu bağla.
2. Depo: `CaliFried77/diorama-site`.
3. Üretim/izlenen dal olarak yalnızca `migration/cloudflare-pages` seç.
4. Build command: `npm run build`.
5. Worker entrypoint ve Static Assets ayarlarını `wrangler.toml` dosyasından kullan.
6. Worker adı `diorama-cloudflare` olarak kalmalı.
7. İlk yayın yalnızca yeni `workers.dev` önizleme adresine yapılmalı. Mevcut domain veya Netlify DNS kayıtları değiştirilmemeli.
8. RSS API, güvenlik başlıkları, rate-limit binding'leri, cache ve tarayıcı testleri doğrulanmadan gerçek kullanıcı trafiğine geçilmemeli.

## Rate-limit binding'leri

`wrangler.toml` iki ayrı binding tanımlar:

- `NEWS_RATE_LIMITER`: built-in category feed API
- `CUSTOM_NEWS_RATE_LIMITER`: user-provided feed API

Her biri 60 saniyede 40 birim olarak yapılandırılmıştır. Namespace kimlikleri Cloudflare hesabı içinde benzersiz olmalı. Cloudflare rate-limit kararları POP/lokasyon bazında yaklaşık çalışır; katı ve küresel bir kota gibi değerlendirilmemelidir.

## Kontroller

```bash
npm run check
npm test
npm run security
npm run build
npm run deploy:dry-run
```

Önizleme ortamında ayrıca şunları dene:

- `GET /api/news?category=gundem`
- `GET /api/news?category=teknoloji`
- `GET /api/news?category=bilim`
- `GET /api/news?category=gundem&refresh=1`
- `POST /api/custom-news` aynı kaynaklı ve hatalı Origin denemeleriyle
- büyük istek gövdesi, HTTP URL, literal IP, local hostname ve yönlendirme reddi
- 429 rate limit yanıtı ve eksik binding durumunda 503
- Firefox/Chromium, Service Worker ve çevrimdışı shell
- gerçek RSS yayıncılarının yanıtları ve Worker CPU süreleri

## Ücretsiz katman notu

Workers Free planı günlük 100.000 Worker isteği ve istek başına 10 ms CPU süresiyle sınırlar. Statik dosyalar Workers Static Assets üzerinden sunulur; Worker kodu yalnızca `/api/*` yollarında çalışır. RSS kaynaklarını paralel okumak ağ beklemesidir, ancak XML ayrıştırma CPU tüketir. Bu nedenle 14 kaynak kategorilerinin gerçek CPU süreleri preview'da ölçülmeden ücretsiz katmanda sorunsuz çalıştığı varsayılmamalıdır.

## Geri dönüş

Netlify'deki mevcut `main` deploy'u ve `diorama77.netlify.app` adresi değişmeden kalır. Cloudflare geçişi başarısız olursa kullanıcılar eski adrese dönebilir. Bu aşama tamamlanmadan `main` dalına merge veya Netlify ayar değişikliği yapılmaz.
