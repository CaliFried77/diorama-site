import { lsGet, lsSet, lsRaw, lsPut, esc, normalizeWebUrl, normalizeShortcutList } from './storage.js';
import { invalidateBackgroundCache } from './scene-state.js';
import { refreshWeatherPreviewButtons, refreshDataManagerStats } from './services.js';

/* CORE-UI — Living Pixel Diorama
   Native ES module. Cross-file dependencies are declared with imports and exports. */
        /* ============================================================================
           1. CUSTOM MONOCHROME SVG ICON REGISTRY (ZERO EMOJIS)
           ============================================================================ */

        // ============================================================================
// BÖLÜM BAŞI: ORTAK SVG İKON KATALOĞU
// ============================================================================

export const SVG_ICONS = {
            google: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2c2.7 0 5.15 1.07 6.95 2.81L16.1 7.66C15.05 6.64 13.6 6 12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.97 0 5.43-2.16 5.91-5H12v-4h9.86c.09.65.14 1.32.14 2 0 5.523-4.477 10-10 10z"/></svg>`,
            duckduckgo: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M9 10a1 1 0 100-2 1 1 0 000 2z"/><path d="M15 10c1.5 0 2.5.5 2.5 1.5S16.5 13 15 13H9c-1.5 0-2-.5-2-1.5"/></svg>`,
            youtube: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="5" width="20" height="14" rx="4"/><polygon points="10 9 15 12 10 15 10 9" fill="currentColor"/></svg>`,
            perplexity: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2v20M4.93 4.93l14.14 14.14M2 12h20M4.93 19.07L19.07 4.93"/></svg>`,
            github: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22"/></svg>`,
            weatherClear: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>`,
            weatherCloud: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17.5 19H9a7 7 0 116.71-9h1.79a4.5 4.5 0 110 9z"/></svg>`,
            weatherRain: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 16.2A4.5 4.5 0 0017.5 8h-1.8A7 7 0 104 14.9"/><path d="M16 14v5M8 14v5M12 16v5" stroke-linecap="round"/></svg>`,
            sun: `<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>`,
            moon: `<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>`
        };

        // ============================================================================
// BÖLÜM SONU: SVG İKON KATALOĞU
// BÖLÜM BAŞI: TEMA VE ZEN MODU
// ============================================================================

/* ============================================================================
           1B. DAY / NIGHT (AYDINLIK / KARANLIK) THEME ENGINE
           ============================================================================ */
        export let isLightMode = lsRaw('diorama_theme') === 'light';
        const themeToggleBtn = document.getElementById('themeToggleBtn');
        const themeIconSlot = document.getElementById('themeIconSlot');
        const themeModeLabel = document.getElementById('themeModeLabel');

        function applyThemeMode() {
            document.body.classList.toggle('theme-light', isLightMode);
            const themeColor = document.querySelector('meta[name="theme-color"]');
            if (themeColor) themeColor.setAttribute('content', isLightMode ? '#dbeafe' : '#04070d');
            themeIconSlot.innerHTML = isLightMode ? SVG_ICONS.sun : SVG_ICONS.moon;
            themeIconSlot.className = isLightMode
                ? 'w-3.5 h-3.5 flex items-center justify-center text-amber-300'
                : 'w-3.5 h-3.5 flex items-center justify-center text-sky-300';
            themeModeLabel.textContent = isLightMode ? 'Gündüz' : 'Gece';
        }
        applyThemeMode();

        themeToggleBtn.addEventListener('click', () => {
            isLightMode = !isLightMode;
            lsPut('diorama_theme', isLightMode ? 'light' : 'dark');
            applyThemeMode();
            invalidateBackgroundCache();
            refreshWeatherPreviewButtons();
        });

        // Update the pointer sheen only on the glass surface under the pointer.
        // The previous all-cards loop forced layout reads for every card on every mouse move.
        let activeGlassPointer = null;
        function clearGlassPointer(el) {
            if (!el) return;
            el.style.setProperty('--mouse-x', '-200px');
            el.style.setProperty('--mouse-y', '-200px');
        }
        document.addEventListener('pointermove', (e) => {
            if (document.body.classList.contains('zen-active')) {
                const targetElement = e.target instanceof Element ? e.target : null;
                const openSurface = targetElement?.closest('.popover-panel.open, #shortcutModal[aria-hidden="false"]');
                if (e.clientY <= 76 || openSurface) {
                    document.body.classList.add('zen-revealed');
                } else if (e.clientY > 112) {
                    document.body.classList.remove('zen-revealed');
                }
            }

            const target = e.target instanceof Element ? e.target.closest('.optical-glass') : null;
            if (target !== activeGlassPointer) {
                clearGlassPointer(activeGlassPointer);
                activeGlassPointer = target;
            }
            if (!target) return;
            const rect = target.getBoundingClientRect();
            target.style.setProperty('--mouse-x', `${(e.clientX - rect.left).toFixed(1)}px`);
            target.style.setProperty('--mouse-y', `${(e.clientY - rect.top).toFixed(1)}px`);
        }, { passive: true });
        document.addEventListener('pointerout', (e) => {
            const current = e.target instanceof Element ? e.target.closest('.optical-glass') : null;
            const next = e.relatedTarget instanceof Element ? e.relatedTarget.closest('.optical-glass') : null;
            if (current && current !== next) {
                clearGlassPointer(current);
                if (activeGlassPointer === current) activeGlassPointer = null;
            }
        }, { passive: true });

        /* Zen Mode Toggle */
        const zenModeBtn = document.getElementById('zenModeBtn');
        const zenEyeIcon = document.getElementById('zenEyeIcon');
        export function toggleZenMode() {
            const active = document.body.classList.toggle('zen-active');
            document.body.classList.remove('zen-revealed');
            if (active) closeAllPopovers();
            zenModeBtn.setAttribute('aria-pressed', active ? 'true' : 'false');
            zenEyeIcon.innerHTML = active
                ? `<path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>`
                : `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>`;
        }
        zenModeBtn.addEventListener('click', toggleZenMode);

        // ============================================================================
// BÖLÜM SONU: TEMA VE ZEN MODU
// ============================================================================

/* ============================================================================
           2. CLOCK, TURKISH GREETING & USER NAME
           ============================================================================ */
        // ============================================================================
// BÖLÜM BAŞI: SAAT, TARİH VE GÜNÜN SELAMLAMASI
// ============================================================================

const heroClock = document.getElementById('heroClock');
        const heroDate = document.getElementById('heroDate');
        const greetingLabel = document.getElementById('greetingLabel');
        const editableUserName = document.getElementById('editableUserName');

        const savedUserName = lsRaw('diorama_username');
        if (savedUserName) editableUserName.textContent = savedUserName;

        editableUserName.addEventListener('input', () => {
            lsPut('diorama_username', editableUserName.textContent.trim() || 'Gezgin');
        });
        editableUserName.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                editableUserName.blur();
            }
        });

        function updateClockAndGreeting() {
            const now = new Date();
            const h = now.getHours();
            const m = String(now.getMinutes()).padStart(2, '0');
            heroClock.textContent = `${String(h).padStart(2, '0')}:${m}`;
            heroDate.textContent = now.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' });

            if (h >= 0 && h < 5) greetingLabel.textContent = 'İyi geceler';
            else if (h >= 5 && h < 12) greetingLabel.textContent = 'Günaydın';
            else if (h >= 12 && h < 18) greetingLabel.textContent = 'İyi günler';
            else greetingLabel.textContent = 'İyi akşamlar';
        }
        updateClockAndGreeting();
        setInterval(updateClockAndGreeting, 10000);

        // ============================================================================
// BÖLÜM SONU: SAAT, TARİH VE SELAMLAMA
// BÖLÜM BAŞI: ÇOKLU ARAMA MOTORU
// ============================================================================

/* ============================================================================
           3. MULTI-ENGINE SEARCH BAR (WITH CUSTOM SVG BADGES & ARROW CYCLING)
           ============================================================================ */
        const ENGINES = {
            google: { svg: SVG_ICONS.google, placeholder: "Google'da ara veya bir adres yaz...", url: q => `https://www.google.com/search?q=${q}` },
            duckduckgo: { svg: SVG_ICONS.duckduckgo, placeholder: "DuckDuckGo ile gizli ara...", url: q => `https://duckduckgo.com/?q=${q}` },
            youtube: { svg: SVG_ICONS.youtube, placeholder: "YouTube'da video veya kanal ara...", url: q => `https://www.youtube.com/results?search_query=${q}` },
            perplexity: { svg: SVG_ICONS.perplexity, placeholder: "Perplexity ile araştır...", url: q => `https://www.perplexity.ai/search?q=${q}` },
            github: { svg: SVG_ICONS.github, placeholder: "GitHub'da proje veya kod ara...", url: q => `https://github.com/search?q=${q}` }
        };
        const engineKeys = Object.keys(ENGINES);
        let activeEngine = lsRaw('diorama_engine') || 'google';

        const searchForm = document.getElementById('searchForm');
        const searchInput = document.getElementById('searchInput');
        const activeEngineBadge = document.getElementById('activeEngineBadge');
        const engineChips = document.querySelectorAll('.engine-chip');

        function setSearchEngine(eng) {
            if (!ENGINES[eng]) eng = 'google';
            activeEngine = eng;
            lsPut('diorama_engine', eng);
            activeEngineBadge.innerHTML = ENGINES[eng].svg;
            searchInput.placeholder = ENGINES[eng].placeholder;

            engineChips.forEach(chip => {
                const selected = chip.dataset.engine === eng;
                chip.setAttribute('aria-pressed', selected ? 'true' : 'false');
                if (selected) {
                    chip.className = 'engine-chip px-2.5 py-1 rounded-xl text-xs font-pixel tracking-wide bg-white/25 text-white border border-white/30 transition';
                } else {
                    chip.className = 'engine-chip px-2.5 py-1 rounded-xl text-xs font-pixel tracking-wide text-white/70 hover:text-white border border-transparent transition';
                }
            });
        }
        setSearchEngine(activeEngine);

        engineChips.forEach(chip => {
            chip.addEventListener('click', () => {
                setSearchEngine(chip.dataset.engine);
                searchInput.focus();
            });
        });

        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                const step = e.key === 'ArrowDown' ? 1 : -1;
                const nextIdx = (engineKeys.indexOf(activeEngine) + step + engineKeys.length) % engineKeys.length;
                setSearchEngine(engineKeys[nextIdx]);
            }
        });

        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const val = searchInput.value.trim();
            if (!val) return;
            if (/^(https?:\/\/)?([\w-]+\.)+[a-z]{2,}(:\d+)?([\/?#]\S*)?$/i.test(val) && !val.includes(' ')) {
                const destination = normalizeWebUrl(val);
                if (destination) { window.location.assign(destination); return; }
            }
            window.location.href = ENGINES[activeEngine].url(encodeURIComponent(val));
        });

        // ============================================================================
// BÖLÜM SONU: ÇOKLU ARAMA MOTORU
// BÖLÜM BAŞI: KISAYOL PANELİ VE DÜZENLEME PENCERESİ
// ============================================================================

/* ============================================================================
           4. TEXT-ONLY MINIMALIST OPTICAL LIQUID GLASS SHORTCUT DOCK (ZERO ICONS)
           ============================================================================ */
        export const DEFAULT_SHORTCUTS = [
            { name: 'YouTube', url: 'https://www.youtube.com' },
            { name: 'Gmail', url: 'https://mail.google.com' },
            { name: 'WhatsApp', url: 'https://web.whatsapp.com' },
            { name: 'GitHub', url: 'https://github.com' },
            { name: 'ChatGPT', url: 'https://chatgpt.com' },
            { name: 'X', url: 'https://x.com' },
            { name: 'Spotify', url: 'https://open.spotify.com' }
        ];

        export let shortcuts = normalizeShortcutList(lsGet('diorama_shortcuts', null), DEFAULT_SHORTCUTS);
        const shortcutsGrid = document.getElementById('shortcutsGrid');
        export const shortcutModal = document.getElementById('shortcutModal');
        const shortcutForm = document.getElementById('shortcutForm');

        let shortcutModalOpener = null;
        let editingShortcutIdx = null;
        function openShortcutModal(trigger, editIdx = null) {
            shortcutModalOpener = trigger || document.activeElement;
            editingShortcutIdx = Number.isInteger(editIdx) && editIdx >= 0 && editIdx < shortcuts.length ? editIdx : null;
            const titleEl = document.getElementById('shortcutModalTitle');
            const nameInput = document.getElementById('shortcutNameInput');
            const urlInput = document.getElementById('shortcutUrlInput');
            const submitBtn = shortcutForm.querySelector('button[type="submit"]');
            if (editingShortcutIdx !== null) {
                if (titleEl) titleEl.textContent = 'Kısayolu Düzenle';
                if (submitBtn) submitBtn.textContent = 'Kaydet';
                nameInput.value = shortcuts[editingShortcutIdx].name;
                urlInput.value = shortcuts[editingShortcutIdx].url;
            } else {
                if (titleEl) titleEl.textContent = 'Yeni Kısayol Ekle';
                if (submitBtn) submitBtn.textContent = 'Ekle';
                shortcutForm.reset();
            }
            urlInput.setCustomValidity('');
            shortcutModal.classList.remove('hidden');
            shortcutModal.classList.add('flex');
            shortcutModal.setAttribute('aria-hidden', 'false');
            shortcutModal.inert = false;
            requestAnimationFrame(() => nameInput.focus());
        }

        export function closeShortcutModal(restoreFocus = true) {
            if (shortcutModal.classList.contains('hidden')) return;
            shortcutModal.classList.add('hidden');
            shortcutModal.classList.remove('flex');
            shortcutModal.setAttribute('aria-hidden', 'true');
            shortcutModal.inert = true;
            editingShortcutIdx = null;
            const target = shortcutModalOpener;
            shortcutModalOpener = null;
            if (restoreFocus && target && target.isConnected) target.focus();
        }

        export let cachedGlassCards = [];
        export function refreshGlassCardCache() {
            // Cache the canvas and 2D context once. Dynamic shortcut cards refresh this list
            // whenever they are re-rendered, so the animation loop performs no DOM queries.
            cachedGlassCards = Array.from(document.querySelectorAll('.optical-glass'))
                .map((el) => {
                    const lens = el.querySelector('canvas.glass-lens');
                    if (!lens) return null;
                    const ctx = lens.getContext('2d', { alpha: true });
                    return ctx ? { el, lens, ctx, width: lens.width, height: lens.height, glowState: null } : null;
                })
                .filter(Boolean);
        }

        export function renderShortcuts() {
            shortcutsGrid.replaceChildren();
            shortcuts.forEach((item, index) => {
                const card = document.createElement('div');
                card.className = 'shortcut-card optical-glass rounded-2xl group relative hover:-translate-y-0.5';
                const lens = document.createElement('canvas');
                lens.className = 'glass-lens';
                lens.setAttribute('aria-hidden', 'true');
                const link = document.createElement('a');
                link.href = item.url;
                link.className = 'flex items-center justify-center px-4 py-2 rounded-2xl';
                link.setAttribute('aria-label', `${item.name} sitesini aç`);
                const label = document.createElement('span');
                label.className = 'font-pixel text-xs sm:text-[13px] font-medium text-white/95 group-hover:text-amber-200 tracking-wide truncate max-w-[120px] transition';
                label.textContent = item.name;
                link.appendChild(label);
                link.title = `${item.name} (Düzenlemek için sağ tıkla)`;
                link.addEventListener('contextmenu', (event) => {
                    event.preventDefault();
                    openShortcutModal(link, index);
                });
                const remove = document.createElement('button');
                remove.type = 'button';
                remove.setAttribute('aria-label', `${item.name} kısayolunu kaldır`);
                remove.className = 'del-shortcut-btn absolute -top-1 -right-1 w-4 h-4 rounded-full bg-black/75 text-[9px] text-white/75 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 [@media(hover:none)]:opacity-100 transition';
                remove.textContent = '✕';
                remove.addEventListener('click', (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    shortcuts.splice(index, 1);
                    lsSet('diorama_shortcuts', shortcuts);
                    renderShortcuts();
                });
                card.append(lens, link, remove);
                shortcutsGrid.appendChild(card);
            });

            const addBtn = document.createElement('button');
            addBtn.type = 'button';
            addBtn.className = 'shortcut-card optical-glass rounded-2xl px-3.5 py-2 flex items-center justify-center text-white/75 hover:text-white hover:-translate-y-0.5';
            const addLens = document.createElement('canvas');
            addLens.className = 'glass-lens';
            addLens.setAttribute('aria-hidden', 'true');
            const addLabel = document.createElement('span');
            addLabel.className = 'font-pixel text-xs tracking-wide';
            addLabel.textContent = '+ Ekle';
            addBtn.append(addLens, addLabel);
            addBtn.addEventListener('click', () => openShortcutModal(addBtn));
            shortcutsGrid.appendChild(addBtn);
            refreshGlassCardCache();
        }
        renderShortcuts();

        document.getElementById('closeShortcutModalBtn').addEventListener('click', () => closeShortcutModal());

        shortcutForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('shortcutNameInput').value.trim();
            let url = document.getElementById('shortcutUrlInput').value.trim();
            if (!name || name.length > 80 || !url) {
                if (name.length > 80) document.getElementById('shortcutNameInput').setCustomValidity('Başlık en fazla 80 karakter olabilir');
                return;
            }
            const urlEl = document.getElementById('shortcutUrlInput');
            url = normalizeWebUrl(url);
            if (!url) { urlEl.setCustomValidity('Yalnızca geçerli HTTP veya HTTPS adresleri kullanılabilir'); urlEl.reportValidity(); return; }
            urlEl.setCustomValidity('');
            if (editingShortcutIdx !== null && editingShortcutIdx >= 0 && editingShortcutIdx < shortcuts.length) {
                shortcuts[editingShortcutIdx] = { name, url, iconKey: 'globe' };
            } else {
                shortcuts.push({ name, url, iconKey: 'globe' });
            }
            lsSet('diorama_shortcuts', shortcuts);
            renderShortcuts();
            shortcutForm.reset();
            closeShortcutModal(false);
            const newAddButton = shortcutsGrid.querySelector('button:last-child');
            if (newAddButton) newAddButton.focus();
        });

        // ============================================================================
// BÖLÜM SONU: KISAYOL PANELİ
// BÖLÜM BAŞI: POPOVER AÇMA/KAPATMA VE ORTAK ARAYÜZ DURUMU
// ============================================================================

/* ============================================================================
           5. POPOVER MANAGEMENT AND SHARED OPEN/CLOSE BEHAVIOR
           ============================================================================ */
        export const popovers = [
            { btn: document.getElementById('habitatMenuBtn'), panel: document.getElementById('habitatPopover') },
            { btn: document.getElementById('newsBtn'), panel: document.getElementById('newsPopover') },
            { btn: document.getElementById('weatherBtn'), panel: document.getElementById('weatherPopover') },
            { btn: document.getElementById('focusBtn'), panel: document.getElementById('focusPopover') },
            { btn: document.getElementById('calendarBtn'), panel: document.getElementById('calendarPopover') },
            { btn: document.getElementById('notesBtn'), panel: document.getElementById('notesPopover') },
            { btn: document.getElementById('dataManagerBtn'), panel: document.getElementById('dataManagerPopover') }
        ];

        export function setPopoverOpen(entry, open, restoreFocus = false) {
            entry.panel.classList.toggle('open', open);
            entry.panel.setAttribute('aria-hidden', open ? 'false' : 'true');
            entry.panel.inert = !open;
            entry.btn.setAttribute('aria-expanded', open ? 'true' : 'false');
            if (!open && restoreFocus && entry.panel.contains(document.activeElement)) entry.btn.focus();
        }

        export function closeAllPopovers(restoreFocus = false) {
            popovers.forEach(p => setPopoverOpen(p, false, restoreFocus));
        }

        popovers.forEach((entry) => {
            entry.btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const shouldOpen = !entry.panel.classList.contains('open');
                popovers.forEach(p => setPopoverOpen(p, false));
                if (shouldOpen) {
                    if (entry.panel.id === 'dataManagerPopover') refreshDataManagerStats();
                    setPopoverOpen(entry, true);
                }
            });
            entry.panel.addEventListener('click', (e) => e.stopPropagation());
        });

        document.addEventListener('click', () => {
            popovers.forEach(p => setPopoverOpen(p, false));
        });

        
// Public setter used by weather auto-theme without mutating an imported binding.
export function setLightMode(next) {
    isLightMode = Boolean(next);
    applyThemeMode();
    invalidateBackgroundCache();
}

export function setShortcuts(next) {
    shortcuts = normalizeShortcutList(next, []);
}

// ============================================================================
// BÖLÜM SONU: POPOVER AÇMA/KAPATMA VE ORTAK ARAYÜZ DURUMU
// ============================================================================
