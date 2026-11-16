# Kod rehberi ve güvenli düzenleme standardı

Bu belge, projeyi ileride düzenlerken doğru dosyayı bulmayı ve değişikliklerin çalışan siteyi bozmasını önlemeyi amaçlar. Uygulamanın çalışma mantığını değiştirmez.

## 1. Dosyayı nerede aramalıyım?

| Dosya / klasör | Sorumluluğu | Ne zaman düzenlenir? |
|---|---|---|
| `index.html` | Sayfanın HTML yapısı, bileşenlerin ve panellerin yerleşimi | Yeni panel, düğme, form alanı veya temel sayfa yapısı eklerken |
| `js/main.js` | Tarayıcı modüllerini başlatır ve Service Worker'ı kaydeder | Yeni bir özellik modülü uygulamaya bağlanırken |
| `js/01-core-ui.js` | Tema, arama, saat, kısayollar, popover ve ortak arayüz davranışları | Genel arayüz davranışları değişirken |
| `js/02-news.js` | Haber kaynakları, kullanıcı tercihleri, önbellek, haber kartları ve istek akışı | Haber paneli veya RSS kaynak seçimi değişirken |
| `js/03-weather.js` | Hava durumu, hava kalitesi, ay/güneş bilgisi ve hava çizim efektleri | Hava paneli veya hava efektleri değişirken |
| `js/04-focus-audio.js` | Odak sayacı, oturumlar, bildirim sesi ve ambiyans sesi | Pomodoro veya ses özellikleri değişirken |
| `js/05-workspace.js` | Görevler ve notlar | Görev/not arayüzü veya saklanan veriler değişirken |
| `js/06-data-manager.js` | JSON yedek alma, geri yükleme ve veri doğrulama | Yedekleme biçimi veya veri taşıma davranışı değişirken |
| `js/07-habitat-state.js` | Sahne canvas'ı, ortak sahne dizileri, aktif habitat ve kare/zaman ölçekleri | Bütün habitatların paylaştığı temel durum değişirken |
| `js/08-creatures.js` | Canlı sınıfları ve canlıların güncellenmesi/çizimi | Hayvan davranışı veya görünümü değişirken |
| `js/habitat-interactions.js` | Canvas tıklamalarını yem/uyarana çevirir; yemlerin animasyon, çizim ve ömür döngüsünü yürütür | Yeni yem türü, tıklama etkileşimi veya yem çizimi eklerken |
| `js/arctic-geometry.js` | Kutup platform koordinatları ve tilki platform bağlantı grafiği; DOM/canvas bağımlılığı olmayan saf geometri | Kutup platformlarının boyutu, konumu veya tilki rotaları değişirken |
| `js/09-scenery.js` | Habitatın kurulması, arka plan/bitki/zemin katmanları ve sahne çizimi | Orman, çayır, akvaryum, kutup gibi çevreler değişirken |
| `js/10-glass-renderer.js` | Animasyon döngüsü, canlıların sahneye çizilmesi, cam yansıma katmanı ve klavye kısayolları | Animasyon, çizim sırası veya cam efektleri değişirken |
| `js/11-calendar.js` | Takvim, etkinlik doğrulama ve yerel kayıt | Takvim özellikleri değişirken |
| `js/storage.js`, `js/news-utils.js`, `js/scene-math.js`, `js/scene-state.js`, `js/services.js`, `js/focus-timer-state.js` | Birden fazla modülün kullandığı küçük, ortak yardımcılar ve döngü engelleyici servis köprüleri | Aynı mantık birden fazla modülde gerçekten ortaksa |
| `config/` | Habitat ve haber kaynağı katalogları | Yeni habitat profili veya haber sağlayıcısı eklerken |
| `server/` | Platformdan bağımsız haber API'si, RSS ayrıştırma ve istek doğrulama | API kuralları veya RSS ayrıştırma değişirken |
| `cloudflare/` | Cloudflare Worker yönlendirmesi, ağ taşıması, cache ve rate-limit bağlantıları | Yalnızca Cloudflare çalışma ortamına özgü davranış değişirken |
| `css/base.css`, `css/news.css`, `css/widgets.css`, `css/responsive.css` | Elle yazılan ana stil dosyaları | Görünüm, bileşen veya mobil düzen değişirken |
| `scripts/` ve `tests/` | Derleme, kontrol, güvenlik denetimi ve otomatik testler | Bir davranış veya geliştirme kuralı değiştiğinde |

### Özellikle dikkat edilmesi gereken dosyalar

- `js/07-habitat-state.js` ortak durum deposudur. Buradaki değişiklik çok sayıda sahne modülünü etkileyebilir.
- `js/08-creatures.js` canlı sınıflarını ve yem/uyaran etkileşimini birlikte barındırır. Bir canlıyı değiştirirken başka türlerin ortak davranışlarını bozmamaya dikkat et.
- `js/09-scenery.js` büyük bir çizim dosyasıdır. Habitat çizimlerini ayırmak cazip görünse de, önce ortak çizim sırası ve paylaşılan durum testlerle anlaşılmalıdır.
- `js/10-glass-renderer.js` animasyon döngüsünü yönetir. Burada küçük görünen değişiklikler FPS, pil tüketimi ve çizim sırasını etkileyebilir.
- `js/02-news.js` kaynak önbelleği, isteklerin eşzamanlılığı ve yeniden deneme kurallarını içerir. Sadece görünümü değiştirirken istek/önbellek mantığına dokunma.

## 2. Kod bölümlerini nasıl işaretleyeceğiz?

Dosyadaki büyük ve anlamlı bölümlerin başına ve sonuna aynı başlığı taşıyan açıklamalar ekleyeceğiz. Böylece düzenleyici dosya içinde arama yaparak bir bölümün başlangıcını ve bitişini kolayca bulabilir.

### JavaScript örneği

```js
// ============================================================================
// BÖLÜM BAŞI: HABİTAT DURUMU
// Görev: Canvas boyutunu ve diğer modüllerin kullandığı ortak sahne durumunu tutar.
// Düzenleme notu: Buradaki değişkenler diğer modüller tarafından içe aktarılır.
// ============================================================================

// Bu bölümün mevcut kodu burada kalır.

// ============================================================================
// BÖLÜM SONU: HABİTAT DURUMU
// ============================================================================
```

### HTML örneği

```html
<!-- BÖLÜM BAŞI: HABİTAT SEÇİCİ -->
<!-- Bu panelin açılıp kapanma davranışı JavaScript modülünde yönetilir. -->

<!-- Panelin mevcut HTML kodu burada kalır. -->

<!-- BÖLÜM SONU: HABİTAT SEÇİCİ -->
```

### CSS örneği

```css
/* BÖLÜM BAŞI: HABİTAT MENÜSÜ */
/* Kaynak CSS dosyasına eklenir; üretim CSS'i derleme sırasında küçültülür. */

/* Mevcut habitat menüsü stilleri burada kalır. */

/* BÖLÜM SONU: HABİTAT MENÜSÜ */
```

### Yorum yazma kuralları

1. Yalnızca anlamlı bölümleri işaretle. Her iki satırlık fonksiyona ayrı başlık koymak dosyayı gereksiz uzatır.
2. Açıklama, kodun ne yaptığını veya neden o şekilde çalıştığını söylesin. Satırı kelimesi kelimesine tekrar etmesin.
3. Önemli sınırları belirt: veri nereden geliyor, hangi modül kullanıyor, hangi davranışın korunması gerekiyor?
4. Karmaşık fonksiyonların içinde yalnızca sezgisel olmayan algoritma veya kritik kural için kısa satır yorumları kullan.
5. Bir bölüm taşınır ya da silinirse başlangıç ve bitiş yorumlarını da birlikte taşı veya kaldır.
6. Yorumları JavaScript kodu, HTML etiketi veya CSS kuralı dışında doğru yorum biçimiyle yaz. Template literal, metin, düzenli ifade veya nesne değeri içine gelişigüzel yorum ekleme.
7. Yorumlar çalışma mantığını değiştirmez; ancak yanlış yorum sözdizimi veya yanlış yere eklenen işaretleyici yine hata oluşturabilir. Bu yüzden yorum eklenen dosya da test edilir.

## 3. Elle düzenlenmemesi gereken üretilmiş dosyalar

- `css/utilities.css`, `scripts/build-css.mjs` tarafından HTML ve JavaScript'te kullanılan sınıflardan üretilir. Burayı elle değiştirme; değişiklik sonraki derlemede kaybolur.
- `dist/` derlemenin çıktısıdır. Kaynak kod değildir; normal geliştirmede elle düzenlenmez ve repoya eklenmez.
- `dist/sw.js`, `sw.template.js` ve build işlemi üzerinden üretilir. Offline davranış için kaynak şablonu düzenlenir.

CSS kaynak dosyalarındaki yorumlar okunabilirlik içindir. Build işlemi CSS küçültmesi sırasında yorumları kaldırabilir; bu normaldir.

## 4. Bir değişikliği güvenle nasıl yapacağız?

1. Önce `migration/cloudflare-pages` dalındaki en son sürüm kontrol edilir. `main` dalına dokunulmaz.
2. Her çalışma için ayrı bir `chore/`, `fix/` veya `feature/` dalı açılır.
3. Tek seferde tek konu değiştirilir. Örneğin önce yalnızca açıklama yorumları; başka bir değişiklikte canlı davranışı.
4. Kod silmeden önce kullanım yerleri, import/export bağlantıları, HTML referansları ve testler aranır.
5. Değişiklikten sonra en azından aşağıdaki kalite kapısı çalıştırılır:

```bash
npm run check
npm test
npm run security
npm run build
npm run deploy:dry-run
```

Tarayıcı davranışı etkilendiyse ayrıca `npm run test:browser` çalıştırılır. GitHub Actions aynı kontrolleri yeniden çalıştırır. Herhangi bir adım başarısızsa değişiklik birleştirilmez.

## 5. Temizlik yaparken izleyeceğimiz sıra

- Önce eski/yanıltıcı açıklamalar ve güncel olmayan belgeler düzeltilir.
- Sonra büyük modüllerin bölüm sınırları ve görev açıklamaları eklenir.
- Ardından kullanılmayan kod adayları aranır; yalnızca hiçbir yerden çağrılmadığı ve çalışma zamanı davranışının parçası olmadığı doğrulanan kod kaldırılır.
- Son aşamada sorumluluğu yanlış yerde olan kodlar küçük parçalar halinde taşınır. Her taşıma sonrası test ve tarayıcı kontrolü yapılır.

Amaç dosyaları sırf daha kısa görünsün diye bölmek veya satır sayısını azaltmak değil; yeni bir hayvan, habitat, yem ya da arayüz özelliği eklerken doğru yeri kolayca bulabilmektir.

## 6. Bir sonraki aşama için yapısal temizlik adayları

Bunlar hemen taşınacak veya silinecek kodlar değildir. Önce mevcut kullanım ilişkileri ve testleri doğrulanmalı; her biri ayrı bir küçük değişiklik olarak ele alınmalıdır.

1. **Tamamlandı — Kutup platform geometrisi:** `getArcticLedges(width, height)` ve platform bağlantı grafiği, canlı sınıflarından ayrılarak saf `js/arctic-geometry.js` modülüne taşındı. Modül DOM/canvas durumuna erişmez; iki boyut parametresiyle çalışır ve ayrı birim testleri vardır.
2. **Tamamlandı — Yem bırakma etkileşimi:** Canvas `pointerdown` dinleyicisi ve habitat profiline göre yem/uyaran üretimi `js/habitat-interactions.js` dosyasına taşındı. `js/08-creatures.js` artık yalnızca canlı davranışını, hareketini ve çizimini yönetiyor. Yemlerin üretimi ile kare bazlı animasyon/çizim/ömür yönetimi etkileşim modülünde toplanıyor. Çizim sırası korunarak taşındı.
3. **Sahne çizim dosyasının boyutu:** `js/09-scenery.js` habitat kurulumunu, statik arka planı ve kare bazlı animasyonlu çizimi aynı dosyada tutuyor. Önce statik katman ile animasyonlu katmanı ayırmak; her biyomu ayrı dosyaya bölmekten daha düşük riskli ilk adım olur.
4. **Haber ve hava modülleri:** `js/02-news.js` veri/önbellek, RSS istekleri ve arayüzü; `js/03-weather.js` servis verisi, panel ve sahne efektlerini birlikte yönetiyor. İleride veri katmanı ile çizim katmanı ayrılabilir. Önce mevcut fonksiyonların veri akışı belgelenmeli.
5. **Ortak arayüz modülü:** `js/01-core-ui.js` tema, saat, arama, kısayollar ve popover davranışlarını içeriyor. Büyüyen bu modül özellik gruplarına ayrılabilir; ancak ortak popover ve cam kart durumu tek bir noktada kalmalı.

Bu çalışmada dört kullanılmayan import kaldırıldı; kutup platform geometrisi `js/arctic-geometry.js` dosyasına, yem/uyaran üretimi ve kare bazlı çizim döngüsü ise `js/habitat-interactions.js` dosyasına taşındı. Canlıların mevcut hareket/çizim kodu ve sahne çizim sırası korundu.
