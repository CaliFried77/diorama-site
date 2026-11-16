import { pw, ph, frameScale, frameChance, flora, pRect, frameSmoothing } from './07-habitat-state.js';
import { findAvailableStimulus } from './creature-utils.js';

/* PIXELBUTTERFLY — dedicated kelebek behavior and pixel-art rendering. */

// ============================================================================
// BÖLÜM BAŞI: KELEBEK SINIFI VE DAVRANIŞLARI
// Bu dosya yalnızca ilgili canlının hareket, etkileşim ve çizim kodunu içerir.
// ============================================================================

/* ============================================================================
   CREATURE 4: TRUE 4-LOBED ORNATE SWALLOWTAIL & MORPHO BUTTERFLIES
   ============================================================================ */
// ============================================================================
// ============================================================================

export class PixelButterfly {
    constructor() {
        this.x = Math.random() * pw;
        this.y = 26 + Math.random() * (ph - 68);
        this.angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.8;
        this.targetAngle = this.angle;
        this.speed = 0.28 + Math.random() * 0.14;
        this.phase = Math.random() * Math.PI * 2;
        this.sipTimer = 0;
        this.eatCooldown = 0;
        this.perchedFlower = null;

        const species = [
            { base: '#0369a1', mid: '#0ea5e9', hi: '#7dd3fc', border: '#090d16', pearl: '#f8fafc', eye: '#38bdf8', rgb: [56, 189, 248] },
            { base: '#c2410c', mid: '#f97316', hi: '#fde047', border: '#18181b', pearl: '#fef9c3', eye: '#fb7185', rgb: [251, 146, 60] },
            { base: '#6b21a8', mid: '#d946ef', hi: '#f5d0fe', border: '#130d26', pearl: '#ffffff', eye: '#fde047', rgb: [217, 70, 239] },
            { base: '#0f766e', mid: '#34d399', hi: '#a7f3d0', border: '#064e3b', pearl: '#ecfdf5', eye: '#facc15', rgb: [52, 211, 153] }
        ];
        this.pal = species[Math.floor(Math.random() * species.length)];
        this.rgb = this.pal.rgb;
    }

    update(t) {
        if (this.eatCooldown > 0) this.eatCooldown = Math.max(0, this.eatCooldown - frameScale);

        const blossom = findAvailableStimulus(this, 'floating_blossom', Math.max(260, pw * 0.65));
        if (blossom && this.perchedFlower) {
            this.perchedFlower = null;
            this.sipTimer = 0;
        }

        if (this.sipTimer > 0) {
            this.phase += 0.045 * frameScale;
            this.sipTimer = Math.max(0, this.sipTimer - frameScale);
            if (this.perchedFlower) {
                const tx = this.perchedFlower.tipX !== undefined ? this.perchedFlower.tipX : this.perchedFlower.x;
                const ty = this.perchedFlower.tipY !== undefined ? this.perchedFlower.tipY : ((this.perchedFlower.baseY || ph) - (this.perchedFlower.h || 18));
                this.x = tx;
                this.y = ty - 3;
            }
            if (this.sipTimer === 0) {
                this.perchedFlower = null;
                this.targetAngle = -Math.PI * 0.5 + (Math.random() - 0.5) * 1.4;
                this.eatCooldown = 110;
            }
            return;
        }

        this.phase += 0.15 * frameScale;

        if (blossom) {
            const dx = blossom.x - this.x;
            const dy = blossom.y - this.y;
            const dist = Math.hypot(dx, dy);
            this.targetAngle = Math.atan2(dy, dx);
            if (dist < 6) {
                blossom.life = 0;
                this.sipTimer = 28;
                return;
            }
        } else {
            if (this.eatCooldown === 0 && frameChance(0.012)) {
                const flowers = flora.filter(f => f.type === 'buddleia' || f.type === 'hydrangea' || f.type === 'foxglove');
                if (flowers.length > 0) {
                    const fl = flowers[Math.floor(Math.random() * flowers.length)];
                    const fx = fl.tipX !== undefined ? fl.tipX : fl.x;
                    const fy = fl.tipY !== undefined ? fl.tipY : ((fl.baseY || ph) - (fl.h || 20));
                    const d = Math.hypot(fx - this.x, fy - this.y);
                    if (d < 115) {
                        this.targetAngle = Math.atan2(fy - 3 - this.y, fx - this.x);
                        if (d < 8) {
                            this.perchedFlower = fl;
                            this.sipTimer = 55 + Math.floor(Math.random() * 65);
                            return;
                        }
                    }
                }
            }
            if (frameChance(0.028)) {
                this.targetAngle += (Math.random() - 0.5) * 1.1;
            }
        }

        if (this.y < 24) this.targetAngle = Math.PI * 0.45;
        if (this.y > ph - 36) this.targetAngle = -Math.PI * 0.45;
        if (this.x < 24) this.targetAngle = 0;
        if (this.x > pw - 24) this.targetAngle = Math.PI;

        let diff = this.targetAngle - this.angle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        this.angle += diff * frameSmoothing(0.055);

        const flutter = Math.sin(this.phase * 0.7) * 0.14;
        const spd = this.speed * (blossom ? 1.35 : 1.0);
        this.x += Math.cos(this.angle + flutter) * spd * frameScale;
        this.y += Math.sin(this.angle + flutter) * spd * frameScale;
    }

    draw() {
        const cos = Math.cos(this.angle);
        const sin = Math.sin(this.angle);
        const perpX = -sin;
        const perpY = cos;
        const flap = 0.28 + 0.72 * Math.abs(Math.sin(this.phase));

        for (let u = 1; u <= 12; u++) {
            const w = u * flap;
            for (let v = -9; v <= 8; v++) {
                let inForewing = false;
                let inHindwing = false;

                const fwFrontEdge = 2.5 + u * 0.48 - (u * u) * 0.022;
                const fwBackEdge = -1.2 + u * 0.12;
                if (v >= fwBackEdge && v <= fwFrontEdge && u <= 12) {
                    const maxU = 11.5 - Math.abs(v - 3.5) * 0.65;
                    if (u <= maxU) inForewing = true;
                }

                const hwFrontEdge = -0.5 - u * 0.08;
                const hwBackEdge = -7.8 + (u - 4.5) * (u - 4.5) * 0.18;
                if (v <= hwFrontEdge && v >= hwBackEdge && u <= 9) {
                    inHindwing = true;
                }

                const isSwallowTail = (u >= 4 && u <= 5 && v >= -9 && v <= -7);
                if (!inForewing && !inHindwing && !isSwallowTail) continue;

                let col = this.pal.mid;
                const isOuterMargin = (inForewing && (u >= 10 || v >= fwFrontEdge - 1.1 || v <= fwBackEdge + 0.8)) ||
                                      (inHindwing && (u >= 8 || v <= hwBackEdge + 1.1));

                if (isSwallowTail) {
                    col = v === -9 ? this.pal.pearl : this.pal.border;
                } else if (isOuterMargin) {
                    col = this.pal.border;
                    if (u >= 9 && (v + 10) % 2 === 0 && flap > 0.55) col = this.pal.pearl;
                } else if (inHindwing && Math.hypot(u - 4.8, v + 4.2) <= 1.5) {
                    col = Math.hypot(u - 4.8, v + 4.2) < 0.8 ? this.pal.eye : this.pal.border;
                } else if (inForewing && u >= 4 && u <= 8 && v >= 1 && v <= 5) {
                    col = (v === 3 || u === 6) ? this.pal.border : this.pal.hi;
                } else if (u <= 3) {
                    col = this.pal.base;
                }

                const fx = this.x + cos * v;
                const fy = this.y + sin * v;
                pRect(fx + perpX * w, fy + perpY * w, 1, 1, col);
                pRect(fx - perpX * w, fy - perpY * w, 1, 1, col);
            }
        }

        for (let b = -6; b <= 5; b++) {
            pRect(this.x + cos * b, this.y + sin * b, 1, 1, b === 5 ? '#f8fafc' : '#0f172a');
        }

        for (let a = 1; a <= 4; a++) {
            const flare = (a * a) * 0.24;
            const ax = this.x + cos * (5 + a);
            const ay = this.y + sin * (5 + a);
            const tipCol = a === 4 ? this.pal.pearl : '#475569';
            pRect(ax + perpX * flare, ay + perpY * flare, 1, 1, tipCol);
            pRect(ax - perpX * flare, ay - perpY * flare, 1, 1, tipCol);
        }
    }
}

// ============================================================================
// BÖLÜM SONU: KELEBEK SINIFI VE DAVRANIŞLARI
// ============================================================================
