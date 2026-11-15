> Tarihsel sürüm: Bu yönerge v1.6.5 ilk lisans/font aktarımı içindir. En güncel işlem adımları için `MIGRATION_1.6.6_TR.md` dosyasını kullanın.

# Diorama v1.6.5 — GitHub / Netlify geçişi

1. ZIP dosyasını çıkar.
2. İçindeki tüm dosyaları GitHub deposunun ana dizinine yükle ve mevcut dosyaların üzerine yaz.
3. `LICENSE`, `THIRD_PARTY_NOTICES.md`, `licenses/fonts/` ve `fonts/` klasörlerinin depoya eklendiğini kontrol et.
4. Commit mesajı olarak `Add MIT license and self-hosted fonts (v1.6.5)` yazabilirsin.
5. Netlify otomatik dağıtım yapıyorsa build tamamlandıktan sonra siteyi yenile.

Netlify ayarları değişmez:

- Build command: `npm run build`
- Publish directory: `dist`
- Node: `22`

`dist/` klasörünü GitHub'a ekleme; build sırasında `fonts/` klasörü de `dist/fonts/` içine kopyalanır ve Service Worker önbellek listesine otomatik dahil edilir.

## Lisans notu

- `LICENSE` Diorama uygulama kaynak kodu için MIT lisansıdır.
- Font dosyaları MIT ile yeniden lisanslanmaz. Her fontun SIL OFL 1.1 bildirimi `licenses/fonts/` altındadır.
- MIT lisansı ticari kullanıma izin verir; dağıtılan kopyalarda telif ve lisans bildirimleri korunmalıdır. Fontların kendi OFL koşulları ayrıca geçerlidir.
