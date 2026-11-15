# Diorama v1.6.6 — Netlify yayınlama ve kontrol

Diorama, Netlify Functions kullandığı için yalnızca statik `dist/` klasörünü yüklemek yeterli değildir. Git deposunun tamamını Netlify'ye bağlayın. `netlify.toml` build ve publish ayarlarını zaten içerir.

## GitHub üzerinden otomatik yayın

1. v1.6.6 proje dosyalarını GitHub deposunun kök dizinine yükleyin. Gizli `.github/` klasörünü de commit edin.
2. Netlify projesinde **Project configuration → Build & deploy → Continuous deployment** alanında doğru GitHub deposunun ve production branch olarak `main` dalının seçili olduğunu doğrulayın.
3. Build command `npm run build`, publish directory `dist`, Node.js sürümü `22` olmalı.
4. GitHub Actions sekmesinde `Diorama quality gate` çalışmasının başarılı olduğunu kontrol edin.
5. Netlify deploy tamamlandıktan sonra siteyi normal ve gizli pencerede açın; haber API'si, fontlar ve veri panelindeki lisans bağlantılarını kontrol edin.

## Yerel geliştirme

Node.js 22 veya üzeri gerekir.

```bash
npm run check
npm test
npm run security
npm run build
npm run dev
```

Tarayıcı smoke testleri için `python -m pip install -r requirements-browser.txt` ve `python -m playwright install chromium firefox` komutlarından sonra `npm run test:browser` çalıştırılabilir.

## Yayın sonrası hızlı API kontrolü

- Haber API'si: `GET /api/news?category=gundem` (200 JSON ve kaynak durumları beklenir).
- Özel RSS API'si yalnızca `POST /api/custom-news` kabul eder. `GET` ile adres çubuğundan açılması sağlık testi değildir.
- Build çıktısı `dist/` içine app-shell, fontlar, MIT lisansı ve font OFL bildirimlerini koyar. `dist/` repoya eklenmez; build sırasında üretilir.
