# Kalite güvence kontrol listesi

Otomatik kontroller ile gerçek tarayıcı ve cihaz denemeleri birbirinin yerine geçmez. Yayından önce bu listeyi tamamla ve yapılamayan kontrolleri açıkça not et.

## Otomatik kalite kapısı

```bash
npm run check
npm test
npm run security
npm run build
npm run deploy:dry-run
```

GitHub Actions; Node.js modül/import kontrollerini, testleri, güvenlik denetimini, migration dalında Wrangler dry-run paketlemesini ve Chromium tarayıcı testlerini çalıştırır. Başarısız bir adım varsa dağıtım yapılmamalıdır.

## Tarayıcı ve işlev kontrolleri

- İlk açılışta saat, tarih, habitat ve arama alanı görünür.
- Altı habitatın her birine geçiş yapılır; tema, hava ve canlı davranışları tutarlıdır.
- Pencere yeniden boyutlandırıldığında canlılar kaybolmadan sahne uyarlanır.
- Haber kartları kompakt açılır; karta basınca özet görünür, ayrı kaynak düğmesi yayıncı sitesini yeni sekmede açar.
- Takvim aylar arasında gezinir; etkinlik ekleme/silme ve tarayıcı yenilemesinden sonra kalıcılık kontrol edilir.
- Özel RSS kaynağı ekleme, geçersiz URL ve erişilemeyen akış durumları denenir.
- Şehir araması, geçersiz şehir ve çevrimdışı hava durumu kontrol edilir.
- Hava kalitesi isteği başarılı olduğunda Avrupa AQI, PM2.5 ve PM10 görünür; servis başarısızsa hava tahmini çalışmaya devam eder.
- Pomodoro, ambiyans, görevler, notlar ve kısayollar kontrol edilir.
- JSON yedek alma ve geri yükleme; kaynak tercihleri, kaydedilmiş haberler ve takvim etkinlikleriyle birlikte test edilir.
- Açılır paneller Escape ile kapanır; klavye odağı doğru yere döner.
- 320, 360, 390, 430, 768, 1024 ve 1440 px genişlikler; dikey ve yatay yönler denenir.
- %200 yakınlaştırmada temel işlevler kullanılabilir.

## RSS ve Worker kontrolleri

- `GET /api/news?category=gundem`, `teknoloji` ve `bilim` geçerli yanıt döndürür.
- Kaynak seçimi yalnızca ilgili kategori allowlist'indeki kimlikleri kabul eder.
- `?refresh=1` ortak API önbelleğini atlar.
- `POST /api/custom-news` yalnızca aynı kaynaklı, JSON ve 4 KB altı isteği kabul eder.
- HTTP, IP literal, yerel hostname, kimlik bilgili URL, hatalı yönlendirme ve büyük RSS yanıtları reddedilir.
- Her iki rate-limit binding'i de bağımsız çalışır; bağlama eksikliği güvenli şekilde 503 verir.
- Worker yanıtları güvenlik başlıkları taşır; statik yanıtlar `_headers` politikası alır.
- API cache hit/miss, kısmi RSS kaynak hataları ve forced refresh kontrol edilir.
- Cloudflare CPU süresi, günlük istek sayısı ve cache hit oranı gerçek önizlemede ölçülür.

## Performans ve çevrimdışı

- `?debug=perf` ile FPS, çizim süresi ve destekleniyorsa JS heap değerlerini izle.
- Altı habitatı en az 30 saniye izleyerek FPS düşüşü, büyüyen heap veya yüksek cam maliyeti ara.
- Sekmeyi arka plana alıp geri dön; animasyon takılmadan devam etmeli.
- `prefers-reduced-motion` ve düşük güç/veri tasarrufu tercihlerini kontrol et.
- İlk çevrimiçi ziyaretin ardından Service Worker kurulur; ağ kesildiğinde arayüz, CSS, modüller, fontlar ve habitat açılır.
- Haber ve hava gibi canlı servisler çevrimdışı durumda hata veya önbellek durumunu dürüstçe gösterir.

## Tipografi ve okunabilirlik

- Yardımcı metin, tarih, kaynak etiketi ve durum bilgileri 13px altına düşmemeli.
- Küçük etiketler büyütüldüğünde dar ekranlarda taşma, üst üste binme ve kesilme kontrol edilmeli.
- Başlık, gövde metni ve meta bilgi arasındaki görsel hiyerarşi korunmalı.

## Görsel erişilebilirlik ve regresyon

- Klavye ile tüm ana akışlar kullanılabilir; odak göstergesi görünür.
- Ekran okuyucu ile habitat, düğme ve form durumları anlaşılır.
- Lighthouse / PageSpeed raporlarını mobil ve masaüstü ayrı al.
- Ekran görüntülerini aynı viewport, tema, habitat ve veri koşullarıyla karşılaştır.
