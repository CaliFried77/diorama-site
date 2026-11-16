import { stimuli, canvas, PIXEL_SCALE, HABITATS, currentHabitatIdx, pw, ph, frameScale, frameChance, flora, pRect, frameSmoothing } from './07-habitat-state.js';

/* CREATURES — Living Pixel Diorama
   Native ES module. Cross-file dependencies are declared with imports and exports. */
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

canvas.addEventListener('pointerdown', (e) => {
    const px = e.clientX / PIXEL_SCALE;
    const py = e.clientY / PIXEL_SCALE;
    const interactionProfile = HABITATS[currentHabitatIdx].interactionProfile;

    if (interactionProfile === 'nectar') {
        for (let i = 0; i < 3; i++) {
            const angle = (i / 3) * Math.PI * 2 + Math.random();
            const dist = i === 0 ? 0 : 7 + Math.random() * 8;
            stimuli.push({
                type: 'honey_nectar',
                x: px + Math.cos(angle) * dist,
                y: py + Math.sin(angle) * dist,
                baseY: py + Math.sin(angle) * dist,
                phase: Math.random() * Math.PI * 2,
                ripple: 0,
                life: 240,
                claimedBy: null
            });
        }
    } else if (interactionProfile === 'blossom') {
        for (let i = 0; i < 2; i++) {
            stimuli.push({
                type: 'floating_blossom',
                x: px + (i - 0.5) * 12,
                y: py + (Math.random() - 0.5) * 8,
                vx: (Math.random() - 0.5) * 0.08,
                vy: -0.03 + Math.random() * 0.06,
                phase: Math.random() * Math.PI * 2,
                color: i === 0 ? '#f0abfc' : '#7dd3fc',
                core: '#fef08a',
                life: 250,
                claimedBy: null
            });
        }
    } else if (interactionProfile === 'bloodworm') {
        for (let i = 0; i < 3; i++) {
            stimuli.push({
                type: 'bloodworm',
                x: px + (Math.random() - 0.5) * 14,
                y: py + (Math.random() - 0.5) * 8,
                vy: 0.13 + Math.random() * 0.06,
                phase: Math.random() * Math.PI * 2,
                life: 260,
                claimedBy: null
            });
        }
    } else if (interactionProfile === 'midge') {
        for (let i = 0; i < 3; i++) {
            const bx = px + (Math.random() - 0.5) * 18;
            const by = py + (Math.random() - 0.5) * 12;
            stimuli.push({
                type: 'midge',
                x: bx,
                y: by,
                baseX: bx,
                baseY: by,
                phase: Math.random() * Math.PI * 2,
                life: 240,
                claimedBy: null
            });
        }
    } else if (interactionProfile === 'plankton') {
        for (let i = 0; i < 2; i++) {
            stimuli.push({
                type: 'plankton_swarm',
                x: px + (i - 0.5) * 14,
                y: py + (Math.random() - 0.5) * 10,
                phase: Math.random() * Math.PI * 2,
                life: 220,
                claimedBy: null
            });
        }
    } else if (interactionProfile === 'pellet') {
        for (let i = 0; i < 3; i++) {
            stimuli.push({
                type: 'koi_pellet',
                x: px + (Math.random() - 0.5) * 14,
                y: py + (Math.random() - 0.5) * 10,
                ripple: 1,
                life: 250,
                claimedBy: null
            });
        }
    } else if (interactionProfile === 'fruit') {
        for (let i = 0; i < 3; i++) {
            const offset = (i - 1) * 7;
            const fruitX = px + offset + (Math.random() - 0.5) * 3;
            const fruitY = py + (Math.random() - 0.5) * 6;
            stimuli.push({
                type: 'tropical_fruit',
                x: fruitX,
                y: fruitY,
                baseY: fruitY,
                phase: Math.random() * Math.PI * 2,
                hue: ['#f97316', '#e11d48', '#facc15'][i],
                life: 280,
                claimedBy: null
            });
        }
    }
});

/* ============================================================================
   CREATURE 1: ARTISAN HONEYBEE & ROYAL BUMBLEBEE
   ============================================================================ */
export class PixelBee {
    constructor() {
        this.x = Math.random() * pw;
        this.y = 26 + Math.random() * (ph - 66);
        this.vx = (Math.random() < 0.5 ? 1 : -1) * (0.28 + Math.random() * 0.20);
        this.vy = (Math.random() - 0.5) * 0.18;
        this.phase = Math.random() * Math.PI * 2;
        this.isBumble = Math.random() > 0.42;
        this.rgb = [251, 191, 36];
        this.sipTimer = 0;
        this.eatCooldown = 0;
        this.perchedFlower = null;
        this.trail = [];
    }

    update(t) {
        this.phase += 0.36 * frameScale;
        if (this.eatCooldown > 0) this.eatCooldown = Math.max(0, this.eatCooldown - frameScale);

        if (this.sipTimer > 0) {
            this.sipTimer = Math.max(0, this.sipTimer - frameScale);
            this.vx *= Math.pow(0.82, frameScale);
            this.vy *= Math.pow(0.82, frameScale);
            if (this.perchedFlower) {
                const sway = Math.sin(t * 0.0018 + (this.perchedFlower.phase || 0)) * 2.5;
                this.x = this.perchedFlower.x + sway;
                this.y = (ph - this.perchedFlower.h) - 8;
            }
            if (this.sipTimer === 0) {
                this.perchedFlower = null;
                const awayAngle = -Math.PI * 0.5 + (Math.random() - 0.5) * 1.6;
                this.vx = Math.cos(awayAngle) * 0.52;
                this.vy = Math.sin(awayAngle) * 0.42;
                this.eatCooldown = 115;
            }
            return;
        }

        const nectar = findAvailableStimulus(this, 'honey_nectar', 145);
        if (nectar) {
            const dx = nectar.x - this.x;
            const dy = nectar.y - this.y;
            const dist = Math.hypot(dx, dy);
            if (dist < 6) {
                nectar.life = 0;
                this.sipTimer = 20;
                return;
            }
            this.vx += (dx / dist) * 0.036 * frameScale;
            this.vy += (dy / dist) * 0.036 * frameScale;
        } else {
            if (this.eatCooldown === 0 && frameChance(0.008)) {
                const sunflowers = flora.filter(f => f.type === 'sunflower');
                if (sunflowers.length > 0) {
                    const sf = sunflowers[Math.floor(Math.random() * sunflowers.length)];
                    const dx = sf.x - this.x;
                    const dy = (ph - sf.h - 8) - this.y;
                    if (Math.hypot(dx, dy) < 95) {
                        this.vx += (dx / 95) * 0.08 * frameScale;
                        this.vy += (dy / 95) * 0.08 * frameScale;
                        if (Math.hypot(dx, dy) < 9) {
                            this.perchedFlower = sf;
                            this.sipTimer = 32;
                            return;
                        }
                    }
                }
            }
            this.vx += (Math.random() - 0.5) * 0.03 * frameScale;
            this.vy += ((Math.random() - 0.5) * 0.024 + Math.sin(this.phase * 0.14) * 0.009) * frameScale;
        }

        const spd = Math.hypot(this.vx, this.vy);
        if (spd > 0.58) {
            this.vx = (this.vx / spd) * 0.58;
            this.vy = (this.vy / spd) * 0.58;
        } else if (spd < 0.22) {
            this.vx *= Math.pow(1.15, frameScale);
        }

        if (this.y < 24) this.vy += 0.035 * frameScale;
        if (this.y > ph - 44) this.vy -= 0.035 * frameScale;

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
        const dir = this.vx >= 0 ? 1 : -1;
        const bx = Math.round(this.x);
        const by = Math.round(this.y);
        const tilt = this.sipTimer > 0 ? 0 : 1;

        for (let i = 0; i < this.trail.length; i++) {
            const tr = this.trail[i];
            pRect(tr.x - dir * 6, tr.y, 1, 1, `rgba(253, 224, 71, ${(tr.life / 18).toFixed(2)})`);
        }

        const flap = this.sipTimer > 0 ? 0 : Math.round(Math.sin(this.phase * 2.1) * 3);
        const wingH = 4 + Math.abs(flap);
        pRect(bx - dir * 3, by - 2 - wingH, 4, wingH, 'rgba(186, 230, 253, 0.48)');

        const abLen = this.isBumble ? 7 : 6;
        for (let s = -abLen; s <= -2; s++) {
            const yOff = by + (s < -4 ? tilt : 0);
            const halfH = (s === -abLen || s === -2) ? 2 : (this.isBumble ? 3 : 2);
            for (let dy = -halfH; dy <= halfH; dy++) {
                let col = '#18181b';
                const band = Math.abs(s);
                if (band === 3 || band === 4 || (this.isBumble && band === 6)) {
                    col = dy < 0 ? '#fde047' : '#f59e0b';
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
                const col = dy <= -1 ? '#fbbf24' : (dy === 0 ? '#d97706' : '#78350f');
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
        pRect(bx - 3 * dir, by + 3, 2, 2, '#fde047');
        pRect(bx - 2 * dir, by + 4, 1, 1, '#f59e0b');

        const fwY = by - 3 - Math.abs(flap);
        pRect(bx - dir * 1, fwY, 5, 3, 'rgba(240, 249, 255, 0.82)');
        pRect(bx, fwY - 1, 3, 1, 'rgba(255, 255, 255, 0.92)');
    }
}

/* ============================================================================
   CREATURE 6: MAJESTIC ARTICULATED NISHIKIGOI
   ============================================================================ */
export class PixelKoi {
    constructor() {
        this.x = Math.random() * pw;
        this.y = 34 + Math.random() * (ph - 56);
        this.angle = Math.random() * Math.PI * 2;
        this.targetAngle = this.angle;
        this.speed = 0.27 + Math.random() * 0.12;
        this.phase = Math.random() * Math.PI * 2;
        this.eatCooldown = 0;

        const varieties = [
            { base: '#f8fafc', shade: '#e2e8f0', patch1: '#ef4444', patch2: '#dc2626', fin: 'rgba(254, 226, 226, 0.85)', rgb: [248, 113, 113] },
            { base: '#f1f5f9', shade: '#cbd5e1', patch1: '#e11d48', patch2: '#1e293b', fin: 'rgba(241, 245, 249, 0.85)', rgb: [251, 113, 133] },
            { base: '#fef08a', shade: '#facc15', patch1: '#f59e0b', patch2: '#d97706', fin: 'rgba(254, 249, 195, 0.85)', rgb: [250, 204, 21] }
        ];
        this.pal = varieties[Math.floor(Math.random() * varieties.length)];
        this.rgb = this.pal.rgb;
        this.seed = Math.floor(Math.random() * 100);

        this.spineLen = 18;
        this.spine = [];
        for (let i = 0; i < this.spineLen; i++) {
            this.spine.push({
                x: this.x - Math.cos(this.angle) * i * 1.15,
                y: this.y - Math.sin(this.angle) * i * 1.15
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
        this.phase += 0.085 * frameScale;
        if (this.eatCooldown > 0) this.eatCooldown = Math.max(0, this.eatCooldown - frameScale);

        const pellet = findAvailableStimulus(this, 'koi_pellet', 155);
        if (pellet) {
            const dx = pellet.x - this.x;
            const dy = pellet.y - this.y;
            const dist = Math.hypot(dx, dy);
            this.targetAngle = Math.atan2(dy, dx);
            if (dist < 8) {
                pellet.life = 0;
                this.eatCooldown = 95;
                this.targetAngle += (Math.random() - 0.5) * 1.5;
            }
        } else if (frameChance(0.016)) {
            this.targetAngle += (Math.random() - 0.5) * 0.95;
        }

        if (this.y < 30) this.targetAngle = Math.cos(this.angle) >= 0 ? 0.42 : Math.PI - 0.42;
        if (this.y > ph - 24) this.targetAngle = Math.cos(this.angle) >= 0 ? -0.42 : Math.PI + 0.42;

        let diff = this.targetAngle - this.angle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        this.angle += diff * frameSmoothing(0.036);

        const spd = this.speed * (pellet ? 1.35 : 1.0);
        this.x += Math.cos(this.angle) * spd * frameScale;
        this.y += Math.sin(this.angle) * spd * frameScale;

        if (this.x < -36) {
            const d = pw + 72;
            this.x += d;
            this.shiftSpine(d, 0);
        } else if (this.x > pw + 36) {
            const d = -(pw + 72);
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
            const wag = Math.sin(this.phase - i * 0.36) * (i > 4 ? 0.16 : 0.04);
            const finalAng = segAngle + wag * 0.18;
            cur.x = prev.x + Math.cos(finalAng) * 1.12;
            cur.y = prev.y + Math.sin(finalAng) * 1.12;
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
            pRect(pt.x + 2, pt.y + 4, 3, 3, 'rgba(2, 8, 18, 0.26)');
        }

        const pecNode = this.spine[3];
        if (Math.abs(pecNode.x - this.x) < 40) {
            const finStroke = Math.sin(this.phase * 0.85) * 0.25;
            [-1, 1].forEach(side => {
                const fAng = this.angle + side * (Math.PI * 0.58 + finStroke);
                const fCos = Math.cos(fAng);
                const fSin = Math.sin(fAng);
                for (let r = 2; r <= 7; r++) {
                    for (let w = -2; w <= 1; w++) {
                        pRect(pecNode.x + fCos * r - fSin * w, pecNode.y + fSin * r + fCos * w, 1, 1, this.pal.fin);
                    }
                }
            });
        }

        for (let i = 13; i < this.spineLen; i++) {
            const pt = this.spine[i];
            if (Math.abs(pt.x - this.x) > 45) continue;
            const spread = (i - 12) * 1.35;
            for (let w = -Math.ceil(spread); w <= Math.ceil(spread); w++) {
                if (i >= 16 && Math.abs(w) <= 1) continue;
                pRect(pt.x + perpX * w, pt.y + perpY * w, 1, 1, this.pal.fin);
            }
        }

        const bodyRadii = [2.8, 3.8, 4.5, 4.8, 4.7, 4.4, 4.0, 3.6, 3.1, 2.6, 2.2, 1.8, 1.4, 1.1];
        for (let i = 13; i >= 0; i--) {
            const pt = this.spine[i];
            if (Math.abs(pt.x - this.x) > 45) continue;
            const rad = bodyRadii[i] || 1.2;
            const rInt = Math.ceil(rad);

            for (let dy = -rInt; dy <= rInt; dy++) {
                for (let dx = -rInt; dx <= rInt; dx++) {
                    if (dx * dx + dy * dy <= rad * rad) {
                        let col = (dx + dy) % 3 === 0 ? this.pal.shade : this.pal.base;
                        if ((i >= 1 && i <= 4 && dx >= -2) || (i >= 7 && i <= 10 && dy <= 1)) {
                            col = this.pal.patch1;
                        } else if ((i + this.seed) % 6 === 0 && Math.abs(dx) <= 1) {
                            col = this.pal.patch2;
                        }
                        pRect(pt.x + dx, pt.y + dy, 1, 1, col);
                    }
                }
            }

            if (i >= 4 && i <= 10) {
                pRect(pt.x, pt.y - 1, 1, 1, '#ffffff');
            }
        }

        const head = this.spine[0];
        const snoutX = head.x + cos * 3.2;
        const snoutY = head.y + sin * 3.2;
        pRect(snoutX, snoutY, 2, 2, this.pal.base);

        const eyeX = head.x + cos * 1.5;
        const eyeY = head.y + sin * 1.5;
        pRect(eyeX + perpX * 2.8, eyeY + perpY * 2.8, 1, 1, '#0f172a');
        pRect(eyeX - perpX * 2.8, eyeY - perpY * 2.8, 1, 1, '#0f172a');

        pRect(snoutX + cos * 1.2 + perpX * 2.2, snoutY + sin * 1.2 + perpY * 2.2, 1, 1, this.pal.patch1);
        pRect(snoutX + cos * 1.2 - perpX * 2.2, snoutY + sin * 1.2 - perpY * 2.2, 1, 1, this.pal.patch1);
    }
}

/* ============================================================================
   CREATURE 2: CONTINUOUS SILK-VEIL HALFMOON BETTA FISH
   ============================================================================ */
export class PixelBetta {
    constructor() {
        this.x = Math.random() * pw;
        this.y = 28 + Math.random() * (ph - 72);
        this.angle = Math.random() < 0.5 ? 0 : Math.PI;
        this.targetAngle = this.angle;
        this.speed = 0.28 + Math.random() * 0.14;
        this.phase = Math.random() * Math.PI * 2;
        this.eatCooldown = 0;

        const themes = [
            { bodyDark: '#1e3a8a', bodyMid: '#2563eb', bodyHi: '#60a5fa', finBase: '#1d4ed8', finMid: '#4f46e5', finRim: '#7dd3fc', rgb: [56, 189, 248] },
            { bodyDark: '#881337', bodyMid: '#e11d48', bodyHi: '#fb7185', finBase: '#be123c', finMid: '#9f1239', finRim: '#fda4af', rgb: [251, 113, 133] },
            { bodyDark: '#134e4a', bodyMid: '#0d9488', bodyHi: '#5eead4', finBase: '#0f766e', finMid: '#d97706', finRim: '#fde047', rgb: [45, 212, 191] }
        ];
        this.pal = themes[Math.floor(Math.random() * themes.length)];
        this.rgb = this.pal.rgb;

        this.history = [];
        for (let i = 0; i < 20; i++) {
            this.history.push({ x: this.x - Math.cos(this.angle) * i * 0.85, y: this.y });
        }
    }

    shiftHistory(dx, dy) {
        for (let i = 0; i < this.history.length; i++) {
            this.history[i].x += dx;
            this.history[i].y += dy;
        }
    }

    update(t) {
        this.phase += 0.068 * frameScale;
        if (this.eatCooldown > 0) this.eatCooldown = Math.max(0, this.eatCooldown - frameScale);

        const worm = findAvailableStimulus(this, 'bloodworm', 140);
        if (worm) {
            const dx = worm.x - this.x;
            const dy = worm.y - this.y;
            const dist = Math.hypot(dx, dy);
            this.targetAngle = Math.atan2(dy, dx);
            if (dist < 7) {
                worm.life = 0;
                this.eatCooldown = 95;
                this.targetAngle = (Math.cos(this.angle) >= 0 ? 0 : Math.PI) + (Math.random() - 0.5) * 0.9;
            }
        } else if (frameChance(0.015)) {
            const baseDir = Math.cos(this.angle) >= 0 ? 0 : Math.PI;
            const turn = Math.random() < 0.25 ? (baseDir === 0 ? Math.PI : 0) : baseDir;
            this.targetAngle = turn + (Math.random() - 0.5) * 0.55;
        }

        if (this.y < 26) this.targetAngle = Math.cos(this.angle) >= 0 ? 0.35 : Math.PI - 0.35;
        if (this.y > ph - 44) this.targetAngle = Math.cos(this.angle) >= 0 ? -0.35 : Math.PI + 0.35;

        let diff = this.targetAngle - this.angle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        this.angle += diff * frameSmoothing(0.036);

        const boost = worm ? 1.35 : 1.0;
        const glide = (1 + 0.2 * Math.sin(this.phase * 0.8)) * boost;
        this.x += Math.cos(this.angle) * this.speed * glide * frameScale;
        this.y += Math.sin(this.angle) * this.speed * glide * frameScale;

        if (this.x < -36) {
            const wrapDelta = pw + 72;
            this.x += wrapDelta;
            this.shiftHistory(wrapDelta, 0);
        } else if (this.x > pw + 36) {
            const wrapDelta = -(pw + 72);
            this.x += wrapDelta;
            this.shiftHistory(wrapDelta, 0);
        }

        const tailBaseX = this.x - Math.cos(this.angle) * 5;
        const tailBaseY = this.y - Math.sin(this.angle) * 5;
        this.history[0].x = tailBaseX;
        this.history[0].y = tailBaseY;

        for (let i = 1; i < this.history.length; i++) {
            const prev = this.history[i - 1];
            const cur = this.history[i];
            const wave = Math.sin(this.phase - i * 0.32) * (0.25 + i * 0.035);
            const tx = prev.x - Math.cos(this.angle) * 0.78 - Math.sin(this.angle) * wave;
            const ty = prev.y - Math.sin(this.angle) * 0.78 + Math.cos(this.angle) * wave;
            cur.x += (tx - cur.x) * frameSmoothing(0.45);
            cur.y += (ty - cur.y) * frameSmoothing(0.45);
        }
    }

    draw() {
        const cos = Math.cos(this.angle);
        const sin = Math.sin(this.angle);
        const perpX = -sin;
        const perpY = cos;
        const upSign = cos >= 0 ? 1 : -1;

        for (let i = this.history.length - 1; i >= 0; i--) {
            const pt = this.history[i];
            if (Math.abs(pt.x - this.x) > 42 || Math.abs(pt.y - this.y) > 42) continue;
            const tRatio = i / (this.history.length - 1);
            const fanRadius = Math.round(2 + Math.sin(tRatio * Math.PI * 0.82) * 9.5);

            for (let r = -fanRadius; r <= fanRadius; r++) {
                const rRatio = Math.abs(r) / (fanRadius || 1);
                const silkFold = Math.sin(this.phase * 1.1 - i * 0.25 + r * 0.35) * 0.6;
                const px = pt.x + perpX * (r * 0.85 + silkFold);
                const py = pt.y + perpY * (r * 0.85 + silkFold);

                let col = this.pal.finBase;
                if (tRatio > 0.78 || rRatio > 0.82) col = this.pal.finRim;
                else if (tRatio > 0.38 || (Math.abs(r) % 3 === 0)) col = this.pal.finMid;

                pRect(px, py, 2, 2, col);
            }
        }

        for (let i = 0; i < 11; i++) {
            const pt = this.history[i];
            if (Math.abs(pt.x - this.x) > 42) continue;
            const dorsalH = Math.round(2 + Math.sin((i / 10) * Math.PI) * 5);
            for (let d = 1; d <= dorsalH; d++) {
                pRect(pt.x - perpX * d * upSign, pt.y - perpY * d * upSign, 2, 1, d === dorsalH ? this.pal.finRim : this.pal.finMid);
            }
            const analH = Math.round(3 + (i / 10) * 6);
            for (let a = 1; a <= analH; a++) {
                pRect(pt.x + perpX * a * upSign, pt.y + perpY * a * upSign, 2, 1, a === analH ? this.pal.finRim : this.pal.finBase);
            }
        }

        for (let b = -5; b <= 6; b++) {
            const halfThick = b > 3 ? (6 - b) * 0.7 : (b < -2 ? (6 + b) * 0.65 : 2.3);
            for (let w = -Math.floor(halfThick); w <= Math.floor(halfThick); w++) {
                const bx = this.x + cos * b + perpX * w;
                const by = this.y + sin * b + perpY * w;
                let col = this.pal.bodyMid;
                if (w * upSign < 0) col = this.pal.bodyHi;
                else if (w * upSign > 0) col = this.pal.bodyDark;
                pRect(bx, by, 1, 1, col);
            }
        }

        const eyeX = this.x + cos * 4.5 - perpX * 0.5 * upSign;
        const eyeY = this.y + sin * 4.5 - perpY * 0.5 * upSign;
        pRect(eyeX, eyeY, 1, 1, '#e0f2fe');

        const chinX = this.x + cos * 1 + perpX * 3 * upSign;
        const chinY = this.y + sin * 1 + perpY * 3 * upSign;
        pRect(chinX, chinY, 1, 3, this.pal.finMid);
        pRect(chinX, chinY + 3 * upSign, 1, 1, '#ffffff');
    }
}

/* ============================================================================
   CREATURE 3: SERENE EMPEROR DRAGONFLY
   ============================================================================ */
export class PixelDragonfly {
    constructor() {
        this.x = Math.random() * pw;
        this.y = 25 + Math.random() * (ph - 70);
        this.targetX = 35 + Math.random() * (pw - 70);
        this.targetY = 25 + Math.random() * (ph - 75);
        this.angle = Math.atan2(this.targetY - this.y, this.targetX - this.x);
        this.hoverTimer = 0;
        this.perched = false;
        this.phase = Math.random() * Math.PI * 2;
        this.eatCooldown = 0;

        const palettes = [
            { body: '#10b981', seg: '#047857', eye: '#38bdf8', wing: 'rgba(167, 243, 208, 0.75)', tip: '#6ee7b7', rgb: [52, 211, 153] },
            { body: '#38bdf8', seg: '#0369a1', eye: '#fde047', wing: 'rgba(186, 230, 253, 0.75)', tip: '#7dd3fc', rgb: [56, 189, 248] }
        ];
        this.pal = palettes[Math.floor(Math.random() * palettes.length)];
        this.rgb = this.pal.rgb;
    }

    pickNextDestination() {
        const reeds = flora.filter(f => f.type === 'reed');
        if (reeds.length > 0 && Math.random() < 0.25) {
            const r = reeds[Math.floor(Math.random() * reeds.length)];
            this.targetX = r.x;
            this.targetY = ph - r.h;
            this.perched = true;
            this.hoverTimer = 55 + Math.floor(Math.random() * 55);
        } else {
            this.perched = false;
            this.targetX = 30 + Math.random() * (pw - 60);
            this.targetY = 24 + Math.random() * (ph - 70);
            this.hoverTimer = 22 + Math.floor(Math.random() * 35);
        }
    }

    update(t) {
        this.phase += (this.perched ? 0.04 : 0.30) * frameScale;
        if (this.eatCooldown > 0) this.eatCooldown = Math.max(0, this.eatCooldown - frameScale);

        const midge = findAvailableStimulus(this, 'midge', 150);
        if (midge) {
            this.perched = false;
            this.targetX = midge.x;
            this.targetY = midge.y;
            if (Math.hypot(this.targetX - this.x, this.targetY - this.y) < 6) {
                midge.life = 0;
                this.eatCooldown = 85;
                this.pickNextDestination();
                return;
            }
        }

        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 5) {
            const desired = Math.atan2(dy, dx);
            let diff = desired - this.angle;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            this.angle += diff * frameSmoothing(0.075);
            const spd = Math.min(0.62, Math.max(0.28, dist * 0.028));
            this.x += Math.cos(this.angle) * spd * frameScale;
            this.y += Math.sin(this.angle) * spd * frameScale;
        } else {
            if (!this.perched) {
                this.x += Math.cos(this.angle) * 0.08 * frameScale;
                this.y += Math.sin(t * 0.005 + this.phase) * 0.08 * frameScale;
            }
            this.hoverTimer -= frameScale;
            if (this.hoverTimer <= 0) {
                this.pickNextDestination();
            }
        }
    }

    draw() {
        const cos = Math.cos(this.angle);
        const sin = Math.sin(this.angle);
        const perpX = -sin;
        const perpY = cos;

        const flap1 = this.perched ? 0.05 : Math.sin(this.phase) * 0.25;
        const flap2 = this.perched ? -0.05 : Math.cos(this.phase) * 0.25;

        const wingPairs = [
            { offsetAlong: 2, span: 13, sweep: 0.14 + flap1 },
            { offsetAlong: -2, span: 11, sweep: -0.20 + flap2 }
        ];

        wingPairs.forEach(wp => {
            const bx = this.x + cos * wp.offsetAlong;
            const by = this.y + sin * wp.offsetAlong;
            [-1, 1].forEach(side => {
                const wAng = this.angle + side * (Math.PI / 2 + wp.sweep);
                const wCos = Math.cos(wAng);
                const wSin = Math.sin(wAng);
                const wPerpX = -wSin;
                const wPerpY = wCos;
                for (let s = 2; s <= wp.span; s++) {
                    const hw = s > wp.span - 2 ? 0 : 1;
                    for (let w = -hw; w <= hw; w++) {
                        if (w === 0 || (s + w) % 2 === 0) {
                            pRect(bx + wCos * s + wPerpX * w, by + wSin * s + wPerpY * w, 1, 1, s >= wp.span - 1 ? this.pal.tip : this.pal.wing);
                        }
                    }
                }
            });
        });

        for (let i = -14; i <= -2; i++) {
            pRect(this.x + cos * i, this.y + sin * i, 1, 1, i % 2 === 0 ? this.pal.body : this.pal.seg);
        }
        for (let i = -1; i <= 2; i++) {
            for (let w = -1; w <= 1; w++) {
                pRect(this.x + cos * i + perpX * w, this.y + sin * i + perpY * w, 1, 1, this.pal.body);
            }
        }
        const hx = this.x + cos * 4;
        const hy = this.y + sin * 4;
        pRect(hx + perpX, hy + perpY, 1, 1, this.pal.eye);
        pRect(hx - perpX, hy - perpY, 1, 1, this.pal.eye);
        pRect(hx, hy, 1, 1, this.pal.body);
    }
}

/* ============================================================================
   CREATURE 4: TRUE 4-LOBED ORNATE SWALLOWTAIL & MORPHO BUTTERFLIES
   ============================================================================ */
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
        this.phase += (this.sipTimer > 0 ? 0.05 : 0.14) * frameScale;
        if (this.eatCooldown > 0) this.eatCooldown = Math.max(0, this.eatCooldown - frameScale);

        if (this.sipTimer > 0) {
            this.sipTimer = Math.max(0, this.sipTimer - frameScale);
            if (this.sipTimer === 0) {
                this.targetAngle += (Math.random() < 0.5 ? 1 : -1) * (1.1 + Math.random() * 0.8);
                this.eatCooldown = 110;
            }
            return;
        }

        const blossom = findAvailableStimulus(this, 'floating_blossom', 145);
        if (blossom) {
            const dx = blossom.x - this.x;
            const dy = blossom.y - this.y;
            const dist = Math.hypot(dx, dy);
            this.targetAngle = Math.atan2(dy, dx);
            if (dist < 6) {
                blossom.life = 0;
                this.sipTimer = 20;
                return;
            }
        } else if (frameChance(0.028)) {
            this.targetAngle += (Math.random() - 0.5) * 1.1;
        }

        if (this.y < 24) this.targetAngle = Math.PI * 0.45;
        if (this.y > ph - 38) this.targetAngle = -Math.PI * 0.45;
        if (this.x < 24) this.targetAngle = 0;
        if (this.x > pw - 24) this.targetAngle = Math.PI;

        let diff = this.targetAngle - this.angle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        this.angle += diff * frameSmoothing(0.048);

        const flutter = Math.sin(this.phase * 0.7) * 0.14;
        this.x += Math.cos(this.angle + flutter) * this.speed * frameScale;
        this.y += Math.sin(this.angle + flutter) * this.speed * frameScale;
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
   CREATURE 5: 360° BIOLUMINESCENT JELLYFISH
   ============================================================================ */
export class PixelJellyfish {
    constructor() {
        this.x = Math.random() * pw;
        this.y = Math.random() * ph;
        this.angle = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
        this.targetAngle = this.angle;
        this.phase = Math.random() * Math.PI * 2;
        this.baseSpeed = 0.18 + Math.random() * 0.12;
        this.eatCooldown = 0;

        const palettes = [
            { core: '#f5d0fe', mid: '#d946ef', rim: '#a21caf', arm: '#f0abfc', tent: '#86198f', rgb: [217, 70, 239] },
            { core: '#cffafe', mid: '#22d3ee', rim: '#0891b2', arm: '#67e8f9', tent: '#155e75', rgb: [34, 211, 238] },
            { core: '#ddd6fe', mid: '#8b5cf6', rim: '#5b21b6', arm: '#c4b5fd', tent: '#4c1d95', rgb: [139, 92, 246] }
        ];
        this.pal = palettes[Math.floor(Math.random() * palettes.length)];
        this.rgb = this.pal.rgb;

        this.numTentacles = 7;
        this.segCount = 15;
        this.tentacles = [];
        for (let t = 0; t < this.numTentacles; t++) {
            const nodes = [];
            for (let s = 0; s < this.segCount; s++) nodes.push({ x: this.x, y: this.y });
            this.tentacles.push(nodes);
        }
    }

    update(t) {
        this.phase += 0.05 * frameScale;
        if (this.eatCooldown > 0) this.eatCooldown = Math.max(0, this.eatCooldown - frameScale);

        const plankton = findAvailableStimulus(this, 'plankton_swarm', 145);
        if (plankton) {
            const dx = plankton.x - this.x;
            const dy = plankton.y - this.y;
            const dist = Math.hypot(dx, dy);
            this.targetAngle = Math.atan2(dy, dx);
            if (dist < 9) {
                plankton.life = 0;
                this.eatCooldown = 95;
                this.targetAngle += (Math.random() - 0.5) * 1.8;
            }
        } else if (frameChance(0.018)) {
            this.targetAngle += (Math.random() - 0.5) * 1.0;
        }

        if (this.y < 24) this.targetAngle = Math.PI * 0.4;
        if (this.y > ph - 34) this.targetAngle = -Math.PI * 0.5;
        if (this.x < 24) this.targetAngle = 0;
        if (this.x > pw - 24) this.targetAngle = Math.PI;

        let diff = this.targetAngle - this.angle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        this.angle += diff * frameSmoothing(0.028);

        const pulse = Math.sin(this.phase);
        const thrust = pulse > 0 ? (0.12 + pulse * 0.36) : 0.09;
        this.x += Math.cos(this.angle) * (this.baseSpeed + thrust) * frameScale;
        this.y += Math.sin(this.angle) * (this.baseSpeed + thrust) * frameScale;

        const cos = Math.cos(this.angle);
        const sin = Math.sin(this.angle);
        const perpX = -sin;
        const perpY = cos;

        for (let k = 0; k < this.numTentacles; k++) {
            const offset = (k - (this.numTentacles - 1) / 2) * 2.2;
            const nodes = this.tentacles[k];
            nodes[0].x = this.x - cos * 3 + perpX * offset;
            nodes[0].y = this.y - sin * 3 + perpY * offset;

            for (let s = 1; s < this.segCount; s++) {
                const prev = nodes[s - 1];
                const cur = nodes[s];
                const sway = Math.sin(this.phase - s * 0.35 + k) * 0.35;
                cur.x += (prev.x - cos * 1.3 + perpX * sway - cur.x) * frameSmoothing(0.36);
                cur.y += (prev.y - sin * 1.3 + perpY * sway - cur.y) * frameSmoothing(0.36);
            }
        }
    }

    draw() {
        const cos = Math.cos(this.angle);
        const sin = Math.sin(this.angle);
        const perpX = -sin;
        const perpY = cos;

        for (let k = 0; k < this.numTentacles; k++) {
            const nodes = this.tentacles[k];
            const isOral = (k >= 2 && k <= 4);
            for (let s = 0; s < this.segCount; s++) {
                if (!isOral && s % 2 === 1 && s > 10) continue;
                pRect(nodes[s].x, nodes[s].y, 1, 1, isOral && s < 9 ? this.pal.arm : this.pal.tent);
            }
        }

        const contract = Math.sin(this.phase) * 1.8;
        const bellW = Math.round(10 - contract * 0.7);
        const bellH = Math.round(7 + contract * 0.4);

        for (let dy = -bellH; dy <= 2; dy++) {
            for (let dx = -bellW; dx <= bellW; dx++) {
                const nx = dx / bellW;
                const ny = dy / bellH;
                const distSq = nx * nx + ny * ny;
                if (distSq <= 1.0) {
                    if (dy === 2 && Math.abs(dx) % 2 === 1) continue;
                    let col = this.pal.mid;
                    if (distSq < 0.30 && dy < 0) col = this.pal.core;
                    else if (distSq > 0.74 || dy >= 1) col = this.pal.rim;
                    pRect(this.x - cos * (-dy) + perpX * dx, this.y - sin * (-dy) + perpY * dx, 1, 1, col);
                }
            }
        }
    }
}
/* ============================================================================
           CREATURE 7: ARTISTIC & REALISTIC MACAW PARROT FLOCK
           Multi-state AI (Soaring, Diving, Perching on Branches, Hover-Foraging & Pecking),
           anatomical 3-tier wing plumage, articulated waving tail, opening hooked bill,
           and crisp shaded pixel art.
           ============================================================================ */
        const PARROT_PALETTES = Object.freeze([
            // 1. Scarlet Macaw (Kırmızı Ara Papağanı - Kırmızı, Kehribar Sarısı ve Kobalt Mavi)
            {
                bodyHi: '#f87171', body: '#ef4444', bodyShade: '#b91c1c', belly: '#dc2626',
                wingShoulder: '#ef4444', wingCovert: '#facc15', wingGreen: '#10b981', wingPrimary: '#1d4ed8', wingTip: '#1e3a8a', wingUnder: '#b91c1c',
                tailCenter: '#ef4444', tailMid: '#dc2626', tailOuter: '#0284c7',
                face: '#fef3c7', faceLine: '#ef4444', beakUpper: '#fde68a', beakTip: '#92400e', beakLower: '#1e293b', eye: '#0f172a',
                rgb: [239, 68, 68]
            },
            // 2. Blue-and-Gold Macaw (Mavi-Altın Ara Papağanı - Turkuaz, Safir ve Altın Göğüs)
            {
                bodyHi: '#38bdf8', body: '#0284c7', bodyShade: '#0369a1', belly: '#facc15',
                wingShoulder: '#22c55e', wingCovert: '#38bdf8', wingGreen: '#0ea5e9', wingPrimary: '#1d4ed8', wingTip: '#1e3a8a', wingUnder: '#eab308',
                tailCenter: '#0284c7', tailMid: '#0369a1', tailOuter: '#facc15',
                face: '#fef9c3', faceLine: '#0f172a', beakUpper: '#334155', beakTip: '#0f172a', beakLower: '#0f172a', eye: '#0f172a',
                rgb: [56, 189, 248]
            },
            // 3. Military / Emerald Macaw (Zümrüt Yeşili Ara Papağanı - Kızıl Alın, Yeşil Gövde, Turkuaz Uçlar)
            {
                bodyHi: '#4ade80', body: '#16a34a', bodyShade: '#15803d', belly: '#22c55e',
                wingShoulder: '#f97316', wingCovert: '#22c55e', wingGreen: '#0d9488', wingPrimary: '#0284c7', wingTip: '#1e3a8a', wingUnder: '#15803d',
                tailCenter: '#dc2626', tailMid: '#b91c1c', tailOuter: '#0ea5e9',
                face: '#fef3c7', faceLine: '#b91c1c', beakUpper: '#334155', beakTip: '#0f172a', beakLower: '#0f172a', eye: '#0f172a',
                rgb: [34, 197, 94]
            },
            // 4. Hyacinth Macaw (Sümbül Ara Papağanı - Kraliyet Mavisi/İndigo ve Altın Göz/Gaga Halkası)
            {
                bodyHi: '#818cf8', body: '#4f46e5', bodyShade: '#3730a3', belly: '#4338ca',
                wingShoulder: '#6366f1', wingCovert: '#4f46e5', wingGreen: '#4338ca', wingPrimary: '#312e81', wingTip: '#1e1b4b', wingUnder: '#312e81',
                tailCenter: '#4f46e5', tailMid: '#3730a3', tailOuter: '#312e81',
                face: '#facc15', faceLine: '#312e81', beakUpper: '#334155', beakTip: '#0f172a', beakLower: '#0f172a', eye: '#0f172a',
                rgb: [129, 140, 248]
            },
        ]);

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

                // Behavioral States: 'flying' | 'perching' | 'perched' | 'eating'
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
                // Match the actual branch positions of the midground rainforest trees in 09-scenery.js
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

                // 1. PRIORITY: Check for user-dropped tropical fruit anywhere on screen!
                const fruit = findAvailableStimulus(this, 'tropical_fruit', Math.max(450, pw));
                if (fruit && this.state !== 'eating') {
                    this.targetFruit = fruit;
                    this.state = 'flying';
                    this.perchTarget = null;
                }

                // STATE A: EATING / HOVER-FORAGING AT FRUIT
                if (this.state === 'eating') {
                    this.phase += 0.38 * frameScale; // Rapid hovering wingbeats
                    this.stateTimer -= frameScale;
                    this.beakOpen = Math.sin(this.phase * 1.5) > 0 ? 1 : 0;

                    if (this.targetFruit && this.targetFruit.life > 0) {
                        const targetX = this.targetFruit.x - this.dir * 10;
                        const targetY = this.targetFruit.y - 2;
                        this.x += (targetX - this.x) * frameSmoothing(0.18);
                        this.y += (targetY - this.y) * frameSmoothing(0.18);
                        if (this.stateTimer <= 8) {
                            this.targetFruit.life = 0; // Consume fruit at end of pecking
                        }
                    }

                    if (this.stateTimer <= 0) {
                        this.state = 'flying';
                        this.eatCooldown = 90;
                        this.beakOpen = 0;
                        this.targetFruit = null;
                        // Graceful upward climb after eating
                        this.vx = this.dir * 0.48;
                        this.vy = -0.28;
                        this.waypointY = 30 + Math.random() * (ph * 0.38);
                        this.stateTimer = 180 + Math.random() * 200;
                    }
                    return;
                }

                // STATE B: PERCHED ON A RAINFOREST BRANCH
                if (this.state === 'perched') {
                    this.phase += 0.04 * frameScale; // Calm breathing rhythm
                    this.stateTimer -= frameScale;
                    this.vx = 0;
                    this.vy = 0;

                    // Occasional curious head turns, crest bobbing & calling while perched
                    if (frameChance(0.018)) {
                        this.headLook = (Math.random() < 0.4) ? -1 : 0;
                    }
                    if (frameChance(0.012)) {
                        this.beakOpen = this.beakOpen ? 0 : 1;
                    }

                    // Take off if timer expires or fruit appears
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

                // STATE C: FLYING TOWARD FRUIT
                if (fruit) {
                    this.phase += 0.24 * frameScale;
                    const dx = fruit.x - this.x;
                    const dy = fruit.y - this.y;
                    const dist = Math.max(1, Math.hypot(dx, dy));

                    // Smoothly steer velocity toward fruit (NO minSpeed lock blocking turnaround!)
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
                        this.stateTimer = 34; // Hover and peck for ~0.55s
                        this.targetFruit = fruit;
                        this.vx *= 0.2;
                        this.vy *= 0.2;
                    }
                    return;
                }

                // STATE D: FLYING TOWARD A BRANCH PERCH
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

                // STATE E: NATURAL SOARING, SWOOPING & BANKING FLIGHT
                this.phase += 0.17 * frameScale;
                this.stateTimer -= frameScale;

                if (this.stateTimer <= 0) {
                    if (Math.random() < 0.38) {
                        // Decide to go perch on a tree branch
                        this.perchTarget = this.pickPerchSpot();
                        this.state = 'perching';
                    } else {
                        // Or pick a new altitude and occasionally bank/turn around inside the valley
                        this.waypointY = 26 + Math.random() * (ph * 0.46);
                        if (Math.random() < 0.35 && this.x > pw * 0.2 && this.x < pw * 0.8) {
                            this.dir *= -1;
                        }
                        this.stateTimer = 150 + Math.random() * 220;
                    }
                }

                // Cruise horizontally with organic swoops toward waypointY
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

                // Soft canopy & understory boundaries during normal cruise
                if (this.y < 20) { this.y = 20; this.vy = Math.abs(this.vy) * 0.5 + 0.04; }
                if (this.y > ph * 0.68) { this.y = ph * 0.68; this.vy = -Math.abs(this.vy) * 0.5 - 0.04; }

                // Wrap or turn at screen edges
                if (this.x < -34) this.x = pw + 34;
                if (this.x > pw + 34) this.x = -34;
            }

            draw() {
                const p = this.palette;
                const dir = this.dir;
                const bx = Math.round(this.x);
                const by = Math.round(this.y);

                // Crisp 1:1 integer pixel helper with automatic horizontal mirroring
                const px = (x, y, w, h, col) => {
                    const drawX = dir > 0 ? (bx + x) : (bx - x - w);
                    pRect(drawX, by + y, w, h, col);
                };

                /* =============================================================
                   POSE 1: PERCHED UPRIGHT ON A TREE BRANCH
                   ============================================================= */
                if (this.state === 'perched') {
                    const breath = Math.sin(this.phase) > 0.3 ? -1 : 0;
                    const lookDir = this.headLook === -1 ? -1 : 1;

                    // Long graduated tail hanging down below the branch
                    for (let t = 0; t < 16; t++) {
                        const tx = -4 - Math.floor(t * 0.35);
                        const ty = 4 + t;
                        px(tx, ty, 2, 1, t < 11 ? p.tailCenter : p.tailOuter);
                        if (t < 10) px(tx + 2, ty, 1, 1, p.tailMid);
                    }

                    // Zygodactyl zygote claws gripping the branch
                    px(-2, 3, 2, 2, '#1e293b');
                    px(1, 3, 2, 2, '#1e293b');

                    // Upright Sculpted Macaw Torso & Breast
                    px(-4, -5 + breath, 7, 4, p.body);
                    px(-3, -1 + breath, 6, 4, p.belly);
                    px(-4, -4 + breath, 2, 6, p.bodyShade);
                    px(1, -5 + breath, 2, 5, p.bodyHi);

                    // Neatly Folded 3-Tier Wing resting along the side
                    px(-3, -4 + breath, 4, 3, p.wingShoulder);
                    px(-4, -1 + breath, 4, 3, p.wingCovert);
                    px(-4, 2 + breath, 3, 2, p.wingGreen);
                    px(-5, 4 + breath, 3, 3, p.wingPrimary);
                    px(-5, 7 + breath, 2, 2, p.wingTip);

                    // Head, Crown & Bare Facial Patch (supports looking forward or over shoulder)
                    const hy = -9 + breath;
                    px(-2, hy, 6, 4, p.body);
                    px(-1, hy - 1, 4, 1, p.bodyHi); // Crown highlight

                    if (lookDir === 1) {
                        px(1, hy + 1, 3, 3, p.face);
                        px(2, hy + 1, 1, 1, p.eye);
                        px(1, hy + 3, 2, 1, p.faceLine);
                        // Hooked Beak
                        px(4, hy + 1, 3, 2, p.beakUpper);
                        px(6, hy + 2, 1, 2, p.beakTip);
                        px(4, hy + 3 + this.beakOpen, 2, 1, p.beakLower);
                    } else {
                        // Looking back over its shoulder
                        px(-2, hy + 1, 3, 3, p.face);
                        px(-1, hy + 1, 1, 1, p.eye);
                        px(-5, hy + 1, 3, 2, p.beakUpper);
                        px(-6, hy + 2, 1, 2, p.beakTip);
                        px(-4, hy + 3, 2, 1, p.beakLower);
                    }
                    return;
                }

                /* =============================================================
                   POSE 2: IN-FLIGHT / SOARING / DIVING / HOVER-EATING
                   ============================================================= */
                const isHovering = this.state === 'eating' || (this.state === 'perching' && Math.hypot(this.vx, this.vy) < 0.28);
                const cycle = this.phase % (Math.PI * 4);
                const isGliding = !isHovering && !this.targetFruit && cycle > Math.PI * 2.7;
                const wingSin = isGliding ? 0.18 : Math.sin(this.phase);

                // Dynamic body pitch (-2 climbing steeply, -1 climbing, 0 level, +1 diving, +2 steep dive)
                const pitch = isHovering ? -1 : Math.max(-2, Math.min(2, Math.round(this.vy * 6)));
                const liftY = Math.round(-wingSin * 1.1);

                // 1. Far-Side (Background) Wing for 3D Depth
                if (isHovering) {
                    // Flared forward/upward braking wing
                    px(1, -8 + liftY, 5, 3, p.wingPrimary);
                    px(0, -5 + liftY, 5, 3, p.wingCovert);
                } else if (wingSin > 0.1) {
                    const farH = Math.round(wingSin * 5);
                    px(0, -4 - farH + liftY, 5, 2, p.wingTip);
                    px(-1, -2 - farH + liftY, 6, 3, p.wingPrimary);
                }

                // 2. Long Graduated Streaming Tail (waves with flight & fans out when braking/hovering)
                const tailLen = 19;
                for (let t = 0; t < tailLen; t++) {
                    const tx = -8 - t;
                    const waveOffset = Math.sin(this.tailWave - t * 0.28) * (t * 0.08);
                    const pitchOffset = -pitch * (t * 0.22);
                    const ty = Math.round(1 + t * 0.14 + pitchOffset + waveOffset + liftY);

                    // Central longest scarlet/blue rectrices
                    px(tx, ty, 1, 1, p.tailCenter);
                    if (t < 15) {
                        px(tx, ty - 1, 1, 1, p.tailMid);
                    }
                    // Outer cyan/gold graduated feathers (fanned wider during hover/turning)
                    const fanSpread = isHovering ? 2 : 1;
                    if (t >= 2 && t < 13) {
                        px(tx, ty + fanSpread, 1, 1, p.tailOuter);
                        if (isHovering && t < 9) {
                            px(tx, ty - 1 - fanSpread, 1, 1, p.tailOuter);
                        }
                    }
                }

                // 3. Sculpted Aerodynamic Macaw Body (with pitch tilt & 3-tone shading)
                const headPitch = pitch;
                const rearPitch = -Math.sign(pitch);

                // Upper mantle & back
                px(-6, -2 + rearPitch + liftY, 6, 2, p.body);
                px(0, -2 + liftY, 6, 2, p.bodyHi);
                // Core torso
                px(-7, 0 + rearPitch + liftY, 14, 3, p.body);
                // Sunlit breast & shaded belly contour
                px(1, 1 + headPitch + liftY, 6, 2, p.belly);
                px(-5, 3 + rearPitch + liftY, 10, 1, p.bodyShade);
                // Tucked dark zygodactyl feet under tail coverts (slightly lowered when about to land/eat)
                if (isHovering) {
                    px(-2, 4 + liftY, 2, 2, '#1e293b');
                    px(1, 4 + liftY, 2, 2, '#1e293b');
                } else {
                    px(-4, 4 + rearPitch + liftY, 3, 1, '#1e293b');
                }

                // 4. Sculpted Neck, Rounded Crown, Bare Facial Patch & Opening Hooked Beak
                const hx = 5;
                const hy = -4 + headPitch + liftY;

                // Neck & Crown
                px(hx - 1, hy + 1, 5, 4, p.body);
                px(hx, hy - 1, 6, 2, p.bodyHi);
                px(hx - 1, hy, 2, 2, p.bodyShade);

                // Iconic Macaw Bare Facial Patch with subtle feather striation pixel
                px(hx + 2, hy + 1, 4, 3, p.face);
                px(hx + 2, hy + 3, 2, 1, p.faceLine);
                // Expressive dark eye + tiny upper-left glint
                px(hx + 3, hy + 1, 2, 2, p.eye);
                px(hx + 3, hy + 1, 1, 1, '#ffffff');

                // Large Curved Hooked Macaw Bill (Upper maxilla + articulated lower mandible)
                px(hx + 6, hy + 1, 3, 2, p.beakUpper);
                px(hx + 8, hy + 2, 2, 2, p.beakTip);   // Sharp downward hook tip
                px(hx + 9, hy + 4, 1, 1, p.beakTip);
                // Lower dark mandible (drops 1px when eating/calling)
                px(hx + 6, hy + 3 + this.beakOpen, 2, 2, p.beakLower);

                // 5. Foreground 3-Tier Articulated Wing (5 distinct poses)
                if (isHovering) {
                    // HOVER / BRAKING FLARE: Swept forward & high with separated primary finger feathers
                    px(-2, -3 + liftY, 5, 3, p.wingShoulder);
                    px(-4, -6 + liftY, 6, 3, p.wingCovert);
                    px(-6, -9 + liftY, 6, 3, p.wingPrimary);
                    //Separated primary wingtip feathers
                    px(-8, -11 + liftY, 3, 2, p.wingTip);
                    px(-5, -12 + liftY, 3, 2, p.wingTip);
                    px(-2, -11 + liftY, 2, 2, p.wingTip);
                } else if (isGliding || (wingSin >= -0.22 && wingSin <= 0.28)) {
                    // POSE A: Broad Cambered Thermal Glide Wing
                    px(-3, -2 + liftY, 6, 2, p.wingShoulder);
                    px(-6, -3 + liftY, 7, 2, p.wingCovert);
                    px(-9, -4 + liftY, 6, 2, p.wingGreen);
                    px(-13, -5 + liftY, 6, 2, p.wingPrimary);
                    px(-15, -6 + liftY, 4, 2, p.wingTip);
                } else if (wingSin > 0.28 && wingSin <= 0.72) {
                    // POSE B: Mid-Upstroke / Swept Arch
                    px(-2, -3 + liftY, 5, 3, p.wingShoulder);
                    px(-5, -6 + liftY, 6, 3, p.wingCovert);
                    px(-8, -8 + liftY, 6, 2, p.wingGreen);
                    px(-11, -10 + liftY, 6, 2, p.wingPrimary);
                    px(-13, -11 + liftY, 4, 2, p.wingTip);
                } else if (wingSin > 0.72) {
                    // POSE C: Full High Upstroke (dramatic V-elevation above the back)
                    px(-1, -4 + liftY, 5, 3, p.wingShoulder);
                    px(-3, -7 + liftY, 6, 3, p.wingCovert);
                    px(-5, -10 + liftY, 6, 3, p.wingGreen);
                    px(-8, -13 + liftY, 6, 3, p.wingPrimary);
                    px(-10, -15 + liftY, 4, 2, p.wingTip);
                    px(-6, -15 + liftY, 3, 1, p.wingTip);
                } else if (wingSin < -0.22 && wingSin >= -0.72) {
                    // POSE D: Mid-Downstroke (sweeping across the flank)
                    px(-2, 0 + liftY, 6, 2, p.wingShoulder);
                    px(-4, 2 + liftY, 6, 2, p.wingCovert);
                    px(-7, 4 + liftY, 6, 2, p.wingGreen);
                    px(-10, 6 + liftY, 5, 2, p.wingPrimary);
                    px(-12, 7 + liftY, 3, 2, p.wingTip);
                } else {
                    // POSE E: Deep Power Downstroke (reaching below the chest)
                    px(-1, 1 + liftY, 5, 3, p.wingShoulder);
                    px(-3, 4 + liftY, 5, 3, p.wingCovert);
                    px(-5, 7 + liftY, 5, 2, p.wingGreen);
                    px(-7, 9 + liftY, 5, 2, p.wingPrimary);
                    px(-9, 11 + liftY, 3, 2, p.wingTip);
                }
            }
        }
