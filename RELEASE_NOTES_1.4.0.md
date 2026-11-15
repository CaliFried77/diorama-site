# Diorama 1.4.0 — kalite, güvenlik ve genişletilebilirlik

## Bu sürümde

- Yerel Tailwind-uyumlu utility CSS üretimi; CDN çalışma zamanı bağımlılığı kaldırıldı.
- Native ES Module mimarisi ve döngüsüz import grafiği korunup kontrol edildi.
- HTTP(S) URL normalizasyonu; şema, kimlik bilgisi ve uzunluk doğrulaması.
- Kaydedilmiş kısayollar, görevler, notlar ve JSON yedekleri için giriş doğrulaması.
- Kategori başına birden fazla RSS kaynağı tanımlayabilen haber kataloğu.
- Habitatları sahne, canlı, etkileşim ve hava profillerine ayıran katalog.
- CSP ve statik hosting güvenlik başlıkları; Netlify proje yapılandırması kaynak kökünde, `_headers` ise yayın paketinde tutulur.
- Service Worker cache sürümü 1.4.0.
- İsteğe bağlı `?debug=perf` FPS/çizim/cam maliyeti göstergesi.
- Node tabanlı kalite ve güvenlik testleri.
- GitHub Actions üzerinde Chromium, Firefox ve WebKit için Playwright smoke testi.
- Haber kaynağı ve habitat ekleme dokümantasyonu.

## Yerel doğrulama

Bu teslim oluşturulurken:

- `npm run check` başarılı.
- `npm test`: 17/17 başarılı.
- `npm run security` başarılı.
- `npm run build` başarılı.
- Playwright smoke test scripti Python sözdizimi kontrolünden geçti.

Tarayıcı motoru testleri bu çalışma ortamında yönetici politikası nedeniyle çalıştırılamadı. GitHub Actions workflow'una eklendi; kaynak projeyi GitHub'a gönderdiğinde çalışacaktır. Gerçek cihaz testi ve Lighthouse incelemesi hâlâ yayın öncesi manuel kontrol gerektirir.

## Genişletme noktaları

- Haber kaynakları: `config/news-feeds.js` — yönergeler `docs/ADDING_NEWS_SOURCES.md` içinde.
- Habitat kataloğu: `config/habitat-catalog.js` — yönergeler `docs/ADDING_HABITATS.md` içinde.

Yeni habitatın mevcut sahne/canlı profillerini kullanması yalnızca katalog girdisi gerektirir. Tamamen yeni bir tür veya ekosistem için renderer ve canlı sınıfı kodu da eklenmelidir.
