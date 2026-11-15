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

Wrangler `4.162.0` proje komutlarında sabitlenmiştir; ilk çalıştırmada `npx` bu sürümü indirir. Yerel Worker / Static Assets ortamı `wrangler.toml` dosyasındaki yapılandırmayı kullanır.

## GitHub bağlantısı ve güvenli önizleme

1. Cloudflare Dashboard'da **Workers & Pages → Create application → GitHub** yoluyla depoyu bağla ve GitHub erişimini onayla.
2. Depo: `CaliFried77/diorama-site`; proje kök dizini: `/`.
3. Worker adı `diorama-cloudflare` olmalı; `wrangler.toml` dosyasını kaynak yapılandırma olarak kullan.
4. **Settings → Build → Branch control** altında bu ayrı test Worker'ının izlenen/production dalını `migration/cloudflare-pages` olarak ayarla. `main` dalını seçme; o dal eski Netlify sürümünü koruyor.
5. Build command: `npm run build`. Deploy command: `npx --yes wrangler@4.162.0 deploy`.
6. İlk yayında yalnızca bu yeni Worker'ın `workers.dev` adresini etkin bırak. Özel domain ekleme, DNS kayıtlarını veya `diorama77.netlify.app` adresini değiştirme.
7. Cloudflare önizlemesi hazır olduğunda gerçek RSS uç noktalarını, güvenlik başlıklarını, rate-limit binding'lerini, cache davranışını ve Firefox/Chromium kullanımını test et.
8. Bu kontroller bitmeden `main` dalına merge veya gerçek kullanıcı domain'ine geçiş yapma.

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

`wrangler` komutları `4.162.0` sürümünü kullanır. CI'daki dry-run, gerçek dağıtım yapmadan Worker bundle ve yapılandırmasını doğrular.

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
