import { pw, ph, frameScale, pRect, frameSmoothing } from './07-habitat-state.js';
import { findAvailableStimulus } from './creature-utils.js';

/* PIXELBETTA — dedicated betta baliği behavior and pixel-art rendering. */

// ============================================================================
// BÖLÜM BAŞI: BETTA BALIĞI SINIFI VE DAVRANIŞLARI
// Bu dosya yalnızca ilgili canlının hareket, etkileşim ve çizim kodunu içerir.
// ============================================================================

/* ============================================================================
   CREATURE 2: SHOW-QUALITY HALFMOON & DUMBO BETTA SPLENDENS
   ============================================================================ */
// ============================================================================
// ============================================================================

export class PixelBetta {
    constructor() {
        this.x = 28 + Math.random() * (pw - 56);
        this.y = ph * 0.42 + Math.random() * (ph * 0.42);
        this.dir = Math.random() < 0.5 ? 1 : -1;
        this.pitch = 0;
        this.angle = this.dir === 1 ? 0 : Math.PI;
        this.speed = 0.24 + Math.random() * 0.11;
        this.curSpeed = this.speed;
        this.phase = Math.random() * Math.PI * 2;

        this.state = 'cruise';
        this.stateTimer = 90 + Math.random() * 140;
        this.homeY = ph * 0.44 + Math.random() * (ph * 0.38);
        this.eatCooldown = 0;
        this.flareTimer = 0;
        this.surfaceRipple = 0;

        const themes = [
            {
                kind: 'butterfly', bodyDark: '#1e3a8a', bodyMid: '#2563eb', bodyHi: '#60a5fa',
                finBase: '#1d4ed8', finMid: '#4f46e5', finRay: '#93c5fd', finRim: '#f8fafc',
                pec: 'rgba(186, 230, 253, 0.75)', rgb: [56, 189, 248]
            },
            {
                kind: 'dragon', bodyDark: '#991b1b', bodyMid: '#e2e8f0', bodyHi: '#ffffff',
                finBase: '#991b1b', finMid: '#e11d48', finRay: '#fb7185', finRim: '#fecdd3',
                pec: 'rgba(254, 205, 211, 0.75)', rgb: [251, 113, 133]
            },
            {
                kind: 'mustard', bodyDark: '#115e59', bodyMid: '#0d9488', bodyHi: '#5eead4',
                finBase: '#0f766e', finMid: '#eab308', finRay: '#fde047', finRim: '#fef08a',
                pec: 'rgba(254, 240, 138, 0.75)', rgb: [45, 212, 191]
            },
            {
                kind: 'koi', bodyDark: '#c2410c', bodyMid: '#fffbeb', bodyHi: '#f97316',
                finBase: '#e11d48', finMid: '#f59e0b', finRay: '#38bdf8', finRim: '#e0f2fe',
                pec: 'rgba(254, 215, 170, 0.78)', rgb: [251, 146, 60]
            },
            {
                kind: 'orchid', bodyDark: '#090d16', bodyMid: '#312e81', bodyHi: '#818cf8',
                finBase: '#4c1d95', finMid: '#9333ea', finRay: '#e879f9', finRim: '#f5d0fe',
                pec: 'rgba(245, 208, 254, 0.80)', rgb: [192, 132, 252]
            }
        ];
        this.pal = themes[Math.floor(Math.random() * themes.length)];
        this.rgb = this.pal.rgb;
        this.seed = Math.floor(Math.random() * 100);

        this.history = [];
        for (let i = 0; i < 20; i++) {
            this.history.push({ x: this.x - this.dir * i * 0.85, y: this.y });
        }
    }

    shiftHistory(dx, dy) {
        for (let i = 0; i < this.history.length; i++) {
            this.history[i].x += dx;
            this.history[i].y += dy;
        }
    }

    update(t) {
        if (this.eatCooldown > 0) this.eatCooldown = Math.max(0, this.eatCooldown - frameScale);
        if (this.flareTimer > 0) this.flareTimer = Math.max(0, this.flareTimer - frameScale);
        if (this.surfaceRipple > 0) this.surfaceRipple = Math.max(0, this.surfaceRipple - 0.35 * frameScale);

        let targetPitch = 0;
        let targetSpd = this.speed;

        const worm = findAvailableStimulus(this, 'bloodworm', Math.max(380, pw * 0.85));
        if (worm) {
            this.state = 'cruise';
            this.flareTimer = 20;
            const dx = worm.x - this.x;
            const dy = worm.y - this.y;
            const dist = Math.max(1, Math.hypot(dx, dy));

            if (Math.abs(dx) > 3) this.dir = dx >= 0 ? 1 : -1;
            targetPitch = Math.max(-0.52, Math.min(0.52, Math.atan2(dy, Math.abs(dx) + 2)));
            targetSpd = this.speed * 1.65;

            if (dist < 7) {
                worm.life = 0;
                this.eatCooldown = 80;
                this.flareTimer = 45;
                this.state = 'hover';
                this.stateTimer = 40;
                this.homeY = Math.max(ph * 0.42, Math.min(ph - 30, this.y + 18));
            }
        } else if (this.state === 'surface_sip') {
            this.stateTimer -= frameScale;
            targetPitch = -0.46;
            targetSpd = this.speed * 1.35;

            if (this.y <= 14 || this.stateTimer <= 0) {
                if (this.y <= 16) this.surfaceRipple = 8;
                this.state = 'cruise';
                this.stateTimer = 110 + Math.random() * 120;
                this.homeY = ph * 0.48 + Math.random() * (ph * 0.36);
                this.pitch = 0.38;
            }
        } else if (this.state === 'hover') {
            this.stateTimer -= frameScale;
            targetSpd = 0.03;
            targetPitch = this.y < ph * 0.38 ? 0.16 : Math.sin(this.phase * 0.5) * 0.06;

            if (this.stateTimer <= 0) {
                if (Math.random() < 0.05 && this.y > ph * 0.45) {
                    this.state = 'surface_sip';
                    this.stateTimer = 95;
                } else {
                    this.state = 'cruise';
                    this.stateTimer = 100 + Math.random() * 160;
                    if (Math.random() < 0.45) this.dir *= -1;
                    this.homeY = ph * 0.40 + Math.random() * (ph * 0.44);
                }
            }
        } else {
            this.stateTimer -= frameScale;
            const dyHome = this.homeY - this.y;
            targetPitch = Math.max(-0.34, Math.min(0.38, dyHome * 0.014 + Math.sin(this.phase * 0.4) * 0.06));
            targetSpd = this.speed * (0.85 + 0.30 * Math.sin(this.phase * 0.75));

            if (this.x < 34 && this.dir === -1) {
                this.dir = 1;
                this.flareTimer = 35;
            } else if (this.x > pw - 34 && this.dir === 1) {
                this.dir = -1;
                this.flareTimer = 35;
            }

            if (this.stateTimer <= 0) {
                this.state = 'hover';
                this.stateTimer = 45 + Math.random() * 75;
                if (Math.random() < 0.55) this.flareTimer = 45 + Math.random() * 35;
            }
        }

        if (this.state !== 'surface_sip' && !worm && this.y < ph * 0.30) {
            targetPitch = Math.max(targetPitch, 0.28);
        }
        if (this.y > ph - 26) {
            targetPitch = Math.min(targetPitch, -0.28);
        }

        this.pitch += (targetPitch - this.pitch) * frameSmoothing(0.08);
        this.curSpeed += (targetSpd - this.curSpeed) * frameSmoothing(0.09);
        this.phase += (this.state === 'hover' ? 0.055 : 0.082) * frameScale;

        this.angle = this.dir === 1 ? this.pitch : (Math.PI - this.pitch);

        this.x += Math.cos(this.angle) * this.curSpeed * frameScale;
        this.y += Math.sin(this.angle) * this.curSpeed * frameScale;

        if (this.x < -36) {
            const wrapDelta = pw + 72;
            this.x += wrapDelta;
            this.shiftHistory(wrapDelta, 0);
        } else if (this.x > pw + 36) {
            const wrapDelta = -(pw + 72);
            this.x += wrapDelta;
            this.shiftHistory(wrapDelta, 0);
        }

        const cos = Math.cos(this.angle);
        const sin = Math.sin(this.angle);
        const tailBaseX = this.x - cos * 5;
        const tailBaseY = this.y - sin * 5;
        this.history[0].x = tailBaseX;
        this.history[0].y = tailBaseY;

        const hoverDrape = this.state === 'hover' ? 0.09 : 0.02;
        for (let i = 1; i < this.history.length; i++) {
            const prev = this.history[i - 1];
            const cur = this.history[i];
            const wave = Math.sin(this.phase - i * 0.32) * (0.24 + i * 0.036);
            const tx = prev.x - cos * 0.78 - sin * wave;
            const ty = prev.y - sin * 0.78 + cos * wave + hoverDrape;
            cur.x += (tx - cur.x) * frameSmoothing(0.42);
            cur.y += (ty - cur.y) * frameSmoothing(0.42);
        }
    }

    draw() {
        const cos = Math.cos(this.angle);
        const sin = Math.sin(this.angle);
        const perpX = -sin;
        const perpY = cos;
        const upSign = this.dir;
        const flareBonus = this.flareTimer > 0 ? 1.18 : 1.0;

        if (this.surfaceRipple > 0) {
            const r = Math.round((8 - this.surfaceRipple) * 1.6);
            pRect(this.x - r, 3, 2, 1, 'rgba(224, 242, 254, 0.55)');
            pRect(this.x + r, 3, 2, 1, 'rgba(224, 242, 254, 0.55)');
        }

        for (let i = this.history.length - 1; i >= 0; i--) {
            const pt = this.history[i];
            if (Math.abs(pt.x - this.x) > 42 || Math.abs(pt.y - this.y) > 42) continue;
            const tRatio = i / (this.history.length - 1);
            const fanRadius = Math.round((2.2 + Math.sin(tRatio * Math.PI * 0.85) * 9.8) * flareBonus);

            for (let r = -fanRadius; r <= fanRadius; r++) {
                const rRatio = Math.abs(r) / (fanRadius || 1);
                if (tRatio > 0.88 && (Math.abs(r) % 3 === 1)) continue;

                const silkFold = Math.sin(this.phase * 1.15 - i * 0.26 + r * 0.38) * 0.65;
                const px = pt.x + perpX * (r * 0.82 + silkFold);
                const py = pt.y + perpY * (r * 0.82 + silkFold);

                let col = this.pal.finBase;
                if (tRatio > 0.80 || rRatio > 0.84) {
                    col = this.pal.finRim;
                } else if (Math.abs(r) % 3 === 0) {
                    col = tRatio > 0.45 ? this.pal.finRay : this.pal.finMid;
                } else if (tRatio > 0.36) {
                    col = this.pal.finMid;
                }

                pRect(px, py, 1, 2, col);
            }
        }

        for (let i = 0; i < 12; i++) {
            const pt = this.history[i];
            if (Math.abs(pt.x - this.x) > 42) continue;
            const dorsalH = Math.round((2 + Math.sin((i / 11) * Math.PI) * 5.5) * flareBonus);
            for (let d = 1; d <= dorsalH; d++) {
                const col = d === dorsalH ? this.pal.finRim : (i % 2 === 0 ? this.pal.finRay : this.pal.finMid);
                pRect(pt.x - perpX * d * upSign, pt.y - perpY * d * upSign, 2, 1, col);
            }
            const analH = Math.round((3 + (i / 11) * 6.5) * flareBonus);
            for (let a = 1; a <= analH; a++) {
                const col = a === analH ? this.pal.finRim : (a > analH - 2 ? this.pal.finRay : this.pal.finBase);
                pRect(pt.x + perpX * a * upSign, pt.y + perpY * a * upSign, 2, 1, col);
            }
        }

        const venBaseX = this.x + cos * 1.2 + perpX * 2.2 * upSign;
        const venBaseY = this.y + sin * 1.2 + perpY * 2.2 * upSign;
        for (let v = 0; v < 6; v++) {
            const vSway = Math.sin(this.phase - v * 0.4) * 0.6;
            const vx = venBaseX - cos * v * 0.55 + perpX * (v * 0.85 * upSign + vSway);
            const vy = venBaseY - sin * v * 0.55 + perpY * (v * 0.85 * upSign + vSway);
            pRect(vx, vy, 1, 1, v >= 4 ? '#ffffff' : this.pal.finMid);
            pRect(vx - cos * 1.2, vy - sin * 1.2, 1, 1, v >= 4 ? this.pal.finRim : this.pal.finBase);
        }

        for (let b = -5; b <= 6; b++) {
            const halfThick = b > 3 ? (6 - b) * 0.72 : (b < -2 ? (6 + b) * 0.68 : 2.5);
            for (let w = -Math.floor(halfThick); w <= Math.floor(halfThick); w++) {
                const bx = this.x + cos * b + perpX * w;
                const by = this.y + sin * b + perpY * w;
                let col = this.pal.bodyMid;

                if (this.pal.kind === 'koi') {
                    if ((b + w + this.seed) % 4 === 0) col = '#0f172a';
                    else if ((b * w + this.seed) % 3 === 0) col = this.pal.bodyHi;
                    else if (b < 0) col = this.pal.bodyDark;
                } else if (this.pal.kind === 'dragon') {
                    col = ((b + w) % 2 === 0 && Math.abs(w) <= 1) ? this.pal.bodyHi : (w * upSign > 1 ? this.pal.bodyDark : this.pal.bodyMid);
                } else {
                    if (w * upSign < 0) col = (b + w) % 2 === 0 ? this.pal.bodyHi : this.pal.bodyMid;
                    else if (w * upSign > 0) col = this.pal.bodyDark;
                }
                pRect(bx, by, 1, 1, col);
            }
        }

        const pecFlutter = Math.sin(this.phase * (this.state === 'hover' ? 3.2 : 2.2)) * 1.4;
        const pecX = this.x + cos * (1.5 + pecFlutter * 0.35) + perpX * 1.2 * upSign;
        const pecY = this.y + sin * (1.5 + pecFlutter * 0.35) + perpY * 1.2 * upSign;
        pRect(pecX - 1, pecY - 1, 3, 3, this.pal.pec);
        pRect(pecX, pecY, 2, 2, '#ffffff');

        const eyeX = this.x + cos * 4.5 - perpX * 0.6 * upSign;
        const eyeY = this.y + sin * 4.5 - perpY * 0.6 * upSign;
        pRect(eyeX, eyeY, 1, 1, '#0f172a');
        pRect(eyeX - cos * 0.5, eyeY - sin * 0.5, 1, 1, '#e0f2fe');

        if (this.flareTimer > 0) {
            const gillX = this.x + cos * 2.5 + perpX * 2.2 * upSign;
            const gillY = this.y + sin * 2.5 + perpY * 2.2 * upSign;
            pRect(gillX, gillY, 2, 2, '#dc2626');
        }
    }
}

// ============================================================================
// BÖLÜM SONU: BETTA BALIĞI SINIFI VE DAVRANIŞLARI
// ============================================================================
