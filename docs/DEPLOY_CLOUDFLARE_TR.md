# Diorama — Cloudflare geçişi

Bu dosya yalnızca \`migration/cloudflare-pages\` dalındaki Cloudflare taşıma çalışmasını açıklar.

## Güvenli ayrım

- \`main\` dalı ve Netlify projesi mevcut haliyle korunur.
- Netlify ayarları, DNS kayıtları ve \`diorama77.netlify.app\` adresi bu geçişin parçası değildir.
- Cloudflare için ayrı bir Worker adı kullanılır: \`diorama-cloudflare\`.
- Cloudflare'a bağlanırken üretim dalı olarak yalnızca \`migration/cloudflare-pages\` seçilmelidir. \`main\` seçilmemelidir.

## Mimari

Diorama'nın statik dosyaları mevcut \`npm run build\` komutuyla \`dist/\` içine üretilir. Cloudflare Workers Static Assets bu klasörü yayınlar. Worker kodu yalnızca şu iki API yolu için çalışır:

- \`GET /api/news\`
- \`POST /api/custom-news\`

API iş mantığı mevcut test edilmiş handler fabrikalarını kullanır. RSS HTTP taşıması Cloudflare Workers Fetch API'sine uyarlanmıştır. Her yönlendirme hedefi yeniden HTTPS olarak doğrulanır; \`global_fetch_strictly_public\` uyumluluk bayrağı da dış istekleri genel İnternet ile sınırlar. Netlify'ın DNS'e sabitleme yöntemi Cloudflare'da desteklenmeyen \`dns.lookup\` / \`https.request({ lookup })\` davranışına dayandığı için aynen taşınmaz.

Haber API'si için Cloudflare Cache API üzerinde 4 dakikalık kenar önbelleği vardır. \`?refresh=1\` isteği önbelleği atlar. Özel RSS ekleme uç noktası önbelleğe alınmaz.

İki API uç noktasının her biri IP başına yaklaşık 40 istek / 60 saniye hız sınırıyla ayrı ayrı korunur. Cloudflare Rate Limiting binding sayaçları veri merkezleri arasında yaklaşık/yerel çalışır; küresel olarak kesin bir sayaç değildir.

## Cloudflare Worker bağlantısı

Cloudflare hesabında proje oluşturulurken:

1. **Workers & Pages → Create application → GitHub** yolunu kullan.
2. \`CaliFried77/diorama-site\` deposunu bağla.
3. İzlenecek dal olarak \`migration/cloudflare-pages\` seç.
4. Kök dizini depo kökü olarak bırak.
5. Build komutunu \`npm run build\` yap.
6. \`wrangler.toml\` dosyasındaki Worker adı \`diorama-cloudflare\` ile Cloudflare projesinin adının aynı olduğundan emin ol.
7. Build ortamında Node.js 22 seç.
8. İlk dağıtımın yalnızca yeni Cloudflare Worker adresinde yapıldığını doğrula.

Cloudflare Workers Builds, GitHub'a bağlanmış Worker için commit'lerde otomatik build ve deploy çalıştırabilir. \`wrangler.toml\` içindeki \`main\`, \`assets\`, rate-limit binding'leri ve uyumluluk ayarları bu dağıtımın yapılandırmasıdır.

## Dağıtım öncesi kontrol listesi

- [ ] \`npm run check\`
- [ ] \`npm test\`
- [ ] \`npm run security\`
- [ ] Browser smoke testleri
- [ ] \`/api/news?category=gundem\` yanıtı
- [ ] \`/api/news?category=teknoloji\` yanıtı
- [ ] \`/api/news?category=bilim\` yanıtı
- [ ] \`/api/news?category=gundem&refresh=1\` önbelleği atlıyor
- [ ] \`POST /api/custom-news\` aynı-kaynak kontrolünü uyguluyor
- [ ] Hatalı RSS adresleri, yönlendirmeler ve büyük yanıtlar reddediliyor
- [ ] İki hız sınırı binding'i de çalışıyor
- [ ] Çevrimdışı mod ve Service Worker doğrulandı
- [ ] Firefox masaüstü ve mobil boyutlarda görsel kontrol yapıldı

## Ücretsiz katman notu

Workers Free için günlük istek ve istek başına CPU sınırları vardır. Statik dosyalar CDN üzerinden sunulur; Worker yalnızca \`/api/*\` rotalarında çalıştırılır. API yanıtının kenar önbelleği RSS ayrıştırma işini tekrar tekrar yapmayı azaltır. Gerçek RSS kaynakları ve CPU kullanımı yeni Worker preview adresinde doğrulanmadan Netlify yayını değiştirilmemelidir.
