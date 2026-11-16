import { currentHabitatIdx, HABITATS, creatures, stimuli, ambientParticles, flora, bgSilhouettes, shootingStars, pw, ph, lerpHex, ctx, pRect, frameChance, frameScale, setCurrentHabitatIndex } from './07-habitat-state.js';
import { PixelBee, PixelBetta, PixelDragonfly, PixelButterfly, PixelJellyfish, PixelKoi, PixelParrot } from './08-creatures.js';
import { isLightMode } from './01-core-ui.js';
import { wxFxOn, drawWxSky } from './03-weather.js';
import { sceneCache } from './scene-state.js';

const CREATURE_PROFILES = Object.freeze({
    bee: { count: 8, create: () => new PixelBee() },
    betta: { count: 7, create: () => new PixelBetta() },
    dragonfly: { count: 7, create: () => new PixelDragonfly() },
    butterfly: { count: 8, create: () => new PixelButterfly() },
    jellyfish: { count: 8, create: () => new PixelJellyfish() },
    koi: { count: 7, create: () => new PixelKoi() },
    parrot: { count: 5, create: () => new PixelParrot() },
});

function getGroundY(x, profile) {
    const nx = x / Math.max(1, pw);
    if (profile === 'meadow') {
        const edgeLift = Math.pow(Math.abs(nx - 0.52) * 1.9, 1.6) * 12;
        return Math.round(ph - 4 - edgeLift - Math.sin(x * 0.028) * 2.5);
    }
    if (profile === 'rainforest') {
        const valley = Math.pow(Math.abs(nx - 0.5) * 2, 1.5) * 14;
        return Math.round(ph - 4 - valley - Math.sin(x * 0.035) * 2);
    }
    if (profile === 'wetland') {
        const bankFactor = Math.max(0, Math.abs(nx - 0.5) - 0.14) / 0.36;
        const bankLift = Math.pow(bankFactor, 1.35) * 26;
        return Math.round(ph - 6 - bankLift - Math.sin(x * 0.04) * 2);
    }
    if (profile === 'botanical') {
        const terrace = Math.pow(Math.abs(nx - 0.5) * 1.85, 1.45) * 15;
        return Math.round(ph - 5 - terrace - Math.sin(x * 0.032) * 2.5);
    }
    if (profile === 'reef') {
        const shelfLift = Math.pow(Math.abs(nx - 0.5) * 1.95, 1.5) * 22;
        return Math.round(ph - 5 - shelfLift - Math.sin(x * 0.045) * 2.5 - Math.cos(x * 0.11) * 1.5);
    }
    if (profile === 'koi-pond') {
        const cornerBank = Math.max(0, Math.abs(nx - 0.48) - 0.24) / 0.28;
        return Math.round(ph - 4 - Math.pow(cornerBank, 1.4) * 18 - Math.sin(x * 0.04) * 2);
    }
    return ph;
}

/* ============================================================================
   DIORAMA INITIALIZATION & LAYERED ENVIRONMENT GENERATOR
   ============================================================================ */
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
        for (let x = 12; x < pw - 10; x += 6 + Math.floor(Math.random() * 5)) {
            const r = Math.random();
            if (r < 0.16 && (x > 68 && x < pw * 0.42 || x > pw * 0.68)) {
                flora.push({
                    type: 'sunflower',
                    x,
                    h: 30 + Math.random() * 22,
                    headR: 4 + Math.floor(Math.random() * 2),
                    phase: Math.random() * Math.PI * 2
                });
            } else if (r < 0.34) {
                flora.push({
                    type: 'foxglove',
                    x,
                    h: 22 + Math.random() * 20,
                    hue: Math.random() < 0.5 ? '#c084fc' : '#f472b6',
                    phase: Math.random() * Math.PI * 2
                });
            } else {
                flora.push({
                    type: 'meadow',
                    x,
                    h: 12 + Math.random() * 22,
                    hasBloom: Math.random() < 0.68,
                    kind: ['lavender', 'daisy', 'poppy', 'buttercup'][Math.floor(Math.random() * 4)],
                    phase: Math.random() * Math.PI * 2
                });
            }
        }

    } else if (hab.sceneProfile === 'betta-aquarium') {
        // 1. Takashi Amano U-Shaped Concave Stem-Plant Layout (Tall lush sides, open central river-sand canyon)
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

        // 2. Floating Water Lettuce (Pistia) & Amazon Frogbit along the top water surface
        for (let fx = 14; fx < pw - 14; fx += 18 + Math.floor(Math.random() * 14)) {
            flora.push({
                type: 'pistia',
                x: fx,
                rootLen: 12 + Math.random() * 18,
                phase: Math.random() * Math.PI * 2
            });
        }

        // 3. Natural River Pebbles & Volcanic Aquasoil Granules anchoring the foreground floor
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
                : getGroundY(x, 'wetland') + Math.round((Math.random() - 0.5) * 6);

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

            const baseY = getGroundY(x, 'botanical') + Math.round((Math.random() - 0.5) * 3);
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
        const archReach = Math.min(135, Math.round(pw * 0.25));
        [
            { startX: 6, endX: archReach - 4, isLeft: true },
            { startX: pw - archReach + 4, endX: pw - 6, isLeft: false }
        ].forEach(zone => {
            for (let x = zone.startX; x <= zone.endX; x += 8 + Math.floor(Math.random() * 5)) {
                const t = zone.isLeft ? (x / archReach) : ((pw - x) / archReach);
                const archY = Math.round(4 + Math.pow(1 - t, 1.3) * 18);
                flora.push({
                    type: 'sea_vine',
                    x: Math.round(x),
                    startY: archY,
                    len: Math.round((1 - t * 0.6) * 28 + 10 + Math.random() * 12),
                    col: Math.random() < 0.5 ? '#38bdf8' : '#e879f9',
                    phase: Math.random() * Math.PI * 2
                });
            }
        });

        for (let x = 10; x < pw - 10; x += 9 + Math.floor(Math.random() * 6)) {
            const nx = x / Math.max(1, pw);
            const baseY = getGroundY(x, 'reef') + Math.round((Math.random() - 0.5) * 2);
            const r = Math.random();
            const hue = [285, 325, 190, 165, 45][Math.floor(Math.random() * 5)];

            if ((nx < 0.22 || nx > 0.78) && r < 0.36) {
                flora.push({
                    type: 'kelp',
                    x,
                    baseY,
                    h: 52 + Math.random() * 62,
                    phase: Math.random() * Math.PI * 2
                });
            } else if (r < 0.24) {
                flora.push({
                    type: 'staghorn_coral',
                    x,
                    baseY,
                    h: 18 + Math.random() * 20,
                    hue,
                    phase: Math.random() * Math.PI * 2
                });
            } else if (r < 0.44) {
                flora.push({
                    type: 'brain_coral',
                    x,
                    baseY,
                    r: 6 + Math.floor(Math.random() * 5),
                    hue,
                    phase: Math.random() * Math.PI * 2
                });
            } else if (r < 0.64) {
                flora.push({
                    type: 'tube_sponge',
                    x,
                    baseY,
                    h: 16 + Math.random() * 24,
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
                    h: 24 + Math.random() * 30,
                    hue,
                    phase: Math.random() * Math.PI * 2
                });
            }
        }

    } else if (hab.sceneProfile === 'koi-pond') {
        // 1. Cascading Crimson Japanese Maple (Momiji) Leaf Clusters along the top-left bough
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

        // 2. Swaying Arashiyama Bamboo Stalks framing the Right Courtyard Bank
        const bambooStart = Math.max(pw - 86, Math.round(pw * 0.78));
        for (let x = bambooStart; x < pw - 6; x += 7 + Math.floor(Math.random() * 4)) {
            const baseY = getGroundY(x, 'koi-pond') - 2;
            flora.push({
                type: 'bamboo_stalk',
                x,
                baseY,
                h: Math.round(ph * 0.58 + Math.random() * (ph * 0.32)),
                lean: (Math.random() - 0.55) * 0.06,
                phase: Math.random() * Math.PI * 2
            });
        }

        // 3. Shoreline Water Irises & Horsetail Reeds (Equisetum) along the Left & Upper-Left Mossy Rocks
        for (let x = 10; x < pw * 0.28; x += 8 + Math.floor(Math.random() * 6)) {
            const baseY = getGroundY(x, 'koi-pond') - 1;
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

        // 4. Submerged Smooth River Cobbles across the deep pond bed
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

        // 5. Floating Suiren (Water Lily Pads) & Blooming Pink/White/Gold Lotus Flowers
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

        const epiphyteAnchors = [
            { x: 18, y: ph * 0.44 },
            { x: Math.round(pw * 0.14), y: ph * 0.52 },
            { x: Math.round(pw * 0.25), y: ph * 0.58 },
            { x: Math.round(pw * 0.78), y: ph * 0.48 },
            { x: pw - 22, y: ph * 0.42 },
            { x: pw - 16, y: ph * 0.62 }
        ];
        epiphyteAnchors.forEach((pt, i) => {
            flora.push({
                type: 'epiphyte',
                x: pt.x,
                y: Math.round(pt.y),
                hue: ['#f9a8d4', '#e879f9', '#facc15'][i % 3],
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
    }

    const creatureProfile = CREATURE_PROFILES[hab.creatureProfile];
    if (creatureProfile) {
        for (let i = 0; i < creatureProfile.count; i++) creatures.push(creatureProfile.create());
    }
}

/* ============================================================================
   STATIC LAYER RENDERER (Cached once per habitat/resize for 60 FPS performance)
   ============================================================================ */
function buildStaticEnvironmentLayer(hab) {
    const off = document.createElement('canvas');
    off.width = pw;
    off.height = ph;
    const sCtx = off.getContext('2d');
    const sRect = (x, y, w, h, col) => {
        sCtx.fillStyle = col;
        sCtx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    };

    // 1. Distant Mountain / Reef Horizon Silhouette
    const silCol = isLightMode ? 'rgba(15, 42, 62, 0.20)' : 'rgba(3, 8, 18, 0.42)';
    bgSilhouettes.forEach(sil => {
        sRect(sil.x, ph - sil.h, 3, sil.h, silCol);
    });

    const mistCol = isLightMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(148, 163, 184, 0.035)';
    sRect(0, ph - 28, pw, 10, mistCol);

    // 2. MEADOW STATIC SCENERY
    if (hab.sceneProfile === 'meadow') {
        const trunkCol = isLightMode ? '#451a03' : '#1c1217';
        const barkHi = isLightMode ? '#78350f' : '#2e1d24';
        const leafDark = isLightMode ? '#14532d' : '#0b221e';
        const leafMid = isLightMode ? '#15803d' : '#11332b';
        const leafHi = isLightMode ? '#22c55e' : '#1b4d3e';

        const groveX = Math.round(pw * 0.26);
        for (let y = ph - 82; y < ph; y++) {
            const prog = (y - (ph - 82)) / 82;
            const flare = prog > 0.78 ? Math.pow((prog - 0.78) / 0.22, 2) * 8 : 0;
            const width = Math.round(6 + prog * 5 + flare);
            const left = Math.round(groveX - flare * 0.5);
            sRect(left, y, width, 1, isLightMode ? '#5c2d16' : '#24161a');
            if (y % 9 === 0) sRect(left + width - 2, y, 2, 1, barkHi);
        }
        [[groveX + 3, ph - 96, 22, 16], [groveX + 20, ph - 89, 18, 14], [groveX - 10, ph - 88, 16, 13]].forEach(([cx, cy, rx, ry], idx) => {
            for (let dy = -ry; dy <= ry; dy++) {
                const span = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry))));
                const col = dy < -ry * 0.25 ? leafHi : (dy > ry * 0.35 ? leafDark : leafMid);
                sRect(cx - span, cy + dy, span * 2, 1, col);
                if (dy % 5 === 0 && span > 4) {
                    sRect(cx + ((dy * 7 + idx * 5) % (span - 2)), cy + dy, 2, 2, '#fbbf24');
                }
            }
        });

        for (let y = ph - 134; y < ph; y++) {
            const depth = y - (ph - 134);
            const prog = depth / 134;
            const rootFlare = prog > 0.75 ? Math.pow((prog - 0.75) / 0.25, 2) * 16 : 0;
            const w = Math.round(16 + depth * 0.16 + rootFlare);
            sRect(0, y, w, 1, trunkCol);
            sRect(w - 5, y, 3, 1, barkHi);
            if (y % 15 === 0) sRect(4, y, 4, 1, isLightMode ? '#92400e' : '#3f2830');
        }
        const branchY = ph - 119;
        for (let bx = 12; bx <= 106; bx++) {
            const by = branchY + Math.floor(Math.sin(bx * 0.055) * 3);
            const bw = Math.max(2, Math.floor(9 - (bx - 12) * 0.065));
            sRect(bx, by, 1, bw, trunkCol);
            sRect(bx, by, 1, 1, barkHi);
        }

        const canopyBlobs = [
            { cx: 24, cy: ph - 144, rx: 38, ry: 26 },
            { cx: 66, cy: ph - 136, rx: 35, ry: 24 },
            { cx: 102, cy: ph - 126, rx: 24, ry: 18 }
        ];
        canopyBlobs.forEach((b, bIdx) => {
            for (let dy = -b.ry; dy <= b.ry; dy++) {
                const span = Math.round(b.rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (b.ry * b.ry))));
                const col = dy < -b.ry * 0.3 ? leafHi : (dy > b.ry * 0.35 ? leafDark : leafMid);
                sRect(b.cx - span, b.cy + dy, span * 2, 1, col);
                if (dy % 6 === 0 && span > 6) {
                    const bx = b.cx + (((dy * 11) + bIdx * 13) % (span - 3));
                    sRect(bx, b.cy + dy, 2, 2, '#fb7185');
                }
            }
        });

        const turfTop = isLightMode ? '#16a34a' : '#0f392b';
        const turfDeep = isLightMode ? '#14532d' : '#071f18';
        for (let x = 0; x < pw; x++) {
            const gy = getGroundY(x, 'meadow');
            sRect(x, gy, 1, ph - gy, turfDeep);
            sRect(x, gy, 1, 2, turfTop);
        }

        const rx = Math.round(pw * 0.88);
        const rgy = getGroundY(rx, 'meadow');
        sRect(rx - 10, rgy - 5, 18, 7, isLightMode ? '#475569' : '#1e293b');
        sRect(rx - 8, rgy - 6, 12, 2, isLightMode ? '#94a3b8' : '#334155');
        [[rx - 14, rgy - 10, 12, 8], [rx + 2, rgy - 12, 14, 10], [rx - 5, rgy - 16, 12, 9]].forEach(([cx, cy, rxR, ryR], i) => {
            for (let dy = -ryR; dy <= ryR; dy++) {
                const span = Math.round(rxR * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ryR * ryR))));
                sRect(cx - span, cy + dy, span * 2, 1, dy < 0 ? leafHi : leafDark);
            }
            sRect(cx - 2 + i * 2, cy - 2, 2, 2, '#fb7185');
            sRect(cx + 3 - i, cy + 1, 2, 2, '#fda4af');
        });
    }

    // 3. WETLAND STATIC SCENERY
    if (hab.sceneProfile === 'wetland') {
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
    }

   // 4. BETTA AQUARIUM STATIC SCENERY (Takashi Amano Nature Aquascape: Dragon Stone Triad, Twin Spiderwood Arches, Sloped Aquasoil, Sand Path, Marimo Balls & Catappa Litter)
    if (hab.sceneProfile === 'betta-aquarium') {
        const soilY = (x) => {
            const nx = x / Math.max(1, pw);
            const mound = Math.pow(Math.abs(nx - 0.50) * 1.95, 1.45) * 18;
            return Math.round(ph - 4 - mound - Math.sin(x * 0.04) * 2);
        };

        // A. Distant Background Stem-Plant Forest Silhouette (Rotala & Vallisneria Wall on Left/Right)
        const bgPlantCol = isLightMode ? 'rgba(15, 82, 72, 0.24)' : 'rgba(6, 48, 44, 0.48)';
        for (let x = 0; x < pw; x += 3) {
            const nx = x / Math.max(1, pw);
            if (nx > 0.38 && nx < 0.62) continue;
            const stemH = Math.round((36 + Math.sin(x * 0.14) * 14 + Math.cos(x * 0.27) * 8) * (0.6 + Math.abs(nx - 0.5)));
            sRect(x, soilY(x) - stemH, 2, stemH, bgPlantCol);
        }

        // B. Right-Side Iwagumi Dragon Stone (Ohko Rock) Triad with Diagonal Eroded Pockets
        const stoneDark = isLightMode ? '#1e293b' : '#09111e';
        const stoneMid = isLightMode ? '#334155' : '#132033';
        const stoneHi = isLightMode ? '#64748b' : '#243854';
        const mossPocket = isLightMode ? '#16a34a' : '#0d9488';

        const dragonStones = [
            { bx: pw - 58, topY: ph - 68, baseW: 38, lean: -0.22 }, // Main Oyaishi Master Stone
            { bx: pw - 82, topY: ph - 44, baseW: 26, lean: -0.30 }, // Companion Stone Left
            { bx: pw - 28, topY: ph - 52, baseW: 28, lean: 0.15 }   // Companion Stone Right
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
                // Characteristic Ohko Dragon Stone diagonal clay & bioluminescent moss pockets
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

        // C. Grand Multi-Limb Sunken Spiderwood / Mangrove Root Centerpiece (Left & Upper Canopy Roots)
        const woodDark = isLightMode ? '#3f1d0b' : '#1a1014';
        const woodMid = isLightMode ? '#5c2d16' : '#2c1a21';
        const woodHi = isLightMode ? '#854d0e' : '#4a2c36';
        const maxTrunkX = Math.min(190, Math.floor(pw * 0.46));

        // 1. Primary sweeping driftwood arch & secondary upper/lower roots from Left Mound
        for (let x = 0; x < maxTrunkX; x++) {
            const t = x / maxTrunkX;
            const archY = Math.round(ph - 18 - Math.sin(t * Math.PI * 0.88) * 54 + Math.cos(t * 4) * 3);
            const thick = Math.max(2, Math.floor(15 * (1 - t * 0.74)));
            sRect(x, archY, 2, thick, woodDark);
            sRect(x, archY + 1, 2, Math.max(1, thick - 3), woodMid);
            sRect(x, archY, 2, 2, woodHi);

            // Upper reaching bough with Java Moss carpet
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

            // Lower anchor root leg plunging into the aquasoil mound
            if (t > 0.12 && t < 0.48) {
                const legT = (t - 0.12) / 0.36;
                const legY = Math.round(archY + thick + legT * (ph - (archY + thick)));
                const legW = Math.max(2, Math.floor(7 * (1 - legT * 0.5)));
                sRect(x, legY, legW, 2, woodDark);
                sRect(x, legY, 2, 1, woodHi);
            }
        }

        // 2. Right-side counter-balancing Spiderwood root emerging from the Dragon Stone cliff
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

        // D. Sloped Volcanic Aquasoil Mounds & Winding Central White-Gold River Sand Path
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

        // E. Velvety Green Marimo Moss Balls (Cladophora) & Dried Catappa (Ketapang) Almond Leaves on the Substrate
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

        // Dried amber-brown Catappa leaves resting along the sand edge
        [Math.round(pw * 0.43), Math.round(pw * 0.56)].forEach((lx, idx) => {
            const ly = soilY(lx);
            sRect(lx - 5, ly - 1, 10, 2, '#78350f');
            sRect(lx - 4, ly - 2, 7, 1, '#b45309');
            sRect(lx - 3 + idx * 2, ly - 1, 5, 1, '#d97706');
        });
    }

    // 5. BOTANICAL BUTTERFLY GARDEN STATIC SCENERY
    if (hab.sceneProfile === 'botanical') {
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
    }

    // 6. REEF STATIC SCENERY
    if (hab.sceneProfile === 'reef') {
        const rockDark = isLightMode ? '#0f2942' : '#090d24';
        const rockMid = isLightMode ? '#163e5c' : '#13193b';
        const rockHi = isLightMode ? '#1e5678' : '#232d5e';
        const neonRim = isLightMode ? '#38bdf8' : '#6366f1';

        const colShade = isLightMode ? 'rgba(15, 42, 68, 0.42)' : 'rgba(17, 14, 48, 0.68)';
        const colHi = isLightMode ? 'rgba(56, 189, 248, 0.28)' : 'rgba(139, 92, 246, 0.26)';
        const ruinX = Math.round(pw * 0.24);
        const ruinBaseY = getGroundY(ruinX, 'reef') + 2;

        [
            { cx: ruinX - 16, ch: 56, broken: false },
            { cx: ruinX + 16, ch: 44, broken: true },
            { cx: Math.round(pw * 0.77), ch: 50, broken: true }
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
        sRect(ruinX - 18, ruinBaseY - 58, 24, 3, colShade);
        sRect(ruinX - 18, ruinBaseY - 58, 22, 1, colHi);

        const archReach = Math.min(135, Math.round(pw * 0.25));
        [
            { isLeft: true, dir: 1 },
            { isLeft: false, dir: -1 }
        ].forEach(wall => {
            const wallH = Math.round(ph * 0.75);
            for (let y = 0; y < wallH; y++) {
                const prog = y / wallH;
                const jag = Math.sin(y * 0.14) * 3 + Math.cos(y * 0.06) * 2;
                const topArch = prog < 0.25 ? Math.pow((0.25 - prog) / 0.25, 1.4) * (archReach - 18) : 0;
                const botShelf = prog > 0.65 ? Math.pow((prog - 0.65) / 0.35, 1.5) * 26 : 0;
                const w = Math.max(6, Math.round(12 + topArch + botShelf + jag));
                const wx = wall.isLeft ? 0 : pw - w;

                sRect(wx, y, w, 1, rockDark);
                sRect(wall.isLeft ? w - 4 : wx + 1, y, 3, 1, rockMid);
                if (y % 4 === 0) {
                    sRect(wall.isLeft ? w - 1 : wx, y, 1, 2, neonRim);
                }
            }

            [0.46, 0.64, 0.78].forEach((ledgeProg, lIdx) => {
                const ly = Math.round(ph * ledgeProg);
                const lw = 18 + (lIdx % 2) * 8;
                const lx = wall.isLeft ? 8 + lIdx * 4 : pw - 8 - lIdx * 4 - lw;
                const plateCol = lIdx % 2 === 0 ? '#a21caf' : '#0e7490';
                const rimCol = lIdx % 2 === 0 ? '#f0abfc' : '#67e8f9';
                sRect(lx, ly, lw, 3, rockDark);
                sRect(lx - 2, ly - 2, lw + 4, 2, plateCol);
                sRect(lx - 2, ly - 3, lw + 4, 1, rimCol);
            });
        });

        for (let x = 0; x < pw; x++) {
            const gy = getGroundY(x, 'reef');
            sRect(x, gy, 1, ph - gy, rockDark);
            sRect(x, gy + 1, 1, Math.max(1, Math.floor((ph - gy) * 0.45)), rockMid);
            sRect(x, gy, 1, 2, x % 7 === 0 ? '#38bdf8' : rockHi);
            if (!isLightMode && (x % 19 === 0)) {
                sRect(x, gy + 4 + (x % 5), 3, 1, 'rgba(56, 189, 248, 0.38)');
            }
        }
    }

    // 7. KOI POND STATIC SCENERY (Kyoto Zen Courtyard, Momiji Red Maple Tree, Arched Taiko Bridge, Mossy Boulders & Yukimi Lantern)
    if (hab.sceneProfile === 'koi-pond') {
        const stoneDark = isLightMode ? '#334155' : '#0f172a';
        const stoneMid = isLightMode ? '#475569' : '#1e293b';
        const stoneHi = isLightMode ? '#64748b' : '#334155';
        const mossDark = isLightMode ? '#14532d' : '#062e22';
        const mossMid = isLightMode ? '#15803d' : '#0d4a36';
        const mossHi = isLightMode ? '#22c55e' : '#10b981';

        // A. Upper Shoreline Raked Zen Sand Terrace & Mossy Bank Edge (frames the top of the pond)
        for (let x = 0; x < pw; x++) {
            const bankH = Math.round(18 + Math.sin(x * 0.03) * 4 + Math.cos(x * 0.08) * 2);
            sRect(x, 0, 1, bankH, isLightMode ? '#1e293b' : '#09131c');
            if (x % 3 === 0) sRect(x, bankH - 5, 2, 2, mossDark);
            sRect(x, bankH - 3, 1, 2, stoneDark);
            sRect(x, bankH - 1, 1, 1, stoneHi);
            sRect(x, bankH, 1, 3, 'rgba(2, 8, 16, 0.42)'); // Waterline shadow under top bank
        }

        // B. Traditional Vermilion Arched Wooden Courtyard Bridge (Taiko-bashi) in Upper-Right Distance
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
            // Bridge reflection in water below
            sRect(wx, 25 + Math.floor(arch * 0.5), 1, 2, 'rgba(185, 28, 28, 0.22)');
            // Curved wooden deck & vermilion handrail
            sRect(wx, wy + 4, 1, 3, '#451a03');
            sRect(wx, wy, 1, 2, redMid);
            sRect(wx, wy, 1, 1, redHi);
            if (bx % 9 === 0 || bx === brWidth) {
                sRect(wx, wy - 2, 2, 6, redDark);
                sRect(wx, wy - 2, 2, 1, '#fef08a'); // Brass post cap (Giboshi)
            }
        }

        // C. Left-Side Ancient Japanese Red Maple Tree (Momiji / Acer palmatum)
        const mapleReach = Math.min(150, Math.round(pw * 0.30));
        const trunkDark = isLightMode ? '#3b1d14' : '#181014';
        const trunkMid = isLightMode ? '#5c2d1e' : '#291b21';
        const trunkHi = isLightMode ? '#7c3f2a' : '#3d2830';
        const mapleDark = isLightMode ? '#991b1b' : '#65121b';
        const mapleMid = isLightMode ? '#dc2626' : '#991b1b';
        const mapleHi = isLightMode ? '#f87171' : '#dc2626';
        const mapleGold = '#f59e0b';

        // Gnarled Momiji Trunk rooted into the left mossy bank
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

        // Overlapping Momiji Crimson Canopy Clouds hugging the top-left frame (zero floating gaps!)
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

        // Overhanging Momiji Bough supporting the foliage
        for (let s = 0; s <= mapleReach; s++) {
            const t = s / Math.max(1, mapleReach);
            const by = Math.round(6 + Math.pow(t, 1.2) * 14 + Math.sin(s * 0.09) * 1.5);
            const thick = Math.max(2, Math.round(8 * (1 - t * 0.75)));
            sRect(s, by - Math.floor(thick * 0.5), 1, thick, trunkDark);
            sRect(s, by + Math.ceil(thick * 0.5) - 1, 1, 1, trunkHi);
        }

        // D. Foreground Left & Right Mossy Zen Shoreline Banks & Stepping Stones
        for (let x = 0; x < pw; x++) {
            const nx = x / Math.max(1, pw);
            if (nx > 0.28 && nx < 0.70) continue; // Keep center pond open for Koi
            const gy = getGroundY(x, 'koi-pond');
            sRect(x, gy - 2, 1, 3, 'rgba(2, 8, 16, 0.45)');
            sRect(x, gy, 1, ph - gy, mossDark);
            sRect(x, gy, 1, 2, mossMid);
            if (x % 5 === 0) sRect(x, gy - 1, 2, 1, mossHi);
        }

        // Sculpted Zen Garden Boulders along the Left & Right Pond Corners
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

        // E. Right-Side Sanctuary Island with Yukimi-dōrō (Stone Lantern) & Shishi-odoshi Base
        const bx = pw - 42;
        const by = ph - 18;
        sRect(bx - 20, by + 6, 56, 12, isLightMode ? '#1e3a3a' : '#0a1720');
        sRect(bx - 16, by + 4, 46, 4, mossDark);
        sRect(bx - 12, by + 3, 36, 2, mossHi);

        // Stone Lantern Pedestal & Roof Structure (Light box is animated in dynamic pass)
        sRect(bx - 6, by, 13, 4, stoneDark);
        sRect(bx - 3, by - 10, 7, 10, stoneMid);
        sRect(bx - 2, by - 10, 2, 10, stoneHi);
        sRect(bx - 5, by - 17, 11, 7, stoneDark);
        sRect(bx - 10, by - 19, 21, 2, stoneDark);
        sRect(bx - 8, by - 21, 17, 2, stoneMid);
        sRect(bx - 5, by - 23, 11, 2, stoneHi);
        sRect(bx - 1, by - 25, 3, 2, stoneHi);

        // Bamboo Shishi-odoshi (Water Spout) Pipe & Support Post
        sRect(bx - 22, by - 4, 12, 2, '#65a30d');
        sRect(bx - 22, by - 4, 12, 1, '#a3e635');
        sRect(bx - 14, by - 8, 2, 12, '#4d7c0f');
    }

    // 8. RAINFOREST STATIC SCENERY
    if (hab.sceneProfile === 'rainforest') {
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
            { x: Math.floor(pw * 0.75), top: Math.floor(ph * 0.34), rx: 28, ry: 16 },
            { x: Math.floor(pw * 0.86), top: Math.floor(ph * 0.22), rx: 34, ry: 19 },
        ];
        midgroundTrees.forEach((tree, idx) => {
            const trunkCol = isLightMode ? '#2c221e' : '#101c1a';
            const barkCol = isLightMode ? '#4a372d' : '#1c302b';
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
            drawFoliageDome(tree.x, tree.top, tree.rx, tree.ry, 2);
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
            { cx: pw * 0.28, cy: 2,  rx: 30, ry: 12, s: 3 },
            { cx: pw * 0.72, cy: 2,  rx: 30, ry: 12, s: 3 },
            { cx: pw * 0.84, cy: 6,  rx: 40, ry: 18, s: 2 },
            { cx: pw * 0.95, cy: 10, rx: 46, ry: 22, s: 1 }
        ];
        canopyDomes.forEach(d => drawFoliageDome(Math.round(d.cx), d.cy, d.rx, d.ry, d.s));

        for (let x = 0; x < pw; x++) {
            const gy = getGroundY(x, 'rainforest');
            sRect(x, gy, 1, ph - gy, isLightMode ? '#0b3b2b' : '#041713');
            sRect(x, gy, 1, 2, isLightMode ? '#15803d' : '#0c4a37');
        }
    }

    return off;
}

/* ============================================================================
   CONTINUOUS SEAMLESS DIORAMA RENDERER (DAY & NIGHT ADAPTIVE)
   ============================================================================ */
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

    // Sky Celestial Bodies
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

    // Blit Cached Static Scenery Layer
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

    // Diagonal Sunbeam / Moonlight Caustic Shafts
    if (hab.sceneProfile === 'betta-aquarium' || hab.sceneProfile === 'reef' || isLightMode) {
        ctx.fillStyle = isLightMode ? 'rgba(255, 255, 255, 0.045)' : 'rgba(125, 211, 252, 0.024)';
        for (let r = 0; r < 5; r++) {
            const rx = ((r * 85 + Math.sin(time * 0.0005 + r) * 16) % pw);
            for (let y = 0; y < ph * 0.76; y += 3) {
                ctx.fillRect(Math.round(rx + y * 0.22), y, 11, 3);
            }
        }
    }

    /* =========================================================================
       DYNAMIC / ANIMATED HABITAT DETAILS (Scoped Per Biome)
       ========================================================================= */

    // 1. MEADOW: Swaying Golden Beehive on the Oak Branch
    if (hab.sceneProfile === 'meadow') {
        const branchY = ph - 119;
        const hiveSway = Math.round(Math.sin(time * 0.0016) * 1.2);
        const hx = 76 + hiveSway;
        const hy = branchY + 5;
        pRect(76, branchY + 2, 1, 4, '#78350f');
        for (let ry = 0; ry <= 12; ry++) {
            const hw = Math.round(3 + Math.sin((ry / 12) * Math.PI) * 4.5);
            const tierCol = ry % 3 === 0 ? '#b45309' : (ry % 2 === 0 ? '#f59e0b' : '#d97706');
            pRect(hx - hw, hy + ry, hw * 2 + 1, 1, tierCol);
        }
        pRect(hx - 1, hy + 7, 3, 3, '#1e1b18');
        pRect(hx, hy + 8, 1, 1, '#fef08a');
    }

    // 2. BETTA AQUARIUM: Swaying Anubias Rosettes & Rising Oxygen Bubbles
    if (hab.sceneProfile === 'betta-aquarium') {
        const maxTrunkX = Math.min(185, Math.floor(pw * 0.48));
        for (let x = 24; x < maxTrunkX - 18; x += 24) {
            const t = x / maxTrunkX;
            const archY = Math.round(ph - 14 - Math.sin(t * Math.PI * 0.88) * 54 + Math.cos(t * 4) * 3);
            const rhizomeY = archY - 2;
            pRect(x - 3, rhizomeY, 7, 2, '#064e3b');
            [-6, -3, 0, 3, 6].forEach((lx, lIdx) => {
                const sway = Math.sin(time * 0.002 + x + lIdx) * 1.2;
                const leafX = Math.round(x + lx + sway);
                const leafY = rhizomeY - 5 - (lIdx % 2) * 3;
                pRect(x + lx * 0.4, rhizomeY - 2, 1, 2, '#14532d');
                pRect(leafX - 2, leafY - 2, 5, 4, isLightMode ? '#15803d' : '#065f46');
                pRect(leafX - 1, leafY - 3, 3, 5, isLightMode ? '#22c55e' : '#10b981');
                if (!isLightMode) {
                    pRect(leafX, leafY - 3, 1, 1, '#6ee7b7');
                }
            });
        }

        for (let i = 0; i < 12; i++) {
            const cycle = (time * (0.006 + (i % 3) * 0.001) + i * 23) % Math.max(36, ph * 0.72);
            const bx = 18 + ((i * 41) % Math.max(24, pw - 36)) + Math.sin(time * 0.0008 + i) * 2;
            const by = ph - 18 - cycle;
            pRect(bx, by, 2, 2, 'rgba(186, 230, 253, 0.28)');
            pRect(bx, by, 1, 1, 'rgba(224, 242, 254, 0.58)');
        }
    }

    // 3. WETLAND: Shimmering Pond Ripples, Morning Mist, Pier Lantern Glow & Singing Tree Frog
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
            const rx = Math.round(pw * (0.35 + r * 0.14) + Math.sin(r * 2.1) * 18);
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
        pRect(stoneX - 12, stoneY + 7, 26, 4, 'rgba(2, 10, 16, 0.45)');
        pRect(stoneX - 11, stoneY, 24, 9, isLightMode ? '#475569' : '#1e293b');
        pRect(stoneX - 9, stoneY - 3, 18, 4, isLightMode ? '#64748b' : '#334155');
        pRect(stoneX - 7, stoneY - 4, 14, 2, isLightMode ? '#16a34a' : '#15803d');

        pRect(stoneX - 2, stoneY - 7, 5, 3, '#22c55e');
        pRect(stoneX - 1, stoneY - 8, 3, 1, '#4ade80');
        pRect(stoneX + 2, stoneY - 8, 1, 1, '#fef08a');
        if (Math.sin(time * 0.006) > 0.55) {
            pRect(stoneX + 3, stoneY - 6, 2, 2, '#bbf7d0');
        }

        const pierCol = isLightMode ? '#5c3a21' : '#1c1917';
        const pierHi = isLightMode ? '#854d0e' : '#332924';
        const py = ph - 40;
        pRect(0, py, 64, 3, pierCol);
        pRect(0, py, 64, 1, pierHi);
        for (let px = 2; px < 62; px += 5) {
            pRect(px, py - 1, 3, 1, pierHi);
        }
        [14, 36, 58].forEach(px => {
            pRect(px, py - 9, 3, 25, pierCol);
            pRect(px, py - 9, 1, 25, pierHi);
            pRect(px - 1, py + 15, 5, 2, 'rgba(2, 10, 16, 0.45)');
            if (px === 58) {
                const sway = Math.round(Math.sin(time * 0.0025) * 1);
                pRect(px + 2, py - 9, 5, 1, pierCol);
                pRect(px + 5 + sway, py - 8, 1, 2, '#475569');
                pRect(px + 4 + sway, py - 6, 3, 4, '#fef08a');
                pRect(px + 3 + sway, py - 7, 5, 6, 'rgba(253, 224, 71, 0.22)');
                for (let ry = 0; ry < 5; ry++) {
                    const rShift = Math.sin(time * 0.004 + ry * 1.3) * 2;
                    pRect(px + 3 + rShift, py + 15 + ry * 2, 4 - Math.floor(ry * 0.5), 1, `rgba(253, 224, 71, ${(0.38 - ry * 0.06).toFixed(2)})`);
                }
            }
        });
    }

    // 4. BOTANICAL: Hanging Glass Conservatory Lanterns, Trickling Fountain Jets & Drifting Fireflies
    if (hab.sceneProfile === 'botanical') {
        const reach = Math.min(155, Math.round(pw * 0.30));
        [Math.round(reach * 0.48), Math.round(pw - reach * 0.48)].forEach((lx, idx) => {
            const t = 0.48;
            const branchY = Math.round(5 + Math.pow(t, 1.2) * 15);
            const sway = Math.round(Math.sin(time * 0.002 + idx * 2) * 1);
            pRect(lx, branchY + 1, 1, 6, '#475569');
            pRect(lx - 2 + sway, branchY + 7, 5, 1, '#334155');
            pRect(lx - 2 + sway, branchY + 8, 5, 5, 'rgba(253, 224, 71, 0.88)');
            pRect(lx - 1 + sway, branchY + 9, 3, 3, '#ffffff');
            pRect(lx - 4 + sway, branchY + 6, 9, 9, 'rgba(253, 224, 71, 0.18)');
            pRect(lx - 2 + sway, branchY + 13, 5, 1, '#334155');
        });

        const fx = Math.round(pw * 0.18);
        const fy = getGroundY(fx, 'botanical') + 1;
        const dropPhase = (time * 0.015) % 6;
        [-1, 1].forEach(side => {
            const dx = fx + side * Math.round(2 + dropPhase * 1.4);
            const dy = fy - 29 + Math.round(dropPhase * 1.1);
            pRect(dx, dy, 1, 2, '#bae6fd');
        });
        pRect(fx - 8 + Math.sin(time * 0.005) * 4, fy - 23, 4, 1, '#ffffff');

        for (let i = 0; i < 8; i++) {
            const fxPos = (i * 73 + Math.sin(time * 0.001 + i) * 12) % pw;
            const fyPos = ph * 0.36 + Math.sin(time * 0.0014 + i * 1.7) * 22;
            const glow = 0.32 + 0.40 * (0.5 + 0.5 * Math.sin(time * 0.004 + i));
            pRect(fxPos, fyPos, 2, 2, i % 3 === 0 ? `rgba(232, 121, 249, ${glow.toFixed(2)})` : `rgba(253, 224, 71, ${glow.toFixed(2)})`);
        }
    }

    // 5. REEF: Shimmering Surface Caustics, Pulsing Giant Tridacna Clam & Rising Bioluminescent Bubble Streams
    if (hab.sceneProfile === 'reef') {
        for (let c = 0; c < 12; c++) {
            const cx = Math.round(((c * 61 + Math.sin(time * 0.001 + c) * 18) % (pw * 0.56)) + pw * 0.22);
            const cy = 3 + (c % 3) * 3;
            pRect(cx, cy, 10 + (c % 4) * 4, 1, isLightMode ? 'rgba(224, 242, 254, 0.55)' : 'rgba(103, 232, 249, 0.24)');
        }

        const clamX = Math.floor(pw * 0.72);
        const clamY = getGroundY(clamX, 'reef') - 1;
        const openJaw = Math.round(2 + Math.sin(time * 0.0022) * 1.3);
        pRect(clamX - 8, clamY, 17, 4, '#1e1b4b');
        pRect(clamX - 7, clamY - 2, 15, 2, '#a21caf');
        pRect(clamX - 6, clamY - openJaw - 4, 13, 3, '#311042');
        pRect(clamX - 5, clamY - openJaw - 2, 11, 1, '#e879f9');
        pRect(clamX - 2, clamY - 4, 4, 4, '#fef9c3');
        pRect(clamX - 1, clamY - 3, 2, 2, '#ffffff');
        pRect(clamX - 4, clamY - 6, 8, 7, 'rgba(240, 171, 252, 0.28)');

        for (let i = 0; i < 14; i++) {
            const rise = (time * (0.0045 + (i % 3) * 0.0012) + i * 21) % Math.max(40, ph * 0.84);
            const bx = 24 + ((i * 43) % Math.max(24, pw - 48)) + Math.sin(time * 0.0015 + i) * 2;
            const by = ph - rise - 10;
            pRect(bx, by, 2, 2, 'rgba(103, 232, 249, 0.35)');
            pRect(bx, by, 1, 1, i % 3 === 0 ? '#f0abfc' : '#cffafe');
        }
    }

    // 6. KOI POND: Shimmering Water Caustics, Trickling Shishi-odoshi Bamboo Spout & Warm Yukimi Lantern Glow
    if (hab.sceneProfile === 'koi-pond') {
        // Subtle horizontal water surface glints & sky reflections across the pond
        for (let s = 0; s < 12; s++) {
            const wy = 34 + s * Math.floor((ph - 46) / 12);
            const sx = Math.round(((s * 73 + Math.sin(time * 0.001 + s) * 16) % (pw * 0.56)) + pw * 0.20);
            pRect(sx, wy, 9 + (s % 3) * 5, 1, isLightMode ? 'rgba(224, 242, 254, 0.32)' : 'rgba(125, 211, 252, 0.12)');
        }

        // Animated Shishi-odoshi Bamboo Water Stream, Splash & Concentric Ripples
        const bx = pw - 42;
        const by = ph - 18;
        const dropOffset = Math.floor((time * 0.022) % 6);
        pRect(bx - 23, by - 2 + dropOffset, 1, 3, '#bae6fd');
        pRect(bx - 23, by + 3, 1, 1, '#e0f2fe');
        const rippleR = (time * 0.014) % 9;
        pRect(bx - 23 - rippleR, by + 5, 2, 1, 'rgba(224, 242, 254, 0.45)');
        pRect(bx - 23 + rippleR, by + 5, 2, 1, 'rgba(224, 242, 254, 0.45)');

        // Pulsing Warm Candlelight inside the Yukimi-dōrō Stone Lantern + Water Reflections
        const glowAlpha = (0.78 + 0.2 * Math.sin(time * 0.004)).toFixed(2);
        pRect(bx - 3, by - 15, 7, 4, `rgba(253, 224, 71, ${glowAlpha})`);
        pRect(bx - 1, by - 14, 3, 2, '#ffffff');
        pRect(bx - 6, by - 17, 13, 8, 'rgba(251, 191, 36, 0.15)');
        for (let ry = 0; ry < 5; ry++) {
            const drift = Math.sin(time * 0.003 + ry * 1.4) * 2.5;
            pRect(bx - 3 + drift, by + 10 + ry * 2, 6 - ry, 1, `rgba(251, 191, 36, ${(0.32 - ry * 0.05).toFixed(2)})`);
        }
    }

    // 7. RAINFOREST: Soft Drifting Jungle Mist Wisps & Dappled Sunbeams
    if (hab.sceneProfile === 'rainforest') {
        for (let ray = 0; ray < 5; ray++) {
            const baseX = (ray * 112 + 34) % pw;
            for (let segment = 0; segment < 5; segment++) {
                const y = 26 + segment * 22 + (ray % 3) * 6;
                const x = baseX + Math.round(y * 0.14) + Math.sin(time * 0.0005 + ray + segment) * 2;
                pRect(x, y, 4, 8, isLightMode ? 'rgba(254, 240, 138, 0.065)' : 'rgba(167, 243, 208, 0.038)');
            }
        }
        for (let wisp = 0; wisp < 10; wisp++) {
            const drift = (time * (0.0018 + (wisp % 3) * 0.0005)) % (pw + 48);
            const x = (wisp * 79 + drift) % pw;
            const y = ph * (0.44 + (wisp % 4) * 0.07) + Math.sin(time * 0.0007 + wisp) * 2;
            ctx.fillStyle = isLightMode ? 'rgba(209, 250, 229, 0.045)' : 'rgba(45, 212, 191, 0.032)';
            ctx.fillRect(Math.round(x), Math.round(y), 14 + (wisp % 3) * 5, 2);
        }
    }

    // Render Diverse Habitat Botanicals & Flora
    flora.forEach(f => {
        const baseGroundY = f.baseY !== undefined ? f.baseY : getGroundY(f.x, hab.sceneProfile);

        if (f.type === 'pebble') {
            pRect(f.x, f.y, f.w, f.h, isLightMode ? 'rgba(15, 55, 65, 0.35)' : f.shade);

        } else if (f.type === 'maple_bough') {
            // Hanging Japanese Red Maple (Momiji) Leaf Clusters swaying in the breeze
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
            // Segmented Green Bamboo Culms with Nodes & Feathery Leaves on the Right Shore
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
                    pRect(px - 1, py, 4, 1, nodeCol); // Bamboo ring node
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
            const sway = Math.sin(time * 0.0012 + f.phase) * 1;
            const x = f.x + sway;
            const y = f.y;
            pRect(x - 4, y + 1, 9, 2, isLightMode ? '#166534' : '#0d5138');
            pRect(x - 2, y - 1, 5, 2, isLightMode ? '#22a65a' : '#14784e');
            pRect(x - 3, y - 3, 7, 2, f.hue);
            pRect(x - 1, y - 4, 3, 2, '#fef08a');

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

        } else if (f.type === 'sunflower') {
            const stemShade = isLightMode ? '#15803d' : '#14532d';
            let topX = f.x;
            const topY = baseGroundY - Math.floor(f.h);
            for (let y = 0; y < f.h; y++) {
                const sway = Math.sin(time * 0.0016 + f.phase + y * 0.05) * (y / f.h) * 3.0;
                const px = f.x + sway;
                const py = baseGroundY - y;
                if (y === Math.floor(f.h) - 1) topX = px;
                pRect(px, py, 2, 1, stemShade);
                if (y === Math.floor(f.h * 0.45) || y === Math.floor(f.h * 0.68)) {
                    const side = y % 2 === 0 ? 1 : -1;
                    pRect(px + side * 2, py, 3, 2, '#16a34a');
                }
            }
            const hr = f.headR || 4;
            for (let dy = -hr; dy <= hr; dy++) {
                for (let dx = -hr; dx <= hr; dx++) {
                    const d2 = dx * dx + dy * dy;
                    if (d2 <= 4) pRect(topX + dx, topY + dy, 1, 1, '#451a03');
                    else if (d2 <= hr * hr + 2) pRect(topX + dx, topY + dy, 1, 1, (dx + dy) % 2 === 0 ? '#facc15' : '#f59e0b');
                }
            }

        } else if (f.type === 'foxglove' || f.type === 'loosestrife') {
            const stemShade = isLightMode ? '#15803d' : '#115e59';
            for (let y = 0; y < f.h; y++) {
                const sway = Math.sin(time * 0.0017 + f.phase + y * 0.05) * (y / f.h) * 2.8;
                const px = f.x + sway;
                const py = baseGroundY - y;
                pRect(px, py, 1, 1, stemShade);
                if (y > f.h * 0.38 && y % 3 === 0) {
                    const side = (y % 6 === 0) ? -2 : 1;
                    pRect(px + side, py, 3, 2, f.hue);
                    if (y % 6 === 0) pRect(px, py - 1, 1, 1, '#fdf4ff');
                }
            }

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
            for (let y = 0; y < f.h; y++) {
                const sway = Math.sin(time * 0.0018 + f.phase + y * 0.07) * (y / f.h) * 2.8;
                const px = f.x + sway;
                const py = baseGroundY - y;
                pRect(px, py, 1, 1, stemShade);
                if (f.hasBloom && y > f.h - 8) {
                    if (f.kind === 'lavender' && y % 2 === 0) {
                        pRect(px - 1, py, 3, 1, '#a855f7');
                    } else if (f.kind === 'daisy' && y === Math.floor(f.h) - 1) {
                        pRect(px - 2, py - 1, 5, 3, '#f8fafc');
                        pRect(px, py, 1, 1, '#facc15');
                    } else if (f.kind === 'poppy' && y === Math.floor(f.h) - 1) {
                        pRect(px - 2, py - 1, 5, 3, '#fb7185');
                        pRect(px, py, 1, 1, '#1e1b4b');
                    } else if (f.kind === 'buttercup' && y === Math.floor(f.h) - 1) {
                        pRect(px - 1, py - 1, 3, 3, '#fde047');
                        pRect(px, py, 1, 1, '#f59e0b');
                    } else if (f.kind === 'nightbloom' && y === Math.floor(f.h) - 1) {
                        pRect(px - 2, py - 1, 5, 3, '#38bdf8');
                        pRect(px, py, 1, 1, '#e0f2fe');
                    }
                }
            }

        } else if (f.type === 'hornwort') {
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

        } else if (f.type === 'brain_coral') {
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
        }
    });

    // Ambient Floating Particles (Drifting Momiji Maple Leaves & Sakura Petals in Koi Pond)
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

    // Render Organic Species-Specific Stimuli
    for (let i = stimuli.length - 1; i >= 0; i--) {
        const s = stimuli[i];
        s.life -= frameScale;

        if (s.type === 'tropical_fruit') {
            s.phase += 0.09 * frameScale;
            s.y = s.baseY + Math.sin(s.phase) * 1.4;
            pRect(s.x - 2, s.y - 1, 5, 4, s.hue || '#f97316');
            pRect(s.x - 1, s.y - 2, 3, 1, '#facc15');
            pRect(s.x + 1, s.y - 3, 3, 1, '#16a34a');
            pRect(s.x + 1, s.y - 4, 1, 2, '#4ade80');
            pRect(s.x - 1, s.y, 2, 1, 'rgba(255,255,255,0.6)');

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
