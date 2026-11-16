import { stimuli, canvas, PIXEL_SCALE, HABITATS, currentHabitatIdx, pw, ph } from './07-habitat-state.js';
import { getArcticLandingY } from './arctic-geometry.js';

/* HABITAT INTERACTIONS
   Pointer input creates the food/stimulus associated with the active habitat.
   Creature AI stays in 08-creatures.js; this module only creates stimuli. */

//#region YEM ETKİLEŞİMİ — tıklama ile aktif habitatın yiyeceğini oluşturur
canvas.addEventListener('pointerdown', (e) => {
    const px = e.clientX / PIXEL_SCALE;
    const py = e.clientY / PIXEL_SCALE;
    const interactionProfile = HABITATS[currentHabitatIdx].interactionProfile;

    if (interactionProfile === 'nectar') {
        for (let i = 0; i < 3; i++) {
            const angle = (i / 3) * Math.PI * 2 + Math.random();
            const dist = i === 0 ? 0 : 7 + Math.random() * 8;
            stimuli.push({
                type: 'honey_nectar',
                x: px + Math.cos(angle) * dist,
                y: py + Math.sin(angle) * dist,
                baseY: py + Math.sin(angle) * dist,
                phase: Math.random() * Math.PI * 2,
                ripple: 0,
                life: 240,
                claimedBy: null
            });
        }
    } else if (interactionProfile === 'blossom') {
        for (let i = 0; i < 2; i++) {
            stimuli.push({
                type: 'floating_blossom',
                x: px + (i - 0.5) * 12,
                y: py + (Math.random() - 0.5) * 8,
                vx: (Math.random() - 0.5) * 0.08,
                vy: -0.03 + Math.random() * 0.06,
                phase: Math.random() * Math.PI * 2,
                color: i === 0 ? '#f0abfc' : '#7dd3fc',
                core: '#fef08a',
                life: 250,
                claimedBy: null
            });
        }
    } else if (interactionProfile === 'bloodworm') {
        for (let i = 0; i < 3; i++) {
            stimuli.push({
                type: 'bloodworm',
                x: px + (Math.random() - 0.5) * 14,
                y: py + (Math.random() - 0.5) * 8,
                vy: 0.13 + Math.random() * 0.06,
                phase: Math.random() * Math.PI * 2,
                life: 260,
                claimedBy: null
            });
        }
    } else if (interactionProfile === 'midge') {
        for (let i = 0; i < 3; i++) {
            const bx = px + (Math.random() - 0.5) * 18;
            const by = py + (Math.random() - 0.5) * 12;
            stimuli.push({
                type: 'midge',
                x: bx,
                y: by,
                baseX: bx,
                baseY: by,
                phase: Math.random() * Math.PI * 2,
                life: 240,
                claimedBy: null
            });
        }
    } else if (interactionProfile === 'plankton') {
        for (let i = 0; i < 2; i++) {
            stimuli.push({
                type: 'plankton_swarm',
                x: px + (i - 0.5) * 14,
                y: py + (Math.random() - 0.5) * 10,
                phase: Math.random() * Math.PI * 2,
                life: 220,
                claimedBy: null
            });
        }
    } else if (interactionProfile === 'pellet') {
        for (let i = 0; i < 3; i++) {
            stimuli.push({
                type: 'koi_pellet',
                x: px + (Math.random() - 0.5) * 14,
                y: py + (Math.random() - 0.5) * 10,
                ripple: 1,
                life: 250,
                claimedBy: null
            });
        }
    } else if (interactionProfile === 'fruit') {
        // Spawn a trio of detailed pixel-art tropical fruits: Mango, Pink Guava & Golden Banana Cluster
        const kinds = ['mango', 'guava', 'banana'];
        for (let i = 0; i < 3; i++) {
            const offset = (i - 1) * 11;
            const fruitX = px + offset + (Math.random() - 0.5) * 3;
            const fruitY = py + (Math.random() - 0.5) * 6;
            stimuli.push({
                type: 'tropical_fruit',
                kind: kinds[i],
                x: fruitX,
                y: fruitY,
                baseY: fruitY,
                phase: Math.random() * Math.PI * 2,
                life: 300,
                claimedBy: null
            });
        }
    } else if (interactionProfile === 'cloudberry') {
        // Spawn Golden Arctic Cloudberries that fall and land onto the nearest snow platform below!
        for (let i = 0; i < 2; i++) {
            const bx = Math.max(12, Math.min(pw - 12, px + (i - 0.5) * 14));
            const landY = getArcticLandingY(bx, py, pw, ph);
            stimuli.push({
                type: 'cloudberry',
                x: bx,
                y: Math.min(py, landY - 12),
                targetY: landY - 2,
                vy: 0.4,
                landed: false,
                phase: Math.random() * Math.PI * 2,
                life: 360,
                claimedBy: null
            });
        }
    }
});
//#endregion YEM ETKİLEŞİMİ
