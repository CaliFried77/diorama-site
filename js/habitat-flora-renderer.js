import { flora, pw, ph, pRect } from './07-habitat-state.js';
import { isLightMode } from './01-core-ui.js';
import { getGroundY } from './habitat-geometry.js';

/* HABITAT FLORA RENDERER — animated drawing for habitat plants and small scenery details. */

// ============================================================================
// BÖLÜM BAŞI: FLORA VE BİTKİ KÜMELERİNİN HAREKETLİ ÇİZİMİ
// Bitki verileri initHabitat tarafından hazırlanır; bu modül yalnızca her karede çizer.
// ============================================================================

export function drawHabitatFlora(time, hab) {
    flora.forEach(f => {
        const baseGroundY = f.baseY !== undefined ? f.baseY : getGroundY(f.x, hab.sceneProfile, pw, ph);

        if (f.type === 'pebble') {
            // BÖLÜM BAŞI: ZEMİN VE KUTUP DETAYLARI
            pRect(f.x, f.y, f.w, f.h, isLightMode ? 'rgba(15, 55, 65, 0.35)' : f.shade);

        } else if (f.type === 'cotton_grass') {
            const sway = Math.sin(time * 0.0016 + f.phase) * 1.8;
            for (let y = 0; y < f.h; y += 2) {
                pRect(f.x + sway * (y / f.h), baseGroundY - y, 1, 2, '#0f766e');
            }
            const tx = f.x + sway;
            const ty = baseGroundY - f.h;
            pRect(tx - 2, ty - 1, 5, 3, '#ffffff');
            pRect(tx - 1, ty - 2, 3, 4, '#f8fafc');

        } else if (f.type === 'arctic_crystal') {
            pRect(f.x - 2, baseGroundY - Math.floor(f.h * 0.7), 2, Math.floor(f.h * 0.7), '#0284c7');
            pRect(f.x, baseGroundY - f.h, 2, f.h, f.col);
            pRect(f.x + 2, baseGroundY - Math.floor(f.h * 0.6), 2, Math.floor(f.h * 0.6), '#38bdf8');
            pRect(f.x, baseGroundY - f.h, 1, 2, '#ffffff');

        } else if (f.type === 'arctic_berry_bush') {
            pRect(f.x - f.r, baseGroundY - 4, f.r * 2, 4, '#115e59');
            pRect(f.x - f.r + 1, baseGroundY - 5, f.r * 2 - 2, 2, '#e0f2fe');
            pRect(f.x - 2, baseGroundY - 3, 2, 2, '#ef4444');
            pRect(f.x + 2, baseGroundY - 2, 2, 2, '#f97316');

            // BÖLÜM SONU: ZEMİN VE KUTUP DETAYLARI
        } else if (f.type === 'maple_bough') {
            // BÖLÜM BAŞI: AĞAÇ, SARMAŞIK VE ORMAN FLORASI
            for (let y = 0; y < f.len; y += 2) {
                const prog = y / f.len;
                const sway = Math.sin(time * 0.0015 + f.phase + y * 0.07) * (1.0 + prog * 3.0);
                const px = f.x + sway;
                const py = f.branchY + y;
                pRect(px, py, 1, 2, '#451a03');
                if (y > 2 && y % 4 === 0) {
                    const span = Math.max(1, Math.round((1 - prog * 0.5) * 3));
                    pRect(px - span, py, span * 2 + 1, 2, f.col);
                    pRect(px, py - 1, 1, 1, '#fca5a5');
                }
            }

        } else if (f.type === 'bamboo_stalk') {
            const culmCol = isLightMode ? '#15803d' : '#0d593d';
            const nodeCol = isLightMode ? '#86efac' : '#34d399';
            const leafCol = isLightMode ? '#22c55e' : '#10b981';
            for (let y = 0; y < f.h; y += 2) {
                const prog = y / f.h;
                const sway = Math.sin(time * 0.0012 + f.phase) * prog * 3.2 + f.lean * y;
                const px = f.x + sway;
                const py = baseGroundY - y;
                pRect(px, py, 2, 2, culmCol);
                if (y > 6 && y % 12 === 0) {
                    pRect(px - 1, py, 4, 1, nodeCol);
                    const side = (y % 24 === 0) ? -1 : 1;
                    pRect(px + side * 2, py - 1, 4 * side, 1, leafCol);
                    pRect(px + side * 3, py - 2, 3 * side, 1, nodeCol);
                }
            }

        } else if (f.type === 'sea_vine') {
            for (let y = 0; y < f.len; y += 2) {
                const prog = y / f.len;
                const sway = Math.sin(time * 0.0014 + f.phase + y * 0.06) * (1.0 + prog * 3.5);
                const px = f.x + sway;
                const py = f.startY + y;
                pRect(px, py, 1, 2, '#0f766e');
                if (y % 6 === 0) {
                    pRect(px - 1, py, 3, 1, f.col);
                }
            }

        } else if (f.type === 'staghorn_coral') {
            const mainCol = `hsla(${f.hue}, 82%, 46%, 0.9)`;
            const tipCol = '#fef08a';
            for (let b = -1; b <= 1; b++) {
                const bh = Math.round(f.h * (b === 0 ? 1 : 0.75));
                for (let y = 0; y < bh; y++) {
                    const prog = y / bh;
                    const sway = Math.sin(time * 0.001 + f.phase) * prog * 0.8;
                    const px = f.x + b * prog * 6.5 + sway;
                    const py = baseGroundY - y;
                    pRect(px, py, 2, 1, y >= bh - 2 ? tipCol : mainCol);
                    if (b !== 0 && y === Math.floor(bh * 0.55)) {
                        pRect(px + b * 2, py - 1, 2, 2, tipCol);
                    }
                }
            }

        } else if (f.type === 'willow_frond') {
            const stemCol = isLightMode ? '#15803d' : '#0b4635';
            const leafCol = isLightMode ? '#22c55e' : '#10b981';
            const tipCol = isLightMode ? '#86efac' : '#34d399';
            for (let y = 0; y < f.len; y += 2) {
                const prog = y / f.len;
                const sway = Math.sin(time * 0.0014 + f.phase + y * 0.05) * (1.2 + prog * 4.5);
                const px = f.x + sway;
                const py = f.startY + y;
                pRect(px, py, 1, 2, stemCol);
                if (y > 4 && y % 6 === 0) {
                    const side = (y % 12 === 0) ? -1 : 1;
                    pRect(px + side, py, 2, 1, prog > 0.75 ? tipCol : leafCol);
                }
            }

        } else if (f.type === 'canopy_vine') {
            for (let y = 0; y < f.len; y += 2) {
                const progress = y / f.len;
                const sway = Math.sin(time * 0.0011 + f.phase + y * 0.035) * (1.5 + progress * 3.5);
                const px = f.x + sway;
                const py = f.startY + y;
                pRect(px, py, 2, 2, f.hue);
                if (y > 6 && y % 10 === 0) {
                    const side = (y % 20 === 0) ? 1 : -1;
                    pRect(px + side * 2, py, 3, 2, '#22c55e');
                }
            }

        } else if (f.type === 'tropical_leaf') {
            const stem = isLightMode ? '#166534' : '#0b4636';
            const sway = Math.sin(time * 0.0013 + f.phase) * 2;
            for (let blade = -1; blade <= 1; blade++) {
                const length = Math.round(f.h * (blade === 0 ? 1 : 0.76));
                const spread = blade * 7 + f.dir * 2;
                for (let step = 0; step < length; step += 2) {
                    const t = step / length;
                    const cx = f.x + (spread + sway) * t;
                    const cy = baseGroundY - step;
                    const halfW = Math.max(1, Math.round(Math.sin(t * Math.PI) * 3.5));
                    pRect(cx - halfW, cy, halfW * 2 + 1, 2, step % 4 === 0 ? f.hue : (isLightMode ? '#15803d' : '#0c6246'));
                    pRect(cx, cy, 1, 2, isLightMode ? '#4ade80' : '#2dd4a0');
                }
            }
            pRect(f.x - 1, baseGroundY - 3, 3, 4, stem);

        } else if (f.type === 'monstera') {
            const sway = Math.sin(time * 0.0012 + f.phase) * 1.3;
            const stemCol = isLightMode ? '#0f5e35' : '#073d2b';
            const leafDark = isLightMode ? '#15803d' : '#0b5838';
            const leafLight = isLightMode ? '#22a65a' : '#1b8250';
            for (let blade = -2; blade <= 2; blade++) {
                const length = f.h * (blade === 0 ? 1 : (Math.abs(blade) === 1 ? 0.82 : 0.66));
                const lateralReach = blade * 8.5 * f.dir;
                for (let step = 0; step < length; step += 2) {
                    const progress = step / length;
                    const centerX = f.x + lateralReach * Math.pow(progress, 1.15) + sway * progress;
                    const py = baseGroundY - step;
                    const halfW = Math.max(1, Math.round(Math.sin(progress * Math.PI) * 5.5));
                    const leafCol = (blade + Math.floor(step / 12)) % 2 === 0 ? leafLight : leafDark;
                    pRect(centerX - halfW, py, halfW * 2 + 1, 2, leafCol);
                    pRect(centerX, py, 1, 2, stemCol);

                    if (step > 8 && step < length - 8 && step % 12 === 0 && halfW >= 3) {
                        const cut = Math.max(1, Math.floor(halfW * 0.48));
                        const shadow = isLightMode ? '#0b3b2b' : '#041713';
                        pRect(centerX - cut, py, 1, 2, shadow);
                        pRect(centerX + cut, py, 1, 2, shadow);
                    }
                    if (step % 10 === 0 && halfW > 2) {
                        pRect(centerX - Math.sign(lateralReach || f.dir) * (halfW - 1), py - 1, 1, 2, isLightMode ? '#4ade80' : '#2bb46f');
                    }
                }
            }
            pRect(f.x - 3, baseGroundY - 5, 7, 5, stemCol);
            pRect(f.x - 1, baseGroundY - 7, 3, 2, leafLight);

        } else if (f.type === 'jungle_fern') {
            for (let frond = -2; frond <= 2; frond++) {
                const direction = frond < 0 ? -1 : 1;
                const length = f.h * (0.68 + (2 - Math.abs(frond)) * 0.16);
                for (let step = 0; step < length; step += 2) {
                    const t = step / length;
                    const curve = direction * Math.pow(t, 1.35) * (8 + Math.abs(frond) * 2.5);
                    const px = f.x + curve + Math.sin(time * 0.0014 + f.phase + frond) * t * 1.5;
                    const py = baseGroundY - step;
                    const span = Math.max(1, Math.round((1 - t) * 3.5));
                    pRect(px - span, py, span * 2 + 1, 1, isLightMode ? '#22a65a' : '#128052');
                    pRect(px, py, 1, 2, isLightMode ? '#166534' : '#0d593d');
                }
            }

        } else if (f.type === 'heliconia') {
            const sway = Math.sin(time * 0.0015 + f.phase) * 2;
            for (let y = 0; y < f.h; y += 2) {
                const px = f.x + sway * (y / f.h);
                const py = baseGroundY - y;
                pRect(px, py, 2, 2, isLightMode ? '#166534' : '#0e5038');
                if (y > f.h * 0.35 && (y % 8 === 0 || y % 8 === 2)) {
                    const side = (Math.floor(y / 8) % 2 === 0) ? -1 : 1;
                    pRect(px + side * 2, py - 1, 4, 2, f.hue);
                    pRect(px + side * 3, py - 2, 2, 1, '#facc15');
                }
            }

        } else if (f.type === 'epiphyte') {
            const x = f.x;
            const y = f.y;
            const petalSway = Math.round(Math.sin(time * 0.0015 + f.phase) * 0.6);
            pRect(x - 3, y + 1, 7, 2, '#2c221e');
            pRect(x - 4, y, 9, 2, isLightMode ? '#166534' : '#0d5138');
            pRect(x - 2, y - 1, 5, 2, isLightMode ? '#22c55e' : '#10b981');
            pRect(x - 3 + petalSway, y - 3, 7, 2, f.hue);
            pRect(x - 1 + petalSway, y - 4, 3, 2, '#fef08a');

        } else if (f.type === 'bromeliad') {
            const centerX = f.x;
            const centerY = baseGroundY - f.h * 0.65;
            for (let blade = -3; blade <= 3; blade++) {
                const lean = blade * 2.5;
                const bh = f.h * (0.6 + (3 - Math.abs(blade)) * 0.12);
                for (let y = 0; y < bh; y += 2) {
                    const prog = y / bh;
                    const x = centerX + lean * prog;
                    pRect(x - 1, baseGroundY - y, 3, 2, blade % 2 === 0 ? '#15803d' : '#0f766e');
                }
            }
            pRect(centerX - 3, centerY, 7, 3, f.hue);
            pRect(centerX - 1, centerY - 2, 3, 2, '#facc15');

        } else if (f.type === 'orchid') {
            for (let y = 0; y < f.h; y += 2) {
                const sway = Math.sin(time * 0.0016 + f.phase + y * 0.06) * (y / f.h) * 2;
                pRect(f.x + sway, baseGroundY - y, 1, 2, isLightMode ? '#166534' : '#115e59');
            }
            const flowerY = baseGroundY - f.h;
            const flowerX = f.x + Math.sin(time * 0.0016 + f.phase + f.h * 0.06) * 2;
            pRect(flowerX - 3, flowerY, 7, 2, f.hue);
            pRect(flowerX - 1, flowerY - 2, 3, 2, '#fbcfe8');
            pRect(flowerX, flowerY - 1, 1, 2, '#fef08a');

            // BÖLÜM SONU: AĞAÇ, SARMAŞIK VE ORMAN FLORASI
        } else if (f.type === 'meadow_stone') {
            // BÖLÜM BAŞI: ÇAYIR VE ÇİÇEKLİ BİTKİLER
            const stoneDark = isLightMode ? '#475569' : '#1e293b';
            const stoneMid = isLightMode ? '#64748b' : '#334155';
            const stoneHi = isLightMode ? '#94a3b8' : '#475569';
            pRect(f.x - f.rx, baseGroundY, f.rx * 2, 2, 'rgba(2, 10, 14, 0.38)');
            for (let dy = -f.ry; dy <= 0; dy++) {
                const span = Math.max(1, Math.round(f.rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / ((f.ry + 1) * (f.ry + 1))))));
                pRect(f.x - span, baseGroundY + dy, span * 2, 1, dy === 0 ? stoneDark : stoneMid);
                if (dy === -f.ry) {
                    pRect(f.x - span + 1, baseGroundY + dy, Math.max(1, span * 2 - 2), 1, stoneHi);
                    if (f.hasMoss) {
                        pRect(f.x - Math.floor(span * 0.6), baseGroundY + dy, Math.max(2, Math.floor(span * 1.1)), 1, isLightMode ? '#16a34a' : '#15803d');
                    }
                }
            }

        } else if (f.type === 'meadow_tuft') {
            const bladeDark = isLightMode ? '#15803d' : '#0d3b2e';
            const bladeLight = isLightMode ? '#22c55e' : '#155e46';
            const sway = Math.sin(time * 0.0017 + f.phase) * 1.2;
            [-2, -1, 0, 1, 2].forEach((b, bIdx) => {
                const bh = Math.max(3, f.h - Math.abs(b));
                for (let y = 0; y < bh; y++) {
                    const prog = y / bh;
                    const bx = f.x + b + (b * 0.6 + sway) * prog;
                    pRect(bx, baseGroundY - y, 1, 1, bIdx % 2 === 0 ? bladeLight : bladeDark);
                }
            });
            if (f.hasClover) {
                const cx = Math.round(f.x + sway * 0.6);
                const cy = baseGroundY - Math.max(2, Math.floor(f.h * 0.55));
                pRect(cx - 1, cy, 3, 1, '#16a34a');
                pRect(cx - 1, cy - 1, 3, 1, f.cloverCol);
                pRect(cx, cy - 2, 1, 1, '#ffffff');
            }

        } else if (f.type === 'sunflower') {
            const stemShade = isLightMode ? '#15803d' : '#14532d';
            const stemHi = isLightMode ? '#22c55e' : '#1b5e3a';
            const leafCol = isLightMode ? '#16a34a' : '#15803d';
            const leafHi = isLightMode ? '#4ade80' : '#22c55e';
            let topX = f.x;
            const topY = baseGroundY - Math.floor(f.h);

            pRect(f.x - 2, baseGroundY - 1, 5, 2, stemShade);
            pRect(f.x - 3, baseGroundY - 2, 2, 1, leafCol);
            pRect(f.x + 2, baseGroundY - 2, 2, 1, leafCol);

            for (let y = 0; y < f.h; y++) {
                const sway = Math.sin(time * 0.0016 + f.phase + y * 0.05) * (y / f.h) * 3.0;
                const px = f.x + sway;
                const py = baseGroundY - y;
                if (y === Math.floor(f.h) - 1) topX = px;
                pRect(px, py, 2, 1, stemShade);
                pRect(px, py, 1, 1, stemHi);

                if (y === Math.floor(f.h * 0.32) || y === Math.floor(f.h * 0.54) || y === Math.floor(f.h * 0.74)) {
                    const side = (y === Math.floor(f.h * 0.54)) ? -1 : 1;
                    const petioleX = px + (side > 0 ? 2 : -1);
                    pRect(petioleX, py, 1, 1, stemShade);
                    pRect(petioleX + side, py - 1, 3, 2, leafCol);
                    pRect(petioleX + side * 2, py, 3, 2, leafCol);
                    pRect(petioleX + side, py - 1, 2, 1, leafHi);
                }
            }
            const hr = f.headR || 4;
            pRect(topX - 2, topY + 1, 5, 2, stemShade);
            for (let dy = -hr - 1; dy <= hr + 1; dy++) {
                for (let dx = -hr - 1; dx <= hr + 1; dx++) {
                    const d2 = dx * dx + dy * dy;
                    if (d2 <= 3) {
                        pRect(topX + dx, topY + dy, 1, 1, (dx + dy) % 2 === 0 ? '#451a03' : '#78350f');
                    } else if (d2 <= 6) {
                        pRect(topX + dx, topY + dy, 1, 1, '#92400e');
                    } else if (d2 <= hr * hr + 2) {
                        const isOuterTip = d2 > (hr - 1) * (hr - 1);
                        const petalCol = isOuterTip ? '#fde047' : ((dx + dy) % 2 === 0 ? '#facc15' : '#f59e0b');
                        pRect(topX + dx, topY + dy, 1, 1, petalCol);
                    }
                }
            }
            f.tipX = topX;
            f.tipY = topY;

        } else if (f.type === 'foxglove' || f.type === 'loosestrife') {
            const stemShade = isLightMode ? '#15803d' : '#115e59';
            const rosetteCol = isLightMode ? '#16a34a' : '#0f5138';
            let topX = f.x;

            pRect(f.x - 3, baseGroundY - 1, 7, 2, stemShade);
            pRect(f.x - 4, baseGroundY - 2, 3, 1, rosetteCol);
            pRect(f.x + 2, baseGroundY - 2, 3, 1, rosetteCol);

            for (let y = 0; y < f.h; y++) {
                const prog = y / f.h;
                const sway = Math.sin(time * 0.0017 + f.phase + y * 0.05) * prog * 2.8;
                const px = f.x + sway;
                const py = baseGroundY - y;
                topX = px;
                pRect(px, py, 1, 1, stemShade);

                if (y === Math.floor(f.h * 0.22) || y === Math.floor(f.h * 0.34)) {
                    const lSide = y % 2 === 0 ? -2 : 1;
                    pRect(px + lSide, py, 2, 1, rosetteCol);
                }

                if (prog > 0.38 && y % 3 === 0) {
                    const side = (y % 6 === 0) ? -1 : 1;
                    pRect(px + side, py, 1, 1, stemShade);
                    if (prog > 0.86) {
                        pRect(px + side, py, 2, 1, f.hue);
                    } else {
                        const bellX = px + (side < 0 ? -3 : 1);
                        pRect(bellX, py, 3, 2, f.hue);
                        pRect(bellX + (side < 0 ? 0 : 2), py + 1, 1, 1, '#fdf4ff');
                    }
                }
            }
            pRect(topX, baseGroundY - f.h - 1, 1, 2, f.hue);
            f.tipX = topX;
            f.tipY = baseGroundY - f.h;

        } else if (f.type === 'buddleia') {
            const stemCol = isLightMode ? '#15803d' : '#0d4a3a';
            let tipX = f.x;
            let tipY = baseGroundY - f.h;
            for (let y = 0; y < f.h; y++) {
                const prog = y / f.h;
                const sway = Math.sin(time * 0.0016 + f.phase + y * 0.05) * prog * 3.2 + (f.tilt || 0) * y * 0.7;
                const px = f.x + sway;
                const py = baseGroundY - y;
                tipX = px;
                tipY = py;
                pRect(px, py, 1, 1, stemCol);
                if (y === Math.floor(f.h * 0.35) || y === Math.floor(f.h * 0.52)) {
                    pRect(px - 2, py, 5, 1, isLightMode ? '#22c55e' : '#10b981');
                }
                if (prog > 0.55 && y % 2 === 0) {
                    const coneW = Math.max(1, Math.round((1 - prog) * 5.5));
                    pRect(px - coneW, py, coneW * 2 + 1, 2, f.hue);
                    pRect(px, py, 1, 1, '#fef08a');
                }
            }
            f.tipX = tipX;
            f.tipY = tipY;

        } else if (f.type === 'hydrangea') {
            const sway = Math.sin(time * 0.0012 + f.phase) * 1.2;
            const cx = f.x + sway;
            const cy = baseGroundY - f.r;
            pRect(cx - f.r - 2, baseGroundY - 3, (f.r + 2) * 2, 3, isLightMode ? '#15803d' : '#064e3b');
            for (let dy = -f.r; dy <= f.r * 0.6; dy += 2) {
                const span = Math.round(f.r * Math.sqrt(Math.max(0, 1 - (dy * dy) / (f.r * f.r))));
                for (let dx = -span; dx <= span; dx += 2) {
                    pRect(cx + dx, cy + dy, 2, 2, (dx + dy) % 4 === 0 ? '#fdf4ff' : f.hue);
                }
            }
            f.tipX = cx;
            f.tipY = cy - f.r;

        } else if (f.type === 'meadow') {
            const stemShade = isLightMode ? '#15803d' : '#14332a';
            const leafAccent = isLightMode ? '#22c55e' : '#1b4d3e';
            let topX = f.x;
            const maxH = Math.floor(f.h);

            pRect(f.x - 1, baseGroundY - 1, 3, 2, stemShade);
            pRect(f.x - 2, baseGroundY - 2, 1, 2, leafAccent);
            pRect(f.x + 2, baseGroundY - 2, 1, 2, leafAccent);

            for (let y = 0; y < maxH; y++) {
                const prog = y / Math.max(1, maxH);
                const sway = Math.sin(time * 0.0018 + f.phase + y * 0.07) * prog * 2.8;
                const px = f.x + sway;
                const py = baseGroundY - y;
                topX = px;
                pRect(px, py, 1, 1, stemShade);

                if (y === Math.floor(maxH * 0.42)) {
                    const side = (f.x % 2 === 0) ? -1 : 1;
                    pRect(px + side, py, 2 * side, 1, leafAccent);
                }

                if (f.hasBloom && f.kind === 'lavender' && y > maxH - 9 && y % 2 === 0) {
                    pRect(px - 1, py, 3, 1, y >= maxH - 3 ? '#c084fc' : '#9333ea');
                    if (y === maxH - 1) pRect(px, py - 1, 1, 1, '#e9d5ff');
                }
            }

            const headY = baseGroundY - maxH;
            if (f.hasBloom) {
                if (f.kind === 'daisy') {
                    pRect(topX - 1, headY + 1, 3, 1, stemShade);
                    pRect(topX - 3, headY - 1, 7, 2, '#f8fafc');
                    pRect(topX - 2, headY - 2, 5, 4, '#ffffff');
                    pRect(topX - 1, headY - 1, 3, 2, '#facc15');
                    pRect(topX, headY - 1, 1, 1, '#f59e0b');
                } else if (f.kind === 'poppy') {
                    pRect(topX - 1, headY + 1, 3, 1, stemShade);
                    pRect(topX - 3, headY - 2, 7, 3, '#e11d48');
                    pRect(topX - 2, headY - 3, 5, 3, '#fb7185');
                    pRect(topX - 3, headY - 3, 2, 1, '#fda4af');
                    pRect(topX + 2, headY - 3, 2, 1, '#fda4af');
                    pRect(topX - 1, headY - 1, 3, 2, '#1e1b4b');
                    pRect(topX, headY - 1, 1, 1, '#fef08a');
                } else if (f.kind === 'buttercup') {
                    pRect(topX - 1, headY + 1, 3, 1, stemShade);
                    pRect(topX - 2, headY - 1, 5, 2, '#f59e0b');
                    pRect(topX - 2, headY - 2, 5, 2, '#fde047');
                    pRect(topX - 1, headY - 2, 3, 1, '#fef9c3');
                    pRect(topX, headY - 1, 1, 1, '#d97706');
                } else if (f.kind === 'echinacea') {
                    pRect(topX - 1, headY + 1, 3, 1, stemShade);
                    pRect(topX - 3, headY, 2, 2, '#f472b6');
                    pRect(topX + 2, headY, 2, 2, '#f472b6');
                    pRect(topX - 2, headY - 1, 5, 2, '#ec4899');
                    pRect(topX - 1, headY - 2, 3, 2, '#b45309');
                    pRect(topX, headY - 2, 1, 1, '#f59e0b');
                } else if (f.kind === 'nightbloom') {
                    pRect(topX - 1, headY + 1, 3, 1, stemShade);
                    pRect(topX - 2, headY - 1, 5, 3, '#38bdf8');
                    pRect(topX - 1, headY - 2, 3, 2, '#7dd3fc');
                    pRect(topX, headY - 1, 1, 1, '#e0f2fe');
                }
            }
            f.tipX = topX;
            f.tipY = headY;

            // BÖLÜM SONU: ÇAYIR VE ÇİÇEKLİ BİTKİLER
        } else if (f.type === 'hornwort') {
            // BÖLÜM BAŞI: SULAK ALAN VE AKVARYUM BİTKİLERİ
            for (let y = 0; y < f.h; y++) {
                const sway = Math.sin(time * 0.0018 + f.phase + y * 0.06) * (y / f.h) * 5;
                const px = f.x + sway;
                const py = ph - y;
                pRect(px, py, 1, 1, isLightMode ? '#15803d' : '#065f46');
                if (y > 4 && y % 4 === 0) {
                    const span = Math.max(2, Math.round(f.whorlSpan * (1 - (y / f.h) * 0.35)));
                    for (let wx = -span; wx <= span; wx++) {
                        if (wx === 0) continue;
                        const needleY = py - Math.abs(wx) * 0.45;
                        const isTip = Math.abs(wx) === span;
                        const col = (!isLightMode && isTip) ? f.glowCol : (isLightMode ? '#22c55e' : '#047857');
                        pRect(px + wx, needleY, 1, 1, col);
                    }
                }
                if (!isLightMode && y === Math.floor(f.h) - 1) {
                    pRect(px - 1, py - 1, 3, 2, '#6ee7b7');
                }
            }

        } else if (f.type === 'pistia') {
            const drift = Math.sin(time * 0.0012 + f.phase) * 3.5;
            const px = f.x + drift;
            pRect(px - 4, 2, 9, 2, isLightMode ? '#22c55e' : '#15803d');
            pRect(px - 2, 1, 5, 1, '#86efac');
            for (let r = 0; r < f.rootLen; r++) {
                const rw = Math.sin(time * 0.002 + r * 0.25 + f.phase) * 1.5;
                pRect(px - 1 + rw, 4 + r, 1, 1, 'rgba(167, 243, 208, 0.35)');
                if (r < f.rootLen * 0.7) pRect(px + 1 + rw, 4 + r, 1, 1, 'rgba(52, 211, 153, 0.25)');
            }

        } else if (f.type === 'wisteria_cluster') {
            for (let y = 0; y < f.len; y++) {
                const sway = Math.sin(time * 0.0015 + f.phase + y * 0.09) * (y / f.len) * 3.5;
                const px = f.x + sway;
                const py = f.branchY + y;
                pRect(px, py, 1, 1, '#14532d');
                if (y > 2 && y % 2 === 0) {
                    const prog = y / f.len;
                    const halfW = Math.max(0, Math.round((1 - prog) * 3.2));
                    for (let dx = -halfW; dx <= halfW; dx++) {
                        const petalCol = (dx === 0 && y % 4 === 0) ? '#fdf4ff' : f.hue;
                        pRect(px + dx, py, 1, 2, petalCol);
                    }
                }
            }

        } else if (f.type === 'fern') {
            for (let i = 1; i <= 3; i++) {
                const side = (i === 2) ? -f.dir : f.dir;
                const fh = f.h * (0.65 + i * 0.12);
                for (let y = 0; y < fh; y++) {
                    const curve = Math.pow(y / fh, 1.4) * 6 * side + Math.sin(time * 0.0016 + f.phase) * 1.5;
                    const px = f.x + curve;
                    const py = baseGroundY - y;
                    pRect(px, py, 1, 1, isLightMode ? '#15803d' : '#065f46');
                    if (y % 2 === 0 && y < fh - 2) {
                        const pinna = Math.max(1, Math.round((1 - y / fh) * 3));
                        pRect(px - pinna, py, pinna * 2 + 1, 1, isLightMode ? '#22c55e' : '#10b981');
                    }
                }
            }

        } else if (f.type === 'glow_mushroom') {
            const sway = Math.sin(time * 0.002 + f.phase) * 0.8;
            for (let y = 0; y < f.h; y++) {
                pRect(f.x + sway * (y / f.h), baseGroundY - y, 1, 1, '#cbd5e1');
            }
            const cx = f.x + sway;
            const cy = baseGroundY - f.h;
            pRect(cx - f.capR, cy, f.capR * 2 + 1, 2, f.col);
            pRect(cx - f.capR + 1, cy - 1, (f.capR - 1) * 2 + 1, 1, '#e0f2fe');
            if (!isLightMode) {
                pRect(cx - f.capR - 1, cy - 2, f.capR * 2 + 3, 4, 'rgba(56, 189, 248, 0.22)');
            }

        } else if (f.type === 'iris') {
            const bladeCol = isLightMode ? '#15803d' : '#0d5946';
            for (let blade = -1; blade <= 1; blade++) {
                const bh = f.h * (blade === 0 ? 1 : 0.76);
                for (let y = 0; y < bh; y += 2) {
                    const sway = Math.sin(time * 0.0015 + f.phase + y * 0.05) * (y / bh) * 2.4 + blade * (y * 0.14);
                    pRect(f.x + sway, baseGroundY - y, blade === 0 ? 2 : 1, 2, bladeCol);
                }
            }
            const topX = f.x + Math.sin(time * 0.0015 + f.phase + f.h * 0.05) * 2.4;
            const topY = baseGroundY - f.h;
            pRect(topX - 3, topY - 1, 7, 2, f.col);
            pRect(topX - 1, topY - 3, 3, 3, f.col);
            pRect(topX, topY - 2, 1, 2, '#fef9c3');

        } else if (f.type === 'papyrus') {
            let topX = f.x;
            const topY = baseGroundY - Math.floor(f.h);
            for (let y = 0; y < f.h; y += 2) {
                const sway = Math.sin(time * 0.0014 + f.phase + y * 0.05) * (y / f.h) * 3;
                topX = f.x + sway;
                pRect(topX, baseGroundY - y, 2, 2, isLightMode ? '#166534' : '#0c4a38');
            }
            for (let r = -5; r <= 5; r++) {
                pRect(topX + r, topY - 2 - (Math.abs(r) < 3 ? 1 : 0), 1, 2, isLightMode ? '#22c55e' : '#10b981');
            }

        } else if (f.type === 'val' || f.type === 'ludwigia') {
            for (let y = 0; y < f.h; y++) {
                const sway = Math.sin(time * 0.0016 + f.phase + y * 0.07) * (y / f.h) * 4;
                const px = f.x + sway;
                const py = ph - y;
                const stemCol = f.type === 'ludwigia' ? '#881337' : (isLightMode ? '#15803d' : '#0f3d2e');
                const leafCol = f.type === 'ludwigia' ? '#fb7185' : (isLightMode ? '#22c55e' : '#10b981');
                pRect(px, py, 2, 1, stemCol);
                if (f.type === 'ludwigia' && y % 4 === 0 && y > 6) {
                    pRect(px - 3, py, 7, 1, leafCol);
                }
            }

        } else if (f.type === 'reed') {
            const stemCol = isLightMode ? '#166534' : '#0d4a3a';
            const bladeCol = isLightMode ? '#15803d' : '#115e49';
            let tipX = f.x;
            for (let y = 0; y < f.h; y++) {
                const prog = y / f.h;
                const sway = Math.sin(time * 0.0015 + f.phase + y * 0.045) * prog * 3.5 + (f.tilt || 0) * y;
                const px = f.x + sway;
                const py = baseGroundY - y;
                tipX = px;
                pRect(px, py, 1, 1, stemCol);

                if (y < f.h * 0.65 && y % 2 === 0) {
                    const bladeSpread = Math.sin(prog * Math.PI) * 3.5;
                    pRect(px - bladeSpread, py, 1, 2, bladeCol);
                    pRect(px + bladeSpread, py + 1, 1, 2, bladeCol);
                }

                if (f.hasCat && y > f.h - 17 && y < f.h - 5) {
                    pRect(px - 1, py, 3, 1, '#451a03');
                    pRect(px, py, 1, 1, '#78350f');
                    if (y === Math.floor(f.h - 6)) {
                        pRect(px - 1, py - 1, 2, 1, '#fef3c7');
                    }
                }
            }
            f.tipX = tipX;
            f.tipY = baseGroundY - f.h;

        } else if (f.type === 'lily') {
            const padCol1 = isLightMode ? '#15803d' : '#0f4c3a';
            const padCol2 = isLightMode ? '#16a34a' : '#14634b';
            const driftX = f.x + Math.sin(time * 0.001 + (f.phase || 0)) * 1.2;
            pRect(driftX - f.r + 1, f.y + 2, f.r * 2 - 2, 2, 'rgba(2, 10, 18, 0.35)');
            for (let dy = -Math.ceil(f.r * 0.55); dy <= Math.ceil(f.r * 0.55); dy++) {
                for (let dx = -f.r; dx <= f.r; dx++) {
                    if ((dx * dx) / (f.r * f.r) + (dy * dy) / ((f.r * 0.55) * (f.r * 0.55)) <= 1) {
                        if (dx > 0 && Math.abs(dy) <= 0) continue;
                        pRect(driftX + dx, f.y + dy, 1, 1, (dx + dy) % 2 === 0 ? padCol1 : padCol2);
                    }
                }
            }
            if (f.flower) {
                pRect(driftX - 2, f.y - 2, 5, 2, f.flowerCol || '#f472b6');
                pRect(driftX - 1, f.y - 3, 3, 3, f.flowerCol || '#f472b6');
                pRect(driftX, f.y - 2, 1, 1, '#fef08a');
            }

            // BÖLÜM SONU: SULAK ALAN VE AKVARYUM BİTKİLERİ
        } else if (f.type === 'brain_coral') {
            // BÖLÜM BAŞI: RESİF VE DENİZ CANLILARI
            for (let dy = -f.r; dy <= 0; dy++) {
                for (let dx = -f.r; dx <= f.r; dx++) {
                    if (dx * dx + dy * dy <= f.r * f.r) {
                        const groove = Math.sin(dx * 1.4 + dy * 1.2) > 0.2;
                        const col = groove ? `hsla(${f.hue}, 95%, 68%, 0.88)` : `hsla(${f.hue}, 75%, 28%, 0.88)`;
                        pRect(f.x + dx, baseGroundY + dy, 1, 1, col);
                    }
                }
            }

        } else if (f.type === 'tube_sponge') {
            [-3, 0, 3].forEach((ox, idx) => {
                const th = Math.round(f.h * (idx === 1 ? 1 : 0.72));
                for (let y = 0; y < th; y++) {
                    const col = y >= th - 2 ? '#fef08a' : `hsla(${f.hue}, 85%, ${35 + (y / th) * 25}%, 0.85)`;
                    pRect(f.x + ox, baseGroundY - y, 2, 1, col);
                }
            });

        } else if (f.type === 'sea_fan') {
            for (let y = 0; y < f.h; y++) {
                const sway = Math.sin(time * 0.0014 + f.phase + y * 0.08) * (y / f.h) * 2.5;
                const spread = Math.round(Math.sin((y / f.h) * Math.PI) * 6);
                const px = f.x + sway;
                const py = baseGroundY - y;
                for (let dx = -spread; dx <= spread; dx += 2) {
                    if ((dx + y) % 2 === 0) {
                        pRect(px + dx, py, 1, 1, `hsla(${f.hue}, 90%, 62%, 0.72)`);
                    }
                }
            }

        } else if (f.type === 'kelp') {
            for (let y = 0; y < f.h; y++) {
                const sway = Math.sin(time * 0.0015 + f.phase + y * 0.07) * (y / f.h) * 5;
                const px = f.x + sway;
                const py = baseGroundY - y;
                pRect(px, py, 1, 1, '#0d9488');
                if (y % 5 === 0 && y > 6) {
                    const side = (y % 10 === 0) ? -3 : 1;
                    pRect(px + side, py, 3, 2, '#2dd4bf');
                }
            }

        } else if (f.type === 'anemone') {
            pRect(f.x - 3, baseGroundY - 3, 7, 4, '#3b0764');
            for (let t = -3; t <= 3; t++) {
                const sway = Math.sin(time * 0.003 + f.phase + t) * 1.8;
                for (let y = 3; y <= 12; y++) {
                    pRect(f.x + t * 1.4 + sway * (y / 12), baseGroundY - y, 1, 1, y === 12 ? '#fef08a' : `hsla(${f.hue}, 90%, 65%, 0.82)`);
                }
            }
            // BÖLÜM SONU: RESİF VE DENİZ CANLILARI
        }
    });
}

// ============================================================================
// BÖLÜM SONU: FLORA VE BİTKİ KÜMELERİNİN HAREKETLİ ÇİZİMİ
// ============================================================================
