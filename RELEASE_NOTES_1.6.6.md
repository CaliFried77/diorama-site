# Diorama v1.6.6 — Dağıtım ve kalite kapısı düzeltmeleri

## Doğrulama bulguları
- GitHub `main` dalında v1.6.5 sürümünün kaynak dosyaları yerel sürüm paketiyle eşleşiyordu.
- GitHub deposunda `.github/workflows/quality.yml` bulunmadığı için README'de anlatılan otomatik CI ve tarayıcı testleri çalışmıyordu. Workflow yeniden eklendi.
- Fontların OFL lisans metinleri kaynak repoda bulunmasına rağmen `dist/` içine kopyalanmıyordu. Build artık MIT ve üçüncü taraf font lisanslarını yayın çıktısına ekliyor.

## Güncellemeler
- Data Manager paneline MIT ve font lisansları için görünür bağlantılar eklendi.
- Service Worker, `.md`, `.txt` ve uzantısız `LICENSE` dosyalarını çevrimdışı sunabiliyor.
- GitHub Actions kalite iş akışı en az yetkiyle (`contents: read`) çalışıyor; test, güvenlik, build ve Chromium/Firefox/WebKit smoke testleri yapıyor.
- Tarayıcı smoke testi yerel fontların yüklendiğini ve lisans bağlantılarının göründüğünü kontrol ediyor.
- Netlify dağıtım yönergesi güncel sürüme taşındı; eski v1.6.4 geçiş belgesi arşive alındı.
- Kullanılmayan `getNewsCategory`, `getHabitatById` ve dışa aktarımı gerekmeyen `normalizeArticleUrl` API'leri kaldırıldı.

## Korunanlar
- MIT uygulama lisansı ve dört font ailesinin OFL 1.1 koşulları
- Yerel fontlar ve görünüm/typography
- Haber RSS API'si, SSRF korumaları, rate limit ve origin kontrolü
- Odak sayacı, habitat simülasyonu, veri yedekleme ve çevrimdışı uygulama kabuğu
