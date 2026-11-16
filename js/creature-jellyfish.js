import { pw, ph, frameScale, frameChance, pRect, frameSmoothing } from './07-habitat-state.js';
import { findAvailableStimulus } from './creature-utils.js';

/* PIXELJELLYFISH — dedicated deni̇zanasi behavior and pixel-art rendering. */

// ============================================================================
// BÖLÜM BAŞI: DENİZANASI SINIFI VE DAVRANIŞLARI
// Bu dosya yalnızca ilgili canlının hareket, etkileşim ve çizim kodunu içerir.
// ============================================================================

/* ============================================================================
   CREATURE 5: ARTISTIC 360° BIOLUMINESCENT JELLYFISH
   ============================================================================ */
// ============================================================================
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

// ============================================================================
// BÖLÜM SONU: DENİZANASI SINIFI VE DAVRANIŞLARI
// ============================================================================
