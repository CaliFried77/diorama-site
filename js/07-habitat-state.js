import { invalidateBackgroundCache } from './scene-state.js';
import { HABITATS, HABITAT_IDS } from '../config/habitat-catalog.js';
export { HABITATS };
import { lsRaw, lsPut } from './storage.js';
import { calculateFrameChance, calculateFrameSmoothing, scaleSceneCollections, createBackgroundSilhouettes } from './scene-math.js';

/* HABITAT STATE — Living Pixel Diorama
   Canvas dimensions, frame timing and shared scene collections for all habitats. */
// Shared scene state used by habitat, creature, scenery and renderer modules.
// ============================================================================
        // BÖLÜM BAŞI: CANVAS, KARE ZAMANLAMASI VE ÇİZİM YARDIMCILARI
// ============================================================================

        export const canvas = document.getElementById('habitatCanvas');
        export const ctx = canvas.getContext('2d', { alpha: false });

        export const PIXEL_SCALE = 3; // Crisp 3x3 pixel art resolution
        export const BASE_FRAME_MS = 1000 / 60;
        export const MAX_FRAME_DELTA_MS = 50; // Prevent large jumps after a slow frame or wake-up.
        export const REDUCED_MOTION_QUERY = window.matchMedia('(prefers-reduced-motion: reduce)');
        export let prefersReducedMotion = REDUCED_MOTION_QUERY.matches;
        export let frameScale = 1; // 1.0 equals one original 60 Hz simulation frame.
        export let pw = 420;
        export let ph = 240;

        export function frameChance(probability) {
            return calculateFrameChance(probability, frameScale, Math.random());
        }

        export function frameSmoothing(amount) {
            return calculateFrameSmoothing(amount, frameScale);
        }

        function resizePixelCanvas() {
            const previousWidth = pw;
            const previousHeight = ph;
            const nextWidth = Math.max(1, Math.ceil(window.innerWidth / PIXEL_SCALE));
            const nextHeight = Math.max(1, Math.ceil(window.innerHeight / PIXEL_SCALE));
            if (nextWidth === previousWidth && nextHeight === previousHeight) return;

            pw = nextWidth;
            ph = nextHeight;
            canvas.width = pw;
            canvas.height = ph;
            ctx.imageSmoothingEnabled = false;
            invalidateBackgroundCache();

            if (previousWidth > 0 && previousHeight > 0 && creatures.length + stimuli.length + ambientParticles.length + flora.length + shootingStars.length > 0) {
                scaleSceneCollections(
                    [creatures, stimuli, ambientParticles, flora, shootingStars],
                    pw / previousWidth,
                    ph / previousHeight,
                );
                bgSilhouettes.length = 0;
                bgSilhouettes.push(...createBackgroundSilhouettes(pw));
            }
        }
        window.addEventListener('resize', resizePixelCanvas, { passive: true });

        export function pRect(x, y, w, h, color) {
            ctx.fillStyle = color;
            ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
        }

        export function lerpHex(c1, c2, t) {
            const r1 = parseInt(c1.slice(1, 3), 16), g1 = parseInt(c1.slice(3, 5), 16), b1 = parseInt(c1.slice(5, 7), 16);
            const r2 = parseInt(c2.slice(1, 3), 16), g2 = parseInt(c2.slice(3, 5), 16), b2 = parseInt(c2.slice(5, 7), 16);
            const r = Math.round(r1 + (r2 - r1) * t);
            const g = Math.round(g1 + (g2 - g1) * t);
            const b = Math.round(b1 + (b2 - b1) * t);
            return `rgb(${r},${g},${b})`;
        }

        // ============================================================================
        // BÖLÜM SONU: CANVAS VE ÇİZİM YARDIMCILARI
        // BÖLÜM BAŞI: AKTİF HABİTAT VE PAYLAŞILAN SAHNE DİZİLERİ
// ============================================================================

        export let pinnedHabitatId = lsRaw('diorama_pinned_habitat');
        if (pinnedHabitatId && !HABITAT_IDS.has(pinnedHabitatId)) {
            pinnedHabitatId = null;
            try { localStorage.removeItem('diorama_pinned_habitat'); } catch { /* Storage may be disabled. */ }
        }
        export let currentHabitatIdx = Math.floor(Math.random() * HABITATS.length);
        if (pinnedHabitatId) {
            const foundIdx = HABITATS.findIndex(h => h.id === pinnedHabitatId);
            if (foundIdx !== -1) currentHabitatIdx = foundIdx;
        }
        export let creatures = [];
        export let stimuli = [];
        export let ambientParticles = [];
        export let flora = [];
        export let bgSilhouettes = [];
        export let shootingStars = [];

        // Initial sizing happens after all mutable scene collections are initialized.
        resizePixelCanvas();

        
export function setCurrentHabitatIndex(index) {
    currentHabitatIdx = ((index % HABITATS.length) + HABITATS.length) % HABITATS.length;
}
export function setPinnedHabitatId(value) {
    pinnedHabitatId = value && HABITAT_IDS.has(value) ? value : null;
    if (pinnedHabitatId) lsPut('diorama_pinned_habitat', pinnedHabitatId);
    else { try { localStorage.removeItem('diorama_pinned_habitat'); } catch { /* Storage may be disabled. */ } }
}
export function setFrameScale(value) { frameScale = value; }
export function setPrefersReducedMotion(value) { prefersReducedMotion = Boolean(value); }

// ============================================================================
        // BÖLÜM SONU: AKTİF HABİTAT VE PAYLAŞILAN SAHNE DURUMU
// ============================================================================
