# Diorama 1.4.1 — haber akışı ve hero tipografi

## Bu sürümde

- Türkiye & Dünya haberlerine TRT Haber Manşet, Anadolu Ajansı Güncel ve DW Türkçe kaynakları eklendi.
- Teknoloji kategorisine Webtekno, Technopat ve ShiftDelete eklendi.
- Bilim & Kültür kategorisine bilimUP ve Arkeofili eklendi.
- Çok kaynaklı haber kategorilerinde panel durum satırı daha kompakt hale getirildi; tek tek haber kartlarında yayıncı adı görünmeye devam eder.
- Dijital saat masaüstünde 88 px'e kadar, mobilde 70 px'e kadar büyütüldü.
- Takvim/tarih satırı masaüstünde 20 px'e, mobilde yaklaşık 18 px'e kadar büyütüldü; satır dengesi ve harf aralığı iyileştirildi.
- Service Worker cache sürümü 1.4.1 olarak güncellendi.

## Haber kaynakları

RSS akış adresleri yayıncı sayfaları ve güncel RSS dizini kayıtları üzerinden çapraz kontrol edildi. TRT Haber akışları kendi RSS sayfasında listeleniyor; AA, DW Türkçe, Webtekno, Technopat ve ShiftDelete akışları güncel RSS dizini kayıtlarında etkin görünüyor. bilimUP ve Arkeofili adresleri de RSS dizinlerinde listeleniyor. Bu çalışma ortamında DNS erişimi olmadığından yeni adreslere doğrudan HTTP/RSS isteği gönderilemedi; canlı akış doğrulaması gerçek dağıtımda yapılmalıdır. RSS2JSON sağlayıcısı üçüncü taraf olduğundan tek tek kaynaklar zaman zaman hata verebilir; çok kaynaklı birleştirme, kısmi başarısızlık halinde çalışan kaynakların haberlerini göstermeye devam eder.

## Doğrulama

- Haber kataloğu ve kaynak ID'leri için regresyon testi eklendi.
- Saat/tarih tipografisi için responsive stil regresyon testi eklendi.
- `npm run check`: başarılı.
- `npm test`: 18/18 başarılı.
- `npm run security`: başarılı.
- `npm run build`: başarılı.
- Playwright gerçek tarayıcı testi çalıştırılamadı; Chromium binary bu ortamda kurulu değildi.
