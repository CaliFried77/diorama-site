# Living Pixel Diorama

[English](README.md) | **Türkçe**

**Geliştirme sürümü:** `2.0.0-dev.1`  
**Barındırma/çalışma ortamı:** Cloudflare Workers Static Assets + Worker API  
**Uygulama lisansı:** MIT. Paketlenmiş yazı tipleri kendi SIL Open Font License 1.1 lisanslarını korur.

Diorama; canlı piksel-art habitatları, hava durumu, çok kaynaklı haber akışı, odak sayacı, notlar, görevler ve kısayollar içeren, veriyi öncelikle tarayıcıda tutan kişisel yeni sekme deneyimidir.

## Proje yapısı

- `index.html` — uygulama HTML'i ve yerel ES modül giriş noktası
- `js/` — tarayıcı özellikleri, habitat etkileşimleri, durum, geometri, önbelleğe alınan arka planlar ve çizim
- `css/` — elle yazılan stiller ve üretilen yardımcı sınıf dosyası
- `config/` — habitat ve haber kaynağı katalogları
- `server/` — platformdan bağımsız RSS ayrıştırıcısı ve API handler'ları
- `cloudflare/` — Worker giriş noktası ve Cloudflare RSS ağ taşıması
- `sw.template.js` — üretilen offline Service Worker için kaynak şablon
- `build.mjs` — yayınlanabilir `dist/` klasörünü ve uygulama kabuğu parmak izini üretir
- `wrangler.toml` — Worker, Static Assets ve rate-limit binding yapılandırması
- `docs/` — mimari, güvenlik, kalite ve özellik geliştirme rehberleri

## Yerelde çalıştırma

Node.js 22 veya daha yenisi gerekir.

```bash
npm run dev
```

Wrangler `4.162.0` sürümü proje komutlarında sabitlenmiştir. İlk çalıştırmada `npx` bu sürümü indirir; böylece yerel geliştirme ve CI aynı Worker araç zincirini kullanır.

## Doğrulama ve derleme

```bash
npm run check
npm test
npm run security
npm run build
```

Üretilen site `dist/` klasörüne yazılır. Worker, Wrangler tarafından paketlenir. Haber API'leri Worker çalışma ortamına ihtiyaç duyduğu için `dist/` klasörünü Worker olmadan çalışan statik bir host'a tek başına yükleme.

Yayın yapmadan yerel Cloudflare paket kontrolü için:

```bash
npm run deploy:dry-run
```

Gerçek dağıtım için `npm run deploy` komutunu yalnızca branch, hesap binding'leri ve önizleme kontrolleri doğrulandıktan sonra kullan.

## Mimari ilkeler

- Tarayıcı kodu hosting sağlayıcısına özgü modülleri içe aktarmaz.
- Ortak RSS ayrıştırma, URL doğrulama ve API istek doğrulama mantığı `server/` altındadır.
- Çalışma ortamına özgü ağ taşıması ve yönlendirme `cloudflare/` altındadır.
- RSS istekleri yalnızca HTTPS hostname kabul eder; IP literal ve ayrılmış/yerel hostname'leri reddeder, her yönlendirmeyi ayrıca doğrular, yanıt boyutunu sınırlar ve zaman aşımı uygular.
- Yerleşik haber kaynak kimlikleri kategori bazında izin listesine alınmıştır; rastgele kaynak kimlikleri kabul edilmez.
- Özel RSS URL'leri query string'e değil, sınırlandırılmış same-origin POST gövdesine gönderilir.
- API rate-limit binding'leri yerleşik ve özel RSS rotaları için ayrıdır.
- Worker başarılı yerleşik kategori sonuçlarını önbelleğe alır; özel kaynak sonuçları özeldir ve ortak önbelleğe alınmaz.
- Yerel kullanıcı verileri tarayıcı deposunda tutulur. Data Manager üzerinden JSON yedeği alınabilir ve geri yüklenebilir.

## Yayın stratejisi

Cloudflare geçişi özel `migration/cloudflare-pages` Git branch'inde geliştirilir. `main` ayrı tutulur. Netlify eski bir geri dönüş seçeneğidir; aktif Cloudflare geliştirme dalının parçası değildir.

Worker adı `diorama-site`'tır. Statik dosyalar `dist/` içinden sunulur; yalnızca `/api/*` istekleri Worker kodundan geçer. Tekrarlanabilir derlemeler için Wrangler CLI `4.162.0` sürümüne sabitlenmiştir. GitHub Actions; sözdizimi/import kontrollerini, birim testlerini, güvenlik denetimini, migration dalında Wrangler dry-run paketlemesini ve Chromium tarayıcı smoke testlerini çalıştırır.

## Dokümantasyon

- [GitHub ve Cloudflare işletim rehberi (Türkçe + English)](docs/OPERATIONS_TR_EN.md)
- [Cloudflare dağıtım rehberi (Türkçe)](docs/DEPLOY_CLOUDFLARE_TR.md)
- [Mimari genel bakış](docs/ARCHITECTURE.md)
- [Kod rehberi ve güvenli düzenleme standardı](docs/CODE_GUIDE_TR.md)
- [Güvenlik modeli](docs/SECURITY.md)
- [Kalite kontrol listesi](docs/QA_CHECKLIST.md)
- [Haber kaynakları ekleme](docs/ADDING_NEWS_SOURCES.md)
- [Habitat ekleme](docs/ADDING_HABITATS.md)

## Yerel CSS, fontlar ve çevrimdışı çalışma

Tailwind CDN çalışma zamanı kullanılmaz. `scripts/build-css.mjs`, HTML ve JavaScript şablonlarını tarayarak yalnızca Diorama'nın kullandığı yardımcı sınıfları üretir. Fontlar `fonts/` altında yerel olarak barındırılır; lisans bildirimleri `licenses/fonts/` altındadır.

Build işlemi statik uygulamayı kopyalar, modül preload ipuçlarını üretir ve mevcut varlık listesinden `dist/sw.js` dosyasını oluşturur. Önbellek adı sürüm ve SHA-256 parmak izini birleştirir; böylece değişen varlıklar yeni bir offline uygulama kabuğu alır. Kaynak ağacındaki eski root `sw.js` dosyası bilerek tutulmaz.

## Lisans

Uygulama kaynak kodu MIT lisanslıdır. Font ikilileri üçüncü taraf varlıklardır ve MIT lisansı altında yeniden lisanslanmamıştır; üst kaynaklarının OFL bildirimleri `licenses/fonts/` altında ve `THIRD_PARTY_NOTICES.md` içinde özetlenmiştir.
