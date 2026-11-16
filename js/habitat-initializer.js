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

// ============================================================================
// BÖLÜM BAŞI: ZEMİN PROFİLLERİ VE HABİTATIN İLK KURULUMU
// Her habitatın zemin eğrisi ve ilk canlı/bitki/partikül durumu burada hazırlanır.
// ============================================================================

=

// ============================================================================
// BÖLÜM SONU: HABİTATIN İLK KURULUMU
// ============================================================================
