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

/* SCENERY — Living Pixel Diorama
   Native ES module. Cross-file dependencies are declared with imports and exports. */
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

            for (let x = 0; x < pw; x += 4) {
                const h1 = 22 + Math.sin(x * 0.018) * 12 + Math.cos(x * 0.045) * 6;
                bgSilhouettes.push({ x, h: h1 });
            }

            for (let i = 0; i < 45; i++) {
                ambientParticles.push({
                    x: Math.random() * pw,
                    y: Math.random() * ph,
                    speed: 0.06 + Math.random() * 0.14,
                    phase: Math.random() * Math.PI * 2,
                    size: Math.random() < 0.8 ? 1 : 2
                });
            }

            if (hab.sceneProfile === 'meadow') {
                // Rich Non-Repetitive Wildflower Orchard Meadow: Sunflowers, Foxgloves, Lavender, Daisies, Poppies & Clover
                for (let x = 14; x < pw - 10; x += 6 + Math.floor(Math.random() * 5)) {
                    const r = Math.random();
                    if (r < 0.16 && x > 76 && x < pw * 0.56) {
                        flora.push({
                            type: 'sunflower',
                            x,
                            h: 34 + Math.random() * 26,
                            headR: 4 + Math.floor(Math.random() * 2),
                            phase: Math.random() * Math.PI * 2
                        });
                    } else if (r < 0.34) {
                        flora.push({
                            type: 'foxglove',
                            x,
                            h: 26 + Math.random() * 22,
                            hue: Math.random() < 0.5 ? '#c084fc' : '#f472b6',
                            phase: Math.random() * Math.PI * 2
                        });
                    } else {
                        flora.push({
                            type: 'meadow',
                            x,
                            h: 14 + Math.random() * 28,
                            hasBloom: Math.random() < 0.68,
                            kind: ['lavender', 'daisy', 'poppy', 'buttercup'][Math.floor(Math.random() * 4)],
                            phase: Math.random() * Math.PI * 2
                        });
                    }
                }

            } else if (hab.sceneProfile === 'betta-aquarium') {
                // Authentic Betta Biotope: Hornwort (Tilkikuyruğu), Anubias on Driftwood, Red Ludwigia, Lace Plant & Floating Pistia
                for (let x = 12; x < pw - 12; x += 9 + Math.floor(Math.random() * 6)) {
                    const kindRoll = Math.random();
                    if (kindRoll < 0.42) {
                        // Tilkikuyruğu (Ceratophyllum demersum / Hornwort) - feathery pine-like whorls with glowing tips!
                        flora.push({
                            type: 'hornwort',
                            x,
                            h: 42 + Math.random() * 68,
                            whorlSpan: 4 + Math.floor(Math.random() * 3),
                            glowCol: Math.random() < 0.5 ? '#34d399' : '#2dd4bf',
                            phase: Math.random() * Math.PI * 2
                        });
                    } else if (kindRoll < 0.72) {
                        // Red Alternanthera / Ludwigia
                        flora.push({
                            type: 'ludwigia',
                            x,
                            h: 32 + Math.random() * 54,
                            phase: Math.random() * Math.PI * 2
                        });
                    } else {
                        // Broad-leaf Amazon Sword / Vallisneria spiralis
                        flora.push({
                            type: 'val',
                            x,
                            h: 36 + Math.random() * 58,
                            phase: Math.random() * Math.PI * 2
                        });
                    }
                }
                // Floating Water Lettuce (Pistia) with hanging feathery roots at the top surface
                for (let fx = 18; fx < pw - 18; fx += 22 + Math.floor(Math.random() * 18)) {
                    flora.push({
                        type: 'pistia',
                        x: fx,
                        rootLen: 10 + Math.random() * 16,
                        phase: Math.random() * Math.PI * 2
                    });
                }
                // A natural dark gravel bed anchors the aquascape and softens the glass-bottom edge.
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
                // Organic Wetland Shoreline: Cattails, Yellow Water Iris, Umbrella Papyrus, Arrowhead & Mossy Rocks
                for (let x = 8; x < pw - 8; x += 8 + Math.floor(Math.random() * 7)) {
                    // Keep center pond open while framing left/right and scattered islands
                    const inShore = (x < pw * 0.34 || x > pw * 0.66 || Math.random() < 0.25);
                    if (!inShore) continue;
                    const r = Math.random();
                    if (r < 0.38) {
                        flora.push({
                            type: 'reed',
                            x,
                            h: 38 + Math.random() * 62,
                            hasCat: Math.random() < 0.65,
                            tilt: (Math.random() - 0.5) * 0.14,
                            phase: Math.random() * Math.PI * 2
                        });
                    } else if (r < 0.68) {
                        // Su Süseni (Yellow/Violet Water Iris)
                        flora.push({
                            type: 'iris',
                            x,
                            h: 28 + Math.random() * 38,
                            col: Math.random() < 0.65 ? '#facc15' : '#a855f7',
                            phase: Math.random() * Math.PI * 2
                        });
                    } else {
                        // Şemsiye Papirüs (Umbrella Sedge)
                        flora.push({
                            type: 'papyrus',
                            x,
                            h: 34 + Math.random() * 44,
                            phase: Math.random() * Math.PI * 2
                        });
                    }
                }
                for (let i = 0; i < 16; i++) {
                    flora.push({
                        type: 'lily',
                        x: 32 + Math.random() * (pw - 64),
                        y: ph - 12 - Math.random() * 42,
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
                        y: ph - 8 - Math.random() * 16,
                        w: 3 + Math.floor(Math.random() * 5),
                        h: 2 + Math.floor(Math.random() * 3),
                        shade: ['#18383a', '#23474a', '#31575a'][i % 3]
                    });
                }

            } else if (hab.sceneProfile === 'botanical') {
                // Organic Corner Boughs with Varied Wisteria Racemes (Not uniform across the ceiling!)
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
                // Diverse Forest Floor: Unfurling Ferns, Bioluminescent Mycena Mushrooms, Foxgloves & Moonflowers
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
                // Rich Coral Reef Biodiversity: Brain Corals, Table Acropora, Tube Sponges, Sea Fans, Kelp & Anemones
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
                // Kyoto Zen Courtyard Pond: Submerged river pebbles, blooming lotus pads & stepping stones
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
                // A dense tropical understory with several silhouettes, not a line of identical sprouts.
                for (let x = 5; x < pw - 5; x += 7 + Math.floor(Math.random() * 7)) {
                    const roll = Math.random();
                    if (roll < 0.32) {
                        flora.push({
                            type: 'tropical_leaf',
                            x,
                            h: 42 + Math.random() * 58,
                            dir: Math.random() < 0.5 ? -1 : 1,
                            hue: Math.random() < 0.5 ? '#0f766e' : '#15803d',
                            phase: Math.random() * Math.PI * 2
                        });
                    } else if (roll < 0.49) {
                        flora.push({
                            type: 'jungle_fern',
                            x,
                            h: 24 + Math.random() * 25,
                            dir: Math.random() < 0.5 ? -1 : 1,
                            phase: Math.random() * Math.PI * 2
                        });
                    } else if (roll < 0.68) {
                        flora.push({
                            type: 'bromeliad',
                            x,
                            h: 22 + Math.random() * 19,
                            hue: Math.random() < 0.5 ? '#e11d48' : '#f97316',
                            phase: Math.random() * Math.PI * 2
                        });
                    } else if (roll < 0.84) {
                        flora.push({
                            type: 'heliconia',
                            x,
                            h: 36 + Math.random() * 34,
                            hue: ['#e11d48', '#f97316', '#facc15'][Math.floor(Math.random() * 3)],
                            phase: Math.random() * Math.PI * 2
                        });
                    } else {
                        flora.push({
                            type: 'orchid',
                            x,
                            h: 28 + Math.random() * 30,
                            hue: Math.random() < 0.5 ? '#e879f9' : '#f9a8d4',
                            phase: Math.random() * Math.PI * 2
                        });
                    }
                }

                // Epiphytes attach flowers and broad leaves to mid-level branches, adding depth.
                for (let i = 0; i < 11; i++) {
                    flora.push({
                        type: 'epiphyte',
                        x: 18 + Math.random() * (pw - 36),
                        y: ph * (0.24 + Math.random() * 0.38),
                        hue: ['#f9a8d4', '#e879f9', '#facc15'][i % 3],
                        phase: Math.random() * Math.PI * 2
                    });
                }

                // Lianas hang in uneven, overlapping arcs from the high canopy.
                for (let i = 0; i < 7; i++) {
                    flora.push({
                        type: 'canopy_vine',
                        x: 12 + Math.random() * (pw - 24),
                        startY: 2 + Math.random() * 38,
                        len: 42 + Math.random() * Math.min(118, ph * 0.46),
                        phase: Math.random() * Math.PI * 2,
                        hue: i % 2 === 0 ? '#16a34a' : '#0f766e'
                    });
                }

                // Fallen leaves and damp forest-floor fragments anchor the understory.
                for (let i = 0; i < 52; i++) {
                    flora.push({
                        type: 'pebble',
                        x: Math.random() * pw,
                        y: ph - 3 - Math.random() * 12,
                        w: 2 + Math.floor(Math.random() * 6),
                        h: 1 + Math.floor(Math.random() * 3),
                        shade: ['#123a32', '#1a4a3b', '#245847', '#315d46'][i % 4]
                    });
                }
                // Low, overlapping leaf mounds make the forest floor read as a continuous understory.
                for (let i = 0; i < 22; i++) {
                    flora.push({
                        type: 'understory_bush',
                        x: Math.random() * pw,
                        y: ph - 5 - Math.random() * 31,
                        w: 9 + Math.random() * 17,
                        h: 5 + Math.random() * 10,
                        phase: Math.random() * Math.PI * 2,
                        tone: i % 3
                    });
                }
            }

            const creatureProfile = CREATURE_PROFILES[hab.creatureProfile];
            if (creatureProfile) {
                for (let i = 0; i < creatureProfile.count; i++) creatures.push(creatureProfile.create());
            }
        }

        /* ============================================================================
           CONTINUOUS SEAMLESS DIORAMA RENDERER (DAY & NIGHT ADAPTIVE)
           ============================================================================ */
        // Background cache is shared with the theme and weather modules.
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
            }
            ctx.drawImage(sceneCache.bgCache.img, 0, 0);

            // Sky Celestial Bodies: Golden Sun & Drifting Pixel Clouds in Light Mode, Crescent Moon & Shooting Stars in Dark Mode
            if (!wxFxOn() && (hab.sceneProfile === 'botanical' || hab.sceneProfile === 'meadow' || hab.sceneProfile === 'wetland')) {
                const mx = Math.round(pw * 0.82);
                const my = 32;
                if (isLightMode) {
                    // Radiant Pixel Sun + Soft Drifting Pixel Clouds
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

            // Distant Mountain / Reef Horizon Silhouette
            const silCol = isLightMode ? 'rgba(15, 42, 62, 0.22)' : 'rgba(3, 7, 16, 0.42)';
            bgSilhouettes.forEach(sil => {
                pRect(sil.x, ph - sil.h, 4, sil.h, silCol);
            });

            // Diagonal Sunbeam / Moonlight Caustic Shafts in Aquatic & Daytime Worlds
            if (hab.sceneProfile === 'betta-aquarium' || hab.sceneProfile === 'reef' || isLightMode) {
                ctx.fillStyle = isLightMode ? 'rgba(255, 255, 255, 0.055)' : 'rgba(125, 211, 252, 0.024)';
                for (let r = 0; r < 6; r++) {
                    const rx = ((r * 75 + Math.sin(time * 0.0005 + r) * 16) % pw);
                    for (let y = 0; y < ph * 0.78; y += 2) {
                        ctx.fillRect(Math.round(rx + y * 0.22), y, 12, 2);
                    }
                }
            }

            /* =========================================================================
               BESPOKE ARTISTIC SCENERY FOR EACH HABITAT
               ========================================================================= */

            // 1. BEES HABITAT: Ancient Meadow Oak Tree, Golden Beehive & Artisanal Rose-Covered Cobblestone Wall + Split-Rail Gate
            if (hab.sceneProfile === 'meadow') {
                // A short, raised orchard fence sits in the middle distance instead of spanning the meadow.
                const startX = Math.floor(pw * 0.73);
                const endX = Math.min(pw - 8, startX + Math.max(42, Math.floor(pw * 0.22)));
                const fenceLine = ph - 31;
                const stoneDark = isLightMode ? '#475569' : '#1e293b';
                const stoneMid = isLightMode ? '#64748b' : '#334155';
                const stoneHi = isLightMode ? '#94a3b8' : '#475569';
                const woodDark = isLightMode ? '#5c3a21' : '#291811';
                const woodHi = isLightMode ? '#854d0e' : '#452719';

                // Uneven stones form a low, broken retaining edge below the fence.
                for (let sx = startX; sx < endX; sx += 5) {
                    const undulate = Math.round(Math.sin(sx * 0.08) * 1.2);
                    const sy = fenceLine + undulate;
                    pRect(sx, sy, 4, 6, stoneDark);
                    pRect(sx, sy, 2, 2, stoneHi);
                    pRect(sx + 2, sy + 3, 2, 2, stoneMid);
                    if (sx % 15 < 5) pRect(sx + 1, sy - 1, 3, 1, isLightMode ? '#16a34a' : '#14532d');
                }

                // Two short rail sections leave a natural gate opening in the middle.
                const railSections = [
                    [startX + 3, startX + Math.floor((endX - startX) * 0.34)],
                    [startX + Math.floor((endX - startX) * 0.62), endX - 3],
                ];
                railSections.forEach(([from, to]) => {
                    for (let sx = from; sx < to; sx++) {
                        const sag = Math.round(Math.sin(((sx - from) / Math.max(1, to - from)) * Math.PI) * 1.2);
                        pRect(sx, fenceLine - 13 + sag, 1, 2, woodDark);
                        pRect(sx, fenceLine - 13 + sag, 1, 1, woodHi);
                        pRect(sx, fenceLine - 7 + sag, 1, 2, woodDark);
                    }
                });

                // Four weathered posts, rose hips and a single warm lantern mark the gate.
                [startX, startX + Math.floor((endX - startX) * 0.34), startX + Math.floor((endX - startX) * 0.62), endX - 3].forEach((px, index) => {
                    const postH = index === 0 || index === 3 ? 19 : 16;
                    const py = fenceLine - postH;
                    pRect(px - 1, py, 4, postH + 2, woodDark);
                    pRect(px - 1, py, 1, postH + 2, woodHi);
                    pRect(px - 2, py - 1, 6, 2, stoneHi);
                    for (let ry = 3; ry < postH - 2; ry += 4) {
                        const vx = px + Math.round(Math.sin(ry * 0.58 + px) * 2);
                        pRect(vx - 1, py + ry, 3, 2, isLightMode ? '#15803d' : '#14532d');
                        if (ry % 8 === 3) {
                            pRect(vx, py + ry - 1, 2, 2, '#fb7185');
                            pRect(vx, py + ry, 1, 1, '#fef08a');
                        }
                    }
                    if (index === 0) {
                        pRect(px - 6, py + 4, 4, 1, '#1e293b');
                        pRect(px - 6, py + 5, 3, 4, '#fef08a');
                        pRect(px - 7, py + 4, 5, 6, 'rgba(253, 224, 71, 0.2)');
                    }
                });

                // Grand old oak: a taller, wider trunk with a broad canopy that frames the meadow.
                const trunkCol = isLightMode ? '#451a03' : '#1c1217';
                const barkHi = isLightMode ? '#78350f' : '#2e1d24';
                for (let y = ph - 132; y < ph; y++) {
                    const depth = y - (ph - 132);
                    const w = 17 + Math.floor(depth * 0.19);
                    pRect(0, y, w, 1, trunkCol);
                    pRect(w - 5, y, 3, 1, barkHi);
                    if (y % 17 === 0) pRect(4, y, 4, 1, isLightMode ? '#92400e' : '#3f2830');
                }
                const branchY = ph - 119;
                for (let bx = 12; bx <= 112; bx++) {
                    const by = branchY + Math.floor(Math.sin(bx * 0.055) * 3);
                    const bw = Math.max(2, Math.floor(10 - (bx - 12) * 0.065));
                    pRect(bx, by, 1, bw, trunkCol);
                    pRect(bx, by, 1, 1, barkHi);
                }

                // Layered oak canopy, with warm blossom/fruit pixels and scalloped edges.
                const leafDark = isLightMode ? '#14532d' : '#0b221e';
                const leafMid = isLightMode ? '#15803d' : '#11332b';
                const leafHi = isLightMode ? '#22c55e' : '#1b4d3e';
                const canopyBlobs = [
                    { cx: 25, cy: ph - 145, rx: 40, ry: 28 },
                    { cx: 70, cy: ph - 137, rx: 38, ry: 26 },
                    { cx: 111, cy: ph - 127, rx: 25, ry: 20 }
                ];
                canopyBlobs.forEach((b, bIdx) => {
                    for (let dy = -b.ry; dy <= b.ry; dy++) {
                        for (let dx = -b.rx; dx <= b.rx; dx++) {
                            if ((dx * dx) / (b.rx * b.rx) + (dy * dy) / (b.ry * b.ry) <= 1.0) {
                                let col = leafMid;
                                if (dy < -b.ry * 0.3) col = leafHi;
                                else if (dy > b.ry * 0.35) col = leafDark;
                                pRect(b.cx + dx, b.cy + dy, 1, 1, col);
                                if ((dx + dy + bIdx) % 19 === 0 && dy < 2) {
                                    pRect(b.cx + dx, b.cy + dy, 2, 2, '#fb7185');
                                }
                            }
                        }
                    }
                });

                // Hanging Golden Skep Beehive swaying gently from the oak branch (at x = 48)
                // A smaller orchard tree in the middle distance makes the meadow feel wooded.
                const groveX = Math.round(pw * 0.33);
                for (let y = ph - 88; y < ph; y++) {
                    const width = 7 + Math.floor((y - (ph - 88)) * 0.09);
                    pRect(groveX, y, width, 1, isLightMode ? '#5c2d16' : '#24161a');
                    if (y % 11 === 0) pRect(groveX + width - 2, y, 2, 1, barkHi);
                }
                [[groveX + 6, ph - 105, 25, 19], [groveX + 29, ph - 98, 22, 16]].forEach(([cx, cy, rx, ry], idx) => {
                    for (let dy = -ry; dy <= ry; dy++) {
                        for (let dx = -rx; dx <= rx; dx++) {
                            if (dx * dx / (rx * rx) + dy * dy / (ry * ry) <= 1) {
                                pRect(cx + dx, cy + dy, 1, 1, dy < -ry * 0.25 ? leafHi : (dy > ry * 0.4 ? leafDark : leafMid));
                                if ((dx + dy + idx) % 31 === 0) pRect(cx + dx, cy + dy, 2, 2, '#fbbf24');
                            }
                        }
                    }
                });

                // Hanging Golden Skep Beehive swaying beneath the broad oak bough.
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

            // 2. BETTA HABITAT: Grand Multi-Branched Spiderwood/Mangrove Centerpiece with Glowing Epiphytes, Anubias & Dragon Stone
            if (hab.sceneProfile === 'betta-aquarium') {
                // Right-side Layered Dragon Stone (Ohko Rock Formation) with glowing mineral veins
                const rx = pw - 62;
                for (let y = 0; y < 56; y++) {
                    const w = 12 + Math.floor(y * 0.52);
                    pRect(rx - Math.floor(w * 0.45), ph - 56 + y, w, 1, isLightMode ? '#334155' : '#111c2d');
                    if (y % 5 === 0) pRect(rx - 3, ph - 56 + y, 5, 2, '#090f1a');
                    if (!isLightMode && y % 9 === 0) pRect(rx + 2, ph - 56 + y, 2, 1, 'rgba(45, 212, 191, 0.45)');
                }

                // Grand Multi-Limb Sunken Mangrove Root (Spiderwood) spanning 45% of the aquarium with bark grain & knot hollows
                const woodDark = isLightMode ? '#3f1d0b' : '#1b1115';
                const woodMid = isLightMode ? '#5c2d16' : '#2b1920';
                const woodHi = isLightMode ? '#854d0e' : '#472932';
                const maxTrunkX = Math.min(185, Math.floor(pw * 0.48));

                // Primary sweeping arch branch
                for (let x = 0; x < maxTrunkX; x++) {
                    const t = x / maxTrunkX;
                    const archY = Math.round(ph - 14 - Math.sin(t * Math.PI * 0.88) * 54 + Math.cos(t * 4) * 3);
                    const thick = Math.max(3, Math.floor(15 * (1 - t * 0.72)));
                    pRect(x, archY, 2, thick, woodDark);
                    pRect(x, archY + 1, 2, Math.max(1, thick - 3), woodMid);
                    pRect(x, archY, 2, 2, woodHi);

                    // Upper secondary reaching bough splitting off at t = 0.25..0.82
                    if (t > 0.22 && t < 0.82) {
                        const subT = (t - 0.22) / 0.60;
                        const upperY = Math.round(archY - 12 - Math.sin(subT * Math.PI) * 22);
                        const uThick = Math.max(2, Math.floor(6 * (1 - subT * 0.65)));
                        pRect(x, upperY, 2, uThick, woodDark);
                        pRect(x, upperY, 2, 1, woodHi);

                        // Bioluminescent Java Moss & Glowing Blue-Green Epiphyte Spores on the upper branch!
                        if (x % 3 === 0) {
                            pRect(x, upperY - 2, 2, 2, isLightMode ? '#16a34a' : '#0d9488');
                            if (!isLightMode && x % 6 === 0) {
                                const pulse = (0.55 + 0.4 * Math.sin(time * 0.004 + x)).toFixed(2);
                                pRect(x, upperY - 3, 2, 2, `rgba(94, 234, 212, ${pulse})`);
                            }
                        }
                    }

                    // Broad-Leaf Anubias barteri Rosettes & Glowing Bucephalandra attached directly to the driftwood!
                    if (x > 18 && x < maxTrunkX - 18 && x % 24 === 0) {
                        const rhizomeY = archY - 2;
                        pRect(x - 3, rhizomeY, 7, 2, '#064e3b');
                        // 5 broad oval Anubias leaves fanning out from the wood
                        [-6, -3, 0, 3, 6].forEach((lx, lIdx) => {
                            const sway = Math.sin(time * 0.002 + x + lIdx) * 1.2;
                            const leafX = Math.round(x + lx + sway);
                            const leafY = rhizomeY - 5 - (lIdx % 2) * 3;
                            pRect(x + lx * 0.4, rhizomeY - 2, 1, 2, '#14532d'); // Petiole stem
                            pRect(leafX - 2, leafY - 2, 5, 4, isLightMode ? '#15803d' : '#065f46');
                            pRect(leafX - 1, leafY - 3, 3, 5, isLightMode ? '#22c55e' : '#10b981');
                            // Bioluminescent pearl dewdrop / glowing leaf tip at night so driftwood is clearly visible!
                            if (!isLightMode) {
                                pRect(leafX, leafY - 3, 1, 1, '#6ee7b7');
                                if (lIdx === 2) pRect(leafX - 1, leafY - 4, 3, 1, 'rgba(52, 211, 153, 0.75)');
                            }
                        });
                    }
                }
            }

                // Suspended oxygen bubbles rise in staggered columns behind the driftwood.
                for (let i = 0; i < 13; i++) {
                    const cycle = (time * (0.006 + (i % 3) * 0.001) + i * 23) % Math.max(36, ph * 0.72);
                    const bx = 18 + ((i * 41) % Math.max(24, pw - 36)) + Math.sin(time * 0.0008 + i) * 2;
                    const by = ph - 18 - cycle;
                    pRect(bx, by, 2, 2, 'rgba(186, 230, 253, 0.28)');
                    pRect(bx, by, 1, 1, 'rgba(224, 242, 254, 0.58)');
                }

            // 3. DRAGONFLY HABITAT: Rustic Wooden Pond Pier, Mossy Frog Boulders & Drifting Morning Mist
            if (hab.sceneProfile === 'wetland') {
                ctx.fillStyle = isLightMode ? 'rgba(255, 255, 255, 0.14)' : 'rgba(167, 243, 208, 0.045)';
                for (let m = 0; m < 4; m++) {
                    const mx = Math.round(((m * 95 + time * 0.006 * (m + 1)) % (pw + 80)) - 40);
                    const my = ph - 32 + m * 6;
                    ctx.fillRect(mx, my, 56, 2);
                }

                // Emerging Mossy River Boulders on Right with a Tiny Perching Pond Frog
                const stoneX = pw - 68;
                const stoneY = ph - 16;
                pRect(stoneX - 10, stoneY, 22, 10, isLightMode ? '#475569' : '#1e293b');
                pRect(stoneX - 8, stoneY - 3, 16, 4, isLightMode ? '#64748b' : '#334155');
                pRect(stoneX - 6, stoneY - 4, 12, 2, isLightMode ? '#16a34a' : '#15803d');
                // Little emerald tree frog sitting on the boulder with throat pulse
                pRect(stoneX - 1, stoneY - 7, 4, 3, '#22c55e');
                pRect(stoneX + 2, stoneY - 8, 1, 1, '#fef08a'); // Frog eye
                if (Math.sin(time * 0.006) > 0.6) {
                    pRect(stoneX + 3, stoneY - 6, 2, 2, '#bbf7d0'); // Vocal sac pulse
                }

                // Wooden Fisherman's Pier on Left Shoreline with Water Reflection
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

                // A worn stepping-stone path disappears into the fern garden.
                for (let i = 0; i < 24; i++) {
                    const progress = i / 23;
                    const pathX = Math.round(pw * 0.5 + Math.sin(i * 0.42) * (18 + progress * 10));
                    const pathY = ph - 5 - Math.round((i % 4) * 1.4);
                    const stoneW = 4 + (i % 3) * 2;
                    pRect(pathX - stoneW, pathY, stoneW * 2, 2, isLightMode ? '#64748b' : '#25263d');
                    pRect(pathX - stoneW + 1, pathY, Math.max(2, stoneW - 1), 1, isLightMode ? '#94a3b8' : '#3c3b5c');
                }
                // A few drifting fireflies add depth without crowding the butterflies.
                for (let i = 0; i < 6; i++) {
                    const fx = (i * 83 + Math.sin(time * 0.001 + i) * 9) % pw;
                    const fy = ph * 0.42 + Math.sin(time * 0.0014 + i * 1.7) * 18;
                    const glow = 0.28 + 0.34 * (0.5 + 0.5 * Math.sin(time * 0.004 + i));
                    pRect(fx, fy, 2, 2, `rgba(253, 224, 71, ${glow.toFixed(2)})`);
                }

            // 4. BUTTERFLY HABITAT: Gnarled Overhanging Corner Tree Boughs + Ivy-Clad Stone Garden Archway
            if (hab.sceneProfile === 'botanical') {
                const branchDark = isLightMode ? '#3f1d0b' : '#15111e';
                const branchHi = isLightMode ? '#78350f' : '#2a223a';
                // Left & Right overhanging gnarled tree limbs (replaces the flat ceiling fringe!)
                for (let x = 0; x < pw * 0.40; x++) {
                    const norm = 1 - x / (pw * 0.40);
                    const by = Math.round(3 + norm * 24 + Math.sin(x * 0.12) * 2.5);
                    const thick = Math.max(2, Math.floor(norm * 8));
                    pRect(x, 0, 1, by + thick, branchDark);
                    pRect(x, by + thick - 1, 1, 1, branchHi);
                }
                for (let x = Math.floor(pw * 0.60); x < pw; x++) {
                    const norm = (x - pw * 0.60) / (pw * 0.40);
                    const by = Math.round(3 + norm * 22 + Math.sin(x * 0.12) * 2.5);
                    const thick = Math.max(2, Math.floor(norm * 8));
                    pRect(x, 0, 1, by + thick, branchDark);
                    pRect(x, by + thick - 1, 1, 1, branchHi);
                }

                // Ivy-Clad Stone Garden Archway on Right
                const gx = pw - 48;
                const stoneCol = isLightMode ? '#64748b' : '#1e2436';
                const stoneHi = isLightMode ? '#94a3b8' : '#2e364f';
                pRect(gx, ph - 58, 6, 58, stoneCol);
                pRect(gx, ph - 58, 2, 58, stoneHi);
                pRect(gx + 26, ph - 58, 6, 58, stoneCol);
                pRect(gx - 3, ph - 62, 38, 4, stoneHi);
                for (let vy = ph - 56; vy < ph - 8; vy += 5) {
                    const vx = gx + 1 + Math.round(Math.sin(vy * 0.25) * 2);
                    pRect(vx, vy, 3, 2, '#15803d');
                    if (vy % 10 === 0) pRect(vx + 1, vy - 1, 2, 2, '#e879f9');
                }
            }

                // Broken limestone shelves create a foreground reef terrace beneath the corals.
                for (let x = 0; x < pw; x += 3) {
                    const ridge = ph - 5 - Math.round(6 + Math.sin(x * 0.045) * 3 + Math.sin(x * 0.13) * 2);
                    if ((x % 17) < 13) {
                        pRect(x, ridge, 3, ph - ridge, isLightMode ? '#1e4b59' : '#101b38');
                        if (x % 9 === 0) pRect(x, ridge, 2, 1, isLightMode ? '#38bdf8' : 'rgba(103, 232, 249, 0.58)');
                    }
                }
                // Fine bubble trails drift up from the deeper ledges.
                for (let i = 0; i < 11; i++) {
                    const rise = (time * (0.004 + (i % 3) * 0.001) + i * 19) % Math.max(40, ph * 0.8);
                    const bx = 20 + ((i * 47) % Math.max(24, pw - 40));
                    const by = ph - rise - 8;
                    pRect(bx, by, 1, 2, 'rgba(165, 243, 252, 0.42)');
                    if (i % 3 === 0) pRect(bx + 2, by - 2, 1, 1, 'rgba(240, 171, 252, 0.55)');
                }

            // 5. JELLYFISH HABITAT: Sunken Atlantean Columns, Luminous Pearl Giant Clam & Hydrothermal Reef Ledges
            if (hab.sceneProfile === 'reef') {
                const colShade = isLightMode ? 'rgba(15, 38, 62, 0.45)' : 'rgba(18, 14, 46, 0.72)';
                const colHi = isLightMode ? 'rgba(56, 189, 248, 0.25)' : 'rgba(139, 92, 246, 0.22)';
                [38, pw - 54].forEach((cx, idx) => {
                    const ch = idx === 0 ? 68 : 48;
                    pRect(cx, ph - ch, 9, ch, colShade);
                    pRect(cx + 1, ph - ch, 2, ch, colHi);
                    pRect(cx - 2, ph - ch, 13, 3, colShade);
                    pRect(cx - 2, ph - 4, 13, 4, colShade);
                });

                // Glowing Giant Clam (Tridacna) with a pulsing Bioluminescent Pearl on the Reef Ledge
                const clamX = Math.floor(pw * 0.24);
                const clamY = ph - 8;
                const openJaw = Math.round(2 + Math.sin(time * 0.002) * 1.2);
                pRect(clamX - 7, clamY, 15, 4, '#311042');
                pRect(clamX - 6, clamY - 1, 13, 2, '#a21caf'); // Fluted mantle lip
                pRect(clamX - 6, clamY - openJaw - 3, 13, 3, '#4c1d95');
                pRect(clamX - 1, clamY - 3, 3, 3, '#fef9c3'); // Radiant pearl core
                pRect(clamX - 2, clamY - 4, 5, 5, 'rgba(240, 171, 252, 0.35)');
            }

            // 6. KOI HABITAT: Kyoto Zen Courtyard Environment
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

            if (hab.sceneProfile === 'rainforest') {
                // A layered emerald ceiling: overlapping crowns leave only small windows to the sky.
                const canopyShades = isLightMode
                    ? ['#0d513b', '#146b48', '#1b8050', '#27945a']
                    : ['#062b25', '#0a3b2e', '#0e4b35', '#15583b'];
                for (let tier = 0; tier < 3; tier++) {
                    const step = tier === 0 ? 39 : 47;
                    const count = Math.ceil(pw / step) + 2;
                    for (let index = -1; index < count; index++) {
                        const cx = index * step + (tier === 1 ? 13 : 0) + Math.sin(index * 1.9 + tier) * 5;
                        const cy = tier === 0
                            ? 5 + ((index * 7 + 30) % 17)
                            : tier === 1 ? 28 + ((index * 11 + 60) % 23) : 53 + ((index * 5 + 20) % 17);
                        const rx = (tier === 2 ? 25 : 31) + ((index * 7 + tier * 9 + 80) % 18);
                        const ry = (tier === 2 ? 19 : 23) + ((index * 5 + tier * 7 + 70) % 12);
                        for (let dy = -ry; dy <= ry; dy += 2) {
                            const ellipse = Math.max(0, 1 - (dy * dy) / (ry * ry));
                            const irregular = Math.sin(index * 1.73 + dy * 0.31 + tier) * 2.2;
                            const halfWidth = Math.max(1, Math.floor(rx * Math.sqrt(ellipse) + irregular));
                            const shade = dy < -ry * 0.22 ? canopyShades[2]
                                : dy > ry * 0.42 ? canopyShades[0] : canopyShades[1];
                            pRect(cx - halfWidth, cy + dy, halfWidth * 2, 2, shade);

                            // Pixel-sized leaf clusters break the smooth ellipse into organic foliage.
                            if ((dy + index * 3 + tier * 5) % 8 === 0) {
                                const leafX = cx - halfWidth + ((index * 17 + dy * 3 + 600) % Math.max(2, halfWidth * 2));
                                pRect(leafX, cy + dy - 1, 3 + (index % 2), 2, canopyShades[3]);
                                pRect(leafX + 1, cy + dy - 2, 1, 1, isLightMode ? '#86efac' : '#2dd4a0');
                            }
                        }
                    }
                }

                // Distant broadleaf crowns fill the middle distance without obscuring the flight space.
                for (let cluster = 0; cluster < 9; cluster++) {
                    const cx = cluster * (pw / 8) + Math.sin(cluster * 2.1) * 7;
                    const cy = ph * (0.39 + (cluster % 3) * 0.055);
                    const rx = 25 + (cluster % 4) * 7;
                    const ry = 14 + (cluster % 3) * 5;
                    for (let dy = -ry; dy <= ry; dy += 2) {
                        const width = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry))));
                        const shade = dy < -3 ? canopyShades[1] : canopyShades[0];
                        pRect(cx - width, cy + dy, width * 2, 2, shade);
                    }
                }

                // Three buttress-root trees have irregular bark and different depths; none is a flat wall.
                const forestTrees = [
                    { x: 5, top: 0, width: 18, end: ph, depth: 1 },
                    { x: Math.floor(pw * 0.27), top: 44, width: 11, end: Math.floor(ph * 0.82), depth: 0 },
                    { x: pw - 36, top: 0, width: 22, end: ph, depth: 1 },
                ];
                forestTrees.forEach((tree, index) => {
                    const trunkDark = isLightMode ? '#40271e' : '#1b1a1c';
                    const trunkMid = isLightMode ? '#68402b' : '#302126';
                    const trunkLight = isLightMode ? '#8a5a37' : '#49302a';
                    const startY = Math.max(0, tree.top);
                    for (let y = startY; y < tree.end; y++) {
                        const progress = (y - startY) / Math.max(1, tree.end - startY);
                        const sway = Math.round(Math.sin(y * 0.035 + index * 2.2) * 1.5);
                        const left = tree.x + sway;
                        const width = tree.width + Math.floor(progress * (tree.depth ? 12 : 6)) + Math.round(Math.sin(y * 0.09 + index) * 1.2);
                        pRect(left, y, width, 1, trunkDark);
                        pRect(left + 3, y, Math.max(2, Math.floor(width * 0.28)), 1, trunkMid);
                        pRect(left + width - 5, y, 2, 1, trunkLight);
                        if ((y + index * 13) % 31 === 0) {
                            pRect(left + 5, y - 1, 2, 3, '#17191a');
                            pRect(left + 7, y, 2, 1, trunkLight);
                        }
                        if ((y + index * 7) % 47 === 0) pRect(left + width - 8, y, 4, 1, isLightMode ? '#a1623b' : '#654237');
                    }

                    if (tree.depth) {
                        // Wide buttress roots flare into the damp ground.
                        for (let side = -1; side <= 1; side += 2) {
                            for (let step = 0; step < 31; step++) {
                                const rootX = tree.x + tree.width * 0.52 + side * step * 1.18;
                                const rootY = ph - 2 - step * 0.74;
                                const rootW = Math.max(1, 4 - Math.floor(step / 9));
                                pRect(rootX, rootY, rootW, 2, trunkDark);
                                if (step % 7 === 0) pRect(rootX + side, rootY - 1, rootW + 2, 1, trunkMid);
                            }
                        }
                    }

                    // Moss pillows and tiny epiphytes cling to the shaded trunk.
                    for (let moss = 0; moss < 7; moss++) {
                        const my = startY + 28 + moss * Math.max(8, Math.floor((tree.end - startY - 36) / 7));
                        const mx = tree.x + tree.width - 2 + Math.sin(moss * 1.8 + index) * 2;
                        pRect(mx, my, 4, 2, isLightMode ? '#16834c' : '#116044');
                        if (moss % 2 === 0) pRect(mx + 2, my - 1, 2, 1, '#2ca66b');
                    }
                });

                // A few diagonal lianas bridge crowns and trunks rather than hanging as a row of strings.
                for (let vine = 0; vine < 5; vine++) {
                    const anchorX = (vine * 137 + 33) % pw;
                    const length = 36 + (vine % 3) * 17;
                    for (let step = 0; step < length; step++) {
                        const t = step / length;
                        const x = anchorX + Math.sin(t * 2.8 + vine) * (4 + t * 9);
                        const y = 18 + step;
                        pRect(x, y, 2, 1, isLightMode ? '#166534' : '#0b593d');
                        if (step > 5 && step % 11 === 0) {
                            const side = step % 2 === 0 ? -1 : 1;
                            pRect(x + side * 2, y - 1, side * 3, 2, '#1fa45d');
                            pRect(x + side * 4, y - 2, 2, 1, '#58c878');
                        }
                    }
                }

                // Sunbeams arrive in broken, soft shafts; humid mist floats as separate wisps, never screen-wide stripes.
                for (let ray = 0; ray < 7; ray++) {
                    const baseX = (ray * 97 + 21) % pw;
                    for (let segment = 0; segment < 7; segment++) {
                        const y = 28 + segment * 18 + (ray % 3) * 5;
                        const x = baseX + Math.round(y * 0.12) + Math.sin(time * 0.0005 + ray + segment) * 2;
                        pRect(x, y, 2 + (ray % 3), 5 + (segment % 3) * 2,
                            isLightMode ? 'rgba(254, 240, 138, 0.075)' : 'rgba(167, 243, 208, 0.045)');
                    }
                }
                for (let wisp = 0; wisp < 18; wisp++) {
                    const drift = (time * (0.002 + (wisp % 3) * 0.0006)) % (pw + 38);
                    const x = (wisp * 67 + drift) % pw;
                    const y = ph * (0.43 + (wisp % 5) * 0.055) + Math.sin(time * 0.0007 + wisp) * 2;
                    const alpha = 0.025 + (wisp % 3) * 0.009;
                    ctx.fillStyle = isLightMode
                        ? `rgba(167, 243, 208, ${alpha.toFixed(3)})`
                        : `rgba(45, 212, 191, ${alpha.toFixed(3)})`;
                    ctx.fillRect(x, y, 8 + (wisp % 4) * 3, 1 + (wisp % 2));
                }
            }

            // Render Diverse Habitat Botanicals & Flora (Zero Monotonous Cloning!)
            flora.forEach(f => {
                if (f.type === 'pebble') {
                    pRect(f.x, f.y, f.w, f.h, isLightMode ? 'rgba(15, 55, 65, 0.35)' : f.shade);

                } else if (f.type === 'understory_bush') {
                    // Uneven low foliage mounds overlap at the base of trunks and larger plants.
                    const sway = Math.sin(time * 0.001 + f.phase) * 1.2;
                    const palette = f.tone === 0
                        ? (isLightMode ? ['#166534', '#15803d', '#22a65a'] : ['#073b2e', '#0b563d', '#14734b'])
                        : f.tone === 1
                            ? (isLightMode ? ['#1d5b36', '#25834b', '#43a65b'] : ['#0a332d', '#104b38', '#1b6845'])
                            : (isLightMode ? ['#155e4b', '#0f766e', '#2ca58a'] : ['#073b38', '#0b574d', '#167568']);
                    for (let lobe = 0; lobe < 4; lobe++) {
                        const cx = f.x + (lobe - 1.5) * f.w * 0.22 + sway;
                        const cy = f.y - Math.abs(lobe - 1.5) * 1.2;
                        const rx = f.w * (0.22 + (lobe % 2) * 0.04);
                        const ry = f.h * (0.72 + (lobe % 3) * 0.08);
                        for (let dy = -ry; dy <= ry; dy += 2) {
                            const span = Math.max(1, Math.floor(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry)))));
                            for (let dx = -span; dx <= span; dx += 3) {
                                const color = dy < -ry * 0.18 ? palette[2] : dy > ry * 0.42 ? palette[0] : palette[1];
                                pRect(cx + dx, cy + dy, 2 + ((Math.floor(dx + 50) + lobe) % 2), 2, color);
                                if ((dx + dy + lobe) % 9 === 0) pRect(cx + dx, cy + dy - 1, 1, 1, '#65c77b');
                            }
                        }
                    }
                    pRect(f.x - 1, f.y + f.h * 0.65, 2, 4, isLightMode ? '#14532d' : '#0b3a2d');

                } else if (f.type === 'canopy_vine') {
                    // Thick, winding lianas with paired leaves and occasional side tendrils.
                    for (let y = 0; y < f.len; y++) {
                        const progress = y / f.len;
                        const sway = Math.sin(time * 0.0011 + f.phase + y * 0.035) * (2 + progress * 5);
                        const px = f.x + sway + Math.sin(progress * 3.2 + f.phase) * 2;
                        const py = f.startY + y;
                        pRect(px, py, 2, 1, f.hue);
                        if (y > 6 && y % 8 === 0) {
                            const side = Math.sin(y * 0.19 + f.phase) >= 0 ? 1 : -1;
                            const leaf = y % 16 === 0 ? '#4ade80' : '#22a65c';
                            pRect(px + side * 2, py - 1, side * 4, 2, leaf);
                            pRect(px - side * 3, py + 1, side * 3, 2, isLightMode ? '#15803d' : '#0c7049');
                            pRect(px + side * 4, py - 2, 2, 1, '#86efac');
                        }
                        if (y % 29 === 0 && y > 10) {
                            pRect(px + 2, py + 1, 1, 5, isLightMode ? '#15803d' : '#0f5138');
                            pRect(px + 1, py + 5, 3, 1, '#22a65c');
                        }
                    }

                } else if (f.type === 'tropical_leaf') {
                    // Broad, overlapping elephant-ear fronds radiate from a heavy central stalk.
                    const stem = isLightMode ? '#166534' : '#0b4636';
                    const baseY = ph - 2;
                    pRect(f.x - 2, baseY - 5, 4, 6, stem);
                    for (let blade = -3; blade <= 3; blade++) {
                        const direction = blade === 0 ? f.dir : Math.sign(blade) * f.dir;
                        const length = f.h * (0.58 + (3 - Math.abs(blade)) * 0.115);
                        const reach = blade * (5.5 + (3 - Math.abs(blade)) * 1.6);
                        for (let step = 0; step < length; step++) {
                            const t = step / length;
                            const centerX = f.x + reach * t + Math.sin(time * 0.0012 + f.phase + blade) * t * 2.2;
                            const centerY = baseY - length * t;
                            const halfWidth = Math.max(0, Math.round(Math.sin(t * Math.PI) * (3.2 + (3 - Math.abs(blade)) * 0.65)));
                            for (let edge = -halfWidth; edge <= halfWidth; edge++) {
                                const leafX = centerX + edge * direction * 0.74;
                                const leafY = centerY + Math.abs(edge) * 0.22;
                                const color = edge === 0 ? (isLightMode ? '#4ade80' : '#2dd4a0')
                                    : edge * direction < 0 ? f.hue : (isLightMode ? '#15803d' : '#0c6246');
                                pRect(leafX, leafY, 1, 1, color);
                            }
                            if (step % 7 === 0 && halfWidth > 1) {
                                pRect(centerX - halfWidth, centerY + 1, 2, 1, isLightMode ? '#22c55e' : '#14784e');
                            }
                        }
                    }

                } else if (f.type === 'jungle_fern') {
                    // Large tree-fern rosettes with feathery, curved pinnae.
                    for (let frond = -2; frond <= 2; frond++) {
                        const direction = frond < 0 ? -1 : 1;
                        const length = f.h * (0.68 + (2 - Math.abs(frond)) * 0.16);
                        for (let step = 0; step < length; step++) {
                            const t = step / length;
                            const curve = direction * Math.pow(t, 1.35) * (10 + Math.abs(frond) * 3);
                            const px = f.x + curve + Math.sin(time * 0.0014 + f.phase + frond) * t * 1.8;
                            const py = ph - step;
                            pRect(px, py, 1, 1, isLightMode ? '#166534' : '#0d593d');
                            if (step > 3 && step % 2 === 0) {
                                const span = Math.max(1, Math.round((1 - t) * 4));
                                const side = frond === 0 ? (step % 4 === 0 ? -1 : 1) : direction;
                                pRect(px - span * side, py, span, 1, isLightMode ? '#22a65a' : '#128052');
                                pRect(px + span * side, py - 1, span, 1, isLightMode ? '#15803d' : '#0c7049');
                            }
                        }
                    }

                } else if (f.type === 'heliconia') {
                    // Tropical lobster-claw flower spikes with alternating red and golden bracts.
                    const sway = Math.sin(time * 0.0015 + f.phase) * 2;
                    const topY = ph - f.h;
                    for (let y = 0; y < f.h; y++) {
                        const px = f.x + sway * (y / f.h);
                        const py = ph - y;
                        pRect(px, py, 2, 1, isLightMode ? '#166534' : '#0e5038');
                        if (y % 8 === 3 && y > f.h * 0.35) {
                            const side = (Math.floor(y / 8) % 2 === 0) ? -1 : 1;
                            pRect(px + side * 2, py - 1, 4, 3, f.hue);
                            pRect(px + side * 3, py - 2, 2, 1, '#facc15');
                            pRect(px + side * 4, py + 1, 1, 1, '#fef08a');
                        }
                    }
                    pRect(f.x - 4, topY + 3, 3, 2, isLightMode ? '#22a65a' : '#14784e');
                    pRect(f.x + 2, topY + 8, 4, 2, isLightMode ? '#15803d' : '#0d593d');

                } else if (f.type === 'epiphyte') {
                    // Orchid and bromeliad clusters perched halfway up living branches.
                    const sway = Math.sin(time * 0.0012 + f.phase) * 1.5;
                    const x = f.x + sway;
                    const y = f.y;
                    pRect(x - 5, y + 2, 11, 2, isLightMode ? '#166534' : '#0d5138');
                    pRect(x - 2, y - 1, 5, 3, isLightMode ? '#15803d' : '#0f6b46');
                    pRect(x - 8, y, 4, 2, isLightMode ? '#22a65a' : '#14784e');
                    pRect(x + 5, y - 1, 4, 2, isLightMode ? '#22a65a' : '#14784e');
                    pRect(x - 1, y - 4, 3, 2, f.hue);
                    pRect(x - 4, y - 3, 3, 2, f.hue);
                    pRect(x + 2, y - 3, 3, 2, f.hue);
                    pRect(x - 1, y - 2, 2, 2, '#fef08a');
                    pRect(x - 1, y + 4, 1, 3, 'rgba(45, 212, 191, 0.48)');

                } else if (f.type === 'bromeliad') {
                    // Rosette leaves and a vivid central tropical flower.
                    const centerX = f.x;
                    const centerY = ph - f.h;
                    for (let blade = -4; blade <= 4; blade++) {
                        const lean = blade * 2.4;
                        const bladeHeight = f.h * (0.62 + (4 - Math.abs(blade)) * 0.11);
                        for (let y = 0; y < bladeHeight; y++) {
                            const progress = y / bladeHeight;
                            const x = centerX + lean * progress + Math.sin(time * 0.001 + f.phase + blade) * progress;
                            const width = Math.max(1, Math.round(Math.sin(progress * Math.PI) * 2));
                            pRect(x - width, ph - y, width * 2 + 1, 1, blade % 2 === 0 ? '#15803d' : '#0f766e');
                            pRect(x, ph - y, 1, 1, '#4ade80');
                        }
                    }
                    pRect(centerX - 3, centerY - 3, 7, 4, f.hue);
                    pRect(centerX - 1, centerY - 5, 3, 3, '#facc15');
                    pRect(centerX, centerY - 6, 1, 2, '#fff7ad');

                } else if (f.type === 'orchid') {
                    // Delicate orchid stem with layered five-petal blossoms.
                    for (let y = 0; y < f.h; y++) {
                        const sway = Math.sin(time * 0.0016 + f.phase + y * 0.06) * (y / f.h) * 2;
                        pRect(f.x + sway, ph - y, 1, 1, isLightMode ? '#166534' : '#115e59');
                    }
                    const flowerY = ph - f.h;
                    const flowerX = f.x + Math.sin(time * 0.0016 + f.phase + f.h * 0.06) * 2;
                    pRect(flowerX - 3, flowerY, 3, 2, f.hue);
                    pRect(flowerX + 1, flowerY, 3, 2, f.hue);
                    pRect(flowerX - 2, flowerY - 2, 5, 2, '#fbcfe8');
                    pRect(flowerX - 1, flowerY - 1, 3, 2, '#fef08a');
                    pRect(flowerX, flowerY + 1, 1, 2, '#f59e0b');

                } else if (f.type === 'sunflower') {
                    const stemShade = isLightMode ? '#15803d' : '#14532d';
                    let topX = f.x;
                    const topY = ph - Math.floor(f.h);
                    for (let y = 0; y < f.h; y++) {
                        const sway = Math.sin(time * 0.0016 + f.phase + y * 0.05) * (y / f.h) * 3.2;
                        const px = f.x + sway;
                        const py = ph - y;
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
                    // Tall Foxglove / Lupine Spike with Tiered Bell Blossoms
                    const stemShade = isLightMode ? '#15803d' : '#14532d';
                    for (let y = 0; y < f.h; y++) {
                        const sway = Math.sin(time * 0.0017 + f.phase + y * 0.06) * (y / f.h) * 3;
                        const px = f.x + sway;
                        const py = ph - y;
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
                        const sway = Math.sin(time * 0.0018 + f.phase + y * 0.07) * (y / f.h) * 3;
                        const px = f.x + sway;
                        const py = ph - y;
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
                    // Tilkikuyruğu (Ceratophyllum demersum) - Feathery pine-needle whorls with glowing night tips!
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
                    // Floating Water Lettuce (Pistia) with feathery submerged roots that Bettas love to weave through
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
                    // Organic Tapered Wisteria Blossom Raceme hanging from the corner tree boughs
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
                    // Woodland Unfurling Fern Fronds
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
                    // Bioluminescent Forest Mycena Mushroom Cluster
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
                    // Wetland Water Iris with Sword-Shaped Leaves & 3-Petal Blossom
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
                    // Umbrella Papyrus Sedge with Radiating Crown Rays
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
                    // Dome-shaped Brain Coral with Glowing Convoluted Grooves
                    for (let dy = -f.r; dy <= 0; dy++) {
                        for (let dx = -f.r; dx <= f.r; dx++) {
                            if (dx * dx + dy * dy <= f.r * f.r) {
                                const groove = Math.sin(dx * 1.4 + dy * 1.2) > 0.2;
                                const col = groove ? `hsla(${f.hue}, 95%, 68%, 0.85)` : `hsla(${f.hue}, 75%, 28%, 0.85)`;
                                pRect(f.x + dx, ph + dy, 1, 1, col);
                            }
                        }
                    }

                } else if (f.type === 'tube_sponge') {
                    // Clustered Bioluminescent Chimney Tube Sponges
                    [-3, 0, 3].forEach((ox, idx) => {
                        const th = Math.round(f.h * (idx === 1 ? 1 : 0.72));
                        for (let y = 0; y < th; y++) {
                            const col = y >= th - 2 ? '#fef08a' : `hsla(${f.hue}, 85%, ${35 + (y / th) * 25}%, 0.82)`;
                            pRect(f.x + ox, ph - y, 2, 1, col);
                        }
                    });

                } else if (f.type === 'sea_fan') {
                    // Branching Lattice Gorgonian Sea Fan
                    for (let y = 0; y < f.h; y++) {
                        const sway = Math.sin(time * 0.0014 + f.phase + y * 0.08) * (y / f.h) * 2.5;
                        const spread = Math.round(Math.sin((y / f.h) * Math.PI) * 6);
                        const px = f.x + sway;
                        const py = ph - y;
                        for (let dx = -spread; dx <= spread; dx += 2) {
                            if ((dx + y) % 2 === 0) {
                                pRect(px + dx, py, 1, 1, `hsla(${f.hue}, 90%, 62%, 0.68)`);
                            }
                        }
                    }

                } else if (f.type === 'kelp') {
                    // Tall Undulating Giant Kelp Forest Frond
                    for (let y = 0; y < f.h; y++) {
                        const sway = Math.sin(time * 0.0015 + f.phase + y * 0.07) * (y / f.h) * 5;
                        const px = f.x + sway;
                        const py = ph - y;
                        pRect(px, py, 1, 1, '#0d9488');
                        if (y % 5 === 0 && y > 6) {
                            const side = (y % 10 === 0) ? -3 : 1;
                            pRect(px + side, py, 3, 2, '#2dd4bf');
                        }
                    }

                } else if (f.type === 'anemone') {
                    pRect(f.x - 3, ph - 5, 7, 5, '#3b0764');
                    for (let t = -3; t <= 3; t++) {
                        const sway = Math.sin(time * 0.003 + f.phase + t) * 1.8;
                        for (let y = 5; y <= 14; y++) {
                            pRect(f.x + t * 1.4 + sway * (y / 14), ph - y, 1, 1, y === 14 ? '#fef08a' : `hsla(${f.hue}, 90%, 65%, 0.78)`);
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

            // Render Organic Species-Specific Stimuli (No ugly vertical stalk!)
            for (let i = stimuli.length - 1; i >= 0; i--) {
                const s = stimuli[i];
                s.life -= frameScale;

                if (s.type === 'tropical_fruit') {
                    // Ripe mango / guava morsels float for a moment, inviting the macaws to forage.
                    s.phase += 0.09 * frameScale;
                    s.y = s.baseY + Math.sin(s.phase) * 1.4;
                    pRect(s.x - 2, s.y - 1, 5, 4, s.hue || '#f97316');
                    pRect(s.x - 1, s.y - 2, 3, 1, '#facc15');
                    pRect(s.x + 1, s.y - 3, 3, 1, '#16a34a');
                    pRect(s.x + 1, s.y - 4, 1, 2, '#4ade80');
                    pRect(s.x - 1, s.y, 2, 1, 'rgba(255,255,255,0.6)');

                } else if (s.type === 'honey_nectar') {
                    // Floating Golden Honey Droplet & Orbiting Pollen Motes
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
                    // Drifting 5-Petal Night Blossom floating gently on air currents
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
