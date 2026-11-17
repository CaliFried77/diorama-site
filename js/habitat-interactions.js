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
    } else if (interactionProfile === 'blossom') {
        for (let i = 0; i < 2; i++) {
            const bx = Math.max(14, Math.min(pw - 14, px + (i - 0.5) * 12));
            const groundY = getGroundY(bx, 'botanical', pw, ph);
            const by = Math.max(12, Math.min(groundY - 2, py + (Math.random() - 0.5) * 8));
            stimuli.push({
                type: 'floating_blossom',
                x: bx,
                y: by,
                vx: (Math.random() - 0.5) * 0.08,
                vy: 0.14 + Math.random() * 0.06,
                landed: by >= groundY - 3,
                phase: Math.random() * Math.PI * 2,
                color: i === 0 ? '#f0abfc' : '#7dd3fc',
                petalShade: i === 0 ? '#c084fc' : '#38bdf8',
                core: '#fef08a',
                life: 280,
                claimedBy: null
            });
        }
    } else if (interactionProfile === 'bloodworm') {
        for (let i = 0; i < 3; i++) {
            const bx = Math.max(14, Math.min(pw - 14, px + (i - 1) * 7 + (Math.random() - 0.5) * 4));
            const by = Math.max(6, Math.min(ph - 16, py + (Math.random() - 0.5) * 6));
            stimuli.push({
                type: 'bloodworm',
                x: bx,
                y: by,
                vy: 0.14 + Math.random() * 0.05,
                landed: false,
                dir: Math.random() < 0.5 ? 1 : -1,
                phase: Math.random() * Math.PI * 2,
                life: 300,
                claimedBy: null
            });
        }
    } else if (interactionProfile === 'midge') {
        for (let i = 0; i < 3; i++) {
            const bx = Math.max(16, Math.min(pw - 16, px + (i - 1) * 8 + (Math.random() - 0.5) * 5));
            const by = Math.max(20, Math.min(ph - 22, py + (Math.random() - 0.5) * 10));
            const waterSurfaceY = Math.max(ph - 48, Math.min(ph - 10, by + 10));
            stimuli.push({
                type: 'midge',
                x: bx,
                y: by,
                baseX: bx,
                baseY: by,
                emergeY: waterSurfaceY,
                ripple: i === 1 ? 1 : 0,
                phase: Math.random() * Math.PI * 2,
                life: 250,
                claimedBy: null
            });
        }
    } else if (interactionProfile === 'plankton') {
        for (let i = 0; i < 2; i++) {
            const bx = Math.max(18, Math.min(pw - 18, px + (i - 0.5) * 14));
            const nx = bx / Math.max(1, pw);
            const sideMound = nx < 0.26 ? Math.pow((0.26 - nx) / 0.26, 1.5) * 34
                            : (nx > 0.74 ? Math.pow((nx - 0.74) / 0.26, 1.5) * 34 : 0);
            const maxDepthY = Math.round(getGroundY(bx, 'reef', pw, ph) - sideMound) - 10;
            const by = Math.max(14, Math.min(maxDepthY, py + (Math.random() - 0.5) * 10));
            stimuli.push({
                type: 'plankton_swarm',
                x: bx,
                y: by,
                phase: Math.random() * Math.PI * 2,
                life: 240,
                claimedBy: null
            });
        }
    } else if (interactionProfile === 'pellet') {
        for (let i = 0; i < 3; i++) {
            const rawX = Math.max(20, Math.min(pw - 24, px + (i - 1) * 6 + (Math.random() - 0.5) * 4));
            const nx = rawX / Math.max(1, pw);
            const maxWaterY = (nx <= 0.30 || nx >= 0.68)
                ? getGroundY(rawX, 'koi-pond', pw, ph) - 10
                : ph - 12;
            const rawY = Math.max(28, Math.min(maxWaterY, py + (Math.random() - 0.5) * 8));
            stimuli.push({
                type: 'koi_pellet',
                x: rawX,
                y: rawY,
                baseY: rawY,
                phase: Math.random() * Math.PI * 2,
                ripple: 1,
                life: 260,
                claimedBy: null
            });
        }
    } else if (interactionProfile === 'fruit') {
        // Spawn a trio of detailed pixel-art tropical fruits: Mango, Pink Guava & Golden Banana Cluster
        const kinds = ['mango', 'guava', 'banana'];
        for (let i = 0; i < 3; i++) {
            const offset = (i - 1) * 11;
            const fruitX = Math.max(14, Math.min(pw - 14, px + offset + (Math.random() - 0.5) * 3));
            const groundY = getGroundY(fruitX, 'rainforest', pw, ph);
            const rawY = Math.max(18, Math.min(groundY - 4, py + (Math.random() - 0.5) * 6));
            const isGroundFruit = rawY >= groundY - 22;
            stimuli.push({
                type: 'tropical_fruit',
                kind: kinds[i],
                x: fruitX,
                y: isGroundFruit ? groundY - 5 : rawY,
                baseY: isGroundFruit ? groundY - 5 : rawY,
                onGround: isGroundFruit,
                vineTopY: 4 + (i % 3) * 3,
                phase: Math.random() * Math.PI * 2,
                life: 300,
                claimedBy: null
            });
        }
    } else if (interactionProfile === 'cloudberry') {
        // Spawn Golden Arctic Cloudberries that fall and land onto the nearest snow platform below!
        for (let i = 0; i < 2; i++) {
            const bx = Math.max(12, Math.min(pw - 12, px + (i - 0.5) * 14));
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
            const groundY = getGroundY(s.x, 'rainforest', pw, ph);
            const onGround = Boolean(s.onGround) || s.baseY >= groundY - 18;
            const sway = onGround ? 0 : Math.sin(s.phase * 0.7) * 1.2;
            const fx = Math.round(s.x + sway);
            const fy = onGround
                ? groundY - 5
                : Math.round(s.baseY + Math.sin(s.phase) * 1.1);
            s.y = fy;

            if (onGround) {
                pRect(fx - 6, groundY - 1, 13, 2, 'rgba(2, 10, 10, 0.45)');
                pRect(fx - 6, groundY - 2, 13, 2, '#14532d');
                pRect(fx - 5, groundY - 3, 11, 1, '#16a34a');
            } else {
                const startY = s.vineTopY !== undefined ? s.vineTopY : 5;
                pRect(Math.round(s.x) - 1, startY - 1, 3, 2, '#321e17');
                const vineLen = Math.max(4, (fy - 4) - startY);
                for (let vy = 0; vy <= vineLen; vy += 2) {
                    const prog = vy / vineLen;
                    const vx = Math.round(s.x + sway * Math.pow(prog, 1.2));
                    const py = startY + vy;
                    pRect(vx, py, 1, 2, '#15803d');
                    if (vy > 6 && vy % 12 === 0 && vy < vineLen - 4) {
                        const lSide = (vy % 24 === 0) ? -1 : 1;
                        pRect(vx + lSide, py, 3 * lSide, 2, '#22c55e');
                    }
                }
            }

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

            if (s.landed) {
                pRect(bx - 4, by + 1, 9, 2, 'rgba(15, 23, 42, 0.32)');
                pRect(bx - 3, by + 1, 7, 1, '#bae6fd');
                pRect(bx, by - 1, 1, 2, '#451a03');
                pRect(bx - 4, by, 3, 1, '#14532d');
                pRect(bx + 2, by, 3, 1, '#14532d');
                pRect(bx - 3, by - 1, 7, 1, '#15803d');
            } else {
                pRect(bx - 2, by, 5, 1, '#15803d');
                pRect(bx, by - 6, 1, 1, 'rgba(254, 240, 138, 0.85)');
            }

            pRect(bx - 3, by - 3, 7, 2, '#d97706');
            pRect(bx - 2, by - 4, 5, 3, '#f59e0b');
            pRect(bx - 2, by - 3, 2, 2, '#fbbf24');
            pRect(bx + 1, by - 3, 2, 2, '#fbbf24');
            pRect(bx - 1, by - 5, 3, 2, '#fde047');
            pRect(bx - 1, by - 4, 1, 1, '#fef9c3');
            pRect(bx + 1, by - 4, 1, 1, '#fef9c3');

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
            const groundY = getGroundY(s.x, 'botanical', pw, ph);

            if (!s.landed) {
                s.x += (s.vx + Math.sin(s.phase) * 0.16) * frameScale;
                s.x = Math.max(10, Math.min(pw - 10, s.x));
                s.y += (Math.max(0.10, s.vy) + Math.cos(s.phase * 0.7) * 0.04) * frameScale;
                if (s.y >= groundY - 2) {
                    s.y = groundY - 2;
                    s.landed = true;
                }
            } else {
                s.y = groundY - 2;
            }

            const bx = Math.round(s.x);
            const by = Math.round(s.y);
            const shade = s.petalShade || '#c084fc';

            if (s.landed) {
                pRect(bx - 4, groundY, 9, 2, 'rgba(2, 8, 16, 0.38)');
                pRect(bx - 3, by + 1, 7, 1, '#15803d');
                pRect(bx - 4, by, 2, 1, '#22c55e');
                pRect(bx + 3, by, 2, 1, '#22c55e');
            } else {
                pRect(bx, by + 2, 1, 2, '#15803d');
                pRect(bx - 2, by + 2, 2, 1, '#22c55e');
            }

            for (let p = 0; p < 5; p++) {
                const ang = (s.landed ? 0.2 : s.phase * 0.35) + (p * Math.PI * 2) / 5;
                const px = Math.round(bx + Math.cos(ang) * 2.6);
                const py = Math.round(by + Math.sin(ang) * (s.landed ? 1.6 : 2.2));
                pRect(px, py, 2, 2, p % 2 === 0 ? s.color : shade);
            }
            pRect(bx - 1, by - 1, 3, 2, s.color);
            pRect(bx, by - 1, 2, 2, s.core);
            pRect(bx, by - 1, 1, 1, '#ffffff');
            pRect(bx + Math.sin(s.phase * 1.8) * 3.5, by - 3, 1, 1, 'rgba(254, 240, 138, 0.75)');

        } else if (s.type === 'bloodworm') {
            const nx = s.x / Math.max(1, pw);
            const floorY = Math.abs(nx - 0.50) < 0.085
                ? ph - 5 - Math.round(Math.cos((nx - 0.50) * 18) * 2)
                : Math.round(ph - 4 - Math.pow(Math.abs(nx - 0.50) * 1.95, 1.45) * 18 - Math.sin(s.x * 0.04) * 2);

            if (!s.landed) {
                s.phase += 0.20 * frameScale;
                s.y += s.vy * 0.48 * frameScale;
                s.x += Math.sin(s.phase * 0.7) * 0.08 * frameScale;
                if (s.y >= floorY - 3) {
                    s.y = floorY - 2;
                    s.landed = true;
                }
                for (let seg = 0; seg < 7; seg++) {
                    const wave = Math.sin(s.phase + seg * 0.75) * 1.8;
                    const wx = Math.round(s.x + wave);
                    const wy = Math.round(s.y + seg * 0.85 - 2);
                    const col = seg === 0 ? '#4c0519' : (seg % 2 === 0 ? '#e11d48' : '#9f1239');
                    pRect(wx, wy, 2, 1, col);
                    if (seg === 2 || seg === 4) {
                        pRect(wx, wy, 1, 1, '#fda4af');
                    }
                }
            } else {
                s.phase += 0.10 * frameScale;
                s.y = floorY - 2;
                const dir = s.dir || 1;
                pRect(s.x - 3, floorY, 7, 1, 'rgba(2, 8, 16, 0.42)');
                for (let seg = 0; seg < 7; seg++) {
                    const sx = Math.round(s.x + (seg - 3) * dir);
                    const arch = Math.round(Math.sin(s.phase + seg * 0.8) * 0.8);
                    const sy = Math.round(floorY - 2 + arch);
                    const col = seg === 0 ? '#4c0519' : (seg % 2 === 0 ? '#e11d48' : '#9f1239');
                    pRect(sx, sy, 1, 2, col);
                    if (seg === 3) pRect(sx, sy, 1, 1, '#fda4af');
                }
            }

        } else if (s.type === 'midge') {
            s.phase += 0.24 * frameScale;
            s.x = s.baseX + Math.sin(s.phase) * 3.8;
            s.y = s.baseY + Math.sin(s.phase * 2) * 1.8;
            const mx = Math.round(s.x);
            const my = Math.round(s.y);
            const wingFlutter = Math.sin(s.phase * 3.5) > 0 ? -1 : 0;

            if (s.ripple > 0 && s.ripple < 12) {
                s.ripple += 0.18 * frameScale;
                const r = Math.round(s.ripple);
                const rAlpha = ((1 - s.ripple / 12) * 0.35).toFixed(2);
                const ry = s.emergeY || Math.min(ph - 8, Math.round(s.baseY + 10));
                pRect(Math.round(s.baseX) - r, ry, 2, 1, `rgba(186, 230, 253, ${rAlpha})`);
                pRect(Math.round(s.baseX) + r - 1, ry, 2, 1, `rgba(186, 230, 253, ${rAlpha})`);
            }

            pRect(mx - 2, my - 1 + wingFlutter, 2, 1, 'rgba(224, 242, 254, 0.82)');
            pRect(mx + 1, my - 1 + wingFlutter, 2, 1, 'rgba(224, 242, 254, 0.82)');
            pRect(mx - 1, my, 3, 1, '#3f6212');
            pRect(mx, my, 1, 1, '#fde047');
            pRect(mx, my + 1, 1, 1, 'rgba(254, 240, 138, 0.65)');

        } else if (s.type === 'plankton_swarm') {
            s.phase += 0.07 * frameScale;
            s.y = Math.max(12, s.y - 0.015 * frameScale);
            const cx = Math.round(s.x + Math.sin(s.phase * 0.6) * 1.2);
            const cy = Math.round(s.y);

            pRect(cx - 5, cy - 4, 11, 9, 'rgba(103, 232, 249, 0.12)');
            pRect(cx - 3, cy - 2, 7, 5, 'rgba(240, 171, 252, 0.18)');

            for (let k = 0; k < 6; k++) {
                const r = 2.2 + (k % 3) * 2.1;
                const ang = s.phase * (k % 2 === 0 ? 1 : -0.8) + k * 1.05;
                const px = Math.round(cx + Math.cos(ang) * r);
                const py = Math.round(cy + Math.sin(ang * 1.1) * (r * 0.85));
                const bodyCol = k % 2 === 0 ? '#f0abfc' : '#67e8f9';
                pRect(px, py, 2, 1, bodyCol);
                pRect(px, py, 1, 1, '#ffffff');
                pRect(px, py + 1, 1, 1, k % 2 === 0 ? 'rgba(217, 70, 239, 0.65)' : 'rgba(6, 182, 212, 0.65)');
            }
            pRect(cx, cy, 2, 2, '#fef08a');
            pRect(cx, cy, 1, 1, '#ffffff');

        } else if (s.type === 'koi_pellet') {
            s.phase = (s.phase || 0) + 0.09 * frameScale;
            s.ripple += 0.16 * frameScale;
            const bobY = (s.baseY !== undefined ? s.baseY : s.y) + Math.sin(s.phase) * 0.6;
            s.y = bobY;
            const px = Math.round(s.x);
            const py = Math.round(bobY);

            if (s.ripple < 15) {
                const alpha = ((1 - s.ripple / 15) * 0.35).toFixed(2);
                for (let a = 0; a < Math.PI * 2; a += 0.55) {
                    pRect(px + Math.cos(a) * s.ripple, py + Math.sin(a) * (s.ripple * 0.65), 1, 1, `rgba(224, 242, 254, ${alpha})`);
                }
            }

            pRect(px - 2, py + 2, 5, 1, 'rgba(2, 10, 18, 0.42)');
            pRect(px - 2, py, 4, 2, '#92400e');
            pRect(px - 1, py - 1, 3, 2, '#d97706');
            pRect(px, py - 1, 2, 1, '#fbbf24');
            pRect(px, py - 1, 1, 1, '#fef08a');
        }

        if (s.life <= 0) stimuli.splice(i, 1);
    }
}

// ============================================================================
// BÖLÜM SONU: YEM VE UYARANLARIN ANİMASYONU, ÇİZİMİ VE ÖMRÜ
// ============================================================================
