# Kod Haritası ve Güvenli Düzenleme Rehberi

Bu belge, bir özelliği ararken hangi dosyaya bakacağını ve değişiklik yaparken hangi kontrolleri çalıştıracağını gösterir.

## Önce bilmen gereken üç şey

1. Uygulamanın başlangıç noktası `js/main.js` dosyasıdır. Özellik kodunu buraya yığma; ilgili modüle koy.
2. Habitat adları, renkleri ve profil eşleştirmeleri `config/habitat-catalog.js` içindedir.
3. `css/utilities.css` ve `dist/` build sırasında üretilir. Bunları elle düzenleme; kaynak dosyaları değiştir.

## Dosya haritası

| Dosya | Sorumluluğu |
|---|---|
| `index.html` | Sayfa iskeleti, paneller, düğmeler ve erişilebilirlik işaretleri |
| `js/main.js` | Uygulama giriş noktası ve modül yükleme sırası |
| `js/01-core-ui.js` | Tema, arama motoru, kısayollar, popover'lar ve temel arayüz |
| `js/02-news.js` | Haber akışı, kartlar ve haber tercihleri |
| `js/03-weather.js` | Hava durumu, panel, güneş/ay ve hava efektleri |
| `js/04-focus-audio.js` | Odak sayacı arayüzü ve ambiyans/ses üretimi |
| `js/05-workspace.js` | Görevler ve notlar |
| `js/06-data-manager.js` | JSON yedekleme, geri yükleme ve içe aktarılan veriyi doğrulama |
| `js/07-habitat-state.js` | Canvas, aktif habitat, boyutlar, canlı/bitki/yem koleksiyonları ve kare zamanlaması |
| `js/08-creatures.js` | Canlı sınıfları, hareket/çizim davranışları ve mevcut yem bırakma tıklama olayı |
| `js/09-scenery.js` | Habitat kurulumu, bitki/çevre üretimi, statik çevre ve kare bazlı sahne çizimi |
| `js/10-glass-renderer.js` | Animasyon döngüsü ve cam/kırılma katmanı |
| `js/11-calendar.js` | Takvim ve etkinlikler |
| `js/storage.js` | Tarayıcı depolama, URL ve kullanıcı verisi normalleştirme |
| `js/news-utils.js` | Haber kimlikleri, birleştirme, filtreleme ve kaynak doğrulama |
| `js/focus-timer-state.js` | Arayüzden bağımsız odak sayacı hesapları |
| `js/scene-math.js` | Kare hızından bağımsız hareket ve sahne matematiği |
| `js/scene-state.js` | Modüller arasında paylaşılan sahne önbelleği |
| `js/services.js` | Modüller arası callback kayıtları; döngüsel import oluşmasını önler |
| `js/performance-monitor.js` | `?debug=perf` performans göstergesi |
| `config/habitat-catalog.js` | Habitat kayıtları ve scene/creature/interaction profil listeleri |
| `config/news-feeds.js` | Haber kaynakları ve kategoriler |
| `server/` | Platformdan bağımsız RSS ayrıştırma, URL doğrulama ve API handler'ları |
| `cloudflare/` | Worker yönlendirmesi, önbellek, rate-limit ve Cloudflare ağ erişimi |
| `scripts/` | Build, CSS üretimi, sözdizimi/bağımlılık ve güvenlik kontrolleri |
| `tests/` | Otomatik regresyon testleri |

## Sık yapılacak değişiklikler

### Yeni habitat

1. `config/habitat-catalog.js` içine benzersiz kayıt ekle.
2. `sceneProfile`, `creatureProfile` ve `interactionProfile` değerlerinin izin listelerinde bulunduğunu doğrula.
3. Var olan profiller uygunsa önce onları yeniden kullan.
4. Yeni çevre gerekiyorsa `js/09-scenery.js` içindeki zemin, habitat kurulumu ve statik çizim bölümlerini birlikte incele.
5. Yeni canlı gerekiyorsa sınıfı `js/08-creatures.js` içine ekle ve `js/09-scenery.js` içindeki `CREATURE_PROFILES` eşleştirmesini güncelle.
6. Yeni yem gerekiyorsa `js/08-creatures.js` içindeki **YEM ETKİLEŞİMİ** bölümünü, yem nesnelerinin sahnede güncellendiği/çizildiği kodu ve katalogdaki interaction profilini birlikte ele al.
7. Katalog, güvenlik ve tarayıcı testlerini güncelle.

### Hayvan görünüşü veya davranışı

`js/08-creatures.js` içindeki ilgili `Pixel...` sınıfını bul. Sınıfta genellikle başlangıç konumu, hareket/durum mantığı, beslenme ve `draw()` çizimi bulunur. Yalnızca görünüşü değiştiriyorsan hareket/çarpışma koduna dokunma; davranışı değiştiriyorsan çizim kodunu gereksiz yere değiştirme.

### Bitki ve arka plan

`js/09-scenery.js` içinde önce habitat kurulumu ve bitki üretimini, sonra statik çevre çizimini incele. Hareketli efektler kare bazlı çizim bölümündedir. Bir bitkiyi üretmek tek başına yetmez; doğru katmanda çizildiğini de kontrol et.

### Arayüz ve görünüm

- HTML: `index.html`
- Genel stiller: `css/base.css`
- Haber kartları: `css/news.css`
- Widget/panel stilleri: `css/widgets.css`
- Mobil/tablet düzeni: `css/responsive.css`
- `css/utilities.css`: **build çıktısıdır, elle düzenleme.**

## Kod bloklarının başına/sonuna açıklama koyma

JavaScript'te editörün bölümü katlayabilmesi için `//#region` ve `//#endregion` yorumlarını kullan:

```js
//#region CANLI: PixelParrot — papağan davranışı ve çizimi
// Sadece papağanın görünüşünü değiştiriyorsan hareket mantığını koru.

class PixelParrot {
  // ...
}

//#endregion CANLI: PixelParrot
```

- Başlangıç ve bitiş adını aynı tut.
- Bölüm adı aratılabilir olsun: `CANLI: PixelParrot`, `YEM ETKİLEŞİMİ`, `STATİK ÇEVRE ÇİZİMİ`.
- Her küçük `if` için ayrı bölge açma. Bir canlı sınıfı veya habitat üretim aşaması gibi anlamlı blokları işaretle.
- Açıklama bloğun ne yaptığını, hangi veri/profille bağlantılı olduğunu ve değiştirirken dikkat edilmesi gereken yeri söylesin.
- CSS'te `/* #region Bölüm adı */` / `/* #endregion Bölüm adı */`; HTML'de `<!-- #region Bölüm adı -->` / `<!-- #endregion Bölüm adı -->` biçimini kullan.

## Güvenli değişiklik sırası

1. Tek seferde tek tür değişiklik yap. Yorum düzenlemesiyle davranış değişikliğini aynı commit'te karıştırma.
2. Eski-yeni farkını incele. Sadece yorum ekliyorsan çalıştırılabilir satırların aynı kaldığını kontrol et.
3. `npm run check` — sözdizimi, import yolları ve dairesel bağımlılıklar.
4. `npm test` — birim ve regresyon testleri.
5. `npm run security` — statik güvenlik denetimi.
6. `npm run build` ve `npm run deploy:dry-run` — build ve Worker paket kontrolü. **Dry-run yayın yapmaz.**
7. Görsel değişikliklerde `npm run test:browser` ve etkilenen habitatları tarayıcıda kontrol et.

`npm run deploy` gerçek dağıtım yapar; kontrol amaçlı kullanma. Önce preview ve kalite kapısı doğrulanmalı.

## Sonraki aşamada düzeltmeye değer yapısal noktalar

Bu ilk açıklama aşamasında davranış değişikliği yapılmadı. Aşağıdakiler ayrı, küçük ve testli refaktörler olmalı:

1. **`js/09-scenery.js` 2.600 satırdan uzun.** Habitat kurulumu, statik çizim ve kare bazlı çizim ayrı modüllere bölünebilir.
2. **`js/08-creatures.js` yaklaşık 2.300 satır.** Canlı sınıfları ile tıklamayla yem bırakma kodu ayrı modüllere ayrılabilir.
3. **Kutup platform geometrisi iki yerde tarif ediliyor.** Tilkinin kullandığı `getArcticLedges()` ile cloudberry bırakma bölümündeki basitleştirilmiş platform listesi tek ortak geometri kaynağına bağlanırsa konumların farklılaşması önlenir.
4. **`initHabitat()` arayüz metinlerini de DOM'a yazıyor.** Sahne kurulumuyla habitat adı/duyurusunu güncelleme sorumlulukları ileride ayrılabilir.
5. **Kalite belgesi altı habitat diyordu.** Sekiz habitatın tamamını kapsayacak şekilde düzeltildi.

Kullanılmayan kodu sadece eski göründüğü için silme. Önce import, çağrı noktası, test ve çalışma zamanı davranışını doğrula.
