# Diorama 1.6.4 — GitHub / Netlify yükleme notları (eski sürüm)

> Not: Google Fonts self-hosting ve MIT lisansı bu eski nottan sonra v1.6.5 sürümünde tamamlandı. Güncel yükleme yönergesi için `MIGRATION_1.6.5_TR.md` dosyasını kullan.

1. ZIP'i çıkar ve içindeki kaynak proje dosyalarını GitHub deposunun kök dizinine yükle. Bu paket `dist/` klasörünü içermez; Netlify `npm run build` komutuyla her dağıtımda yeniden üretir.
2. GitHub deposunda daha önce takip edilen `dist/` dosyaları varsa `.gitignore` onları tek başına takipten çıkarmaz. Yerel bir Git kopyası kullanıyorsan bir kez `git rm -r --cached dist/` çalıştırıp commit et. Sadece GitHub web arayüzü kullanıyorsan mevcut `dist/` dosyalarını depodan silip commit et; Netlify build sırasında klasörü tekrar oluşturur.
3. Netlify ayarları: Build command `npm run build`, Publish directory `dist`, Node `22`. `netlify.toml` bu ayarları zaten tanımlar. `netlify/functions/` kaynakları depoda kalmalıdır; sadece `dist/` yüklemek RSS API'lerini dağıtmaz.
4. GitHub Actions `quality.yml` kontrolü push sonrasında çalışır. Sonuçta başarısız bir job varsa yayını kontrol etmeden önce hatayı düzelt.

## Bilinçli olarak ertelenen rapor maddeleri

- `LICENSE`: Kullanıcı lisans tercihi yapmadığı için MIT/GPL gibi bir lisans eklenmedi.
- Gerçek XML parser: npm registry bağlantısı bulunmadığı için yeni bağımlılık/lockfile güvenli biçimde kurulup doğrulanamadı. RSS parser bu sürümde regex tabanlı kalıyor.
- Google Fonts self-host: font binary dosyaları mevcut kaynak paketinde yok; tasarımın font görünümünü bozmamak için uzaktaki isteği kaldırmadım.
- Cam efekti için düşük güçlü cihaz performans profili ve Lighthouse: fiziksel cihaz/gerçek tarayıcı ölçümü gerekiyor.
- IPv6 RSS adresleri mevcut güvenlik politikası gereği hâlâ desteklenmiyor.
