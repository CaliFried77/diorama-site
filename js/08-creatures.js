import { stimuli, pw, ph, frameScale, frameChance, flora, pRect, frameSmoothing } from './07-habitat-state.js';
import { getArcticLedges, ARCTIC_LEDGE_LINKS } from './arctic-geometry.js';

/* CREATURES — Living Pixel Diorama
   Native ES module. Cross-file dependencies are declared with imports and exports. */
// ============================================================================
// BÖLÜM BAŞI: CANLILARIN ORTAK YEM HEDEFLEME YARDIMCISI
// Canlılar burada sahneye bırakılan yemleri bulur; tıklama olayları uyaran üretir.
// ============================================================================

function findAvailableStimulus(creature, type, maxDist = 145) {
    if (creature.eatCooldown > 0) return null;
    let best = null;
    let bestDist = maxDist;
    for (let i = 0; i < stimuli.length; i++) {
        const s = stimuli[i];
        if (s.type !== type || s.life <= 0) continue;
        if (s.claimedBy && s.claimedBy !== creature) continue;
        const d = Math.hypot(s.x - creature.x, s.y - creature.y);
        if (d < bestDist) {
            bestDist = d;
            best = s;
        }
    }
    if (best) best.claimedBy = creature;
    return best;
}



/* ============================================================================
   CREATURE 1: ARTISAN HONEYBEE, ROYAL BUMBLEBEE & VIOLET CARPENTER BEE
   Multi-state foraging AI: Visits all meadow wildflowers, fills hind-leg pollen
   baskets (corbiculae) after sipping nectar, returns to the Grand Right Apiary
   Sanctuary to deposit pollen, and performs figure-8 hover dances!
   ============================================================================ */
// ============================================================================
// BÖLÜM SONU: CANLILARIN ORTAK YEM HEDEFLEME YARDIMCISI
// BÖLÜM BAŞI: ARI SINIFI
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
                this.y = ty - 4;
            } else if (this.visitingHive) {
                this.x = this.visitingHive.x;
                this.y = this.visitingHive.y;
            }

            if (this.sipTimer === 0) {
                if (this.perchedFlower) this.hasPollen = true;
                if (this.visitingHive) this.hasPollen = false;
                this.perchedFlower = null;
                this.visitingHive = null;

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
            const dx = nectar.x - this.x;
            const dy = nectar.y - this.y;
            const dist = Math.max(1, Math.hypot(dx, dy));
            if (dist < 6) {
                nectar.life = 0;
                this.hasPollen = true;
                this.sipTimer = 24;
                return;
            }
            this.vx += (dx / dist) * 0.045 * frameScale;
            this.vy += (dy / dist) * 0.045 * frameScale;
        } else if (this.eatCooldown === 0 && this.hasPollen && frameChance(0.008)) {
            const apiaryX = Math.round(pw * 0.84);
            const hiveTargets = [
                { x: apiaryX - 2, y: ph - 22 },
                { x: apiaryX - 1, y: ph - 36 }
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
                const fy = (fl.tipY !== undefined ? fl.tipY : (ph - fl.h)) - 4;
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

        if (this.y < 24) this.vy += 0.038 * frameScale;
        if (this.y > ph - 38) this.vy -= 0.038 * frameScale;

        this.x += this.vx * frameScale;
        this.y += this.vy * frameScale;

        if (this.x < -20) { this.x = pw + 20; this.trail = []; }
        if (this.x > pw + 20) { this.x = -20; this.trail = []; }

        if (frameChance(0.35)) {
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
                ? `rgba(216, 180, 254, ${(tr.life / 18).toFixed(2)})`
                : `rgba(253, 224, 71, ${(tr.life / 18).toFixed(2)})`;
            pRect(tr.x - dir * 6, tr.y, 1, 1, tCol);
        }

        const flap = isPerched ? 0 : Math.round(Math.sin(this.phase * 2.2) * 3);
        const wingH = 4 + Math.abs(flap);
        const backWingCol = this.species === 'carpenter' ? 'rgba(192, 132, 252, 0.52)' : 'rgba(186, 230, 253, 0.48)';
        pRect(bx - dir * 3, by - 2 - wingH, 4, wingH, backWingCol);

        const abLen = this.isBumble ? 7 : 6;
        for (let s = -abLen; s <= -2; s++) {
            const yOff = by + (s < -4 ? tilt : 0);
            const halfH = (s === -abLen || s === -2) ? 2 : (this.isBumble ? 3 : 2);
            for (let dy = -halfH; dy <= halfH; dy++) {
                let col = '#18181b';
                const band = Math.abs(s);
                if (this.species === 'carpenter') {
                    col = dy === -halfH ? '#6b21a8' : '#1e1b4b';
                } else if (band === 3 || band === 4 || (this.isBumble && band === 6)) {
                    col = dy < 0 ? '#fde047' : '#f59e0b';
                } else if (this.species === 'bumble' && band === 7) {
                    col = '#f8fafc';
                } else if (dy === -halfH) {
                    col = '#3f3f46';
                }
                pRect(bx + s * dir, yOff + dy, 1, 1, col);
            }
        }
        pRect(bx - (abLen + 1) * dir, by + tilt, 1, 1, '#09090b');

        for (let s = -1; s <= 2; s++) {
            for (let dy = -3; dy <= 2; dy++) {
                if ((s === -1 || s === 2) && Math.abs(dy) === 3) continue;
                let col = dy <= -1 ? '#fbbf24' : (dy === 0 ? '#d97706' : '#78350f');
                if (this.species === 'carpenter') {
                    col = dy <= -1 ? '#4c1d95' : '#1e1b4b';
                }
                pRect(bx + s * dir, by + dy, 1, 1, col);
            }
        }

        for (let s = 3; s <= 4; s++) {
            for (let dy = -2; dy <= 1; dy++) {
                pRect(bx + s * dir, by + dy, 1, 1, '#18181b');
            }
        }
        pRect(bx + 4 * dir, by - 1, 1, 2, '#0ea5e9');
        pRect(bx + 4 * dir, by - 1, 1, 1, '#e0f2fe');
        pRect(bx + 5 * dir, by - 2, 1, 1, '#27272a');
        pRect(bx + 6 * dir, by - 3, 1, 1, '#fbbf24');

        pRect(bx + 1 * dir, by + 3, 1, 2, '#18181b');
        pRect(bx - 2 * dir, by + 3, 1, 2, '#18181b');
        if (this.hasPollen) {
            pRect(bx - 3 * dir, by + 3, 2, 2, '#fde047');
            pRect(bx - 2 * dir, by + 4, 1, 1, '#f59e0b');
        }

        const fwY = by - 3 - Math.abs(flap);
        const foreWingCol = this.species === 'carpenter' ? 'rgba(233, 213, 255, 0.78)' : 'rgba(240, 249, 255, 0.84)';
        pRect(bx - dir * 1, fwY, 5, 3, foreWingCol);
        pRect(bx, fwY - 1, 3, 1, 'rgba(255, 255, 255, 0.94)');
    }
}

/* ============================================================================
   CREATURE 6: MAJESTIC ARTICULATED NISHIKIGOI (Japon Zen Koi Balığı)
   ============================================================================ */
// ============================================================================
// BÖLÜM SONU: ARI SINIFI
// BÖLÜM BAŞI: KOİ BALIĞI SINIFI
// ============================================================================

export class PixelKoi {
    constructor() {
        this.x = 28 + Math.random() * (pw - 56);
        this.y = 34 + Math.random() * (ph - 58);
        this.angle = Math.random() * Math.PI * 2;
        this.targetAngle = this.angle;
        this.speed = 0.25 + Math.random() * 0.12;
        this.phase = Math.random() * Math.PI * 2;
        this.eatCooldown = 0;
        this.biteRipple = 0;

        const varieties = [
            { kind: 'kohaku', base: '#f8fafc', shade: '#cbd5e1', patch1: '#ef4444', patch2: '#dc2626', fin: 'rgba(254, 226, 226, 0.85)', rgb: [248, 113, 113] },
            { kind: 'tancho', base: '#ffffff', shade: '#e2e8f0', patch1: '#dc2626', patch2: '#f8fafc', fin: 'rgba(248, 250, 252, 0.88)', rgb: [239, 68, 68] },
            { kind: 'showa', base: '#f1f5f9', shade: '#cbd5e1', patch1: '#e11d48', patch2: '#0f172a', fin: 'rgba(241, 245, 249, 0.85)', rgb: [251, 113, 133] },
            { kind: 'ogon', base: '#fef08a', shade: '#eab308', patch1: '#f59e0b', patch2: '#ca8a04', fin: 'rgba(254, 249, 195, 0.85)', rgb: [250, 204, 21] },
            { kind: 'asagi', base: '#93c5fd', shade: '#3b82f6', patch1: '#1d4ed8', patch2: '#ef4444', fin: 'rgba(254, 202, 202, 0.85)', rgb: [96, 165, 250] }
        ];
        this.pal = varieties[Math.floor(Math.random() * varieties.length)];
        this.rgb = this.pal.rgb;
        this.seed = Math.floor(Math.random() * 100);

        this.spineLen = 18;
        this.spine = [];
        for (let i = 0; i < this.spineLen; i++) {
            this.spine.push({
                x: this.x - Math.cos(this.angle) * i * 1.18,
                y: this.y - Math.sin(this.angle) * i * 1.18
            });
        }
    }

    shiftSpine(dx, dy) {
        for (let i = 0; i < this.spineLen; i++) {
            this.spine[i].x += dx;
            this.spine[i].y += dy;
        }
    }

    update(t) {
        this.phase += 0.088 * frameScale;
        if (this.eatCooldown > 0) this.eatCooldown = Math.max(0, this.eatCooldown - frameScale);
        if (this.biteRipple > 0) this.biteRipple = Math.max(0, this.biteRipple - 0.35 * frameScale);

        const pellet = findAvailableStimulus(this, 'koi_pellet', Math.max(360, pw * 0.85));
        if (pellet) {
            const dx = pellet.x - this.x;
            const dy = pellet.y - this.y;
            const dist = Math.hypot(dx, dy);
            this.targetAngle = Math.atan2(dy, dx);
            if (dist < 8) {
                pellet.life = 0;
                this.eatCooldown = 85;
                this.biteRipple = 9;
                this.targetAngle += (Math.random() - 0.5) * 1.4;
            }
        } else if (frameChance(0.018)) {
            this.targetAngle += (Math.random() - 0.5) * 0.95;
        }

        if (this.y < 32) this.targetAngle = Math.cos(this.angle) >= 0 ? 0.45 : Math.PI - 0.45;
        if (this.y > ph - 24) this.targetAngle = Math.cos(this.angle) >= 0 ? -0.45 : Math.PI + 0.45;
        if (this.x > pw - 68 && this.y > ph - 42) {
            this.targetAngle = Math.PI + (Math.random() - 0.5) * 0.5;
        }

        let diff = this.targetAngle - this.angle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        this.angle += diff * frameSmoothing(pellet ? 0.065 : 0.038);

        const spd = this.speed * (pellet ? 1.55 : 1.0);
        this.x += Math.cos(this.angle) * spd * frameScale;
        this.y += Math.sin(this.angle) * spd * frameScale;

        if (this.x < -38) {
            const d = pw + 76;
            this.x += d;
            this.shiftSpine(d, 0);
        } else if (this.x > pw + 38) {
            const d = -(pw + 76);
            this.x += d;
            this.shiftSpine(d, 0);
        }

        this.spine[0].x = this.x;
        this.spine[0].y = this.y;
        for (let i = 1; i < this.spineLen; i++) {
            const prev = this.spine[i - 1];
            const cur = this.spine[i];
            const dx = cur.x - prev.x;
            const dy = cur.y - prev.y;
            const segAngle = Math.atan2(dy, dx);
            const wag = Math.sin(this.phase - i * 0.35) * (i > 3 ? 0.17 : 0.04);
            const finalAng = segAngle + wag * 0.19;
            cur.x = prev.x + Math.cos(finalAng) * 1.15;
            cur.y = prev.y + Math.sin(finalAng) * 1.15;
        }
    }

    draw() {
        const cos = Math.cos(this.angle);
        const sin = Math.sin(this.angle);
        const perpX = -sin;
        const perpY = cos;

        for (let i = 1; i < 14; i++) {
            const pt = this.spine[i];
            if (Math.abs(pt.x - this.x) > 45) continue;
            pRect(pt.x + 2, pt.y + 5, 4, 3, 'rgba(2, 10, 18, 0.30)');
        }

        const pecNode = this.spine[3];
        if (Math.abs(pecNode.x - this.x) < 40) {
            const finStroke = Math.sin(this.phase * 0.85) * 0.24;
            [-1, 1].forEach(side => {
                const fAng = this.angle + side * (Math.PI * 0.56 + finStroke);
                const fCos = Math.cos(fAng);
                const fSin = Math.sin(fAng);
                for (let r = 2; r <= 7; r++) {
                    const halfW = r <= 5 ? 2 : 1;
                    for (let w = -halfW; w <= 1; w++) {
                        pRect(pecNode.x + fCos * r - fSin * w, pecNode.y + fSin * r + fCos * w, 1, 1, this.pal.fin);
                    }
                }
            });
        }
        const venNode = this.spine[7];
        if (Math.abs(venNode.x - this.x) < 40) {
            [-1, 1].forEach(side => {
                const vAng = this.angle + side * (Math.PI * 0.65);
                for (let r = 2; r <= 4; r++) {
                    pRect(venNode.x + Math.cos(vAng) * r, venNode.y + Math.sin(vAng) * r, 1, 1, this.pal.fin);
                }
            });
        }

        for (let i = 13; i < this.spineLen; i++) {
            const pt = this.spine[i];
            const prev = this.spine[i - 1];
            if (Math.abs(pt.x - this.x) > 45) continue;
            const segAng = Math.atan2(prev.y - pt.y, prev.x - pt.x);
            const tPerpX = -Math.sin(segAng);
            const tPerpY = Math.cos(segAng);
            const spread = (i - 12) * 1.45;
            for (let w = -Math.ceil(spread); w <= Math.ceil(spread); w++) {
                if (i >= 16 && Math.abs(w) <= 1) continue;
                pRect(pt.x + tPerpX * w, pt.y + tPerpY * w, 1, 1, this.pal.fin);
            }
        }

        const bodyRadii = [2.9, 3.9, 4.6, 4.9, 4.8, 4.5, 4.1, 3.6, 3.1, 2.6, 2.2, 1.8, 1.4, 1.1];
        for (let i = 13; i >= 0; i--) {
            const pt = this.spine[i];
            if (Math.abs(pt.x - this.x) > 45) continue;
            const rad = bodyRadii[i] || 1.2;
            const rInt = Math.ceil(rad);

            for (let dy = -rInt; dy <= rInt; dy++) {
                for (let dx = -rInt; dx <= rInt; dx++) {
                    const d2 = dx * dx + dy * dy;
                    if (d2 <= rad * rad) {
                        const isEdge = d2 > (rad - 0.9) * (rad - 0.9);
                        let col = isEdge ? this.pal.shade : this.pal.base;

                        if (this.pal.kind === 'tancho') {
                            if (i <= 1 && d2 <= 3.2) col = this.pal.patch1;
                        } else if (this.pal.kind === 'asagi') {
                            if (isEdge && i >= 2 && i <= 9) col = this.pal.patch2;
                            else if ((dx + dy + i) % 2 === 0 && d2 < rad * rad * 0.6) col = this.pal.patch1;
                        } else {
                            if ((i >= 1 && i <= 4 && dx >= -2) || (i >= 7 && i <= 10 && dy <= 1)) {
                                col = this.pal.patch1;
                            } else if ((i + this.seed) % 5 === 0 && Math.abs(dx) <= 1) {
                                col = this.pal.patch2;
                            }
                        }
                        pRect(pt.x + dx, pt.y + dy, 1, 1, col);
                    }
                }
            }
        }

        for (let i = 4; i <= 10; i++) {
            const pt = this.spine[i];
            const prev = this.spine[i - 1];
            if (Math.abs(pt.x - this.x) > 45) continue;
            const segAng = Math.atan2(prev.y - pt.y, prev.x - pt.x);
            const dPerpX = -Math.sin(segAng);
            const dPerpY = Math.cos(segAng);
            const sway = Math.sin(this.phase - i * 0.3) * 0.8;
            pRect(pt.x + dPerpX * sway, pt.y + dPerpY * sway, 2, 1, 'rgba(255, 255, 255, 0.88)');
        }

        const head = this.spine[0];
        const snoutX = head.x + cos * 3.3;
        const snoutY = head.y + sin * 3.3;
        pRect(snoutX - 1, snoutY - 1, 2, 2, this.pal.base);

        const eyeX = head.x + cos * 1.5;
        const eyeY = head.y + sin * 1.5;
        pRect(eyeX + perpX * 2.8, eyeY + perpY * 2.8, 1, 1, '#0f172a');
        pRect(eyeX - perpX * 2.8, eyeY - perpY * 2.8, 1, 1, '#0f172a');

        const barbCol = this.pal.kind === 'tancho' ? '#fda4af' : this.pal.patch1;
        pRect(snoutX + cos * 1.3 + perpX * 2.1, snoutY + sin * 1.3 + perpY * 2.1, 1, 1, barbCol);
        pRect(snoutX + cos * 1.3 - perpX * 2.1, snoutY + sin * 1.3 - perpY * 2.1, 1, 1, barbCol);

        if (this.biteRipple > 0) {
            const r = (10 - this.biteRipple) * 1.4;
            for (let a = 0; a < Math.PI * 2; a += 0.6) {
                pRect(snoutX + Math.cos(a) * r, snoutY + Math.sin(a) * r, 1, 1, 'rgba(255, 255, 255, 0.45)');
            }
        }
    }
}

/* ============================================================================
   CREATURE 2: SHOW-QUALITY HALFMOON & DUMBO BETTA SPLENDENS
   ============================================================================ */
// ============================================================================
// BÖLÜM SONU: KOİ BALIĞI SINIFI
// BÖLÜM BAŞI: BETTA BALIĞI SINIFI
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
// BÖLÜM SONU: BETTA BALIĞI SINIFI
// BÖLÜM BAŞI: YUSUFÇUK SINIFI
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

/* ============================================================================
   CREATURE 4: TRUE 4-LOBED ORNATE SWALLOWTAIL & MORPHO BUTTERFLIES
   ============================================================================ */
// ============================================================================
// BÖLÜM SONU: YUSUFÇUK SINIFI
// BÖLÜM BAŞI: KELEBEK SINIFI
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

/* ============================================================================
   CREATURE 5: ARTISTIC 360° BIOLUMINESCENT JELLYFISH
   ============================================================================ */
// ============================================================================
// BÖLÜM SONU: KELEBEK SINIFI
// BÖLÜM BAŞI: DENİZANASI SINIFI
// ============================================================================

export class PixelJellyfish {
    constructor() {
        this.x = 24 + Math.random() * (pw - 48);
        this.y = 24 + Math.random() * (ph - 52);
        this.angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.8;
        this.targetAngle = this.angle;
        this.phase = Math.random() * Math.PI * 2;
        this.baseSpeed = 0.16 + Math.random() * 0.10;
        this.eatCooldown = 0;
        this.glowBoost = 0;

        const palettes = [
            {
                outerGlow: 'rgba(240, 171, 252, 0.22)', bell: '#d946ef', bellShade: '#86198f',
                rim: '#f5d0fe', core: '#fef08a', gonad: '#f472b6',
                oralArm: '#f0abfc', tent: '#a21caf', bead: '#fae8ff',
                rgb: [217, 70, 239]
            },
            {
                outerGlow: 'rgba(103, 232, 249, 0.22)', bell: '#06b6d4', bellShade: '#155e75',
                rim: '#cffafe', core: '#fef9c3', gonad: '#38bdf8',
                oralArm: '#67e8f9', tent: '#0e7490', bead: '#ecfeff',
                rgb: [34, 211, 238]
            },
            {
                outerGlow: 'rgba(196, 181, 253, 0.22)', bell: '#8b5cf6', bellShade: '#4c1d95',
                rim: '#ede9fe', core: '#38bdf8', gonad: '#c084fc',
                oralArm: '#c4b5fd', tent: '#5b21b6', bead: '#f5f3ff',
                rgb: [139, 92, 246]
            },
            {
                outerGlow: 'rgba(253, 224, 71, 0.20)', bell: '#f59e0b', bellShade: '#9a3412',
                rim: '#fef08a', core: '#ffffff', gonad: '#fb7185',
                oralArm: '#fcd34d', tent: '#c2410c', bead: '#fef9c3',
                rgb: [251, 191, 36]
            }
        ];
        this.pal = palettes[Math.floor(Math.random() * palettes.length)];
        this.rgb = this.pal.rgb;

        this.numTentacles = 9;
        this.segCount = 16;
        this.tentacles = [];
        for (let t = 0; t < this.numTentacles; t++) {
            const nodes = [];
            for (let s = 0; s < this.segCount; s++) {
                nodes.push({ x: this.x, y: this.y });
            }
            this.tentacles.push(nodes);
        }
    }

    shiftTentacles(dx, dy) {
        for (let k = 0; k < this.numTentacles; k++) {
            const nodes = this.tentacles[k];
            for (let s = 0; s < this.segCount; s++) {
                nodes[s].x += dx;
                nodes[s].y += dy;
            }
        }
    }

    update(t) {
        this.phase += 0.058 * frameScale;
        if (this.eatCooldown > 0) this.eatCooldown = Math.max(0, this.eatCooldown - frameScale);
        if (this.glowBoost > 0) this.glowBoost = Math.max(0, this.glowBoost - frameScale);

        const plankton = findAvailableStimulus(this, 'plankton_swarm', Math.max(340, pw * 0.75));
        if (plankton) {
            const dx = plankton.x - this.x;
            const dy = plankton.y - this.y;
            const dist = Math.hypot(dx, dy);
            this.targetAngle = Math.atan2(dy, dx);
            if (dist < 10) {
                plankton.life = 0;
                this.eatCooldown = 80;
                this.glowBoost = 65;
                this.targetAngle = -Math.PI / 2 + (Math.random() - 0.5) * 1.4;
            }
        } else if (frameChance(0.02)) {
            this.targetAngle += (Math.random() - 0.5) * 0.9;
        }

        if (this.y < 22) this.targetAngle = Math.PI * 0.45 + (Math.random() - 0.5) * 0.4;
        if (this.y > ph - 38) this.targetAngle = -Math.PI * 0.5 + (Math.random() - 0.5) * 0.4;
        if (this.x < 34) this.targetAngle = (Math.random() - 0.5) * 0.7;
        if (this.x > pw - 34) this.targetAngle = Math.PI + (Math.random() - 0.5) * 0.7;

        let diff = this.targetAngle - this.angle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        this.angle += diff * frameSmoothing(0.035);

        const sinP = Math.sin(this.phase);
        const pulse = sinP > 0 ? Math.pow(sinP, 1.4) : 0;
        const speedMult = plankton ? 1.45 : 1.0;
        const thrust = (0.07 + pulse * 0.42) * speedMult;

        this.x += Math.cos(this.angle) * (this.baseSpeed + thrust) * frameScale;
        this.y += Math.sin(this.angle) * (this.baseSpeed + thrust) * frameScale;

        if (this.x < -28) {
            const d = pw + 56;
            this.x += d;
            this.shiftTentacles(d, 0);
        } else if (this.x > pw + 28) {
            const d = -(pw + 56);
            this.x += d;
            this.shiftTentacles(d, 0);
        }

        const cos = Math.cos(this.angle);
        const sin = Math.sin(this.angle);
        const perpX = -sin;
        const perpY = cos;
        const contract = Math.sin(this.phase);
        const spanScale = 1 - contract * 0.18;

        for (let k = 0; k < this.numTentacles; k++) {
            const offset = (k - (this.numTentacles - 1) / 2) * 2.1 * spanScale;
            const nodes = this.tentacles[k];
            nodes[0].x = this.x - cos * 2.5 + perpX * offset;
            nodes[0].y = this.y - sin * 2.5 + perpY * offset;

            const isOral = (k >= 3 && k <= 5);
            const segSpacing = isOral ? 1.05 : 1.35;

            for (let s = 1; s < this.segCount; s++) {
                const prev = nodes[s - 1];
                const cur = nodes[s];
                const waveAmp = isOral ? 0.55 : 0.35;
                const sway = Math.sin(this.phase * 1.15 - s * 0.38 + k * 0.9) * waveAmp;
                const targetX = prev.x - cos * segSpacing + perpX * sway;
                const targetY = prev.y - sin * segSpacing + perpY * sway;
                cur.x += (targetX - cur.x) * frameSmoothing(0.38);
                cur.y += (targetY - cur.y) * frameSmoothing(0.38);
            }
        }
    }

    draw() {
        const p = this.pal;
        const cos = Math.cos(this.angle);
        const sin = Math.sin(this.angle);
        const perpX = -sin;
        const perpY = cos;

        const contract = Math.sin(this.phase);
        const bellW = Math.round(11 - contract * 2.2);
        const bellH = Math.round(8 + contract * 1.6);

        if (contract > 0.45) {
            const ringDist = 6 + (1 - contract) * 8;
            const rx = this.x - cos * ringDist;
            const ry = this.y - sin * ringDist;
            pRect(rx + perpX * 5, ry + perpY * 5, 1, 1, p.outerGlow);
            pRect(rx - perpX * 5, ry - perpY * 5, 1, 1, p.outerGlow);
        }

        for (let k = 0; k < this.numTentacles; k++) {
            const nodes = this.tentacles[k];
            const isOral = (k >= 3 && k <= 5);
            const maxS = isOral ? 12 : this.segCount;

            for (let s = 0; s < maxS; s++) {
                const pt = nodes[s];
                if (Math.abs(pt.x - this.x) > 42 || Math.abs(pt.y - this.y) > 42) continue;

                if (isOral) {
                    const frill = (s % 2 === 0) ? 1 : -1;
                    pRect(pt.x, pt.y, 1, 1, s < 5 ? p.core : p.oralArm);
                    if (s < 9) {
                        pRect(pt.x + perpX * frill, pt.y + perpY * frill, 1, 1, p.oralArm);
                    }
                } else {
                    if (s > 11 && s % 2 === 1) continue;
                    const isBead = (s % 4 === 2);
                    pRect(pt.x, pt.y, 1, 1, isBead ? p.bead : p.tent);
                }
            }
        }

        const auraW = bellW + (this.glowBoost > 0 ? 3 : 2);
        const auraH = bellH + (this.glowBoost > 0 ? 3 : 2);
        for (let dy = -auraH; dy <= 1; dy += 2) {
            const span = Math.round(auraW * Math.sqrt(Math.max(0, 1 - (dy * dy) / (auraH * auraH))));
            for (let dx = -span; dx <= span; dx += 2) {
                const px = this.x + cos * (-dy) + perpX * dx;
                const py = this.y + sin * (-dy) + perpY * dx;
                pRect(px, py, 2, 2, p.outerGlow);
            }
        }

        for (let dy = -bellH; dy <= 2; dy++) {
            for (let dx = -bellW; dx <= bellW; dx++) {
                const nx = dx / Math.max(1, bellW);
                const ny = dy / Math.max(1, bellH);
                const distSq = nx * nx + ny * ny;

                if (dy >= 1) {
                    if (Math.abs(dx) > bellW - 1) continue;
                    const lappetWave = Math.sin(dx * 1.4 + this.phase) > -0.1;
                    if (dy === 2 && !lappetWave) continue;
                } else if (distSq > 1.0) {
                    continue;
                }

                let col = p.bell;
                const isOuterRim = (distSq > 0.76 && dy <= 0) || dy >= 1;
                const isInnerCore = (distSq < 0.22 && dy < -1 && dy > -bellH * 0.75);
                const isGonadRing = (distSq >= 0.22 && distSq <= 0.44 && dy < -1);
                const isRadialCanal = (Math.abs(dx) === 0 || Math.abs(dx) === Math.round(bellW * 0.5));

                if (isOuterRim) {
                    col = (dy === 2 || distSq > 0.88) ? p.rim : p.bell;
                } else if (isInnerCore) {
                    col = p.core;
                } else if (isGonadRing) {
                    col = (dx + dy) % 2 === 0 ? p.gonad : p.bell;
                } else if (isRadialCanal && dy < 0) {
                    col = p.rim;
                } else if (distSq > 0.48 && dy < 0) {
                    col = (dx + dy) % 2 === 0 ? p.bell : p.bellShade;
                }

                const px = this.x + cos * (-dy) + perpX * dx;
                const py = this.y + sin * (-dy) + perpY * dx;
                pRect(px, py, 1, 1, col);
            }
        }
    }
}

/* ============================================================================
   CREATURE 7: ARTISTIC & REALISTIC MACAW PARROT FLOCK
   ============================================================================ */
const PARROT_PALETTES = Object.freeze([
    {
        bodyHi: '#f87171', body: '#ef4444', bodyShade: '#b91c1c', belly: '#dc2626',
        wingShoulder: '#ef4444', wingCovert: '#facc15', wingGreen: '#10b981', wingPrimary: '#1d4ed8', wingTip: '#1e3a8a', wingUnder: '#b91c1c',
        tailCenter: '#ef4444', tailMid: '#dc2626', tailOuter: '#0284c7',
        face: '#fef3c7', faceLine: '#ef4444', beakUpper: '#fde68a', beakTip: '#92400e', beakLower: '#1e293b', eye: '#0f172a',
        rgb: [239, 68, 68]
    },
    {
        bodyHi: '#38bdf8', body: '#0284c7', bodyShade: '#0369a1', belly: '#facc15',
        wingShoulder: '#22c55e', wingCovert: '#38bdf8', wingGreen: '#0ea5e9', wingPrimary: '#1d4ed8', wingTip: '#1e3a8a', wingUnder: '#eab308',
        tailCenter: '#0284c7', tailMid: '#0369a1', tailOuter: '#facc15',
        face: '#fef9c3', faceLine: '#0f172a', beakUpper: '#334155', beakTip: '#0f172a', beakLower: '#0f172a', eye: '#0f172a',
        rgb: [56, 189, 248]
    },
    {
        bodyHi: '#4ade80', body: '#16a34a', bodyShade: '#15803d', belly: '#22c55e',
        wingShoulder: '#f97316', wingCovert: '#22c55e', wingGreen: '#0d9488', wingPrimary: '#0284c7', wingTip: '#1e3a8a', wingUnder: '#15803d',
        tailCenter: '#dc2626', tailMid: '#b91c1c', tailOuter: '#0ea5e9',
        face: '#fef3c7', faceLine: '#b91c1c', beakUpper: '#334155', beakTip: '#0f172a', beakLower: '#0f172a', eye: '#0f172a',
        rgb: [34, 197, 94]
    },
    {
        bodyHi: '#818cf8', body: '#4f46e5', bodyShade: '#3730a3', belly: '#4338ca',
        wingShoulder: '#6366f1', wingCovert: '#4f46e5', wingGreen: '#4338ca', wingPrimary: '#312e81', wingTip: '#1e1b4b', wingUnder: '#312e81',
        tailCenter: '#4f46e5', tailMid: '#3730a3', tailOuter: '#312e81',
        face: '#facc15', faceLine: '#312e81', beakUpper: '#334155', beakTip: '#0f172a', beakLower: '#0f172a', eye: '#0f172a',
        rgb: [129, 140, 248]
    },
]);

// ============================================================================
// BÖLÜM SONU: DENİZANASI SINIFI
// BÖLÜM BAŞI: PAPAĞAN SINIFI
// ============================================================================

export class PixelParrot {
    constructor() {
        this.x = Math.random() * pw;
        this.y = 28 + Math.random() * Math.max(36, ph * 0.45);
        this.dir = Math.random() < 0.5 ? -1 : 1;
        this.vx = this.dir * (0.42 + Math.random() * 0.18);
        this.vy = (Math.random() - 0.5) * 0.12;
        this.phase = Math.random() * Math.PI * 2;
        this.palette = PARROT_PALETTES[Math.floor(Math.random() * PARROT_PALETTES.length)];
        this.rgb = this.palette.rgb;

        this.state = 'flying';
        this.stateTimer = 140 + Math.random() * 220;
        this.eatCooldown = 0;
        this.perchTarget = null;
        this.targetFruit = null;
        this.waypointY = this.y;
        this.headLook = 0;
        this.beakOpen = 0;
        this.tailWave = 0;
    }

    pickPerchSpot() {
        const spots = [
            { x: Math.round(pw * 0.14 - 12), y: Math.round(ph * 0.24 + 6) },
            { x: Math.round(pw * 0.14 + 14), y: Math.round(ph * 0.24 + 8) },
            { x: Math.round(pw * 0.27 + 10), y: Math.round(ph * 0.36 + 6) },
            { x: Math.round(pw * 0.75 - 10), y: Math.round(ph * 0.34 + 6) },
            { x: Math.round(pw * 0.86 - 14), y: Math.round(ph * 0.22 + 6) },
            { x: Math.round(pw * 0.86 + 12), y: Math.round(ph * 0.22 + 8) }
        ];
        return spots[Math.floor(Math.random() * spots.length)];
    }

    update(time) {
        if (this.eatCooldown > 0) this.eatCooldown = Math.max(0, this.eatCooldown - frameScale);
        this.tailWave += 0.12 * frameScale;

        const fruit = findAvailableStimulus(this, 'tropical_fruit', Math.max(450, pw));
        if (fruit && this.state !== 'eating') {
            this.targetFruit = fruit;
            this.state = 'flying';
            this.perchTarget = null;
        }

        if (this.state === 'eating') {
            this.phase += 0.38 * frameScale;
            this.stateTimer -= frameScale;
            this.beakOpen = Math.sin(this.phase * 1.5) > 0 ? 1 : 0;

            if (this.targetFruit && this.targetFruit.life > 0) {
                const targetX = this.targetFruit.x - this.dir * 10;
                const targetY = this.targetFruit.y - 2;
                this.x += (targetX - this.x) * frameSmoothing(0.18);
                this.y += (targetY - this.y) * frameSmoothing(0.18);
                if (this.stateTimer <= 8) {
                    this.targetFruit.life = 0;
                }
            }

            if (this.stateTimer <= 0) {
                this.state = 'flying';
                this.eatCooldown = 90;
                this.beakOpen = 0;
                this.targetFruit = null;
                this.vx = this.dir * 0.48;
                this.vy = -0.28;
                this.waypointY = 30 + Math.random() * (ph * 0.38);
                this.stateTimer = 180 + Math.random() * 200;
            }
            return;
        }

        if (this.state === 'perched') {
            this.phase += 0.04 * frameScale;
            this.stateTimer -= frameScale;
            this.vx = 0;
            this.vy = 0;

            if (frameChance(0.018)) {
                this.headLook = (Math.random() < 0.4) ? -1 : 0;
            }
            if (frameChance(0.012)) {
                this.beakOpen = this.beakOpen ? 0 : 1;
            }

            if (this.stateTimer <= 0 || fruit) {
                this.state = 'flying';
                this.headLook = 0;
                this.beakOpen = 0;
                this.dir = (this.x < pw * 0.5) ? 1 : -1;
                this.vx = this.dir * 0.46;
                this.vy = -0.18;
                this.waypointY = 28 + Math.random() * (ph * 0.42);
                this.stateTimer = 180 + Math.random() * 240;
            }
            return;
        }

        if (fruit) {
            this.phase += 0.24 * frameScale;
            const dx = fruit.x - this.x;
            const dy = fruit.y - this.y;
            const dist = Math.max(1, Math.hypot(dx, dy));

            const desiredVx = (dx / dist) * 0.68;
            const desiredVy = (dy / dist) * 0.52;
            this.vx += (desiredVx - this.vx) * frameSmoothing(0.09);
            this.vy += (desiredVy - this.vy) * frameSmoothing(0.09);

            if (Math.abs(dx) > 4) {
                this.dir = dx >= 0 ? 1 : -1;
            }
            this.beakOpen = dist < 26 ? 1 : 0;

            this.x += this.vx * frameScale;
            this.y += this.vy * frameScale;

            if (dist < 13) {
                this.state = 'eating';
                this.stateTimer = 34;
                this.targetFruit = fruit;
                this.vx *= 0.2;
                this.vy *= 0.2;
            }
            return;
        }

        if (this.state === 'perching' && this.perchTarget) {
            this.phase += 0.22 * frameScale;
            const dx = this.perchTarget.x - this.x;
            const dy = this.perchTarget.y - this.y;
            const dist = Math.max(1, Math.hypot(dx, dy));

            const speed = Math.min(0.55, Math.max(0.18, dist * 0.03));
            const desiredVx = (dx / dist) * speed;
            const desiredVy = (dy / dist) * speed;
            this.vx += (desiredVx - this.vx) * frameSmoothing(0.08);
            this.vy += (desiredVy - this.vy) * frameSmoothing(0.08);
            if (Math.abs(dx) > 3) this.dir = dx >= 0 ? 1 : -1;

            this.x += this.vx * frameScale;
            this.y += this.vy * frameScale;

            if (dist < 5) {
                this.x = this.perchTarget.x;
                this.y = this.perchTarget.y;
                this.state = 'perched';
                this.stateTimer = 160 + Math.random() * 220;
                this.perchTarget = null;
                this.dir = (this.x < pw * 0.5) ? 1 : -1;
            }
            return;
        }

        this.phase += 0.17 * frameScale;
        this.stateTimer -= frameScale;

        if (this.stateTimer <= 0) {
            if (Math.random() < 0.38) {
                this.perchTarget = this.pickPerchSpot();
                this.state = 'perching';
            } else {
                this.waypointY = 26 + Math.random() * (ph * 0.46);
                if (Math.random() < 0.35 && this.x > pw * 0.2 && this.x < pw * 0.8) {
                    this.dir *= -1;
                }
                this.stateTimer = 150 + Math.random() * 220;
            }
        }

        const targetVx = this.dir * (0.44 + Math.sin(time * 0.001 + this.phase * 0.2) * 0.1);
        const dyWay = this.waypointY - this.y;
        const targetVy = Math.max(-0.26, Math.min(0.26, dyWay * 0.015 + Math.sin(time * 0.002 + this.phase * 0.3) * 0.06));

        this.vx += (targetVx - this.vx) * frameSmoothing(0.045);
        this.vy += (targetVy - this.vy) * frameSmoothing(0.045);
        if (Math.abs(this.vx) > 0.08) {
            this.dir = this.vx >= 0 ? 1 : -1;
        }

        this.x += this.vx * frameScale;
        this.y += this.vy * frameScale;

        if (this.y < 20) { this.y = 20; this.vy = Math.abs(this.vy) * 0.5 + 0.04; }
        if (this.y > ph * 0.68) { this.y = ph * 0.68; this.vy = -Math.abs(this.vy) * 0.5 - 0.04; }

        if (this.x < -34) this.x = pw + 34;
        if (this.x > pw + 34) this.x = -34;
    }

    draw() {
        const p = this.palette;
        const dir = this.dir;
        const bx = Math.round(this.x);
        const by = Math.round(this.y);

        const px = (x, y, w, h, col) => {
            const drawX = dir > 0 ? (bx + x) : (bx - x - w);
            pRect(drawX, by + y, w, h, col);
        };

        if (this.state === 'perched') {
            const breath = Math.sin(this.phase) > 0.3 ? -1 : 0;
            const lookDir = this.headLook === -1 ? -1 : 1;

            for (let t = 0; t < 16; t++) {
                const tx = -4 - Math.floor(t * 0.35);
                const ty = 4 + t;
                px(tx, ty, 2, 1, t < 11 ? p.tailCenter : p.tailOuter);
                if (t < 10) px(tx + 2, ty, 1, 1, p.tailMid);
            }

            px(-2, 3, 2, 2, '#1e293b');
            px(1, 3, 2, 2, '#1e293b');

            px(-4, -5 + breath, 7, 4, p.body);
            px(-3, -1 + breath, 6, 4, p.belly);
            px(-4, -4 + breath, 2, 6, p.bodyShade);
            px(1, -5 + breath, 2, 5, p.bodyHi);

            px(-3, -4 + breath, 4, 3, p.wingShoulder);
            px(-4, -1 + breath, 4, 3, p.wingCovert);
            px(-4, 2 + breath, 3, 2, p.wingGreen);
            px(-5, 4 + breath, 3, 3, p.wingPrimary);
            px(-5, 7 + breath, 2, 2, p.wingTip);

            const hy = -9 + breath;
            px(-2, hy, 6, 4, p.body);
            px(-1, hy - 1, 4, 1, p.bodyHi);

            if (lookDir === 1) {
                px(1, hy + 1, 3, 3, p.face);
                px(2, hy + 1, 1, 1, p.eye);
                px(1, hy + 3, 2, 1, p.faceLine);
                px(4, hy + 1, 3, 2, p.beakUpper);
                px(6, hy + 2, 1, 2, p.beakTip);
                px(4, hy + 3 + this.beakOpen, 2, 1, p.beakLower);
            } else {
                px(-2, hy + 1, 3, 3, p.face);
                px(-1, hy + 1, 1, 1, p.eye);
                px(-5, hy + 1, 3, 2, p.beakUpper);
                px(-6, hy + 2, 1, 2, p.beakTip);
                px(-4, hy + 3, 2, 1, p.beakLower);
            }
            return;
        }

        const isHovering = this.state === 'eating' || (this.state === 'perching' && Math.hypot(this.vx, this.vy) < 0.28);
        const cycle = this.phase % (Math.PI * 4);
        const isGliding = !isHovering && !this.targetFruit && cycle > Math.PI * 2.7;
        const wingSin = isGliding ? 0.18 : Math.sin(this.phase);

        const pitch = isHovering ? -1 : Math.max(-2, Math.min(2, Math.round(this.vy * 6)));
        const liftY = Math.round(-wingSin * 1.1);

        if (isHovering) {
            px(1, -8 + liftY, 5, 3, p.wingPrimary);
            px(0, -5 + liftY, 5, 3, p.wingCovert);
        } else if (wingSin > 0.1) {
            const farH = Math.round(wingSin * 5);
            px(0, -4 - farH + liftY, 5, 2, p.wingTip);
            px(-1, -2 - farH + liftY, 6, 3, p.wingPrimary);
        }

        const tailLen = 19;
        for (let t = 0; t < tailLen; t++) {
            const tx = -8 - t;
            const waveOffset = Math.sin(this.tailWave - t * 0.28) * (t * 0.08);
            const pitchOffset = -pitch * (t * 0.22);
            const ty = Math.round(1 + t * 0.14 + pitchOffset + waveOffset + liftY);

            px(tx, ty, 1, 1, p.tailCenter);
            if (t < 15) {
                px(tx, ty - 1, 1, 1, p.tailMid);
            }
            const fanSpread = isHovering ? 2 : 1;
            if (t >= 2 && t < 13) {
                px(tx, ty + fanSpread, 1, 1, p.tailOuter);
                if (isHovering && t < 9) {
                    px(tx, ty - 1 - fanSpread, 1, 1, p.tailOuter);
                }
            }
        }

        const headPitch = pitch;
        const rearPitch = -Math.sign(pitch);

        px(-6, -2 + rearPitch + liftY, 6, 2, p.body);
        px(0, -2 + liftY, 6, 2, p.bodyHi);
        px(-7, 0 + rearPitch + liftY, 14, 3, p.body);
        px(1, 1 + headPitch + liftY, 6, 2, p.belly);
        px(-5, 3 + rearPitch + liftY, 10, 1, p.bodyShade);

        if (isHovering) {
            px(-2, 4 + liftY, 2, 2, '#1e293b');
            px(1, 4 + liftY, 2, 2, '#1e293b');
        } else {
            px(-4, 4 + rearPitch + liftY, 3, 1, '#1e293b');
        }

        const hx = 5;
        const hy = -4 + headPitch + liftY;

        px(hx - 1, hy + 1, 5, 4, p.body);
        px(hx, hy - 1, 6, 2, p.bodyHi);
        px(hx - 1, hy, 2, 2, p.bodyShade);

        px(hx + 2, hy + 1, 4, 3, p.face);
        px(hx + 2, hy + 3, 2, 1, p.faceLine);
        px(hx + 3, hy + 1, 2, 2, p.eye);
        px(hx + 3, hy + 1, 1, 1, '#ffffff');

        px(hx + 6, hy + 1, 3, 2, p.beakUpper);
        px(hx + 8, hy + 2, 2, 2, p.beakTip);
        px(hx + 9, hy + 4, 1, 1, p.beakTip);
        px(hx + 6, hy + 3 + this.beakOpen, 2, 2, p.beakLower);

        if (isHovering) {
            px(-2, -3 + liftY, 5, 3, p.wingShoulder);
            px(-4, -6 + liftY, 6, 3, p.wingCovert);
            px(-6, -9 + liftY, 6, 3, p.wingPrimary);
            px(-8, -11 + liftY, 3, 2, p.wingTip);
            px(-5, -12 + liftY, 3, 2, p.wingTip);
            px(-2, -11 + liftY, 2, 2, p.wingTip);
        } else if (isGliding || (wingSin >= -0.22 && wingSin <= 0.28)) {
            px(-3, -2 + liftY, 6, 2, p.wingShoulder);
            px(-6, -3 + liftY, 7, 2, p.wingCovert);
            px(-9, -4 + liftY, 6, 2, p.wingGreen);
            px(-13, -5 + liftY, 6, 2, p.wingPrimary);
            px(-15, -6 + liftY, 4, 2, p.wingTip);
        } else if (wingSin > 0.28 && wingSin <= 0.72) {
            px(-2, -3 + liftY, 5, 3, p.wingShoulder);
            px(-5, -6 + liftY, 6, 3, p.wingCovert);
            px(-8, -8 + liftY, 6, 2, p.wingGreen);
            px(-11, -10 + liftY, 6, 2, p.wingPrimary);
            px(-13, -11 + liftY, 4, 2, p.wingTip);
        } else if (wingSin > 0.72) {
            px(-1, -4 + liftY, 5, 3, p.wingShoulder);
            px(-3, -7 + liftY, 6, 3, p.wingCovert);
            px(-5, -10 + liftY, 6, 3, p.wingGreen);
            px(-8, -13 + liftY, 6, 3, p.wingPrimary);
            px(-10, -15 + liftY, 4, 2, p.wingTip);
            px(-6, -15 + liftY, 3, 1, p.wingTip);
        } else if (wingSin < -0.22 && wingSin >= -0.72) {
            px(-2, 0 + liftY, 6, 2, p.wingShoulder);
            px(-4, 2 + liftY, 6, 2, p.wingCovert);
            px(-7, 4 + liftY, 6, 2, p.wingGreen);
            px(-10, 6 + liftY, 5, 2, p.wingPrimary);
            px(-12, 7 + liftY, 3, 2, p.wingTip);
        } else {
            px(-1, 1 + liftY, 5, 3, p.wingShoulder);
            px(-3, 4 + liftY, 5, 3, p.wingCovert);
            px(-5, 7 + liftY, 5, 2, p.wingGreen);
            px(-7, 9 + liftY, 5, 2, p.wingPrimary);
            px(-9, 11 + liftY, 3, 2, p.wingTip);
        }
    }
}

// ============================================================================
// BÖLÜM SONU: PAPAĞAN SINIFI
// BÖLÜM BAŞI: KUTUP TİLKİSİ VE KAR BAYKUŞU SINIFI
// ============================================================================

 /* ============================================================================
   CREATURE 8: ARCTIC FOXES ON STEPPED FJORD LEDGES & SOARING SNOWY OWLS
   True platformer navigation: Foxes walk along multi-tiered snow ledges, curl
   their fluffy tails while sitting, perform parabolic physics jumps between
   platforms, and pounce into the snow for Golden Cloudberries!
   ============================================================================ */
let arcticSpawnCounter = 0;

export class PixelArcticFox {
    constructor() {
        const idx = arcticSpawnCounter++;
        // 5 Ground/Ledge Arctic Foxes + 2 High-Canopy Snowy Owls for upper-sky balance
        this.isOwl = (idx % 7 === 5 || idx % 7 === 6);

        if (this.isOwl) {
            this.x = Math.random() * pw;
            this.y = 22 + Math.random() * (ph * 0.26);
            this.dir = Math.random() < 0.5 ? 1 : -1;
            this.vx = this.dir * (0.34 + Math.random() * 0.12);
            this.vy = 0;
            this.phase = Math.random() * Math.PI * 2;
            this.rgb = [224, 242, 254];
            return;
        }

        const ledges = getArcticLedges(pw, ph);
        this.ledgeId = idx % ledges.length;
        const l = ledges[this.ledgeId];
        this.x = l.x1 + 10 + Math.random() * Math.max(8, (l.x2 - l.x1 - 20));
        this.y = l.yFn(this.x);
        this.dir = Math.random() < 0.5 ? 1 : -1;
        this.phase = Math.random() * Math.PI * 2;

        // Coats: Pure Winter White, Blue-Silver Morph, Champagne Frost
        const coats = [
            { main: '#f8fafc', shade: '#cbd5e1', ear: '#94a3b8', tailTip: '#ffffff', nose: '#0f172a', rgb: [224, 242, 254] },
            { main: '#e2e8f0', shade: '#94a3b8', ear: '#64748b', tailTip: '#f8fafc', nose: '#0f172a', rgb: [186, 230, 253] },
            { main: '#fffbeb', shade: '#fde68a', ear: '#f59e0b', tailTip: '#ffffff', nose: '#1e293b', rgb: [254, 243, 199] }
        ];
        this.pal = coats[idx % coats.length];
        this.rgb = this.pal.rgb;

        // Fox States: 'walk' | 'sit' | 'jump' | 'pounce'
        this.state = 'walk';
        this.stateTimer = 70 + Math.random() * 110;
        this.targetX = l.x1 + 8 + Math.random() * Math.max(8, l.x2 - l.x1 - 16);
        this.eatCooldown = 0;
        this.jumpStart = null;
        this.jumpEnd = null;
        this.jumpT = 0;
        this.jumpDur = 36;
        this.snowPuffs = [];
    }

    startJump(toLedgeId, destX) {
        const ledges = getArcticLedges(pw, ph);
        const destLedge = ledges[toLedgeId];
        const clampedX = Math.max(destLedge.x1 + 8, Math.min(destLedge.x2 - 8, destX));
        const destY = destLedge.yFn(clampedX);

        this.jumpStart = { x: this.x, y: this.y };
        this.jumpEnd = { x: clampedX, y: destY, ledgeId: toLedgeId };
        this.jumpT = 0;
        const dist = Math.hypot(clampedX - this.x, destY - this.y);
        this.jumpDur = Math.max(24, Math.min(48, Math.round(dist * 0.36)));
        this.dir = clampedX >= this.x ? 1 : -1;
        this.state = 'jump';
        // Kick up snow powder on takeoff!
        this.snowPuffs.push({ x: this.x, y: this.y, life: 12 });
    }

    findLedgeForPoint(px, py) {
        const ledges = getArcticLedges(pw, ph);
        let bestId = 0;
        let bestD = 999;
        for (const l of ledges) {
            if (px >= l.x1 - 8 && px <= l.x2 + 8) {
                const ly = l.yFn(px);
                const d = Math.abs(ly - py);
                if (d < bestD) {
                    bestD = d;
                    bestId = l.id;
                }
            }
        }
        return bestId;
    }

    update(time) {
        // 1. High-altitude Snowy Owl flight update
        if (this.isOwl) {
            this.phase += 0.14 * frameScale;
            this.x += this.vx * frameScale;
            this.y += Math.sin(time * 0.0015 + this.phase * 0.3) * 0.08 * frameScale;
            if (this.x < -30) this.x = pw + 30;
            if (this.x > pw + 30) this.x = -30;
            return;
        }

        const ledges = getArcticLedges(pw, ph);
        const curLedge = ledges[this.ledgeId] || ledges[0];
        if (this.eatCooldown > 0) this.eatCooldown = Math.max(0, this.eatCooldown - frameScale);

        for (let i = this.snowPuffs.length - 1; i >= 0; i--) {
            this.snowPuffs[i].life -= frameScale;
            if (this.snowPuffs[i].life <= 0) this.snowPuffs.splice(i, 1);
        }

        // STATE A: PARABOLIC PLATFORM-TO-PLATFORM JUMP
        if (this.state === 'jump') {
            this.jumpT += frameScale;
            const prog = Math.min(1, this.jumpT / this.jumpDur);
            const arcHeight = Math.min(42, Math.max(18, Math.abs(this.jumpEnd.x - this.jumpStart.x) * 0.28 + Math.abs(this.jumpEnd.y - this.jumpStart.y) * 0.35));

            this.x = this.jumpStart.x + (this.jumpEnd.x - this.jumpStart.x) * prog;
            const linearY = this.jumpStart.y + (this.jumpEnd.y - this.jumpStart.y) * prog;
            this.y = linearY - Math.sin(prog * Math.PI) * arcHeight;

            if (prog >= 1) {
                this.ledgeId = this.jumpEnd.ledgeId;
                this.x = this.jumpEnd.x;
                this.y = ledges[this.ledgeId].yFn(this.x);
                this.snowPuffs.push({ x: this.x, y: this.y, life: 14 });
                this.state = 'walk';
                this.stateTimer = 60 + Math.random() * 90;
                const nl = ledges[this.ledgeId];
                this.targetX = nl.x1 + 8 + Math.random() * Math.max(8, nl.x2 - nl.x1 - 16);
            }
            return;
        }

        // STATE B: ARCTIC FOX SNOW POUNCE (Diving nose-first into snow to eat Cloudberry!)
        if (this.state === 'pounce') {
            this.stateTimer -= frameScale;
            if (this.targetBerry && this.targetBerry.life > 0 && this.stateTimer < 14) {
                this.targetBerry.life = 0;
                this.snowPuffs.push({ x: this.x + this.dir * 5, y: this.y, life: 15 });
            }
            if (this.stateTimer <= 0) {
                this.state = 'sit';
                this.stateTimer = 45 + Math.random() * 45;
                this.eatCooldown = 95;
                this.targetBerry = null;
            }
            return;
        }

        // Check for user-dropped Golden Cloudberries
        const berry = findAvailableStimulus(this, 'cloudberry', Math.max(420, pw));
        if (berry && berry.landed) {
            const berryLedgeId = this.findLedgeForPoint(berry.x, berry.y);
            if (berryLedgeId === this.ledgeId) {
                // On the same ledge! Run to the berry and pounce!
                this.state = 'walk';
                this.targetX = berry.x;
                if (Math.abs(berry.x - this.x) < 9) {
                    this.dir = berry.x >= this.x ? 1 : -1;
                    this.state = 'pounce';
                    this.stateTimer = 28;
                    this.targetBerry = berry;
                    return;
                }
            } else {
                // Berry is on another platform! Hop along connected ledges to reach it!
                const links = ARCTIC_LEDGE_LINKS[this.ledgeId] || [0];
                let nextLedge = links[0];
                let bestDist = 9999;
                for (const candidateId of links) {
                    const cl = ledges[candidateId];
                    const midX = (cl.x1 + cl.x2) * 0.5;
                    const midY = cl.yFn(midX);
                    const d = Math.hypot(berry.x - midX, berry.y - midY);
                    if (d < bestDist) {
                        bestDist = d;
                        nextLedge = candidateId;
                    }
                }
                const nl = ledges[nextLedge];
                const jumpTargetX = nextLedge === berryLedgeId
                    ? berry.x
                    : (nl.x1 + 10 + Math.random() * Math.max(6, nl.x2 - nl.x1 - 20));
                this.startJump(nextLedge, jumpTargetX);
                return;
            }
        }

        // STATE C: SITTING & CURLING FLUFFY TAIL ON LEDGE OVERLOOK
        if (this.state === 'sit') {
            this.phase += 0.05 * frameScale;
            this.stateTimer -= frameScale;
            this.y = curLedge.yFn(this.x);
            if (this.stateTimer <= 0) {
                // 42% chance to leap to an adjacent snow platform!
                const links = ARCTIC_LEDGE_LINKS[this.ledgeId] || [0];
                if (Math.random() < 0.42 && links.length > 0) {
                    const nextId = links[Math.floor(Math.random() * links.length)];
                    const nl = ledges[nextId];
                    const tx = nl.x1 + 10 + Math.random() * Math.max(8, nl.x2 - nl.x1 - 20);
                    this.startJump(nextId, tx);
                } else {
                    this.state = 'walk';
                    this.stateTimer = 80 + Math.random() * 120;
                    this.targetX = curLedge.x1 + 8 + Math.random() * Math.max(8, curLedge.x2 - curLedge.x1 - 16);
                }
            }
            return;
        }

        // STATE D: TROTTING BRISKLY ALONG SNOW LEDGE
        this.phase += 0.24 * frameScale;
        this.stateTimer -= frameScale;
        const dx = this.targetX - this.x;

        if (Math.abs(dx) > 4) {
            this.dir = dx >= 0 ? 1 : -1;
            const walkSpd = berry ? 0.62 : 0.36;
            this.x += this.dir * walkSpd * frameScale;
            this.x = Math.max(curLedge.x1 + 6, Math.min(curLedge.x2 - 6, this.x));
            this.y = curLedge.yFn(this.x);
        } else {
            if (Math.random() < 0.50) {
                // Pause and sit on the ledge overlook
                this.state = 'sit';
                this.stateTimer = 55 + Math.random() * 80;
                this.dir = (this.x < pw * 0.5) ? 1 : -1;
            } else {
                // Or leap to another snow platform!
                const links = ARCTIC_LEDGE_LINKS[this.ledgeId] || [0];
                const nextId = links[Math.floor(Math.random() * links.length)];
                const nl = ledges[nextId];
                const tx = nl.x1 + 10 + Math.random() * Math.max(8, nl.x2 - nl.x1 - 20);
                this.startJump(nextId, tx);
            }
        }
    }

    draw() {
        const bx = Math.round(this.x);
        const by = Math.round(this.y);
        const dir = this.dir;

        const px = (x, y, w, h, col) => {
            const drawX = dir > 0 ? (bx + x) : (bx - x - w);
            pRect(drawX, by + y, w, h, col);
        };

        // 1. RENDER SNOWY OWL (If this instance is an owl in the upper sky)
        if (this.isOwl) {
            const flap = Math.round(Math.sin(this.phase) * 4);
            // Broad silent white wings with dark barred primary tips
            px(-8, -2 - Math.floor(flap * 0.6), 7, 2, '#cbd5e1');
            px(-11, -3 - flap, 5, 2, '#f8fafc');
            px(-12, -3 - flap, 2, 1, '#334155');
            // Rounded owl body & barred tail
            px(-5, -1, 10, 3, '#f8fafc');
            px(-7, 0, 3, 2, '#cbd5e1');
            px(3, -3, 4, 4, '#ffffff');
            // Golden owl eyes & dark beak
            px(5, -2, 1, 1, '#facc15');
            px(7, -1, 1, 1, '#1e293b');
            // Foreground wing
            px(-4, -1 + Math.floor(flap * 0.5), 8, 2, '#ffffff');
            px(-9, +flap, 6, 2, '#f8fafc');
            px(-11, +flap, 2, 1, '#475569');
            return;
        }

        // Kick-up snow powder particles when jumping/landing
        for (const sp of this.snowPuffs) {
            pRect(sp.x - 2, sp.y - 2, 2, 1, 'rgba(255, 255, 255, 0.85)');
            pRect(sp.x + 2, sp.y - 3, 1, 1, 'rgba(224, 242, 254, 0.75)');
        }

        const p = this.pal;

        // 2. POSE A: SITTING & CURLED ON LEDGE
        if (this.state === 'sit') {
            const breath = Math.sin(this.phase) > 0.4 ? -1 : 0;
            pRect(bx - 5, by - 1, 10, 2, 'rgba(15, 23, 42, 0.28)');
            // Upright seated chest & back
            px(-4, -6 + breath, 6, 6, p.main);
            px(-4, -5 + breath, 2, 5, p.shade);
            px(0, -5 + breath, 3, 5, '#ffffff'); // Fluffy white chest ruff
            // Head, pointed ears & dark eye/nose
            px(-1, -10 + breath, 5, 4, p.main);
            px(-1, -12 + breath, 2, 2, p.ear);
            px(2, -12 + breath, 2, 2, p.ear);
            px(2, -9 + breath, 1, 1, '#0f172a');
            px(4, -8 + breath, 2, 2, p.main);
            px(5, -8 + breath, 1, 1, p.nose);
            // Big plush tail wrapped warmly around the paws
            px(-8, -3, 6, 3, p.main);
            px(-7, -1, 7, 2, p.shade);
            px(-3, -2, 3, 2, p.tailTip);
            return;
        }

        // 3. POSE B: MID-AIR PARABOLIC JUMP OR SNOW POUNCE
        if (this.state === 'jump' || this.state === 'pounce') {
            const isDown = (this.state === 'pounce') || (this.jumpT > this.jumpDur * 0.55);
            const tilt = isDown ? 1 : -1;

            // Huge streaming bushy Arctic Fox tail (5px thick!)
            for (let t = 0; t < 10; t++) {
                const tx = -6 - t;
                const ty = -4 - tilt * Math.floor(t * 0.35) + Math.round(Math.sin(this.phase + t * 0.4) * 0.8);
                px(tx, ty, 2, 4, t > 6 ? p.tailTip : p.main);
                if (t <= 6) px(tx, ty + 3, 2, 1, p.shade);
            }

            // Outstretched leaping torso & legs
            px(-5, -5, 11, 4, p.main);
            px(-4, -2, 9, 1, p.shade);
            px(-7, -2 - tilt, 3, 2, p.shade); // Hind legs stretched back
            px(5, -2 + tilt, 3, 2, p.main);   // Front paws reaching forward

            // Aerodynamic head & ears
            const hy = -7 + tilt * 2;
            px(3, hy, 5, 4, p.main);
            px(3, hy - 2, 2, 2, p.ear);
            px(6, hy - 2, 2, 2, p.ear);
            px(6, hy + 1, 1, 1, '#0f172a');
            px(8, hy + 2, 2, 2, p.main);
            px(9, hy + 2, 1, 1, p.nose);
            return;
        }

        // 4. POSE C: TROTTING ALONG SNOW LEDGE
        const bob = Math.abs(Math.sin(this.phase)) > 0.6 ? -1 : 0;
        const stride = Math.round(Math.sin(this.phase) * 2);

        // Soft snow shadow under paws
        pRect(bx - 6, by - 1, 12, 2, 'rgba(15, 23, 42, 0.26)');

        // Plush Horizontal Bushy Tail swaying behind
        for (let t = 0; t < 9; t++) {
            const tx = -6 - t;
            const ty = -5 + Math.round(Math.sin(this.phase * 0.7 - t * 0.3) * 0.8);
            px(tx, ty, 2, 3, t >= 6 ? p.tailTip : p.main);
            if (t < 6) px(tx, ty + 2, 2, 1, p.shade);
        }

        // 4 Animated Trotting Legs
        px(-4 - stride * 0.5, -2, 2, 2, p.shade);
        px(3 + stride * 0.5, -2, 2, 2, p.shade);
        px(-3 + stride * 0.5, -2, 2, 2, p.main);
        px(4 - stride * 0.5, -2, 2, 2, p.main);

        // Sculpted Arctic Fox Torso & Fluffy White Chest Ruff
        px(-5, -6 + bob, 11, 4, p.main);
        px(-5, -3 + bob, 10, 1, p.shade);
        px(3, -5 + bob, 4, 3, '#ffffff');

        // Alert Fox Head, Pointed Ears, Snout & Nose
        const hy = -9 + bob;
        px(3, hy, 5, 4, p.main);
        px(3, hy - 2, 2, 2, p.ear);
        px(6, hy - 2, 2, 2, p.ear);
        px(6, hy + 1, 1, 1, '#0f172a'); // Eye
        px(8, hy + 1, 2, 2, p.main);    // Snout
        px(9, hy + 1, 1, 1, p.nose);    // Black button nose
    }
}

// ============================================================================
// BÖLÜM SONU: KUTUP TİLKİSİ VE KAR BAYKUŞU SINIFI
// ============================================================================
