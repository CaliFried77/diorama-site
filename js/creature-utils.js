import { stimuli } from './07-habitat-state.js';
import { findAvailableStimulusIn } from './creature-targeting.js';

/* CREATURE UTILS — shared scene-aware wrappers for creature behavior. */

// ============================================================================
// BÖLÜM BAŞI: ORTAK YEM HEDEFLEME
// ============================================================================

export function findAvailableStimulus(creature, type, maxDist = 145) {
    return findAvailableStimulusIn(creature, type, maxDist, stimuli);
}

// ============================================================================
// BÖLÜM SONU: ORTAK YEM HEDEFLEME
// ============================================================================
