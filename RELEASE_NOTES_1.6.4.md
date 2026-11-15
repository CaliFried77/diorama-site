# Diorama v1.6.4 — Proje inceleme iyileştirmeleri

- Service Worker app-shell dosya listesi build sırasında `dist/` içinden otomatik üretilir. Cache anahtarı sürüm ve statik varlıkların SHA-256 özetiyle değişir; elle dosya listesi/sürüm tutma ihtiyacı kaldırıldı. Kurulumda HTTP cache atlanır; çevrimiçiyken statik dosyalar yeniden doğrulanarak indirilir, önbellek yalnızca çevrimdışı yedek olarak kullanılır.
- Tüm yerel ES modülleri build sırasında `modulepreload` ile önceden yüklenir; native ES module mimarisi korunur.
- Favicon, 192/512 px uygulama ikonları, manifest, açıklama, tema rengi ve Open Graph temel metaverileri eklendi.
- Küçük haber metinlerinin okunabilirliği ve kontrastı artırıldı.
- Habitat seçimi ekran okuyucu için canlı duyurulur; aktif sahne `aria-current` ve `aria-pressed` ile tanımlanır.
- Ekran boyutu değişirken habitat yeniden başlatılmaz; mevcut varlıkların konumları yeni tuvale ölçeklenir.
- Kare olasılığı/yumuşatma matematiği DOM'dan bağımsız saf fonksiyonlara taşındı ve test edildi.
- Özel RSS proxy'si tarayıcıdan gelen cross-origin POST çağrılarını reddeder.
- `.gitignore` ve GitHub Actions kalite iş akışı bu sürüm paketinde zaten bulunduğu için korunmuştur.

## Bilinçli olarak ertelenenler

- Gerçek XML parser eklenmesi: build ortamında npm kayıt defterine erişim olmadığı için yeni bağımlılık güvenli biçimde indirilemedi ve lockfile doğrulanamadı. Regex parser korunmuştur; bu madde ayrı bir bağımlılık/lockfile turunda tamamlanmalıdır.
- Google Fonts'un self-host edilmesi: font dosyaları projede mevcut değil; tasarımın tipografisini bozacak bir fallback değişikliği yapılmadı.
- LICENSE: proje sahibinin lisans tercihi alınmadan açık kaynak lisansı atanmadı.
- Cam efektinin gerçek düşük güçlü cihaz maliyeti ve Lighthouse ölçümleri: fiziksel cihaz/lab ölçümü gerektirir.
- Git geçmişinde `dist/` dosyalarının gerçekten tracked olup olmadığı ZIP içinde `.git` verisi bulunmadığından doğrulanamadı. `.gitignore` hâlihazırda `dist/` yolunu hariç tutar.
