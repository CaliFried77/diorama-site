# Diorama proje durumu ve teknik denetim — v1.6.6

**Tarih:** 15 Kasım 2026  
**İncelenen kaynak:** `CaliFried77/diorama-site` GitHub `main` ve kullanıcının yüklediği v1.6.5 proje paketi.  
**Sonuç:** Kaynak kod v1.6.5 olarak doğrulandı; bu bakım paketi v1.6.6 olarak hazırlandı. Canlı Netlify dağıtımı bu denetim oturumunda uzaktan doğrulanamadı.

## Kaynak ve sürüm doğrulaması

- GitHub `main` dalındaki `package.json` sürümü `1.6.5` idi.
- GitHub'daki `index.html`, `package.json`, `build.mjs`, `sw.template.js`, `_headers`, `LICENSE`, `THIRD_PARTY_NOTICES.md` ve seçili CSS/JS dosyaları önceki v1.6.5 proje paketiyle eşleşti.
- GitHub deposunda MIT lisansı ve dokuz yerel WOFF2 font dosyası bulunuyordu.
- GitHub `main` dalında `.github/workflows/quality.yml` bulunmuyordu. README'de kalite iş akışından bahsedilmesine rağmen GitHub Actions çalıştırma geçmişi boştu.

## Düzeltilen bulgular

1. **GitHub CI iş akışı eksikti.** `.github/workflows/quality.yml` yeniden eklendi. Push, pull request ve manuel başlatmada Node 22 kontrol/test/güvenlik işleri; ardından Chromium, Firefox ve WebKit Playwright smoke testleri çalışacak.
2. **Yayınlanan font lisansları eksikti.** v1.6.5'te font lisansları kaynak ağacındaydı, fakat build bunları `dist/` içine taşımıyordu. v1.6.6 build'i `LICENSE`, `THIRD_PARTY_NOTICES.md` ve dört OFL lisans dosyasını `dist/` içine kopyalar. Data Manager'da lisans bağlantıları bulunur; Service Worker bunları çevrimdışı önbelleğe alır.
3. **Eski yönergeler güncel değildi.** Netlify dağıtım rehberi v1.6.6'ya göre yenilendi; 1.6.4 ve 1.6.5 geçiş notları arşivlendi; güncel geçiş rehberi eklendi.
4. **Gizli klasörün atlanması riski vardı.** Geçiş rehberi `.github` klasörünün de GitHub'a yüklenmesi gerektiğini açıkça vurgular.
5. **Kod temizliği:** Kullanılmayan iki katalog getter export'u ve yalnızca iç modülde kullanılan yardımcı fonksiyonun export niteliği kaldırıldı. RSS User-Agent sürüm bilgisi güncellendi.
6. **Browser smoke harness:** Netlify `_headers` dosyasını test sunucusunda uygularken yol eşleşmesi düzeltilip yerel fontların yüklenmesi, lisans bağlantıları, duyarlı ekran genişlikleri ve çevrimdışı shell kontrolleri eklendi.
7. **Repo hijyeni:** `.gitignore` yerel ortam dosyaları, tarayıcı test çıktıları ve kapsama raporlarını da dışarıda bırakır.

## Yerel doğrulama sonuçları

- `npm test`: **77/77 geçti**.
- `npm run test:news`: **28/28 geçti**.
- `npm run check`: **23 JavaScript modülü/fonksiyonu**, import yolları ve döngü kontrolü başarılı.
- `npm run security`: başarılı; inline event handler ve güvensiz script çalıştırma noktası bulunmadı; CSP ve yayın politikası kontrolleri geçti.
- `npm run build`: başarılı; uygulama shell'i 45 varlığı içerir.
- `python3 -m py_compile scripts/browser-smoke.py`: başarılı.
- Statik HTML kontrolü: 127 ID, yinelenen ID yok; yerel HTML referanslarında eksik dosya yok.
- Kaynak kod taraması: Google Fonts URL'si, TODO/FIXME veya `debugger` bulunmadı. Uygulama kodunda `console.log` yok; yalnızca build/check/security araçlarının sonuç bildirimi var.
- Ardışık iki build'de `dist/sw.js` SHA-256 özeti aynı çıktı.
- `dist/` içine 9 WOFF2 dosyası, MIT bildirimi ve dört OFL lisansı kopyalandı.

## Tamamlanamayan doğrulamalar

- Netlify canlı URL bu oturumda web erişim kısıtı nedeniyle açılmadı; v1.6.6'nın canlıya dağıtıldığı iddia edilmiyor.
- Playwright tarayıcı paketleri bu çalışma ortamında kullanılamadı. Gerçek tarayıcı smoke testi yerelde tamamlanmadı; yeni GitHub Actions iş akışı bu testleri GitHub'a yüklendikten sonra çalıştıracak.
- Lighthouse/Core Web Vitals, axe/WCAG otomatik taraması, gerçek cihaz/ekran okuyucu ve uzun süreli düşük donanım canvas performansı ölçülmedi.

## Açık teknik riskler ve öneriler

### Öncelikli

- GitHub'a v1.6.6 paketi gönderildikten sonra Actions sekmesinde hem `validate` hem `browser-smoke` işlerinin geçtiğini kontrol edin. Özellikle 320 px mobil genişlikte yatay taşma ve Service Worker offline testi önemlidir.
- Netlify'nin son Production deploy kaydında Build success, Publish directory `dist` ve iki Function'ın (`news`, `custom-news`) yayınlandığı doğrulanmalı.

### Sonraki mühendislik işleri

- RSS/Atom ayrıştırıcısı hâlâ regex tabanlıdır. Bozuk/alışılmadık XML'ler için bakımlı bir XML parser'a geçiş, dış varlık çözümlemesini kapatan güvenli yapılandırma ve bozuk XML testleriyle ayrı bir değişiklik olarak yapılmalı.
- Haber kaynağı bazında son başarılı güncelleme zamanı ve önbellekteki son iyi sonucun sunulması, geçici RSS sağlayıcı hatalarında kullanıcıya daha açıklayıcı deneyim sağlar.
- Erişilebilirlik için axe-core/WCAG otomatik taraması, klavyeyle tam görev akışı ve ekran okuyucu denemesi eklenmeli.
- Gerçek cihazlarda Lighthouse ve düşük güçlü cihaz canvas ölçümleri alınmalı; cam efekti ve animasyon maliyetleri ölçüme göre ayarlanmalı.
- Sosyal paylaşım için markalı `og:image`/Twitter kart görseli eklenebilir.
- İleride odak geçmişi, haftalık süre özeti ve habitat bazlı istatistikler eklenebilir. Çoklu cihaz senkronizasyonu ise kullanıcı hesabı ve sunucu tarafı veri saklama gerektirir; yerel uygulama basitliğini korumak adına ayrı bir ürün kararı olmalı.

## Dağıtım notu

Bu paket kaynak kodudur. `dist/` bilerek ZIP'e konmaz; Netlify build sırasında `npm run build` ile üretilmelidir. `.github` klasörü de mutlaka GitHub deposuna yüklenmelidir. Canlı siteye veya GitHub'a otomatik gönderim yapılmamıştır.
