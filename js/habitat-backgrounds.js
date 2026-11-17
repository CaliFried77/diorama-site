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
        const leafShadow = isLightMode ? '#0c3b20' : '#051613';
        const leafDark = isLightMode ? '#14532d' : '#08221d';
        const leafMid = isLightMode ? '#15803d' : '#10382e';
        const leafHi = isLightMode ? '#22c55e' : '#1b5442';
        const leafRim = isLightMode ? '#4ade80' : '#2dd4bf';

        const drawLeafCluster = (cx, cy, rx, ry, blossoms = false, blossomCol = '#fda4af') => {
            for (let dy = -ry; dy <= ry; dy++) {
                const ratio = 1 - (dy * dy) / (ry * ry);
                if (ratio <= 0) continue;
                const scallop = Math.sin(dy * 0.65 + cx * 0.14) * 2.2 + Math.cos(dy * 1.1) * 1.1;
                const span = Math.max(1, Math.round(rx * Math.sqrt(ratio) + scallop));
                let col = leafMid;
                if (dy < -ry * 0.45) col = leafRim;
                else if (dy < -ry * 0.15) col = leafHi;
                else if (dy > ry * 0.55) col = leafShadow;
                else if (dy > ry * 0.22) col = leafDark;
                sRect(cx - span, cy + dy, span * 2, 1, col);

                if (dy > -ry * 0.4 && dy < ry * 0.3 && dy % 3 === 0 && span > 5) {
                    const texShift = ((dy + cx) % 5) - 2;
                    sRect(cx - Math.floor(span * 0.6) + texShift, cy + dy, Math.max(2, Math.floor(span * 0.5)), 1, dy < 0 ? leafHi : leafDark);
                }
            }
            if (blossoms) {
                [[-0.52, -0.22], [0.38, -0.32], [-0.18, 0.22], [0.46, 0.16], [0.04, -0.46], [-0.34, 0.04], [0.22, -0.06]].forEach(([bx, by], bIdx) => {
                    const px = Math.round(cx + bx * rx);
                    const py = Math.round(cy + by * ry);
                    sRect(px, py + 1, 1, 1, trunkDark);
                    sRect(px - 1, py, 3, 1, blossomCol);
                    sRect(px, py - 1, 1, 3, blossomCol);
                    sRect(px, py, 1, 1, bIdx % 2 === 0 ? '#fef08a' : '#fff1f2');
                });
            }
        };

        const drawBranchSegment = (x0, y0, x1, y1, startThick, endThick) => {
            const steps = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0)));
            for (let s = 0; s <= steps; s++) {
                const t = s / steps;
                const bx = Math.round(x0 + (x1 - x0) * t);
                const by = Math.round(y0 + (y1 - y0) * t - Math.sin(t * Math.PI) * 2.5);
                const thick = Math.max(1, Math.round(startThick + (endThick - startThick) * t));
                sRect(bx, by, 1, thick, trunkDark);
                if (thick >= 2) sRect(bx, by, 1, 1, trunkHi);
            }
        };

        const drawOrchardTree = (baseX, baseY, height, baseWidth, leanDir, blossoms, blossomCol) => {
            const topY = baseY - height;
            sRect(baseX - baseWidth - 6, baseY - 1, (baseWidth + 6) * 2, 3, 'rgba(2, 10, 14, 0.35)');

            for (let y = topY; y < baseY; y++) {
                const prog = (y - topY) / height;
                const curve = Math.sin(prog * Math.PI * 0.9) * 3.5 * leanDir;
                const flare = prog > 0.70 ? Math.pow((prog - 0.70) / 0.30, 2) * (baseWidth * 1.25) : 0;
                const w = Math.round(baseWidth * (0.42 + prog * 0.58) + flare);
                const left = Math.round(baseX + curve - w * 0.5);
                sRect(left, y, w, 1, trunkDark);
                sRect(left + Math.floor(w * 0.28), y, Math.max(1, Math.floor(w * 0.42)), 1, trunkMid);
                sRect(left + (leanDir >= 0 ? w - 2 : 1), y, 1, 1, trunkHi);
                if (prog > 0.78 && y % 2 === 0) {
                    sRect(left + (leanDir >= 0 ? 0 : w - 2), y, 2, 1, leafDark);
                }
            }

            [-1, 1].forEach(rDir => {
                for (let r = 0; r < 6; r++) {
                    const rx = baseX + rDir * (Math.floor(baseWidth * 0.7) + r);
                    const ry = baseY - 2 + Math.floor(r * 0.4);
                    sRect(rx, ry, 2, 2, trunkDark);
                    sRect(rx, ry, 1, 1, r < 3 ? trunkMid : leafDark);
                }
            });

            const rx = Math.round(height * 0.34);
            const ry = Math.round(height * 0.20);
            const forkY = topY + Math.round(height * 0.22);
            const forkX = Math.round(baseX + Math.sin(0.22 * Math.PI * 0.9) * 3.5 * leanDir);

            const leftClusterX = baseX - Math.round(rx * 0.65);
            const leftClusterY = topY + 8;
            const rightClusterX = baseX + Math.round(rx * 0.68);
            const rightClusterY = topY + 6;
            const topClusterX = baseX + leanDir * 8;
            const topClusterY = topY - 10;

            drawLeafCluster(leftClusterX, leftClusterY, Math.round(rx * 0.84), Math.round(ry * 0.84), false);
            drawLeafCluster(rightClusterX, rightClusterY, Math.round(rx * 0.86), Math.round(ry * 0.86), blossoms, blossomCol);

            drawBranchSegment(forkX, forkY, leftClusterX + 4, leftClusterY + 2, Math.max(2, Math.round(baseWidth * 0.45)), 2);
            drawBranchSegment(forkX, forkY - 2, rightClusterX - 4, rightClusterY + 2, Math.max(2, Math.round(baseWidth * 0.45)), 2);
            drawBranchSegment(forkX, topY + 6, topClusterX, topClusterY + 4, Math.max(2, Math.round(baseWidth * 0.35)), 2);

            drawLeafCluster(baseX, topY - 4, rx, ry, blossoms, blossomCol);
            drawLeafCluster(topClusterX, topClusterY, Math.round(rx * 0.76), Math.round(ry * 0.74), blossoms, blossomCol);
        };

        const farHillCol = isLightMode ? 'rgba(20, 83, 45, 0.14)' : 'rgba(10, 38, 34, 0.34)';
        const midHillCol = isLightMode ? 'rgba(21, 101, 52, 0.22)' : 'rgba(12, 48, 40, 0.48)';
        const hillCol = isLightMode ? 'rgba(22, 101, 52, 0.32)' : 'rgba(15, 62, 48, 0.62)';
        const hedgerowCol = isLightMode ? 'rgba(20, 83, 45, 0.38)' : 'rgba(8, 36, 29, 0.72)';

        for (let x = 0; x < pw; x++) {
            const nx = x / Math.max(1, pw);
            const gy = getGroundY(x, 'meadow', pw, ph);

            const farH = Math.round(26 + Math.sin(nx * Math.PI * 1.8 + 0.4) * 10 + Math.cos(x * 0.025) * 4);
            sRect(x, gy - farH, 1, farH, farHillCol);

            const midH = Math.round(19 + Math.cos(nx * Math.PI * 2.2 - 0.5) * 8 + Math.sin(x * 0.035) * 3);
            sRect(x, gy - midH, 1, midH, midHillCol);

            if ((x % 18 < 9) && nx > 0.22 && nx < 0.76) {
                const bushH = 3 + Math.round(Math.sin(x * 0.35) * 1.5);
                sRect(x, gy - midH - bushH, 1, bushH + 1, hedgerowCol);
            }

            const h = Math.round(12 + Math.sin(nx * Math.PI * 2.5) * 6 + Math.cos(x * 0.04) * 2.5);
            sRect(x, gy - h, 1, h, hillCol);
        }

        const fenceStart = Math.round(pw * 0.24);
        const fenceEnd = Math.round(pw * 0.75);
        const fenceDark = isLightMode ? '#5c3a21' : '#1f161b';
        const fenceHi = isLightMode ? '#92400e' : '#3b2830';
        for (let fx = fenceStart; fx <= fenceEnd; fx++) {
            const fgy = getGroundY(fx, 'meadow', pw, ph) - Math.round(9 + Math.sin((fx / Math.max(1, pw)) * Math.PI * 2.5) * 4);
            if ((fx - fenceStart) % 16 === 0) {
                sRect(fx, fgy - 7, 2, 9, fenceDark);
                sRect(fx, fgy - 7, 1, 8, fenceHi);
            }
            sRect(fx, fgy - 5, 1, 1, fenceDark);
            sRect(fx, fgy - 2, 1, 1, fenceDark);
        }

        const leftTree1X = 24;
        const leftTree2X = Math.round(pw * 0.19);
        drawOrchardTree(leftTree2X, getGroundY(leftTree2X, 'meadow', pw, ph) + 2, 90, 9, 1, true, '#fbbf24');
        drawOrchardTree(leftTree1X, getGroundY(leftTree1X, 'meadow', pw, ph) + 3, 116, 13, 1, true, '#fda4af');

        const rightTreeX = pw - 20;
        drawOrchardTree(rightTreeX, getGroundY(rightTreeX, 'meadow', pw, ph) + 3, 102, 11, -1, true, '#fda4af');

        const turfHighlight = isLightMode ? '#4ade80' : '#1f6f54';
        const turfTop = isLightMode ? '#16a34a' : '#0f392b';
        const turfMid = isLightMode ? '#15803d' : '#0b2b21';
        const turfDeep = isLightMode ? '#14532d' : '#071f18';
        const soilLoam = isLightMode ? '#3f2e21' : '#051410';

        for (let x = 0; x < pw; x++) {
            const gy = getGroundY(x, 'meadow', pw, ph);
            sRect(x, gy, 1, ph - gy, turfDeep);
            sRect(x, gy + 5, 1, Math.max(1, ph - gy - 5), soilLoam);
            sRect(x, gy + 2, 1, 3, turfMid);
            sRect(x, gy, 1, 2, turfTop);
            if (x % 3 === 0) {
                sRect(x, gy - 1, 1, 1, (x % 9 === 0) ? turfHighlight : turfTop);
            }
        }

        const hx = Math.round(pw * 0.84);
        const hgy = getGroundY(hx, 'meadow', pw, ph) + 1;

        [
            { bx: hx - 20, rx: 14, ry: 10, col: '#c084fc', dir: -1 },
            { bx: hx + 19, rx: 16, ry: 11, col: '#fb7185', dir: 1 }
        ].forEach(bush => {
            const bGroundY = getGroundY(bush.bx, 'meadow', pw, ph) + 1;
            const bCenterY = hgy - (bush.dir < 0 ? 11 : 13);
            sRect(bush.bx - bush.rx + 2, bGroundY - 1, (bush.rx - 2) * 2, 3, 'rgba(2, 10, 14, 0.38)');
            [-4, 0, 4].forEach(stemOff => {
                drawBranchSegment(bush.bx + stemOff * 0.5, bGroundY, bush.bx + stemOff, bCenterY + 2, 2, 1);
            });
            drawLeafCluster(bush.bx, bCenterY, bush.rx, bush.ry, true, bush.col);
        });

        const stoneDark = isLightMode ? '#475569' : '#1e293b';
        const stoneMid = isLightMode ? '#64748b' : '#334155';
        const stoneHi = isLightMode ? '#94a3b8' : '#475569';
        sRect(hx - 21, hgy, 42, 3, 'rgba(2, 10, 14, 0.48)');
        sRect(hx - 18, hgy - 5, 36, 6, stoneDark);
        for (let sx = hx - 16; sx <= hx + 12; sx += 6) {
            sRect(sx, hgy - 4, 5, 2, stoneMid);
            sRect(sx, hgy - 4, 4, 1, stoneHi);
            sRect(sx + 1, hgy - 2, 4, 2, stoneMid);
        }
        sRect(hx - 16, hgy - 5, 5, 1, leafMid);
        sRect(hx + 11, hgy - 5, 4, 1, leafMid);

        sRect(hx - 16, hgy - 7, 32, 2, trunkDark);
        sRect(hx - 15, hgy - 7, 30, 1, trunkHi);

        const boxLight = isLightMode ? '#fef3c7' : '#eab308';
        const boxMid = isLightMode ? '#fde68a' : '#ca8a04';
        const boxShadow = isLightMode ? '#f59e0b' : '#a16207';
        const bodyTop = hgy - 37;
        const bodyH = 30;

        sRect(hx - 13, bodyTop, 26, bodyH, boxLight);
        sRect(hx + 6, bodyTop, 7, bodyH, boxMid);
        sRect(hx - 13, bodyTop, 2, bodyH, trunkMid);
        sRect(hx + 11, bodyTop, 2, bodyH, trunkDark);

        for (let dy = 2; dy < bodyH; dy += 4) {
            sRect(hx - 11, bodyTop + dy, 1, 2, boxShadow);
            sRect(hx + 10, bodyTop + dy, 1, 2, trunkMid);
        }

        [hgy - 17, hgy - 27].forEach(seamY => {
            sRect(hx - 14, seamY, 28, 2, trunkDark);
            sRect(hx - 13, seamY, 26, 1, trunkHi);
            sRect(hx - 13, seamY + 2, 26, 1, boxShadow);
            sRect(hx - 4, seamY + 4, 7, 2, trunkMid);
            sRect(hx - 4, seamY + 4, 7, 1, trunkHi);
        });

        sRect(hx - 5, hgy - 24, 8, 5, trunkDark);
        sRect(hx - 4, hgy - 23, 6, 3, '#f59e0b');
        sRect(hx - 3, hgy - 22, 4, 1, '#fef08a');

        sRect(hx - 6, hgy - 10, 10, 3, '#181014');
        sRect(hx - 8, hgy - 8, 14, 2, trunkMid);
        sRect(hx - 7, hgy - 8, 12, 1, trunkHi);
        sRect(hx - 4, hgy - 8, 6, 1, '#fef08a');

        sRect(hx - 15, bodyTop, 30, 1, 'rgba(2, 10, 14, 0.35)');
        for (let r = 0; r <= 12; r++) {
            const halfW = 18 - Math.floor(r * 1.4);
            const ry = bodyTop - 1 - r;
            const roofCol = r % 3 === 0 ? trunkDark : (r % 2 === 0 ? trunkHi : trunkMid);
            sRect(hx - halfW, ry, halfW * 2, 1, roofCol);
            if (r > 0 && r < 10 && r % 2 === 0) {
                for (let sx = -halfW + 2; sx < halfW - 2; sx += 4) {
                    sRect(hx + sx, ry, 1, 1, trunkDark);
                }
            }
        }
        sRect(hx - 1, bodyTop - 16, 2, 4, trunkDark);
        sRect(hx, bodyTop - 16, 1, 3, '#fbbf24');

        sRect(hx - 19, bodyTop + 2, 7, 2, trunkDark);
        sRect(hx - 19, bodyTop + 2, 6, 1, trunkHi);
        for (let b = 0; b < 4; b++) {
            sRect(hx - 14 - b, bodyTop + 4 + (3 - b), 1, 1, trunkMid);
        }

        const potX = hx + 14;
        const potY = hgy - 7;
        sRect(potX - 2, potY - 3, 5, 4, '#b45309');
        sRect(potX - 3, potY - 4, 7, 1, '#d97706');
        sRect(potX - 2, potY - 5, 5, 1, '#fbbf24');
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
            const bankY = getGroundY(edgeX, 'wetland', pw, ph) + 4;

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
            const gy = getGroundY(x, 'wetland', pw, ph);
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

        sRect(0, 0, pw, 2, isLightMode ? 'rgba(186, 230, 253, 0.38)' : 'rgba(56, 189, 248, 0.16)');
        sRect(0, 2, pw, 1, isLightMode ? 'rgba(255, 255, 255, 0.45)' : 'rgba(125, 211, 252, 0.22)');

        const farSilhouetteCol = isLightMode ? 'rgba(11, 61, 56, 0.16)' : 'rgba(4, 34, 34, 0.38)';
        const bgPlantCol = isLightMode ? 'rgba(15, 82, 72, 0.26)' : 'rgba(6, 48, 44, 0.52)';
        for (let x = 0; x < pw; x += 3) {
            const nx = x / Math.max(1, pw);
            const base = soilY(x);
            if (nx < 0.42 || nx > 0.58) {
                const stemH = Math.round((38 + Math.sin(x * 0.14) * 14 + Math.cos(x * 0.27) * 8) * (0.62 + Math.abs(nx - 0.5)));
                sRect(x, base - stemH, 2, stemH, bgPlantCol);
                if (x % 6 === 0) {
                    sRect(x - 1, base - Math.floor(stemH * 0.7), 4, 1, bgPlantCol);
                }
            }
            const farH = Math.round(20 + Math.sin(x * 0.05) * 8);
            sRect(x, base - farH, 3, farH, farSilhouetteCol);
        }

        const stoneDark = isLightMode ? '#1e293b' : '#09111e';
        const stoneMid = isLightMode ? '#334155' : '#132033';
        const stoneHi = isLightMode ? '#64748b' : '#243854';
        const stoneRim = isLightMode ? '#94a3b8' : '#38bdf8';
        const mossPocket = isLightMode ? '#16a34a' : '#0d9488';

        const dragonStones = [
            { bx: 38, topY: ph - 46, baseW: 26, lean: 0.24 },
            { bx: pw - 58, topY: ph - 70, baseW: 40, lean: -0.22 },
            { bx: pw - 84, topY: ph - 46, baseW: 28, lean: -0.30 },
            { bx: pw - 28, topY: ph - 54, baseW: 30, lean: 0.15 }
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
                sRect(left + 1, st.topY + y, Math.max(2, Math.floor(w * 0.58)), 1, stoneMid);
                sRect(left + 1, st.topY + y, 2, 1, stoneHi);
                if (y < 6 && prog < 0.2) {
                    sRect(left + 1, st.topY + y, 1, 1, stoneRim);
                }
                if (y > 6 && y % 6 === 0 && w > 12) {
                    const holeX = left + 4 + ((y * 3 + sIdx * 5) % Math.max(2, w - 9));
                    sRect(holeX, st.topY + y, 4, 2, '#040811');
                    sRect(holeX, st.topY + y - 1, 3, 1, mossPocket);
                    if (!isLightMode && y % 12 === 0) {
                        sRect(holeX + 1, st.topY + y - 1, 2, 1, 'rgba(45, 212, 191, 0.55)');
                    }
                }
            }
        });

        const woodShadow = isLightMode ? '#271105' : '#0f080b';
        const woodDark = isLightMode ? '#3f1d0b' : '#1a1014';
        const woodMid = isLightMode ? '#5c2d16' : '#2c1a21';
        const woodHi = isLightMode ? '#854d0e' : '#4a2c36';
        const maxTrunkX = Math.min(190, Math.floor(pw * 0.46));

        for (let x = 0; x < maxTrunkX; x++) {
            const t = x / maxTrunkX;
            const archY = Math.round(ph - 18 - Math.sin(t * Math.PI * 0.88) * 54 + Math.cos(t * 4) * 3);
            const thick = Math.max(2, Math.floor(15 * (1 - t * 0.74)));
            sRect(x, archY, 2, thick, woodDark);
            sRect(x, archY + thick - 1, 2, 1, woodShadow);
            sRect(x, archY + 1, 2, Math.max(1, thick - 3), woodMid);
            sRect(x, archY, 2, 2, woodHi);

            if (t > 0.18 && t < 0.84) {
                const subT = (t - 0.18) / 0.66;
                const upperY = Math.round(archY - 12 - Math.sin(subT * Math.PI) * 24);
                const uThick = Math.max(2, Math.floor(6 * (1 - subT * 0.68)));
                if (subT < 0.14) {
                    const joinH = Math.max(1, archY - (upperY + uThick) + 2);
                    sRect(x, upperY + uThick - 1, 2, joinH, woodDark);
                }
                sRect(x, upperY, 2, uThick, woodDark);
                sRect(x, upperY, 2, 1, woodHi);
                if (x % 2 === 0) {
                    sRect(x, upperY - 2, 2, 2, isLightMode ? '#16a34a' : '#0d9488');
                    sRect(x, upperY - 3, 1, 1, isLightMode ? '#4ade80' : '#2dd4bf');
                }
            }

            if (t > 0.12 && t < 0.48) {
                const legT = (t - 0.12) / 0.36;
                const targetFloor = soilY(x) + 3;
                const legY = Math.round(archY + thick + legT * (targetFloor - (archY + thick)));
                const legW = Math.max(2, Math.floor(7 * (1 - legT * 0.5)));
                sRect(x, legY, legW, 3, woodDark);
                sRect(x, legY, 2, 1, woodHi);
            }

            if (t > 0.62) {
                const propT = (t - 0.62) / 0.38;
                const groundTarget = soilY(x) + 2;
                const branchY = Math.round(archY + Math.pow(propT, 1.15) * (groundTarget - archY));
                sRect(x, branchY, 2, 3, woodDark);
                sRect(x, branchY, 2, 1, woodHi);
            }
        }

        const rightRootSpan = Math.min(95, Math.floor(pw * 0.24));
        for (let s = 0; s < rightRootSpan; s++) {
            const t = s / rightRootSpan;
            const rx = pw - 42 - s;
            const anchorY = soilY(rx) + 2;
            const arch = Math.round((ph - 28 - Math.sin(t * Math.PI * 0.78) * 24) * (1 - Math.pow(t, 1.6)) + anchorY * Math.pow(t, 1.6));
            const rThick = Math.max(2, Math.floor(8 * (1 - t * 0.72)));
            sRect(rx, arch, 2, rThick, woodDark);
            sRect(rx, arch, 2, 1, woodHi);
            if (s % 3 === 0 && t < 0.72) {
                sRect(rx, arch - 2, 2, 2, isLightMode ? '#16a34a' : '#0d9488');
            }
        }

        const soilDark = isLightMode ? '#1e1b18' : '#090d16';
        const soilMid = isLightMode ? '#292524' : '#131c2b';
        const soilRim = isLightMode ? '#15803d' : '#0f5138';
        const sandShadow = isLightMode ? '#94a3b8' : '#1e293b';
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
                if (Math.abs(nx - 0.50) > 0.068) {
                    sRect(x, sandY, 1, 2, sandShadow);
                }
            } else {
                sRect(x, gy, 1, ph - gy, soilDark);
                sRect(x, gy + 2, 1, Math.max(1, Math.floor((ph - gy) * 0.5)), soilMid);
                sRect(x, gy, 1, 2, soilRim);
                if ((x * 7) % 5 === 0 && ph - gy > 5) {
                    sRect(x, gy + 3 + (x % 4), 1, 1, stoneDark);
                }
            }
        }

        [Math.round(pw * 0.415), Math.round(pw * 0.585)].forEach((bx, bIdx) => {
            const by = soilY(bx);
            sRect(bx - 5, by - 2, 10, 5, stoneDark);
            sRect(bx - 4, by - 3, 8, 3, stoneMid);
            sRect(bx - 3, by - 3, 5, 1, stoneHi);
            sRect(bx - 2 + bIdx, by - 4, 3, 1, mossPocket);
        });

        const marimoBalls = [
            { x: Math.round(pw * 0.35), r: 5 },
            { x: Math.round(pw * 0.38), r: 4 },
            { x: Math.round(pw * 0.62), r: 5 },
            { x: Math.round(pw * 0.65), r: 3 }
        ];
        marimoBalls.forEach(mb => {
            const my = soilY(mb.x) - mb.r + 2;
            sRect(mb.x - mb.r, my + mb.r - 1, mb.r * 2, 2, 'rgba(2, 8, 16, 0.5)');
            for (let dy = -mb.r; dy <= mb.r; dy++) {
                const span = Math.round(mb.r * Math.sqrt(Math.max(0, 1 - (dy * dy) / (mb.r * mb.r))));
                const col = dy < -1 ? '#22c55e' : (dy > 1 ? '#14532d' : '#15803d');
                sRect(mb.x - span, my + dy, span * 2, 1, col);
                if (dy === -mb.r + 1 && span > 2) {
                    sRect(mb.x - Math.floor(span * 0.5), my + dy, Math.max(1, span), 1, '#4ade80');
                }
            }
        });

        [Math.round(pw * 0.44), Math.round(pw * 0.55)].forEach((lx, idx) => {
            const ly = ph - 5;
            sRect(lx - 5, ly, 10, 1, 'rgba(2, 8, 16, 0.38)');
            sRect(lx - 5, ly - 1, 10, 2, '#78350f');
            sRect(lx - 4, ly - 2, 8, 1, '#b45309');
            sRect(lx - 3 + idx * 2, ly - 1, 5, 1, '#d97706');
            sRect(lx - 6, ly - 1, 2, 1, '#451a03');
        });
        // BÖLÜM SONU: BETTA AKVARYUMU STATİK ÇEVRESİ
    }

    else if (hab.sceneProfile === 'botanical') {
        // BÖLÜM BAŞI: BOTANİK BAHÇE STATİK ÇEVRESİ
        const reach = Math.min(155, Math.round(pw * 0.30));

        const glassFrameCol = isLightMode ? 'rgba(30, 58, 95, 0.22)' : 'rgba(30, 27, 75, 0.52)';
        const glassPaneCol = isLightMode ? 'rgba(224, 242, 254, 0.18)' : 'rgba(129, 140, 248, 0.06)';
        const domeCx = Math.round(pw * 0.50);
        const domeBaseY = getGroundY(domeCx, 'botanical', pw, ph) - 2;
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
            const groundY = getGroundY(edgeX, 'botanical', pw, ph) + 4;

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
        const archBaseY = getGroundY(gx + 16, 'botanical', pw, ph) + 2;
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
        const fy = getGroundY(fx, 'botanical', pw, ph) + 1;
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
            const gy = getGroundY(x, 'botanical', pw, ph);
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
        const ruinBaseY = getGroundY(ruinX, 'reef', pw, ph) + 2;

        [
            { cx: ruinX - 15, ch: 52, broken: false },
            { cx: ruinX + 15, ch: 40, broken: true },
            { cx: Math.round(pw * 0.76), ch: 46, broken: true }
        ].forEach(col => {
            const cy = getGroundY(col.cx, 'reef', pw, ph) + 2;
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
            const gy = Math.round(getGroundY(x, 'reef', pw, ph) - sideMound);
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

        const leftBankY = getGroundY(0, 'koi-pond', pw, ph) + 2;
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
            const gy = getGroundY(x, 'koi-pond', pw, ph);
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
        const rockDeep = isLightMode ? '#1e293b' : '#070d19';
        const rockDark = isLightMode ? '#334155' : '#0f172a';
        const rockMid = isLightMode ? '#475569' : '#1e293b';
        const rockHi = isLightMode ? '#64748b' : '#334155';
        const iceVein = isLightMode ? '#bae6fd' : '#164e63';
        const snowTop = isLightMode ? '#ffffff' : '#e0f2fe';
        const snowMid = isLightMode ? '#e2e8f0' : '#bae6fd';
        const snowShadow = isLightMode ? '#94a3b8' : '#38bdf8';

        const drawSnowPine = (cx, baseY, h) => {
            sRect(cx - Math.round(h * 0.24), baseY - 1, Math.round(h * 0.48), 3, 'rgba(7, 13, 25, 0.42)');
            sRect(cx - 2, baseY - 9, 4, 10, '#271712');
            sRect(cx - 1, baseY - 9, 1, 9, '#5c3a21');
            sRect(cx - 4, baseY - 2, 8, 2, snowMid);
            sRect(cx - 3, baseY - 3, 6, 1, snowTop);

            const needleDark = isLightMode ? '#0f3d3e' : '#042022';
            const needleMid = isLightMode ? '#134e4a' : '#083335';
            const needleHi = isLightMode ? '#0f766e' : '#115e59';
            const tiers = 6;

            for (let t = 0; t < tiers; t++) {
                const prog = t / tiers;
                const ty = baseY - 6 - Math.round(prog * (h - 9));
                const th = Math.max(4, Math.round((h / tiers) * 1.48));
                const maxW = Math.round(3 + (1 - prog * 0.82) * (h * 0.28));

                for (let dy = 0; dy < th; dy++) {
                    const ratio = dy / th;
                    const scallop = Math.sin(dy * 1.2 + t) * 0.8;
                    const w = Math.max(1, Math.round(ratio * maxW + scallop));
                    const py = ty - th + dy;

                    if (dy <= 1) {
                        sRect(cx - w, py, w * 2 + 1, 1, snowTop);
                    } else if (dy === 2) {
                        sRect(cx - w, py, w * 2 + 1, 1, snowMid);
                    } else {
                        sRect(cx - w, py, w * 2 + 1, 1, dy > th - 2 ? needleDark : needleMid);
                        sRect(cx - Math.max(1, Math.floor(w * 0.65)), py, Math.max(2, w), 1, needleHi);
                        if (dy === th - 2 && w > 3) {
                            sRect(cx - w, py, 2, 1, snowTop);
                            sRect(cx + w - 1, py, 2, 1, snowMid);
                        }
                    }
                }
            }
            sRect(cx, baseY - h - 2, 1, 3, snowTop);
        };

        const drawCliffMassif = (ledge, tierDepth, attachSide) => {
            const spanX1 = attachSide === 'left' ? 0 : ledge.x1;
            const spanX2 = attachSide === 'right' ? pw - 1 : ledge.x2;
            const darken = tierDepth === 'high' ? rockDeep : rockDark;
            const midCol = tierDepth === 'high' ? rockDark : rockMid;
            const hiCol = tierDepth === 'high' ? rockMid : rockHi;

            for (let x = spanX1; x <= spanX2; x++) {
                const clampedX = Math.max(ledge.x1, Math.min(ledge.x2, x));
                const ly = ledge.yFn(clampedX);
                const valleyY = getGroundY(x, 'arctic-tundra', pw, ph);
                const outerDist = attachSide === 'left' ? (spanX2 - x) : (attachSide === 'right' ? (x - spanX1) : Math.min(x - spanX1, spanX2 - x));
                const shoulderDrop = outerDist < 7 ? Math.round(Math.pow(7 - outerDist, 1.35) * 0.9) : 0;
                const topY = ly + shoulderDrop;
                const cliffH = Math.max(6, valleyY - topY + 3);

                sRect(x, topY, 1, cliffH, darken);

                for (let y = topY + 2; y < topY + cliffH - 2; y += 2) {
                    const strata = Math.sin(x * 0.14 + y * 0.08) + Math.cos(y * 0.22 - x * 0.05);
                    if (strata > 0.45) {
                        sRect(x, y, 1, 2, midCol);
                    }
                    if (strata > 1.15 && outerDist > 4) {
                        sRect(x, y, 1, 1, hiCol);
                    }
                }

                if ((x + ledge.id * 5) % 17 === 0 && outerDist > 6 && cliffH > 18) {
                    const creviceH = Math.min(cliffH - 8, 10 + (x % 9));
                    sRect(x, topY + 5, 1, creviceH, rockDeep);
                    sRect(x + 1, topY + 6, 1, Math.max(2, creviceH - 3), iceVein);
                }

                sRect(x, topY + cliffH - 3, 1, 3, snowMid);
                sRect(x, topY + cliffH - 4, 1, 1, snowShadow);

                if (x >= ledge.x1 && x <= ledge.x2) {
                    const overhang = 2 + (x % 3 === 0 ? 1 : 0);
                    sRect(x, ly + 1, 1, overhang, snowShadow);
                    sRect(x, ly - 1, 1, 2, snowMid);
                    sRect(x, ly - 2, 1, 2, snowTop);

                    if (x % 9 === 0 && outerDist > 5) {
                        const icicleLen = 3 + ((x * 3) % 5);
                        sRect(x, ly + overhang + 1, 1, icicleLen, '#7dd3fc');
                        sRect(x, ly + overhang + 1, 1, Math.max(1, icicleLen - 2), '#e0f2fe');
                    }
                }
            }
        };

        const drawNordicCabin = (cabX, cabY) => {
            sRect(cabX - 15, cabY - 1, 30, 3, 'rgba(7, 13, 25, 0.48)');
            sRect(cabX - 13, cabY - 3, 26, 3, rockDark);
            for (let sx = cabX - 12; sx <= cabX + 8; sx += 5) {
                sRect(sx, cabY - 3, 3, 2, rockHi);
            }

            const chX = cabX + 5;
            sRect(chX, cabY - 23, 5, 12, rockDark);
            sRect(chX + 1, cabY - 23, 3, 11, rockMid);
            sRect(chX, cabY - 24, 5, 1, rockHi);
            sRect(chX + 1, cabY - 25, 3, 1, snowTop);

            const logDark = '#3b1806';
            const logMid = '#6b2f0e';
            const logHi = '#92400e';
            sRect(cabX - 12, cabY - 14, 24, 11, logDark);
            for (let ly = cabY - 13; ly < cabY - 3; ly += 2) {
                sRect(cabX - 11, ly, 22, 1, logMid);
                sRect(cabX - 10, ly, 14, 1, logHi);
                sRect(cabX - 13, ly, 2, 1, '#b45309');
                sRect(cabX + 11, ly, 2, 1, '#78350f');
            }

            for (let g = 1; g <= 7; g++) {
                const gw = Math.max(1, 12 - Math.floor(g * 1.5));
                sRect(cabX - gw, cabY - 14 - g, gw * 2, 1, g % 2 === 0 ? logMid : logDark);
            }

            sRect(cabX - 8, cabY - 10, 4, 7, '#271105');
            sRect(cabX - 7, cabY - 9, 2, 5, '#451a03');
            sRect(cabX - 6, cabY - 6, 1, 1, '#fbbf24');

            sRect(cabX - 2, cabY - 11, 9, 6, '#271105');
            sRect(cabX - 1, cabY - 10, 7, 4, '#f59e0b');
            sRect(cabX, cabY - 9, 5, 2, '#fef08a');
            sRect(cabX + 2, cabY - 10, 1, 4, '#271105');
            sRect(cabX - 1, cabY - 8, 7, 1, '#271105');
            sRect(cabX - 2, cabY - 5, 9, 1, snowTop);

            for (let wx = 0; wx < 4; wx++) {
                sRect(cabX + 8 + wx, cabY - 5 - (wx % 2), 2, 2, '#451a03');
                sRect(cabX + 8 + wx, cabY - 5 - (wx % 2), 1, 1, '#d97706');
            }

            for (let r = 0; r <= 9; r++) {
                const rw = 16 - Math.floor(r * 1.5);
                const ry = cabY - 14 - r;
                sRect(cabX - rw, ry, rw * 2, 1, '#1e130c');
                sRect(cabX - rw - 1, ry - 1, rw * 2 + 2, 1, snowMid);
                sRect(cabX - rw, ry - 2, rw * 2, 1, snowTop);
            }
            sRect(cabX - 16, cabY - 13, 1, 2, '#bae6fd');
            sRect(cabX + 15, cabY - 13, 1, 3, '#bae6fd');

            sRect(cabX - 14, cabY - 2, 5, 2, snowTop);
            sRect(cabX + 9, cabY - 2, 6, 2, snowTop);
        };

        const farMountCol = isLightMode ? 'rgba(100, 116, 139, 0.28)' : 'rgba(15, 28, 52, 0.55)';
        const midMountCol = isLightMode ? 'rgba(71, 85, 105, 0.42)' : 'rgba(17, 36, 64, 0.78)';
        const mountSnowCol = isLightMode ? 'rgba(255, 255, 255, 0.75)' : 'rgba(186, 230, 253, 0.32)';
        const mountShadowSnow = isLightMode ? 'rgba(203, 213, 225, 0.55)' : 'rgba(56, 189, 248, 0.16)';

        for (let x = 0; x < pw; x++) {
            const nx = x / Math.max(1, pw);
            const gy = getGroundY(x, 'arctic-tundra', pw, ph);
            const valleyOpen = 0.36 + Math.pow(Math.abs(nx - 0.5) * 1.92, 1.35) * 0.92;

            const farRidge = Math.abs(Math.sin(x * 0.017 + 0.8)) * 34 + Math.abs(Math.cos(x * 0.041)) * 12;
            const farH = Math.round((24 + farRidge) * valleyOpen);
            sRect(x, gy - farH, 1, farH, farMountCol);
            if (farH > 32) {
                sRect(x, gy - farH, 1, 4, mountShadowSnow);
            }

            const midRidge = Math.abs(Math.sin(x * 0.024 - 0.3)) * 26 + Math.cos(x * 0.058) * 7;
            const midH = Math.round((18 + midRidge) * valleyOpen);
            sRect(x, gy - midH, 1, midH, midMountCol);
            if (midH > 24) {
                const snowCapH = 4 + Math.round(Math.max(0, Math.sin(x * 0.024 - 0.3)) * 6);
                sRect(x, gy - midH, 1, snowCapH, (x % 14 < 7) ? mountSnowCol : mountShadowSnow);
            }
        }

        const ledges = getArcticLedges(pw, ph);

        // 1. Üst Teraslar (Ledge 3 ve Ledge 6) + Üst Ağaçlar
        drawCliffMassif(ledges[3], 'high', 'left');
        drawCliffMassif(ledges[6], 'high', 'right');
        drawSnowPine(22, ledges[3].yFn(22) + 1, 46);
        drawSnowPine(Math.round(pw * 0.12), ledges[3].yFn(Math.round(pw * 0.12)) + 1, 36);
        drawSnowPine(pw - 24, ledges[6].yFn(pw - 24) + 1, 48);
        drawSnowPine(Math.round(pw * 0.86), ledges[6].yFn(Math.round(pw * 0.86)) + 1, 38);

        // 2. Orta Teraslar (Ledge 2 ve Ledge 5) + Kuzey Kulübesi ve Orta Ağaçlar
        drawCliffMassif(ledges[2], 'mid', 'none');
        drawCliffMassif(ledges[5], 'mid', 'none');
        drawSnowPine(Math.round(pw * 0.29), ledges[2].yFn(Math.round(pw * 0.29)) + 1, 40);
        const cabX = Math.round(pw * 0.73);
        const cabY = ledges[5].yFn(cabX) + 1;
        drawNordicCabin(cabX, cabY);
        drawSnowPine(Math.round(pw * 0.66), ledges[5].yFn(Math.round(pw * 0.66)) + 1, 34);

        // 3. Alt Teraslar (Ledge 1 ve Ledge 4) + Ön Plan Ağaçları
        drawCliffMassif(ledges[1], 'low', 'left');
        drawCliffMassif(ledges[4], 'low', 'right');
        drawSnowPine(Math.round(pw * 0.14), ledges[1].yFn(Math.round(pw * 0.14)) + 1, 52);
        drawSnowPine(Math.round(pw * 0.88), ledges[4].yFn(Math.round(pw * 0.88)) + 1, 54);

        // 4. Ana Vadi Kar Tabanı (Ledge 0) ve Buzul Kıyısı
        for (let x = 0; x < pw; x++) {
            const nx = x / Math.max(1, pw);
            const gy = getGroundY(x, 'arctic-tundra', pw, ph);
            const inFrozenCreek = Math.abs(nx - 0.50) < 0.09;

            if (inFrozenCreek) {
                sRect(x, gy, 1, ph - gy, isLightMode ? '#7dd3fc' : '#0c4a6e');
                sRect(x, gy, 1, 2, isLightMode ? '#e0f2fe' : '#38bdf8');
                if ((x + 3) % 7 === 0) {
                    sRect(x, gy + 2, 2, 1, '#bae6fd');
                }
            } else {
                sRect(x, gy, 1, ph - gy, snowMid);
                sRect(x, gy, 1, 3, snowTop);
                sRect(x, gy + 3, 1, 2, snowShadow);
            }
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
            const gy = getGroundY(x, 'rainforest', pw, ph);
            sRect(x, gy, 1, ph - gy, isLightMode ? '#0b3b2b' : '#041713');
            sRect(x, gy, 1, 2, isLightMode ? '#15803d' : '#0c4a37');
        }

        // Buttress roots sit above the forest floor so they remain visible after ground fill.
        midgroundTrees.filter(tree => tree.depth !== 'far').forEach(tree => {
            const groundY = getGroundY(tree.x, 'rainforest', pw, ph);
            const rootCol = isLightMode ? '#2c221e' : '#101c1a';
            [-1, 1].forEach(dir => {
                for (let step = 0; step <= 18; step += 2) {
                    const x = tree.x + dir * step;
                    const y = groundY + Math.round(step * 0.34);
                    sRect(x, y, 2, 2, rootCol);
                    if (step > 8) sRect(x + dir, y + 2, 2, 1, rootCol);
                }
            });
        });
        // BÖLÜM SONU: YAĞMUR ORMANI STATİK ÇEVRESİ
    }

    return off;
}

// ============================================================================
// BÖLÜM SONU: STATİK HABİTAT KATMANLARI
// ============================================================================
