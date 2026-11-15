# Haber kaynakları

Haber okuyucu iki seviyede kaynak destekler:

1. **Yerleşik kaynaklar:** `config/news-feeds.js` içindeki `NEWS_CATEGORIES` dizilerinde tutulur; sunucu tarafındaki `/api/news` yalnızca bu katalogdaki kaynak kimliklerini kabul eder.
2. **Kullanıcı kaynakları:** Haber Merkezi > Kaynaklar > Kendi RSS kaynağını ekle bölümünden eklenir; herkese açık HTTPS RSS/Atom adresleri kabul edilir ve tercihler tarayıcının yerel depolamasında saklanır. Akışlar aynı origin'deki `/api/custom-news` Netlify Function'ına POST edilir.

## Varsayılan yayıncılar (1.6.1)

| Kategori | Kaynaklar |
|---|---|
| Türkiye & Dünya | BBC Türkçe, TRT Haber, Anadolu Ajansı, DW Türkçe, NTV, CNN Türk |
| Teknoloji | Webrazzi, Webtekno, Technopat, ShiftDelete, DonanımHaber |
| Bilim & Kültür | Evrim Ağacı, TÜBİTAK, Arkeofili |

## Kodla kaynak eklemek

`config/news-feeds.js` içinde uygun kategorinin `sources` listesine ekle:

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
- Kategori düğmeleri yapılandırmadan otomatik üretilir.
- Her yeni kaynakta `npm run test:news`, `npm test`, `npm run security` ve `npm run build` çalıştır.

## Okuyucu ve API davranışı

- Yerleşik kaynaklar kategori başına tek bir `/api/news` isteğiyle toplanır. İstemci yalnızca kategoriye ait kaynak kimliklerini gönderir; sunucu RSS adresini katalogdan alır, keyfi URL kabul etmez.
- Yerleşik kategori yanıtları Netlify CDN'de 4 dakika önbelleğe alınır; tarayıcı önbelleği 30 saniyedir. Elle yenileme ortak CDN önbelleğini atlar. Kaynakların tamamı başarısızsa boş yanıt ortak önbelleğe alınmaz.
- Kullanıcı kaynakları `/api/custom-news` üzerinden alınır; istemci başarılı kaynakları 5 dakika, eski verileri 48 saat yerel olarak saklar. Özel kaynak isteği POST gövdesi kullanır; URL query string'e yazılmaz. Sunucu gerçek istek gövdesini 4 KB ile sınırlar ve JSON içerik türünü doğrular.
- API fonksiyonları IP başına dakikalık istek sınırı uygular. Yerleşik akış istekleri 9 saniye, özel akışlar 6,5 saniye zaman aşımına sahiptir. Akış gövdesi 1 MB ve yönlendirme sayısı üç ile sınırlıdır.
- RSS 2.0 ve Atom biçimleri desteklenir. Haberler kaynak başına en fazla 12 kayıtla sınırlanır; istemci bunları birleştirir, tekrarları temizler ve en fazla 30 haber gösterir.
- Arama, okunmadı ve kaydedilen filtreleri yerel çalışır. Okuma/kaydetme durumu cihazda saklanır ve tam yedeğe dahildir.

## Kaynak yönetimi ve filtreler

- Haber Merkezi içindeki kaynak düğmesiyle yayıncıları kategori bazında açıp kapatabilirsin.
- Özel kaynak sayısı uygulama başına 20 ile sınırlıdır.
- Özel RSS adresleri yalnızca HTTPS, varsayılan 443 portu ve herkese açık hostname kabul eder.
- Arama başlık, yayıncı ve özet alanlarını tarar. Okunmadı ve Kaydedilen görünümleri cihazda saklanır.
- Tam JSON yedeği kaynak tercihlerini, özel akışları ve okuma/kaydetme durumlarını da kapsar.

## Kendi RSS API'si ve güvenlik sınırı

- Netlify Functions, RSS 2.0 ve Atom XML akışlarını sunucu tarafında okur. Tarayıcı RSS yayıncılarına veya RSS2JSON'a doğrudan bağlanmaz.
- Yerleşik `/api/news` uç noktası yalnızca `config/news-feeds.js` içindeki kategoriye ait kaynak kimliklerini kabul eder.
- Özel `/api/custom-news` yalnızca herkese açık HTTPS hostname kabul eder. Sunucu DNS çözümlemesini doğrular, herkese açık IPv4 adresini TLS isteğine sabitler ve her yönlendirmeyi yeniden denetler. Loopback, özel, link-local, shared ve ayrılmış IPv4 blokları reddedilir.
- Özel feed yanıtları `private, no-store` döner ve CDN'de paylaşılmaz.
- Bu API Netlify Functions gerektirir. Yalnızca statik `dist/` klasörünü destekleyen bir hosta geçilirse `/api/*` uç noktaları çalışmaz; o host için eşdeğer backend adapter gerekir.
