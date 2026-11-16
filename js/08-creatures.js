import { stimuli, canvas, PIXEL_SCALE, HABITATS, currentHabitatIdx, pw, ph, frameScale, frameChance, flora, pRect, frameSmoothing } from './07-habitat-state.js';

/* CREATURES — Living Pixel Diorama
   Native ES module. Cross-file dependencies are declared with imports and exports. */
/* Helper: Pick nearest unclaimed food/stimulus so creatures NEVER crowd the same spot */
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

        // Spawn natural, non-intrusive species-specific stimuli on click
        canvas.addEventListener('pointerdown', (e) => {
            const px = e.clientX / PIXEL_SCALE;
            const py = e.clientY / PIXEL_SCALE;
            const interactionProfile = HABITATS[currentHabitatIdx].interactionProfile;

            if (interactionProfile === 'nectar') {
                // Floating Golden Honey Nectar Droplets & Shimmering Pollen Motes (NO ugly floor stem!)
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
                // Drifting Moon-Blossom Petals & Luminescent Nectar Mist (Floats on the breeze, no stalk!)
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
                // Wriggling Crimson Bloodworms (Kan Kurtçuğu)
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
                // Hovering Pond Midges (Su Sineği)
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
                // Swirling Bioluminescent Plankton Micro-Clusters
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
                // Floating Pond Pellets with Water Ripples
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
                // Small ripe tropical fruit drops for the parrots to investigate
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
           CREATURE 1: ARTISAN HONEYBEE & ROYAL BUMBLEBEE (Büyütülmüş & Detaylı Arılar)
           3-part sculpted insect anatomy (head + compound eye + antennae, fuzzy golden
           thorax, banded plump abdomen), hind-leg pollen baskets, dual translucent wings
           & natural sunflower/blossom landing!
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
                        this.y = (ph - this.perchedFlower.h) - 5;
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

                // 1. Seek user-dropped honey nectar first
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
                    // 2. Occasionally visit a tall Sunflower or Meadow Blossom briefly
                    if (this.eatCooldown === 0 && frameChance(0.008)) {
                        const sunflowers = flora.filter(f => f.type === 'sunflower');
                        if (sunflowers.length > 0) {
                            const sf = sunflowers[Math.floor(Math.random() * sunflowers.length)];
                            const dx = sf.x - this.x;
                            const dy = (ph - sf.h - 5) - this.y;
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
                // Slight natural body tilt while flying
                const tilt = this.sipTimer > 0 ? 0 : 1;

                // Subtle golden pollen sparkle trail behind the bee
                for (let i = 0; i < this.trail.length; i++) {
                    const tr = this.trail[i];
                    pRect(tr.x - dir * 6, tr.y, 1, 1, `rgba(253, 224, 71, ${(tr.life / 18).toFixed(2)})`);
                }

                // 1. Back Wing (translucent ice-blue shimmer)
                const flap = this.sipTimer > 0 ? 0 : Math.round(Math.sin(this.phase * 2.1) * 3);
                const wingH = 4 + Math.abs(flap);
                pRect(bx - dir * 3, by - 2 - wingH, 4, wingH, 'rgba(186, 230, 253, 0.48)');

                // 2. Plump Banded Abdomen (Rear section: -7 to -2 along dir)
                const abLen = this.isBumble ? 7 : 6;
                for (let s = -abLen; s <= -2; s++) {
                    const yOff = by + (s < -4 ? tilt : 0);
                    const halfH = (s === -abLen || s === -2) ? 2 : (this.isBumble ? 3 : 2);
                    for (let dy = -halfH; dy <= halfH; dy++) {
                        let col = '#18181b'; // Velvet obsidian band
                        const band = Math.abs(s);
                        if (band === 3 || band === 4 || (this.isBumble && band === 6)) {
                            col = dy < 0 ? '#fde047' : '#f59e0b'; // Sunlit golden stripe
                        } else if (dy === -halfH) {
                            col = '#3f3f46'; // Upper rim sheen
                        }
                        pRect(bx + s * dir, yOff + dy, 1, 1, col);
                    }
                }
                // Tiny stinger tip
                pRect(bx - (abLen + 1) * dir, by + tilt, 1, 1, '#09090b');

                // 3. Fuzzy Amber Thorax (Center section: -1 to +2 along dir)
                for (let s = -1; s <= 2; s++) {
                    for (let dy = -3; dy <= 2; dy++) {
                        if ((s === -1 || s === 2) && Math.abs(dy) === 3) continue;
                        const col = dy <= -1 ? '#fbbf24' : (dy === 0 ? '#d97706' : '#78350f');
                        pRect(bx + s * dir, by + dy, 1, 1, col);
                    }
                }

                // 4. Sculpted Head, Glossy Compound Eye & Bent Antennae (+3 to +5 along dir)
                for (let s = 3; s <= 4; s++) {
                    for (let dy = -2; dy <= 1; dy++) {
                        pRect(bx + s * dir, by + dy, 1, 1, '#18181b');
                    }
                }
                // Glossy compound eye with white highlight pixel
                pRect(bx + 4 * dir, by - 1, 1, 2, '#0ea5e9');
                pRect(bx + 4 * dir, by - 1, 1, 1, '#e0f2fe');
                // Bent feeler antennae
                pRect(bx + 5 * dir, by - 2, 1, 1, '#27272a');
                pRect(bx + 6 * dir, by - 3, 1, 1, '#fbbf24');

                // 5. Little Hanging Legs & Golden Pollen Basket (Corbicula) on Hind Leg
                pRect(bx + 1 * dir, by + 3, 1, 2, '#18181b');
                pRect(bx - 2 * dir, by + 3, 1, 2, '#18181b');
                pRect(bx - 3 * dir, by + 3, 2, 2, '#fde047'); // Plump golden pollen basket
                pRect(bx - 2 * dir, by + 4, 1, 1, '#f59e0b');

                // 6. Forewing (Crisp veined translucent foreground wing)
                const fwY = by - 3 - Math.abs(flap);
                pRect(bx - dir * 1, fwY, 5, 3, 'rgba(240, 249, 255, 0.82)');
                pRect(bx, fwY - 1, 3, 1, 'rgba(255, 255, 255, 0.92)');
            }
        }

        /* ============================================================================
           CREATURE 6: MAJESTIC ARTICULATED NISHIKIGOI (Japon Zen Koi Balığı)
           REDESIGNED: Larger 18-segment sinuous spine, cute pixel whiskers (barbels),
           sweeping translucent pectoral fan fins, dorsal ridge fin, flowing forked tail
           veil, and authentic Kohaku, Showa & Yamabuki Ogon calico patterns!
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
                    // Kohaku (Pure Snow White with Vermilion Red Saddle Patches)
                    { base: '#f8fafc', shade: '#e2e8f0', patch1: '#ef4444', patch2: '#dc2626', fin: 'rgba(254, 226, 226, 0.85)', rgb: [248, 113, 113] },
                    // Showa Sanshoku (White, Crimson Red & Sumi Ink Black Markings)
                    { base: '#f1f5f9', shade: '#cbd5e1', patch1: '#e11d48', patch2: '#1e293b', fin: 'rgba(241, 245, 249, 0.85)', rgb: [251, 113, 133] },
                    // Yamabuki Ogon (Lustrous Metallic Gold & Amber Scales)
                    { base: '#fef08a', shade: '#facc15', patch1: '#f59e0b', patch2: '#d97706', fin: 'rgba(254, 249, 195, 0.85)', rgb: [250, 204, 21] }
                ];
                this.pal = varieties[Math.floor(Math.random() * varieties.length)];
                this.rgb = this.pal.rgb;
                this.seed = Math.floor(Math.random() * 100);

                // 18-node articulated spine for fluid S-curve swimming
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

                // 1. Soft Underwater Shadow beneath the Koi
                for (let i = 1; i < 14; i++) {
                    const pt = this.spine[i];
                    if (Math.abs(pt.x - this.x) > 45) continue;
                    pRect(pt.x + 2, pt.y + 4, 3, 3, 'rgba(2, 8, 18, 0.26)');
                }

                // 2. Broad Sweeping Pectoral Fan Fins (around spine node 3) & Ventral Fins (node 8)
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

                // 3. Flowing Bifurcated Tail Veil (nodes 13..17)
                for (let i = 13; i < this.spineLen; i++) {
                    const pt = this.spine[i];
                    if (Math.abs(pt.x - this.x) > 45) continue;
                    const spread = (i - 12) * 1.35;
                    for (let w = -Math.ceil(spread); w <= Math.ceil(spread); w++) {
                        if (i >= 16 && Math.abs(w) <= 1) continue; // Forked notch in tail tip
                        pRect(pt.x + perpX * w, pt.y + perpY * w, 1, 1, this.pal.fin);
                    }
                }

                // 4. Plump Sculpted Koi Body Segments (from tail to head so head overlaps cleanly)
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
                                // Calico / Kohaku saddle markings along the back
                                if ((i >= 1 && i <= 4 && dx >= -2) || (i >= 7 && i <= 10 && dy <= 1)) {
                                    col = this.pal.patch1;
                                } else if ((i + this.seed) % 6 === 0 && Math.abs(dx) <= 1) {
                                    col = this.pal.patch2;
                                }
                                pRect(pt.x + dx, pt.y + dy, 1, 1, col);
                            }
                        }
                    }

                    // Dorsal ridge fin along spine segments 4..10
                    if (i >= 4 && i <= 10) {
                        pRect(pt.x, pt.y - 1, 1, 1, '#ffffff');
                    }
                }

                // 5. Snout, Eyes & Cute Koi Whiskers (Barbels)
                const head = this.spine[0];
                const snoutX = head.x + cos * 3.2;
                const snoutY = head.y + sin * 3.2;
                pRect(snoutX, snoutY, 2, 2, this.pal.base);

                // Dark eyes on sides of head
                const eyeX = head.x + cos * 1.5;
                const eyeY = head.y + sin * 1.5;
                pRect(eyeX + perpX * 2.8, eyeY + perpY * 2.8, 1, 1, '#0f172a');
                pRect(eyeX - perpX * 2.8, eyeY - perpY * 2.8, 1, 1, '#0f172a');

                // Two delicate Koi whiskers (barbels)
                pRect(snoutX + cos * 1.2 + perpX * 2.2, snoutY + sin * 1.2 + perpY * 2.2, 1, 1, this.pal.patch1);
                pRect(snoutX + cos * 1.2 - perpX * 2.2, snoutY + sin * 1.2 - perpY * 2.2, 1, 1, this.pal.patch1);
            }
        }

        /* ============================================================================
           CREATURE 2: CONTINUOUS SILK-VEIL HALFMOON BETTA FISH
           FIXED: Screen-wrap delta shifts all spine history nodes simultaneously
           so the tail NEVER stretches across the screen when exiting left/right!
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

                // Seamless wrap-around: shift ALL spine nodes by the exact wrap distance!
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
                    // Guard against any anomalous spine jump
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
           FIXED: Starts immediately in graceful flight from frame 1 (never frozen!)
           ============================================================================ */
        export class PixelDragonfly {
            constructor() {
                this.x = Math.random() * pw;
                this.y = 25 + Math.random() * (ph - 70);
                // Immediately assign a distant flight target so it is flying right on load!
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
           FIXED: Authentic dorsal 4-wing silhouette (2 broad upper Forewings + 2
           scalloped lower Hindwings with waist notch, ocelli eyespots, swallowtail
           spurs & clubbed antennae) so it NEVER looks like a bird!
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
                    // Blue Morpho (Sapphire, Electric Cyan, Velvet Black Rim & White Pearls)
                    { base: '#0369a1', mid: '#0ea5e9', hi: '#7dd3fc', border: '#090d16', pearl: '#f8fafc', eye: '#38bdf8', rgb: [56, 189, 248] },
                    // Monarch / Tiger Swallowtail (Amber Gold, Flame Orange & Obsidian Veins)
                    { base: '#c2410c', mid: '#f97316', hi: '#fde047', border: '#18181b', pearl: '#fef9c3', eye: '#fb7185', rgb: [251, 146, 60] },
                    // Twilight Orchid Swallowtail (Deep Violet, Magenta & Starlight Dots)
                    { base: '#6b21a8', mid: '#d946ef', hi: '#f5d0fe', border: '#130d26', pearl: '#ffffff', eye: '#fde047', rgb: [217, 70, 239] },
                    // Emerald Luna Moth (Jade Green, Moonbeam Mint & Golden Eyespots)
                    { base: '#0f766e', mid: '#34d399', hi: '#a7f3d0', border: '#064e3b', pearl: '#ecfdf5', eye: '#facc15', rgb: [52, 211, 153] }
                ];
                this.pal = species[Math.floor(Math.random() * species.length)];
                this.rgb = this.pal.rgb;
            }

            update(t) {
                this.phase += (this.sipTimer > 0 ? 0.05 : 0.14) * frameScale;
                if (this.eatCooldown > 0) this.eatCooldown = Math.max(0, this.eatCooldown - frameScale);

                // Quick 0.33s sip on floating blossom, then glide away
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
                // Orient butterfly along its heading vector (cos, sin) with symmetrical left/right 4-lobed wings
                const cos = Math.cos(this.angle);
                const sin = Math.sin(this.angle);
                const perpX = -sin;
                const perpY = cos;

                // Symmetrical wing opening/closing scale (0.28 folded to 1.00 fully spread)
                const flap = 0.28 + 0.72 * Math.abs(Math.sin(this.phase));

                // Scan local butterfly coordinates:
                // u = distance out from body (1..12), v = position along body (-9 rear to +8 front)
                for (let u = 1; u <= 12; u++) {
                    const w = u * flap;
                    for (let v = -9; v <= 8; v++) {
                        let inForewing = false;
                        let inHindwing = false;

                        // Upper Forewing lobe: sweeps forward and outward with a distinct outer apex
                        const fwFrontEdge = 2.5 + u * 0.48 - (u * u) * 0.022;
                        const fwBackEdge = -1.2 + u * 0.12; // Creates the waist notch at v ~ 0
                        if (v >= fwBackEdge && v <= fwFrontEdge && u <= 12) {
                            const maxU = 11.5 - Math.abs(v - 3.5) * 0.65;
                            if (u <= maxU) inForewing = true;
                        }

                        // Lower Hindwing lobe: rounded teardrops behind the waist notch
                        const hwFrontEdge = -0.5 - u * 0.08;
                        const hwBackEdge = -7.8 + (u - 4.5) * (u - 4.5) * 0.18;
                        if (v <= hwFrontEdge && v >= hwBackEdge && u <= 9) {
                            inHindwing = true;
                        }

                        // Delicate Swallowtail Spur at rear of Hindwing
                        const isSwallowTail = (u >= 4 && u <= 5 && v >= -9 && v <= -7);

                        if (!inForewing && !inHindwing && !isSwallowTail) continue;

                        // Determine ornate butterfly coloration
                        let col = this.pal.mid;
                        const isOuterMargin = (inForewing && (u >= 10 || v >= fwFrontEdge - 1.1 || v <= fwBackEdge + 0.8)) ||
                                              (inHindwing && (u >= 8 || v <= hwBackEdge + 1.1));

                        if (isSwallowTail) {
                            col = v === -9 ? this.pal.pearl : this.pal.border;
                        } else if (isOuterMargin) {
                            col = this.pal.border;
                            // Marginal white/gold pearl spots along wing rim
                            if (u >= 9 && (v + 10) % 2 === 0 && flap > 0.55) col = this.pal.pearl;
                        } else if (inHindwing && Math.hypot(u - 4.8, v + 4.2) <= 1.5) {
                            // Hindwing Ocelli (Eyespot)
                            col = Math.hypot(u - 4.8, v + 4.2) < 0.8 ? this.pal.eye : this.pal.border;
                        } else if (inForewing && u >= 4 && u <= 8 && v >= 1 && v <= 5) {
                            // Iridescent sunlit wing cell + dark vein line
                            col = (v === 3 || u === 6) ? this.pal.border : this.pal.hi;
                        } else if (u <= 3) {
                            col = this.pal.base;
                        }

                        // Plot Left and Right wings symmetrically
                        const fx = this.x + cos * v;
                        const fy = this.y + sin * v;
                        pRect(fx + perpX * w, fy + perpY * w, 1, 1, col);
                        pRect(fx - perpX * w, fy - perpY * w, 1, 1, col);
                    }
                }

                // Slender segmented insect head, thorax & abdomen in center
                for (let b = -6; b <= 5; b++) {
                    pRect(this.x + cos * b, this.y + sin * b, 1, 1, b === 5 ? '#f8fafc' : '#0f172a');
                }

                // Two curved clubbed antennae extending from the head
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
           CREATURE 7: MACAW & TROPICAL PARROT FLOCK
           Individually layered pixel plumage, curved hooked beaks, expressive face masks,
           articulated wings and long tapered tail feathers.
           ============================================================================ */
        const PARROT_PALETTES = Object.freeze([
            { body: '#e24b3b', belly: '#facc15', head: '#d93636', crest: '#f59e0b', wing: '#174f91', wingAlt: '#0f9f85', wingTip: '#38bdf8', tail: '#dc3636', tailAlt: '#f59e0b', face: '#fff1d6', beak: '#f5b544', beakShade: '#3b302b', eye: '#17212b' },
            { body: '#087fba', belly: '#f4c84b', head: '#f4c84b', crest: '#e85d3f', wing: '#1559a4', wingAlt: '#0f8c78', wingTip: '#74d6ed', tail: '#087fba', tailAlt: '#f2a23a', face: '#fff0d2', beak: '#253341', beakShade: '#111b25', eye: '#111827' },
            { body: '#15966b', belly: '#eacb4c', head: '#ef684c', crest: '#f7c94a', wing: '#126c58', wingAlt: '#285da8', wingTip: '#55c5d6', tail: '#e75b43', tailAlt: '#e8c84d', face: '#f7e9d0', beak: '#2c3540', beakShade: '#111827', eye: '#111827' },
            { body: '#8a55b4', belly: '#f2b84b', head: '#e95b69', crest: '#f6d26b', wing: '#315d9c', wingAlt: '#187e70', wingTip: '#63c8d8', tail: '#7a4eaa', tailAlt: '#ea9447', face: '#fff0d8', beak: '#dcaa45', beakShade: '#45332b', eye: '#171923' },
        ]);

        export class PixelParrot {
            constructor() {
                this.x = Math.random() * pw;
                this.y = 30 + Math.random() * Math.max(30, ph * 0.42);
                this.vx = (Math.random() < 0.5 ? -1 : 1) * (0.22 + Math.random() * 0.16);
                this.vy = (Math.random() - 0.5) * 0.1;
                this.phase = Math.random() * Math.PI * 2;
                this.eatCooldown = 0;
                this.palette = PARROT_PALETTES[Math.floor(Math.random() * PARROT_PALETTES.length)];
                this.size = Math.random() < 0.22 ? 1.2 : 1.05;
            }

            update(time) {
                this.phase += 0.105 * frameScale;
                if (this.eatCooldown > 0) this.eatCooldown = Math.max(0, this.eatCooldown - frameScale);

                const fruit = findAvailableStimulus(this, 'tropical_fruit', 185);
                if (fruit) {
                    const dx = fruit.x - this.x;
                    const dy = fruit.y - this.y;
                    const distance = Math.max(1, Math.hypot(dx, dy));
                    if (distance < 9) {
                        fruit.life = 0;
                        this.eatCooldown = 110;
                        this.vy = -0.2;
                    } else {
                        this.vx += (dx / distance) * 0.021 * frameScale;
                        this.vy += (dy / distance) * 0.021 * frameScale;
                    }
                } else {
                    // Broad, unhurried glides with gentle vertical corrections.
                    this.vy += Math.sin(time * 0.0011 + this.phase) * 0.0024 * frameScale;
                    this.vx += Math.sin(time * 0.00038 + this.phase * 0.55) * 0.0011 * frameScale;
                }

                this.vx = Math.max(-0.66, Math.min(0.66, this.vx));
                this.vy = Math.max(-0.38, Math.min(0.38, this.vy));
                this.x += this.vx * frameScale;
                this.y += this.vy * frameScale;

                const upperLimit = 24;
                const lowerLimit = Math.max(upperLimit + 24, ph * 0.62);
                if (this.y < upperLimit) { this.y = upperLimit; this.vy = Math.abs(this.vy) + 0.045; }
                if (this.y > lowerLimit) { this.y = lowerLimit; this.vy = -Math.abs(this.vy) - 0.045; }
                if (this.x < -25) this.x = pw + 25;
                if (this.x > pw + 25) this.x = -25;
            }

            draw() {
                const p = this.palette;
                const dir = this.vx >= 0 ? 1 : -1;
                const scale = this.size;
                const bx = Math.round(this.x);
                const by = Math.round(this.y + Math.sin(this.phase * 1.6) * 0.65);
                const flap = Math.round(Math.sin(this.phase * 2.9) * 2.2);
                const pixel = (x, y, w, h, color) => {
                    const px = bx + (dir > 0 ? x : -x - w) * scale;
                    pRect(px, by + y * scale, w * scale, h * scale, color);
                };

                // Five separated, tapered tail feathers fan away from the body.
                for (let feather = 0; feather < 5; feather++) {
                    const rootX = -6 - (feather % 2);
                    const rootY = 1 + feather * 0.7;
                    const length = 9 + (feather % 3) * 2;
                    for (let step = 0; step < length; step++) {
                        const t = step / Math.max(1, length - 1);
                        const x = rootX - t * (2 + feather * 0.68);
                        const y = rootY + t * (length * 0.82);
                        const color = feather % 2 === 0 ? p.tail : p.tailAlt;
                        pixel(Math.round(x), Math.round(y), 1, 1, color);
                        if (step > 3 && step % 4 === 0) pixel(Math.round(x - 1), Math.round(y), 1, 1, p.wingTip);
                    }
                }

                // Shoulder and wing silhouette, with a moving upper edge for each flap.
                const wingRows = [
                    [-7, 3], [-9, 8], [-10, 12], [-9, 14],
                    [-7, 14], [-5, 12], [-3, 9], [-1, 5]
                ];
                wingRows.forEach(([x, width], row) => {
                    const y = -8 + row + (row < 4 ? -flap * 0.55 : 0);
                    pixel(x - 1, y, width + 2, 1, '#102d3b');
                    pixel(x, y, width, 1, p.wing);
                    if (row >= 1 && row <= 5) {
                        pixel(x + 2, y, Math.max(2, width - 5), 1, p.wingAlt);
                        pixel(x + width - 3, y, 2, 1, p.wingTip);
                    }
                });
                // Individual flight feathers create the characteristic scalloped wing edge.
                for (let feather = 0; feather < 6; feather++) {
                    const fx = -8 + feather * 2;
                    const fy = -1 + Math.abs(2 - feather) * 0.45 - flap * 0.45;
                    pixel(fx, fy, 2, 3 + (feather % 2), feather % 2 ? p.wingAlt : p.wingTip);
                    pixel(fx + 1, fy + 2, 1, 2, p.wing);
                }

                // Rounded body with a dark pixel outline and softly graduated belly.
                const bodyRows = [
                    [-4, -4, 8], [-3, -6, 12], [-2, -7, 14],
                    [-1, -8, 16], [0, -8, 16], [1, -7, 15],
                    [2, -6, 13], [3, -4, 10], [4, -2, 6]
                ];
                bodyRows.forEach(([y, x, width]) => pixel(x, y, width, 1, '#142d32'));
                const innerRows = [
                    [-3, -5, 10], [-2, -6, 12], [-1, -7, 14],
                    [0, -7, 14], [1, -6, 13], [2, -5, 11], [3, -3, 7]
                ];
                innerRows.forEach(([y, x, width], row) => {
                    pixel(x, y, width, 1, row < 2 ? p.body : p.body);
                });

                // Warm breast feathers and a few tiny feather highlights.
                pixel(0, -1, 5, 1, p.belly);
                pixel(1, 0, 6, 1, p.belly);
                pixel(1, 1, 5, 1, p.belly);
                pixel(0, 2, 4, 1, p.belly);
                pixel(-4, -2, 2, 1, p.wingAlt);
                pixel(-3, -3, 2, 1, p.wingTip);

                // Neck joins the body to a rounded head; the crown has layered crest feathers.
                pixel(3, -7, 5, 5, p.body);
                const headRows = [
                    [-13, 6, 3], [-12, 4, 7], [-11, 3, 10],
                    [-10, 2, 12], [-9, 2, 13], [-8, 3, 13],
                    [-7, 4, 12], [-6, 5, 10], [-5, 6, 8]
                ];
                headRows.forEach(([y, x, width], row) => {
                    pixel(x, y, width, 1, row < 3 ? p.crest : p.head);
                });
                pixel(4, -14, 2, 2, p.crest);
                pixel(7, -14, 2, 2, p.head);
                pixel(9, -13, 2, 1, p.crest);

                // Pale macaw cheek patch with three dark feather lines.
                pixel(8, -9, 5, 4, p.face);
                pixel(9, -8, 3, 1, '#fffaf0');
                pixel(9, -7, 1, 1, p.head);
                pixel(11, -7, 1, 1, p.head);
                pixel(8, -6, 5, 1, p.face);

                // Expressive eye and a strong hooked beak instead of a square colored head.
                pixel(10, -10, 3, 1, p.face);
                pixel(11, -9, 2, 2, p.eye);
                pixel(11, -9, 1, 1, '#ffffff');
                pixel(13, -8, 3, 2, p.beak);
                pixel(14, -6, 3, 2, p.beak);
                pixel(15, -4, 2, 1, p.beakShade);
                pixel(13, -7, 2, 1, '#fff0b5');

                // Feet and hooked claws are visible below the breast.
                pixel(-1, 4, 1, 2, '#49352c');
                pixel(3, 4, 1, 2, '#49352c');
                pixel(-2, 6, 2, 1, '#b88a48');
                pixel(2, 6, 2, 1, '#b88a48');
            }
        }
