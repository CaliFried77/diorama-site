import { lsRaw, lsPut, lsGet, lsSet, esc } from './storage.js';
import { SVG_ICONS, isLightMode, setLightMode, closeAllPopovers } from './01-core-ui.js';
import { pw, ph, pRect, ctx, frameChance, shootingStars, frameScale, HABITATS, currentHabitatIdx } from './07-habitat-state.js';
import { invalidateBackgroundCache } from './scene-state.js';
import { registerWeatherPreviewRenderer } from './services.js';

/* WEATHER — Living Pixel Diorama
   Native ES module. Cross-file dependencies are declared with imports and exports. */
/* Live Weather Fetcher */
        let userCity = lsRaw('diorama_city') || 'Yalova';
        const weatherTemp = document.getElementById('weatherTemp');
        const weatherCity = document.getElementById('weatherCity');
        const weatherSvgContainer = document.getElementById('weatherSvgContainer');
        const weatherDetailText = document.getElementById('weatherDetailText');
        const weatherUpdatedText = document.getElementById('weatherUpdatedText');
        weatherSvgContainer.innerHTML = SVG_ICONS.weatherClear;

                /* ============================================================================
           WEATHER ENGINE: canlı veri, piksel ikonlar, sahne efektleri
           ============================================================================ */
        const WX = { ready: false, preview: null, live: null, data: null, cloud: 0, rain: 0, snow: 0, fog: 0, thunder: false,
                     wind: 0, wx: 0, isDay: true, sunP: .5, moonP: .5, moonPhase: 0, key: '', w: 0, h: 0,
                     clouds: [], drops: [], flakes: [], stars: [], streaks: [], flash: 0, bolt: null, boltT: 120 };
        let wxFxEnabled = lsRaw('diorama_wxfx') !== 'off';
        let wxAutoTheme = lsRaw('diorama_wx_autotheme') === 'on';
        export const wxFxOn = () => WX.ready && wxFxEnabled;
        const clamp01 = (v) => Math.max(0, Math.min(1, v));

        const WX_TR = { 0: 'Açık', 1: 'Çoğunlukla açık', 2: 'Parçalı bulutlu', 3: 'Kapalı', 45: 'Sisli', 48: 'Kırağılı sis', 51: 'Hafif çise', 53: 'Çise', 55: 'Yoğun çise',
            56: 'Dondurucu çise', 57: 'Dondurucu çise', 61: 'Hafif yağmur', 63: 'Yağmur', 65: 'Şiddetli yağmur', 66: 'Dondurucu yağmur', 67: 'Dondurucu yağmur',
            71: 'Hafif kar', 73: 'Kar yağışı', 75: 'Yoğun kar', 77: 'Kar taneleri', 80: 'Hafif sağanak', 81: 'Sağanak', 82: 'Şiddetli sağanak',
            85: 'Hafif kar sağanağı', 86: 'Kar sağanağı', 95: 'Gök gürültülü fırtına', 96: 'Dolulu fırtına', 99: 'Şiddetli dolulu fırtına' };
        function wxKind(c) {
            if (c <= 1) return 'clear'; if (c === 2) return 'partly'; if (c === 3) return 'cloud'; if (c === 45 || c === 48) return 'fog';
            if (c >= 95) return 'thunder'; if ((c >= 71 && c <= 77) || c === 85 || c === 86) return 'snow'; return 'rain';
        }
        function wxProfile(c, cloud) {
            const p = { cloud, rain: 0, snow: 0, fog: 0, thunder: false };
            if (c === 0) p.cloud = Math.min(cloud, 12); else if (c === 1) p.cloud = Math.min(cloud, 30);
            else if (c === 2) p.cloud = Math.max(35, Math.min(cloud, 70)); else if (c === 3) p.cloud = Math.max(cloud, 85);
            else if (c === 45 || c === 48) { p.fog = 1; p.cloud = Math.max(cloud, 55); }
            else if (c >= 51 && c <= 57) { p.rain = .3; p.cloud = Math.max(cloud, 70); }
            else if (c === 61 || c === 80) { p.rain = .5; p.cloud = Math.max(cloud, 80); }
            else if (c === 63 || c === 81 || c === 66) { p.rain = .75; p.cloud = Math.max(cloud, 90); }
            else if (c === 65 || c === 82 || c === 67) { p.rain = 1; p.cloud = 100; }
            else if ((c >= 71 && c <= 77) || c === 85 || c === 86) { p.snow = (c === 73 || c === 75 || c === 86) ? 1 : .5; p.cloud = Math.max(cloud, 75); }
            else if (c >= 95) { p.thunder = true; p.rain = c === 95 ? .8 : 1; p.cloud = 100; }
            return p;
        }

        /* ---- Piksel ikonlar (SVG, keskin kenarlı) ---- */
        const PX_PAL = { Y: '#fcd34d', O: '#f59e0b', W: '#f1f5f9', G: '#94a3b8', K: '#94a3b8', N: '#64748b', B: '#60a5fa', S: '#ffffff', L: '#fde047', M: '#fef08a' };
        const SPR = {
            sun: ['.....O.....', '.O...O...O.', '..O.YYY.O..', '...YYYYY...', 'O.YYYYYYY.O', 'OOYYYYYYYOO', 'O.YYYYYYY.O', '...YYYYY...', '..O.YYY.O..', '.O...O...O.', '.....O.....'],
            cloud: ['...WWW.....', '..WWWWW.WW.', '.WWWWWWWWWW', 'WWWWWWWWWWW', 'GGGGGGGGGGG'],
            rain: ['.B..B..B...', '..B..B..B..'], snow: ['.S..S..S...', '..S..S..S..'],
            bolt: ['....LL.....', '...LL......', '..LLLL.....', '....L......'], fog: ['WWWWWWWW...', '..WWWWWWWWW', 'WWWWWWW....'],
            moon: Array.from({ length: 11 }, (_, y) => Array.from({ length: 11 }, (_, x) => { const dx = x - 5, dy = y - 5; return dx * dx + dy * dy <= 25 && (dx - 2.5) ** 2 + (dy + 1.5) ** 2 > 18 ? 'M' : '.'; }).join(''))
        };
        const dark = (sp) => sp.map(r => r.replace(/W/g, 'K').replace(/G/g, 'N'));
        function pxIcon(kind, day = true, px = 28) {
            const body = day ? SPR.sun : SPR.moon, cd = dark(SPR.cloud);
            const L = { clear: [[body, 1, 0]], partly: [[body, 0, 0], [SPR.cloud, 2, 6]], cloud: [[SPR.cloud, 1, 3]], fog: [[SPR.cloud, 1, 1], [SPR.fog, 1, 6]],
                rain: [[cd, 1, 2], [SPR.rain, 1, 7]], snow: [[SPR.cloud, 1, 2], [SPR.snow, 1, 7]], thunder: [[cd, 1, 1], [SPR.bolt, 1, 6]] }[kind] || [];
            const W = 13, H = 12, g = Array.from({ length: H }, () => Array(W).fill('.'));
            L.forEach(([sp, ox, oy]) => sp.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== '.' && g[oy + y] && x + ox < W) g[oy + y][x + ox] = ch; })));
            let r = '';
            g.forEach((row, y) => { let x = 0; while (x < W) { const ch = row[x]; if (ch === '.') { x++; continue; } let e = x; while (e < W && row[e] === ch) e++; r += `<rect x="${x}" y="${y}" width="${e - x}" height="1" fill="${PX_PAL[ch]}"/>`; x = e; } });
            return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${px}" height="${Math.round(px * H / W)}" shape-rendering="crispEdges" aria-hidden="true">${r}</svg>`;
        }

        /* ---- Ay evresi ---- */
        function moonPhaseNow() { return (((Date.now() - Date.UTC(2000, 0, 6, 18, 14)) / 864e5) % 29.530588853 + 29.530588853) % 29.530588853 / 29.530588853; }
        function moonName(p) { return ['Yeni Ay', 'Hilal', 'İlk Dördün', 'Şişkin Ay', 'Dolunay', 'Şişkin Ay', 'Son Dördün', 'Hilal'][Math.round(p * 8) % 8]; }

        /* ---- Sahne durumu ---- */
        function wxApplyState(st) {
            const p = wxProfile(st.code, st.cloud);
            Object.assign(WX, p, { wind: st.wind, wx: -Math.sin(st.dir * Math.PI / 180) * Math.min(1, st.wind / 30), isDay: st.isDay, sunP: st.sunP, moonP: st.moonP, moonPhase: moonPhaseNow() });
        }
        const WX_PREVIEWS = [['clear', 'Açık', 0, 5], ['partly', 'Parçalı bulutlu', 2, 50], ['cloud', 'Kapalı', 3, 90], ['rain', 'Yağmur', 63, 85], ['thunder', 'Fırtına', 95, 100], ['snow', 'Kar', 73, 80], ['fog', 'Sis', 45, 60]];
        function setWxPreview(i) {
            WX.preview = i;
            if (i === null) { if (WX.live) wxApplyState(WX.live); }
            else { const [, , code, cloud] = WX_PREVIEWS[i]; wxApplyState({ code, cloud, wind: code >= 95 ? 30 : code === 63 ? 16 : 7, dir: 270, isDay: isLightMode, sunP: .45, moonP: .45 }); WX.ready = true; }
            renderWxPreviewButtons();
        }
        function renderWxPreviewButtons() {
            const box = document.getElementById('wxPreview');
            box.innerHTML = '';
            WX_PREVIEWS.forEach(([kind, label], i) => {
                const b = document.createElement('button');
                b.type = 'button'; b.title = label; b.setAttribute('aria-label', label + ' önizlemesi');
                b.className = 'p-1.5 rounded-lg border transition ' + (WX.preview === i ? 'bg-white/20 border-white/40' : 'bg-white/[0.05] border-white/10 hover:bg-white/10');
                b.innerHTML = pxIcon(kind, isLightMode, 22);
                b.addEventListener('click', () => setWxPreview(WX.preview === i ? null : i));
                box.appendChild(b);
            });
        }

        /* ---- Panel ---- */
        const DIRS = ['K', 'KD', 'D', 'GD', 'G', 'GB', 'B', 'KB'];
        const uvName = (u) => u < 3 ? 'Düşük' : u < 6 ? 'Orta' : u < 8 ? 'Yüksek' : u < 11 ? 'Çok yüksek' : 'Aşırı';
        const hhmm = (str) => str.slice(11, 16);
        function renderWeatherPanel() {
            const d = WX.data, c = d.current, dy = d.daily, hr = d.hourly;
            const kind = wxKind(c.weather_code), isDay = !!c.is_day;
            document.getElementById('wxBigIcon').innerHTML = pxIcon(kind, isDay, 64);
            document.getElementById('wxBigTemp').textContent = `${Math.round(c.temperature_2m)}°`;
            document.getElementById('wxCondition').textContent = WX_TR[c.weather_code] || 'Bilinmiyor';
            document.getElementById('weatherDetailText').textContent = `Hissedilen ${Math.round(c.apparent_temperature)}° • En yüksek ${Math.round(dy.temperature_2m_max[0])}°, en düşük ${Math.round(dy.temperature_2m_min[0])}°`;
            const stat = (l, v) => `<div class="rounded-xl bg-white/[0.05] border border-white/10 px-2.5 py-2"><p class="wx-stat-label text-[11px] text-white/60">${l}</p><p class="text-xs font-medium text-white mt-0.5">${esc(v)}</p></div>`;
            const uv = dy.uv_index_max[0];
            document.getElementById('wxStats').innerHTML = [
                stat('Nem', `%${Math.round(c.relative_humidity_2m)}`),
                stat('Rüzgar', `${Math.round(c.wind_speed_10m)} km/sa ${DIRS[Math.round(c.wind_direction_10m / 45) % 8]}`),
                stat('Yağış ihtimali', `%${dy.precipitation_probability_max[0] ?? 0}`),
                stat('UV', `${Math.round(uv)} • ${uvName(uv)}`),
                stat('Bulut', `%${Math.round(c.cloud_cover)}`),
                stat('Ay evresi', moonName(moonPhaseNow())),
                stat('Gün doğumu', hhmm(dy.sunrise[0])), stat('Gün batımı', hhmm(dy.sunset[0])), stat('Yağış', `${c.precipitation} mm`)
            ].join('');
            const srH = +hhmm(dy.sunrise[0]).slice(0, 2), ssH = +hhmm(dy.sunset[0]).slice(0, 2);
            let i0 = hr.time.indexOf(c.time.slice(0, 13) + ':00'); if (i0 < 0) i0 = 0;
            let h = '';
            for (let i = i0; i < Math.min(i0 + 12, hr.time.length); i++) {
                const hour = +hr.time[i].slice(11, 13), pr = hr.precipitation_probability[i] || 0;
                h += `<div class="shrink-0 w-[3.4rem] rounded-xl bg-white/[0.05] border border-white/10 py-1.5 flex flex-col items-center gap-1"><span class="text-[11px] text-white/60">${i === i0 ? 'Şimdi' : String(hour).padStart(2, '0') + ':00'}</span>${pxIcon(wxKind(hr.weather_code[i]), hour >= srH && hour < ssH, 22)}<span class="text-xs font-medium text-white">${Math.round(hr.temperature_2m[i])}°</span><span class="text-[11px] ${pr >= 30 ? 'text-sky-300' : 'text-transparent'}">%${pr}</span></div>`;
            }
            document.getElementById('wxHourly').innerHTML = h;
            const lo = Math.min(...dy.temperature_2m_min), hi = Math.max(...dy.temperature_2m_max);
            document.getElementById('wxDaily').innerHTML = dy.time.map((t, i) => {
                const name = i === 0 ? 'Bugün' : i === 1 ? 'Yarın' : new Date(t + 'T12:00:00Z').toLocaleDateString('tr-TR', { weekday: 'short', timeZone: 'UTC' });
                const a = dy.temperature_2m_min[i], b = dy.temperature_2m_max[i], pr = dy.precipitation_probability_max[i] || 0;
                return `<div class="flex items-center gap-2 text-xs text-white/85"><span class="w-12 shrink-0">${esc(name)}</span>${pxIcon(wxKind(dy.weather_code[i]), true, 20)}<span class="w-9 text-[11px] ${pr >= 30 ? 'text-sky-300' : 'text-white/45'}">%${pr}</span><span class="w-7 text-right text-white/60">${Math.round(a)}°</span><span class="relative flex-1 h-1.5 rounded-full bg-white/10"><span class="absolute h-full rounded-full bg-gradient-to-r from-sky-300 to-amber-300" style="left:${((a - lo) / (hi - lo || 1) * 100).toFixed(1)}%;width:${(Math.max(.08, (b - a) / (hi - lo || 1)) * 100).toFixed(1)}%"></span></span><span class="w-7">${Math.round(b)}°</span></div>`;
            }).join('');
        }

        function parseWeatherLocalTime(value) {
            if (typeof value !== 'string' || !value) return new Date(NaN);
            // Open-Meteo returns wall-clock ISO values for timezone=auto. Keeping them
            // on one neutral timeline makes sun-progress differences independent of
            // the device timezone; explicit offsets are preserved when present.
            return new Date(/[zZ]|[+-]\d{2}:?\d{2}$/.test(value) ? value : `${value}Z`);
        }

        function validWeatherPayload(data) {
            if (!data || typeof data !== 'object' || !data.current || !data.daily || !data.hourly) return false;
            const c = data.current, dy = data.daily, hr = data.hourly;
            const finite = value => typeof value === 'number' && Number.isFinite(value);
            const currentNumbers = ['temperature_2m', 'apparent_temperature', 'relative_humidity_2m', 'weather_code', 'wind_speed_10m', 'wind_direction_10m', 'is_day', 'cloud_cover', 'precipitation'];
            if (!currentNumbers.every(key => finite(c[key])) || typeof c.time !== 'string' || !Number.isFinite(Date.parse(c.time))) return false;
            if (Number(c.relative_humidity_2m) < 0 || Number(c.relative_humidity_2m) > 100 || ![0, 1].includes(Number(c.is_day))) return false;
            const dailyArrays = ['time', 'weather_code', 'temperature_2m_max', 'temperature_2m_min', 'sunrise', 'sunset', 'uv_index_max', 'precipitation_probability_max'];
            if (!dailyArrays.every(key => Array.isArray(dy[key]) && dy[key].length >= 2 && dy[key].length <= 10)) return false;
            const dailyLength = dy.time.length;
            if (!dailyArrays.every(key => dy[key].length === dailyLength)) return false;
            if (!['weather_code', 'temperature_2m_max', 'temperature_2m_min', 'uv_index_max', 'precipitation_probability_max'].every(key => dy[key].every(finite))) return false;
            if (!dy.time.every(value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value))) return false;
            if (!dy.sunrise.every(value => typeof value === 'string' && Number.isFinite(Date.parse(value))) || !dy.sunset.every(value => typeof value === 'string' && Number.isFinite(Date.parse(value)))) return false;
            const hourlyArrays = ['time', 'temperature_2m', 'weather_code', 'precipitation_probability'];
            if (!hourlyArrays.every(key => Array.isArray(hr[key]) && hr[key].length > 0 && hr[key].length <= 240)) return false;
            const hourlyLength = hr.time.length;
            if (!hourlyArrays.every(key => hr[key].length === hourlyLength)) return false;
            if (!['temperature_2m', 'weather_code', 'precipitation_probability'].every(key => hr[key].every(finite))) return false;
            if (!hr.time.every(value => typeof value === 'string' && Number.isFinite(Date.parse(value)))) return false;
            return true;
        }

        function applyWeather() {
            const d = WX.data; if (!validWeatherPayload(d)) return;
            const c = d.current, dy = d.daily, now = parseWeatherLocalTime(c.time), sr = parseWeatherLocalTime(dy.sunrise[0]), ss = parseWeatherLocalTime(dy.sunset[0]), isDay = !!c.is_day;
            let sunP = .5, moonP = .5;
            if (Number.isFinite(now.getTime()) && Number.isFinite(sr.getTime()) && Number.isFinite(ss.getTime())) {
                if (isDay && ss > sr) sunP = clamp01((now - sr) / (ss - sr));
                else if (now > ss) {
                    const nextSunrise = parseWeatherLocalTime(dy.sunrise[1]);
                    if (Number.isFinite(nextSunrise.getTime()) && nextSunrise > ss) moonP = clamp01((now - ss) / (nextSunrise - ss));
                } else {
                    const previousSunset = new Date(ss.getTime() - 864e5);
                    moonP = clamp01((now - previousSunset) / (sr - previousSunset));
                }
            }
            WX.live = { code: c.weather_code, cloud: c.cloud_cover, wind: c.wind_speed_10m, dir: c.wind_direction_10m, isDay, sunP, moonP };
            weatherTemp.textContent = `${Math.round(c.temperature_2m)}°C`;
            weatherSvgContainer.innerHTML = pxIcon(wxKind(c.weather_code), isDay, 20);
            weatherSvgContainer.className = 'w-5 h-5 flex items-center justify-center';
            renderWeatherPanel();
            if (WX.preview === null) { wxApplyState(WX.live); WX.ready = true; }
            if (wxAutoTheme && isLightMode !== isDay) { setLightMode(isDay); lsPut('diorama_theme', isDay ? 'light' : 'dark'); }
            renderWxPreviewButtons();
        }

        let weatherRequestSeq = 0;
        let weatherController = null;
        const WEATHER_CACHE_KEY = 'diorama_weather_cache';

        function setWeatherStatus(message, tone = 'normal') {
            weatherUpdatedText.textContent = message;
            weatherUpdatedText.className = `text-[10px] mt-1 ${tone === 'error' ? 'text-amber-200' : 'text-white/45'}`;
        }

        function weatherCacheIsValid(cache) {
            const age = cache && Number.isFinite(cache.fetchedAt) ? Date.now() - cache.fetchedAt : Infinity;
            return !!(cache && typeof cache.city === 'string' && cache.city &&
                age >= 0 && age <= 72 * 60 * 60 * 1000 && validWeatherPayload(cache.data));
        }

        function restoreWeatherCache() {
            const cache = lsGet(WEATHER_CACHE_KEY, null);
            if (!weatherCacheIsValid(cache)) return false;
            WX.data = cache.data;
            weatherCity.textContent = cache.city;
            applyWeather();
            const stamp = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(cache.fetchedAt));
            const age = Date.now() - cache.fetchedAt;
            setWeatherStatus(`${age > 6 * 60 * 60 * 1000 ? 'Eski önbellek' : 'Önbellek'} · ${stamp}`, age > 6 * 60 * 60 * 1000 ? 'error' : 'normal');
            return true;
        }

        async function fetchWeather(city, options = {}) {
            const requestedCity = String(city || '').trim().slice(0, 80);
            if (!requestedCity) return false;
            const requestId = ++weatherRequestSeq;
            if (weatherController) weatherController.abort();
            const controller = new AbortController();
            weatherController = controller;
            let timedOut = false;
            const timeoutId = setTimeout(() => { timedOut = true; controller.abort(); }, 12000);
            const isCurrentRequest = () => requestId === weatherRequestSeq;

            if (!options.silent) setWeatherStatus(`${requestedCity} aranıyor…`);
            try {
                if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new Error('offline');

                const geoResponse = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(requestedCity)}&count=1&language=tr&format=json`, {
                    signal: controller.signal,
                    cache: 'no-store',
                    credentials: 'omit',
                    referrerPolicy: 'no-referrer'
                });
                if (!geoResponse.ok) throw new Error(`Konum servisi HTTP ${geoResponse.status}`);
                const geo = await geoResponse.json();
                if (!isCurrentRequest()) return false;
                if (!geo || !Array.isArray(geo.results) || !geo.results.length) {
                    const currentCity = weatherCity.textContent;
                    setWeatherStatus(WX.data
                        ? `“${requestedCity}” bulunamadı · ${currentCity} gösterilmeye devam ediyor`
                        : `“${requestedCity}” için konum bulunamadı`, 'error');
                    return false;
                }

                const place = geo.results.find(item => Number.isFinite(Number(item.latitude)) && Number.isFinite(Number(item.longitude)));
                if (!place) throw new Error('Konum koordinatları geçersiz');
                const { latitude, longitude, name } = place;
                const q = `latitude=${encodeURIComponent(latitude)}&longitude=${encodeURIComponent(longitude)}&timezone=auto&forecast_days=5` +
                    `&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m,is_day,cloud_cover,precipitation` +
                    `&hourly=temperature_2m,weather_code,precipitation_probability` +
                    `&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_probability_max`;
                const weatherResponse = await fetch(`https://api.open-meteo.com/v1/forecast?${q}`, {
                    signal: controller.signal,
                    cache: 'no-store',
                    credentials: 'omit',
                    referrerPolicy: 'no-referrer'
                });
                if (!weatherResponse.ok) throw new Error(`Hava durumu servisi HTTP ${weatherResponse.status}`);
                const weatherData = await weatherResponse.json();
                if (!isCurrentRequest()) return false;
                if (!validWeatherPayload(weatherData)) throw new Error((weatherData && weatherData.reason) || 'Hava durumu verisi eksik veya geçersiz');

                WX.data = weatherData;
                weatherCity.textContent = name || requestedCity;
                applyWeather();
                userCity = name || requestedCity;
                lsPut('diorama_city', userCity);
                const fetchedAt = Date.now();
                lsSet(WEATHER_CACHE_KEY, { city: userCity, fetchedAt, data: WX.data });
                setWeatherStatus(`Güncellendi ${new Date(fetchedAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`);
                return true;
            } catch (error) {
                if (!isCurrentRequest()) return false;
                const offline = (typeof navigator !== 'undefined' && navigator.onLine === false) || error.message === 'offline';
                const hasLastGoodData = !!WX.data;
                const message = offline
                    ? (hasLastGoodData ? 'Çevrimdışı · son başarılı veri gösteriliyor' : 'Çevrimdışı · hava verisi henüz alınamadı')
                    : timedOut
                        ? (hasLastGoodData ? 'Yanıt zaman aşımı · son başarılı veri gösteriliyor' : 'Yanıt zaman aşımına uğradı · veri alınamadı')
                        : (hasLastGoodData ? 'Güncellenemedi · son başarılı veri gösteriliyor' : 'Hava verisi alınamadı · yeniden deneyebilirsin');
                setWeatherStatus(message, 'error');
                if (!WX.data) {
                    weatherTemp.textContent = '--°C';
                    weatherDetailText.textContent = 'Hava durumu verisi şu anda alınamıyor';
                }
                return false;
            } finally {
                clearTimeout(timeoutId);
                if (isCurrentRequest()) weatherController = null;
            }
        }

        restoreWeatherCache();
        fetchWeather(userCity, { silent: true });

        // Refresh on return to the tab and periodically while visible; never poll in the background.
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && typeof navigator !== 'undefined' && navigator.onLine) fetchWeather(userCity, { silent: true });
        });
        window.addEventListener('online', () => fetchWeather(userCity, { silent: true }));
        window.addEventListener('offline', () => setWeatherStatus('Çevrimdışı · son başarılı veri korunuyor', 'error'));
        setInterval(() => {
            if (!document.hidden && typeof navigator !== 'undefined' && navigator.onLine) fetchWeather(userCity, { silent: true });
        }, 30 * 60 * 1000);
        const fxBox = document.getElementById('wxFxToggle'), atBox = document.getElementById('wxAutoTheme');
        fxBox.checked = wxFxEnabled; atBox.checked = wxAutoTheme;
        fxBox.addEventListener('change', () => { wxFxEnabled = fxBox.checked; lsPut('diorama_wxfx', wxFxEnabled ? 'on' : 'off'); });
        atBox.addEventListener('change', () => { wxAutoTheme = atBox.checked; lsPut('diorama_wx_autotheme', wxAutoTheme ? 'on' : 'off'); if (wxAutoTheme) applyWeather(); });
        renderWxPreviewButtons();

        /* ---- Sahne parçacıkları ---- */
        function ensureWx() {
            const key = `${Math.round(WX.cloud / 10)}|${WX.rain}|${WX.snow}|${WX.fog}`;
            if (WX.key === key && WX.w === pw && WX.h === ph) return;
            WX.key = key; WX.w = pw; WX.h = ph;
            const nC = WX.cloud < 8 ? 0 : Math.round(2 + WX.cloud / 100 * 7);
            WX.clouds = Array.from({ length: nC }, (_, i) => {
                const w = 26 + Math.random() * 40;
                return { x: Math.random() * (pw + 80) - 40, y: 6 + Math.random() * ph * .26, w, layer: i % 2, v: .05 + Math.random() * .09,
                    blobs: [{ dx: 0, dy: 4, w, h: 5 }, { dx: w * .15, dy: 1, w: w * .45, h: 5 }, { dx: w * .5, dy: -1, w: w * .35, h: 6 }, { dx: w * .25, dy: -2, w: w * .25, h: 4 }] };
            });
            WX.stars = Array.from({ length: 45 }, () => ({ x: Math.random() * pw, y: Math.random() * ph * .45, ph: Math.random() * 6.28 }));
            const spawn = (o, top) => Object.assign(o, { x: Math.random() * (pw + 40) - 20, y: top ? -5 - Math.random() * 30 : Math.random() * ph });
            WX.drops = Array.from({ length: Math.round(pw * .5 * WX.rain) }, () => { const d = spawn({ v: 2.2 + Math.random() * 1.6, l: 2 + Math.floor(Math.random() * 3), splash: 0 }, false); d.endY = ph * .55 + Math.random() * ph * .43; return d; });
            WX.flakes = Array.from({ length: Math.round(pw * .35 * WX.snow) }, () => spawn({ v: .25 + Math.random() * .35, ph: Math.random() * 6.28, s: Math.random() < .75 ? 1 : 2 }, false));
            WX.streaks = Array.from({ length: 7 }, () => ({ x: Math.random() * pw, y: Math.random() * ph * .7, l: 10 + Math.random() * 18, v: 2 + Math.random() * 2 }));
        }
        function drawSun(bx, by, time) {
            for (let dy = -14; dy <= 14; dy++) for (let dx = -14; dx <= 14; dx++) {
                const d2 = dx * dx + dy * dy;
                if (d2 <= 25) pRect(bx + dx, by + dy, 1, 1, '#fef9c3'); else if (d2 <= 64) pRect(bx + dx, by + dy, 1, 1, '#fde047');
                else if (d2 <= 121) pRect(bx + dx, by + dy, 1, 1, 'rgba(253,224,71,.22)'); else if (d2 <= 196) pRect(bx + dx, by + dy, 1, 1, 'rgba(253,224,71,.08)');
            }
            for (let k = 0; k < 8; k++) {
                const a = k * Math.PI / 4 + time * .0004, len = 3 + (Math.floor(time / 400 + k) % 2);
                for (let t = 11; t < 11 + len; t++) pRect(bx + Math.cos(a) * t, by + Math.sin(a) * t, 1, 1, 'rgba(254,240,138,.8)');
            }
        }
        function drawMoon(bx, by, phase) {
            const R = 8, k = Math.cos(phase * Math.PI * 2);
            for (let dy = -12; dy <= 12; dy++) for (let dx = -12; dx <= 12; dx++) { const d2 = dx * dx + dy * dy; if (d2 > 64 && d2 <= 144) pRect(bx + dx, by + dy, 1, 1, 'rgba(254,249,195,.06)'); }
            for (let dy = -R; dy <= R; dy++) {
                const hw = Math.sqrt(R * R - dy * dy);
                for (let dx = -Math.floor(hw); dx <= Math.floor(hw); dx++) {
                    const lit = phase < .5 ? dx >= k * hw : dx <= -k * hw;
                    pRect(bx + dx, by + dy, 1, 1, lit ? ((dx * 7 + dy * 13) % 11 === 0 ? '#e7dfa0' : '#fef9c3') : 'rgba(30,40,80,.55)');
                }
            }
        }
        export function drawWxSky(time, skyOk) {
            if (!wxFxOn()) return;
            ensureWx();
            const light = isLightMode, dim = clamp01(WX.cloud / 100);
            const over = Math.max(WX.rain, WX.snow * .6, WX.thunder ? 1 : 0, WX.fog * .6, dim * .5);
            if (over > .05) { ctx.fillStyle = light ? `rgba(100,116,139,${over * .38})` : `rgba(30,41,59,${over * .32})`; ctx.fillRect(0, 0, pw, ph); }
            if (!skyOk) return;
            if (!light && dim < .85) {
                WX.stars.forEach(st => { ctx.globalAlpha = Math.max(0, (.25 + .5 * Math.sin(time * .003 + st.ph)) * (1 - dim)); pRect(st.x, st.y, 1, 1, '#f8fafc'); });
                ctx.globalAlpha = 1;
                if (dim < .4 && frameChance(.002) && shootingStars.length === 0) shootingStars.push({ x: Math.random() * pw * .65, y: 12 + Math.random() * 40, vx: 2.6, vy: .9, life: 28 });
                for (let i = shootingStars.length - 1; i >= 0; i--) {
                    const st = shootingStars[i]; st.x += st.vx * frameScale; st.y += st.vy * frameScale; st.life -= frameScale;
                    for (let t = 0; t < 5; t++) pRect(st.x - st.vx * t * .6, st.y - st.vy * t * .6, 1, 1, `rgba(255,255,255,${(1 - t / 5) * .7})`);
                    if (st.life <= 0) shootingStars.splice(i, 1);
                }
            }
            const p = light ? (WX.isDay ? WX.sunP : .5) : (!WX.isDay ? WX.moonP : .5);
            const bx = Math.round(pw * (.12 + .76 * p)), by = Math.round(ph * .36 - Math.sin(p * Math.PI) * ph * .26);
            ctx.globalAlpha = 1 - dim * .65;
            if (light) drawSun(bx, by, time); else drawMoon(bx, by, WX.moonPhase);
            ctx.globalAlpha = 1;
            const wet = WX.rain > .4 || WX.thunder;
            const col = light ? (wet ? 'rgba(120,134,153,.88)' : 'rgba(255,255,255,.72)') : (wet ? 'rgba(71,85,105,.88)' : 'rgba(148,163,184,.42)');
            const shade = light ? (wet ? 'rgba(90,104,124,.9)' : 'rgba(203,213,225,.7)') : (wet ? 'rgba(51,65,85,.9)' : 'rgba(100,116,139,.4)');
            WX.clouds.forEach(c => {
                c.x += c.v * (c.layer ? .6 : 1) * (1 + WX.wind / 20) * (WX.wx >= 0 ? 1 : -1) * frameScale;
                if (c.x > pw + 60) c.x = -c.w - 20; if (c.x < -c.w - 60) c.x = pw + 20;
                const y = c.y + c.layer * 10;
                c.blobs.forEach(b => pRect(c.x + b.dx, y + b.dy, b.w, b.h, col));
                pRect(c.x, y + 8, c.w, 2, shade);
            });
        }
        export function drawWxFront(time) {
            if (!wxFxOn()) return;
            ensureWx();
            const sky = HABITATS[currentHabitatIdx].weatherSky === true, slant = WX.wx * 1.1 + .12;
            if (WX.fog > 0) for (let i = 0; i < 6; i++) {
                const by = ph * (.45 + i * .09), off = (time * .01 * (1 + i * .2)) % 120;
                for (let x = -120 + off; x < pw; x += 120) { pRect(x, by, 90, 5, 'rgba(226,232,240,.07)'); pRect(x + 30, by + 4, 70, 3, 'rgba(226,232,240,.05)'); }
            }
            if (sky && WX.rain > 0) WX.drops.forEach(d => {
                if (d.splash > 0) { d.splash = Math.max(0, d.splash - frameScale); pRect(d.x - 1, d.y, 1, 1, 'rgba(200,225,250,.5)'); pRect(d.x + 1, d.y, 1, 1, 'rgba(200,225,250,.5)'); pRect(d.x, d.y - 1, 1, 1, 'rgba(220,235,255,.6)');
                    if (d.splash <= 0) { d.x = Math.random() * (pw + 40) - 20; d.y = -5 - Math.random() * 30; } return; }
                d.y += d.v * (.9 + WX.rain * .3) * frameScale; d.x += slant * d.v * .5 * frameScale;
                for (let i = 0; i < d.l; i++) pRect(d.x - slant * .5 * i, d.y - i, 1, 1, `rgba(190,215,245,${.55 - i * .12})`);
                if (d.y >= d.endY) d.splash = 5;
            });
            if (sky && WX.snow > 0) WX.flakes.forEach(f => {
                f.y += f.v * frameScale; f.x += (Math.sin(time * .0015 + f.ph) * .25 + WX.wx * .35) * frameScale;
                if (f.y > ph) { f.y = -4; f.x = Math.random() * pw; }
                pRect(f.x, f.y, f.s, f.s, 'rgba(255,255,255,.88)');
            });
            if (sky && WX.wind > 22) WX.streaks.forEach(s => {
                s.x += s.v * (WX.wx >= 0 ? 1 : -1) * (WX.wind / 25) * frameScale; if (s.x > pw + 30) s.x = -30; if (s.x < -30) s.x = pw + 30;
                pRect(s.x, s.y, s.l, 1, 'rgba(255,255,255,.12)');
            });
            if (WX.thunder) {
                WX.boltT -= frameScale;
                if (WX.boltT <= 0) {
                    WX.boltT = 160 + Math.random() * 360; WX.flash = 1;
                    const pts = []; let x = pw * (.1 + Math.random() * .8);
                    for (let y = 0; y < ph * .62; y += 4) { x += (Math.random() - .5) * 7; pts.push([x, y]); }
                    WX.bolt = { pts, life: 7 };
                }
                if (WX.bolt && WX.bolt.life > 0) {
                    WX.bolt.pts.forEach(([x, y]) => { pRect(x - 1, y, 4, 4, 'rgba(255,255,255,.25)'); pRect(x, y, 2, 4, '#fef9c3'); });
                    WX.bolt.life = Math.max(0, WX.bolt.life - frameScale);
                }
                if (WX.flash > .02) { ctx.fillStyle = `rgba(226,232,255,${WX.flash * .32})`; ctx.fillRect(0, 0, pw, ph); WX.flash *= Math.pow(.86, frameScale); }
            }
        }

        document.getElementById('weatherForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const input = document.getElementById('cityInput');
            const val = input.value.trim().slice(0, 80);
            if (!val) return;
            const saved = await fetchWeather(val);
            if (saved) {
                input.value = '';
                closeAllPopovers(true);
            }
        });

        
registerWeatherPreviewRenderer(renderWxPreviewButtons);
