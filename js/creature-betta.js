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

function getBettaSubstrateY(x) {
    const nx = x / Math.max(1, pw);
    if (Math.abs(nx - 0.50) < 0.085) {
        return ph - 5 - Math.round(Math.cos((nx - 0.50) * 18) * 2);
    }
    const mound = Math.pow(Math.abs(nx - 0.50) * 1.95, 1.45) * 18;
    return Math.round(ph - 4 - mound - Math.sin(x * 0.04) * 2);
}

export class PixelBetta {
    constructor() {
        this.x = 28 + Math.random() * (pw - 56);
        this.y = ph * 0.40 + Math.random() * (ph * 0.36);
        this.dir = Math.random() < 0.5 ? 1 : -1;
        this.pitch = 0;
        this.angle = this.dir === 1 ? 0 : Math.PI;
        this.speed = 0.24 + Math.random() * 0.11;
        this.curSpeed = this.speed;
        this.phase = Math.random() * Math.PI * 2;

        this.state = 'cruise';
        this.stateTimer = 90 + Math.random() * 140;
        this.homeY = ph * 0.42 + Math.random() * (ph * 0.34);
        this.eatCooldown = 0;
        this.flareTimer = 0;
        this.surfaceRipple = 0;
        this.rippleX = this.x;

        const themes = [
            {
                kind: 'butterfly', bodyDark: '#1e3a8a', bodyMid: '#2563eb', bodyHi: '#60a5fa',
                finBase: '#1d4ed8', finMid: '#4f46e5', finRay: '#93c5fd', finRim: '#f8fafc',
                pec: 'rgba(186, 230, 253, 0.78)', rgb: [56, 189, 248]
            },
            {
                kind: 'dragon', bodyDark: '#7f1d1d', bodyMid: '#e2e8f0', bodyHi: '#ffffff',
                finBase: '#991b1b', finMid: '#e11d48', finRay: '#fb7185', finRim: '#ffe4e6',
                pec: 'rgba(254, 205, 211, 0.78)', rgb: [251, 113, 133]
            },
            {
                kind: 'mustard', bodyDark: '#115e59', bodyMid: '#0d9488', bodyHi: '#5eead4',
                finBase: '#0f766e', finMid: '#eab308', finRay: '#fde047', finRim: '#fef9c3',
                pec: 'rgba(254, 240, 138, 0.78)', rgb: [45, 212, 191]
            },
            {
                kind: 'koi', bodyDark: '#c2410c', bodyMid: '#fffbeb', bodyHi: '#f97316',
                finBase: '#e11d48', finMid: '#f59e0b', finRay: '#38bdf8', finRim: '#e0f2fe',
                pec: 'rgba(254, 215, 170, 0.80)', rgb: [251, 146, 60]
            },
            {
                kind: 'orchid', bodyDark: '#090d16', bodyMid: '#312e81', bodyHi: '#818cf8',
                finBase: '#4c1d95', finMid: '#9333ea', finRay: '#e879f9', finRim: '#fae8ff',
                pec: 'rgba(245, 208, 254, 0.82)', rgb: [192, 132, 252]
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
        if (this.surfaceRipple > 0) this.surfaceRipple = Math.max(0, this.surfaceRipple - 0.32 * frameScale);

        let targetPitch = 0;
        let targetSpd = this.speed;
        const floorY = getBettaSubstrateY(this.x);

        const worm = findAvailableStimulus(this, 'bloodworm', Math.max(380, pw * 0.85));
        if (worm) {
            this.state = 'cruise';
            this.flareTimer = 22;
            const aimY = Math.min(worm.y, getBettaSubstrateY(worm.x) - 5);
            const dx = worm.x - this.x;
            const dy = aimY - this.y;
            const dist = Math.max(1, Math.hypot(dx, dy));

            if (Math.abs(dx) > 3) this.dir = dx >= 0 ? 1 : -1;
            targetPitch = Math.max(-0.55, Math.min(0.55, Math.atan2(dy, Math.abs(dx) + 2)));
            targetSpd = this.speed * 1.65;

            if (dist < 8) {
                worm.life = 0;
                this.eatCooldown = 80;
                this.flareTimer = 48;
                this.state = 'hover';
                this.stateTimer = 42;
                this.homeY = Math.max(ph * 0.36, Math.min(floorY - 18, this.y));
            }
        } else if (this.state === 'surface_sip') {
            this.stateTimer -= frameScale;
            targetPitch = -0.46;
            targetSpd = this.speed * 1.35;

            if (this.y <= 13 || this.stateTimer <= 0) {
                if (this.y <= 15) {
                    this.surfaceRipple = 8;
                    this.rippleX = this.x + this.dir * 5;
                }
                this.state = 'cruise';
                this.stateTimer = 110 + Math.random() * 120;
                this.homeY = ph * 0.44 + Math.random() * (ph * 0.32);
                this.pitch = 0.36;
            }
        } else if (this.state === 'hover') {
            this.stateTimer -= frameScale;
            targetSpd = 0.03;
            targetPitch = this.y < ph * 0.35 ? 0.14 : Math.sin(this.phase * 0.5) * 0.05;

            if (this.stateTimer <= 0) {
                if (Math.random() < 0.06 && this.y > ph * 0.42) {
                    this.state = 'surface_sip';
                    this.stateTimer = 95;
                } else {
                    this.state = 'cruise';
                    this.stateTimer = 100 + Math.random() * 160;
                    if (Math.random() < 0.45) this.dir *= -1;
                    this.homeY = ph * 0.36 + Math.random() * (ph * 0.38);
                }
            }
        } else {
            this.stateTimer -= frameScale;
            const safeHomeY = Math.min(this.homeY, floorY - 16);
            const dyHome = safeHomeY - this.y;
            targetPitch = Math.max(-0.34, Math.min(0.38, dyHome * 0.015 + Math.sin(this.phase * 0.4) * 0.06));
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

        if (this.state !== 'surface_sip' && !worm && this.y < ph * 0.24) {
            targetPitch = Math.max(targetPitch, 0.28);
        }
        const minClearance = worm ? 8 : 15;
        if (this.y > floorY - minClearance) {
            targetPitch = Math.min(targetPitch, -0.34);
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
        const tailBaseX = this.x - cos * 4.5;
        const tailBaseY = this.y - sin * 4.5;
        this.history[0].x = tailBaseX;
        this.history[0].y = tailBaseY;

        const hoverDrape = this.state === 'hover' ? 0.08 : 0.02;
        for (let i = 1; i < this.history.length; i++) {
            const prev = this.history[i - 1];
            const cur = this.history[i];
            const wave = Math.sin(this.phase - i * 0.32) * (0.22 + i * 0.035);
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
            const r = Math.round((8 - this.surfaceRipple) * 1.8);
            const alpha = (this.surfaceRipple / 12).toFixed(2);
            pRect(this.rippleX - r, 2, 3, 1, `rgba(224, 242, 254, ${alpha})`);
            pRect(this.rippleX + r - 1, 2, 3, 1, `rgba(224, 242, 254, ${alpha})`);
            pRect(this.rippleX, 3 + Math.round((8 - this.surfaceRipple) * 0.5), 1, 1, `rgba(255, 255, 255, ${alpha})`);
        }

        for (let i = this.history.length - 1; i >= 0; i--) {
            const pt = this.history[i];
            if (Math.abs(pt.x - this.x) > 44 || Math.abs(pt.y - this.y) > 44) continue;
            const tRatio = i / (this.history.length - 1);
            const fanRadius = Math.round((2.4 + Math.sin(tRatio * Math.PI * 0.86) * 10.2) * flareBonus);

            for (let r = -fanRadius; r <= fanRadius; r++) {
                const rRatio = Math.abs(r) / (fanRadius || 1);
                if (tRatio > 0.90 && (Math.abs(r) % 3 === 1)) continue;

                const silkFold = Math.sin(this.phase * 1.15 - i * 0.26 + r * 0.36) * 0.65;
                const px = pt.x + perpX * (r * 0.82 + silkFold);
                const py = pt.y + perpY * (r * 0.82 + silkFold);

                let col = this.pal.finBase;
                if (tRatio > 0.82 || rRatio > 0.86) {
                    col = this.pal.finRim;
                } else if (tRatio > 0.72 && (this.pal.kind === 'butterfly' || this.pal.kind === 'mustard')) {
                    col = this.pal.bodyDark;
                } else if (Math.abs(r) % 2 === 0 && tRatio > 0.25) {
                    col = tRatio > 0.48 ? this.pal.finRay : this.pal.finMid;
                } else if (tRatio > 0.34) {
                    col = this.pal.finMid;
                }

                pRect(px, py, 2, 2, col);
            }
        }

        for (let i = 0; i < 13; i++) {
            const pt = i === 0
                ? { x: this.x - cos * 1.5, y: this.y - sin * 1.5 }
                : this.history[i - 1];
            if (Math.abs(pt.x - this.x) > 44) continue;
            const prog = i / 12;

            const dorsalH = Math.round((2.2 + Math.sin(prog * Math.PI * 0.92) * 5.8) * flareBonus);
            for (let d = 1; d <= dorsalH; d++) {
                const sway = Math.sin(this.phase - i * 0.25 + d * 0.2) * 0.35;
                const col = d === dorsalH ? this.pal.finRim : (d > dorsalH - 2 || i % 2 === 0 ? this.pal.finRay : this.pal.finMid);
                pRect(pt.x - perpX * d * upSign - cos * sway, pt.y - perpY * d * upSign - sin * sway, 2, 1, col);
            }

            const analH = Math.round((2.8 + Math.pow(prog, 0.75) * 6.8) * flareBonus);
            for (let a = 1; a <= analH; a++) {
                const sway = Math.sin(this.phase - i * 0.22 + a * 0.18) * 0.35;
                const col = a === analH ? this.pal.finRim : (a > analH - 2 ? this.pal.finRay : (i % 2 === 0 ? this.pal.finMid : this.pal.finBase));
                pRect(pt.x + perpX * a * upSign - cos * sway, pt.y + perpY * a * upSign - sin * sway, 2, 1, col);
            }
        }

        const venBaseX = this.x + cos * 1.4 + perpX * 2.0 * upSign;
        const venBaseY = this.y + sin * 1.4 + perpY * 2.0 * upSign;
        for (let v = 0; v < 7; v++) {
            const vSway = Math.sin(this.phase - v * 0.38) * 0.65;
            const vx = venBaseX - cos * v * 0.48 + perpX * (v * 0.85 * upSign + vSway);
            const vy = venBaseY - sin * v * 0.48 + perpY * (v * 0.85 * upSign + vSway);
            pRect(vx - cos * 1.3, vy - sin * 1.3, 1, 1, v >= 5 ? this.pal.finRim : this.pal.finBase);
            pRect(vx, vy, 1, 2, v >= 5 ? '#ffffff' : (v >= 3 ? this.pal.finRay : this.pal.finMid));
        }

        for (let b = -5; b <= 6; b++) {
            const dorsalArch = b >= -2 && b <= 3 ? 0.45 : 0;
            const halfThick = (b > 3 ? (6.4 - b) * 0.74 : (b < -2 ? (6.2 + b) * 0.72 : 2.5)) + dorsalArch;
            for (let w = -Math.floor(halfThick); w <= Math.floor(halfThick); w++) {
                const bx = this.x + cos * b + perpX * w;
                const by = this.y + sin * b + perpY * w;
                let col = this.pal.bodyMid;

                if (this.pal.kind === 'koi') {
                    if ((b + w + this.seed) % 4 === 0) col = '#0f172a';
                    else if ((b * w + this.seed) % 3 === 0) col = this.pal.bodyHi;
                    else if (b < -1) col = this.pal.bodyDark;
                } else if (this.pal.kind === 'dragon') {
                    col = ((b + w) % 2 === 0 && Math.abs(w) <= 1 && b <= 3) ? this.pal.bodyHi : (w * upSign > 1 ? this.pal.bodyDark : this.pal.bodyMid);
                } else {
                    if (w * upSign < 0) col = ((b + w) % 2 === 0 && b <= 3) ? this.pal.bodyHi : this.pal.bodyMid;
                    else if (w * upSign > 0) col = this.pal.bodyDark;
                }
                pRect(bx, by, 1, 1, col);
            }
        }

        const lipX = this.x + cos * 6.3 - perpX * 0.5 * upSign;
        const lipY = this.y + sin * 6.3 - perpY * 0.5 * upSign;
        pRect(lipX, lipY, 1, 1, this.pal.bodyHi);

        const gillCurveX = this.x + cos * 2.6 + perpX * 0.8 * upSign;
        const gillCurveY = this.y + sin * 2.6 + perpY * 0.8 * upSign;
        pRect(gillCurveX, gillCurveY, 1, 2, this.pal.bodyDark);

        if (this.flareTimer > 0) {
            const gillX = this.x + cos * 2.2 + perpX * 2.1 * upSign;
            const gillY = this.y + sin * 2.2 + perpY * 2.1 * upSign;
            pRect(gillX, gillY, 2, 2, '#991b1b');
            pRect(gillX - cos * 0.8, gillY - sin * 0.8, 1, 2, '#ef4444');
        }

        const pecFlutter = Math.sin(this.phase * (this.state === 'hover' ? 3.2 : 2.2));
        const pecReach = 2.2 + pecFlutter * 0.8;
        const pecAnchorX = this.x + cos * 1.8 + perpX * 0.8 * upSign;
        const pecAnchorY = this.y + sin * 1.8 + perpY * 0.8 * upSign;
        for (let pr = -1; pr <= 1; pr++) {
            const px = pecAnchorX - cos * pecReach * 0.5 + perpX * (pr + 0.8 * upSign);
            const py = pecAnchorY - sin * pecReach * 0.5 + perpY * (pr + 0.8 * upSign);
            pRect(px, py, 2, 2, this.pal.pec);
            pRect(px - cos * 0.8, py - sin * 0.8, 1, 1, '#ffffff');
        }

        const eyeX = this.x + cos * 4.5 - perpX * 0.6 * upSign;
        const eyeY = this.y + sin * 4.5 - perpY * 0.6 * upSign;
        pRect(eyeX, eyeY, 2, 2, '#090d16');
        pRect(eyeX, eyeY, 1, 1, '#e0f2fe');
    }
}

// ============================================================================
// BÖLÜM SONU: BETTA BALIĞI SINIFI VE DAVRANIŞLARI
// ============================================================================
