import { PRODUCTS, type ProductId } from './products';

export type CatalogKind = 'single' | 'bundle';
export type CatalogRarity = 'common' | 'rare' | 'epic' | 'legendary';

export type EntitlementKey =
  | 'ads_removed'
  | 'unlimited_boards'
  | 'fx_arcade'
  | 'theme_cyberpunk_cyan'
  | 'theme_acid_green'
  | 'theme_midnight_gold'
  | 'theme_blood_orange'
  | 'drop_mode_dark_humour'
  | 'drop_mode_wholesome'
  | 'drop_mode_desi'
  | 'drop_mode_gaming'
  | 'early_access';

export interface CatalogItem {
  id: ProductId;
  name: string;
  shortDescription: string;
  kind: CatalogKind;
  rarity: CatalogRarity;
  grants: EntitlementKey[];
  includes: ProductId[];
  available: boolean;
  basePriceINR: number; // Reference only, never displayed
}

export const RARITY_CONFIG: Record<
  CatalogRarity,
  {
    border: string;
    shadow: string;
    text: string;
    label: string;
  }
> = {
  common: {
    border: '#988ca1',
    shadow: '#988ca1',
    text: '#988ca1',
    label: 'COMMON',
  },
  rare: {
    border: '#9b30ff',
    shadow: '#9b30ff',
    text: '#9b30ff',
    label: 'RARE',
  },
  epic: {
    border: '#dd0061',
    shadow: '#dd0061',
    text: '#dd0061',
    label: 'EPIC',
  },
  legendary: {
    border: '#f4c300',
    shadow: '#f4c300',
    text: '#f4c300',
    label: 'LEGENDARY',
  },
};

export const CATALOG: CatalogItem[] = [
  // ================= SINGLE UNLOCKS =================
  {
    id: PRODUCTS.REMOVE_ADS,
    name: 'REMOVE ADS',
    shortDescription: 'Removes banner and interstitial ads permanently; rewarded ads stay optional.',
    kind: 'single',
    rarity: 'rare',
    grants: ['ads_removed'],
    includes: [],
    available: true,
    basePriceINR: 199,
  },
  {
    id: PRODUCTS.UNLIMITED_BOARDS,
    name: 'UNLIMITED MOOD BOARDS',
    shortDescription: 'Removes the free Mood Board cap completely.',
    kind: 'single',
    rarity: 'epic',
    grants: ['unlimited_boards'],
    includes: [],
    available: true,
    basePriceINR: 49,
  },
  {
    id: PRODUCTS.FX_ARCADE,
    name: 'ARCADE FX',
    shortDescription: '3 extra card entry/recoil animation styles.',
    kind: 'single',
    rarity: 'common',
    grants: ['fx_arcade'],
    includes: [],
    available: true,
    basePriceINR: 39,
  },
  {
    id: PRODUCTS.THEME_CYBERPUNK,
    name: 'CYBER CYAN',
    shortDescription: 'Electric cyan colour theme.',
    kind: 'single',
    rarity: 'common',
    grants: ['theme_cyberpunk_cyan'],
    includes: [],
    available: true,
    basePriceINR: 49,
  },
  {
    id: PRODUCTS.THEME_ACID,
    name: 'ACID GREEN',
    shortDescription: 'Toxic high-voltage green colour theme.',
    kind: 'single',
    rarity: 'common',
    grants: ['theme_acid_green'],
    includes: [],
    available: true,
    basePriceINR: 49,
  },
  {
    id: PRODUCTS.THEME_MIDNIGHT_GOLD,
    name: 'MIDNIGHT GOLD',
    shortDescription: 'Obsidian & royal gold colour theme.',
    kind: 'single',
    rarity: 'common',
    grants: ['theme_midnight_gold'],
    includes: [],
    available: true,
    basePriceINR: 49,
  },
  {
    id: PRODUCTS.THEME_BLOOD_ORANGE,
    name: 'BLOOD ORANGE',
    shortDescription: 'Searing neon orange colour theme.',
    kind: 'single',
    rarity: 'common',
    grants: ['theme_blood_orange'],
    includes: [],
    available: true,
    basePriceINR: 49,
  },
  {
    id: PRODUCTS.PACK_DARK_HUMOUR,
    name: 'DARK HUMOUR PACK',
    shortDescription: 'Permanent Drop Mode: Dark Humour.',
    kind: 'single',
    rarity: 'rare',
    grants: ['drop_mode_dark_humour'],
    includes: [],
    available: false, // Feature requires backend category endpoint
    basePriceINR: 59,
  },
  {
    id: PRODUCTS.PACK_WHOLESOME,
    name: 'WHOLESOME PACK',
    shortDescription: 'Permanent Drop Mode: Wholesome.',
    kind: 'single',
    rarity: 'rare',
    grants: ['drop_mode_wholesome'],
    includes: [],
    available: false, // Feature requires backend category endpoint
    basePriceINR: 59,
  },
  {
    id: PRODUCTS.PACK_DESI,
    name: 'DESI MEMES PACK',
    shortDescription: 'Permanent Drop Mode: Desi.',
    kind: 'single',
    rarity: 'rare',
    grants: ['drop_mode_desi'],
    includes: [],
    available: false, // Feature requires backend category endpoint
    basePriceINR: 59,
  },
  {
    id: PRODUCTS.PACK_GAMING,
    name: 'GAMING PACK',
    shortDescription: 'Permanent Drop Mode: Gaming.',
    kind: 'single',
    rarity: 'rare',
    grants: ['drop_mode_gaming'],
    includes: [],
    available: false, // Feature requires backend category endpoint
    basePriceINR: 59,
  },

  // ================= BUNDLES =================
  {
    id: PRODUCTS.BUNDLE_STARTER,
    name: 'STARTER PACK',
    shortDescription: 'NO ADS + BOARD BOSS',
    kind: 'bundle',
    rarity: 'epic',
    grants: ['ads_removed', 'unlimited_boards'],
    includes: [PRODUCTS.REMOVE_ADS, PRODUCTS.UNLIMITED_BOARDS],
    available: true,
    basePriceINR: 179,
  },
  {
    id: PRODUCTS.BUNDLE_STYLE,
    name: 'DRIP PACK',
    shortDescription: 'All 4 colour themes + ARCADE FX pack.',
    kind: 'bundle',
    rarity: 'epic',
    grants: [
      'theme_cyberpunk_cyan',
      'theme_acid_green',
      'theme_midnight_gold',
      'theme_blood_orange',
      'fx_arcade',
    ],
    includes: [
      PRODUCTS.THEME_CYBERPUNK,
      PRODUCTS.THEME_ACID,
      PRODUCTS.THEME_MIDNIGHT_GOLD,
      PRODUCTS.THEME_BLOOD_ORANGE,
      PRODUCTS.FX_ARCADE,
    ],
    available: true,
    basePriceINR: 149,
  },
  {
    id: PRODUCTS.BUNDLE_MEME_LOVERS,
    name: 'MEME HEAD PACK',
    shortDescription: 'All 4 curated meme packs.',
    kind: 'bundle',
    rarity: 'epic',
    grants: [
      'drop_mode_dark_humour',
      'drop_mode_wholesome',
      'drop_mode_desi',
      'drop_mode_gaming',
    ],
    includes: [
      PRODUCTS.PACK_DARK_HUMOUR,
      PRODUCTS.PACK_WHOLESOME,
      PRODUCTS.PACK_DESI,
      PRODUCTS.PACK_GAMING,
    ],
    available: false, // All components require backend category endpoint
    basePriceINR: 169,
  },
  {
    id: PRODUCTS.PRO_BUNDLE,
    name: 'COMBO PACK',
    shortDescription: 'REMOVE ADS + UNLIMITED MOOD BOARDS combo. Best value unlock.',
    kind: 'bundle',
    rarity: 'legendary',
    grants: [
      'ads_removed',
      'unlimited_boards',
      'theme_cyberpunk_cyan',
      'theme_acid_green',
      'theme_midnight_gold',
      'theme_blood_orange',
      'fx_arcade',
      'early_access',
    ],
    includes: [
      PRODUCTS.REMOVE_ADS,
      PRODUCTS.UNLIMITED_BOARDS,
    ],
    available: true,
    basePriceINR: 199,
  },
  {
    id: PRODUCTS.BUNDLE_ULTIMATE,
    name: 'CAPSULE MAX',
    shortDescription: 'Everything in the store. The ultimate unlock.',
    kind: 'bundle',
    rarity: 'legendary',
    grants: [
      'ads_removed',
      'unlimited_boards',
      'theme_cyberpunk_cyan',
      'theme_acid_green',
      'theme_midnight_gold',
      'theme_blood_orange',
      'fx_arcade',
      'drop_mode_dark_humour',
      'drop_mode_wholesome',
      'drop_mode_desi',
      'drop_mode_gaming',
      'early_access',
    ],
    includes: [
      PRODUCTS.REMOVE_ADS,
      PRODUCTS.UNLIMITED_BOARDS,
      PRODUCTS.FX_ARCADE,
      PRODUCTS.THEME_CYBERPUNK,
      PRODUCTS.THEME_ACID,
      PRODUCTS.THEME_MIDNIGHT_GOLD,
      PRODUCTS.THEME_BLOOD_ORANGE,
      PRODUCTS.PACK_DARK_HUMOUR,
      PRODUCTS.PACK_WHOLESOME,
      PRODUCTS.PACK_DESI,
      PRODUCTS.PACK_GAMING,
    ],
    available: false, // Contains components requiring backend category endpoint
    basePriceINR: 449,
  },
];

export const CATALOG_BY_ID: Record<ProductId, CatalogItem> = CATALOG.reduce(
  (acc, item) => {
    acc[item.id] = item;
    return acc;
  },
  {} as Record<ProductId, CatalogItem>
);

export function getCatalogItem(id: ProductId): CatalogItem | undefined {
  return CATALOG_BY_ID[id];
}

export function isItemAvailable(id: ProductId): boolean {
  const item = CATALOG_BY_ID[id];
  if (!item) return false;
  if (item.kind === 'single') return item.available;
  // Bundle is purchasable only if ALL of its components are available
  return item.available && item.includes.every((partId) => isItemAvailable(partId));
}

export function getBundleComponents(bundleId: ProductId): CatalogItem[] {
  const bundle = CATALOG_BY_ID[bundleId];
  if (!bundle || bundle.kind !== 'bundle') return [];
  return bundle.includes.map((id) => CATALOG_BY_ID[id]).filter(Boolean);
}
