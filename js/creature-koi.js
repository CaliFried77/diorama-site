import { pw, ph, ctx, frameScale, frameChance, frameSmoothing } from './07-habitat-state.js';
import { findAvailableStimulus } from './creature-utils.js';
import { getGroundY, getKoiWaterSurfaceY } from './habitat-geometry.js';

const KOI_SURFACE_CLEARANCE = 28;
const KOI_FLOOR_CLEARANCE = 20;
const koiSpriteCache = new Map();

function getKoiSwimBounds(x) {
    const sceneX = Math.max(0, Math.min(pw, x));
    const surfaceY = getKoiWaterSurfaceY(sceneX, pw, ph);
    const groundY = getGroundY(sceneX, 'koi-pond', pw, ph);
    const minY = surfaceY + KOI_SURFACE_CLEARANCE;
    const maxY = Math.max(minY + 18, groundY - KOI_FLOOR_CLEARANCE);
    return { minY, maxY };
}

function spriteRect(spriteCtx, x, y, width, height, color) {
    spriteCtx.fillStyle = color;
    spriteCtx.fillRect(x, y, width, height);
}

function paintPatch(spriteCtx, x, y, rows, color) {
    rows.forEach((row, rowIndex) => {
        let start = -1;
        for (let col = 0; col <= row.length; col++) {
            const filled = row[col] === '1';
            if (filled && start < 0) start = col;
            if (!filled && start >= 0) {
                spriteRect(spriteCtx, x + start, y + rowIndex, col - start, 1, color);
                start = -1;
            }
        }
    });
}

function buildKoiSprites(palette) {
    const cached = koiSpriteCache.get(palette.kind);
    if (cached) return cached;

    // One-time sprite construction: a three-quarter surface view with a visible
    // flank, single near-side eye, asymmetrical fins and a softly tapered head.
    // The hot animation loop only rotates and blits these tiny cached canvases.
    const body = document.createElement('canvas');
    body.width = 40;
    body.height = 26;
    const bodyCtx = body.getContext('2d');
    const halfWidths = [
        1.1, 1.9, 2.8, 3.7, 4.5, 5.2, 5.8, 6.2, 6.4, 6.4,
        6.3, 6.1, 5.8, 5.4, 5.0, 4.7, 4.4, 4.1, 3.8, 3.5,
        3.2, 2.9, 2.6, 2.3, 2.0, 1.8, 1.6, 1.3, 1.0, 0.6
    ];

    halfWidths.forEach((radius, index) => {
        const x = 7 + index;
        const centerY = 12 + Math.sin(index * 0.13) * 0.45;
        const farEdge = Math.round(centerY - radius * 0.70);
        const nearEdge = Math.round(centerY + radius * 1.05);

        spriteRect(bodyCtx, x, farEdge - 1, 1, nearEdge - farEdge + 3, '#263b40');
        for (let y = farEdge; y <= nearEdge; y++) {
            let color = palette.base;
            if (y <= centerY - 2) color = palette.back;
            else if (y >= centerY + 3) color = palette.shade;
            else if (y === Math.round(centerY + 1)) color = palette.flank;
            spriteRect(bodyCtx, x, y, 1, 1, color);
        }
    });

    // Dorsal ridge and a soft highlight along the upper back.
    spriteRect(bodyCtx, 15, 6, 12, 1, palette.back);
    spriteRect(bodyCtx, 18, 5, 7, 1, palette.finHi);
    spriteRect(bodyCtx, 20, 4, 3, 1, palette.fin);
    spriteRect(bodyCtx, 12, 8, 18, 1, palette.back);
    spriteRect(bodyCtx, 13, 9, 14, 1, palette.back);

    // Gill plate and a single eye on the viewer-facing side.
    spriteRect(bodyCtx, 31, 13, 1, 4, palette.gill);
    spriteRect(bodyCtx, 32, 14, 1, 3, palette.gillHi);
    spriteRect(bodyCtx, 33, 15, 2, 2, '#142a31');
    spriteRect(bodyCtx, 33, 15, 1, 1, '#f8f6e8');
    spriteRect(bodyCtx, 36, 15, 2, 1, palette.back);
    spriteRect(bodyCtx, 37, 14, 2, 2, palette.base);

    // Near-side pectoral fin is broad and readable; the far fin is deliberately
    // smaller and darker to avoid the symmetrical, directly-from-above look.
    spriteRect(bodyCtx, 21, 17, 3, 1, palette.gill);
    spriteRect(bodyCtx, 22, 18, 4, 1, palette.fin);
    spriteRect(bodyCtx, 23, 19, 4, 1, palette.finHi);
    spriteRect(bodyCtx, 24, 20, 3, 1, palette.fin);
    spriteRect(bodyCtx, 24, 21, 2, 1, palette.gillHi);
    spriteRect(bodyCtx, 19, 8, 3, 1, palette.gill);
    spriteRect(bodyCtx, 18, 7, 3, 1, palette.fin);

    // Small scale glints stay on the exposed flank instead of covering the whole fish.
    for (let x = 13; x <= 29; x += 3) {
        const offset = (x % 2) * 1;
        spriteRect(bodyCtx, x, 15 + offset, 1, 1, palette.scale);
        if (x % 2 === 1) spriteRect(bodyCtx, x + 1, 17 + offset, 1, 1, palette.scaleSoft);
    }

    if (palette.kind === 'kohaku') {
        paintPatch(bodyCtx, 12, 8, ['0011100', '0111110', '1111111', '0111110'], palette.patch1);
        paintPatch(bodyCtx, 26, 9, ['01110', '11111', '11111', '01110'], palette.patch2);
    } else if (palette.kind === 'tancho') {
        paintPatch(bodyCtx, 31, 8, ['0110', '1111', '1111', '0110'], palette.patch1);
    } else if (palette.kind === 'showa') {
        paintPatch(bodyCtx, 11, 8, ['0011100', '0111110', '1111111', '0111110'], palette.patch2);
        paintPatch(bodyCtx, 24, 9, ['01110', '11111', '11111', '01110'], palette.patch1);
        spriteRect(bodyCtx, 17, 13, 4, 2, palette.patch2);
    } else if (palette.kind === 'ogon') {
        spriteRect(bodyCtx, 12, 10, 18, 1, palette.patch1);
        spriteRect(bodyCtx, 14, 12, 14, 1, palette.finHi);
        spriteRect(bodyCtx, 17, 16, 9, 1, palette.scaleSoft);
    } else if (palette.kind === 'asagi') {
        for (let x = 12; x <= 29; x += 3) {
            const y = 10 + ((x / 3) % 2);
            spriteRect(bodyCtx, x, y, 2, 1, palette.patch1);
            spriteRect(bodyCtx, x + 1, y + 2, 1, 1, palette.patch2);
        }
        spriteRect(bodyCtx, 30, 10, 4, 2, palette.patch2);
    }

    const tail = document.createElement('canvas');
    tail.width = 12;
    tail.height = 18;
    const tailCtx = tail.getContext('2d');
    const tailRows = [
        [8, 10], [6, 10], [3, 10], [1, 9], [0, 8], [1, 7],
        [3, 6], [4, 7], [3, 6], [1, 7], [0, 8], [1, 9],
        [3, 10], [6, 10]
    ];
    tailRows.forEach(([left, right], y) => {
        spriteRect(tailCtx, left, y + 2, right - left + 1, 1, palette.gill);
        spriteRect(tailCtx, left + 1, y + 2, Math.max(1, right - left - 1), 1, palette.fin);
        if (y % 3 === 0) spriteRect(tailCtx, left + 2, y + 2, 2, 1, palette.finHi);
    });
    spriteRect(tailCtx, 8, 7, 3, 3, palette.gillHi);

    bodyCtx.imageSmoothingEnabled = false;
    tailCtx.imageSmoothingEnabled = false;
    const sprites = { body, tail };
    koiSpriteCache.set(palette.kind, sprites);
    return sprites;
}

/* PIXELKOI — dedicated three-quarter Nishikigoi behavior and cached pixel-art sprite. */

// ============================================================================
// BÖLÜM BAŞI: KOİ BALIĞI SINIFI VE DAVRANIŞLARI
// Bu dosya yalnızca ilgili canlının hareket, etkileşim ve çizim kodunu içerir.
// ============================================================================

export class PixelKoi {
    constructor() {
        this.x = 28 + Math.random() * (pw - 56);
        const swimBounds = getKoiSwimBounds(this.x);
        this.y = swimBounds.minY + Math.random() * (swimBounds.maxY - swimBounds.minY);
        this.angle = Math.random() * Math.PI * 2;
        this.targetAngle = this.angle;
        this.speed = 0.22 + Math.random() * 0.07;
        this.phase = Math.random() * Math.PI * 2;
        this.eatCooldown = 0;
        this.biteRipple = 0;

        const varieties = [
            {
                kind: 'kohaku', base: '#e8eee8', shade: '#9bafa9', back: '#f3f6ed',
                flank: '#c4d2cb', patch1: '#d36b60', patch2: '#aa453f',
                fin: 'rgba(229, 226, 205, 0.88)', finHi: 'rgba(247, 241, 222, 0.92)',
                gill: '#718b84', gillHi: '#adc0b7', scale: '#f9f4df',
                scaleSoft: 'rgba(248, 245, 226, 0.72)', rgb: [207, 105, 94]
            },
            {
                kind: 'tancho', base: '#edf1e9', shade: '#aab9ad', back: '#f7f7eb',
                flank: '#ced8cd', patch1: '#c94b45', patch2: '#a8403c',
                fin: 'rgba(237, 233, 214, 0.88)', finHi: 'rgba(250, 247, 225, 0.92)',
                gill: '#82978b', gillHi: '#b9c8ba', scale: '#fff8e6',
                scaleSoft: 'rgba(248, 245, 226, 0.72)', rgb: [196, 75, 69]
            },
            {
                kind: 'showa', base: '#dce5de', shade: '#8a9b91', back: '#eef0e4',
                flank: '#b1c0b7', patch1: '#bb5351', patch2: '#273e45',
                fin: 'rgba(211, 224, 213, 0.86)', finHi: 'rgba(238, 242, 225, 0.9)',
                gill: '#607b73', gillHi: '#9db2a6', scale: '#edf4e6',
                scaleSoft: 'rgba(239, 244, 229, 0.62)', rgb: [177, 77, 79]
            },
            {
                kind: 'ogon', base: '#d9c778', shade: '#9c8448', back: '#f0dc8c',
                flank: '#c3a95a', patch1: '#f2d17a', patch2: '#b18c3e',
                fin: 'rgba(237, 214, 144, 0.9)', finHi: 'rgba(250, 235, 181, 0.92)',
                gill: '#806c3f', gillHi: '#bda45b', scale: '#fff0b8',
                scaleSoft: 'rgba(250, 231, 171, 0.65)', rgb: [216, 180, 93]
            },
            {
                kind: 'asagi', base: '#9dbcc2', shade: '#587984', back: '#d1e1dc',
                flank: '#769ba6', patch1: '#5a8ba2', patch2: '#bd685d',
                fin: 'rgba(205, 222, 211, 0.86)', finHi: 'rgba(231, 239, 222, 0.9)',
                gill: '#4b6c76', gillHi: '#a8c4bf', scale: '#deebe0',
                scaleSoft: 'rgba(211, 232, 223, 0.66)', rgb: [105, 151, 165]
            }
        ];
        this.pal = varieties[Math.floor(Math.random() * varieties.length)];
        this.rgb = this.pal.rgb;
        this.sprites = buildKoiSprites(this.pal);
    }

    update(t) {
        this.phase += 0.09 * frameScale;
        if (this.eatCooldown > 0) this.eatCooldown = Math.max(0, this.eatCooldown - frameScale);
        if (this.biteRipple > 0) this.biteRipple = Math.max(0, this.biteRipple - 0.35 * frameScale);

        const pellet = findAvailableStimulus(this, 'koi_pellet', Math.max(300, pw * 0.72));
        if (pellet) {
            const dx = pellet.x - this.x;
            const dy = pellet.y - this.y;
            const dist = Math.hypot(dx, dy);
            this.targetAngle = Math.atan2(dy, dx);
            if (dist < 8) {
                pellet.life = 0;
                this.eatCooldown = 85;
                this.biteRipple = 9;
                this.targetAngle += (Math.random() - 0.5) * 1.0;
            }
        } else if (frameChance(0.012)) {
            this.targetAngle += (Math.random() - 0.5) * 0.72;
        }

        const swimBounds = getKoiSwimBounds(this.x);
        if (this.y < swimBounds.minY + 16) {
            this.targetAngle = Math.atan2(0.75, Math.cos(this.angle) >= 0 ? 1 : -1);
        } else if (this.y > swimBounds.maxY - 16) {
            this.targetAngle = Math.atan2(-0.75, Math.cos(this.angle) >= 0 ? 1 : -1);
        }
        if (this.x > pw - 56 && this.y > ph - 44) {
            this.targetAngle = Math.PI + (Math.random() - 0.5) * 0.32;
        }

        let diff = this.targetAngle - this.angle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        this.angle += diff * frameSmoothing(pellet ? 0.052 : 0.026);

        const speed = this.speed * (pellet ? 1.35 : 1);
        this.x += Math.cos(this.angle) * speed * frameScale;
        this.y += Math.sin(this.angle) * speed * frameScale;

        if (this.x < -42) this.x += pw + 84;
        else if (this.x > pw + 42) this.x -= pw + 84;

        const nextBounds = getKoiSwimBounds(this.x);
        this.y = Math.max(nextBounds.minY, Math.min(nextBounds.maxY, this.y));
    }

    draw() {
        const bounds = getKoiSwimBounds(this.x);
        const depth = Math.max(0, Math.min(1, (this.y - bounds.minY) / Math.max(1, bounds.maxY - bounds.minY)));
        const tailWag = Math.sin(this.phase * 1.7) * 0.18;

        ctx.save();
        ctx.translate(Math.round(this.x), Math.round(this.y));
        ctx.rotate(this.angle);
        ctx.scale(0.68, 0.68);
        ctx.globalAlpha = 0.90 - depth * 0.08;
        ctx.imageSmoothingEnabled = false;

        // Body sprite shows a dorsal ridge and only the near-side eye/flank.
        ctx.drawImage(this.sprites.body, -20, -13);

        // The caudal fin has its own small hinge so propulsion reads as a tail beat,
        // not a whole-body wobble or an exaggerated serpentine motion.
        ctx.save();
        ctx.translate(-13, 0);
        ctx.rotate(tailWag);
        ctx.drawImage(this.sprites.tail, -11, -9);
        ctx.restore();

        if (this.biteRipple > 0) {
            const radius = (10 - this.biteRipple) * 1.1;
            ctx.globalAlpha = 0.30;
            ctx.strokeStyle = 'rgba(224, 248, 235, 0.6)';
            ctx.lineWidth = 0.7;
            ctx.beginPath();
            ctx.ellipse(19, 3, radius * 0.9, radius * 0.42, -0.18, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.restore();
    }
}

// ============================================================================
// BÖLÜM SONU: KOİ BALIĞI SINIFI VE DAVRANIŞLARI
// ============================================================================
