

/* FOCUS-AUDIO — Living Pixel Diorama
   Native ES module. Cross-file dependencies are declared with imports and exports. */
/* ============================================================================
           6. BUG-FREE FOCUS STUDIO & WEB AUDIO SOUNDSCAPE GENERATOR
           ============================================================================ */
        let focusTotalSec = 25 * 60;
        let focusRemainingSec = 25 * 60;
        let focusInterval = null;
        let focusRunning = false;

        const focusBtnLabel = document.getElementById('focusBtnLabel');
        const focusBigTime = document.getElementById('focusBigTime');
        const focusRingCircle = document.getElementById('focusRingCircle');
        const focusTogglePlay = document.getElementById('focusTogglePlay');
        const focusSessionBadge = document.getElementById('focusSessionBadge');
        const focusStatusSub = document.getElementById('focusStatusSub');
        const focusTaskInput = document.getElementById('focusTaskInput');
        const pinnedFocusBanner = document.getElementById('pinnedFocusBanner');
        const pinnedFocusText = document.getElementById('pinnedFocusText');
        const RING_CIRCUMFERENCE = 314.16;

        function updateFocusDisplay() {
            const m = String(Math.floor(focusRemainingSec / 60)).padStart(2, '0');
            const s = String(focusRemainingSec % 60).padStart(2, '0');
            const str = `${m}:${s}`;
            focusBtnLabel.textContent = str;
            focusBigTime.textContent = str;
            const ratio = focusTotalSec > 0 ? (1 - focusRemainingSec / focusTotalSec) : 0;
            focusRingCircle.style.strokeDashoffset = (ratio * RING_CIRCUMFERENCE).toFixed(2);
        }

        document.querySelectorAll('.focus-preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (focusInterval) clearInterval(focusInterval);
                focusRunning = false;
                const mins = parseInt(btn.dataset.mins, 10);
                focusTotalSec = mins * 60;
                focusRemainingSec = focusTotalSec;
                focusTogglePlay.textContent = 'Başlat';
                focusSessionBadge.textContent = `${mins} DK`;
                focusStatusSub.textContent = 'Zamanlayıcı hazır';

                document.querySelectorAll('.focus-preset-btn').forEach(b => {
                    const selected = b === btn;
                    b.setAttribute('aria-pressed', selected ? 'true' : 'false');
                    b.className = selected
                        ? 'focus-preset-btn py-1.5 rounded-lg text-xs font-medium bg-white/15 text-white transition'
                        : 'focus-preset-btn py-1.5 rounded-lg text-xs font-medium text-white/55 hover:text-white transition';
                });
                updateFocusDisplay();
            });
        });

        focusTogglePlay.addEventListener('click', () => {
            if (focusRunning) {
                clearInterval(focusInterval);
                focusRunning = false;
                focusTogglePlay.textContent = 'Devam Et';
                focusStatusSub.textContent = 'Duraklatıldı';
            } else {
                if (focusRemainingSec <= 0) focusRemainingSec = focusTotalSec;
                focusRunning = true;
                focusTogglePlay.textContent = 'Duraklat';
                focusStatusSub.textContent = 'Odak oturumu aktif';
                const endAt = Date.now() + focusRemainingSec * 1000;
                focusInterval = setInterval(() => {
                    focusRemainingSec = Math.max(0, Math.round((endAt - Date.now()) / 1000));
                    updateFocusDisplay();
                    if (focusRemainingSec <= 0) {
                        clearInterval(focusInterval);
                        focusRunning = false;
                        focusTogglePlay.textContent = 'Başlat';
                        focusStatusSub.textContent = 'Oturum tamamlandı';
                        playChime();
                    }
                }, 250);
            }
        });

        document.getElementById('focusResetBtn').addEventListener('click', () => {
            if (focusInterval) clearInterval(focusInterval);
            focusRunning = false;
            focusRemainingSec = focusTotalSec;
            focusTogglePlay.textContent = 'Başlat';
            focusStatusSub.textContent = 'Sıfırlandı';
            updateFocusDisplay();
        });

        focusTaskInput.addEventListener('input', () => {
            const val = focusTaskInput.value.trim();
            if (val) {
                pinnedFocusText.textContent = val;
                pinnedFocusBanner.classList.remove('hidden');
            } else {
                pinnedFocusBanner.classList.add('hidden');
            }
        });

        // Clean Web Audio API Ambient Generator
        let audioCtx = null;
        let activeSoundSource = null;
        let activeSoundType = null;
        const soundActiveDot = document.getElementById('soundActiveDot');

        function playChime() {
            try {
                if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                const t = audioCtx.currentTime;
                [660, 880].forEach((f, i) => {
                    const o = audioCtx.createOscillator(), g = audioCtx.createGain(), st = t + i * 0.25;
                    o.frequency.value = f;
                    g.gain.setValueAtTime(0.0001, st);
                    g.gain.linearRampToValueAtTime(0.12, st + 0.03);
                    g.gain.exponentialRampToValueAtTime(0.001, st + 1.1);
                    o.connect(g); g.connect(audioCtx.destination);
                    o.start(st); o.stop(st + 1.2);
                });
            } catch (e) {}
        }

        function stopAmbientSound() {
            if (activeSoundSource) {
                try {
                    const g = activeSoundSource._gain.gain, n = audioCtx.currentTime;
                    g.cancelScheduledValues(n); g.setValueAtTime(g.value, n);
                    g.linearRampToValueAtTime(0.0001, n + 0.25);
                    activeSoundSource.stop(n + 0.3);
                } catch (e) {}
                activeSoundSource = null;
            }
            activeSoundType = null;
            soundActiveDot.classList.add('hidden');
            document.getElementById('ambientStatusText').textContent = 'Sessiz';
            document.querySelectorAll('.sound-btn').forEach(b => {
                b.setAttribute('aria-pressed', 'false');
                b.className = 'sound-btn py-2 px-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.10] border border-white/10 flex flex-col items-center gap-1.5 text-xs text-white/70 transition';
            });
        }

        function toggleAmbientSound(type) {
            if (activeSoundType === type) {
                stopAmbientSound();
                return;
            }
            stopAmbientSound();
            if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            if (audioCtx.state === 'suspended') audioCtx.resume();

            const bufferSize = audioCtx.sampleRate * 4;
            const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
            const data = buffer.getChannelData(0);
            let lastOut = 0.0;
            for (let i = 0; i < bufferSize; i++) {
                const white = Math.random() * 2 - 1;
                data[i] = (lastOut + (0.02 * white)) / 1.02;
                lastOut = data[i];
                data[i] *= 0.16;
            }

            for (let i = 0; i < 2400; i++) { const k = i / 2400; data[bufferSize - 2400 + i] = data[bufferSize - 2400 + i] * (1 - k) + data[i] * k; }
            const source = audioCtx.createBufferSource();
            source.buffer = buffer;
            source.loop = true;

            const filter = audioCtx.createBiquadFilter();
            if (type === 'rain') {
                filter.type = 'bandpass';
                filter.frequency.value = 900;
                filter.Q.value = 0.65;
            } else if (type === 'water') {
                filter.type = 'lowpass';
                filter.frequency.value = 240;
            } else {
                filter.type = 'bandpass';
                filter.frequency.value = 380;
                filter.Q.value = 2.0;
            }

            const gain = audioCtx.createGain();
            gain.gain.setValueAtTime(0.0001, audioCtx.currentTime); gain.gain.linearRampToValueAtTime(0.4, audioCtx.currentTime + 0.8); source._gain = gain;
            source.connect(filter);
            filter.connect(gain);
            gain.connect(audioCtx.destination);
            source.start();

            activeSoundSource = source;
            activeSoundType = type;
            soundActiveDot.classList.remove('hidden');

            const names = { rain: 'Gece Yağmuru', water: 'Derin Su', wind: 'Rüzgar' };
            document.getElementById('ambientStatusText').textContent = names[type];
            document.querySelectorAll('.sound-btn').forEach(b => {
                const selected = b.dataset.sound === type;
                b.setAttribute('aria-pressed', selected ? 'true' : 'false');
                if (selected) {
                    b.className = 'sound-btn py-2 px-2 rounded-xl bg-white/15 border border-white/30 flex flex-col items-center gap-1.5 text-xs text-white transition';
                }
            });
        }

        document.querySelectorAll('.sound-btn').forEach(btn => {
            btn.addEventListener('click', () => toggleAmbientSound(btn.dataset.sound));
        });

        