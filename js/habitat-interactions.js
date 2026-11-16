import { stimuli, canvas, PIXEL_SCALE, HABITATS, currentHabitatIdx, pw, ph, frameScale, pRect } from './07-habitat-state.js';
import { getArcticLandingY } from './arctic-geometry.js';
import { getGroundY, getKoiWaterSurfaceY } from './habitat-geometry.js';

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
        // Food is dropped into the pond, never onto the sky/shore above the waterline.
        const pelletX = Math.max(22, Math.min(pw - 22, px));
        const waterTop = getKoiWaterSurfaceY(pelletX, pw, ph) + 28;
        const waterBottom = getGroundY(pelletX, 'koi-pond', pw, ph) - 12;
        const safePelletY = Math.max(waterTop, Math.min(waterBottom, py));
        for (let i = 0; i < 3; i++) {
            stimuli.push({
                type: 'koi_pellet',
                x: pelletX + (Math.random() - 0.5) * 10,
                y: safePelletY + (Math.random() - 0.5) * 6,
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
            s.phase += 0.12 * frameScale;
            s.y = s.baseY + Math.sin(s.phase) * 1.6;
            for (let m = 0; m < 4; m++) {
                const a = s.phase * 0.8 + (m * Math.PI) / 2;
                pRect(s.x + Math.cos(a) * 4.5, s.y + Math.sin(a) * 3.5, 1, 1, 'rgba(254, 240, 138, 0.78)');
            }
            pRect(s.x - 1, s.y - 1, 3, 3, '#f59e0b');
            pRect(s.x, s.y - 2, 1, 5, '#fbbf24');
            pRect(s.x - 2, s.y, 5, 1, '#fbbf24');
            pRect(s.x, s.y, 1, 1, '#fef9c3');

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
