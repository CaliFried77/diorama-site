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
        for (let x = 12; x < pw - 12; x += 9 + Math.floor(Math.random() * 6)) {
            const kindRoll = Math.random();
            if (kindRoll < 0.42) {
                flora.push({
                    type: 'hornwort',
                    x,
                    h: 42 + Math.random() * 64,
                    whorlSpan: 4 + Math.floor(Math.random() * 3),
                    glowCol: Math.random() < 0.5 ? '#34d399' : '#2dd4bf',
                    phase: Math.random() * Math.PI * 2
                });
            } else if (kindRoll < 0.72) {
                flora.push({
                    type: 'ludwigia',
                    x,
                    h: 32 + Math.random() * 52,
                    phase: Math.random() * Math.PI * 2
                });
            } else {
                flora.push({
                    type: 'val',
                    x,
                    h: 36 + Math.random() * 56,
                    phase: Math.random() * Math.PI * 2
                });
            }
        }
        for (let fx = 18; fx < pw - 18; fx += 22 + Math.floor(Math.random() * 18)) {
            flora.push({
                type: 'pistia',
                x: fx,
                rootLen: 10 + Math.random() * 16,
                phase: Math.random() * Math.PI * 2
            });
        }
        for (let i = 0; i < 42; i++) {
            flora.push({
                type: 'pebble',
                x: Math.random() * pw,
                y: ph - 4 - Math.random() * 7,
                w: 2 + Math.floor(Math.random() * 5),
                h: 1 + Math.floor(Math.random() * 3),
                shade: ['#102c3a', '#183c4b', '#24505a', '#0b2431'][i % 4]
            });
        }

    } else if (hab.sceneProfile === 'wetland') {
        for (let x = 8; x < pw - 8; x += 8 + Math.floor(Math.random() * 7)) {
            const inShore = (x < pw * 0.34 || x > pw * 0.66 || Math.random() < 0.22);
            if (!inShore) continue;
            const r = Math.random();
            if (r < 0.38) {
                flora.push({
                    type: 'reed',
                    x,
                    h: 38 + Math.random() * 58,
                    hasCat: Math.random() < 0.65,
                    tilt: (Math.random() - 0.5) * 0.14,
                    phase: Math.random() * Math.PI * 2
                });
            } else if (r < 0.68) {
                flora.push({
                    type: 'iris',
                    x,
                    h: 26 + Math.random() * 36,
                    col: Math.random() < 0.65 ? '#facc15' : '#a855f7',
                    phase: Math.random() * Math.PI * 2
                });
            } else {
                flora.push({
                    type: 'papyrus',
                    x,
                    h: 32 + Math.random() * 42,
                    phase: Math.random() * Math.PI * 2
                });
            }
        }
        for (let i = 0; i < 15; i++) {
            flora.push({
                type: 'lily',
                x: 32 + Math.random() * (pw - 64),
                y: ph - 12 - Math.random() * 40,
                r: 6 + Math.floor(Math.random() * 6),
                flower: i % 2 === 0,
                flowerCol: ['#fde047', '#f472b6', '#f8fafc'][i % 3]
            });
        }
        for (let i = 0; i < 18; i++) {
            const shoreX = i < 9 ? Math.random() * pw * 0.28 : pw * 0.72 + Math.random() * pw * 0.28;
            flora.push({
                type: 'pebble',
                x: shoreX,
                y: ph - 8 - Math.random() * 14,
                w: 3 + Math.floor(Math.random() * 5),
                h: 2 + Math.floor(Math.random() * 3),
                shade: ['#18383a', '#23474a', '#31575a'][i % 3]
            });
        }

    } else if (hab.sceneProfile === 'botanical') {
        const boughZones = [
            { startX: 0, endX: pw * 0.38, baseArch: 26 },
            { startX: pw * 0.62, endX: pw, baseArch: 24 }
        ];
        boughZones.forEach((zone, zIdx) => {
            for (let x = zone.startX + 4; x < zone.endX - 4; x += 6 + Math.floor(Math.random() * 5)) {
                const norm = zIdx === 0 ? (1 - x / zone.endX) : ((x - zone.startX) / (zone.endX - zone.startX));
                const branchY = Math.round(4 + norm * zone.baseArch + Math.sin(x * 0.12) * 3);
                flora.push({
                    type: 'wisteria_cluster',
                    x,
                    branchY,
                    len: 10 + Math.pow(norm, 0.8) * (14 + Math.random() * 22),
                    hue: ['#c084fc', '#e879f9', '#f472b6', '#818cf8'][Math.floor(Math.random() * 4)],
                    phase: Math.random() * Math.PI * 2
                });
            }
        });
        for (let x = 10; x < pw - 10; x += 7 + Math.floor(Math.random() * 6)) {
            const r = Math.random();
            if (r < 0.25) {
                flora.push({
                    type: 'fern',
                    x,
                    h: 16 + Math.random() * 20,
                    dir: Math.random() < 0.5 ? 1 : -1,
                    phase: Math.random() * Math.PI * 2
                });
            } else if (r < 0.45) {
                flora.push({
                    type: 'glow_mushroom',
                    x,
                    h: 8 + Math.random() * 12,
                    capR: 3 + Math.floor(Math.random() * 3),
                    col: Math.random() < 0.5 ? '#38bdf8' : '#a855f7',
                    phase: Math.random() * Math.PI * 2
                });
            } else if (r < 0.68) {
                flora.push({
                    type: 'foxglove',
                    x,
                    h: 24 + Math.random() * 26,
                    hue: Math.random() < 0.5 ? '#e879f9' : '#60a5fa',
                    phase: Math.random() * Math.PI * 2
                });
            } else {
                flora.push({
                    type: 'meadow',
                    x,
                    h: 16 + Math.random() * 26,
                    hasBloom: true,
                    kind: 'nightbloom',
                    phase: Math.random() * Math.PI * 2
                });
            }
        }

    } else if (hab.sceneProfile === 'reef') {
        for (let x = 12; x < pw - 12; x += 11 + Math.floor(Math.random() * 8)) {
            const r = Math.random();
            const hue = [285, 325, 190, 165, 45][Math.floor(Math.random() * 5)];
            if (r < 0.22) {
                flora.push({ type: 'brain_coral', x, r: 6 + Math.floor(Math.random() * 5), hue, phase: Math.random() * Math.PI * 2 });
            } else if (r < 0.44) {
                flora.push({ type: 'tube_sponge', x, h: 16 + Math.random() * 22, hue, phase: Math.random() * Math.PI * 2 });
            } else if (r < 0.66) {
                flora.push({ type: 'anemone', x, h: 16 + Math.random() * 14, hue, phase: Math.random() * Math.PI * 2 });
            } else if (r < 0.85) {
                flora.push({ type: 'sea_fan', x, h: 24 + Math.random() * 32, hue, phase: Math.random() * Math.PI * 2 });
            } else {
                flora.push({ type: 'kelp', x, h: 45 + Math.random() * 55, phase: Math.random() * Math.PI * 2 });
            }
        }

    } else if (hab.sceneProfile === 'koi-pond') {
        for (let i = 0; i < 28; i++) {
            flora.push({
                type: 'pebble',
                x: Math.random() * pw,
                y: 45 + Math.random() * (ph - 55),
                w: 3 + Math.floor(Math.random() * 5),
                h: 2 + Math.floor(Math.random() * 3),
                shade: ['#0f2938', '#16384a', '#1e4659'][i % 3]
            });
        }
        for (let i = 0; i < 11; i++) {
            flora.push({
                type: 'lily',
                x: 22 + Math.random() * (pw - 70),
                y: 38 + Math.random() * (ph - 62),
                r: 8 + Math.floor(Math.random() * 5),
                flower: i % 2 === 0,
                flowerCol: i % 4 === 0 ? '#f8fafc' : '#f472b6'
            });
        }

    } else if (hab.sceneProfile === 'rainforest') {
        // Focus lush tropical flora stronger along the left/right wings so the center valley stays airy
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

        // Epiphytes anchored directly on the actual tree trunks & main branches (never floating in mid-air)
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

        // Graceful lianas hanging mostly on the left and right canopy sides
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

    // Soft atmospheric mist band separating distant silhouettes from the midground
    const mistCol = isLightMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(148, 163, 184, 0.035)';
    sRect(0, ph - 28, pw, 10, mistCol);

    // 2. MEADOW STATIC SCENERY (Grounded Oak, Orchard Tree, Rolling Meadow Hills & Wild Rose Cairn)
    if (hab.sceneProfile === 'meadow') {
        const trunkCol = isLightMode ? '#451a03' : '#1c1217';
        const barkHi = isLightMode ? '#78350f' : '#2e1d24';
        const leafDark = isLightMode ? '#14532d' : '#0b221e';
        const leafMid = isLightMode ? '#15803d' : '#11332b';
        const leafHi = isLightMode ? '#22c55e' : '#1b4d3e';

        // Secondary orchard tree on left-midground (grounded all the way to ph)
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

        // Grand Left Meadow Oak with wide root flare anchored into the hillside
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

        // Rolling Velvet Meadow Ground Contour (anchors all wildflowers & trees seamlessly)
        const turfTop = isLightMode ? '#16a34a' : '#0f392b';
        const turfDeep = isLightMode ? '#14532d' : '#071f18';
        for (let x = 0; x < pw; x++) {
            const gy = getGroundY(x, 'meadow');
            sRect(x, gy, 1, ph - gy, turfDeep);
            sRect(x, gy, 1, 2, turfTop);
        }

        // Subtle Right-Corner Wild Rose Bush & Mossy Garden Stone (replaces the ugly fence)
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

    // 3. BETTA AQUARIUM STATIC SCENERY
    if (hab.sceneProfile === 'betta-aquarium') {
        const rx = pw - 62;
        for (let y = 0; y < 56; y++) {
            const w = 12 + Math.floor(y * 0.52);
            sRect(rx - Math.floor(w * 0.45), ph - 56 + y, w, 1, isLightMode ? '#334155' : '#111c2d');
            if (y % 5 === 0) sRect(rx - 3, ph - 56 + y, 5, 2, '#090f1a');
            if (!isLightMode && y % 9 === 0) sRect(rx + 2, ph - 56 + y, 2, 1, 'rgba(45, 212, 191, 0.45)');
        }

        const woodDark = isLightMode ? '#3f1d0b' : '#1b1115';
        const woodMid = isLightMode ? '#5c2d16' : '#2b1920';
        const woodHi = isLightMode ? '#854d0e' : '#472932';
        const maxTrunkX = Math.min(185, Math.floor(pw * 0.48));

        for (let x = 0; x < maxTrunkX; x++) {
            const t = x / maxTrunkX;
            const archY = Math.round(ph - 14 - Math.sin(t * Math.PI * 0.88) * 54 + Math.cos(t * 4) * 3);
            const thick = Math.max(3, Math.floor(15 * (1 - t * 0.72)));
            sRect(x, archY, 2, thick, woodDark);
            sRect(x, archY + 1, 2, Math.max(1, thick - 3), woodMid);
            sRect(x, archY, 2, 2, woodHi);

            if (t > 0.22 && t < 0.82) {
                const subT = (t - 0.22) / 0.60;
                const upperY = Math.round(archY - 12 - Math.sin(subT * Math.PI) * 22);
                const uThick = Math.max(2, Math.floor(6 * (1 - subT * 0.65)));
                sRect(x, upperY, 2, uThick, woodDark);
                sRect(x, upperY, 2, 1, woodHi);
                if (x % 3 === 0) {
                    sRect(x, upperY - 2, 2, 2, isLightMode ? '#16a34a' : '#0d9488');
                }
            }
        }
    }

    // 4. BOTANICAL BUTTERFLY GARDEN STATIC SCENERY
    if (hab.sceneProfile === 'botanical') {
        const branchDark = isLightMode ? '#3f1d0b' : '#15111e';
        const branchHi = isLightMode ? '#78350f' : '#2a223a';
        for (let x = 0; x < pw * 0.40; x++) {
            const norm = 1 - x / (pw * 0.40);
            const by = Math.round(3 + norm * 24 + Math.sin(x * 0.12) * 2.5);
            const thick = Math.max(2, Math.floor(norm * 8));
            sRect(x, 0, 1, by + thick, branchDark);
            sRect(x, by + thick - 1, 1, 1, branchHi);
        }
        for (let x = Math.floor(pw * 0.60); x < pw; x++) {
            const norm = (x - pw * 0.60) / (pw * 0.40);
            const by = Math.round(3 + norm * 22 + Math.sin(x * 0.12) * 2.5);
            const thick = Math.max(2, Math.floor(norm * 8));
            sRect(x, 0, 1, by + thick, branchDark);
            sRect(x, by + thick - 1, 1, 1, branchHi);
        }

        const gx = pw - 48;
        const stoneCol = isLightMode ? '#64748b' : '#1e2436';
        const stoneHi = isLightMode ? '#94a3b8' : '#2e364f';
        sRect(gx, ph - 58, 6, 58, stoneCol);
        sRect(gx, ph - 58, 2, 58, stoneHi);
        sRect(gx + 26, ph - 58, 6, 58, stoneCol);
        sRect(gx - 3, ph - 62, 38, 4, stoneHi);
        for (let vy = ph - 56; vy < ph - 8; vy += 5) {
            const vx = gx + 1 + Math.round(Math.sin(vy * 0.25) * 2);
            sRect(vx, vy, 3, 2, '#15803d');
            if (vy % 10 === 0) sRect(vx + 1, vy - 1, 2, 2, '#e879f9');
        }

        for (let i = 0; i < 18; i++) {
            const progress = i / 17;
            const pathX = Math.round(pw * 0.5 + Math.sin(i * 0.42) * (16 + progress * 8));
            const pathY = ph - 4 - Math.round((i % 3) * 1.2);
            const stoneW = 3 + (i % 3) * 2;
            sRect(pathX - stoneW, pathY, stoneW * 2, 2, isLightMode ? '#64748b' : '#25263d');
        }
    }

    // 5. REEF STATIC SCENERY (Smooth Coral Sand Bed & Sunken Columns — No Fence Blocks!)
    if (hab.sceneProfile === 'reef') {
        const colShade = isLightMode ? 'rgba(15, 38, 62, 0.45)' : 'rgba(18, 14, 46, 0.72)';
        const colHi = isLightMode ? 'rgba(56, 189, 248, 0.25)' : 'rgba(139, 92, 246, 0.22)';
        [38, pw - 54].forEach((cx, idx) => {
            const ch = idx === 0 ? 68 : 48;
            sRect(cx, ph - ch, 9, ch, colShade);
            sRect(cx + 1, ph - ch, 2, ch, colHi);
            sRect(cx - 2, ph - ch, 13, 3, colShade);
            sRect(cx - 2, ph - 4, 13, 4, colShade);
        });

        for (let x = 0; x < pw; x++) {
            const reefFloor = ph - 4 - Math.round(Math.sin(x * 0.03) * 2.5 + Math.cos(x * 0.08) * 1.5);
            sRect(x, reefFloor, 1, ph - reefFloor, isLightMode ? '#164e63' : '#0f172a');
            sRect(x, reefFloor, 1, 1, isLightMode ? '#0ea5e9' : '#312e81');
        }
    }

    // 6. RAINFOREST STATIC SCENERY (100% Grounded Trees, Layered Canopy & Forest Floor)
    if (hab.sceneProfile === 'rainforest') {
        const canopyShades = isLightMode
            ? ['#0b3d2e', '#115e40', '#16784d', '#22995e']
            : ['#041f1a', '#073026', '#0c4432', '#135e42'];

        // Distant misty jungle ridge
        for (let x = 0; x < pw; x += 2) {
            const nx = x / Math.max(1, pw);
            const valleyDip = 0.45 + Math.pow(Math.abs(nx - 0.5) * 1.9, 1.4) * 0.85;
            const h = Math.round((34 + Math.sin(x * 0.025) * 10 + Math.cos(x * 0.07) * 6) * valleyDip);
            sRect(x, ph - h, 2, h, isLightMode ? 'rgba(13, 74, 56, 0.32)' : 'rgba(4, 28, 24, 0.55)');
        }

        // Helper for cohesive, solid pixel-art foliage domes with scalloped rims
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

        // Midground Tropical Trees (Every trunk reaches all the way to the ground!)
        const midgroundTrees = [
            { x: Math.floor(pw * 0.14), top: Math.floor(ph * 0.24), rx: 32, ry: 18 },
            { x: Math.floor(pw * 0.27), top: Math.floor(ph * 0.36), rx: 26, ry: 15 },
            { x: Math.floor(pw * 0.75), top: Math.floor(ph * 0.34), rx: 28, ry: 16 },
            { x: Math.floor(pw * 0.86), top: Math.floor(ph * 0.22), rx: 34, ry: 19 },
        ];
        midgroundTrees.forEach((tree, idx) => {
            const trunkCol = isLightMode ? '#2c221e' : '#101c1a';
            const barkCol = isLightMode ? '#4a372d' : '#1c302b';
            const groundBase = ph; // Always touches bottom of canvas!

            for (let y = tree.top; y < groundBase; y++) {
                const prog = (y - tree.top) / Math.max(1, groundBase - tree.top);
                const curve = Math.sin(prog * Math.PI * 1.2 + idx) * 2.5;
                const rootFlare = prog > 0.78 ? Math.pow((prog - 0.78) / 0.22, 2) * 14 : 0;
                const w = Math.round(5 + prog * 6 + rootFlare);
                const tx = Math.round(tree.x + curve - w * 0.5);
                sRect(tx, y, w, 1, trunkCol);
                sRect(tx + 1, y, Math.max(1, Math.floor(w * 0.35)), 1, barkCol);
            }

            // Reaching lateral boughs
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

        // Foreground Emergent Buttress-Root Giants framing Left & Right edges
        const edgeGiants = [
            { x: 0, width: 20, side: 1 },
            { x: pw - 22, width: 22, side: -1 }
        ];
        edgeGiants.forEach((giant, idx) => {
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

        // Upper Overhanging Emerald Canopy Arch (dense at corners, open in center sky)
        const canopyDomes = [
            { cx: pw * 0.05, cy: 10, rx: 46, ry: 22, s: 1 },
            { cx: pw * 0.16, cy: 6,  rx: 40, ry: 18, s: 2 },
            { cx: pw * 0.28, cy: 2,  rx: 30, ry: 12, s: 3 },
            { cx: pw * 0.72, cy: 2,  rx: 30, ry: 12, s: 3 },
            { cx: pw * 0.84, cy: 6,  rx: 40, ry: 18, s: 2 },
            { cx: pw * 0.95, cy: 10, rx: 46, ry: 22, s: 1 }
        ];
        canopyDomes.forEach(d => drawFoliageDome(Math.round(d.cx), d.cy, d.rx, d.ry, d.s));

        // Continuous Mossy Rainforest Floor & Root Mound Contour at the bottom
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
        const mx = Math.round(pw * 0.82);
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

    // Blit Cached Static Scenery Layer (Zero per-frame CPU overhead for trees/rocks/canopy)
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
        ctx.fillStyle = isLightMode ? 'rgba(255, 255, 255, 0.045)' : 'rgba(125, 211, 252, 0.022)';
        for (let r = 0; r < 5; r++) {
            const rx = ((r * 85 + Math.sin(time * 0.0005 + r) * 16) % pw);
            for (let y = 0; y < ph * 0.76; y += 3) {
                ctx.fillRect(Math.round(rx + y * 0.22), y, 11, 3);
            }
        }
    }

    /* =========================================================================
       DYNAMIC / ANIMATED HABITAT DETAILS (Properly Scoped Per Biome!)
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

    // 2. BETTA AQUARIUM: Swaying Anubias Rosettes on Driftwood & Rising Oxygen Bubbles
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

    // 3. WETLAND: Drifting Mist, Frog on Mossy Boulder & Pier Lantern Reflection
    if (hab.sceneProfile === 'wetland') {
        ctx.fillStyle = isLightMode ? 'rgba(255, 255, 255, 0.14)' : 'rgba(167, 243, 208, 0.045)';
        for (let m = 0; m < 4; m++) {
            const mx = Math.round(((m * 95 + time * 0.006 * (m + 1)) % (pw + 80)) - 40);
            const my = ph - 32 + m * 6;
            ctx.fillRect(mx, my, 56, 2);
        }

        const stoneX = pw - 68;
        const stoneY = ph - 16;
        pRect(stoneX - 10, stoneY, 22, 10, isLightMode ? '#475569' : '#1e293b');
        pRect(stoneX - 8, stoneY - 3, 16, 4, isLightMode ? '#64748b' : '#334155');
        pRect(stoneX - 6, stoneY - 4, 12, 2, isLightMode ? '#16a34a' : '#15803d');
        pRect(stoneX - 1, stoneY - 7, 4, 3, '#22c55e');
        pRect(stoneX + 2, stoneY - 8, 1, 1, '#fef08a');
        if (Math.sin(time * 0.006) > 0.6) {
            pRect(stoneX + 3, stoneY - 6, 2, 2, '#bbf7d0');
        }

        const pierCol = isLightMode ? '#5c3a21' : '#1c1917';
        const pierHi = isLightMode ? '#854d0e' : '#332924';
        const py = ph - 38;
        pRect(0, py, 58, 3, pierCol);
        pRect(0, py, 58, 1, pierHi);
        [12, 32, 52].forEach(px => {
            pRect(px, py - 8, 3, 22, pierCol);
            pRect(px, py - 8, 1, 22, pierHi);
            if (px === 52) {
                pRect(px + 2, py - 8, 4, 1, pierCol);
                pRect(px + 4, py - 6, 3, 4, '#fef08a');
                pRect(px + 3, py + 14 + Math.sin(time * 0.004) * 1.5, 4, 1, 'rgba(253, 224, 71, 0.35)');
            }
        });
    }

    // 4. BOTANICAL: Soft Fireflies
    if (hab.sceneProfile === 'botanical') {
        for (let i = 0; i < 6; i++) {
            const fx = (i * 83 + Math.sin(time * 0.001 + i) * 9) % pw;
            const fy = ph * 0.42 + Math.sin(time * 0.0014 + i * 1.7) * 18;
            const glow = 0.28 + 0.34 * (0.5 + 0.5 * Math.sin(time * 0.004 + i));
            pRect(fx, fy, 2, 2, `rgba(253, 224, 71, ${glow.toFixed(2)})`);
        }
    }

    // 5. REEF: Pulsing Giant Clam & Reef Bubbles
    if (hab.sceneProfile === 'reef') {
        const clamX = Math.floor(pw * 0.24);
        const clamY = ph - 8;
        const openJaw = Math.round(2 + Math.sin(time * 0.002) * 1.2);
        pRect(clamX - 7, clamY, 15, 4, '#311042');
        pRect(clamX - 6, clamY - 1, 13, 2, '#a21caf');
        pRect(clamX - 6, clamY - openJaw - 3, 13, 3, '#4c1d95');
        pRect(clamX - 1, clamY - 3, 3, 3, '#fef9c3');
        pRect(clamX - 2, clamY - 4, 5, 5, 'rgba(240, 171, 252, 0.35)');

        for (let i = 0; i < 10; i++) {
            const rise = (time * (0.004 + (i % 3) * 0.001) + i * 19) % Math.max(40, ph * 0.8);
            const bx = 20 + ((i * 47) % Math.max(24, pw - 40));
            const by = ph - rise - 8;
            pRect(bx, by, 1, 2, 'rgba(165, 243, 252, 0.42)');
        }
    }

    // 6. KOI POND: Kyoto Zen Courtyard Details
    if (hab.sceneProfile === 'koi-pond') {
        for (let x = 8; x <= 68; x++) {
            const arch = Math.round(Math.sin(((x - 8) / 60) * Math.PI) * 10);
            const by = 26 - arch;
            pRect(x, by, 1, 2, isLightMode ? '#dc2626' : '#991b1b');
            if (x % 6 === 0) pRect(x, by - 4, 1, 4, isLightMode ? '#ef4444' : '#b91c1c');
            pRect(x, by - 4, 1, 1, isLightMode ? '#fca5a5' : '#dc2626');
        }

        const bx = pw - 42;
        const by = ph - 18;
        pRect(bx - 18, by + 6, 52, 12, isLightMode ? '#1e3a3a' : '#0c1922');
        pRect(bx - 14, by + 4, 42, 4, isLightMode ? '#115e59' : '#132a34');
        pRect(bx - 10, by + 3, 32, 2, isLightMode ? '#10b981' : '#154236');

        pRect(bx - 22, by - 4, 12, 2, '#65a30d');
        pRect(bx - 14, by - 8, 2, 12, '#4d7c0f');
        const dropOffset = Math.floor((time * 0.02) % 6);
        pRect(bx - 23, by - 2 + dropOffset, 1, 3, '#bae6fd');
        const rippleR = ((time * 0.015) % 8);
        pRect(bx - 23 - rippleR, by + 5, 1, 1, 'rgba(224, 242, 254, 0.45)');
        pRect(bx - 23 + rippleR, by + 5, 1, 1, 'rgba(224, 242, 254, 0.45)');

        pRect(bx - 5, by, 11, 4, '#334155');
        pRect(bx - 3, by - 10, 7, 10, '#475569');
        pRect(bx - 2, by - 10, 2, 10, '#64748b');
        pRect(bx - 5, by - 17, 11, 7, '#334155');
        const glowAlpha = (0.75 + 0.2 * Math.sin(time * 0.004)).toFixed(2);
        pRect(bx - 3, by - 15, 7, 4, `rgba(253, 224, 71, ${glowAlpha})`);
        pRect(bx - 1, by - 14, 3, 2, '#ffffff');
        pRect(bx - 9, by - 19, 19, 2, '#1e293b');
        pRect(bx - 7, by - 21, 15, 2, '#334155');
        pRect(bx - 4, by - 23, 9, 2, '#475569');
        pRect(bx - 1, by - 25, 3, 2, '#64748b');
        for (let ry = 0; ry < 5; ry++) {
            const drift = Math.sin(time * 0.003 + ry * 1.4) * 2.5;
            pRect(bx - 3 + drift, by + 10 + ry * 2, 6 - ry, 1, `rgba(251, 191, 36, ${0.28 - ry * 0.05})`);
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
        const baseGroundY = getGroundY(f.x, hab.sceneProfile);

        if (f.type === 'pebble') {
            pRect(f.x, f.y, f.w, f.h, isLightMode ? 'rgba(15, 55, 65, 0.35)' : f.shade);

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

        } else if (f.type === 'foxglove') {
            const stemShade = isLightMode ? '#15803d' : '#14532d';
            for (let y = 0; y < f.h; y++) {
                const sway = Math.sin(time * 0.0017 + f.phase + y * 0.06) * (y / f.h) * 2.8;
                const px = f.x + sway;
                const py = baseGroundY - y;
                pRect(px, py, 1, 1, stemShade);
                if (y > f.h * 0.42 && y % 3 === 0) {
                    const side = (y % 6 === 0) ? -2 : 1;
                    pRect(px + side, py, 2, 2, f.hue);
                    pRect(px + side, py + 1, 1, 1, '#fef9c3');
                }
            }

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
                    const py = ph - y;
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
                pRect(f.x + sway * (y / f.h), ph - y, 1, 1, '#cbd5e1');
            }
            const cx = f.x + sway;
            const cy = ph - f.h;
            pRect(cx - f.capR, cy, f.capR * 2 + 1, 2, f.col);
            pRect(cx - f.capR + 1, cy - 1, (f.capR - 1) * 2 + 1, 1, '#e0f2fe');
            if (!isLightMode) {
                pRect(cx - f.capR - 1, cy - 2, f.capR * 2 + 3, 4, 'rgba(56, 189, 248, 0.22)');
            }

        } else if (f.type === 'iris') {
            for (let blade = -1; blade <= 1; blade++) {
                const bh = f.h * (blade === 0 ? 1 : 0.78);
                for (let y = 0; y < bh; y++) {
                    const sway = Math.sin(time * 0.0015 + f.phase + y * 0.05) * 2 + blade * (y * 0.14);
                    pRect(f.x + sway, ph - y, 1, 1, isLightMode ? '#15803d' : '#115e59');
                }
            }
            const topX = f.x + Math.sin(time * 0.0015 + f.phase + f.h * 0.05) * 2;
            const topY = ph - f.h;
            pRect(topX - 2, topY - 1, 5, 2, f.col);
            pRect(topX, topY - 3, 1, 3, '#fef9c3');

        } else if (f.type === 'papyrus') {
            let topX = f.x;
            const topY = ph - Math.floor(f.h);
            for (let y = 0; y < f.h; y++) {
                const sway = Math.sin(time * 0.0014 + f.phase + y * 0.05) * (y / f.h) * 3;
                topX = f.x + sway;
                pRect(topX, ph - y, 1, 1, isLightMode ? '#166534' : '#0f3d2e');
            }
            for (let r = -4; r <= 4; r++) {
                pRect(topX + r, topY - 2, 1, 2, isLightMode ? '#22c55e' : '#10b981');
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
            for (let y = 0; y < f.h; y++) {
                const sway = Math.sin(time * 0.0014 + f.phase + y * 0.05) * (y / f.h) * 2.8 + (f.tilt || 0) * y;
                const px = f.x + sway;
                const py = ph - y;
                pRect(px, py, 1, 1, isLightMode ? '#166534' : '#113e32');
                if (f.hasCat && y > f.h - 14 && y < f.h - 5) {
                    pRect(px - 1, py, 3, 1, '#5c3a21');
                }
            }

        } else if (f.type === 'lily') {
            const padCol1 = isLightMode ? '#15803d' : '#0f3d2e';
            const padCol2 = isLightMode ? '#16a34a' : '#15523e';
            for (let dy = -f.r; dy <= f.r; dy++) {
                for (let dx = -f.r; dx <= f.r; dx++) {
                    if (dx * dx + dy * dy <= f.r * f.r) {
                        if (dx > 0 && Math.abs(dy) <= 1) continue;
                        pRect(f.x + dx, f.y + dy, 1, 1, (dx + dy) % 2 === 0 ? padCol1 : padCol2);
                    }
                }
            }
            if (f.flower) {
                pRect(f.x - 2, f.y - 1, 5, 3, f.flowerCol || '#f472b6');
                pRect(f.x - 1, f.y - 2, 3, 5, f.flowerCol || '#f472b6');
                pRect(f.x, f.y, 1, 1, '#fef08a');
            }

        } else if (f.type === 'brain_coral') {
            for (let dy = -f.r; dy <= 0; dy++) {
                for (let dx = -f.r; dx <= f.r; dx++) {
                    if (dx * dx + dy * dy <= f.r * f.r) {
                        const groove = Math.sin(dx * 1.4 + dy * 1.2) > 0.2;
                        const col = groove ? `hsla(${f.hue}, 95%, 68%, 0.85)` : `hsla(${f.hue}, 75%, 28%, 0.85)`;
                        pRect(f.x + dx, ph - 4 + dy, 1, 1, col);
                    }
                }
            }

        } else if (f.type === 'tube_sponge') {
            [-3, 0, 3].forEach((ox, idx) => {
                const th = Math.round(f.h * (idx === 1 ? 1 : 0.72));
                for (let y = 0; y < th; y++) {
                    const col = y >= th - 2 ? '#fef08a' : `hsla(${f.hue}, 85%, ${35 + (y / th) * 25}%, 0.82)`;
                    pRect(f.x + ox, ph - 4 - y, 2, 1, col);
                }
            });

        } else if (f.type === 'sea_fan') {
            for (let y = 0; y < f.h; y++) {
                const sway = Math.sin(time * 0.0014 + f.phase + y * 0.08) * (y / f.h) * 2.5;
                const spread = Math.round(Math.sin((y / f.h) * Math.PI) * 6);
                const px = f.x + sway;
                const py = ph - 4 - y;
                for (let dx = -spread; dx <= spread; dx += 2) {
                    if ((dx + y) % 2 === 0) {
                        pRect(px + dx, py, 1, 1, `hsla(${f.hue}, 90%, 62%, 0.68)`);
                    }
                }
            }

        } else if (f.type === 'kelp') {
            for (let y = 0; y < f.h; y++) {
                const sway = Math.sin(time * 0.0015 + f.phase + y * 0.07) * (y / f.h) * 5;
                const px = f.x + sway;
                const py = ph - 4 - y;
                pRect(px, py, 1, 1, '#0d9488');
                if (y % 5 === 0 && y > 6) {
                    const side = (y % 10 === 0) ? -3 : 1;
                    pRect(px + side, py, 3, 2, '#2dd4bf');
                }
            }

        } else if (f.type === 'anemone') {
            pRect(f.x - 3, ph - 8, 7, 5, '#3b0764');
            for (let t = -3; t <= 3; t++) {
                const sway = Math.sin(time * 0.003 + f.phase + t) * 1.8;
                for (let y = 8; y <= 17; y++) {
                    pRect(f.x + t * 1.4 + sway * (y / 17), ph - y, 1, 1, y === 17 ? '#fef08a' : `hsla(${f.hue}, 90%, 65%, 0.78)`);
                }
            }
        }
    });

    // Ambient Floating Particles
    ambientParticles.forEach(pt => {
        if (hab.sceneProfile === 'koi-pond') {
            pt.y += pt.speed * 0.7 * frameScale;
            pt.x += Math.sin(time * 0.0015 + pt.phase) * 0.22 * frameScale;
            if (pt.y > ph) { pt.y = 0; pt.x = Math.random() * pw; }
            pRect(pt.x, pt.y, 2, 1, 'rgba(251, 207, 232, 0.65)');
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
            pRect(s.x, s.y, 1, 1, '#e2e8f0');
            pRect(s.x - 1, s.y - 1, 3, 1, 'rgba(255,255,255,0.45)');

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
