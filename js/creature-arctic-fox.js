import { pw, ph, frameScale, pRect } from './07-habitat-state.js';
import { findAvailableStimulus } from './creature-utils.js';
import { getArcticLedges, ARCTIC_LEDGE_LINKS } from './arctic-geometry.js';

/* PIXELARCTICFOX — dedicated kutup ti̇lki̇si̇ ve kar baykuşu behavior and pixel-art rendering. */

// ============================================================================
// BÖLÜM BAŞI: KUTUP TİLKİSİ VE KAR BAYKUŞU SINIFI VE DAVRANIŞLARI
// Bu dosya yalnızca ilgili canlının hareket, etkileşim ve çizim kodunu içerir.
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
// ============================================================================

// ============================================================================
// BÖLÜM SONU: KUTUP TİLKİSİ VE KAR BAYKUŞU SINIFI VE DAVRANIŞLARI
// ============================================================================
