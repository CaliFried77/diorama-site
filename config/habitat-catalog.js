/**
 * Habitat catalog. Entries may reuse existing renderer/creature/interaction profiles.
 * Add a new profile contract only together with its implementation and tests.
 */
export const HABITAT_SCENE_PROFILES = Object.freeze([
  'meadow', 'betta-aquarium', 'wetland', 'botanical', 'reef', 'koi-pond', 'rainforest',
]);
export const HABITAT_CREATURE_PROFILES = Object.freeze([
  'bee', 'betta', 'dragonfly', 'butterfly', 'jellyfish', 'koi', 'parrot',
]);
export const HABITAT_INTERACTION_PROFILES = Object.freeze([
  'nectar', 'bloodworm', 'midge', 'blossom', 'plankton', 'pellet', 'fruit',
]);

export const HABITATS = [
  {
    id: 'bees',
    sceneProfile: 'meadow',
    creatureProfile: 'bee',
    interactionProfile: 'nectar',
    weatherSky: true,
    name: 'Çayır & Bal Arıları',
    hint: 'Tıkla: Bal Özü & Polen',
    dotColor: '#f59e0b',
    skyTop: '#0b0f24',
    skyMid: '#1d1936',
    skyBot: '#291c2e',
    lightTop: '#38bdf8',
    lightMid: '#7dd3fc',
    lightBot: '#fef08a',
    rgb: [251, 191, 36],
  },
  {
    id: 'betta',
    sceneProfile: 'betta-aquarium',
    creatureProfile: 'betta',
    interactionProfile: 'bloodworm',
    weatherSky: false,
    name: 'Halfmoon Betta Akvaryumu',
    hint: 'Tıkla: Kan Kurtçuğu',
    dotColor: '#38bdf8',
    skyTop: '#04101e',
    skyMid: '#071b2e',
    skyBot: '#05121d',
    lightTop: '#0284c7',
    lightMid: '#0ea5e9',
    lightBot: '#0369a1',
    rgb: [56, 189, 248],
  },
  {
    id: 'dragonfly',
    sceneProfile: 'wetland',
    creatureProfile: 'dragonfly',
    interactionProfile: 'midge',
    weatherSky: true,
    name: 'Sazlık & İmparator Yusufçuk',
    hint: 'Tıkla: Su Sineği',
    dotColor: '#34d399',
    skyTop: '#06151c',
    skyMid: '#0b252e',
    skyBot: '#051319',
    lightTop: '#38bdf8',
    lightMid: '#67e8f9',
    lightBot: '#0d9488',
    rgb: [52, 211, 153],
  },
  {
    id: 'butterfly',
    sceneProfile: 'botanical',
    creatureProfile: 'butterfly',
    interactionProfile: 'blossom',
    weatherSky: true,
    name: 'Botanik Bahçesi & Kelebekler',
    hint: 'Tıkla: Yüzen Çiçek',
    dotColor: '#c084fc',
    skyTop: '#07091e',
    skyMid: '#111638',
    skyBot: '#090d22',
    lightTop: '#60a5fa',
    lightMid: '#93c5fd',
    lightBot: '#86efac',
    rgb: [192, 132, 252],
  },
  {
    id: 'jellyfish',
    sceneProfile: 'reef',
    creatureProfile: 'jellyfish',
    interactionProfile: 'plankton',
    weatherSky: false,
    name: 'Mercan Lagünü & Denizanaları',
    hint: 'Tıkla: Biyolüminesan Plankton',
    dotColor: '#e879f9',
    skyTop: '#050417',
    skyMid: '#0d092b',
    skyBot: '#060418',
    lightTop: '#0891b2',
    lightMid: '#0e7490',
    lightBot: '#1e1b4b',
    rgb: [232, 121, 249],
  },
  {
    id: 'koi',
    sceneProfile: 'koi-pond',
    creatureProfile: 'koi',
    interactionProfile: 'pellet',
    weatherSky: true,
    name: 'Kyoto Zen Bahçesi & Koi Göleti',
    hint: 'Tıkla: Yüzen Koi Peleti',
    dotColor: '#fb7185',
    skyTop: '#07141e',
    skyMid: '#0c2230',
    skyBot: '#071520',
    lightTop: '#0d9488',
    lightMid: '#0f766e',
    lightBot: '#115e59',
    rgb: [251, 113, 133],
  },
  {
    id: 'rainforest',
    sceneProfile: 'rainforest',
    creatureProfile: 'parrot',
    interactionProfile: 'fruit',
    weatherSky: true,
    name: 'Yağmur Ormanı & Renkli Papağanlar',
    hint: 'Tıkla: Tropik Meyve',
    dotColor: '#34d399',
    skyTop: '#061b19',
    skyMid: '#10352d',
    skyBot: '#071b1a',
    lightTop: '#38bdf8',
    lightMid: '#86efac',
    lightBot: '#fde68a',
    rgb: [52, 211, 153],
  },
];

export const HABITAT_IDS = new Set(HABITATS.map((habitat) => habitat.id));

const sceneProfileIds = new Set(HABITAT_SCENE_PROFILES);
const creatureProfileIds = new Set(HABITAT_CREATURE_PROFILES);
const interactionProfileIds = new Set(HABITAT_INTERACTION_PROFILES);
const uniqueIds = new Set();
const colorKeys = ['dotColor', 'skyTop', 'skyMid', 'skyBot', 'lightTop', 'lightMid', 'lightBot'];

for (const habitat of HABITATS) {
  const validIdentity = typeof habitat.id === 'string' && /^[a-z0-9-]+$/.test(habitat.id)
    && typeof habitat.name === 'string' && habitat.name.trim()
    && typeof habitat.hint === 'string' && habitat.hint.trim();
  const validProfiles = sceneProfileIds.has(habitat.sceneProfile)
    && creatureProfileIds.has(habitat.creatureProfile)
    && interactionProfileIds.has(habitat.interactionProfile)
    && typeof habitat.weatherSky === 'boolean';
  const validPalette = colorKeys.every((key) => /^#[0-9a-f]{6}$/i.test(habitat[key] || ''))
    && Array.isArray(habitat.rgb)
    && habitat.rgb.length === 3
    && habitat.rgb.every((channel) => Number.isInteger(channel) && channel >= 0 && channel <= 255);

  if (!validIdentity || !validProfiles || !validPalette) {
    throw new Error(`Invalid habitat catalog entry: ${habitat.id || 'unknown'}`);
  }
  if (uniqueIds.has(habitat.id)) throw new Error(`Duplicate habitat id: ${habitat.id}`);
  uniqueIds.add(habitat.id);
}
