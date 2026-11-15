# Diorama 1.6.3

## Haber paneli
- Haber paneli daha dar bir pencereye alındı; üst araç alanı ile haber listesi artık ayrı ayrı kaydırılmıyor. Panelin tamamı kaydırıldığı için kategori/arama alanı haber listesinin üstünde sabit yer kaplamıyor.
- Masaüstünde kategori düğmeleri tek satırda kalıyor.
- Mobilde üç kategori düğmesi tam görünür bir ızgara olarak yerleşiyor; yatay kırpılma ve kısmi düğme görünümü giderildi.
- Haber kartları tek sütun düzeninde ve daha sıkı aralıklarla gösteriliyor. Haber başlıkları normal okunabilir yazı tipinde kalıyor.

## Odak sayacı
- Sayaç, habitat bilgisiyle ilişkilendirildi ve pixel-art görünümlü bir sayaç tasarımı aldı.
- 10, 25, 45 ve 60 dakika hazır seçenekleri yanında 1–180 dakika özel süre seçimi eklendi.
- Çalışan sayaç bitiş zamanını yerel depolamaya kaydeder; sayfa yenilendiğinde kalan süreye göre kaldığı yerden devam eder. Duraklatma, devam ettirme ve bitiş durumu da korunur.
- Odak oturumu başladığında sayaç, ekranın üst-orta bölümünde büyüyen ve hafifçe parlayan HUD paneline geçer. Mobilde daha kompakt bir görünüm kullanılır.

## Yazı tipleri ve altyapı
- Sabit widget etiketleri Diorama'nın Pixelify/Silkscreen yazı diline yaklaştırıldı. Dinamik haber başlıkları, haber açıklamaları ve kullanıcının yazdığı içerikler normal okunabilir yazı tipinde kaldı.
- Yeni `widgets.css` ve `focus-timer-state.js` dosyaları çevrimdışı uygulama kabuğuna eklendi; Service Worker önbellek sürümü 1.6.3'e çıkarıldı.
- Hava durumu istatistiklerindeki sabit alan adları ve diğer kısa widget etiketleri Pixelify yazı dilini kullanır; arama sorguları ve kullanıcının girdiği odak hedefi normal okunabilir yazı tipinde kalır.
