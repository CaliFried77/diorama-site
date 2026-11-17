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
            const flap = Math.round(Math.sin(this.phase) * 3.5);
            const wingTipY = -2 - flap;
            const wingMidY = -1 - Math.round(flap * 0.55);

            // Uzak (arka) kanat ve benekli uç telekleri
            px(-7, wingMidY - 1, 6, 2, '#cbd5e1');
            px(-11, wingTipY - 1, 5, 2, '#e2e8f0');
            px(-12, wingTipY - 1, 2, 1, '#334155');
            px(-9, wingTipY, 1, 1, '#475569');

            // Kuyruk telekleri ve gövde altı
            px(-9, 0, 4, 2, '#cbd5e1');
            px(-8, 0, 1, 1, '#475569');
            px(-5, -2, 9, 4, '#f8fafc');
            px(-4, 1, 7, 1, '#e2e8f0');
            px(-2, 2, 2, 1, '#64748b');

            // Yuvarlak baykuş başı, yüz diski, altın göz ve gaga
            px(3, -3, 5, 4, '#ffffff');
            px(4, -4, 3, 1, '#f8fafc');
            px(4, -3, 1, 1, '#94a3b8');
            px(5, -2, 2, 2, '#fef9c3');
            px(6, -2, 1, 1, '#f59e0b');
            px(8, -1, 1, 1, '#1e293b');

            // Ön kanat ve arktik bar desenleri
            const fgMidY = -1 + Math.round(flap * 0.45);
            const fgTipY = flap;
            px(-4, fgMidY, 7, 2, '#ffffff');
            px(-8, fgTipY, 5, 2, '#f8fafc');
            px(-10, fgTipY, 2, 1, '#334155');
            px(-6, fgTipY + 1, 1, 1, '#64748b');
            px(-3, fgMidY + 1, 1, 1, '#94a3b8');
            return;
        }

        // Sıçrama ve iniş sırasında savrulan kar tozları
        for (const sp of this.snowPuffs) {
            const rise = Math.round((15 - sp.life) * 0.25);
            pRect(sp.x - 3, sp.y - 2 - rise, 2, 1, 'rgba(255, 255, 255, 0.88)');
            pRect(sp.x + 2, sp.y - 3 - rise, 2, 1, 'rgba(224, 242, 254, 0.78)');
            pRect(sp.x, sp.y - 4 - rise, 1, 1, 'rgba(255, 255, 255, 0.65)');
        }

        const p = this.pal;

        // 2. POSE A: SITTING & CURLED ON LEDGE
        if (this.state === 'sit') {
            const breath = Math.sin(this.phase) > 0.45 ? -1 : 0;
            const earTwitch = Math.sin(this.phase * 1.7) > 0.85 ? 1 : 0;

            pRect(bx - 6, by - 1, 12, 2, 'rgba(15, 23, 42, 0.32)');

            // Sırt, oturma kalçası ve kabarık beyaz göğüs kürkü
            px(-5, -5 + breath, 5, 5, p.shade);
            px(-4, -7 + breath, 6, 6, p.main);
            px(0, -6 + breath, 3, 5, '#ffffff');
            px(1, -2, 2, 2, p.main);
            px(2, -1, 2, 1, '#334155');

            // Baş, kulaklar, göz ve burun
            const hy = -11 + breath;
            px(-1, hy, 5, 4, p.main);
            px(0, hy - 1, 3, 1, p.main);
            px(-1, hy - 2 + earTwitch, 2, 2, p.ear);
            px(2, hy - 3, 2, 2, p.ear);
            px(2, hy - 2, 1, 1, '#ffffff');
            px(2, hy + 1, 1, 1, '#0f172a');
            px(4, hy + 1, 2, 2, p.main);
            px(4, hy + 2, 2, 1, '#ffffff');
            px(6, hy + 1, 1, 1, p.nose);

            // Patilerin etrafına sarılmış kabarık kuyruk
            px(-9, -4, 6, 3, p.main);
            px(-8, -1, 8, 1, p.shade);
            px(-4, -3, 4, 2, p.tailTip);
            return;
        }

        // 3. POSE B: MID-AIR PARABOLIC JUMP OR SNOW POUNCE
        if (this.state === 'jump' || this.state === 'pounce') {
            const isPouncing = this.state === 'pounce';
            const pounceDive = isPouncing && this.stateTimer < 16;
            const isDescending = pounceDive || (!isPouncing && this.jumpT > this.jumpDur * 0.55);
            const tilt = pounceDive ? 2 : (isDescending ? 1 : -1);
            const yShift = pounceDive ? 1 : (isPouncing ? -3 : 0);

            if (isPouncing) {
                pRect(bx - 5, by - 1, 10, 2, 'rgba(15, 23, 42, 0.24)');
            }

            // Dalgalanan gür tilki kuyruğu
            for (let t = 0; t < 10; t++) {
                const tx = -5 - t;
                const ty = -5 + yShift - tilt * Math.floor(t * 0.35) + Math.round(Math.sin(this.phase + t * 0.4) * 0.7);
                px(tx, ty, 2, 4, t > 6 ? p.tailTip : p.main);
                if (t <= 6) px(tx, ty + 3, 2, 1, p.shade);
            }

            // Gergin sıçrama gövdesi ve bacaklar
            px(-5, -5 + yShift, 10, 4, p.main);
            px(-4, -2 + yShift, 8, 1, p.shade);
            px(1, -4 + yShift, 4, 3, '#ffffff');
            px(-8, -3 + yShift - tilt, 3, 2, p.shade);
            px(5, -2 + yShift + tilt, 3, 2, p.main);

            // Aerodinamik baş ve kulaklar
            const hy = -7 + yShift + tilt * 2;
            px(3, hy, 5, 4, p.main);
            px(3, hy - 2, 2, 2, p.ear);
            px(6, hy - 2, 2, 2, p.ear);
            px(6, hy + 1, 1, 1, '#0f172a');
            px(8, hy + 1, 2, 2, p.main);
            px(9, hy + 1, 1, 1, p.nose);
            return;
        }

        // 4. POSE C: TROTTING ALONG SNOW LEDGE
        const bob = Math.abs(Math.sin(this.phase)) > 0.65 ? -1 : 0;
        const stride = Math.round(Math.sin(this.phase) * 2);

        // Kar üzerindeki temas gölgesi
        pRect(bx - 6, by - 1, 13, 2, 'rgba(15, 23, 42, 0.30)');

        // Arkada salınan hacimli kuyruk
        for (let t = 0; t < 9; t++) {
            const tx = -5 - t;
            const ty = -6 + Math.round(Math.sin(this.phase * 0.65 - t * 0.32) * 0.8) + (t > 5 ? 1 : 0);
            const th = (t === 0 || t === 8) ? 3 : 4;
            px(tx, ty, 2, th, t >= 6 ? p.tailTip : p.main);
            if (t < 6) px(tx, ty + th - 1, 2, 1, p.shade);
        }

        // Arka plandaki çift bacaklar (zemine tam temas)
        px(-4 - Math.round(stride * 0.5), -3, 2, 3, p.shade);
        px(2 + Math.round(stride * 0.5), -3, 2, 3, p.shade);

        // Gövde, sırt kavisi ve kabarık beyaz göğüs yelesi
        px(-5, -6 + bob, 10, 4, p.main);
        px(-4, -7 + bob, 6, 1, p.main);
        px(-4, -3 + bob, 9, 1, p.shade);
        px(2, -6 + bob, 4, 4, '#ffffff');

        // Ön plandaki çift bacaklar ve koyu patiler
        const backLegX = -3 + Math.round(stride * 0.5);
        const frontLegX = 3 - Math.round(stride * 0.5);
        px(backLegX, -3, 2, 3, p.main);
        px(backLegX, -1, 2, 1, '#334155');
        px(frontLegX, -3, 2, 3, p.main);
        px(frontLegX, -1, 2, 1, '#334155');

        // Baş, iç/dış kulak detayı, burun ve göz
        const hy = -9 + bob;
        px(3, hy, 5, 4, p.main);
        px(4, hy - 1, 3, 1, p.main);
        px(3, hy - 2, 2, 2, p.ear);
        px(6, hy - 3, 2, 2, p.ear);
        px(6, hy - 2, 1, 1, '#ffffff');
        px(6, hy + 1, 1, 1, '#0f172a');
        px(8, hy + 1, 2, 2, p.main);
        px(8, hy + 2, 2, 1, '#ffffff');
        px(10, hy + 1, 1, 1, p.nose);
    }
}
// ============================================================================
// ============================================================================

// ============================================================================
// BÖLÜM SONU: KUTUP TİLKİSİ VE KAR BAYKUŞU SINIFI VE DAVRANIŞLARI
// ============================================================================
