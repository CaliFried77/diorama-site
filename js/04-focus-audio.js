import { closeAllPopovers } from './01-core-ui.js';
/* FOCUS-AUDIO — Living Pixel Diorama
   Refresh-safe focus timer and Web Audio soundscape generator. */
import {
  DEFAULT_FOCUS_MINUTES,
  FOCUS_MAX_MINUTES,
  FOCUS_MIN_MINUTES,
  normalizeFocusSession,
  pauseFocusSession,
  remainingFocusSeconds,
  resetFocusSession,
  resumeFocusSession,
  startFocusSession,
} from './focus-timer-state.js';

const FOCUS_STORAGE_KEY = 'diorama_focus_session_v1';
const FOCUS_PRESETS = [10, 25, 45, 60];

function readFocusSession() {
  try {
    const raw = localStorage.getItem(FOCUS_STORAGE_KEY);
    return normalizeFocusSession(raw ? JSON.parse(raw) : null);
  } catch {
    return normalizeFocusSession(null);
  }
}

let focusSession = readFocusSession();
let focusTotalSec = focusSession.totalSec;
let focusRemainingSec = remainingFocusSeconds(focusSession);
let focusInterval = null;
let focusRunning = focusSession.status === 'running';

const focusBtn = document.getElementById('focusBtn');
const focusBtnLabel = document.getElementById('focusBtnLabel');
const focusBigTime = document.getElementById('focusBigTime');
const focusRingCircle = document.getElementById('focusRingCircle');
const focusTogglePlay = document.getElementById('focusTogglePlay');
const focusResetBtn = document.getElementById('focusResetBtn');
const focusSessionBadge = document.getElementById('focusSessionBadge');
const focusStatusSub = document.getElementById('focusStatusSub');
const focusTaskInput = document.getElementById('focusTaskInput');
const focusPopover = document.getElementById('focusPopover');
const pinnedFocusBanner = document.getElementById('pinnedFocusBanner');
const pinnedFocusText = document.getElementById('pinnedFocusText');
const focusCustomMinutes = document.getElementById('focusCustomMinutes');
const focusApplyCustomBtn = document.getElementById('focusApplyCustomBtn');
const focusStageOverlay = document.getElementById('focusStageOverlay');
const focusStageTime = document.getElementById('focusStageTime');
const focusStageProgress = document.getElementById('focusStageProgress');
const focusStageHabitat = document.getElementById('focusStageHabitat');
const focusStageTask = document.getElementById('focusStageTask');
const focusStageStatus = document.getElementById('focusStageStatus');
const focusStageToggle = document.getElementById('focusStageToggle');
const focusStageReset = document.getElementById('focusStageReset');
const focusStageDuration = document.getElementById('focusStageDuration');

function persistFocusSession() {
  try { localStorage.setItem(FOCUS_STORAGE_KEY, JSON.stringify(focusSession)); } catch { /* storage may be unavailable */ }
}

function formatFocusTime(seconds) {
  const safe = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
}

function setPresetState(totalSec) {
  document.querySelectorAll('.focus-preset-btn').forEach((button) => {
    const selected = Number(button.dataset.mins) * 60 === totalSec;
    button.classList.toggle('is-selected', selected);
    button.setAttribute('aria-pressed', selected ? 'true' : 'false');
  });
  if (focusCustomMinutes) {
    const isPreset = FOCUS_PRESETS.includes(totalSec / 60);
    focusCustomMinutes.value = isPreset ? '' : String(totalSec / 60);
  }
}

function closeFocusPopover() {
  closeAllPopovers(false);
}

function updateFocusStageVisibility() {
  if (!focusStageOverlay) return;
  const shouldShow = ['running', 'paused', 'completed'].includes(focusSession.status);
  focusStageOverlay.hidden = !shouldShow;
  focusStageOverlay.setAttribute('aria-hidden', shouldShow ? 'false' : 'true');
  focusStageOverlay.classList.toggle('is-visible', shouldShow);
}

function updateFocusDisplay() {
  focusRemainingSec = remainingFocusSeconds(focusSession);
  focusRunning = focusSession.status === 'running';
  const time = formatFocusTime(focusRemainingSec);
  const ratio = focusTotalSec > 0 ? 1 - focusRemainingSec / focusTotalSec : 0;
  if (focusBtnLabel) focusBtnLabel.textContent = time;
  if (focusBigTime) focusBigTime.textContent = time;
  if (focusStageTime) focusStageTime.textContent = time;
  if (focusRingCircle) focusRingCircle.style.width = `${Math.max(0, Math.min(100, ratio * 100)).toFixed(2)}%`;
  if (focusStageProgress) focusStageProgress.style.width = `${Math.max(0, Math.min(100, ratio * 100)).toFixed(2)}%`;
  focusRingCircle?.parentElement?.setAttribute('aria-valuenow', String(Math.round(ratio * 100)));
  if (focusSessionBadge) focusSessionBadge.textContent = `${Math.round(focusTotalSec / 60)} DK`;
  if (focusStageDuration) focusStageDuration.textContent = `${Math.round(focusTotalSec / 60)} DK`;
  if (focusTogglePlay) focusTogglePlay.textContent = focusRunning ? 'Duraklat' : (focusSession.status === 'completed' ? 'Tekrar Başla' : (focusSession.status === 'paused' ? 'Devam Et' : 'Başlat'));
  if (focusStageToggle) focusStageToggle.textContent = focusRunning ? 'Duraklat' : (focusSession.status === 'completed' ? 'Tekrar Başla' : 'Devam Et');

  const statusLabel = focusSession.status === 'running'
    ? 'Odak oturumu aktif'
    : focusSession.status === 'paused'
      ? 'Duraklatıldı'
      : focusSession.status === 'completed'
        ? 'Oturum tamamlandı'
        : 'Zamanlayıcı hazır';
  if (focusStatusSub) focusStatusSub.textContent = statusLabel;
  if (focusStageStatus) focusStageStatus.textContent = focusSession.status === 'running'
    ? 'HABİTATINDA ODAKLANIYORSUN'
    : focusSession.status === 'paused'
      ? 'OTURUM DURAKLATILDI'
      : 'OTURUM TAMAMLANDI';
  if (focusStageHabitat) focusStageHabitat.textContent = focusSession.habitat || document.getElementById('habitatNameLabel')?.textContent?.trim() || 'Yaşayan Habitat';
  if (focusStageTask) {
    focusStageTask.textContent = focusSession.task ? `HEDEF: ${focusSession.task}` : 'KENDİ RİTMİNDE İLERLE';
  }
  updateFocusStageVisibility();
}

function stopFocusInterval() {
  if (focusInterval) clearInterval(focusInterval);
  focusInterval = null;
}

function completeFocusSession() {
  stopFocusInterval();
  focusSession = { ...focusSession, remainingSec: 0, status: 'completed', endsAt: null };
  focusRunning = false;
  persistFocusSession();
  updateFocusDisplay();
  playChime();
}

function tickFocusSession() {
  focusRemainingSec = remainingFocusSeconds(focusSession);
  if (focusRemainingSec <= 0) {
    completeFocusSession();
    return;
  }
  updateFocusDisplay();
}

function startFocusTicker() {
  stopFocusInterval();
  if (focusSession.status !== 'running') return;
  tickFocusSession();
  if (focusSession.status === 'running') focusInterval = setInterval(tickFocusSession, 250);
}

function captureCurrentHabitat() {
  return document.getElementById('habitatNameLabel')?.textContent?.trim().slice(0, 100) || 'Yaşayan Habitat';
}

function startOrPauseFocus() {
  const now = Date.now();
  if (focusSession.status === 'running') {
    focusSession = pauseFocusSession(focusSession, now);
    stopFocusInterval();
  } else if (focusSession.status === 'paused') {
    focusSession = resumeFocusSession(focusSession, now);
    startFocusTicker();
  } else {
    focusSession = startFocusSession(focusTotalSec, {
      habitat: captureCurrentHabitat(),
      task: focusTaskInput?.value || '',
    }, now);
    startFocusTicker();
    closeFocusPopover();
  }
  persistFocusSession();
  updateFocusDisplay();
}

function resetFocusTimer() {
  stopFocusInterval();
  focusSession = resetFocusSession(focusSession);
  focusSession = { ...focusSession, task: focusTaskInput?.value?.trim().slice(0, 180) || '' };
  focusTotalSec = focusSession.totalSec;
  focusRemainingSec = focusTotalSec;
  focusRunning = false;
  persistFocusSession();
  updateFocusDisplay();
}

function applyFocusDuration(minutes) {
  const value = Number(minutes);
  if (!Number.isInteger(value) || value < FOCUS_MIN_MINUTES || value > FOCUS_MAX_MINUTES) {
    focusCustomMinutes?.setCustomValidity(`1 ile ${FOCUS_MAX_MINUTES} dakika arasında bir süre gir.`);
    focusCustomMinutes?.reportValidity();
    return;
  }
  focusCustomMinutes?.setCustomValidity('');
  stopFocusInterval();
  focusTotalSec = value * 60;
  focusSession = {
    totalSec: focusTotalSec,
    remainingSec: focusTotalSec,
    status: 'idle',
    endsAt: null,
    habitat: captureCurrentHabitat(),
    task: focusTaskInput?.value?.trim().slice(0, 180) || '',
  };
  setPresetState(focusTotalSec);
  persistFocusSession();
  updateFocusDisplay();
}

document.querySelectorAll('.focus-preset-btn').forEach((button) => {
  button.addEventListener('click', () => applyFocusDuration(Number(button.dataset.mins)));
});

focusApplyCustomBtn?.addEventListener('click', () => applyFocusDuration(Number(focusCustomMinutes?.value)));
focusCustomMinutes?.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    applyFocusDuration(Number(focusCustomMinutes.value));
  }
});
focusTogglePlay?.addEventListener('click', startOrPauseFocus);
focusResetBtn?.addEventListener('click', resetFocusTimer);
focusStageToggle?.addEventListener('click', startOrPauseFocus);
focusStageReset?.addEventListener('click', resetFocusTimer);

focusTaskInput?.addEventListener('input', () => {
  const val = focusTaskInput.value.trim();
  if (val) {
    pinnedFocusText.textContent = val;
    pinnedFocusBanner.classList.remove('hidden');
  } else {
    pinnedFocusBanner.classList.add('hidden');
  }
  focusSession = { ...focusSession, task: val.slice(0, 180) };
  persistFocusSession();
  if (focusStageTask) focusStageTask.textContent = val ? `HEDEF: ${val}` : 'KENDİ RİTMİNDE İLERLE';
});

if (focusTaskInput && focusSession.task) {
  focusTaskInput.value = focusSession.task;
  pinnedFocusText.textContent = focusSession.task;
  pinnedFocusBanner?.classList.remove('hidden');
}

window.addEventListener('pagehide', persistFocusSession);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') persistFocusSession();
});

focusTotalSec = focusSession.totalSec;
focusRemainingSec = remainingFocusSeconds(focusSession);
setPresetState(focusTotalSec);
updateFocusDisplay();
if (focusSession.status === 'running') startFocusTicker();

        // Clean Web Audio API Ambient Generator
        let audioCtx = null;
        let activeSoundSource = null;
        let activeSoundType = null;
        let ambientVolume = Math.min(100, Math.max(5, Number(localStorage.getItem('diorama_ambient_volume')) || 40)) / 100;
        const soundActiveDot = document.getElementById('soundActiveDot');
        const ambientVolumeSlider = document.getElementById('ambientVolumeSlider');
        const ambientVolumeValue = document.getElementById('ambientVolumeValue');
        if (ambientVolumeSlider) ambientVolumeSlider.value = String(Math.round(ambientVolume * 100));
        if (ambientVolumeValue) ambientVolumeValue.textContent = `${Math.round(ambientVolume * 100)}%`;

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
            gain.gain.setValueAtTime(0.0001, audioCtx.currentTime); gain.gain.linearRampToValueAtTime(ambientVolume, audioCtx.currentTime + 0.8); source._gain = gain;
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
        ambientVolumeSlider?.addEventListener('input', () => {
            const pct = Math.min(100, Math.max(5, Number(ambientVolumeSlider.value) || 40));
            ambientVolume = pct / 100;
            if (ambientVolumeValue) ambientVolumeValue.textContent = `${pct}%`;
            try { localStorage.setItem('diorama_ambient_volume', String(pct)); } catch {}
            if (activeSoundSource?._gain && audioCtx) {
                const g = activeSoundSource._gain.gain;
                const now = audioCtx.currentTime;
                g.cancelScheduledValues(now);
                g.setValueAtTime(g.value, now);
                g.linearRampToValueAtTime(ambientVolume, now + 0.12);
            }
        });

        