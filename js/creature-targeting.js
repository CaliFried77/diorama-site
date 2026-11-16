/* CREATURE TARGETING — deterministic, DOM-free stimulus selection. */

/**
 * Claim the nearest live stimulus of the requested type that is not owned by
 * another creature. Passing the shared collection explicitly keeps selection
 * logic independently testable.
 */
export function findAvailableStimulusIn(creature, type, maxDist = 145, stimuli = []) {
    if (!creature || creature.eatCooldown > 0 || !Array.isArray(stimuli)) return null;

    let best = null;
    let bestDist = Number.isFinite(maxDist) && maxDist > 0 ? maxDist : 145;

    for (const stimulus of stimuli) {
        if (!stimulus || stimulus.type !== type || stimulus.life <= 0) continue;
        if (stimulus.claimedBy && stimulus.claimedBy !== creature) continue;
        if (!Number.isFinite(stimulus.x) || !Number.isFinite(stimulus.y)
            || !Number.isFinite(creature.x) || !Number.isFinite(creature.y)) continue;

        const distance = Math.hypot(stimulus.x - creature.x, stimulus.y - creature.y);
        if (distance < bestDist) {
            bestDist = distance;
            best = stimulus;
        }
    }

    if (best) best.claimedBy = creature;
    return best;
}
