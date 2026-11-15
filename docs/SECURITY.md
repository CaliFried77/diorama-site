# Güvenlik ve dağıtım

## HTTP güvenlik başlıkları

- `_headers` Cloudflare Pages / Netlify tarzı statik barındırmalarda kullanılır.
- `netlify.toml` Netlify için aynı politikayı build yapılandırmasıyla birlikte sağlar.
- Başka bir hosting kullanılıyorsa aynı başlıkları hosting paneline veya web sunucusuna aktar.

CSP, scriptleri yalnızca aynı origin'den kabul eder. JavaScript inline event handler kullanılmaz. CSS tarafında mevcut animasyonlar `element.style` kullandığından `style-src` içerisinde `'unsafe-inline'` geçici olarak gereklidir; bu, `script-src` için izin verilmiş değildir.

Haber istekleri aynı origin üzerindeki `/api/news` ve `/api/custom-news` Netlify Functions uç noktalarına gider. Haberleri tarayıcı adına üçüncü taraf bir dönüştürücü çekmez. Hava durumu için Open-Meteo bağlantılarına izin verilir. Yeni istemci tarafı servis eklendiğinde `connect-src` politikasını bilinçli olarak güncelle.

## Önemli notlar

- CSP'nin meta etiketi yerine HTTP yanıt başlığı olarak verilmesi gerekir; `_headers` veya hosting eşdeğerini dağıtıma dahil et.
- HTTPS kullan. Service Worker güvenli origin ister.
- Harici fontlar yalnızca isteğe bağlı tipografi iyileştirmesidir; çevrimdışı durumda sistem fontları kullanılır.
- Kullanıcı tarafından eklenen kısayollar yalnızca HTTP/HTTPS olabilir; URL kullanıcı bilgileri reddedilir.
- Kullanıcı tarafından eklenen RSS URL'leri yalnızca HTTPS ve herkese açık hostname olabilir. Sunucu DNS sonucunu doğrular, herkese açık IPv4'e sabitler, TLS hostname doğrulamasını korur ve her yönlendirmeyi yeniden denetler.
- Yerleşik haber API'si yalnızca `config/news-feeds.js` içindeki kategoriye ait source ID'lerini kabul eder; keyfi URL almaz.
- Yerleşik haber yanıtları Netlify CDN'de kısa süreli önbelleğe alınır. Özel feed yanıtları `private, no-store` döner. Function uç noktalarında IP bazlı oran sınırı vardır.
- İçe aktarılan JSON boyutu ve alanları doğrulanır; mevcut veriye yazmadan önce kapsam kontrolü yapılır.
- Yedekler hassas kişisel notlar içerebilir; güvenli yerde sakla ve paylaşmadan önce içeriğini kontrol et.
