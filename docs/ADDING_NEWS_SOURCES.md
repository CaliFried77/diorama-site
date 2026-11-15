# Haber kaynakları

Haber okuyucu üç kategoride yerleşik RSS/Atom kaynakları ve kullanıcı tarafından eklenen özel akışları destekler.

## Varsayılan yayıncılar

| Kategori | Kaynaklar |
|---|---|
| Türkiye & Dünya | BBC Türkçe, TRT Haber, Anadolu Ajansı, DW Türkçe, NTV, CNN Türk |
| Teknoloji | Webrazzi, Webtekno, Technopat, ShiftDelete, DonanımHaber |
| Bilim & Kültür | Evrim Ağacı, TÜBİTAK, Arkeofili |

## Kaynak ekleme

`config/news-feeds.js` içindeki uygun kategoriye aşağıdaki yapıda kayıt ekle:

```js
{
  id: 'yayinci-kisa-adi',
  publisher: 'Yayıncı Adı',
  rss: 'https://yayinci.example/feed.xml',
  homepage: 'https://yayinci.example/',
  enabled: true,
}
```

- `id` tüm yerleşik kaynaklarda benzersiz ve küçük harf/rakam/tire biçiminde olmalı.
- `rss` ve `homepage` HTTPS olmalı.
- Kaynağı geçici kapatmak için `enabled: false` kullan.
- Yeni kaynak sonrası `npm run test:news`, `npm test`, `npm run security` ve `npm run build` çalıştır.

## API ve önbellek davranışı

- Yerleşik kaynaklar kategori başına bir `GET /api/news?category=...` isteğiyle toplanır.
- İstemci yalnızca kategoriye ait kaynak kimliklerini gönderir; sunucu RSS adresini katalogdan alır ve keyfi URL kabul etmez.
- Başarılı yerleşik kategori yanıtları Cloudflare Cache API üzerinde dört dakikaya kadar saklanır; tarayıcı önbelleği 30 saniyedir. Elle yenileme ortak önbelleği atlar.
- Kullanıcı kaynakları `POST /api/custom-news` üzerinden alınır; URL JSON gövdesindedir ve query string'e yazılmaz.
- Özel kaynak yanıtları `private, no-store` döner ve ortak CDN önbelleğine eklenmez.
- Her iki API rotasının da ayrı IP anahtarlı hız sınırı vardır. Cloudflare limitleri veri merkezi bazında yaklaşık çalışır; küresel ve kesin sayaç değildir.
- RSS yanıtı 1 MB, yönlendirme sayısı üç ve her kaynaktan gösterilen haber sayısı 12 ile sınırlıdır.

## RSS güvenliği

- RSS 2.0 ve Atom desteklenir.
- Özel RSS adresleri yalnızca HTTPS, varsayılan 443 portu ve IP olmayan genel hostname kabul eder.
- Her yönlendirme elle takip edilir ve yeni hedef tekrar doğrulanır.
- İstekler zaman aşımına ve yanıt boyutu sınırına tabidir.
- Worker dış ağ davranışı Cloudflare uyumluluk ayarına dayanır; Netlify'deki DNS sabitleme yöntemi kullanılmaz.

## Kaynak tercihleri ve okuma durumu

- Kaynakları Haber Merkezi'ndeki Kaynaklar panelinden kategori bazında açıp kapatabilirsin.
- Özel kaynak sayısı uygulama başına 20 ile sınırlıdır.
- Okunma, kaydetme ve kaynak tercihleri cihazda saklanır; tam JSON yedeğine dahildir.
