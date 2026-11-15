# Diorama v1.6.1 — Netlify yayına alma

Bu sürüm haberleri aynı origin üzerindeki iki Netlify Function üzerinden sunar. Bu nedenle yalnızca `dist/` klasörünü sürükleyip bırakmak yeterli değildir; tam proje kökü Netlify'a verilmelidir.

## Netlify arayüzüyle

1. Bu ZIP dosyasını bilgisayarında aç.
2. Proje klasörünü GitHub/GitLab gibi bir Git deposuna gönder.
3. Netlify'de **Add new site → Import an existing project** ile depoyu bağla.
4. Base directory proje kökü, build command `npm run build`, publish directory `dist` olmalı. `netlify.toml` bu ayarları zaten tanımlar.
5. Node sürümü `.nvmrc` ve `netlify.toml` içinde 22 olarak ayarlanmıştır.
6. İlk deploy tamamlandığında `/api/news?category=gundem` ve POST `/api/custom-news` fonksiyon uç noktaları aynı domainde kullanılabilir.

## Yerel geliştirme

Node.js 22 veya üzeri gerekir.

```bash
npm run check
npm test
npm run security
npm run build
npm run dev
```

`npm run dev`, Netlify CLI'ı `npx` ile çağırır ve statik uygulama ile Functions uç noktalarını aynı yerel origin altında sunar.

## Önemli

- Bu pakette hem kaynak kodu hem `dist/` üretim çıktısı bulunur.
- `netlify.toml`, `netlify/functions/` ve `netlify/lib/` dizinlerini silme veya yalnızca `dist/` klasörünü deploy etme; aksi halde RSS API çalışmaz.
- Gerçek yayıncı RSS akışlarının erişilebilirliği, yayın ortamında deploy sonrası doğrulanmalıdır. Tek bir kaynak çalışmazsa diğer kaynaklar bağımsız sonuç döndürür.
- Özel RSS kaynakları yalnızca HTTPS ve herkese açık IPv4 hedeflerine yönlendirilebilir. Yanıtlar ortak CDN önbelleğine alınmaz.
