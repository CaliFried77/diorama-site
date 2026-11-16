import { stimuli } from './07-habitat-state.js';

/* CREATURE UTILS — small behavior helpers shared by independent creature modules. */

// ============================================================================
// BÖLÜM BAŞI: ORTAK YEM HEDEFLEME
// Bir canlının erişebildiği en yakın, başka bir canlı tarafından sahiplenilmemiş yemi bulur.
// ============================================================================

export function findAvailableStimulus(creature, type, maxDist = 145) {
    if (creature.eatCooldown > 0) return null;
    let best = null;
    let bestDist = maxDist;
    for (let i = 0; i < stimuli.length; i++) {
        const s = stimuli[i];
        if (s.type !== type || s.life <= 0) continue;
        if (s.claimedBy && s.claimedBy !== creature) continue;
        const d = Math.hypot(s.x - creature.x, s.y - creature.y);
        if (d < bestDist) {
            bestDist = d;
            best = s;
        }
    }
    if (best) best.claimedBy = creature;
    return best;
}

// ============================================================================
// BÖLÜM SONU: ORTAK YEM HEDEFLEME
// ============================================================================
