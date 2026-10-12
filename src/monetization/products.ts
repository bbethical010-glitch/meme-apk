// PREREQUISITE: create and activate these exact one-time product IDs in
// Google Play Console → Monetize → Products → In-app products before querying.

export const PRODUCTS = {
  // Single unlocks
  REMOVE_ADS: 'remove_ads_forever',
  UNLIMITED_BOARDS: 'unlimited_mood_boards',
  FX_ARCADE: 'fx_arcade_pack',
  THEME_CYBERPUNK: 'theme_cyberpunk_cyan',
  THEME_ACID: 'theme_acid_green',
  THEME_MIDNIGHT_GOLD: 'theme_midnight_gold',
  THEME_BLOOD_ORANGE: 'theme_blood_orange',
  PACK_DARK_HUMOUR: 'pack_dark_humour',
  PACK_WHOLESOME: 'pack_wholesome',
  PACK_DESI: 'pack_desi',
  PACK_GAMING: 'pack_gaming',

  // Bundles
  BUNDLE_STARTER: 'bundle_starter',
  BUNDLE_STYLE: 'bundle_style',
  BUNDLE_MEME_LOVERS: 'bundle_meme_lovers',
  PRO_BUNDLE: 'meme_capsule_pro',
  BUNDLE_ULTIMATE: 'bundle_ultimate',
} as const;

export type ProductId = typeof PRODUCTS[keyof typeof PRODUCTS];
export const PRODUCT_IDS = Object.values(PRODUCTS) as ProductId[];

export const PRODUCT_DETAILS: Record<ProductId, { name: string; benefit: string }> = {
  [PRODUCTS.REMOVE_ADS]: {
    name: 'NO ADS',
    benefit: 'Removes banner and interstitial ads permanently; rewarded ads stay optional.',
  },
  [PRODUCTS.UNLIMITED_BOARDS]: {
    name: 'BOARD BOSS',
    benefit: 'Removes the free Mood Board cap completely.',
  },
  [PRODUCTS.FX_ARCADE]: {
    name: 'ARCADE FX',
    benefit: '3 extra arcade card entry/recoil animation styles.',
  },
  [PRODUCTS.THEME_CYBERPUNK]: {
    name: 'CYBER CYAN',
    benefit: 'High-tech cyberpunk electric cyan theme.',
  },
  [PRODUCTS.THEME_ACID]: {
    name: 'ACID GREEN',
    benefit: 'Toxic high-voltage neon green theme.',
  },
  [PRODUCTS.THEME_MIDNIGHT_GOLD]: {
    name: 'MIDNIGHT GOLD',
    benefit: 'Deep dark obsidian and royal gold luxury theme.',
  },
  [PRODUCTS.THEME_BLOOD_ORANGE]: {
    name: 'BLOOD ORANGE',
    benefit: 'Searing neon orange and blood red neo-brutalist theme.',
  },
  [PRODUCTS.PACK_DARK_HUMOUR]: {
    name: 'DARK HUMOUR PACK',
    benefit: 'Permanent Drop Mode: Dark Humour.',
  },
  [PRODUCTS.PACK_WHOLESOME]: {
    name: 'WHOLESOME PACK',
    benefit: 'Permanent Drop Mode: Wholesome.',
  },
  [PRODUCTS.PACK_DESI]: {
    name: 'DESI MEMES PACK',
    benefit: 'Permanent Drop Mode: Desi.',
  },
  [PRODUCTS.PACK_GAMING]: {
    name: 'GAMING PACK',
    benefit: 'Permanent Drop Mode: Gaming.',
  },
  [PRODUCTS.BUNDLE_STARTER]: {
    name: 'STARTER PACK',
    benefit: 'NO ADS + BOARD BOSS bundle.',
  },
  [PRODUCTS.BUNDLE_STYLE]: {
    name: 'DRIP PACK',
    benefit: 'All 4 colour themes + ARCADE FX pack.',
  },
  [PRODUCTS.BUNDLE_MEME_LOVERS]: {
    name: 'MEME HEAD PACK',
    benefit: 'All 4 curated meme packs.',
  },
  [PRODUCTS.PRO_BUNDLE]: {
    name: 'CAPSULE PRO',
    benefit: 'Everything in Starter + Drip (NO ADS, BOARD BOSS, 4 themes, ARCADE FX).',
  },
  [PRODUCTS.BUNDLE_ULTIMATE]: {
    name: 'CAPSULE MAX',
    benefit: 'Everything in the store. The ultimate collector unlock.',
  },
};

export function isProductId(value: string): value is ProductId {
  return PRODUCT_IDS.some(id => id === value);
}
