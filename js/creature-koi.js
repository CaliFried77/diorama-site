import { pw, ph, frameScale, frameChance, pRect, frameSmoothing } from './07-habitat-state.js';
import { findAvailableStimulus } from './creature-utils.js';

/* PIXELKOI — dedicated koi̇ baliği behavior and pixel-art rendering. */

// ============================================================================
// BÖLÜM BAŞI: KOİ BALIĞI SINIFI VE DAVRANIŞLARI
// Bu dosya yalnızca ilgili canlının hareket, etkileşim ve çizim kodunu içerir.
// ============================================================================

/* ============================================================================
   CREATURE 6: MAJESTIC ARTICULATED NISHIKIGOI (Japon Zen Koi Balığı)
   ============================================================================ */
// ============================================================================
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

// ============================================================================
// BÖLÜM SONU: KOİ BALIĞI SINIFI VE DAVRANIŞLARI
// ============================================================================
