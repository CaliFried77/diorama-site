import { pw, ph, lerpHex } from './07-habitat-state.js';
import { isLightMode } from './01-core-ui.js';
import { getGroundY } from './habitat-geometry.js';
import { getArcticLedges } from './arctic-geometry.js';

/* HABITAT BACKGROUNDS — cached static pixel-art environment layers. */

// ============================================================================
// BÖLÜM BAŞI: ÖNBELLEKLENEN STATİK HABİTAT KATMANLARI
// Bu fonksiyon animasyon döngüsünden ayrı çalışır; habitat/tema/boyut değişince yeniden üretilir.
// ============================================================================

export function buildStaticEnvironmentLayer(hab) {
    const off = document.createElement('canvas');
    off.width = pw;
    off.height = ph;
    const sCtx = off.getContext('2d');
    const sRect = (x, y, w, h, col) => {
        sCtx.fillStyle = col;
        sCtx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    };

    const mistCol = isLightMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(148, 163, 184, 0.035)';
    sRect(0, ph - 28, pw, 10, mistCol);

    if (hab.sceneProfile === 'meadow') {
        // BÖLÜM BAŞI: ÇAYIR STATİK ÇEVRESİ
        const trunkDark = isLightMode ? '#451a03' : '#181014';
        const trunkMid = isLightMode ? '#78350f' : '#291b22';
        const trunkHi = isLightMode ? '#92400e' : '#3d2832';
        const leafDark = isLightMode ? '#14532d' : '#08221d';
        const leafMid = isLightMode ? '#15803d' : '#10382e';
        const leafHi = isLightMode ? '#22c55e' : '#1b5442';

        const drawLeafCluster = (cx, cy, rx, ry, blossoms = false, blossomCol = '#fda4af') => {
            for (let dy = -ry; dy <= ry; dy++) {
                const ratio = 1 - (dy * dy) / (ry * ry);
                if (ratio <= 0) continue;
                const scallop = Math.sin(dy * 0.65 + cx * 0.14) * 2.2;
                const span = Math.max(1, Math.round(rx * Math.sqrt(ratio) + scallop));
                const col = dy < -ry * 0.26 ? leafHi : (dy > ry * 0.34 ? leafDark : leafMid);
                sRect(cx - span, cy + dy, span * 2, 1, col);
            }
            if (blossoms) {
                [[-0.45, -0.25], [0.35, -0.30], [-0.15, 0.20], [0.42, 0.18], [0.05, -0.42]].forEach(([bx, by]) => {
                    const px = Math.round(cx + bx * rx);
                    const py = Math.round(cy + by * ry);
                    sRect(px, py, 2, 2, blossomCol);
                    sRect(px, py, 1, 1, '#fff1f2');
                });
            }
        };

        const drawOrchardTree = (baseX, baseY, height, baseWidth, leanDir, blossoms, blossomCol) => {
            const topY = baseY - height;
            for (let y = topY; y < baseY; y++) {
                const prog = (y - topY) / height;
                const curve = Math.sin(prog * Math.PI * 0.9) * 3.5 * leanDir;
                const flare = prog > 0.72 ? Math.pow((prog - 0.72) / 0.28, 2) * (baseWidth * 1.1) : 0;
                const w = Math.round(baseWidth * (0.45 + prog * 0.55) + flare);
                const left = Math.round(baseX + curve - w * 0.5);
                sRect(left, y, w, 1, trunkDark);
                sRect(left + Math.floor(w * 0.35), y, Math.max(1, Math.floor(w * 0.35)), 1, trunkMid);
                sRect(left + (leanDir >= 0 ? w - 2 : 1), y, 1, 1, trunkHi);
            }
            [-1, 1].forEach(dir => {
                const reach = Math.round(height * (dir === leanDir ? 0.34 : 0.25));
                for (let s = 0; s < reach; s++) {
                    const t = s / reach;
                    const bx = baseX + dir * s;
                    const by = topY + Math.round(height * 0.18 - Math.sin(t * Math.PI * 0.65) * 10);
                    const thick = Math.max(2, Math.round((baseWidth * 0.45) * (1 - t * 0.7)));
                    sRect(bx, by, 1, thick, trunkDark);
                    sRect(bx, by, 1, 1, trunkHi);
                }
            });

            const rx = Math.round(height * 0.34);
            const ry = Math.round(height * 0.20);
            drawLeafCluster(baseX - Math.round(rx * 0.65), topY + 8, Math.round(rx * 0.82), Math.round(ry * 0.82), false);
            drawLeafCluster(baseX + Math.round(rx * 0.68), topY + 6, Math.round(rx * 0.85), Math.round(ry * 0.84), blossoms, blossomCol);
            drawLeafCluster(baseX, topY - 4, rx, ry, blossoms, blossomCol);
            drawLeafCluster(baseX + leanDir * 8, topY - 10, Math.round(rx * 0.75), Math.round(ry * 0.72), blossoms, blossomCol);
        };

        const hillCol = isLightMode ? 'rgba(22, 101, 52, 0.18)' : 'rgba(13, 56, 44, 0.42)';
        for (let x = 0; x < pw; x++) {
            const nx = x / Math.max(1, pw);
            const h = Math.round(14 + Math.sin(nx * Math.PI * 2.5) * 8 + Math.cos(x * 0.04) * 3);
            const gy = getGroundY(x, 'meadow');
            sRect(x, gy - h, 1, h, hillCol);
        }

        const leftTree1X = 24;
        const leftTree2X = Math.round(pw * 0.19);
        drawOrchardTree(leftTree2X, getGroundY(leftTree2X, 'meadow') + 2, 90, 9, 1, true, '#fbbf24');
        drawOrchardTree(leftTree1X, getGroundY(leftTree1X, 'meadow') + 3, 116, 13, 1, true, '#fda4af');

        const rightTreeX = pw - 20;
        drawOrchardTree(rightTreeX, getGroundY(rightTreeX, 'meadow') + 3, 102, 11, -1, true, '#fda4af');

        const turfTop = isLightMode ? '#16a34a' : '#0f392b';
        const turfDeep = isLightMode ? '#14532d' : '#071f18';
        for (let x = 0; x < pw; x++) {
            const gy = getGroundY(x, 'meadow');
            sRect(x, gy, 1, ph - gy, turfDeep);
            sRect(x, gy, 1, 2, turfTop);
        }

        const hx = Math.round(pw * 0.84);
        const hgy = getGroundY(hx, 'meadow') + 1;

        drawLeafCluster(hx - 20, hgy - 11, 14, 10, true, '#c084fc');
        drawLeafCluster(hx + 19, hgy - 13, 16, 11, true, '#fb7185');

        const stoneDark = isLightMode ? '#475569' : '#1e293b';
        const stoneHi = isLightMode ? '#94a3b8' : '#475569';
        sRect(hx - 19, hgy, 38, 3, 'rgba(2, 10, 14, 0.45)');
        sRect(hx - 17, hgy - 5, 34, 6, stoneDark);
        for (let sx = hx - 15; sx <= hx + 11; sx += 6) {
            sRect(sx, hgy - 4, 4, 3, stoneHi);
        }
        sRect(hx - 16, hgy - 7, 32, 2, trunkDark);
        sRect(hx - 15, hgy - 7, 30, 1, trunkHi);

        const boxLight = isLightMode ? '#fef3c7' : '#eab308';
        const boxMid = isLightMode ? '#fde68a' : '#ca8a04';
        const boxShadow = isLightMode ? '#f59e0b' : '#a16207';
        const bodyTop = hgy - 37;
        const bodyH = 30;

        sRect(hx - 13, bodyTop, 26, bodyH, boxLight);
        sRect(hx + 7, bodyTop, 6, bodyH, boxMid);
        sRect(hx - 13, bodyTop, 2, bodyH, trunkMid);
        sRect(hx + 11, bodyTop, 2, bodyH, trunkDark);

        [hgy - 17, hgy - 27].forEach(seamY => {
            sRect(hx - 13, seamY, 26, 2, trunkDark);
            sRect(hx - 12, seamY, 24, 1, trunkHi);
            sRect(hx - 4, seamY + 4, 6, 1, boxShadow);
        });

        sRect(hx - 5, hgy - 24, 8, 5, trunkDark);
        sRect(hx - 4, hgy - 23, 6, 3, '#f59e0b');
        sRect(hx - 3, hgy - 22, 4, 1, '#fef08a');

        sRect(hx - 6, hgy - 10, 10, 3, '#181014');
        sRect(hx - 5, hgy - 11, 8, 1, trunkMid);
        sRect(hx - 4, hgy - 8, 6, 1, '#fef08a');

        for (let r = 0; r <= 11; r++) {
            const halfW = 18 - Math.floor(r * 1.45);
            const ry = bodyTop - 1 - r;
            const roofCol = r % 3 === 0 ? trunkDark : (r % 2 === 0 ? trunkHi : trunkMid);
            sRect(hx - halfW, ry, halfW * 2, 1, roofCol);
        }
        sRect(hx - 1, bodyTop - 15, 2, 4, trunkDark);
        sRect(hx, bodyTop - 15, 1, 3, '#fbbf24');

        sRect(hx - 19, bodyTop + 2, 7, 2, trunkDark);
        sRect(hx - 19, bodyTop + 2, 6, 1, trunkHi);
        // BÖLÜM SONU: ÇAYIR STATİK ÇEVRESİ
    }

    else if (hab.sceneProfile === 'wetland') {
        // BÖLÜM BAŞI: SULAK ALAN STATİK ÇEVRESİ
        const waterHorizonY = ph - 52;
        const farReedCol = isLightMode ? 'rgba(20, 83, 45, 0.28)' : 'rgba(6, 46, 38, 0.52)';
        const farTreeCol = isLightMode ? 'rgba(15, 62, 52, 0.22)' : 'rgba(4, 32, 30, 0.45)';
        for (let x = 0; x < pw; x += 2) {
            const nx = x / Math.max(1, pw);
            const shoreMask = Math.abs(nx - 0.5) > 0.16 ? 1.0 : 0.45;
            const rh = Math.round((10 + Math.sin(x * 0.09) * 5 + Math.cos(x * 0.23) * 3) * shoreMask);
            sRect(x, waterHorizonY - rh, 2, rh + 2, farReedCol);
            if ((x % 14 === 0) && (nx < 0.36 || nx > 0.64)) {
                const treeH = 18 + (x % 11);
                for (let dy = -treeH; dy <= 0; dy++) {
                    const span = Math.round((8 + (x % 5)) * Math.sqrt(Math.max(0, 1 - (dy * dy) / (treeH * treeH))));
                    sRect(x - span, waterHorizonY - 6 + dy, span * 2, 1, farTreeCol);
                }
            }
        }

        const waterTop = isLightMode ? '#0e7490' : '#082f49';
        const waterMid = isLightMode ? '#115e59' : '#062830';
        const waterDeep = isLightMode ? '#134e4a' : '#03171e';
        const waterSteps = 26;
        for (let s = 0; s < waterSteps; s++) {
            const t = s / (waterSteps - 1);
            const wy = Math.floor(waterHorizonY + t * (ph - waterHorizonY));
            const wh = Math.ceil((ph - waterHorizonY) / waterSteps) + 1;
            const col = t < 0.5 ? lerpHex(waterTop, waterMid, t * 2) : lerpHex(waterMid, waterDeep, (t - 0.5) * 2);
            sRect(0, wy, pw, wh, col);
        }
        sRect(0, waterHorizonY, pw, 1, isLightMode ? 'rgba(186, 230, 253, 0.45)' : 'rgba(45, 212, 191, 0.18)');

        const islands = [
            { cx: Math.round(pw * 0.44), y: ph - 21, rx: 22, ry: 5 },
            { cx: Math.round(pw * 0.58), y: ph - 25, rx: 19, ry: 4 }
        ];
        islands.forEach(isl => {
            sRect(isl.cx - isl.rx + 2, isl.y + 2, (isl.rx - 2) * 2, 5, 'rgba(2, 12, 18, 0.42)');
            for (let dy = -isl.ry; dy <= 2; dy++) {
                const span = Math.round(isl.rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / ((isl.ry + 2) * (isl.ry + 2)))));
                const col = dy < -1 ? (isLightMode ? '#16a34a' : '#0f5138') : (isLightMode ? '#14532d' : '#082f24');
                sRect(isl.cx - span, isl.y + dy, span * 2, 1, col);
            }
        });

        const willowDark = isLightMode ? '#3b281e' : '#14141b';
        const willowMid = isLightMode ? '#573b2c' : '#24222c';
        const willowHi = isLightMode ? '#78523d' : '#363240';
        const canopyDark = isLightMode ? '#14532d' : '#062e24';
        const canopyMid = isLightMode ? '#15803d' : '#0b4635';
        const canopyHi = isLightMode ? '#22c55e' : '#136348';
        const reach = Math.min(145, Math.round(pw * 0.26));

        [
            { isLeft: true, dir: 1 },
            { isLeft: false, dir: -1 }
        ].forEach(wTree => {
            const edgeX = wTree.isLeft ? 0 : pw - 1;
            const bankY = getGroundY(edgeX, 'wetland') + 4;

            for (let y = 0; y < bankY; y++) {
                const prog = y / bankY;
                const lean = Math.sin((1 - prog) * Math.PI * 0.5) * 12 * wTree.dir;
                const rootFlare = prog > 0.72 ? Math.pow((prog - 0.72) / 0.28, 2) * 16 : 0;
                const tw = Math.round(13 + prog * 6 + rootFlare);
                const tx = wTree.isLeft ? Math.max(0, Math.round(lean)) : Math.min(pw - tw, Math.round(pw - tw + lean));
                sRect(tx, y, tw, 1, willowDark);
                sRect(tx + (wTree.isLeft ? tw - 4 : 2), y, 3, 1, willowMid);
                sRect(tx + (wTree.isLeft ? tw - 1 : 0), y, 1, 1, willowHi);
            }

            [0.08, 0.30, 0.52, 0.74, 0.92].forEach(tNode => {
                const cx = Math.round(wTree.isLeft ? (tNode * reach) : (pw - tNode * reach));
                const branchY = Math.round(6 + Math.pow(tNode, 1.2) * 14);
                const rx = Math.round(28 * (1 - tNode * 0.32));
                const bottomY = branchY + Math.round(8 * (1 - tNode * 0.3));

                for (let y = 0; y <= bottomY; y++) {
                    const normY = (y - branchY * 0.5) / Math.max(1, bottomY - branchY * 0.5);
                    const ellipse = Math.max(0, 1 - normY * normY);
                    const span = Math.round(rx * (y < branchY * 0.5 ? 1 : Math.sqrt(ellipse)));
                    const col = y < branchY * 0.35 ? canopyHi : (y > branchY ? canopyDark : canopyMid);
                    sRect(cx - span, y, span * 2, 1, col);
                }
            });

            for (let s = 0; s <= reach; s++) {
                const t = s / Math.max(1, reach);
                const bx = wTree.isLeft ? s : (pw - 1 - s);
                const by = Math.round(6 + Math.pow(t, 1.2) * 14 + Math.sin(bx * 0.08) * 1.5);
                const thick = Math.max(2, Math.round(9 * (1 - t * 0.75)));
                sRect(bx, by - Math.floor(thick * 0.5), 1, thick, willowDark);
                sRect(bx, by + Math.ceil(thick * 0.5) - 1, 1, 1, willowHi);
            }
        });

        for (let x = 0; x < pw; x++) {
            const nx = x / Math.max(1, pw);
            if (nx > 0.36 && nx < 0.64) continue;
            const gy = getGroundY(x, 'wetland');
            sRect(x, gy + 3, 1, 4, 'rgba(2, 10, 16, 0.45)');
            sRect(x, gy, 1, ph - gy, isLightMode ? '#14532d' : '#052019');
            sRect(x, gy, 1, 2, isLightMode ? '#16a34a' : '#0d4a38');
        }

        const snagX = Math.round(pw * 0.66);
        const snagY = ph - 18;
        sRect(snagX - 18, snagY + 2, 28, 3, 'rgba(2, 10, 16, 0.45)');
        for (let s = 0; s < 26; s++) {
            const sx = snagX - 16 + s;
            const sy = snagY - Math.round(Math.sin((s / 26) * Math.PI * 0.85) * 9);
            const thick = Math.max(2, 5 - Math.floor(s / 7));
            sRect(sx, sy, 1, thick, willowDark);
            sRect(sx, sy, 1, 1, willowHi);
            if (s > 4 && s < 16 && s % 3 === 0) {
                sRect(sx, sy - 1, 2, 1, isLightMode ? '#22c55e' : '#10b981');
            }
        }
        // BÖLÜM SONU: SULAK ALAN STATİK ÇEVRESİ
    }

    else if (hab.sceneProfile === 'betta-aquarium') {
        // BÖLÜM BAŞI: BETTA AKVARYUMU STATİK ÇEVRESİ
        const soilY = (x) => {
            const nx = x / Math.max(1, pw);
            const mound = Math.pow(Math.abs(nx - 0.50) * 1.95, 1.45) * 18;
            return Math.round(ph - 4 - mound - Math.sin(x * 0.04) * 2);
        };

        const bgPlantCol = isLightMode ? 'rgba(15, 82, 72, 0.24)' : 'rgba(6, 48, 44, 0.48)';
        for (let x = 0; x < pw; x += 3) {
            const nx = x / Math.max(1, pw);
            if (nx > 0.38 && nx < 0.62) continue;
            const stemH = Math.round((36 + Math.sin(x * 0.14) * 14 + Math.cos(x * 0.27) * 8) * (0.6 + Math.abs(nx - 0.5)));
            sRect(x, soilY(x) - stemH, 2, stemH, bgPlantCol);
        }

        const stoneDark = isLightMode ? '#1e293b' : '#09111e';
        const stoneMid = isLightMode ? '#334155' : '#132033';
        const stoneHi = isLightMode ? '#64748b' : '#243854';
        const mossPocket = isLightMode ? '#16a34a' : '#0d9488';

        const dragonStones = [
            { bx: pw - 58, topY: ph - 68, baseW: 38, lean: -0.22 },
            { bx: pw - 82, topY: ph - 44, baseW: 26, lean: -0.30 },
            { bx: pw - 28, topY: ph - 52, baseW: 28, lean: 0.15 }
        ];
        dragonStones.forEach((st, sIdx) => {
            const bY = ph;
            const h = bY - st.topY;
            for (let y = 0; y < h; y++) {
                const prog = y / h;
                const w = Math.round(6 + prog * st.baseW + Math.sin(y * 0.25 + sIdx) * 2);
                const cx = st.bx + Math.round((1 - prog) * h * st.lean);
                const left = cx - Math.floor(w * 0.5);
                sRect(left, st.topY + y, w, 1, stoneDark);
                sRect(left + 1, st.topY + y, Math.max(2, Math.floor(w * 0.55)), 1, stoneMid);
                sRect(left + 1, st.topY + y, 2, 1, stoneHi);
                if (y > 6 && y % 7 === 0 && w > 12) {
                    const holeX = left + 4 + ((y * 3 + sIdx * 5) % Math.max(2, w - 9));
                    sRect(holeX, st.topY + y, 4, 2, '#040811');
                    sRect(holeX, st.topY + y - 1, 3, 1, mossPocket);
                    if (!isLightMode && y % 14 === 0) {
                        sRect(holeX + 1, st.topY + y - 1, 2, 1, 'rgba(45, 212, 191, 0.55)');
                    }
                }
            }
        });

        const woodDark = isLightMode ? '#3f1d0b' : '#1a1014';
        const woodMid = isLightMode ? '#5c2d16' : '#2c1a21';
        const woodHi = isLightMode ? '#854d0e' : '#4a2c36';
        const maxTrunkX = Math.min(190, Math.floor(pw * 0.46));

        for (let x = 0; x < maxTrunkX; x++) {
            const t = x / maxTrunkX;
            const archY = Math.round(ph - 18 - Math.sin(t * Math.PI * 0.88) * 54 + Math.cos(t * 4) * 3);
            const thick = Math.max(2, Math.floor(15 * (1 - t * 0.74)));
            sRect(x, archY, 2, thick, woodDark);
            sRect(x, archY + 1, 2, Math.max(1, thick - 3), woodMid);
            sRect(x, archY, 2, 2, woodHi);

            if (t > 0.18 && t < 0.84) {
                const subT = (t - 0.18) / 0.66;
                const upperY = Math.round(archY - 12 - Math.sin(subT * Math.PI) * 24);
                const uThick = Math.max(2, Math.floor(6 * (1 - subT * 0.68)));
                sRect(x, upperY, 2, uThick, woodDark);
                sRect(x, upperY, 2, 1, woodHi);
                if (x % 2 === 0) {
                    sRect(x, upperY - 2, 2, 2, isLightMode ? '#16a34a' : '#0d9488');
                }
            }

            if (t > 0.12 && t < 0.48) {
                const legT = (t - 0.12) / 0.36;
                const legY = Math.round(archY + thick + legT * (ph - (archY + thick)));
                const legW = Math.max(2, Math.floor(7 * (1 - legT * 0.5)));
                sRect(x, legY, legW, 2, woodDark);
                sRect(x, legY, 2, 1, woodHi);
            }
        }

        const rightRootSpan = Math.min(95, Math.floor(pw * 0.24));
        for (let s = 0; s < rightRootSpan; s++) {
            const t = s / rightRootSpan;
            const rx = pw - 42 - s;
            const ry = Math.round(ph - 26 - Math.sin(t * Math.PI * 0.82) * 26 + Math.sin(t * 5) * 2);
            const rThick = Math.max(2, Math.floor(8 * (1 - t * 0.75)));
            sRect(rx, ry, 2, rThick, woodDark);
            sRect(rx, ry, 2, 1, woodHi);
            if (s % 3 === 0 && t < 0.7) {
                sRect(rx, ry - 2, 2, 2, isLightMode ? '#16a34a' : '#0d9488');
            }
        }

        const soilDark = isLightMode ? '#1e1b18' : '#090d16';
        const soilMid = isLightMode ? '#292524' : '#131c2b';
        const soilRim = isLightMode ? '#15803d' : '#0f5138';
        const sandBase = isLightMode ? '#cbd5e1' : '#334155';
        const sandHi = isLightMode ? '#f1f5f9' : '#475569';

        for (let x = 0; x < pw; x++) {
            const nx = x / Math.max(1, pw);
            const gy = soilY(x);
            const inSandCanyon = Math.abs(nx - 0.50) < 0.085;

            if (inSandCanyon) {
                const sandY = ph - 5 - Math.round(Math.cos((nx - 0.50) * 18) * 2);
                sRect(x, sandY, 1, ph - sandY, sandBase);
                sRect(x, sandY, 1, 2, sandHi);
            } else {
                sRect(x, gy, 1, ph - gy, soilDark);
                sRect(x, gy + 1, 1, Math.max(1, Math.floor((ph - gy) * 0.5)), soilMid);
                sRect(x, gy, 1, 2, soilRim);
            }
        }

        const marimoBalls = [
            { x: Math.round(pw * 0.36), r: 5 },
            { x: Math.round(pw * 0.39), r: 4 },
            { x: Math.round(pw * 0.61), r: 5 },
            { x: Math.round(pw * 0.64), r: 3 }
        ];
        marimoBalls.forEach(mb => {
            const my = soilY(mb.x) - mb.r + 2;
            sRect(mb.x - mb.r, my + mb.r - 1, mb.r * 2, 2, 'rgba(2, 8, 16, 0.5)');
            for (let dy = -mb.r; dy <= mb.r; dy++) {
                const span = Math.round(mb.r * Math.sqrt(Math.max(0, 1 - (dy * dy) / (mb.r * mb.r))));
                const col = dy < -1 ? '#22c55e' : (dy > 1 ? '#14532d' : '#15803d');
                sRect(mb.x - span, my + dy, span * 2, 1, col);
            }
        });

        [Math.round(pw * 0.43), Math.round(pw * 0.56)].forEach((lx, idx) => {
            const ly = soilY(lx);
            sRect(lx - 5, ly - 1, 10, 2, '#78350f');
            sRect(lx - 4, ly - 2, 7, 1, '#b45309');
            sRect(lx - 3 + idx * 2, ly - 1, 5, 1, '#d97706');
        });
        // BÖLÜM SONU: BETTA AKVARYUMU STATİK ÇEVRESİ
    }

    else if (hab.sceneProfile === 'botanical') {
        // BÖLÜM BAŞI: BOTANİK BAHÇE STATİK ÇEVRESİ
        const reach = Math.min(155, Math.round(pw * 0.30));

        const glassFrameCol = isLightMode ? 'rgba(30, 58, 95, 0.22)' : 'rgba(30, 27, 75, 0.52)';
        const glassPaneCol = isLightMode ? 'rgba(224, 242, 254, 0.18)' : 'rgba(129, 140, 248, 0.06)';
        const domeCx = Math.round(pw * 0.50);
        const domeBaseY = getGroundY(domeCx, 'botanical') - 2;
        const domeRx = Math.min(76, Math.round(pw * 0.16));
        const domeRy = 42;

        for (let dy = -domeRy; dy <= 0; dy++) {
            const span = Math.round(domeRx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (domeRy * domeRy))));
            sRect(domeCx - span, domeBaseY - 18 + dy, span * 2, 1, glassPaneCol);
            sRect(domeCx - span, domeBaseY - 18 + dy, 1, 1, glassFrameCol);
            sRect(domeCx + span - 1, domeBaseY - 18 + dy, 1, 1, glassFrameCol);
            if (dy % 10 === 0) {
                sRect(domeCx - span, domeBaseY - 18 + dy, span * 2, 1, glassFrameCol);
            }
        }
        [-0.6, -0.3, 0, 0.3, 0.6].forEach(rib => {
            const rx = Math.round(domeCx + rib * domeRx);
            const rh = Math.round(domeRy * Math.sqrt(Math.max(0, 1 - rib * rib)));
            sRect(rx, domeBaseY - 18 - rh, 1, rh + 18, glassFrameCol);
        });
        sRect(domeCx - domeRx, domeBaseY - 18, domeRx * 2, 18, glassPaneCol);
        sRect(domeCx - domeRx, domeBaseY - 18, domeRx * 2, 1, glassFrameCol);
        sRect(domeCx - 1, domeBaseY - 18 - domeRy - 6, 2, 6, glassFrameCol);

        const trunkDark = isLightMode ? '#3b2316' : '#161122';
        const trunkMid = isLightMode ? '#5c3724' : '#261d38';
        const trunkHi = isLightMode ? '#7c4d34' : '#3b2d54';
        const leafDark = isLightMode ? '#14532d' : '#092622';
        const leafMid = isLightMode ? '#15803d' : '#113e35';
        const leafHi = isLightMode ? '#22c55e' : '#1d5e4a';
        const blossomCrown = isLightMode ? '#d8b4fe' : '#6b21a8';

        [
            { isLeft: true, dir: 1 },
            { isLeft: false, dir: -1 }
        ].forEach(tree => {
            const edgeX = tree.isLeft ? 0 : pw - 1;
            const groundY = getGroundY(edgeX, 'botanical') + 4;

            for (let y = 0; y < groundY; y++) {
                const prog = y / groundY;
                const twist = Math.sin(y * 0.06) * 2.5 + Math.sin((1 - prog) * Math.PI * 0.5) * 10 * tree.dir;
                const rootFlare = prog > 0.72 ? Math.pow((prog - 0.72) / 0.28, 2) * 18 : 0;
                const tw = Math.round(13 + prog * 5 + rootFlare);
                const tx = tree.isLeft ? Math.max(0, Math.round(twist)) : Math.min(pw - tw, Math.round(pw - tw + twist));
                sRect(tx, y, tw, 1, trunkDark);
                sRect(tx + (tree.isLeft ? tw - 5 : 2), y, 3, 1, trunkMid);
                sRect(tx + (tree.isLeft ? tw - 2 : 0), y, 2, 1, trunkHi);
            }

            [0.06, 0.28, 0.50, 0.72, 0.90].forEach((tNode, idx) => {
                const cx = Math.round(tree.isLeft ? (tNode * reach) : (pw - tNode * reach));
                const branchY = Math.round(5 + Math.pow(tNode, 1.2) * 15);
                const rx = Math.round(30 * (1 - tNode * 0.30));
                const bottomY = branchY + Math.round(8 * (1 - tNode * 0.28));

                for (let y = 0; y <= bottomY; y++) {
                    const normY = (y - branchY * 0.5) / Math.max(1, bottomY - branchY * 0.5);
                    const ellipse = Math.max(0, 1 - normY * normY);
                    const span = Math.round(rx * (y < branchY * 0.5 ? 1 : Math.sqrt(ellipse)));
                    let col = y < branchY * 0.35 ? leafHi : (y > branchY ? leafDark : leafMid);
                    if ((y + idx) % 5 === 0 && y > branchY * 0.4) col = blossomCrown;
                    sRect(cx - span, y, span * 2, 1, col);
                }
            });

            for (let s = 0; s <= reach; s++) {
                const t = s / Math.max(1, reach);
                const bx = tree.isLeft ? s : (pw - 1 - s);
                const by = Math.round(5 + Math.pow(t, 1.2) * 15 + Math.sin(bx * 0.09) * 1.5);
                const thick = Math.max(2, Math.round(9 * (1 - t * 0.75)));
                sRect(bx, by - Math.floor(thick * 0.5), 1, thick, trunkDark);
                sRect(bx, by + Math.ceil(thick * 0.5) - 1, 1, 1, trunkHi);
            }
        });

        const gx = pw - 68;
        const archBaseY = getGroundY(gx + 16, 'botanical') + 2;
        const pillarH = 44;
        const archTopY = archBaseY - pillarH;
        const stoneDark = isLightMode ? '#475569' : '#171c2e';
        const stoneMid = isLightMode ? '#64748b' : '#242c46';
        const stoneHi = isLightMode ? '#94a3b8' : '#384366';

        [gx, gx + 28].forEach(px => {
            sRect(px - 1, archBaseY - 4, 8, 5, stoneDark);
            sRect(px, archTopY, 6, pillarH, stoneMid);
            sRect(px, archTopY, 2, pillarH, stoneHi);
            sRect(px + 4, archTopY, 2, pillarH, stoneDark);
            sRect(px - 1, archTopY - 2, 8, 2, stoneHi);
        });

        const archCx = gx + 17;
        for (let a = 0; a <= 180; a += 3) {
            const rad = (a * Math.PI) / 180;
            for (let r = 12; r <= 17; r++) {
                const ax = Math.round(archCx + Math.cos(rad) * r);
                const ay = Math.round(archTopY - Math.sin(rad) * (r * 0.85));
                sRect(ax, ay, 2, 2, r >= 16 ? stoneHi : (r <= 13 ? stoneDark : stoneMid));
            }
        }

        for (let vy = archTopY - 8; vy < archBaseY - 6; vy += 4) {
            const sideX = (vy % 8 === 0) ? gx + 1 : gx + 29;
            const vx = sideX + Math.round(Math.sin(vy * 0.25) * 2);
            sRect(vx, vy, 4, 2, '#15803d');
            if (vy % 8 === 0) {
                sRect(vx + 1, vy - 1, 2, 2, '#f472b6');
                sRect(vx + 2, vy, 1, 1, '#fef08a');
            }
        }

        const fx = Math.round(pw * 0.18);
        const fy = getGroundY(fx, 'botanical') + 1;
        sRect(fx - 9, fy - 2, 19, 3, stoneDark);
        sRect(fx - 6, fy - 4, 13, 2, stoneMid);
        sRect(fx - 3, fy - 18, 7, 14, stoneMid);
        sRect(fx - 2, fy - 18, 2, 14, stoneHi);
        sRect(fx - 13, fy - 21, 27, 3, stoneMid);
        sRect(fx - 15, fy - 23, 31, 2, stoneHi);
        sRect(fx - 12, fy - 23, 25, 1, isLightMode ? '#38bdf8' : '#7dd3fc');
        sRect(fx - 2, fy - 28, 5, 5, stoneMid);
        sRect(fx - 1, fy - 30, 3, 2, stoneHi);

        const mossTop = isLightMode ? '#16a34a' : '#0f3d32';
        const mossDeep = isLightMode ? '#14532d' : '#061a17';
        for (let x = 0; x < pw; x++) {
            const gy = getGroundY(x, 'botanical');
            sRect(x, gy, 1, ph - gy, mossDeep);
            sRect(x, gy, 1, 2, mossTop);
        }

        for (let i = 0; i < 16; i++) {
            const progress = i / 15;
            const pathX = Math.round(pw * 0.5 + Math.sin(i * 0.45) * (14 + progress * 10));
            const pathY = ph - 2 - Math.round((1 - progress) * 9);
            const stoneW = 3 + (i % 3) * 2;
            sRect(pathX - stoneW, pathY, stoneW * 2, 2, stoneDark);
            sRect(pathX - stoneW + 1, pathY, stoneW * 2 - 2, 1, stoneHi);
        }
        // BÖLÜM SONU: BOTANİK BAHÇE STATİK ÇEVRESİ
    }

    else if (hab.sceneProfile === 'reef') {
        // BÖLÜM BAŞI: MERCAN RESİFİ STATİK ÇEVRESİ
        const rockDark = isLightMode ? '#0f2942' : '#090d24';
        const rockMid = isLightMode ? '#163e5c' : '#13193b';
        const rockHi = isLightMode ? '#1e5678' : '#232d5e';

        const colShade = isLightMode ? 'rgba(15, 42, 68, 0.38)' : 'rgba(17, 14, 48, 0.62)';
        const colHi = isLightMode ? 'rgba(56, 189, 248, 0.24)' : 'rgba(139, 92, 246, 0.22)';
        const ruinX = Math.round(pw * 0.26);
        const ruinBaseY = getGroundY(ruinX, 'reef') + 2;

        [
            { cx: ruinX - 15, ch: 52, broken: false },
            { cx: ruinX + 15, ch: 40, broken: true },
            { cx: Math.round(pw * 0.76), ch: 46, broken: true }
        ].forEach(col => {
            const cy = getGroundY(col.cx, 'reef') + 2;
            sRect(col.cx - 2, cy - 3, 13, 4, colShade);
            sRect(col.cx, cy - col.ch, 9, col.ch, colShade);
            sRect(col.cx + 1, cy - col.ch, 2, col.ch, colHi);
            sRect(col.cx + 5, cy - col.ch + 4, 1, col.ch - 6, colHi);
            if (!col.broken) {
                sRect(col.cx - 2, cy - col.ch - 2, 13, 3, colShade);
                sRect(col.cx - 2, cy - col.ch - 2, 10, 1, colHi);
            } else {
                sRect(col.cx, cy - col.ch - 2, 5, 2, colShade);
            }
        });
        sRect(ruinX - 17, ruinBaseY - 54, 22, 3, colShade);
        sRect(ruinX - 17, ruinBaseY - 54, 20, 1, colHi);

        const bommies = [
            { cx: Math.round(pw * 0.06), rx: Math.round(pw * 0.18), h: 52 },
            { cx: Math.round(pw * 0.17), rx: Math.round(pw * 0.12), h: 32 },
            { cx: Math.round(pw * 0.83), rx: Math.round(pw * 0.12), h: 34 },
            { cx: Math.round(pw * 0.94), rx: Math.round(pw * 0.18), h: 54 }
        ];
        bommies.forEach((bm, bIdx) => {
            const baseY = ph;
            const topY = ph - bm.h;
            for (let y = topY; y < baseY; y++) {
                const prog = (y - topY) / bm.h;
                const strata = Math.sin(y * 0.22 + bIdx) * 3;
                const halfW = Math.round(bm.rx * Math.pow(prog, 0.65) + strata);
                const left = Math.max(0, bm.cx - halfW);
                const right = Math.min(pw, bm.cx + halfW);
                const w = Math.max(1, right - left);

                sRect(left, y, w, 1, rockDark);
                sRect(left + 2, y, Math.max(1, w - 4), 1, prog < 0.35 ? rockHi : rockMid);
                if (y % 7 === 0 && w > 10) {
                    sRect(left + 3, y, Math.max(2, w - 6), 1, rockHi);
                }
            }
        });

        for (let x = 0; x < pw; x++) {
            const nx = x / Math.max(1, pw);
            const sideMound = nx < 0.26 ? Math.pow((0.26 - nx) / 0.26, 1.5) * 34
                            : (nx > 0.74 ? Math.pow((nx - 0.74) / 0.26, 1.5) * 34 : 0);
            const gy = Math.round(getGroundY(x, 'reef') - sideMound);
            sRect(x, gy, 1, ph - gy, rockDark);
            sRect(x, gy + 1, 1, Math.max(1, Math.floor((ph - gy) * 0.45)), rockMid);
            sRect(x, gy, 1, 2, x % 9 === 0 ? '#38bdf8' : rockHi);
            if (!isLightMode && (x % 19 === 0)) {
                sRect(x, gy + 4 + (x % 5), 3, 1, 'rgba(56, 189, 248, 0.35)');
            }
        }
        // BÖLÜM SONU: MERCAN RESİFİ STATİK ÇEVRESİ
    }

    else if (hab.sceneProfile === 'koi-pond') {
        // BÖLÜM BAŞI: KOİ GÖLETİ STATİK ÇEVRESİ
        const stoneDark = isLightMode ? '#334155' : '#0f172a';
        const stoneMid = isLightMode ? '#475569' : '#1e293b';
        const stoneHi = isLightMode ? '#64748b' : '#334155';
        const mossDark = isLightMode ? '#14532d' : '#062e22';
        const mossMid = isLightMode ? '#15803d' : '#0d4a36';
        const mossHi = isLightMode ? '#22c55e' : '#10b981';

        for (let x = 0; x < pw; x++) {
            const bankH = Math.round(18 + Math.sin(x * 0.03) * 4 + Math.cos(x * 0.08) * 2);
            sRect(x, 0, 1, bankH, isLightMode ? '#1e293b' : '#09131c');
            if (x % 3 === 0) sRect(x, bankH - 5, 2, 2, mossDark);
            sRect(x, bankH - 3, 1, 2, stoneDark);
            sRect(x, bankH - 1, 1, 1, stoneHi);
            sRect(x, bankH, 1, 3, 'rgba(2, 8, 16, 0.42)');
        }

        const brStart = Math.round(pw * 0.60);
        const brWidth = Math.min(88, Math.round(pw * 0.20));
        const redDark = isLightMode ? '#991b1b' : '#7f1d1d';
        const redMid = isLightMode ? '#dc2626' : '#b91c1c';
        const redHi = isLightMode ? '#fca5a5' : '#ef4444';

        for (let bx = 0; bx <= brWidth; bx++) {
            const t = bx / brWidth;
            const arch = Math.round(Math.sin(t * Math.PI) * 9);
            const wx = brStart + bx;
            const wy = 21 - arch;
            sRect(wx, 25 + Math.floor(arch * 0.5), 1, 2, 'rgba(185, 28, 28, 0.22)');
            sRect(wx, wy + 4, 1, 3, '#451a03');
            sRect(wx, wy, 1, 2, redMid);
            sRect(wx, wy, 1, 1, redHi);
            if (bx % 9 === 0 || bx === brWidth) {
                sRect(wx, wy - 2, 2, 6, redDark);
                sRect(wx, wy - 2, 2, 1, '#fef08a');
            }
        }

        const mapleReach = Math.min(150, Math.round(pw * 0.30));
        const trunkDark = isLightMode ? '#3b1d14' : '#181014';
        const trunkMid = isLightMode ? '#5c2d1e' : '#291b21';
        const trunkHi = isLightMode ? '#7c3f2a' : '#3d2830';
        const mapleDark = isLightMode ? '#991b1b' : '#65121b';
        const mapleMid = isLightMode ? '#dc2626' : '#991b1b';
        const mapleHi = isLightMode ? '#f87171' : '#dc2626';
        const mapleGold = '#f59e0b';

        const leftBankY = getGroundY(0, 'koi-pond') + 2;
        for (let y = 0; y < leftBankY; y++) {
            const prog = y / leftBankY;
            const lean = Math.sin((1 - prog) * Math.PI * 0.5) * 10;
            const rootFlare = prog > 0.72 ? Math.pow((prog - 0.72) / 0.28, 2) * 16 : 0;
            const tw = Math.round(12 + prog * 5 + rootFlare);
            const tx = Math.max(0, Math.round(lean));
            sRect(tx, y, tw, 1, trunkDark);
            sRect(tx + tw - 4, y, 3, 1, trunkMid);
            sRect(tx + tw - 1, y, 1, 1, trunkHi);
        }

        [0.06, 0.28, 0.50, 0.72, 0.90].forEach((tNode, idx) => {
            const cx = Math.round(tNode * mapleReach);
            const branchY = Math.round(6 + Math.pow(tNode, 1.2) * 14);
            const rx = Math.round(29 * (1 - tNode * 0.28));
            const bottomY = branchY + Math.round(8 * (1 - tNode * 0.28));

            for (let y = 0; y <= bottomY; y++) {
                const normY = (y - branchY * 0.5) / Math.max(1, bottomY - branchY * 0.5);
                const ellipse = Math.max(0, 1 - normY * normY);
                const span = Math.round(rx * (y < branchY * 0.5 ? 1 : Math.sqrt(ellipse)));
                let col = y < branchY * 0.35 ? mapleHi : (y > branchY ? mapleDark : mapleMid);
                if ((y + idx) % 6 === 0 && span > 6) col = mapleGold;
                sRect(cx - span, y, span * 2, 1, col);
            }
        });

        for (let s = 0; s <= mapleReach; s++) {
            const t = s / Math.max(1, mapleReach);
            const by = Math.round(6 + Math.pow(t, 1.2) * 14 + Math.sin(s * 0.09) * 1.5);
            const thick = Math.max(2, Math.round(8 * (1 - t * 0.75)));
            sRect(s, by - Math.floor(thick * 0.5), 1, thick, trunkDark);
            sRect(s, by + Math.ceil(thick * 0.5) - 1, 1, 1, trunkHi);
        }

        for (let x = 0; x < pw; x++) {
            const nx = x / Math.max(1, pw);
            if (nx > 0.28 && nx < 0.70) continue;
            const gy = getGroundY(x, 'koi-pond');
            sRect(x, gy - 2, 1, 3, 'rgba(2, 8, 16, 0.45)');
            sRect(x, gy, 1, ph - gy, mossDark);
            sRect(x, gy, 1, 2, mossMid);
            if (x % 5 === 0) sRect(x, gy - 1, 2, 1, mossHi);
        }

        [
            { cx: 22, cy: ph - 10, rx: 14, ry: 7 },
            { cx: 46, cy: ph - 6, rx: 11, ry: 5 },
            { cx: pw - 68, cy: ph - 8, rx: 13, ry: 6 }
        ].forEach(rock => {
            sRect(rock.cx - rock.rx, rock.cy + 2, rock.rx * 2, 4, 'rgba(2, 8, 16, 0.45)');
            for (let dy = -rock.ry; dy <= 2; dy++) {
                const span = Math.round(rock.rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / ((rock.ry + 2) * (rock.ry + 2)))));
                sRect(rock.cx - span, rock.cy + dy, span * 2, 1, dy < -2 ? stoneHi : (dy > 0 ? stoneDark : stoneMid));
                if (dy === -rock.ry + 1) sRect(rock.cx - Math.floor(span * 0.6), rock.cy + dy, Math.floor(span * 1.2), 1, mossHi);
            }
        });

        const bx = pw - 42;
        const by = ph - 18;
        sRect(bx - 20, by + 6, 56, 12, isLightMode ? '#1e3a3a' : '#0a1720');
        sRect(bx - 16, by + 4, 46, 4, mossDark);
        sRect(bx - 12, by + 3, 36, 2, mossHi);

        sRect(bx - 6, by, 13, 4, stoneDark);
        sRect(bx - 3, by - 10, 7, 10, stoneMid);
        sRect(bx - 2, by - 10, 2, 10, stoneHi);
        sRect(bx - 5, by - 17, 11, 7, stoneDark);
        sRect(bx - 10, by - 19, 21, 2, stoneDark);
        sRect(bx - 8, by - 21, 17, 2, stoneMid);
        sRect(bx - 5, by - 23, 11, 2, stoneHi);
        sRect(bx - 1, by - 25, 3, 2, stoneHi);

        sRect(bx - 22, by - 4, 12, 2, '#65a30d');
        sRect(bx - 22, by - 4, 12, 1, '#a3e635');
        sRect(bx - 14, by - 8, 2, 12, '#4d7c0f');
        // BÖLÜM SONU: KOİ GÖLETİ STATİK ÇEVRESİ
    }

    else if (hab.sceneProfile === 'arctic-tundra') {
        // BÖLÜM BAŞI: KUTUP TUNDURASI STATİK ÇEVRESİ
        const rockDark = isLightMode ? '#334155' : '#0f172a';
        const rockMid = isLightMode ? '#475569' : '#1e293b';
        const rockHi = isLightMode ? '#64748b' : '#334155';
        const snowTop = isLightMode ? '#ffffff' : '#e0f2fe';
        const snowMid = isLightMode ? '#e2e8f0' : '#bae6fd';
        const snowShadow = isLightMode ? '#cbd5e1' : '#7dd3fc';

        const drawSnowPine = (cx, baseY, h) => {
            sRect(cx - 2, baseY - 8, 4, 9, '#271712');
            const tiers = 5;
            for (let t = 0; t < tiers; t++) {
                const prog = t / tiers;
                const ty = baseY - 6 - Math.round(prog * (h - 8));
                const th = Math.round((h / tiers) * 1.45);
                const maxW = Math.round((4 + (1 - prog) * (h * 0.28)));
                for (let dy = 0; dy < th; dy++) {
                    const w = Math.max(1, Math.round((dy / th) * maxW));
                    const isSnowCap = dy < 3 || dy === th - 1;
                    const col = isSnowCap ? snowTop : (dy < th * 0.5 ? (isLightMode ? '#0f766e' : '#115e59') : (isLightMode ? '#134e4a' : '#062e2b'));
                    sRect(cx - w, ty - th + dy, w * 2, 1, col);
                }
            }
        };

        for (let x = 0; x < pw; x++) {
            const nx = x / Math.max(1, pw);
            const valleyMask = 0.42 + Math.pow(Math.abs(nx - 0.5) * 1.9, 1.3) * 0.85;
            const peakH = Math.round((28 + Math.abs(Math.sin(x * 0.022)) * 26 + Math.cos(x * 0.055) * 8) * valleyMask);
            const gy = getGroundY(x, 'arctic-tundra');
            sRect(x, gy - peakH, 1, peakH, isLightMode ? 'rgba(148, 163, 184, 0.35)' : 'rgba(15, 35, 62, 0.65)');
            if (peakH > 26) {
                sRect(x, gy - peakH, 1, 6, isLightMode ? 'rgba(255, 255, 255, 0.65)' : 'rgba(186, 230, 253, 0.25)');
            }
        }

        const ledges = getArcticLedges(pw, ph);
        drawSnowPine(22, ledges[3].yFn(22) + 1, 46);
        drawSnowPine(Math.round(pw * 0.14), ledges[1].yFn(pw * 0.14) + 1, 52);
        drawSnowPine(Math.round(pw * 0.29), ledges[2].yFn(pw * 0.29) + 1, 38);
        drawSnowPine(pw - 24, ledges[6].yFn(pw - 24) + 1, 48);
        drawSnowPine(Math.round(pw * 0.88), ledges[4].yFn(pw * 0.88) + 1, 54);

        const cabX = Math.round(pw * 0.73);
        const cabY = ledges[5].yFn(cabX) + 1;
        sRect(cabX - 11, cabY - 12, 22, 12, '#451a03');
        sRect(cabX - 10, cabY - 11, 20, 10, '#78350f');
        sRect(cabX + 5, cabY - 21, 4, 10, rockMid);
        for (let r = 0; r <= 9; r++) {
            const rw = 14 - Math.floor(r * 1.4);
            sRect(cabX - rw, cabY - 12 - r, rw * 2, 1, r >= 7 ? snowTop : '#271712');
            sRect(cabX - rw, cabY - 13 - r, 3, 1, snowTop);
            sRect(cabX + rw - 3, cabY - 13 - r, 3, 1, snowTop);
        }
        sRect(cabX - 4, cabY - 8, 8, 5, '#fef08a');
        sRect(cabX - 3, cabY - 7, 6, 3, '#ffffff');
        sRect(cabX, cabY - 8, 1, 5, '#451a03');

        for (let i = 1; i < ledges.length; i++) {
            const l = ledges[i];
            const rockThickness = 18 + (i % 2) * 6;
            for (let x = l.x1; x <= l.x2; x++) {
                const edgeDist = Math.min(x - l.x1, l.x2 - x);
                const taper = edgeDist < 8 ? Math.round((8 - edgeDist) * 1.4) : 0;
                const ly = l.yFn(x);
                const h = Math.max(4, rockThickness - taper);

                sRect(x, ly, 1, h, rockDark);
                sRect(x, ly + 3, 1, Math.max(1, h - 5), (x % 9 < 5) ? rockMid : rockHi);
                sRect(x, ly - 1, 1, 3, snowShadow);
                sRect(x, ly - 2, 1, 2, snowTop);
                if (x % 11 === 0 && edgeDist > 4) {
                    const icicleLen = 3 + (x % 4);
                    sRect(x, ly + h, 1, icicleLen, '#bae6fd');
                }
            }
        }

        for (let x = 0; x < pw; x++) {
            const gy = getGroundY(x, 'arctic-tundra');
            sRect(x, gy, 1, ph - gy, snowMid);
            sRect(x, gy, 1, 3, snowTop);
            sRect(x, gy + 3, 1, 2, snowShadow);
        }
        // BÖLÜM SONU: KUTUP TUNDURASI STATİK ÇEVRESİ
    }

    else if (hab.sceneProfile === 'rainforest') {
        // BÖLÜM BAŞI: YAĞMUR ORMANI STATİK ÇEVRESİ
        const canopyShades = isLightMode
            ? ['#0b3d2e', '#115e40', '#16784d', '#22995e']
            : ['#041f1a', '#073026', '#0c4432', '#135e42'];

        for (let x = 0; x < pw; x += 2) {
            const nx = x / Math.max(1, pw);
            const valleyDip = 0.45 + Math.pow(Math.abs(nx - 0.5) * 1.9, 1.4) * 0.85;
            const h = Math.round((34 + Math.sin(x * 0.025) * 10 + Math.cos(x * 0.07) * 6) * valleyDip);
            sRect(x, ph - h, 2, h, isLightMode ? 'rgba(13, 74, 56, 0.32)' : 'rgba(4, 28, 24, 0.55)');
        }

        const drawFoliageDome = (cx, cy, rx, ry, shadeIdx) => {
            const baseCol = canopyShades[shadeIdx];
            const hiCol = canopyShades[Math.min(3, shadeIdx + 1)];
            const shadowCol = canopyShades[Math.max(0, shadeIdx - 1)];
            for (let dy = -ry; dy <= ry; dy++) {
                const ratio = 1 - (dy * dy) / (ry * ry);
                if (ratio <= 0) continue;
                const scallop = Math.sin(dy * 0.65 + cx * 0.1) * 2;
                const span = Math.max(1, Math.round(rx * Math.sqrt(ratio) + scallop));
                const col = dy < -ry * 0.28 ? hiCol : (dy > ry * 0.35 ? shadowCol : baseCol);
                sRect(cx - span, cy + dy, span * 2, 1, col);
            }
        };

        const midgroundTrees = [
            { x: Math.floor(pw * 0.14), top: Math.floor(ph * 0.24), rx: 32, ry: 18 },
            { x: Math.floor(pw * 0.27), top: Math.floor(ph * 0.36), rx: 26, ry: 15 },
            { x: Math.floor(pw * 0.42), top: Math.floor(ph * 0.32), rx: 24, ry: 14, depth: 'far' },
            { x: Math.floor(pw * 0.58), top: Math.floor(ph * 0.30), rx: 25, ry: 15, depth: 'far' },
            { x: Math.floor(pw * 0.75), top: Math.floor(ph * 0.34), rx: 28, ry: 16 },
            { x: Math.floor(pw * 0.86), top: Math.floor(ph * 0.22), rx: 34, ry: 19 },
        ];
        midgroundTrees.forEach((tree, idx) => {
            const isFarTree = tree.depth === 'far';
            const trunkCol = isFarTree
                ? (isLightMode ? 'rgba(44, 34, 30, 0.62)' : 'rgba(16, 28, 26, 0.72)')
                : (isLightMode ? '#2c221e' : '#101c1a');
            const barkCol = isFarTree
                ? (isLightMode ? 'rgba(74, 55, 45, 0.55)' : 'rgba(28, 48, 43, 0.62)')
                : (isLightMode ? '#4a372d' : '#1c302b');
            const groundBase = ph;

            for (let y = tree.top; y < groundBase; y++) {
                const prog = (y - tree.top) / Math.max(1, groundBase - tree.top);
                const curve = Math.sin(prog * Math.PI * 1.2 + idx) * 2.5;
                const rootFlare = prog > 0.78 ? Math.pow((prog - 0.78) / 0.22, 2) * 14 : 0;
                const w = Math.round(5 + prog * 6 + rootFlare);
                const tx = Math.round(tree.x + curve - w * 0.5);
                sRect(tx, y, w, 1, trunkCol);
                sRect(tx + 1, y, Math.max(1, Math.floor(w * 0.35)), 1, barkCol);
            }

            [-1, 1].forEach(dir => {
                for (let s = 0; s < 24; s++) {
                    const bx = tree.x + dir * s;
                    const by = tree.top + 10 - Math.round(Math.sin((s / 24) * Math.PI * 0.7) * 8);
                    sRect(bx, by, 2, Math.max(1, 4 - Math.floor(s / 7)), trunkCol);
                }
            });

            drawFoliageDome(tree.x - 14, tree.top + 6, tree.rx * 0.75, tree.ry * 0.75, 1);
            drawFoliageDome(tree.x + 14, tree.top + 8, tree.rx * 0.75, tree.ry * 0.75, 1);
            drawFoliageDome(tree.x, tree.top, tree.rx, tree.ry, isFarTree ? 1 : 2);

            if (!isFarTree) {
                [-1, 1].forEach(dir => {
                    for (let step = 0; step <= 15; step += 3) {
                        const rootX = tree.x + dir * step;
                        const rootY = ph - 2 - Math.round(step * 0.22);
                        sRect(rootX - 1, rootY, 3, 2, trunkCol);
                    }
                });
            }
        });

        const edgeGiants = [
            { x: 0, width: 20, side: 1 },
            { x: pw - 22, width: 22, side: -1 }
        ];
        edgeGiants.forEach((giant) => {
            const trunkDark = isLightMode ? '#321e17' : '#141115';
            const trunkMid = isLightMode ? '#523225' : '#241c22';
            const trunkHi = isLightMode ? '#734834' : '#382b31';

            for (let y = 0; y < ph; y++) {
                const prog = y / ph;
                const rootFlare = prog > 0.68 ? Math.pow((prog - 0.68) / 0.32, 2) * 26 : 0;
                const w = Math.round(giant.width + prog * 6 + rootFlare);
                const left = giant.side === 1 ? 0 : pw - w;
                sRect(left, y, w, 1, trunkDark);
                sRect(left + (giant.side === 1 ? w - 6 : 2), y, 4, 1, trunkMid);
                sRect(left + (giant.side === 1 ? w - 2 : 0), y, 2, 1, trunkHi);

                if (y % 24 === 0 && y > 30 && y < ph - 25) {
                    const mx = giant.side === 1 ? w - 3 : pw - w - 1;
                    sRect(mx, y, 4, 2, isLightMode ? '#15803d' : '#0d593d');
                }
            }
        });

        const canopyDomes = [
            { cx: pw * 0.05, cy: 10, rx: 46, ry: 22, s: 1 },
            { cx: pw * 0.16, cy: 6,  rx: 40, ry: 18, s: 2 },
            { cx: pw * 0.28, cy: 2,  rx: 34, ry: 15, s: 3 },
            { cx: pw * 0.41, cy: 9,  rx: 36, ry: 17, s: 2 },
            { cx: pw * 0.51, cy: 3,  rx: 38, ry: 18, s: 3 },
            { cx: pw * 0.61, cy: 9,  rx: 36, ry: 17, s: 2 },
            { cx: pw * 0.72, cy: 2,  rx: 34, ry: 15, s: 3 },
            { cx: pw * 0.84, cy: 6,  rx: 40, ry: 18, s: 2 },
            { cx: pw * 0.95, cy: 10, rx: 46, ry: 22, s: 1 }
        ];
        canopyDomes.forEach(d => drawFoliageDome(Math.round(d.cx), d.cy, d.rx, d.ry, d.s));

        // Small broken highlights give the canopy a layered, leafy silhouette instead of one flat band.
        for (let i = 0; i < 52; i++) {
            const x = (i * 47 + 19) % pw;
            const y = 5 + ((i * 17) % 25);
            const shade = i % 4 === 0 ? canopyShades[3] : (i % 3 === 0 ? canopyShades[1] : canopyShades[2]);
            sRect(x, y, 2 + (i % 3), 1 + (i % 2), shade);
        }

        for (let x = 0; x < pw; x++) {
            const gy = getGroundY(x, 'rainforest');
            sRect(x, gy, 1, ph - gy, isLightMode ? '#0b3b2b' : '#041713');
            sRect(x, gy, 1, 2, isLightMode ? '#15803d' : '#0c4a37');
        }
        // BÖLÜM SONU: YAĞMUR ORMANI STATİK ÇEVRESİ
    }

    return off;
}

// ============================================================================
// BÖLÜM SONU: STATİK HABİTAT KATMANLARI
// ============================================================================
