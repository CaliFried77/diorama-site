import { pw, ph, frameScale, frameChance, flora, pRect } from './07-habitat-state.js';
import { findAvailableStimulus } from './creature-utils.js';
import { getGroundY } from './habitat-geometry.js';

/* PIXELBEE — dedicated ari behavior and pixel-art rendering. */

// ============================================================================
// BÖLÜM BAŞI: ARI SINIFI VE DAVRANIŞLARI
// Bu dosya yalnızca ilgili canlının hareket, etkileşim ve çizim kodunu içerir.
// ============================================================================

/* ============================================================================
   CREATURE 1: ARTISAN HONEYBEE, ROYAL BUMBLEBEE & VIOLET CARPENTER BEE
   Multi-state foraging AI: Visits all meadow wildflowers, fills hind-leg pollen
   baskets (corbiculae) after sipping nectar, returns to the Grand Right Apiary
   Sanctuary to deposit pollen, and performs figure-8 hover dances!
   ============================================================================ */
// ============================================================================
// ============================================================================

export class PixelBee {
    constructor() {
        this.x = 24 + Math.random() * (pw - 48);
        this.y = 28 + Math.random() * (ph - 68);
        this.dir = Math.random() < 0.5 ? 1 : -1;
        this.vx = this.dir * (0.32 + Math.random() * 0.18);
        this.vy = (Math.random() - 0.5) * 0.16;
        this.phase = Math.random() * Math.PI * 2;

        const roll = Math.random();
        this.species = roll < 0.50 ? 'honey' : (roll < 0.85 ? 'bumble' : 'carpenter');
        this.isBumble = this.species !== 'honey';
        this.rgb = this.species === 'carpenter' ? [192, 132, 252] : [251, 191, 36];

        this.sipTimer = 0;
        this.eatCooldown = 0;
        this.perchedFlower = null;
        this.hasPollen = Math.random() < 0.4;
        this.visitingHive = null;
        this.sipSpot = null;
        this.trail = [];
    }

    update(t) {
        this.phase += (this.sipTimer > 0 ? 0.12 : 0.38) * frameScale;
        if (this.eatCooldown > 0) this.eatCooldown = Math.max(0, this.eatCooldown - frameScale);

        if (this.sipTimer > 0) {
            this.sipTimer = Math.max(0, this.sipTimer - frameScale);
            this.vx *= Math.pow(0.80, frameScale);
            this.vy *= Math.pow(0.80, frameScale);

            if (this.perchedFlower) {
                const tx = this.perchedFlower.tipX !== undefined ? this.perchedFlower.tipX : this.perchedFlower.x;
                const ty = this.perchedFlower.tipY !== undefined ? this.perchedFlower.tipY : (ph - (this.perchedFlower.h || 24));
                this.x = tx;
                this.y = ty - 3;
            } else if (this.visitingHive) {
                this.x = this.visitingHive.x;
                this.y = this.visitingHive.y;
            } else if (this.sipSpot) {
                this.x = this.sipSpot.x;
                this.y = this.sipSpot.y;
            }

            if (this.sipTimer === 0) {
                if (this.perchedFlower) this.hasPollen = true;
                if (this.visitingHive) this.hasPollen = false;
                this.perchedFlower = null;
                this.visitingHive = null;
                this.sipSpot = null;

                const awayAngle = -Math.PI * 0.5 + (Math.random() - 0.5) * 1.5;
                this.vx = Math.cos(awayAngle) * 0.48;
                this.vy = Math.sin(awayAngle) * 0.38;
                this.dir = this.vx >= 0 ? 1 : -1;
                this.eatCooldown = 95;
            }
            return;
        }

        const nectar = findAvailableStimulus(this, 'honey_nectar', Math.max(350, pw * 0.8));
        if (nectar) {
            const targetY = nectar.y - 3;
            const dx = nectar.x - this.x;
            const dy = targetY - this.y;
            const dist = Math.max(1, Math.hypot(dx, dy));
            if (dist < 6) {
                this.sipSpot = { x: nectar.x, y: targetY };
                nectar.life = 0;
                this.hasPollen = true;
                this.sipTimer = 26;
                return;
            }
            this.vx += (dx / dist) * 0.048 * frameScale;
            this.vy += (dy / dist) * 0.048 * frameScale;
        } else if (this.eatCooldown === 0 && this.hasPollen && frameChance(0.008)) {
            const apiaryX = Math.round(pw * 0.84);
            const hgy = getGroundY(apiaryX, 'meadow', pw, ph) + 1;
            const hiveTargets = [
                { x: apiaryX - 1, y: hgy - 11 },
                { x: apiaryX - 1, y: hgy - 24 }
            ];
            const target = hiveTargets[Math.floor(Math.random() * hiveTargets.length)];
            const dx = target.x - this.x;
            const dy = target.y - this.y;
            const dist = Math.hypot(dx, dy);
            if (dist < 130) {
                this.vx += (dx / dist) * 0.065 * frameScale;
                this.vy += (dy / dist) * 0.065 * frameScale;
                if (dist < 8) {
                    this.visitingHive = target;
                    this.sipTimer = 28;
                    return;
                }
            }
        } else if (this.eatCooldown === 0 && frameChance(0.014)) {
            const flowers = flora.filter(f => f.type === 'sunflower' || f.type === 'foxglove' || (f.type === 'meadow' && f.hasBloom));
            if (flowers.length > 0) {
                const fl = flowers[Math.floor(Math.random() * flowers.length)];
                const fx = fl.tipX !== undefined ? fl.tipX : fl.x;
                const fy = (fl.tipY !== undefined ? fl.tipY : (ph - fl.h)) - 3;
                const dx = fx - this.x;
                const dy = fy - this.y;
                const dist = Math.hypot(dx, dy);
                if (dist < 110) {
                    this.vx += (dx / dist) * 0.075 * frameScale;
                    this.vy += (dy / dist) * 0.075 * frameScale;
                    if (dist < 8) {
                        this.perchedFlower = fl;
                        this.sipTimer = 36 + Math.floor(Math.random() * 30);
                        return;
                    }
                }
            }
        } else {
            this.vx += (Math.random() - 0.5) * 0.028 * frameScale;
            this.vy += ((Math.random() - 0.5) * 0.022 + Math.sin(this.phase * 0.16) * 0.011) * frameScale;
        }

        const maxSpd = nectar ? 0.72 : 0.56;
        const spd = Math.hypot(this.vx, this.vy);
        if (spd > maxSpd) {
            this.vx = (this.vx / spd) * maxSpd;
            this.vy = (this.vy / spd) * maxSpd;
        } else if (spd < 0.22) {
            this.vx += this.dir * 0.04 * frameScale;
        }

        if (Math.abs(this.vx) > 0.06) this.dir = this.vx >= 0 ? 1 : -1;

        const groundLim = getGroundY(this.x, 'meadow', pw, ph) - (nectar ? 8 : 22);
        if (this.y < 24) this.vy += 0.038 * frameScale;
        if (this.y > groundLim) this.vy -= 0.042 * frameScale;

        this.x += this.vx * frameScale;
        this.y += this.vy * frameScale;

        if (this.x < -20) { this.x = pw + 20; this.trail = []; }
        if (this.x > pw + 20) { this.x = -20; this.trail = []; }

        if (!this.perchedFlower && !this.visitingHive && !this.sipSpot && frameChance(0.32)) {
            this.trail.push({ x: this.x, y: this.y + 1, life: 14 });
            if (this.trail.length > 5) this.trail.shift();
        }
        for (let i = this.trail.length - 1; i >= 0; i--) {
            this.trail[i].life -= frameScale;
            if (this.trail[i].life <= 0) this.trail.splice(i, 1);
        }
    }

    draw() {
        const dir = this.dir;
        const bx = Math.round(this.x);
        const by = Math.round(this.y);
        const isPerched = this.sipTimer > 0;
        const tilt = isPerched ? 0 : 1;

        for (let i = 0; i < this.trail.length; i++) {
            const tr = this.trail[i];
            const tCol = this.species === 'carpenter'
                ? `rgba(216, 180, 254, ${(tr.life / 20).toFixed(2)})`
                : `rgba(253, 224, 71, ${(tr.life / 20).toFixed(2)})`;
            pRect(tr.x - dir * 6, tr.y, 1, 1, tCol);
        }

        const flap = isPerched ? 0 : Math.round(Math.sin(this.phase * 2.3) * 3);
        const wingH = isPerched ? 2 : (4 + Math.abs(flap));
        const backWingCol = this.species === 'carpenter'
            ? 'rgba(192, 132, 252, 0.50)'
            : 'rgba(186, 230, 253, 0.46)';
        if (isPerched) {
            pRect(bx - (dir > 0 ? 5 : 0), by - 4, 5, 2, backWingCol);
        } else {
            pRect(bx - (dir > 0 ? 3 : 1), by - 2 - wingH, 4, wingH, backWingCol);
        }

        const legDrop = isPerched ? 1 : 0;
        const legCol = '#18181b';
        pRect(bx + 2 * dir, by + 2, 1, 2 + legDrop, legCol);
        pRect(bx, by + 2, 1, 2 + legDrop, legCol);
        pRect(bx - 2 * dir, by + 2, 1, 2 + legDrop, legCol);
        pRect(bx - 3 * dir, by + 3 + legDrop, 1, 1, legCol);

        const abLen = this.isBumble ? 7 : 6;
        for (let s = -abLen; s <= -2; s++) {
            const yOff = by + (s < -4 ? tilt : 0);
            const halfH = (s === -abLen || s === -2) ? 2 : (this.isBumble ? 3 : 2);
            for (let dy = -halfH; dy <= halfH; dy++) {
                let col = '#18181b';
                const band = Math.abs(s);
                if (this.species === 'carpenter') {
                    col = dy === -halfH ? '#7e22ce' : (dy < 0 ? '#312e81' : '#0f172a');
                } else if (band === 3 || band === 4 || (this.isBumble && band === 6)) {
                    col = dy === -halfH ? '#fef08a' : (dy <= 0 ? '#fbbf24' : '#d97706');
                } else if (this.species === 'bumble' && band === 7) {
                    col = dy < 0 ? '#ffffff' : '#fef3c7';
                } else if (dy === -halfH) {
                    col = '#3f3f46';
                } else if (dy === halfH) {
                    col = '#09090b';
                }
                pRect(bx + s * dir, yOff + dy, 1, 1, col);
            }
        }
        pRect(bx - (abLen + 1) * dir, by + tilt, 1, 1, this.species === 'bumble' ? '#e2e8f0' : '#09090b');

        for (let s = -1; s <= 2; s++) {
            for (let dy = -3; dy <= 2; dy++) {
                if ((s === -1 || s === 2) && Math.abs(dy) === 3) continue;
                let col = dy === -3 ? '#fde047' : (dy <= -1 ? '#f59e0b' : (dy === 0 ? '#b45309' : '#78350f'));
                if (this.species === 'carpenter') {
                    col = dy <= -2 ? '#6b21a8' : (dy <= 0 ? '#312e81' : '#1e1b4b');
                } else if (this.species === 'bumble' && s === 2) {
                    col = dy <= -1 ? '#fef08a' : '#d97706';
                }
                pRect(bx + s * dir, by + dy, 1, 1, col);
            }
        }

        for (let s = 3; s <= 4; s++) {
            for (let dy = -2; dy <= 1; dy++) {
                if (s === 4 && dy === -2) continue;
                pRect(bx + s * dir, by + dy, 1, 1, '#18181b');
            }
        }
        pRect(bx + 4 * dir, by - 1, 1, 2, '#0284c7');
        pRect(bx + 4 * dir, by - 1, 1, 1, '#e0f2fe');

        const antTwitch = Math.round(Math.sin(this.phase * 0.5) * 0.4);
        pRect(bx + 5 * dir, by - 2, 1, 1, '#27272a');
        pRect(bx + 6 * dir, by - 3 + antTwitch, 1, 1, this.species === 'carpenter' ? '#a855f7' : '#fbbf24');

        if (isPerched) {
            pRect(bx + 4 * dir, by + 2, 1, 2, '#92400e');
            pRect(bx + 5 * dir, by + 3, 1, 1, '#b45309');
        }

        if (this.hasPollen) {
            const polX = dir > 0 ? bx - 3 : bx + 2;
            pRect(polX, by + 2 + legDrop, 2, 2, '#f59e0b');
            pRect(polX, by + 2 + legDrop, 2, 1, '#fde047');
        }

        const foreWingCol = this.species === 'carpenter'
            ? 'rgba(233, 213, 255, 0.78)'
            : 'rgba(240, 249, 255, 0.84)';
        if (isPerched) {
            const foldX = dir > 0 ? bx - 6 : bx + 1;
            pRect(foldX, by - 3, 6, 2, foreWingCol);
            pRect(foldX + (dir > 0 ? 1 : 0), by - 3, 5, 1, 'rgba(255, 255, 255, 0.94)');
        } else {
            const fwY = by - 3 - Math.abs(flap);
            const fwX = dir > 0 ? bx - 2 : bx - 3;
            pRect(fwX, fwY, 5, 3, foreWingCol);
            pRect(fwX + (dir > 0 ? 1 : 0), fwY - 1, 4, 1, 'rgba(255, 255, 255, 0.95)');
        }
    }
}

// ============================================================================
// BÖLÜM SONU: ARI SINIFI VE DAVRANIŞLARI
// ============================================================================
