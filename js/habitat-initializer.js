import {
    currentHabitatIdx, HABITATS, creatures, stimuli, ambientParticles, flora,
    bgSilhouettes, shootingStars, pw, ph, setCurrentHabitatIndex,
} from './07-habitat-state.js';
import {
    PixelBee, PixelBetta, PixelDragonfly, PixelButterfly, PixelJellyfish,
    PixelKoi, PixelParrot, PixelArcticFox,
} from './08-creatures.js';
import { sceneCache } from './scene-state.js';
import { populateHabitatFlora } from './habitat-flora-generator.js';

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

    populateHabitatFlora(hab);

    const creatureProfile = CREATURE_PROFILES[hab.creatureProfile];
    if (creatureProfile) {
        for (let i = 0; i < creatureProfile.count; i++) creatures.push(creatureProfile.create());
    }
}

// ============================================================================
// BÖLÜM SONU: HABİTATIN İLK KURULUMU
// ============================================================================
