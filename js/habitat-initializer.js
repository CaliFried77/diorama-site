import {
    currentHabitatIdx, HABITATS, creatures, stimuli, ambientParticles, flora,
    bgSilhouettes, shootingStars, pw, ph, setCurrentHabitatIndex,
} from './07-habitat-state.js';
import {
    PixelBee, PixelBetta, PixelDragonfly, PixelButterfly, PixelJellyfish,
    PixelKoi, PixelParrot, PixelArcticFox,
} from './08-creatures.js';
import { getArcticLedges } from './arctic-geometry.js';
import { getGroundY } from './habitat-geometry.js';
import { sceneCache } from './scene-state.js';

/* HABITAT INITIALIZER — resets shared state and builds the selected habitat's scene data. */

// ============================================================================
// BÖLÜM BAŞI: CANLI PROFİLLERİ VE HABİTATIN İLK KURULUMU
// Katalogdaki profile göre bitki, partikül ve canlı dizilerini hazırlar.
// ============================================================================

const CREATURE_PROFILES = Object.freeze({
    bee: { count: 8, create: () => new PixelBee() },
    betta: { count: 7, create: () => new PixelBetta() },
    dragonfly: { count: 7, create: () => new PixelDragonfly() },
    butterfly: { count: 8, create: () => new PixelButterfly() },
    jellyfish: { count: 8, create: () => new PixelJellyfish() },
    koi: { count: 7, create: () => new PixelKoi() },
    parrot: { count: 5, create: () => new PixelParrot() },
    arctic_fox: { count: 7, create: () => new PixelArcticFox() },
});

export function initHabitat(idx) {
    setCurrentHabitatIndex(idx);
    const hab = HABITATS[currentHabitatIdx];

    document.getElementById('habitatNameLabel').textContent = hab.name;
    const announcement = document.getElementById('habitatAnnouncement');
    if (announcement) announcement.textContent = `Habitat değiştirildi: ${hab.name}`;
    document.getElementById('habitatFeedHint').textContent = hab.hint;
    const dot = document.getElementById('habitatDot');
    dot.style.backgroundColor = hab.dotColor;

    creatures.length = 0;
    stimuli.length = 0;
    ambientParticles.length = 0;
    flora.length = 0;
    bgSilhouettes.length = 0;
    shootingStars.length = 0;
    sceneCache.staticEnvCache = null;

    for (let x = 0; x < pw; x += 3) {
        const nx = x / Math.max(1, pw);
        const valleyMask = 0.55 + Math.pow(Math.abs(nx - 0.5) * 1.8, 1.4) * 0.75;
        const h1 = Math.round((18 + Math.sin(x * 0.016) * 10 + Math.cos(x * 0.042) * 5) * valleyMask);
        bgSilhouettes.push({ x, h: h1 });
    }

    for (let i = 0; i < 40; i++) {
        ambientParticles.push({
            x: Math.random() * pw,
            y: Math.random() * ph,
            speed: 0.06 + Math.random() * 0.14,
            phase: Math.random() * Math.PI * 2,
            size: Math.random() < 0.82 ? 1 : 2
        });
    }

    if (hab.sceneProfile === 'meadow') {
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

    } else if (hab.sceneProfile === 'betta-aquarium') {
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

    } else if (hab.sceneProfile === 'wetland') {
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

    } else if (hab.sceneProfile === 'botanical') {
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

    } else if (hab.sceneProfile === 'reef') {
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

    } else if (hab.sceneProfile === 'koi-pond') {
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

        const bambooStart = Math.max(pw - 86, Math.round(pw * 0.78));
        for (let x = bambooStart; x < pw - 6; x += 7 + Math.floor(Math.random() * 4)) {
            const baseY = getGroundY(x, 'koi-pond', pw, ph) - 2;
            flora.push({
                type: 'bamboo_stalk',
                x,
                baseY,
                h: Math.round(ph * 0.58 + Math.random() * (ph * 0.32)),
                lean: (Math.random() - 0.55) * 0.06,
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

        for (let i = 0; i < 36; i++) {
            flora.push({
                type: 'pebble',
                x: 20 + Math.random() * (pw - 40),
                y: 36 + Math.random() * (ph - 48),
                w: 3 + Math.floor(Math.random() * 5),
                h: 2 + Math.floor(Math.random() * 3),
                shade: ['#0c2536', '#123347', '#194158', '#081b29'][i % 4]
            });
        }

        for (let i = 0; i < 14; i++) {
            const lx = 26 + Math.random() * (pw - 95);
            const ly = 36 + Math.random() * (ph - 58);
            flora.push({
                type: 'lily',
                x: Math.round(lx),
                y: Math.round(ly),
                r: 7 + Math.floor(Math.random() * 5),
                flower: i % 2 === 0,
                flowerCol: ['#f472b6', '#f8fafc', '#fde047'][i % 3],
                phase: Math.random() * Math.PI * 2
            });
        }

    } else if (hab.sceneProfile === 'rainforest') {
        for (let x = 8; x < pw - 8; x += 9 + Math.floor(Math.random() * 8)) {
            const nx = x / Math.max(1, pw);
            const inCenterValley = nx > 0.34 && nx < 0.66;
            if (inCenterValley && Math.random() < 0.45) continue;

            const roll = Math.random();
            const scaleM = inCenterValley ? 0.68 : 1.0;
            if (roll < 0.30) {
                flora.push({
                    type: 'tropical_leaf',
                    x,
                    h: (32 + Math.random() * 38) * scaleM,
                    dir: Math.random() < 0.5 ? -1 : 1,
                    hue: Math.random() < 0.5 ? '#0f766e' : '#15803d',
                    phase: Math.random() * Math.PI * 2
                });
            } else if (roll < 0.52) {
                flora.push({
                    type: 'jungle_fern',
                    x,
                    h: (20 + Math.random() * 22) * scaleM,
                    dir: Math.random() < 0.5 ? -1 : 1,
                    phase: Math.random() * Math.PI * 2
                });
            } else if (roll < 0.70) {
                flora.push({
                    type: 'bromeliad',
                    x,
                    h: (18 + Math.random() * 16) * scaleM,
                    hue: Math.random() < 0.5 ? '#e11d48' : '#f97316',
                    phase: Math.random() * Math.PI * 2
                });
            } else if (roll < 0.86) {
                flora.push({
                    type: 'heliconia',
                    x,
                    h: (30 + Math.random() * 28) * scaleM,
                    hue: ['#e11d48', '#f97316', '#facc15'][Math.floor(Math.random() * 3)],
                    phase: Math.random() * Math.PI * 2
                });
            } else {
                flora.push({
                    type: 'orchid',
                    x,
                    h: (22 + Math.random() * 24) * scaleM,
                    hue: Math.random() < 0.5 ? '#e879f9' : '#f9a8d4',
                    phase: Math.random() * Math.PI * 2
                });
            }
        }

        const treeSpecs = [
            { baseX: Math.floor(pw * 0.14), top: Math.floor(ph * 0.24), idx: 0, prog: 0.42 },
            { baseX: Math.floor(pw * 0.27), top: Math.floor(ph * 0.36), idx: 1, prog: 0.46 },
            { baseX: Math.floor(pw * 0.75), top: Math.floor(ph * 0.34), idx: 2, prog: 0.40 },
            { baseX: Math.floor(pw * 0.86), top: Math.floor(ph * 0.22), idx: 3, prog: 0.48 }
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
            pw * 0.07, pw * 0.16, pw * 0.28, pw * 0.73, pw * 0.84, pw * 0.93
        ];
        vineXPositions.forEach((vx, i) => {
            flora.push({
                type: 'canopy_vine',
                x: Math.round(vx),
                startY: 6 + (i % 3) * 8,
                len: 36 + (i % 2) * 24 + (i === 0 || i === 5 ? 22 : 0),
                phase: i * 0.9,
                hue: i % 2 === 0 ? '#15803d' : '#0f766e'
            });
        });

    } else if (hab.sceneProfile === 'arctic-tundra') {
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
    }

    const creatureProfile = CREATURE_PROFILES[hab.creatureProfile];
    if (creatureProfile) {
        for (let i = 0; i < creatureProfile.count; i++) creatures.push(creatureProfile.create());
    }
}

// ============================================================================
// BÖLÜM SONU: HABİTATIN İLK KURULUMU
// ============================================================================
