# Diorama v1.6.6 — GitHub ve Netlify güncellemesi

1. ZIP dosyasını çıkarın.
2. İçindeki tüm dosya ve klasörleri GitHub deposunun kök dizinine yükleyin; mevcut dosyaların üzerine yazın.
3. **Gizli `.github` klasörünü de yüklediğinizi kontrol edin.** Windows Dosya Gezgini'nde gizli öğeleri görünür yapın. Bu klasörün içindeki `workflows/quality.yml`, GitHub Actions denetimlerini etkinleştirir.
4. `LICENSE`, `THIRD_PARTY_NOTICES.md`, `licenses/fonts/` ve `fonts/` klasörlerinin bulunduğunu doğrulayın. `dist/` klasörünü GitHub'a yüklemeyin.
5. Commit mesajı: `v1.6.6: include published font licenses and restore CI workflow`.
6. GitHub deposunun **Actions** sekmesinde `Diorama quality gate` iş akışını açın. Validate ve browser-smoke işleri başarılı olmalı.
7. Netlify, `main` dalına bağlıysa başarılı Git commit sonrasında otomatik build ve deploy yapacaktır.

## Netlify ayarları
- Build command: `npm run build`
- Publish directory: `dist`
- Node.js: `22`

`netlify.toml` bu ayarları tanımlar. Netlify Functions'in çalışması için yalnızca `dist/` klasörünü manuel yayımlamayın; tam kaynak deposunu Netlify Git integration ile bağlayın.

## Kontrol
- Ana sayfa yüklenmeli.
- Haber Merkezi `/api/news?category=gundem` üzerinden haber döndürmeli.
- Veri panelindeki MIT ve font lisansı bağlantıları açılmalı.
- İlk çevrimiçi ziyaretten sonra fontlar ve temel arayüz çevrimdışı açılmalı.
