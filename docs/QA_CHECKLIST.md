# Kalite güvence kontrol listesi

Otomatik kontroller ile gerçek cihaz/tarayıcı denemeleri birbirinin yerine geçmez. Bir sürümü yayınlamadan önce aşağıdaki listeyi tamamla ve gerçek ortamda yapılamayan adımları raporda açıkça belirt.

## Otomatik kalite kapısı

```bash
npm run check
npm test
npm run security
npm run build
```

GitHub Actions bu adımları her push ve pull request üzerinde çalıştırır. Ardından Playwright ile Chromium, Firefox ve WebKit motorlarında temel etkileşim, responsive genişlik ve Service Worker çevrimdışı kabuk testleri çalışır; ekran görüntüleri workflow artifact olarak saklanır. Başarısız bir adım varsa yayın paketi kullanılmamalıdır. Fiziksel iOS Safari/Android cihaz denemesi ve Lighthouse değerlendirmesi ayrıca yapılmalıdır.

## Tarayıcı uyumluluğu

Her büyük arayüz değişikliğinde güncel Chrome, Firefox ve Safari'de kontrol et:

- İlk açılışta saat, tarih, habitat ve ana arama görünür.
- Altı mevcut habitatın her birine geçiş yapılır; tema ve hava efektleri tutarlıdır.
- Pencere yeniden boyutlandırıldığında/yön değiştiğinde canlılar kaybolmadan sahne yeni ölçüye uyarlanır.
- Habitat seçimi ekran okuyucuya duyurulur ve aktif öğe erişilebilir seçili durumunu taşır.
- Manifest, SVG favicon ve 192/512 px uygulama ikonları doğru yüklenir.
- Gündem kategorileri ve haber bağlantıları açılır; kaynak hatası varsa durum mesajı gösterilir.
- Şehir araması, geçersiz şehir ve çevrimdışı hava durumu senaryoları denenir.
- Pomodoro başlatma/duraklatma/sıfırlama ve ses ambiyansı denenir.
- Görev/not ekleme, tamamlama, silme ve JSON yedek geri yükleme denenir.
- Açılır paneller Escape ile kapanır; klavye odağı mantıklı yere döner.
- 320, 360, 390, 430, 768, 1024 ve 1440 piksel genişlikler kontrol edilir.
- Dikey ve yatay ekran yönlerinde yatay sayfa taşması olmaz.
- Yakınlaştırma %200 iken temel işlevler kullanılabilir.

## Performans

- `?debug=perf` ile FPS, çizim süresi, cam güncelleme süresi ve destekleniyorsa JS heap değerlerini gözlemle.
- 6 habitatı en az 30 saniye izleyerek sürekli FPS düşüşü, büyüyen heap veya aşırı cam maliyeti ara.
- Sekmeyi arka plana alıp geri dön; animasyon takılmadan devam etmeli.
- `prefers-reduced-motion` ve düşük güç/veri tasarrufu tercihlerini kontrol et.
- Lighthouse / PageSpeed üzerinde Performance, Accessibility, Best Practices ve SEO raporlarını al. Mobil ve masaüstünü ayrı kaydet.

## Çevrimdışı ve dağıtım

- Uygulamayı HTTPS veya localhost üzerinden aç; `file://` Service Worker için uygun değildir.
- İlk çevrimiçi ziyaretten sonra Service Worker'ın kurulduğunu ve kontrolü devraldığını doğrula.
- Ağ bağlantısını kesip sayfayı yenile; yerel arayüz, CSS, modüller ve habitat açılmalı.
- Haber/hava gibi canlı servislerin çevrimdışında hata/önbellek durumunu dürüstçe göstermesini kontrol et.
- Dağıtım yanıtlarında `_headers` veya `netlify.toml` güvenlik başlıklarının gerçekten gönderildiğini doğrula. CSP ihlali konsol mesajlarını incele.
- Build tarafından üretilen Service Worker dosya listesini ve içerik hash'ini doğrula.
- Eski Service Worker cache'inin sürüm/asset hash yükseltmesinde silindiğini doğrula.

## Görsel regresyon

Aynı viewport, aynı tema, aynı habitat, aynı saat/ışık ve aynı veri koşullarıyla ekran görüntüsü al. Önceki sürümle karşılaştırırken piksel animasyonunun rastgele doğasından kaynaklanan farkları değil; yerleşim, kırpılma, kontrast, tipografi ve bileşen boyutlarını değerlendir.
