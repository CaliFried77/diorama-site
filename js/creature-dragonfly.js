import { pw, ph, frameScale, flora, pRect, frameSmoothing } from './07-habitat-state.js';
import { findAvailableStimulus } from './creature-utils.js';

/* PIXELDRAGONFLY — dedicated yusufçuk behavior and pixel-art rendering. */

// ============================================================================
// BÖLÜM BAŞI: YUSUFÇUK SINIFI VE DAVRANIŞLARI
// Bu dosya yalnızca ilgili canlının hareket, etkileşim ve çizim kodunu içerir.
// ============================================================================

/* ============================================================================
   CREATURE 3: ARTISTIC EMPEROR DRAGONFLY & DAMSELFLY FLOCK
   ============================================================================ */
const DRAGONFLY_SPECIES = Object.freeze([
    {
        thorax: '#22c55e', thoraxHi: '#86efac', body: '#38bdf8', seg: '#0f172a',
        eye: '#10b981', eyeHi: '#d1fae5',
        wing: 'rgba(224, 242, 254, 0.72)', vein: 'rgba(125, 211, 252, 0.9)', stigma: '#0369a1',
        rgb: [56, 189, 248]
    },
    {
        thorax: '#dc2626', thoraxHi: '#fca5a5', body: '#ef4444', seg: '#7f1d1d',
        eye: '#f97316', eyeHi: '#fef08a',
        wing: 'rgba(254, 243, 199, 0.68)', vein: 'rgba(253, 186, 116, 0.88)', stigma: '#b91c1c',
        rgb: [248, 113, 113]
    },
    {
        thorax: '#0d9488', thoraxHi: '#5eead4', body: '#10b981', seg: '#064e3b',
        eye: '#34d399', eyeHi: '#ecfdf5',
        wing: 'rgba(209, 250, 229, 0.70)', vein: 'rgba(110, 231, 183, 0.9)', stigma: '#047857',
        rgb: [52, 211, 153]
    },
    {
        thorax: '#eab308', thoraxHi: '#fef08a', body: '#facc15', seg: '#18181b',
        eye: '#22c55e', eyeHi: '#dcfce7',
        wing: 'rgba(254, 249, 195, 0.68)', vein: 'rgba(253, 224, 71, 0.85)', stigma: '#713f12',
        rgb: [250, 204, 21]
    }
]);

// ============================================================================
// ============================================================================

export class PixelDragonfly {
    constructor() {
        this.x = 30 + Math.random() * (pw - 60);
        this.y = 28 + Math.random() * (ph - 72);
        this.dir = Math.random() < 0.5 ? -1 : 1;
        this.vx = this.dir * 0.45;
        this.vy = 0;
        this.phase = Math.random() * Math.PI * 2;
        this.eatCooldown = 0;

        this.pal = DRAGONFLY_SPECIES[Math.floor(Math.random() * DRAGONFLY_SPECIES.length)];
        this.rgb = this.pal.rgb;

        this.perchedReed = null;
        this.perched = false;
        this.hoverTimer = 15 + Math.floor(Math.random() * 35);
        this.targetX = this.x + this.dir * 60;
        this.targetY = this.y;
    }

    pickNextDestination() {
        const reeds = flora.filter(f => f.type === 'reed' && f.h > 42);
        if (reeds.length > 0 && Math.random() < 0.36) {
            const r = reeds[Math.floor(Math.random() * reeds.length)];
            this.perchedReed = r;
            this.perched = false;
            this.targetX = r.tipX || r.x;
            this.targetY = (r.tipY || (ph - r.h)) - 2;
            this.hoverTimer = 85 + Math.floor(Math.random() * 95);
        } else {
            this.perchedReed = null;
            this.perched = false;
            this.targetX = 28 + Math.random() * (pw - 56);
            this.targetY = 26 + Math.random() * (ph - 52);
            this.hoverTimer = 28 + Math.floor(Math.random() * 52);
        }
    }

    update(t) {
        if (this.eatCooldown > 0) this.eatCooldown = Math.max(0, this.eatCooldown - frameScale);

        const midge = findAvailableStimulus(this, 'midge', Math.max(320, pw * 0.8));
        if (midge) {
            this.perched = false;
            this.perchedReed = null;
            this.targetX = midge.x;
            this.targetY = midge.y;
            const distM = Math.hypot(this.targetX - this.x, this.targetY - this.y);
            if (distM < 7) {
                midge.life = 0;
                this.eatCooldown = 70;
                this.hoverTimer = 24;
                this.vx *= 0.15;
                this.vy *= 0.15;
                return;
            }
        }

        if (this.perched && this.perchedReed) {
            this.phase += 0.05 * frameScale;
            this.x = (this.perchedReed.tipX || this.perchedReed.x);
            this.y = (this.perchedReed.tipY || (ph - this.perchedReed.h)) - 2;
            this.vx = 0;
            this.vy = 0;
            this.hoverTimer -= frameScale;
            if (this.hoverTimer <= 0) {
                this.perched = false;
                this.perchedReed = null;
                this.vy = -0.35;
                this.pickNextDestination();
            }
            return;
        }

        if (this.perchedReed) {
            this.targetX = this.perchedReed.tipX || this.perchedReed.x;
            this.targetY = (this.perchedReed.tipY || (ph - this.perchedReed.h)) - 2;
        }

        this.phase += 0.42 * frameScale;
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 5) {
            const maxSpd = midge ? 1.25 : 0.92;
            const spd = Math.min(maxSpd, Math.max(0.22, dist * 0.055));
            const desiredVx = (dx / dist) * spd;
            const desiredVy = (dy / dist) * spd;
            this.vx += (desiredVx - this.vx) * frameSmoothing(0.16);
            this.vy += (desiredVy - this.vy) * frameSmoothing(0.16);

            if (Math.abs(dx) > 3) {
                this.dir = dx >= 0 ? 1 : -1;
            }
            this.x += this.vx * frameScale;
            this.y += this.vy * frameScale;
        } else {
            if (this.perchedReed) {
                this.perched = true;
                this.dir = (this.x < pw * 0.5) ? 1 : -1;
            } else {
                this.vx *= Math.pow(0.75, frameScale);
                this.vy *= Math.pow(0.75, frameScale);
                this.y += Math.sin(t * 0.008 + this.phase) * 0.09 * frameScale;
                this.hoverTimer -= frameScale;
                if (this.hoverTimer <= 0) {
                    this.pickNextDestination();
                }
            }
        }
    }

    draw() {
        const p = this.pal;
        const dir = this.dir;
        const bx = Math.round(this.x);
        const by = Math.round(this.y);

        const px = (x, y, w, h, col) => {
            const drawX = dir > 0 ? (bx + x) : (bx - x - w);
            pRect(drawX, by + y, w, h, col);
        };

        const waterHorizonY = ph - 52;
        if (by > waterHorizonY - 28 && bx > pw * 0.22 && bx < pw * 0.78) {
            const reflY = Math.min(ph - 3, Math.round(waterHorizonY + (by - (waterHorizonY - 28)) * 0.75 + 14));
            pRect(bx - 6, reflY, 13, 1, 'rgba(186, 230, 253, 0.22)');
            pRect(bx - 3, reflY + 1, 7, 1, `rgba(${this.rgb[0]}, ${this.rgb[1]}, ${this.rgb[2]}, 0.28)`);
        }

        const dartTilt = this.perched ? 0 : (Math.abs(this.vx) > 0.45 ? 1 : 0);
        const flapFore = this.perched ? -1 : Math.round(Math.sin(this.phase) * 4);
        const flapHind = this.perched ? 1 : Math.round(Math.cos(this.phase) * 4);

        for (let s = 1; s <= 10; s++) {
            const wx = -1 - Math.floor(s * 0.65);
            const wy = -2 - Math.round((s / 10) * flapHind) - Math.floor(s * 0.25);
            px(wx, wy, 2, 2, p.wing);
            if (s % 2 === 0) px(wx, wy, 1, 1, p.vein);
            if (s === 9) px(wx, wy, 2, 1, p.stigma);
        }

        for (let seg = 0; seg < 13; seg++) {
            const ax = -3 - seg;
            const ay = (seg > 5 ? dartTilt : 0) + (this.perched && seg > 7 ? -1 : 0);
            const isRing = (seg % 2 === 1);
            px(ax, ay, 1, 1, isRing ? p.seg : p.body);
            if (seg < 4) {
                px(ax, ay + 1, 1, 1, p.seg);
            }
        }
        px(-16, dartTilt, 1, 1, p.seg);

        px(-2, -1, 5, 3, p.thorax);
        px(-1, -1, 3, 1, p.thoraxHi);
        px(-2, 1, 4, 1, p.seg);
        px(-1, 2, 1, 2, '#0f172a');
        px(1, 2, 1, 2, '#0f172a');
        px(2, 2, 1, 1, '#0f172a');

        px(3, -2, 3, 3, p.eye);
        px(4, -2, 2, 1, p.eyeHi);
        px(5, 0, 1, 1, '#0f172a');

        for (let s = 1; s <= 12; s++) {
            const wx = 1 + Math.floor(s * 0.35);
            const wy = -2 - Math.round((s / 12) * flapFore) - Math.floor(s * 0.35);
            px(wx, wy, 2, 2, p.wing);
            if (s % 2 === 1) px(wx, wy, 1, 1, p.vein);
            if (s === 10 || s === 11) px(wx, wy, 2, 1, p.stigma);
        }
    }
}

// ============================================================================
// BÖLÜM SONU: YUSUFÇUK SINIFI VE DAVRANIŞLARI
// ============================================================================
