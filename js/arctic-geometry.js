/* ARCTIC GEOMETRY — responsive snow platforms and fox navigation links.
   Pure scene geometry: dimensions are supplied by the caller; no DOM or canvas state is read here. */

// ============================================================================
// BÖLÜM BAŞI: KUTUP SAHNESİ PLATFORM KOORDİNATLARI
// Genişlik ve yükseklik parametreleri aktif piksel sahne boyutlarıdır.
// ============================================================================

export function getArcticLedges(width, height) {
    return [
        // 0: Main Valley Snow Floor (Center & Shores)
        { id: 0, x1: Math.round(width * 0.14), x2: Math.round(width * 0.86), yFn: (x) => {
            const nx = x / Math.max(1, width);
            return Math.round(height - 5 - Math.pow(Math.abs(nx - 0.5) * 1.9, 1.45) * 18 - Math.sin(x * 0.04) * 1.5);
        }},
        // 1: Left Lower Glacial Ledge
        { id: 1, x1: 6, x2: Math.round(width * 0.25), yFn: (x) => Math.round(height * 0.72 + Math.sin(x * 0.06) * 1.5) },
        // 2: Left Mid Overlook Ledge
        { id: 2, x1: Math.round(width * 0.20), x2: Math.round(width * 0.36), yFn: (x) => Math.round(height * 0.62 + Math.cos(x * 0.06) * 1.5) },
        // 3: Left High Pine Cliff Ledge
        { id: 3, x1: 8, x2: Math.round(width * 0.19), yFn: (x) => Math.round(height * 0.52 + Math.sin(x * 0.07) * 1.5) },
        // 4: Right Lower Glacial Ledge
        { id: 4, x1: Math.round(width * 0.75), x2: width - 6, yFn: (x) => Math.round(height * 0.72 + Math.cos(x * 0.06) * 1.5) },
        // 5: Right Mid Overlook Ledge (Near Nordic Cabin)
        { id: 5, x1: Math.round(width * 0.64), x2: Math.round(width * 0.80), yFn: (x) => Math.round(height * 0.60 + Math.sin(x * 0.06) * 1.5) },
        // 6: Right High Ridge Ledge
        { id: 6, x1: Math.round(width * 0.81), x2: width - 8, yFn: (x) => Math.round(height * 0.50 + Math.cos(x * 0.07) * 1.5) }
    ];
}

// ============================================================================
// BÖLÜM SONU: PLATFORM KOORDİNATLARI
// BÖLÜM BAŞI: TİLKİLERİN KULLANABİLECEĞİ PLATFORM BAĞLANTILARI
// Bağlantı grafiği hareket kodundan ayrı tutulur; her anahtar bir platform kimliğidir.
// ============================================================================

// Graph of which platforms a fox can realistically leap between
export const ARCTIC_LEDGE_LINKS = Object.freeze({
    0: [1, 2, 4, 5],
    1: [0, 2, 3],
    2: [0, 1, 3],
    3: [1, 2],
    4: [0, 5, 6],
    5: [0, 4, 6],
    6: [4, 5]
});

// ============================================================================
// BÖLÜM SONU: KUTUP PLATFORM GEOMETRİSİ VE BAĞLANTI GRAFİĞİ
// ============================================================================
