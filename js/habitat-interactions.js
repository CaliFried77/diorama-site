import { stimuli, canvas, PIXEL_SCALE, HABITATS, currentHabitatIdx, pw, ph, frameScale, pRect } from './07-habitat-state.js';
import { getArcticLandingY } from './arctic-geometry.js';
import { getGroundY } from './habitat-geometry.js';

/* HABITAT INTERACTIONS — user input that spawns food and stimuli in the active habitat. */

// ============================================================================
// BÖLÜM BAŞI: SAHNEYE TIKLAYARAK YEM VE UYARAN BIRAKMA
// Her habitatın interactionProfile değeri doğru uyaran türünü belirler.
// ============================================================================

canvas.addEventListener('pointerdown', (e) => {
    const px = e.clientX / PIXEL_SCALE;
    const py = e.clientY / PIXEL_SCALE;
    const interactionProfile = HABITATS[currentHabitatIdx].interactionProfile;

    if (interactionProfile === 'nectar') {
        for (let i = 0; i < 3; i++) {
            const offset = (i - 1) * (8 + Math.random() * 4);
            const bx = Math.max(14, Math.min(pw - 14, px + offset));
            const groundY = getGroundY(bx, 'meadow', pw, ph);
            const naturalTopY = groundY - (14 + i * 6 + Math.floor(Math.random() * 5));
            const targetY = py >= groundY - 40
                ? Math.max(groundY - 38, Math.min(groundY - 10, py + (i - 1) * 3))
                : naturalTopY;
            const startsInAir = py < targetY - 4;
            stimuli.push({
                type: 'honey_nectar',
                x: bx,
                y: startsInAir ? py : targetY,
                baseY: startsInAir ? py : targetY,
                targetY,
                vy: 0.45,
                landed: !startsInAir,
                variant: i % 3,
                phase: Math.random() * Math.PI * 2,
                ripple: 0,
                life: 260,
                claimedBy: null
            });
        }
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
        // Spawn a trio of detailed pixel-art tropical fruits: Mango, Pink Guava & Golden Banana Cluster
        const kinds = ['mango', 'guava', 'banana'];
        for (let i = 0; i < 3; i++) {
            const offset = (i - 1) * 11;
            const fruitX = px + offset + (Math.random() - 0.5) * 3;
            const fruitY = py + (Math.random() - 0.5) * 6;
            stimuli.push({
                type: 'tropical_fruit',
                kind: kinds[i],
                x: fruitX,
                y: fruitY,
                baseY: fruitY,
                phase: Math.random() * Math.PI * 2,
                life: 300,
                claimedBy: null
            });
        }
    } else if (interactionProfile === 'cloudberry') {
        // Spawn Golden Arctic Cloudberries that fall and land onto the nearest snow platform below!
        for (let i = 0; i < 2; i++) {
            const bx = Math.max(12, Math.min(pw - 12, px + (i - 0.5) * 14));
            const nx = bx / Math.max(1, pw);
            const landY = getArcticLandingY(bx, py, pw, ph);
            stimuli.push({
                type: 'cloudberry',
                x: bx,
                y: Math.min(py, landY - 12),
                targetY: landY - 2,
                vy: 0.4,
                landed: false,
                phase: Math.random() * Math.PI * 2,
                life: 360,
                claimedBy: null
            });
        }
    }
});

// ============================================================================
// BÖLÜM SONU: SAHNEYE TIKLAYARAK YEM VE UYARAN BIRAKMA
// ============================================================================

// ============================================================================
// BÖLÜM BAŞI: YEM VE UYARANLARIN ANİMASYONU, ÇİZİMİ VE ÖMRÜ
// Bu fonksiyon her sahne karesinde çağrılır; süresi biten uyaranları da temizler.
// ============================================================================

export function drawHabitatStimuli() {
    for (let i = stimuli.length - 1; i >= 0; i--) {
        const s = stimuli[i];
        s.life -= frameScale;

        if (s.type === 'tropical_fruit') {
            s.phase += 0.08 * frameScale;
            const fx = Math.round(s.x + Math.sin(s.phase * 0.7) * 0.8);
            const fy = Math.round(s.baseY + Math.sin(s.phase) * 1.6);
            s.y = fy;

            const sparkX = fx + Math.round(Math.cos(s.phase * 1.4) * 6);
            const sparkY = fy + Math.round(Math.sin(s.phase * 1.4) * 4);
            pRect(sparkX, sparkY, 1, 1, 'rgba(254, 240, 138, 0.75)');

            if (s.kind === 'mango' || (!s.kind && i % 3 === 0)) {
                pRect(fx - 3, fy - 1, 7, 5, '#f97316');
                pRect(fx - 2, fy - 2, 5, 2, '#ef4444');
                pRect(fx - 2, fy + 2, 6, 2, '#facc15');
                pRect(fx + 2, fy + 1, 3, 2, '#fde047');
                pRect(fx - 2, fy - 1, 2, 1, 'rgba(255, 255, 255, 0.75)');
                pRect(fx - 1, fy - 4, 1, 2, '#78350f');
                pRect(fx - 4, fy - 4, 3, 2, '#16a34a');
                pRect(fx, fy - 4, 3, 2, '#22c55e');
                pRect(fx + 1, fy - 5, 2, 1, '#86efac');
            } else if (s.kind === 'guava' || (!s.kind && i % 3 === 1)) {
                pRect(fx - 4, fy + 1, 9, 2, '#16a34a');
                pRect(fx - 3, fy + 2, 7, 1, '#15803d');
                pRect(fx - 3, fy - 2, 7, 3, '#f43f5e');
                pRect(fx - 2, fy - 3, 5, 2, '#fb7185');
                pRect(fx - 2, fy - 1, 1, 1, '#fef08a');
                pRect(fx, fy - 2, 1, 1, '#1e293b');
                pRect(fx + 2, fy - 1, 1, 1, '#fef08a');
                pRect(fx - 1, fy, 1, 1, '#1e293b');
                pRect(fx - 2, fy - 3, 2, 1, '#ffe4e6');
            } else {
                pRect(fx - 3, fy - 3, 3, 2, '#65a30d');
                pRect(fx - 4, fy - 1, 3, 5, '#eab308');
                pRect(fx - 1, fy - 1, 3, 6, '#facc15');
                pRect(fx + 2, fy - 1, 3, 5, '#fde047');
                pRect(fx, fy, 1, 3, '#fef9c3');
                pRect(fx - 3, fy + 4, 2, 1, '#78350f');
                pRect(fx, fy + 5, 2, 1, '#78350f');
                pRect(fx + 3, fy + 4, 2, 1, '#78350f');
            }

        } else if (s.type === 'cloudberry') {
            if (!s.landed) {
                s.vy = Math.min(2.2, s.vy + 0.08 * frameScale);
                s.y += s.vy * frameScale;
                if (s.y >= s.targetY) {
                    s.y = s.targetY;
                    s.landed = true;
                }
            }
            s.phase += 0.09 * frameScale;
            const bx = Math.round(s.x);
            const by = Math.round(s.y);
            pRect(bx - 2, by, 5, 1, '#15803d');
            pRect(bx - 2, by - 3, 5, 3, '#f97316');
            pRect(bx - 1, by - 4, 3, 3, '#facc15');
            pRect(bx, by - 4, 1, 1, '#fef9c3');

        } else if (s.type === 'honey_nectar') {
            const groundY = getGroundY(s.x, 'meadow', pw, ph);
            const restY = s.targetY !== undefined
                ? Math.min(s.targetY, groundY - 10)
                : Math.min(s.baseY, groundY - 12);

            if (s.landed === false) {
                s.vy = Math.min(1.8, (s.vy || 0.45) + 0.06 * frameScale);
                s.baseY += s.vy * frameScale;
                if (s.baseY >= restY) {
                    s.baseY = restY;
                    s.landed = true;
                }
                s.y = s.baseY;
                const dx = Math.round(s.x);
                const dy = Math.round(s.y);
                pRect(dx, dy - 3, 1, 1, 'rgba(254, 240, 138, 0.85)');
                pRect(dx - 1, dy - 1, 3, 3, '#f59e0b');
                pRect(dx, dy - 2, 1, 4, '#fbbf24');
                pRect(dx, dy - 1, 1, 2, '#fef9c3');
                pRect(dx - 1, groundY - 2, 3, 2, '#15803d');
            } else {
                s.phase += 0.10 * frameScale;
                const sway = Math.sin(s.phase * 0.7) * 1.4;
                const cupX = Math.round(s.x + sway);
                const cupY = Math.round(restY + Math.sin(s.phase) * 0.5);
                s.y = cupY;

                pRect(s.x - 2, groundY, 5, 2, 'rgba(2, 10, 14, 0.35)');
                pRect(s.x - 2, groundY - 1, 5, 2, '#14532d');
                pRect(s.x - 3, groundY - 2, 2, 1, '#16a34a');
                pRect(s.x + 2, groundY - 2, 2, 1, '#16a34a');

                const stemH = Math.max(4, groundY - cupY);
                for (let sy = 1; sy < stemH; sy++) {
                    const prog = sy / stemH;
                    const sx = Math.round(s.x + sway * Math.pow(prog, 1.2));
                    const py = groundY - sy;
                    pRect(sx, py, 1, 1, '#15803d');
                    if (sy === Math.floor(stemH * 0.45) || sy === Math.floor(stemH * 0.72)) {
                        const lDir = sy % 2 === 0 ? -1 : 1;
                        pRect(sx + lDir, py, 2 * lDir, 1, '#22c55e');
                    }
                }

                const petalOuter = s.variant === 1 ? '#fb7185' : '#f59e0b';
                const petalInner = s.variant === 1 ? '#fda4af' : '#fbbf24';
                pRect(cupX - 1, cupY + 2, 3, 1, '#15803d');
                pRect(cupX - 2, cupY + 1, 5, 1, '#22c55e');
                pRect(cupX - 3, cupY, 7, 1, petalOuter);
                pRect(cupX - 2, cupY - 1, 5, 2, petalInner);
                pRect(cupX - 1, cupY - 2, 3, 2, '#fde047');
                pRect(cupX, cupY - 2, 1, 1, '#ffffff');

                for (let m = 0; m < 3; m++) {
                    const a = s.phase * 0.9 + (m * Math.PI * 2) / 3;
                    const mx = cupX + Math.round(Math.cos(a) * 4);
                    const my = cupY - 2 + Math.round(Math.sin(a) * 2.5);
                    pRect(mx, my, 1, 1, 'rgba(254, 240, 138, 0.82)');
                }
            }
        } else if (s.type === 'floating_blossom') {
            s.phase += 0.08 * frameScale;
            s.x += (s.vx + Math.sin(s.phase) * 0.12) * frameScale;
            s.y += (s.vy + Math.cos(s.phase * 0.7) * 0.08) * frameScale;
            for (let p = 0; p < 5; p++) {
                const ang = s.phase * 0.3 + (p * Math.PI * 2) / 5;
                pRect(s.x + Math.cos(ang) * 2.6, s.y + Math.sin(ang) * 2.2, 2, 2, s.color);
            }
            pRect(s.x, s.y, 2, 2, s.core);
            pRect(s.x + Math.sin(s.phase * 2) * 4, s.y + 3, 1, 1, 'rgba(240, 171, 252, 0.65)');

        } else if (s.type === 'bloodworm') {
            s.phase += 0.22 * frameScale;
            s.y += s.vy * 0.45 * frameScale;
            for (let seg = 0; seg < 6; seg++) {
                const wx = s.x + Math.sin(s.phase + seg * 0.7) * 1.8;
                const wy = s.y + seg * 0.9;
                pRect(wx, wy, 1, 1, seg % 2 === 0 ? '#e11d48' : '#9f1239');
            }
            if (s.y > ph - 8) s.life = 0;

        } else if (s.type === 'midge') {
            s.phase += 0.25 * frameScale;
            s.x = s.baseX + Math.sin(s.phase) * 4;
            s.y = s.baseY + Math.cos(s.phase * 1.3) * 2.5;
            pRect(s.x, s.y, 1, 1, '#fde047');
            pRect(s.x - 1, s.y - 1, 3, 1, 'rgba(255, 255, 255, 0.65)');

        } else if (s.type === 'plankton_swarm') {
            s.phase += 0.07 * frameScale;
            for (let k = 0; k < 8; k++) {
                const r = 2.5 + (k % 3) * 2.5;
                const px = s.x + Math.cos(s.phase + k) * r;
                const py = s.y + Math.sin(s.phase * 1.2 + k) * r;
                pRect(px, py, 1, 1, k % 2 === 0 ? '#f0abfc' : '#67e8f9');
            }

        } else if (s.type === 'koi_pellet') {
            s.ripple += 0.18 * frameScale;
            if (s.ripple < 14) {
                for (let a = 0; a < Math.PI * 2; a += 0.5) {
                    pRect(s.x + Math.cos(a) * s.ripple, s.y + Math.sin(a) * s.ripple, 1, 1, 'rgba(255,255,255,0.26)');
                }
            }
            pRect(s.x - 1, s.y - 1, 2, 2, '#f59e0b');
            pRect(s.x, s.y, 1, 1, '#fef08a');
        }

        if (s.life <= 0) stimuli.splice(i, 1);
    }
}

// ============================================================================
// BÖLÜM SONU: YEM VE UYARANLARIN ANİMASYONU, ÇİZİMİ VE ÖMRÜ
// ============================================================================
