/* HABITAT GEOMETRY — shared ground curves for all habitat scene profiles.
   Pure calculations: viewport dimensions are explicit parameters; no DOM or canvas access. */

// ============================================================================
// BÖLÜM BAŞI: HABİTAT ZEMİN EĞRİLERİ
// ============================================================================

export function getGroundY(x, profile, width, height) {
    const nx = x / Math.max(1, width);
    if (profile === 'meadow') {
        const edgeLift = Math.pow(Math.abs(nx - 0.52) * 1.9, 1.6) * 12;
        return Math.round(height - 4 - edgeLift - Math.sin(x * 0.028) * 2.5);
    }
    if (profile === 'rainforest') {
        const valley = Math.pow(Math.abs(nx - 0.5) * 2, 1.5) * 14;
        return Math.round(height - 4 - valley - Math.sin(x * 0.035) * 2);
    }
    if (profile === 'wetland') {
        const bankFactor = Math.max(0, Math.abs(nx - 0.5) - 0.14) / 0.36;
        const bankLift = Math.pow(bankFactor, 1.35) * 26;
        return Math.round(height - 6 - bankLift - Math.sin(x * 0.04) * 2);
    }
    if (profile === 'botanical') {
        const terrace = Math.pow(Math.abs(nx - 0.5) * 1.85, 1.45) * 15;
        return Math.round(height - 5 - terrace - Math.sin(x * 0.032) * 2.5);
    }
    if (profile === 'reef') {
        const shelfLift = Math.pow(Math.abs(nx - 0.5) * 1.95, 1.5) * 22;
        return Math.round(height - 5 - shelfLift - Math.sin(x * 0.045) * 2.5 - Math.cos(x * 0.11) * 1.5);
    }
    if (profile === 'koi-pond') {
        const cornerBank = Math.max(0, Math.abs(nx - 0.48) - 0.24) / 0.28;
        return Math.round(height - 4 - Math.pow(cornerBank, 1.4) * 18 - Math.sin(x * 0.04) * 2);
    }
    if (profile === 'arctic-tundra') {
        const valley = Math.pow(Math.abs(nx - 0.5) * 1.9, 1.45) * 18;
        return Math.round(height - 5 - valley - Math.sin(x * 0.04) * 1.5);
    }
    return height;
}

/**
 * The visible waterline of the Kyoto koi pond.
 * Keep this shared with the background renderer and koi movement so fish
 * always stay below the exact shoreline drawn into the static scene.
 */
export function getKoiWaterSurfaceY(x, width, height) {
    return Math.round(
        height * 0.225
        + Math.sin(x * 0.016) * 2.2
        + Math.cos(x * 0.039) * 1.2
    );
}

// ============================================================================
// BÖLÜM SONU: HABİTAT ZEMİN EĞRİLERİ
// ============================================================================
