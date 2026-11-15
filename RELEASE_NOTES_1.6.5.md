# Diorama v1.6.5 — MIT lisansı ve yerel fontlar

## Lisans
- Diorama uygulama kaynak kodu için kök dizine MIT `LICENSE` dosyası eklendi.
- Inter, JetBrains Mono, Pixelify Sans ve Silkscreen fontları MIT lisansının dışında tutuldu; her biri kendi OFL 1.1 lisans metniyle birlikte dağıtılıyor.
- `THIRD_PARTY_NOTICES.md` üçüncü taraf fontların aile, ağırlık, telif ve lisans ayrıntılarını listeliyor.

## Fontlar
- Inter: 300, 400, 500, 600
- JetBrains Mono: 400, 500
- Pixelify Sans: değişken 400–700
- Silkscreen: 400, 700
- Dokuz yerel WOFF2 dosyası `fonts/` içine eklendi.
- Google Fonts preconnect ve gecikmeli yükleme kaldırıldı; `@font-face` ile aynı origin'den yükleme yapılıyor.
- CSP `style-src` ve `font-src` harici Google font origin'lerine izin vermiyor.
- Build, fontları `dist/fonts/` içine kopyalıyor; content-hashed Service Worker shell fontları da otomatik önbelleğe alıyor.
- Fontlar arasında görünüm/aile değişikliği hedeflenmedi; mevcut CSS font aileleri ve kullanılan ağırlıklar korundu.
