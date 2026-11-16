# Yeni habitat ekleme

Habitat verileri `config/habitat-catalog.js` dosyasında tutulur. Var olan bir flora ve canlı profilini yeniden kullanan yeni bir habitat için kataloğa yeni ve benzersiz bir kayıt eklemek yeterlidir:

```js
{
  id: 'new-garden',
  sceneProfile: 'botanical',
  creatureProfile: 'butterfly',
  interactionProfile: 'blossom',
  weatherSky: true,
  name: 'Yeni Bahçe',
  hint: 'Tıkla: Yüzen Çiçek',
  dotColor: '#86efac',
  skyTop: '#071426',
  skyMid: '#14243a',
  skyBot: '#101a2e',
  lightTop: '#7dd3fc',
  lightMid: '#a7f3d0',
  lightBot: '#fef3c7',
  rgb: [134, 239, 172],
}
```

`sceneProfile` ve `creatureProfile` mevcut profillerden seçilirse mevcut çevre/bitki çizimi ve canlı üretimi yeniden kullanılır. `interactionProfile` tıklamayla bırakılan yiyecek/uyaran tipini seçer. `weatherSky` hava efektlerinin gökyüzü katmanında çizilip çizilmeyeceğini belirler.

Mevcut profiller:

| Profil alanı | Kullanılabilir değerler |
|---|---|
| `sceneProfile` | `meadow`, `betta-aquarium`, `wetland`, `botanical`, `reef`, `koi-pond`, `rainforest`, `arctic-tundra` |
| `creatureProfile` | `bee`, `betta`, `dragonfly`, `butterfly`, `jellyfish`, `koi`, `parrot`, `arctic_fox` |
| `interactionProfile` | `nectar`, `bloodworm`, `midge`, `blossom`, `plankton`, `pellet`, `fruit`, `cloudberry` |

Tamamen yeni bir ekosistem veya tür tasarlanacaksa mevcut profil kodu kopyalanarak genişletilmemeli; habitat geçişinin başlangıç akışı için `js/habitat-initializer.js`, bitki türü ve başlangıç koordinatları için `js/habitat-flora-generator.js`, zemin eğrileri için `js/habitat-geometry.js`, statik arka plan için `js/habitat-backgrounds.js`, bitkilerin animasyonu için `js/habitat-flora-renderer.js`, sahne çizim sırası ve hava efektleri için `js/09-scenery.js` ve yeni canlı sınıfı için `js/08-creatures.js` güncellenmelidir. Sonrasında veri yedekleme doğrulaması `HABITAT_IDS` üzerinden katalogla otomatik eşleşir.

Yeni `arctic-tundra` profili `PixelArcticFox` ile kutup tilkileri ve karlı platformları kullanır. `cloudberry` etkileşimi sahneye düşen ve platformlara yerleşen altın kutup böğürtlenleri bırakır; tilkiler bu yemleri takip eder. Yeni profil eklerken katalogdaki izin listelerini ve ilgili sahne/canlı/yem uygulamalarını aynı değişiklikte güncelle.

Yeni `rainforest` profili `PixelParrot` sürüsünü, katmanlı tropik ağaç gövdelerini, dev yaprakları, bromelyaları, orkideleri ve sarkan sarmaşıkları kullanır. `fruit` etkileşimi sahneye yenilebilir tropik meyveler bırakır; papağanlar en yakın serbest meyveye yönelir ve yediğinde uyaranı tüketir. Yeni fauna eklerken çizim sınıfını `js/08-creatures.js`, başlangıç yerleşimini `js/habitat-flora-generator.js`, habitatın statik çevresini `js/habitat-backgrounds.js`, hareketli çevreyi `js/09-scenery.js` içinde tut ve katalogdaki üç profil listesini birlikte güncelle.

Kutup tilkilerinin kullandığı basamaklı kar platformlarının koordinatları ve platformlar arasındaki geçiş bağlantıları `js/arctic-geometry.js` dosyasındadır. Bu modül sahne genişliği ve yüksekliğini parametre olarak alır; DOM veya canvas'a erişmez. Platform konumları, tilki rotaları ve böğürtlenlerin iniş yüzeyleri aynı geometriden hesaplanır. Bunları değiştirirken bu dosyayı ve `tests/arctic-geometry.test.mjs` testini birlikte güncelle.

Kullanıcı tıklamasıyla yem veya uyaran üretimi `js/habitat-interactions.js` dosyasında yapılır. Yeni bir `interactionProfile` eklerken burada ilgili üretim kuralını ekle; ardından üretilen uyaranın güncellenmesi/çizilmesi için `js/habitat-interactions.js` içindeki `drawHabitatStimuli()` fonksiyonunu, canlılar tarafından tüketilmesi için de ilgili canlı sınıfını kontrol et. `js/09-scenery.js` bu fonksiyonu sahne karesinde çağırır. Var olan interaction türlerinin adlarını değiştirirken üç tarafın da aynı tür adını kullandığından emin ol.
