import { currentHabitatIdx, HABITATS, ambientParticles, shootingStars, pw, ph, lerpHex, ctx, pRect, frameChance, frameScale } from './07-habitat-state.js';
import { drawHabitatStimuli } from './habitat-interactions.js';
import { getGroundY } from './habitat-geometry.js';
import { buildStaticEnvironmentLayer } from './habitat-backgrounds.js';
import { drawHabitatFlora } from './habitat-flora-renderer.js';
import { isLightMode } from './01-core-ui.js';
import { wxFxOn, drawWxSky } from './03-weather.js';
import { sceneCache } from './scene-state.js';

// BÖLÜM BAŞI: ANİMASYONLU SAHNE VE HABİTAT EFEKTLERİ
// ============================================================================

export function drawHabitatEnvironment(time) {
    const hab = HABITATS[currentHabitatIdx];
    const topCol = isLightMode ? hab.lightTop : hab.skyTop;
    const midCol = isLightMode ? hab.lightMid : hab.skyMid;
    const botCol = isLightMode ? hab.lightBot : hab.skyBot;

    if (!sceneCache.bgCache || sceneCache.bgCache.hab !== hab.id || sceneCache.bgCache.light !== isLightMode || sceneCache.bgCache.w !== pw || sceneCache.bgCache.h !== ph) {
        const off = document.createElement('canvas');
        off.width = pw; off.height = ph;
        const o = off.getContext('2d');
        const steps = 48;
        for (let s = 0; s < steps; s++) {
            const t = s / (steps - 1);
            o.fillStyle = t < 0.5 ? lerpHex(topCol, midCol, t * 2) : lerpHex(midCol, botCol, (t - 0.5) * 2);
            o.fillRect(0, Math.floor(t * ph), pw, Math.ceil(ph / steps) + 1);
        }
        sceneCache.bgCache = { img: off, hab: hab.id, light: isLightMode, w: pw, h: ph };
        sceneCache.staticEnvCache = null;
    }
    ctx.drawImage(sceneCache.bgCache.img, 0, 0);

    if (!wxFxOn() && (hab.sceneProfile === 'botanical' || hab.sceneProfile === 'meadow' || hab.sceneProfile === 'wetland')) {
        const mx = Math.round(pw * 0.80);
        const my = 32;
        if (isLightMode) {
            for (let dy = -10; dy <= 10; dy++) {
                for (let dx = -10; dx <= 10; dx++) {
                    const d2 = dx * dx + dy * dy;
                    if (d2 <= 49) pRect(mx + dx, my + dy, 1, 1, '#fef08a');
                    else if (d2 <= 95) pRect(mx + dx, my + dy, 1, 1, 'rgba(253, 224, 71, 0.45)');
                }
            }
            for (let c = 0; c < 4; c++) {
                const cx = Math.round(((c * 115 + time * 0.004 * (c + 1)) % (pw + 50)) - 25);
                const cy = 22 + (c % 2) * 14;
                pRect(cx - 10, cy, 20, 4, 'rgba(255, 255, 255, 0.55)');
                pRect(cx - 6, cy - 3, 12, 3, 'rgba(255, 255, 255, 0.65)');
            }
        } else {
            for (let dy = -9; dy <= 9; dy++) {
                for (let dx = -9; dx <= 9; dx++) {
                    if (dx * dx + dy * dy <= 81 && (dx - 3) * (dx - 3) + (dy - 2) * (dy - 2) > 58) {
                        pRect(mx + dx, my + dy, 1, 1, 'rgba(254, 249, 195, 0.78)');
                    }
                }
            }
            if (frameChance(0.002) && shootingStars.length === 0) {
                shootingStars.push({ x: Math.random() * pw * 0.65, y: 12 + Math.random() * 40, vx: 2.6, vy: 0.9, life: 28 });
            }
            for (let i = shootingStars.length - 1; i >= 0; i--) {
                const st = shootingStars[i];
                st.x += st.vx * frameScale; st.y += st.vy * frameScale; st.life -= frameScale;
                for (let t = 0; t < 5; t++) {
                    pRect(st.x - st.vx * t * 0.6, st.y - st.vy * t * 0.6, 1, 1, `rgba(255,255,255,${(1 - t / 5) * 0.7})`);
                }
                if (st.life <= 0) shootingStars.splice(i, 1);
            }
        }
    }

    drawWxSky(time, hab.weatherSky === true, hab.sceneProfile === 'rainforest');

    if (!sceneCache.staticEnvCache || sceneCache.staticEnvCache.hab !== hab.id || sceneCache.staticEnvCache.light !== isLightMode || sceneCache.staticEnvCache.w !== pw || sceneCache.staticEnvCache.h !== ph) {
        sceneCache.staticEnvCache = {
            img: buildStaticEnvironmentLayer(hab),
            hab: hab.id,
            light: isLightMode,
            w: pw,
            h: ph
        };
    }
    ctx.drawImage(sceneCache.staticEnvCache.img, 0, 0);

    if (hab.sceneProfile === 'betta-aquarium' || hab.sceneProfile === 'reef' || isLightMode) {
        ctx.fillStyle = isLightMode ? 'rgba(255, 255, 255, 0.045)' : 'rgba(125, 211, 252, 0.024)';
        for (let r = 0; r < 5; r++) {
            const rx = ((r * 85 + Math.sin(time * 0.0005 + r) * 16) % pw);
            for (let y = 0; y < ph * 0.76; y += 3) {
                ctx.fillRect(Math.round(rx + y * 0.22), y, 11, 3);
            }
        }
    }

    if (hab.sceneProfile === 'meadow') {
        for (let ray = 0; ray < 4; ray++) {
            const rx = 28 + ray * Math.round(pw * 0.22);
            for (let s = 0; s < 6; s++) {
                const ry = 18 + s * 18 + (ray % 2) * 5;
                const shiftX = rx + Math.round(ry * 0.18 + Math.sin(time * 0.0005 + ray) * 2);
                pRect(shiftX, ry, 5, 7, isLightMode ? 'rgba(254, 240, 138, 0.055)' : 'rgba(251, 191, 36, 0.025)');
            }
        }

        const hx = Math.round(pw * 0.84);
        const hgy = getGroundY(hx, 'meadow', pw, ph) + 1;
        const bodyTop = hgy - 37;
        const sway = Math.round(Math.sin(time * 0.002) * 1);
        const lx = hx - 18 + sway;
        const ly = bodyTop + 4;

        pRect(hx - 18, bodyTop + 4, 1, 2, '#475569');
        pRect(lx, bodyTop + 5, 1, 2, '#64748b');
        pRect(lx - 1, ly + 2, 3, 1, '#78350f');
        pRect(lx - 2, ly + 3, 5, 1, '#451a03');
        pRect(lx - 2, ly + 4, 5, 4, '#fef08a');
        pRect(lx - 1, ly + 5, 3, 2, '#ffffff');
        pRect(lx - 5, ly + 1, 11, 10, 'rgba(253, 224, 71, 0.14)');
        pRect(lx - 3, ly + 2, 7, 8, 'rgba(253, 224, 71, 0.24)');
        pRect(lx - 2, ly + 8, 5, 1, '#451a03');

        const winPulse = (0.65 + 0.3 * Math.sin(time * 0.003)).toFixed(2);
        const ambientGlow = (0.14 + 0.06 * Math.sin(time * 0.003)).toFixed(2);
        pRect(hx - 13, ly + 3, 2, 8, `rgba(253, 224, 71, ${ambientGlow})`);
        pRect(hx - 18, hgy - 6, 8, 2, `rgba(253, 224, 71, ${ambientGlow})`);
        pRect(hx - 4, hgy - 23, 6, 3, `rgba(254, 240, 138, ${winPulse})`);
        pRect(hx - 3, hgy - 22, 4, 1, '#ffffff');

        for (let d = 0; d < 6; d++) {
            const dx = Math.round(((d * 97 + time * (0.008 + (d % 3) * 0.002)) % (pw + 40)) - 20);
            const dy = Math.round(ph * 0.35 + (d * 19) % Math.floor(ph * 0.45) + Math.sin(time * 0.002 + d) * 8);
            const seedTilt = Math.round(Math.sin(time * 0.003 + d) * 1);
            pRect(dx, dy + 1, 1, 2, '#78350f');
            pRect(dx + seedTilt, dy, 1, 1, 'rgba(226, 232, 240, 0.75)');
            pRect(dx - 1 + seedTilt, dy - 1, 3, 1, 'rgba(255, 255, 255, 0.85)');
            pRect(dx - 2 + seedTilt, dy - 2, 1, 1, 'rgba(255, 255, 255, 0.70)');
            pRect(dx + seedTilt, dy - 2, 1, 1, 'rgba(255, 255, 255, 0.95)');
            pRect(dx + 2 + seedTilt, dy - 2, 1, 1, 'rgba(255, 255, 255, 0.70)');
        }
    }

    if (hab.sceneProfile === 'betta-aquarium') {
        for (let s = 0; s < 12; s++) {
            const sx = Math.round(((s * 79 + Math.sin(time * 0.001 + s) * 14) % (pw - 40)) + 20);
            pRect(sx, 1 + (s % 2), 10 + (s % 3) * 6, 1, isLightMode ? 'rgba(255, 255, 255, 0.58)' : 'rgba(125, 211, 252, 0.28)');
        }

        const leafSway = Math.round(Math.sin(time * 0.0012) * 1);
        const catX = 18 + leafSway;
        pRect(catX - 4, 2, 4, 1, '#78350f');
        pRect(catX, 1, 22, 2, '#92400e');
        pRect(catX + 2, 1, 17, 1, '#b45309');
        pRect(catX + 5, 2, 12, 1, '#d97706');
        pRect(catX + 3, 3, 16, 1, '#78350f');
        for (let b = 0; b < 16; b++) {
            const bx = catX + 1 + (b * 1.5) + Math.sin(time * 0.002 + b) * 0.4;
            const by = 2 + (b % 3);
            pRect(bx, by, 2, 2, 'rgba(224, 242, 254, 0.78)');
            pRect(bx, by, 1, 1, '#ffffff');
        }

        const maxTrunkX = Math.min(190, Math.floor(pw * 0.46));
        for (let x = 22; x < maxTrunkX - 16; x += 22) {
            const t = x / maxTrunkX;
            const archY = Math.round(ph - 18 - Math.sin(t * Math.PI * 0.88) * 54 + Math.cos(t * 4) * 3);
            const rhizomeY = archY - 1;
            const isBuce = (x % 44 === 0);

            pRect(x - 4, rhizomeY, 9, 2, '#064e3b');
            pRect(x - 3, rhizomeY, 7, 1, '#047857');
            [-3, 0, 3].forEach(rx => {
                pRect(x + rx, rhizomeY + 2, 1, 3, '#14532d');
            });

            [-6, -3, 0, 3, 6].forEach((lx, lIdx) => {
                const sway = Math.sin(time * 0.002 + x + lIdx) * 1.1;
                const leafX = Math.round(x + lx + sway);
                const leafY = rhizomeY - 4 - (lIdx % 2) * 2;
                const stemBaseX = x + Math.round(lx * 0.5);

                const stemSteps = Math.max(1, rhizomeY - leafY);
                for (let st = 0; st <= stemSteps; st++) {
                    const prog = st / stemSteps;
                    const sx = Math.round(stemBaseX + (leafX - stemBaseX) * prog);
                    const sy = rhizomeY - st;
                    pRect(sx, sy, 1, 1, '#14532d');
                }

                if (isBuce) {
                    pRect(leafX - 2, leafY - 2, 4, 4, isLightMode ? '#0f766e' : '#115e59');
                    pRect(leafX - 1, leafY - 3, 3, 4, isLightMode ? '#14b8a6' : '#0d9488');
                    pRect(leafX, leafY - 2, 1, 1, '#c084fc');
                    pRect(leafX - 1, leafY - 3, 1, 1, '#67e8f9');
                } else {
                    pRect(leafX - 2, leafY - 2, 5, 4, isLightMode ? '#15803d' : '#065f46');
                    pRect(leafX - 1, leafY - 3, 3, 5, isLightMode ? '#22c55e' : '#10b981');
                    pRect(leafX, leafY - 2, 1, 2, '#86efac');
                }
            });

            if (isBuce) {
                const flX = x + Math.round(Math.sin(time * 0.0025 + x) * 1.4);
                const flY = rhizomeY - 11;
                for (let sy = rhizomeY - 1; sy >= flY + 2; sy--) {
                    const prog = (rhizomeY - sy) / 10;
                    pRect(Math.round(x + (flX - x) * prog), sy, 1, 1, '#10b981');
                }
                pRect(flX - 1, flY + 2, 3, 1, '#047857');
                pRect(flX - 2, flY, 5, 2, '#f8fafc');
                pRect(flX - 1, flY - 1, 3, 3, '#ffffff');
                pRect(flX, flY - 2, 1, 2, '#fef08a');
                pRect(flX - 3, flY - 2, 7, 5, 'rgba(224, 242, 254, 0.18)');
            }
        }

        [Math.round(pw * 0.31), Math.round(pw * 0.67)].forEach((cx, cIdx) => {
            const nx = cx / Math.max(1, pw);
            const baseY = Math.round(ph - 4 - Math.pow(Math.abs(nx - 0.50) * 1.95, 1.45) * 18 - Math.sin(cx * 0.04) * 2);
            pRect(cx - 2, baseY - 1, 5, 2, '#4c0519');
            for (let blade = -2; blade <= 2; blade++) {
                const sway = Math.sin(time * 0.0018 + blade + cIdx) * 1.5;
                const bh = 10 + (2 - Math.abs(blade)) * 4;
                const tipX = Math.round(cx + blade * 3.5 + sway);
                const tipY = baseY - bh;
                for (let st = 0; st < bh - 2; st++) {
                    const prog = st / Math.max(1, bh - 2);
                    pRect(Math.round(cx + (tipX - cx) * prog), baseY - st, 1, 1, '#881337');
                }
                pRect(tipX - 2, tipY, 5, 4, blade % 2 === 0 ? '#881337' : '#9f1239');
                pRect(tipX - 1, tipY - 1, 3, 4, '#e11d48');
                pRect(tipX, tipY, 1, 2, '#fda4af');
            }
        });

        const diffX = pw - 16;
        const diffFloorY = Math.round(ph - 4 - Math.pow(Math.abs((diffX / Math.max(1, pw)) - 0.50) * 1.95, 1.45) * 18);
        const diffY = diffFloorY - 10;
        pRect(pw - 3, diffY + 2, 3, 2, 'rgba(148, 163, 184, 0.55)');
        pRect(diffX + 3, diffY + 3, Math.max(1, pw - diffX - 5), 1, 'rgba(186, 230, 253, 0.45)');
        pRect(pw - 2, 3, 1, diffY + 1, 'rgba(186, 230, 253, 0.28)');
        pRect(diffX - 2, diffY, 5, 5, 'rgba(224, 242, 254, 0.52)');
        pRect(diffX - 1, diffY + 1, 3, 3, 'rgba(186, 230, 253, 0.35)');
        pRect(diffX - 1, diffY, 3, 1, '#ffffff');
        for (let m = 0; m < 12; m++) {
            const mRise = ((time * 0.015 + m * 6.5) % Math.max(8, diffY - 4));
            const mx = diffX + Math.sin(time * 0.005 + m * 1.3) * 1.6;
            const my = diffY - 2 - mRise;
            pRect(mx, my, 1, 1, 'rgba(224, 242, 254, 0.75)');
        }

        for (let i = 0; i < 12; i++) {
            const cycle = (time * (0.006 + (i % 3) * 0.001) + i * 23) % Math.max(36, ph * 0.72);
            const bx = 18 + ((i * 41) % Math.max(24, pw - 36)) + Math.sin(time * 0.0008 + i) * 2;
            const by = ph - 18 - cycle;
            pRect(bx, by, 2, 2, 'rgba(186, 230, 253, 0.28)');
            pRect(bx, by, 1, 1, 'rgba(224, 242, 254, 0.58)');
        }
    }
    
if (hab.sceneProfile === 'wetland') {
        const waterHorizonY = ph - 52;
        for (let s = 0; s < 14; s++) {
            const wy = waterHorizonY + 4 + (s * 3.3);
            const sx = Math.round(((s * 67 + Math.sin(time * 0.0012 + s) * 14) % (pw * 0.56)) + pw * 0.22);
            const sw = 8 + (s % 4) * 5;
            pRect(sx, wy, sw, 1, isLightMode ? 'rgba(224, 242, 254, 0.38)' : 'rgba(94, 234, 212, 0.16)');
        }

        for (let r = 0; r < 3; r++) {
            const cycle = ((time * 0.014 + r * 33) % 100) / 100;
            const rx = Math.round(pw * (0.35 + r * 0.14) + Math.sin(r * 2.1) * 14);
            const ry = Math.round(ph - 34 + (r % 2) * 14);
            const radX = Math.round(2 + cycle * 14);
            const alpha = ((1 - cycle) * 0.35).toFixed(2);
            pRect(rx - radX, ry, 2, 1, `rgba(186, 230, 253, ${alpha})`);
            pRect(rx + radX - 1, ry, 2, 1, `rgba(186, 230, 253, ${alpha})`);
            pRect(rx - Math.round(radX * 0.6), ry - 1, Math.round(radX * 1.2), 1, `rgba(186, 230, 253, ${(alpha * 0.5).toFixed(2)})`);
        }

        ctx.fillStyle = isLightMode ? 'rgba(255, 255, 255, 0.13)' : 'rgba(167, 243, 208, 0.04)';
        for (let m = 0; m < 5; m++) {
            const mx = Math.round(((m * 95 + time * 0.005 * (m + 1)) % (pw + 90)) - 45);
            const my = waterHorizonY - 4 + m * 5;
            ctx.fillRect(mx, my, 48 + (m % 3) * 14, 2);
        }

        const stoneX = pw - 74;
        const stoneY = ph - 18;
        pRect(stoneX - 13, stoneY + 7, 28, 4, 'rgba(2, 10, 16, 0.48)');
        pRect(stoneX - 12, stoneY + 8, 26, 1, isLightMode ? 'rgba(186, 230, 253, 0.35)' : 'rgba(45, 212, 191, 0.18)');
        pRect(stoneX - 11, stoneY, 24, 8, isLightMode ? '#475569' : '#1e293b');
        pRect(stoneX - 9, stoneY - 3, 19, 4, isLightMode ? '#64748b' : '#334155');
        pRect(stoneX - 8, stoneY - 3, 12, 1, isLightMode ? '#94a3b8' : '#475569');
        pRect(stoneX - 7, stoneY - 4, 14, 2, isLightMode ? '#16a34a' : '#15803d');

        pRect(stoneX - 3, stoneY - 6, 2, 2, '#15803d');
        pRect(stoneX - 2, stoneY - 7, 5, 3, '#22c55e');
        pRect(stoneX - 1, stoneY - 8, 4, 2, '#4ade80');
        pRect(stoneX + 2, stoneY - 8, 1, 1, '#fef08a');
        if (Math.sin(time * 0.006) > 0.45) {
            pRect(stoneX + 3, stoneY - 6, 2, 2, '#bbf7d0');
            pRect(stoneX + 3, stoneY - 6, 1, 1, '#ffffff');
        }

        const pierShadow = isLightMode ? '#3b2313' : '#0f0d0c';
        const pierCol = isLightMode ? '#5c3a21' : '#1c1917';
        const pierHi = isLightMode ? '#854d0e' : '#332924';
        const py = ph - 40;

        pRect(0, py + 3, 64, 2, pierShadow);
        pRect(0, py, 64, 3, pierCol);
        pRect(0, py, 64, 1, pierHi);
        for (let px = 2; px < 62; px += 5) {
            pRect(px, py - 1, 4, 1, pierHi);
            pRect(px + 3, py, 1, 2, pierShadow);
        }

        for (let b = 0; b < 18; b++) {
            const bx = 16 + b;
            const by = py + 3 + Math.round(b * 0.42);
            pRect(bx, by, 2, 1, pierShadow);
            const bx2 = 38 + b;
            const by2 = py + 3 + Math.round(b * 0.45);
            pRect(bx2, by2, 2, 1, pierShadow);
        }

        [14, 36, 58].forEach((px, pIdx) => {
            const bankSurfaceY = getGroundY(px, 'wetland', pw, ph);
            const waterLineY = Math.min(ph - 10, bankSurfaceY + 4 + pIdx * 3);
            const postH = Math.max(18, waterLineY - (py - 9));

            pRect(px, py - 9, 3, postH, pierCol);
            pRect(px, py - 9, 1, postH, pierHi);
            pRect(px + 2, py - 9, 1, postH, pierShadow);
            pRect(px, py - 10, 3, 1, '#a16207');

            pRect(px - 2, waterLineY - 1, 7, 2, 'rgba(2, 10, 16, 0.48)');
            pRect(px - 3, waterLineY, 9, 1, isLightMode ? 'rgba(186, 230, 253, 0.38)' : 'rgba(45, 212, 191, 0.20)');
            for (let ry = 1; ry <= 4; ry++) {
                pRect(px, waterLineY + ry * 2, 3, 1, 'rgba(15, 23, 42, 0.30)');
            }

            if (px === 58) {
                const sway = Math.round(Math.sin(time * 0.0025) * 1);
                pRect(px + 2, py - 9, 6, 1, pierCol);
                pRect(px + 2, py - 8, 2, 1, pierShadow);
                pRect(px + 6 + sway, py - 8, 1, 2, '#475569');
                pRect(px + 4 + sway, py - 6, 5, 1, '#451a03');
                pRect(px + 5 + sway, py - 5, 3, 4, '#fef08a');
                pRect(px + 6 + sway, py - 4, 1, 2, '#ffffff');
                pRect(px + 4 + sway, py - 1, 5, 1, '#451a03');
                pRect(px + 3 + sway, py - 7, 7, 7, 'rgba(253, 224, 71, 0.22)');
                for (let ry = 0; ry < 5; ry++) {
                    const rShift = Math.sin(time * 0.004 + ry * 1.3) * 2;
                    pRect(px + 4 + rShift, waterLineY + 1 + ry * 2, 4 - Math.floor(ry * 0.5), 1, `rgba(253, 224, 71, ${(0.38 - ry * 0.06).toFixed(2)})`);
                }
            }
        });
    }

    if (hab.sceneProfile === 'botanical') {
        const reach = Math.min(155, Math.round(pw * 0.30));
        [Math.round(reach * 0.48), Math.round(pw - reach * 0.48)].forEach((lx, idx) => {
            const t = 0.48;
            const branchY = Math.round(5 + Math.pow(t, 1.2) * 15 + Math.sin(lx * 0.09) * 1.5);
            const sway = Math.round(Math.sin(time * 0.002 + idx * 2) * 1);

            pRect(lx - 1, branchY, 3, 2, '#334155');
            for (let cy = 1; cy <= 6; cy++) {
                const cx = lx + (cy > 3 ? sway : 0);
                pRect(cx, branchY + cy, 1, 1, '#64748b');
            }
            pRect(lx - 1 + sway, branchY + 6, 3, 1, '#475569');
            pRect(lx - 2 + sway, branchY + 7, 5, 1, '#334155');
            pRect(lx - 2 + sway, branchY + 8, 5, 5, 'rgba(253, 224, 71, 0.88)');
            pRect(lx - 1 + sway, branchY + 9, 3, 3, '#ffffff');
            pRect(lx - 5 + sway, branchY + 5, 11, 11, 'rgba(253, 224, 71, 0.16)');
            pRect(lx - 2 + sway, branchY + 13, 5, 1, '#334155');
            pRect(lx - 1 + sway, branchY + 14, 3, 1, '#1e293b');
        });

        const fx = Math.round(pw * 0.18);
        const fy = getGroundY(fx, 'botanical', pw, ph) + 1;
        const plumeH = 3 + Math.round(Math.sin(time * 0.008) * 1);
        pRect(fx, fy - 31 - plumeH, 1, plumeH, '#e0f2fe');
        pRect(fx - 1, fy - 31 - plumeH, 3, 1, '#ffffff');

        const dropPhase = (time * 0.015) % 6;
        [-1, 1].forEach(side => {
            const dx = fx + side * Math.round(2 + dropPhase * 1.4);
            const dy = fy - 29 + Math.round(dropPhase * 1.1);
            pRect(dx, dy, 1, 2, '#bae6fd');
            const cascadeX = fx + side * 11;
            const cascadeY = fy - 21 + Math.floor((time * 0.02 + (side > 0 ? 3 : 0)) % 14);
            pRect(cascadeX, fy - 21, 1, 16, 'rgba(186, 230, 253, 0.30)');
            pRect(cascadeX, cascadeY, 1, 3, '#e0f2fe');
            pRect(cascadeX - 1, fy - 5, 3, 1, '#ffffff');
        });
        pRect(fx - 8 + Math.sin(time * 0.005) * 4, fy - 23, 4, 1, '#ffffff');
        pRect(fx - 9 - Math.cos(time * 0.004) * 4, fy - 5, 4, 1, '#bae6fd');

        for (let i = 0; i < 8; i++) {
            const fxPos = (i * 73 + Math.sin(time * 0.001 + i) * 12) % pw;
            const fyPos = ph * 0.36 + Math.sin(time * 0.0014 + i * 1.7) * 22;
            const glow = 0.32 + 0.40 * (0.5 + 0.5 * Math.sin(time * 0.004 + i));
            pRect(fxPos, fyPos, 2, 2, i % 3 === 0 ? `rgba(232, 121, 249, ${glow.toFixed(2)})` : `rgba(253, 224, 71, ${glow.toFixed(2)})`);
        }
    }
    
    if (hab.sceneProfile === 'reef') {
        for (let c = 0; c < 12; c++) {
            const cx = Math.round(((c * 61 + Math.sin(time * 0.001 + c) * 18) % (pw * 0.56)) + pw * 0.22);
            const cy = 2 + (c % 3) * 3;
            pRect(cx, cy, 10 + (c % 4) * 4, 1, isLightMode ? 'rgba(224, 242, 254, 0.58)' : 'rgba(103, 232, 249, 0.26)');
        }

        const clamX = Math.floor(pw * 0.72);
        const clamNx = clamX / Math.max(1, pw);
        const clamMound = clamNx > 0.74 ? Math.pow((clamNx - 0.74) / 0.26, 1.5) * 34 : 0;
        const clamY = Math.round(getGroundY(clamX, 'reef', pw, ph) - clamMound) - 1;
        const openJaw = Math.round(2 + Math.sin(time * 0.0022) * 1.2);

        // Kaya kaide ve temas gölgesi
        pRect(clamX - 11, clamY + 2, 23, 3, 'rgba(5, 4, 23, 0.55)');
        pRect(clamX - 10, clamY, 21, 3, '#1e1b4b');

        // Alt kabuk, oluklu kabuk sırtları ve menteşe bağlantısı
        pRect(clamX - 9, clamY - 3, 19, 4, '#312e81');
        for (let rx = -7; rx <= 7; rx += 3) {
            pRect(clamX + rx, clamY - 3, 2, 3, '#4338ca');
        }
        pRect(clamX - 9, clamY - openJaw - 4, 3, openJaw + 3, '#1e1b4b');

        // Alt ve üst kabuğu birbirine fiziksel olarak bağlayan biyolüminesan manto dokusu
        const mantleH = openJaw + 3;
        pRect(clamX - 7, clamY - 2 - mantleH, 15, mantleH, '#701a75');
        pRect(clamX - 8, clamY - 2, 17, 2, '#a21caf');
        pRect(clamX - 6, clamY - 1 - mantleH, 13, 2, '#d946ef');
        for (let mx = -5; mx <= 5; mx += 2) {
            pRect(clamX + mx, clamY - 2, 1, 1, '#38bdf8');
            pRect(clamX + mx, clamY - 1 - mantleH, 1, 1, '#f0abfc');
        }

        // İnci ve parıltı halesi (manto yatağının içinde oturur)
        pRect(clamX - 4, clamY - 7, 9, 7, 'rgba(240, 171, 252, 0.24)');
        pRect(clamX - 2, clamY - 5, 5, 4, '#fef08a');
        pRect(clamX - 1, clamY - 5, 3, 3, '#fef9c3');
        pRect(clamX - 1, clamY - 4, 2, 2, '#ffffff');

        // Üst kabuk ve oluklu kenarları
        pRect(clamX - 8, clamY - openJaw - 5, 16, 3, '#311042');
        pRect(clamX - 7, clamY - openJaw - 6, 14, 2, '#4c1d95');
        for (let rx = -6; rx <= 6; rx += 3) {
            pRect(clamX + rx, clamY - openJaw - 6, 2, 1, '#818cf8');
        }
        pRect(clamX - 6, clamY - openJaw - 3, 13, 1, '#e879f9');

        // Resif tabanındaki belirli yarıklardan yükselen mikro kabarcık sütunları
        const ventPositions = [0.18, 0.34, 0.48, 0.63, 0.82];
        for (let i = 0; i < 14; i++) {
            const vPos = ventPositions[i % ventPositions.length];
            const baseBx = Math.round(pw * vPos + ((i * 7) % 9) - 4);
            const floorY = getGroundY(baseBx, 'reef', pw, ph);
            const maxRise = Math.max(40, floorY - 8);
            const rise = (time * (0.0045 + (i % 3) * 0.0012) + i * 21) % maxRise;
            const bx = baseBx + Math.sin(time * 0.0015 + i) * 2;
            const by = floorY - 4 - rise;
            pRect(bx, by, 2, 2, 'rgba(103, 232, 249, 0.35)');
            pRect(bx, by, 1, 1, i % 3 === 0 ? '#f0abfc' : '#cffafe');
        }
    }
    
    if (hab.sceneProfile === 'koi-pond') {
        for (let s = 0; s < 14; s++) {
            const wy = 32 + s * Math.floor((ph - 44) / 14);
            const sx = Math.round(((s * 73 + Math.sin(time * 0.001 + s) * 16) % (pw * 0.56)) + pw * 0.20);
            pRect(sx, wy, 9 + (s % 3) * 5, 1, isLightMode ? 'rgba(224, 242, 254, 0.34)' : 'rgba(125, 211, 252, 0.14)');
        }

        const bx = pw - 42;
        const by = ph - 18;
        const streamX = bx - 23;
        pRect(streamX, by - 3, 1, 8, 'rgba(186, 230, 253, 0.52)');
        for (let d = 0; d < 3; d++) {
            const dropOffset = Math.floor((time * 0.024 + d * 2.5) % 8);
            pRect(streamX, by - 3 + dropOffset, 1, 2, '#e0f2fe');
        }
        pRect(streamX - 1, by + 4, 3, 1, '#ffffff');

        for (let ring = 0; ring < 2; ring++) {
            const rippleR = ((time * 0.014 + ring * 5) % 10);
            const rAlpha = ((1 - rippleR / 10) * 0.48).toFixed(2);
            pRect(streamX - rippleR, by + 5, 2, 1, `rgba(224, 242, 254, ${rAlpha})`);
            pRect(streamX + rippleR, by + 5, 2, 1, `rgba(224, 242, 254, ${rAlpha})`);
            pRect(streamX - Math.round(rippleR * 0.6), by + 6, Math.max(2, Math.round(rippleR * 1.2)), 1, `rgba(186, 230, 253, ${(rAlpha * 0.5).toFixed(2)})`);
        }

        const glowAlpha = (0.78 + 0.2 * Math.sin(time * 0.004)).toFixed(2);
        pRect(bx - 3, by - 16, 7, 4, `rgba(253, 224, 71, ${glowAlpha})`);
        pRect(bx - 1, by - 15, 3, 2, '#ffffff');
        pRect(bx, by - 16, 1, 4, '#1e293b');
        pRect(bx - 7, by - 18, 15, 9, 'rgba(251, 191, 36, 0.16)');
        for (let ry = 0; ry < 6; ry++) {
            const drift = Math.sin(time * 0.003 + ry * 1.4) * 2.2;
            pRect(bx - 4 + drift, by + 10 + ry * 2, 7 - ry, 1, `rgba(251, 191, 36, ${(0.34 - ry * 0.05).toFixed(2)})`);
        }
    }
    
    if (hab.sceneProfile === 'arctic-tundra') {
        const auroraAlpha = isLightMode ? 0.08 : 0.15;
        for (let band = 0; band < 2; band++) {
            const upperCol = band === 0
                ? `rgba(16, 185, 129, ${(auroraAlpha * 0.55).toFixed(2)})`
                : `rgba(139, 92, 246, ${(auroraAlpha * 0.50).toFixed(2)})`;
            const midCol = band === 0
                ? `rgba(52, 211, 153, ${auroraAlpha})`
                : `rgba(168, 85, 247, ${(auroraAlpha * 0.85).toFixed(2)})`;
            const lowerRim = band === 0
                ? `rgba(167, 243, 208, ${(auroraAlpha * 1.45).toFixed(2)})`
                : `rgba(216, 180, 254, ${(auroraAlpha * 1.15).toFixed(2)})`;

            for (let x = 0; x < pw; x += 2) {
                const wave = Math.sin(x * 0.016 + time * 0.0007 + band * 2.1) * 9
                           + Math.cos(x * 0.038 - time * 0.0010) * 4;
                const curtainRay = Math.max(0, Math.sin(x * 0.09 + time * 0.0016 + band)) * 8;
                const ay = Math.round(12 + band * 15 + wave);
                const ah = Math.round(14 + curtainRay);
                pRect(x, ay - Math.floor(curtainRay * 0.5), 2, Math.floor(ah * 0.55), upperCol);
                pRect(x, ay + Math.floor(ah * 0.35), 2, Math.floor(ah * 0.65), midCol);
                pRect(x, ay + ah - 2, 2, 2, lowerRim);
            }
        }

        const cabBaseX = Math.round(pw * 0.73);
        const cabSurfaceY = Math.round(ph * 0.60 + Math.sin(cabBaseX * 0.06) * 1.5) + 1;
        const glowPulse = (0.72 + 0.22 * Math.sin(time * 0.003)).toFixed(2);
        const snowGlow = (0.16 + 0.08 * Math.sin(time * 0.003)).toFixed(2);

        pRect(cabBaseX - 1, cabSurfaceY - 10, 3, 1, `rgba(254, 249, 195, ${glowPulse})`);
        pRect(cabBaseX + 3, cabSurfaceY - 10, 3, 1, `rgba(254, 249, 195, ${glowPulse})`);
        pRect(cabBaseX - 3, cabSurfaceY - 2, 12, 2, `rgba(253, 224, 71, ${snowGlow})`);

        const flueX = cabBaseX + 6;
        const flueY = cabSurfaceY - 26;
        for (let s = 0; s < 6; s++) {
            const rise = ((time * 0.011 + s * 5) % 28);
            const sx = flueX + Math.sin(time * 0.002 + s * 0.9) * (0.8 + rise * 0.14);
            const sy = flueY - rise;
            const alpha = ((1 - rise / 28) * 0.42).toFixed(2);
            const size = 2 + Math.floor(rise / 10);
            pRect(sx, sy, size, 2, `rgba(226, 232, 240, ${alpha})`);
        }
    }
    
    if (hab.sceneProfile === 'rainforest') {
        for (let ray = 0; ray < 5; ray++) {
            const baseX = (ray * 112 + 34) % pw;
            for (let segment = 0; segment < 7; segment++) {
                const y = 18 + segment * 16 + (ray % 3) * 4;
                const x = baseX + Math.round(y * 0.16 + Math.sin(time * 0.0005 + ray) * 1.5);
                pRect(x, y, 5 + (segment % 2), 12, isLightMode ? 'rgba(254, 240, 138, 0.055)' : 'rgba(167, 243, 208, 0.032)');
            }
        }

        const wfX = Math.round(pw * 0.50);
        const wfGroundY = getGroundY(wfX, 'rainforest', pw, ph);
        const wfTopY = wfGroundY - 38;
        for (let d = 0; d < 8; d++) {
            const dropY = wfTopY + ((Math.floor(time * 0.025) + d * 5) % 37);
            const dropX = wfX - 1 + (d % 3);
            pRect(dropX, dropY, 1, 3, isLightMode ? 'rgba(224, 242, 254, 0.72)' : 'rgba(125, 211, 252, 0.45)');
        }
        const foamSpread = 4 + Math.round(Math.sin(time * 0.006) * 1.5);
        pRect(wfX - foamSpread, wfGroundY - 1, foamSpread * 2, 2, isLightMode ? 'rgba(224, 242, 254, 0.65)' : 'rgba(125, 211, 252, 0.35)');
        pRect(wfX - foamSpread - 3, wfGroundY, (foamSpread + 3) * 2, 1, isLightMode ? 'rgba(186, 230, 253, 0.38)' : 'rgba(45, 212, 191, 0.22)');

        for (let wisp = 0; wisp < 10; wisp++) {
            const drift = (time * (0.0018 + (wisp % 3) * 0.0005)) % (pw + 48);
            const x = (wisp * 79 + drift) % pw;
            const y = ph * (0.44 + (wisp % 4) * 0.07) + Math.sin(time * 0.0007 + wisp) * 2;
            ctx.fillStyle = isLightMode ? 'rgba(209, 250, 229, 0.045)' : 'rgba(45, 212, 191, 0.032)';
            ctx.fillRect(Math.round(x), Math.round(y), 14 + (wisp % 3) * 5, 2);
        }

        for (let sp = 0; sp < 6; sp++) {
            const sx = Math.round(((sp * 83 + Math.sin(time * 0.0011 + sp) * 14) % (pw - 32)) + 16);
            const sy = Math.round(ph * 0.48 + (sp * 17) % Math.floor(ph * 0.38) + Math.cos(time * 0.0016 + sp) * 6);
            const alpha = (0.28 + 0.35 * (0.5 + 0.5 * Math.sin(time * 0.004 + sp * 1.7))).toFixed(2);
            pRect(sx, sy, 1, 1, sp % 2 === 0 ? `rgba(110, 231, 183, ${alpha})` : `rgba(253, 224, 71, ${alpha})`);
        }
    }
    

    drawHabitatFlora(time, hab);

    ambientParticles.forEach((pt, idx) => {
        if (hab.sceneProfile === 'koi-pond') {
            pt.y += pt.speed * 0.65 * frameScale;
            pt.x += Math.sin(time * 0.0015 + pt.phase) * 0.25 * frameScale;
            if (pt.y > ph) { pt.y = 0; pt.x = Math.random() * pw; }
            const leafCol = idx % 3 === 0 ? 'rgba(239, 68, 68, 0.78)' : 'rgba(251, 207, 232, 0.72)';
            pRect(pt.x, pt.y, 2, 1, leafCol);
        } else {
            pt.y -= pt.speed * frameScale;
            pt.x += Math.sin(time * 0.002 + pt.phase) * 0.12 * frameScale;
            if (pt.y < 0) { pt.y = ph; pt.x = Math.random() * pw; }
            const alpha = 0.25 + 0.35 * Math.sin(time * 0.004 + pt.phase);
            pRect(pt.x, pt.y, pt.size, pt.size, `rgba(${hab.rgb[0]}, ${hab.rgb[1]}, ${hab.rgb[2]}, ${alpha})`);
        }
    });

    drawHabitatStimuli();
}

// ============================================================================
// BÖLÜM SONU: ANİMASYONLU SAHNE ÇİZİMİ
// ============================================================================
