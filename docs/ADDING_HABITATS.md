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
| `sceneProfile` | `meadow`, `betta-aquarium`, `wetland`, `botanical`, `reef`, `koi-pond` |
| `creatureProfile` | `bee`, `betta`, `dragonfly`, `butterfly`, `jellyfish`, `koi` |
| `interactionProfile` | `nectar`, `bloodworm`, `midge`, `blossom`, `plankton`, `pellet` |

Tamamen yeni bir ekosistem veya tür tasarlanacaksa mevcut profil kodu kopyalanarak genişletilmemeli; `js/09-scenery.js` içindeki habitat başlangıç/çevre çizim profiline, `js/08-creatures.js` içindeki yeni canlı sınıfına ve `js/03-weather.js` ile `js/10-glass-renderer.js` etkileşimlerine bilinçli katkı yapılmalıdır. Sonrasında veri yedekleme doğrulaması `HABITAT_IDS` üzerinden katalogla otomatik eşleşir.
