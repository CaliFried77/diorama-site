import { flora, pw, ph } from './07-habitat-state.js';
import { getArcticLedges } from './arctic-geometry.js';
import { getGroundY } from './habitat-geometry.js';

/* HABITAT FLORA GENERATOR — creates habitat-specific plant and scenery data. */

// ============================================================================
// BÖLÜM BAŞI: BİYOMA GÖRE FLORA YERLEŞİMİ
// Yalnızca bitki verisini üretir; çizim davranışı habitat-flora-renderer.js içindedir.
// ============================================================================

export function populateHabitatFlora(hab) {
    if (hab.sceneProfile === 'meadow') {
        // BÖLÜM BAŞI: ÇAYIR BAŞLANGIÇ FLORASI
        for (let x = 12; x < pw - 12; x += 6 + Math.floor(Math.random() * 4)) {
            const nx = x / Math.max(1, pw);
            if (nx > 0.78 && nx < 0.90) continue;

            const baseY = getGroundY(x, 'meadow', pw, ph) + Math.round((Math.random() - 0.5) * 2);
            const r = Math.random();

            if (r < 0.18 && (nx > 0.25 && nx < 0.44 || nx > 0.64 && nx < 0.77)) {
                flora.push({
                    type: 'sunflower',
                    x,
                    baseY,
                    h: 32 + Math.random() * 22,
                    headR: 4 + Math.floor(Math.random() * 2),
                    phase: Math.random() * Math.PI * 2
                });
            } else if (r < 0.38) {
                flora.push({
                    type: 'foxglove',
                    x,
                    baseY,
                    h: 24 + Math.random() * 20,
                    hue: Math.random() < 0.5 ? '#c084fc' : '#f472b6',
                    phase: Math.random() * Math.PI * 2
                });
            } else {
                flora.push({
                    type: 'meadow',
                    x,
                    baseY,
                    h: 14 + Math.random() * 20,
                    hasBloom: Math.random() < 0.78,
                    kind: ['lavender', 'daisy', 'poppy', 'buttercup'][Math.floor(Math.random() * 4)],
                    phase: Math.random() * Math.PI * 2
                });
            }
        }

        // BÖLÜM SONU: ÇAYIR BAŞLANGIÇ FLORASI
    } else if (hab.sceneProfile === 'betta-aquarium') {
        // BÖLÜM BAŞI: BETTA AKVARYUMU BAŞLANGIÇ FLORASI
        for (let x = 10; x < pw - 10; x += 8 + Math.floor(Math.random() * 5)) {
            const nx = x / Math.max(1, pw);
            const inCenterPath = nx > 0.42 && nx < 0.58;
            if (inCenterPath && Math.random() < 0.72) continue;

            const moundScale = inCenterPath ? 0.48 : (0.75 + Math.pow(Math.abs(nx - 0.5) * 1.9, 1.2) * 0.55);
            const kindRoll = Math.random();

            if (kindRoll < 0.42) {
                flora.push({
                    type: 'hornwort',
                    x,
                    h: (44 + Math.random() * 58) * moundScale,
                    whorlSpan: 4 + Math.floor(Math.random() * 3),
                    glowCol: Math.random() < 0.5 ? '#34d399' : '#2dd4bf',
                    phase: Math.random() * Math.PI * 2
                });
            } else if (kindRoll < 0.74) {
                flora.push({
                    type: 'ludwigia',
                    x,
                    h: (34 + Math.random() * 48) * moundScale,
                    phase: Math.random() * Math.PI * 2
                });
            } else {
                flora.push({
                    type: 'val',
                    x,
                    h: (38 + Math.random() * 52) * moundScale,
                    phase: Math.random() * Math.PI * 2
                });
            }
        }
        for (let fx = 14; fx < pw - 14; fx += 18 + Math.floor(Math.random() * 14)) {
            flora.push({
                type: 'pistia',
                x: fx,
                rootLen: 12 + Math.random() * 18,
                phase: Math.random() * Math.PI * 2
            });
        }
        for (let i = 0; i < 48; i++) {
            const px = Math.random() * pw;
            const nx = px / Math.max(1, pw);
            const inSand = nx > 0.43 && nx < 0.57;
            flora.push({
                type: 'pebble',
                x: px,
                y: ph - 2 - Math.random() * (inSand ? 4 : 9),
                w: 2 + Math.floor(Math.random() * 4),
                h: 1 + Math.floor(Math.random() * 2),
                shade: inSand ? ['#94a3b8', '#64748b'][i % 2] : ['#0f293a', '#16384c', '#1e4959', '#091d2b'][i % 4]
            });
        }

        // BÖLÜM SONU: BETTA AKVARYUMU BAŞLANGIÇ FLORASI
    } else if (hab.sceneProfile === 'wetland') {
        // BÖLÜM BAŞI: SULAK ALAN BAŞLANGIÇ FLORASI
        const reach = Math.min(145, Math.round(pw * 0.26));
        const willowZones = [
            { startX: 6, endX: reach - 4, isLeft: true },
            { startX: pw - reach + 4, endX: pw - 6, isLeft: false }
        ];
        willowZones.forEach(zone => {
            for (let x = zone.startX; x <= zone.endX; x += 5 + Math.floor(Math.random() * 4)) {
                const t = zone.isLeft ? (x / reach) : ((pw - x) / reach);
                const branchY = Math.round(6 + Math.pow(t, 1.2) * 14 + Math.sin(x * 0.08) * 1.5);
                const len = Math.round((1 - t * 0.55) * 48 + 14 + Math.random() * 14);
                flora.push({
                    type: 'willow_frond',
                    x: Math.round(x),
                    startY: branchY,
                    len,
                    phase: Math.random() * Math.PI * 2
                });
            }
        });

        for (let x = 6; x < pw - 6; x += 6 + Math.floor(Math.random() * 5)) {
            const nx = x / Math.max(1, pw);
            const inLeftBank = nx < 0.34;
            const inRightBank = nx > 0.66;
            const inMidIsland = (nx > 0.41 && nx < 0.48) || (nx > 0.55 && nx < 0.61);

            if (!inLeftBank && !inRightBank && !inMidIsland) continue;

            const baseY = inMidIsland
                ? Math.round(ph - 22 + Math.sin(x * 0.2) * 3)
                : getGroundY(x, 'wetland', pw, ph) + Math.round((Math.random() - 0.5) * 6);

            const edgeScale = (nx < 0.16 || nx > 0.84) ? 1.25 : (inMidIsland ? 0.78 : 1.0);
            const r = Math.random();

            if (r < 0.40) {
                const h = Math.round((46 + Math.random() * 58) * edgeScale);
                flora.push({
                    type: 'reed',
                    x,
                    baseY,
                    h,
                    hasCat: Math.random() < 0.75,
                    tilt: (Math.random() - 0.5) * 0.11,
                    phase: Math.random() * Math.PI * 2
                });
            } else if (r < 0.64) {
                flora.push({
                    type: 'iris',
                    x,
                    baseY,
                    h: Math.round((30 + Math.random() * 34) * edgeScale),
                    col: Math.random() < 0.6 ? '#facc15' : '#c084fc',
                    phase: Math.random() * Math.PI * 2
                });
            } else if (r < 0.82) {
                flora.push({
                    type: 'loosestrife',
                    x,
                    baseY,
                    h: Math.round((34 + Math.random() * 36) * edgeScale),
                    hue: Math.random() < 0.5 ? '#e879f9' : '#f472b6',
                    phase: Math.random() * Math.PI * 2
                });
            } else {
                flora.push({
                    type: 'papyrus',
                    x,
                    baseY,
                    h: Math.round((36 + Math.random() * 42) * edgeScale),
                    phase: Math.random() * Math.PI * 2
                });
            }
        }

        for (let i = 0; i < 18; i++) {
            const lx = 24 + Math.random() * (pw - 48);
            const ly = ph - 8 - Math.random() * 36;
            flora.push({
                type: 'lily',
                x: Math.round(lx),
                y: Math.round(ly),
                r: 5 + Math.floor(Math.random() * 5),
                flower: i % 2 === 0,
                flowerCol: ['#fde047', '#f472b6', '#f8fafc'][i % 3],
                phase: Math.random() * Math.PI * 2
            });
        }

        // BÖLÜM SONU: SULAK ALAN BAŞLANGIÇ FLORASI
    } else if (hab.sceneProfile === 'botanical') {
        // BÖLÜM BAŞI: BOTANİK BAHÇE BAŞLANGIÇ FLORASI
        const reach = Math.min(155, Math.round(pw * 0.30));
        const boughZones = [
            { startX: 6, endX: reach - 4, isLeft: true },
            { startX: pw - reach + 4, endX: pw - 6, isLeft: false }
        ];
        boughZones.forEach(zone => {
            for (let x = zone.startX; x <= zone.endX; x += 6 + Math.floor(Math.random() * 4)) {
                const t = zone.isLeft ? (x / reach) : ((pw - x) / reach);
                const branchY = Math.round(5 + Math.pow(t, 1.2) * 15 + Math.sin(x * 0.09) * 1.5);
                const len = Math.round((1 - t * 0.52) * 34 + 12 + Math.random() * 14);
                flora.push({
                    type: 'wisteria_cluster',
                    x: Math.round(x),
                    branchY,
                    len,
                    hue: ['#c084fc', '#e879f9', '#f472b6', '#818cf8'][Math.floor(Math.random() * 4)],
                    phase: Math.random() * Math.PI * 2
                });
            }
        });

        for (let x = 10; x < pw - 10; x += 7 + Math.floor(Math.random() * 5)) {
            const nx = x / Math.max(1, pw);
            if (Math.abs(nx - 0.5) < 0.06 && Math.random() < 0.65) continue;

            const baseY = getGroundY(x, 'botanical', pw, ph) + Math.round((Math.random() - 0.5) * 3);
            const r = Math.random();

            if (r < 0.24 && (nx < 0.42 || nx > 0.58)) {
                flora.push({
                    type: 'buddleia',
                    x,
                    baseY,
                    h: 28 + Math.random() * 26,
                    hue: ['#c084fc', '#e879f9', '#f472b6', '#facc15'][Math.floor(Math.random() * 4)],
                    tilt: (nx < 0.5 ? 1 : -1) * (0.12 + Math.random() * 0.14),
                    phase: Math.random() * Math.PI * 2
                });
            } else if (r < 0.42 && (nx < 0.36 || nx > 0.64)) {
                flora.push({
                    type: 'hydrangea',
                    x,
                    baseY,
                    r: 6 + Math.floor(Math.random() * 4),
                    hue: ['#60a5fa', '#c084fc', '#f472b6'][Math.floor(Math.random() * 3)],
                    phase: Math.random() * Math.PI * 2
                });
            } else if (r < 0.60) {
                flora.push({
                    type: 'fern',
                    x,
                    baseY,
                    h: 15 + Math.random() * 18,
                    dir: Math.random() < 0.5 ? 1 : -1,
                    phase: Math.random() * Math.PI * 2
                });
            } else if (r < 0.76) {
                flora.push({
                    type: 'glow_mushroom',
                    x,
                    baseY,
                    h: 8 + Math.random() * 11,
                    capR: 3 + Math.floor(Math.random() * 3),
                    col: Math.random() < 0.5 ? '#38bdf8' : '#a855f7',
                    phase: Math.random() * Math.PI * 2
                });
            } else if (r < 0.90) {
                flora.push({
                    type: 'foxglove',
                    x,
                    baseY,
                    h: 24 + Math.random() * 24,
                    hue: Math.random() < 0.5 ? '#e879f9' : '#60a5fa',
                    phase: Math.random() * Math.PI * 2
                });
            } else {
                flora.push({
                    type: 'meadow',
                    x,
                    baseY,
                    h: 16 + Math.random() * 22,
                    hasBloom: true,
                    kind: 'nightbloom',
                    phase: Math.random() * Math.PI * 2
                });
            }
        }

        // BÖLÜM SONU: BOTANİK BAHÇE BAŞLANGIÇ FLORASI
    } else if (hab.sceneProfile === 'reef') {
        // BÖLÜM BAŞI: MERCAN RESİFİ BAŞLANGIÇ FLORASI
        for (let x = 10; x < pw - 10; x += 9 + Math.floor(Math.random() * 6)) {
            const nx = x / Math.max(1, pw);
            const sideMound = nx < 0.26 ? Math.pow((0.26 - nx) / 0.26, 1.5) * 34
                            : (nx > 0.74 ? Math.pow((nx - 0.74) / 0.26, 1.5) * 34 : 0);
            const baseY = Math.round(getGroundY(x, 'reef', pw, ph) - sideMound);
            const r = Math.random();
            const hue = [285, 325, 190, 165, 45][Math.floor(Math.random() * 5)];

            if ((nx < 0.24 || nx > 0.76) && r < 0.38) {
                flora.push({
                    type: 'kelp',
                    x,
                    baseY,
                    h: 48 + Math.random() * 56,
                    phase: Math.random() * Math.PI * 2
                });
            } else if (r < 0.25) {
                flora.push({
                    type: 'staghorn_coral',
                    x,
                    baseY,
                    h: 16 + Math.random() * 18,
                    hue,
                    phase: Math.random() * Math.PI * 2
                });
            } else if (r < 0.45) {
                flora.push({
                    type: 'brain_coral',
                    x,
                    baseY,
                    r: 6 + Math.floor(Math.random() * 5),
                    hue,
                    phase: Math.random() * Math.PI * 2
                });
            } else if (r < 0.65) {
                flora.push({
                    type: 'tube_sponge',
                    x,
                    baseY,
                    h: 15 + Math.random() * 22,
                    hue,
                    phase: Math.random() * Math.PI * 2
                });
            } else if (r < 0.82) {
                flora.push({
                    type: 'anemone',
                    x,
                    baseY,
                    h: 14 + Math.random() * 12,
                    hue,
                    phase: Math.random() * Math.PI * 2
                });
            } else {
                flora.push({
                    type: 'sea_fan',
                    x,
                    baseY,
                    h: 22 + Math.random() * 28,
                    hue,
                    phase: Math.random() * Math.PI * 2
                });
            }
        }

        // BÖLÜM SONU: MERCAN RESİFİ BAŞLANGIÇ FLORASI
    } else if (hab.sceneProfile === 'koi-pond') {
        // BÖLÜM BAŞI: KOİ GÖLETİ BAŞLANGIÇ FLORASI
        const mapleReach = Math.min(150, Math.round(pw * 0.30));
        for (let x = 8; x <= mapleReach - 4; x += 6 + Math.floor(Math.random() * 4)) {
            const t = x / mapleReach;
            const branchY = Math.round(6 + Math.pow(t, 1.2) * 14 + Math.sin(x * 0.09) * 1.5);
            const len = Math.round((1 - t * 0.55) * 26 + 8 + Math.random() * 10);
            flora.push({
                type: 'maple_bough',
                x: Math.round(x),
                branchY,
                len,
                col: ['#ef4444', '#dc2626', '#f97316', '#fb7185'][Math.floor(Math.random() * 4)],
                phase: Math.random() * Math.PI * 2
            });
        }

        // Sağ kıyıda sık bir duvar yerine aralıklı, farklı boylarda bambu kümesi.
        const bambooStart = Math.max(pw - 104, Math.round(pw * 0.80));
        const lanternX = Math.round(pw * 0.91);
        for (let x = bambooStart; x < pw - 6; x += 12 + Math.floor(Math.random() * 6)) {
            if (Math.abs(x - lanternX) < 18) continue;
            const baseY = getGroundY(x, 'koi-pond', pw, ph) - 2;
            flora.push({
                type: 'bamboo_stalk',
                x,
                baseY,
                h: Math.round(ph * (0.40 + Math.random() * 0.35)),
                lean: (Math.random() - 0.5) * 0.08,
                phase: Math.random() * Math.PI * 2
            });
        }

        for (let x = 10; x < pw * 0.28; x += 8 + Math.floor(Math.random() * 6)) {
            const baseY = getGroundY(x, 'koi-pond', pw, ph) - 1;
            if (Math.random() < 0.55) {
                flora.push({
                    type: 'iris',
                    x,
                    baseY,
                    h: 20 + Math.random() * 20,
                    col: Math.random() < 0.65 ? '#c084fc' : '#facc15',
                    phase: Math.random() * Math.PI * 2
                });
            } else {
                flora.push({
                    type: 'papyrus',
                    x,
                    baseY,
                    h: 22 + Math.random() * 24,
                    phase: Math.random() * Math.PI * 2
                });
            }
        }

        // Su yüzeyindeki küçük izler seyrek ve düşük kontrastlı tutulur.
        for (let i = 0; i < 20; i++) {
            flora.push({
                type: 'pebble',
                x: 20 + Math.random() * (pw - 40),
                y: 36 + Math.random() * (ph - 48),
                w: 2 + Math.floor(Math.random() * 3),
                h: 1 + Math.floor(Math.random() * 2),
                shade: [
                    'rgba(13, 48, 57, 0.20)',
                    'rgba(28, 74, 76, 0.18)',
                    'rgba(63, 119, 112, 0.13)',
                    'rgba(8, 37, 43, 0.16)'
                ][i % 4]
            });
        }

        // Nilüferler rastgele tek tek dağılmak yerine küçük, doğal kümeler oluşturur.
        const lilyPockets = [
            { x: pw * 0.17, y: ph * 0.67, count: 5 },
            { x: pw * 0.38, y: ph * 0.47, count: 3 },
            { x: pw * 0.69, y: ph * 0.64, count: 3 },
            { x: pw * 0.81, y: ph * 0.43, count: 2 }
        ];
        let lilyIndex = 0;
        lilyPockets.forEach((pocket, pocketIndex) => {
            for (let i = 0; i < pocket.count; i++) {
                const lx = pocket.x + (Math.random() - 0.5) * 34;
                const ly = pocket.y + (Math.random() - 0.5) * 22;
                flora.push({
                    type: 'lily',
                    x: Math.round(lx),
                    y: Math.round(ly),
                    r: 6 + Math.floor(Math.random() * 4),
                    flower: (lilyIndex + pocketIndex) % 3 !== 1,
                    flowerCol: ['#f7a6c8', '#fff4dc', '#f2d57e'][lilyIndex % 3],
                    phase: Math.random() * Math.PI * 2
                });
                lilyIndex++;
            }
        });

        // BÖLÜM SONU: KOİ GÖLETİ BAŞLANGIÇ FLORASI
    } else if (hab.sceneProfile === 'rainforest') {
        // BÖLÜM BAŞI: YAĞMUR ORMANI BAŞLANGIÇ FLORASI
        for (let x = 7; x < pw - 7; x += 7 + Math.floor(Math.random() * 8)) {
            const nx = x / Math.max(1, pw);
            const inCenterValley = nx > 0.34 && nx < 0.66;
            if (inCenterValley && Math.random() < 0.18) continue;

            const roll = Math.random();
            const scaleM = inCenterValley ? 0.86 : 1.0;
            if (roll < 0.30) {
                flora.push({
                    type: 'tropical_leaf',
                    x,
                    h: (34 + Math.random() * 40) * scaleM,
                    dir: Math.random() < 0.5 ? -1 : 1,
                    hue: Math.random() < 0.5 ? '#0f766e' : '#15803d',
                    phase: Math.random() * Math.PI * 2
                });
            } else if (roll < 0.52) {
                flora.push({
                    type: 'jungle_fern',
                    x,
                    h: (24 + Math.random() * 24) * scaleM,
                    dir: Math.random() < 0.5 ? -1 : 1,
                    phase: Math.random() * Math.PI * 2
                });
            } else if (roll < 0.70) {
                flora.push({
                    type: 'bromeliad',
                    x,
                    h: (20 + Math.random() * 20) * scaleM,
                    hue: Math.random() < 0.5 ? '#e11d48' : '#f97316',
                    phase: Math.random() * Math.PI * 2
                });
            } else if (roll < 0.86) {
                flora.push({
                    type: 'heliconia',
                    x,
                    h: (32 + Math.random() * 32) * scaleM,
                    hue: ['#e11d48', '#f97316', '#facc15'][Math.floor(Math.random() * 3)],
                    phase: Math.random() * Math.PI * 2
                });
            } else {
                flora.push({
                    type: 'orchid',
                    x,
                    h: (24 + Math.random() * 26) * scaleM,
                    hue: Math.random() < 0.5 ? '#e879f9' : '#f9a8d4',
                    phase: Math.random() * Math.PI * 2
                });
            }
        }

        const treeSpecs = [
            { baseX: Math.floor(pw * 0.14), top: Math.floor(ph * 0.24), idx: 0, prog: 0.42 },
            { baseX: Math.floor(pw * 0.27), top: Math.floor(ph * 0.36), idx: 1, prog: 0.46 },
            { baseX: Math.floor(pw * 0.42), top: Math.floor(ph * 0.32), idx: 2, prog: 0.44 },
            { baseX: Math.floor(pw * 0.58), top: Math.floor(ph * 0.30), idx: 3, prog: 0.43 },
            { baseX: Math.floor(pw * 0.75), top: Math.floor(ph * 0.34), idx: 4, prog: 0.40 },
            { baseX: Math.floor(pw * 0.86), top: Math.floor(ph * 0.22), idx: 5, prog: 0.48 }
        ];
        const epiphyteAnchors = [
            { x: 16, y: Math.round(ph * 0.45) },
            ...treeSpecs.map(t => {
                const y = Math.round(t.top + t.prog * (ph - t.top));
                const curve = Math.sin(t.prog * Math.PI * 1.2 + t.idx) * 2.5;
                return { x: Math.round(t.baseX + curve), y };
            }),
            { x: pw - 18, y: Math.round(ph * 0.52) }
        ];
        epiphyteAnchors.forEach((pt, i) => {
            flora.push({
                type: 'epiphyte',
                x: pt.x,
                y: pt.y,
                hue: ['#f472b6', '#e879f9', '#facc15'][i % 3],
                phase: i * 1.1
            });
        });

        const vineXPositions = [
            pw * 0.05, pw * 0.13, pw * 0.22, pw * 0.33, pw * 0.42,
            pw * 0.58, pw * 0.67, pw * 0.78, pw * 0.87, pw * 0.95
        ];
        vineXPositions.forEach((vx, i) => {
            flora.push({
                type: 'canopy_vine',
                x: Math.round(vx),
                startY: 5 + (i % 4) * 7,
                len: 42 + (i % 3) * 16 + (i % 4 === 0 ? 22 : 0),
                phase: i * 0.9,
                hue: i % 3 === 0 ? '#22a65a' : (i % 2 === 0 ? '#15803d' : '#0f766e')
            });
        });

        const monsteraAnchors = [
            { x: 0.06, h: 48, dir: 1 },
            { x: 0.27, h: 58, dir: -1 },
            { x: 0.73, h: 54, dir: 1 },
            { x: 0.94, h: 46, dir: -1 }
        ];
        monsteraAnchors.forEach((plant, i) => {
            flora.push({
                type: 'monstera',
                x: Math.round(pw * plant.x),
                h: plant.h + Math.random() * 10,
                dir: plant.dir,
                hue: i % 2 === 0 ? '#16804a' : '#0f6b40',
                phase: i * 1.3
            });
        });

        // BÖLÜM SONU: YAĞMUR ORMANI BAŞLANGIÇ FLORASI
    } else if (hab.sceneProfile === 'arctic-tundra') {
        // BÖLÜM BAŞI: KUTUP TUNDURASI BAŞLANGIÇ FLORASI
        const ledges = getArcticLedges(pw, ph);
        ledges.forEach(l => {
            for (let x = l.x1 + 8; x < l.x2 - 8; x += 12 + Math.floor(Math.random() * 10)) {
                if (l.id === 5 && x > pw * 0.68 && x < pw * 0.78) continue;
                const by = l.yFn(x);
                const r = Math.random();
                if (r < 0.48) {
                    flora.push({ type: 'cotton_grass', x, baseY: by, h: 10 + Math.random() * 10, phase: Math.random() * Math.PI * 2 });
                } else if (r < 0.78) {
                    flora.push({ type: 'arctic_crystal', x, baseY: by, h: 8 + Math.random() * 8, col: Math.random() < 0.5 ? '#38bdf8' : '#c084fc' });
                } else {
                    flora.push({ type: 'arctic_berry_bush', x, baseY: by, r: 5 + Math.floor(Math.random() * 3), phase: Math.random() * Math.PI * 2 });
                }
            }
        });
        // BÖLÜM SONU: KUTUP TUNDURASI BAŞLANGIÇ FLORASI
    }
}

// ============================================================================
// BÖLÜM SONU: BİYOMA GÖRE FLORA YERLEŞİMİ
// ============================================================================
