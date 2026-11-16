import { tasks, notes, renderTasks, renderNotes, setTasks, setNotes } from './05-workspace.js';
import { shortcuts, DEFAULT_SHORTCUTS, renderShortcuts, setShortcuts } from './01-core-ui.js';
import { lsRaw, lsSet, normalizeWebUrl } from './storage.js';
import { HABITAT_IDS } from '../config/habitat-catalog.js';
import { registerDataManagerStatsUpdater } from './services.js';
import { normalizeCustomSources, normalizeNewsPreferences } from './news-utils.js';
import { NEWS_CATEGORY_IDS } from '../config/news-feeds.js';

/* DATA-MANAGER — Living Pixel Diorama
   Native ES module. Cross-file dependencies are declared with imports and exports. */
/* ============================================================================
           7B. LOCAL DATA MANAGER: VALIDATED BACKUP, RESTORE AND CLEANUP
           ============================================================================ */
        const DATA_BACKUP_FORMAT = 'living-pixel-diorama-backup';
        const DATA_BACKUP_VERSION = 1;
        const DATA_PREF_KEYS = [
            'diorama_theme', 'diorama_username', 'diorama_engine', 'diorama_city',
            'diorama_wxfx', 'diorama_wx_autotheme', 'diorama_pinned_habitat', 'diorama_ambient_volume',
            'diorama_news_source_preferences_v1', 'diorama_news_custom_sources_v1',
            'diorama_news_read_ids_v1', 'diorama_news_saved_ids_v1', 'diorama_calendar_events_v1'
        ];
        const DATA_HABITAT_IDS = HABITAT_IDS;
        const DATA_ENGINE_IDS = new Set(['google', 'duckduckgo', 'youtube', 'perplexity', 'github']);
        const dataManagerStatus = document.getElementById('dataManagerStatus');

        // ============================================================================
// BÖLÜM BAŞI: VERİ YÖNETİCİSİ DURUMU VE DEPOLAMA ÖZETİ
// Kullanıcıya gösterilen durum, kayıt boyutu ve yerel veri istatistikleri.
// ============================================================================

        function setDataManagerStatus(message, tone = 'normal') {
            dataManagerStatus.textContent = message;
            dataManagerStatus.className = `text-[11px] mt-3 min-h-8 ${tone === 'error' ? 'text-rose-200' : tone === 'success' ? 'text-emerald-200' : 'text-white/65'}`;
        }

        function formatDataBytes(bytes) {
            if (bytes < 1024) return `${bytes} B`;
            if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
            return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
        }

        function getAppStorageFootprint() {
            let bytes = 0;
            let keyCount = 0;
            try {
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (!key || !key.startsWith('diorama_')) continue;
                    const value = localStorage.getItem(key) || '';
                    bytes += new Blob([key, value]).size;
                    keyCount++;
                }
            } catch (error) {
                return { bytes: 0, keyCount: 0, readable: false };
            }
            return { bytes, keyCount, readable: true };
        }

        function updateDataManagerStats() {
            document.getElementById('dataTaskCount').textContent = String(tasks.length);
            document.getElementById('dataNoteCount').textContent = String(notes.length);
            document.getElementById('dataShortcutCount').textContent = String(shortcuts.length);
            const footprint = getAppStorageFootprint();
            document.getElementById('dataStorageSize').textContent = footprint.readable
                ? `${formatDataBytes(footprint.bytes)} · ${footprint.keyCount} kayıt`
                : 'Okunamadı';
        }

        // ============================================================================
// BÖLÜM SONU: DEPOLAMA ÖZETİ
// BÖLÜM BAŞI: YEDEK OLUŞTURMA VE DIŞA AKTARMA
// ============================================================================

        function makeBackup(scope = 'all') {
            const data = {};
            if (scope === 'all' || scope === 'tasks') data.tasks = tasks;
            if (scope === 'all' || scope === 'notes') data.notes = notes;
            if (scope === 'all' || scope === 'shortcuts') data.shortcuts = shortcuts;
            if (scope === 'all') {
                data.preferences = {};
                DATA_PREF_KEYS.forEach(key => {
                    const value = lsRaw(key);
                    if (value !== null) data.preferences[key] = value;
                });
            }
            return {
                format: DATA_BACKUP_FORMAT,
                version: DATA_BACKUP_VERSION,
                scope,
                createdAt: new Date().toISOString(),
                data
            };
        }

        function downloadBackup(scope = 'all') {
            try {
                const backup = makeBackup(scope);
                const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                const stamp = new Date().toISOString().replace(/[:.]/g, '-');
                a.href = url;
                a.download = `diorama-${scope}-backup-${stamp}.json`;
                a.style.display = 'none';
                document.body.appendChild(a);
                // Keep the settings popover open; the synthetic download click is not an outside user click.
                a.addEventListener('click', event => event.stopPropagation(), { once: true });
                a.click();
                a.remove();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
                setDataManagerStatus(scope === 'all' ? 'Tam yedek indirilmeye hazırlandı.' : `${scope === 'tasks' ? 'Görev' : scope === 'notes' ? 'Not' : 'Kısayol'} yedeği indirilmeye hazırlandı.`, 'success');
            } catch (error) {
                setDataManagerStatus(`Yedek oluşturulamadı: ${error.message || 'Bilinmeyen hata'}`, 'error');
            }
        }

        // ============================================================================
// BÖLÜM SONU: YEDEK DIŞA AKTARMA
// BÖLÜM BAŞI: İÇE AKTARILAN JSON'UN ŞEMA VE VERİ DOĞRULAMASI
// ============================================================================

        function isPlainRecord(value) {
            return value !== null && typeof value === 'object' && !Array.isArray(value);
        }

        function validateBackupObject(raw) {
            if (!isPlainRecord(raw) || raw.format !== DATA_BACKUP_FORMAT || raw.version !== DATA_BACKUP_VERSION || !isPlainRecord(raw.data)) {
                throw new Error('Dosya bu uygulamanın desteklediği bir yedek biçiminde değil.');
            }
            const allowedScopes = new Set(['all', 'tasks', 'notes', 'shortcuts']);
            if (!allowedScopes.has(raw.scope)) throw new Error('Yedek kapsamı tanınmıyor.');

            const clean = {};
            if (Object.prototype.hasOwnProperty.call(raw.data, 'tasks')) {
                if (!Array.isArray(raw.data.tasks) || raw.data.tasks.length > 1000) throw new Error('Görev listesi geçersiz veya çok büyük.');
                clean.tasks = raw.data.tasks.map((item, index) => {
                    if (!isPlainRecord(item) || typeof item.text !== 'string' || item.text.trim().length < 1 || item.text.length > 10000 || typeof item.done !== 'boolean') {
                        throw new Error(`${index + 1}. görev doğrulanamadı.`);
                    }
                    const priority = ['normal', 'high', 'low'].includes(item.priority) ? item.priority : 'normal';
                    return { text: item.text.trim(), done: item.done, priority };
                });
            }
            if (Object.prototype.hasOwnProperty.call(raw.data, 'notes')) {
                if (!Array.isArray(raw.data.notes) || raw.data.notes.length > 500) throw new Error('Not listesi geçersiz veya çok büyük.');
                clean.notes = raw.data.notes.map((item, index) => {
                    if (!isPlainRecord(item) || typeof item.body !== 'string' || item.body.trim().length < 1 || item.body.length > 20000) {
                        throw new Error(`${index + 1}. not doğrulanamadı.`);
                    }
                    const title = typeof item.title === 'string' ? item.title.slice(0, 300) : 'Not';
                    const date = typeof item.date === 'string' ? item.date.slice(0, 100) : '';
                    return { title, body: item.body, date };
                });
            }
            if (Object.prototype.hasOwnProperty.call(raw.data, 'shortcuts')) {
                if (!Array.isArray(raw.data.shortcuts) || raw.data.shortcuts.length > 100) throw new Error('Kısayol listesi geçersiz veya çok büyük.');
                clean.shortcuts = raw.data.shortcuts.map((item, index) => {
                    if (!isPlainRecord(item) || typeof item.name !== 'string' || !item.name.trim() || item.name.length > 80 || typeof item.url !== 'string' || item.url.length > 2048) {
                        throw new Error(`${index + 1}. kısayol doğrulanamadı.`);
                    }
                    const url = normalizeWebUrl(item.url, { addHttps: false });
                    if (!url) throw new Error(`${index + 1}. kısayolda yalnızca güvenli HTTP/HTTPS adreslerine izin verilir.`);
                    return { name: item.name.trim(), url, iconKey: 'globe' };
                });
            }
            if (Object.prototype.hasOwnProperty.call(raw.data, 'preferences')) {
                if (!isPlainRecord(raw.data.preferences)) throw new Error('Tercih ayarları okunamadı.');
                const prefs = {};
                const input = raw.data.preferences;
                if (input.diorama_theme !== undefined) {
                    if (!['light', 'dark'].includes(input.diorama_theme)) throw new Error('Tema ayarı geçersiz.');
                    prefs.diorama_theme = input.diorama_theme;
                }
                if (input.diorama_username !== undefined) {
                    if (typeof input.diorama_username !== 'string' || input.diorama_username.length > 60) throw new Error('Kullanıcı adı ayarı geçersiz.');
                    prefs.diorama_username = input.diorama_username;
                }
                if (input.diorama_engine !== undefined) {
                    if (!DATA_ENGINE_IDS.has(input.diorama_engine)) throw new Error('Arama motoru ayarı geçersiz.');
                    prefs.diorama_engine = input.diorama_engine;
                }
                if (input.diorama_city !== undefined) {
                    if (typeof input.diorama_city !== 'string' || !input.diorama_city.trim() || input.diorama_city.length > 80) throw new Error('Şehir ayarı geçersiz.');
                    prefs.diorama_city = input.diorama_city.trim();
                }
                for (const key of ['diorama_wxfx', 'diorama_wx_autotheme']) {
                    if (input[key] !== undefined) {
                        if (!['on', 'off'].includes(input[key])) throw new Error(`${key} ayarı geçersiz.`);
                        prefs[key] = input[key];
                    }
                }
                if (input.diorama_pinned_habitat !== undefined) {
                    if (input.diorama_pinned_habitat !== '' && !DATA_HABITAT_IDS.has(input.diorama_pinned_habitat)) throw new Error('Sabitlenmiş habitat ayarı geçersiz.');
                    prefs.diorama_pinned_habitat = input.diorama_pinned_habitat;
                }
                if (input.diorama_ambient_volume !== undefined) {
                    const vol = Number(input.diorama_ambient_volume);
                    if (!Number.isInteger(vol) || vol < 5 || vol > 100) throw new Error('Ambiyans ses seviyesi ayarı geçersiz.');
                    prefs.diorama_ambient_volume = String(vol);
                }
                if (input.diorama_news_source_preferences_v1 !== undefined) {
                    if (typeof input.diorama_news_source_preferences_v1 !== 'string' || input.diorama_news_source_preferences_v1.length > 20000) throw new Error('Haber kaynak tercihleri geçersiz.');
                    let parsed;
                    try { parsed = JSON.parse(input.diorama_news_source_preferences_v1); } catch { throw new Error('Haber kaynak tercihleri okunamadı.'); }
                    if (!isPlainRecord(parsed) || Object.entries(parsed).some(([id, enabled]) => !/^[a-z0-9-]{1,80}$/.test(id) || typeof enabled !== 'boolean') || Object.keys(parsed).length > 200) throw new Error('Haber kaynak tercihleri doğrulanamadı.');
                    prefs.diorama_news_source_preferences_v1 = JSON.stringify(normalizeNewsPreferences(parsed));
                }
                if (input.diorama_news_custom_sources_v1 !== undefined) {
                    if (typeof input.diorama_news_custom_sources_v1 !== 'string' || input.diorama_news_custom_sources_v1.length > 100000) throw new Error('Özel haber kaynakları geçersiz.');
                    let parsed;
                    try { parsed = JSON.parse(input.diorama_news_custom_sources_v1); } catch { throw new Error('Özel haber kaynakları okunamadı.'); }
                    if (!isPlainRecord(parsed)) throw new Error('Özel haber kaynağı listesi doğrulanamadı.');
                    const cleanCustom = {};
                    let customTotal = 0;
                    for (const categoryId of NEWS_CATEGORY_IDS) {
                        const rawSources = parsed[categoryId] ?? [];
                        if (!Array.isArray(rawSources) || rawSources.length > 20) throw new Error(`${categoryId} özel kaynak listesi geçersiz.`);
                        const normalized = normalizeCustomSources(rawSources, categoryId, 20);
                        if (normalized.length !== rawSources.length) throw new Error(`${categoryId} özel kaynaklarından biri doğrulanamadı.`);
                        cleanCustom[categoryId] = normalized.map(({ id, publisher, rss, homepage, enabled }) => ({ id, publisher, rss, homepage, enabled }));
                        customTotal += normalized.length;
                    }
                    if (customTotal > 20) throw new Error('Özel kaynak toplam sınırı aşılıyor.');
                    prefs.diorama_news_custom_sources_v1 = JSON.stringify(cleanCustom);
                }
                if (input.diorama_calendar_events_v1 !== undefined) {
                    if (typeof input.diorama_calendar_events_v1 !== 'string' || input.diorama_calendar_events_v1.length > 100000) {
                        throw new Error('Takvim etkinlikleri geçersiz.');
                    }
                    let calendarEvents;
                    try { calendarEvents = JSON.parse(input.diorama_calendar_events_v1); }
                    catch { throw new Error('Takvim etkinlikleri okunamadı.'); }
                    if (!Array.isArray(calendarEvents) || calendarEvents.length > 500) {
                        throw new Error('Takvim etkinlik listesi geçersiz veya çok büyük.');
                    }
                    const seenIds = new Set();
                    const cleanEvents = calendarEvents.map((item, index) => {
                        if (!isPlainRecord(item) || typeof item.id !== 'string' || !/^cal-[a-z0-9-]{8,72}$/i.test(item.id)
                            || seenIds.has(item.id) || typeof item.title !== 'string' || !item.title.trim() || item.title.length > 100
                            || typeof item.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(item.date)) {
                            throw new Error(`${index + 1}. takvim etkinliği doğrulanamadı.`);
                        }
                        const eventDate = new Date(`${item.date}T12:00:00`);
                        const dateKey = `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, '0')}-${String(eventDate.getDate()).padStart(2, '0')}`;
                        if (!Number.isFinite(eventDate.getTime()) || dateKey !== item.date) throw new Error(`${index + 1}. etkinliğin tarihi geçersiz.`);
                        if (item.time !== undefined && item.time !== '' && (typeof item.time !== 'string' || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(item.time))) {
                            throw new Error(`${index + 1}. etkinliğin saati geçersiz.`);
                        }
                        seenIds.add(item.id);
                        return { id: item.id, title: item.title.trim(), date: item.date, time: item.time || '' };
                    });
                    prefs.diorama_calendar_events_v1 = JSON.stringify(cleanEvents);
                }
                for (const key of ['diorama_news_read_ids_v1', 'diorama_news_saved_ids_v1']) {
                    if (input[key] !== undefined) {
                        if (typeof input[key] !== 'string' || input[key].length > 30000) throw new Error(`${key} ayarı geçersiz.`);
                        let ids;
                        try { ids = JSON.parse(input[key]); } catch { throw new Error(`${key} listesi okunamadı.`); }
                        if (!Array.isArray(ids) || ids.length > 500 || ids.some((id) => typeof id !== 'string' || !/^news-[a-z0-9]{1,16}$/.test(id))) throw new Error(`${key} listesi doğrulanamadı.`);
                        prefs[key] = JSON.stringify([...new Set(ids)]);
                    }
                }
                clean.preferences = prefs;
            }

            const expected = raw.scope === 'all'
                ? ['tasks', 'notes', 'shortcuts', 'preferences']
                : [raw.scope];
            for (const field of expected) {
                if (!Object.prototype.hasOwnProperty.call(clean, field)) throw new Error(`Yedekte ${field} verisi eksik.`);
            }
            return { scope: raw.scope, data: clean };
        }

        // ============================================================================
// BÖLÜM SONU: YEDEK VERİ DOĞRULAMA
// BÖLÜM BAŞI: DOĞRULANMIŞ YEDEĞİ GÜVENLİ ŞEKİLDE UYGULAMA
// ============================================================================

        function persistImportedBackup(validated) {
            const writes = {};
            if (validated.data.tasks) writes.diorama_tasks = JSON.stringify(validated.data.tasks);
            if (validated.data.notes) writes.diorama_notes = JSON.stringify(validated.data.notes);
            if (validated.data.shortcuts) writes.diorama_shortcuts = JSON.stringify(validated.data.shortcuts);
            if (validated.data.preferences) {
                Object.entries(validated.data.preferences).forEach(([key, value]) => { writes[key] = value; });
            }

            // A complete backup treats omitted preference keys as defaults, so stale
            // settings on the receiving device do not silently survive restoration.
            const removals = validated.scope === 'all'
                ? DATA_PREF_KEYS.filter(key => !Object.prototype.hasOwnProperty.call(validated.data.preferences || {}, key))
                : [];
            const touchedKeys = [...new Set([...Object.keys(writes), ...removals])];
            const previous = {};
            touchedKeys.forEach(key => { previous[key] = lsRaw(key); });
            try {
                Object.entries(writes).forEach(([key, value]) => localStorage.setItem(key, value));
                removals.forEach(key => localStorage.removeItem(key));
            } catch (error) {
                Object.entries(previous).forEach(([key, value]) => {
                    try {
                        if (value === null) localStorage.removeItem(key);
                        else localStorage.setItem(key, value);
                    } catch (_) { /* Best-effort rollback if browser storage is full. */ }
                });
                throw new Error(error && error.name === 'QuotaExceededError'
                    ? 'Tarayıcı depolama alanı yetersiz. Mevcut veriler korunmaya çalışıldı.'
                    : 'Yedek kaydedilemedi. Tarayıcı depolama iznini kontrol et.');
            }
        }

        document.getElementById('exportAllDataBtn').addEventListener('click', () => downloadBackup('all'));
        document.querySelectorAll('.data-export-scope').forEach(btn => {
            btn.addEventListener('click', () => downloadBackup(btn.dataset.exportScope));
        });

        document.getElementById('importDataFile').addEventListener('change', async (event) => {
            const file = event.target.files && event.target.files[0];
            if (!file) return;
            if (file.size > 5 * 1024 * 1024) {
                setDataManagerStatus('Yedek dosyası 5 MB sınırını aşıyor.', 'error');
                event.target.value = '';
                return;
            }
            try {
                const raw = JSON.parse(await file.text());
                const validated = validateBackupObject(raw);
                const groupNames = validated.scope === 'all' ? 'görevler, notlar, kısayollar, takvim ve tercihler' : ({ tasks: 'görevler', notes: 'notlar', shortcuts: 'kısayollar' })[validated.scope];
                const ok = window.confirm(`Bu yedek ${groupNames} verilerinin mevcut kayıtlarının üzerine yazacak. Devam edilsin mi?`);
                if (!ok) return;
                persistImportedBackup(validated);
                setDataManagerStatus('Yedek doğrulandı ve kaydedildi. Ayarların tamamını uygulamak için sayfa yenileniyor…', 'success');
                setTimeout(() => window.location.reload(), 900);
            } catch (error) {
                setDataManagerStatus(error instanceof SyntaxError ? 'JSON dosyası okunamadı; dosya bozuk olabilir.' : (error.message || 'Yedek geri yüklenemedi.'), 'error');
            } finally {
                event.target.value = '';
            }
        });

        document.getElementById('clearTasksDataBtn').addEventListener('click', () => {
            if (!window.confirm('Bütün görevler kalıcı olarak silinsin mi? Önce yedek almanı öneririm.')) return;
            setTasks([]);
            renderTasks();
            updateDataManagerStats();
            setDataManagerStatus('Görev listesi temizlendi.', 'success');
        });
        document.getElementById('clearNotesDataBtn').addEventListener('click', () => {
            if (!window.confirm('Bütün notlar kalıcı olarak silinsin mi? Önce yedek almanı öneririm.')) return;
            setNotes([]);
            renderNotes();
            updateDataManagerStats();
            setDataManagerStatus('Not defteri temizlendi.', 'success');
        });
        document.getElementById('resetShortcutsDataBtn').addEventListener('click', () => {
            if (!window.confirm('Kısayollar varsayılan listeyle değiştirilsin mi? Eklediğin kısayollar silinecek.')) return;
            setShortcuts(DEFAULT_SHORTCUTS.map(item => ({ ...item })));
            lsSet('diorama_shortcuts', shortcuts);
            renderShortcuts();
            updateDataManagerStats();
            setDataManagerStatus('Kısayollar varsayılan listeye döndürüldü.', 'success');
        });
        document.getElementById('clearAllAppDataBtn').addEventListener('click', () => {
            if (!window.confirm('DİKKAT: Bu işlem görevleri, notları, kısayolları, tercihleri ve önbellekleri bu tarayıcıdan siler. Önce tam yedek aldığından emin misin?')) return;
            try {
                const keys = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && key.startsWith('diorama_')) keys.push(key);
                }
                keys.forEach(key => localStorage.removeItem(key));
                setDataManagerStatus('Uygulama verileri temizlendi. Sayfa varsayılan ayarlarla yeniden açılıyor…', 'success');
                setTimeout(() => window.location.reload(), 900);
            } catch (error) {
                setDataManagerStatus('Veriler temizlenemedi. Tarayıcı izinlerini kontrol et.', 'error');
            }
        });

        updateDataManagerStats();

        
registerDataManagerStatsUpdater(updateDataManagerStats);

// ============================================================================
// BÖLÜM SONU: DOĞRULANMIŞ YEDEĞİ UYGULAMA
// ============================================================================
