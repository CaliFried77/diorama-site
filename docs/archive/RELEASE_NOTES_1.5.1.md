# Diorama 1.5.1 — Haber Merkezi

- Haber paneli Haber Merkezi olarak yenilendi; kategori bazlı kaynak yönetimi eklendi.
- Yerleşik yayıncılar: BBC Türkçe, TRT Haber, Anadolu Ajansı, DW Türkçe, NTV, CNN Türk, Webrazzi, Webtekno, Technopat, ShiftDelete, DonanımHaber, Evrim Ağacı, TÜBİTAK ve Arkeofili.
- Kullanıcılar kaynakları kategori bazında etkinleştirip devre dışı bırakabilir ve herkese açık HTTPS RSS/Atom kaynağı ekleyebilir.
- Haber başlığı ve yayıncı araması; Tümü, Okunmadı ve Kaydedilen filtreleri eklendi.
- Haber kartlarından açılan haber otomatik okundu olarak işaretlenir; yer imiyle kaydedilebilir.
- Birleştirme, tekrarlı URL parametrelerinin temizlenmesi ve tarihe göre sıralama iyileştirildi.
- Kaynak başına 5 dakikalık cache, 48 saat stale fallback, 429 Retry-After ve backoff davranışı eklendi; istek eşzamanlılığı 3 ile sınırlandı.
- Haber tercihleri, özel kaynaklar ve okuma/kaydetme listeleri tam JSON yedeğine eklendi.
- Yeni Haber Merkezi CSS katmanı yerel asset ve Service Worker önbelleğine eklendi.
- BilimUP akışı yerine doğrulanabilir TÜBİTAK RSS akışı kullanıldı.

- NTV ve CNN Türk Türkiye & Dünya kategorisine; DonanımHaber Teknoloji kategorisine eklendi.
- Haber başlıkları düz metne çevrilerek HTML/script/style parçaları temizlendi.
- Silinmiş veya devre dışı bırakılmış kaynaklara ait eski kategori önbelleği gösterilmez.
- Güvenlik denetimi Service Worker cache sürümünü package.json ile dinamik olarak eşleştirir.
