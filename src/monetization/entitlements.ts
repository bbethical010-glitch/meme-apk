import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { Capacitor } from '@capacitor/core';
import type { Transaction } from '@capgo/native-purchases';
import { queryOwnedPurchases } from './billing';
import { isProductId, PRODUCTS, type ProductId } from './products';
import { CATALOG, CATALOG_BY_ID, type EntitlementKey } from './catalog';
import { notifyMonetizationChanged, MONETIZATION_CHANGED } from './events';
import { isBillingBusy } from './purchases';

export interface Entitlements {
  grants: Set<EntitlementKey>;
  ownedProducts: ProductId[];
  allOwnedProductIds: ProductId[]; // Direct products + all included components from bundles
  adsRemoved: boolean;
  unlimitedBoards: boolean;
  boardLimit: number;
  ownedThemes: string[];
  ownedPacks: string[];
  ownedFx: string[];
  earlyAccess: boolean;
  // Legacy backward compatibility flag
  legacyCollectionAccess: boolean;
}

export const ENTITLEMENT_CACHE_KEY = 'meme_capsule_entitlements_v2';
export const ENTITLEMENT_TTL = 60 * 60 * 1000;
export const FREE_BOARD_LIMIT = 3;

/**
 * Maps every ProductId to its full set of entitlement keys.
 * Bundles grant their own keys PLUS the keys of all included items.
 */
export const PRODUCT_GRANTS_MAP: Record<ProductId, Set<EntitlementKey>> = (() => {
  const map = {} as Record<ProductId, Set<EntitlementKey>>;
  for (const item of CATALOG) {
    const keys = new Set<EntitlementKey>(item.grants);
    if (item.kind === 'bundle') {
      for (const componentId of item.includes) {
        const component = CATALOG_BY_ID[componentId];
        if (component) {
          for (const key of component.grants) {
            keys.add(key);
          }
        }
      }
    }
    map[item.id] = keys;
  }
  return map;
})();

/**
 * Computes the union of all entitlements granted by the given list of owned product IDs.
 */
export function entitlementsForProducts(ownedProducts: ProductId[]): Entitlements {
  const grants = new Set<EntitlementKey>();
  const allOwned = new Set<ProductId>();

  for (const productId of ownedProducts) {
    allOwned.add(productId);
    const item = CATALOG_BY_ID[productId];
    if (item && item.kind === 'bundle') {
      for (const includedId of item.includes) {
        allOwned.add(includedId);
      }
    }
    const itemGrants = PRODUCT_GRANTS_MAP[productId];
    if (itemGrants) {
      for (const g of itemGrants) {
        grants.add(g);
      }
    }
  }

  const adsRemoved = grants.has('ads_removed');
  const unlimitedBoards = grants.has('unlimited_boards');

  const themes: string[] = [];
  if (grants.has('theme_cyberpunk_cyan')) themes.push(PRODUCTS.THEME_CYBERPUNK);
  if (grants.has('theme_acid_green')) themes.push(PRODUCTS.THEME_ACID);
  if (grants.has('theme_midnight_gold')) themes.push(PRODUCTS.THEME_MIDNIGHT_GOLD);
  if (grants.has('theme_blood_orange')) themes.push(PRODUCTS.THEME_BLOOD_ORANGE);

  const packs: string[] = [];
  if (grants.has('drop_mode_dark_humour')) packs.push(PRODUCTS.PACK_DARK_HUMOUR);
  if (grants.has('drop_mode_wholesome')) packs.push(PRODUCTS.PACK_WHOLESOME);
  if (grants.has('drop_mode_desi')) packs.push(PRODUCTS.PACK_DESI);
  if (grants.has('drop_mode_gaming')) packs.push(PRODUCTS.PACK_GAMING);

  const fx: string[] = [];
  if (grants.has('fx_arcade')) {
    fx.push('retro_slam', 'neon_glitch', 'cassette_pop');
  }

  return {
    grants,
    ownedProducts: [...new Set(ownedProducts)],
    allOwnedProductIds: [...allOwned],
    adsRemoved,
    unlimitedBoards,
    boardLimit: unlimitedBoards ? Number.POSITIVE_INFINITY : FREE_BOARD_LIMIT,
    ownedThemes: themes,
    ownedPacks: packs,
    ownedFx: fx,
    earlyAccess: grants.has('early_access'),
    legacyCollectionAccess: adsRemoved,
  };
}

export function ownedProductIds(purchases: Transaction[]): ProductId[] {
  return purchases
    .filter(
      p =>
        p.purchaseState === '1' &&
        p.productType === 'inapp' &&
        !p.revocationDate &&
        isProductId(p.productIdentifier)
    )
    .map(p => p.productIdentifier as ProductId);
}

let checkedAt = 0;
let snapshot = entitlementsForProducts([]);
let hydrated = false;
let pending: Promise<Entitlements> | undefined;
let generation = 0;

export function getEntitlementsSnapshot(): Entitlements {
  if (!hydrated) {
    hydrated = true;
    try {
      const cached = JSON.parse(
        localStorage.getItem(ENTITLEMENT_CACHE_KEY) ||
        localStorage.getItem('meme_capsule_entitlements_v1') ||
        'null'
      );
      if (
        cached &&
        Array.isArray(cached.products) &&
        cached.products.every(isProductId) &&
        Number.isFinite(cached.checkedAt) &&
        cached.checkedAt <= Date.now()
      ) {
        snapshot = entitlementsForProducts(cached.products);
        checkedAt = cached.checkedAt;
      }
    } catch {
      /* A corrupt cache cannot grant ownership */
    }
  }
  return snapshot;
}

function reconcileEquippedCosmetics(entitlements: Entitlements) {
  // If a revoked theme is equipped, fall back to default classic
  const currentTheme = localStorage.getItem('meme_capsule_theme');
  if (currentTheme && currentTheme !== 'classic' && !entitlements.ownedThemes.includes(currentTheme)) {
    localStorage.setItem('meme_capsule_theme', 'classic');
    window.dispatchEvent(new Event('meme-capsule-theme-changed'));
  }

  // If a revoked FX is equipped, fall back to classic
  const currentFx = localStorage.getItem('meme_capsule_fx');
  if (currentFx && currentFx !== 'classic' && !entitlements.ownedFx.includes(currentFx)) {
    localStorage.setItem('meme_capsule_fx', 'classic');
    window.dispatchEvent(new Event('meme-capsule-fx-changed'));
  }
}

function publish(products: ProductId[]): Entitlements {
  snapshot = entitlementsForProducts(products);
  hydrated = true;
  checkedAt = Date.now();
  try {
    localStorage.setItem(ENTITLEMENT_CACHE_KEY, JSON.stringify({ products, checkedAt }));
  } catch {
    /* memory cache still works */
  }
  reconcileEquippedCosmetics(snapshot);
  notifyMonetizationChanged();
  return snapshot;
}

export function invalidateEntitlementCache(): void {
  generation++;
  checkedAt = 0;
  pending = undefined;
  try {
    localStorage.removeItem(ENTITLEMENT_CACHE_KEY);
  } catch {
    /* retain memory snapshot until reconciled */
  }
}

export async function getEntitlements(forceRefresh = false): Promise<Entitlements> {
  getEntitlementsSnapshot();
  if (Capacitor.getPlatform() !== 'android') {
    return snapshot;
  }
  if (!forceRefresh && checkedAt > 0 && Date.now() - checkedAt < ENTITLEMENT_TTL) {
    return snapshot;
  }
  if (pending) return pending;

  const revision = generation;
  const request = queryOwnedPurchases()
    .then(purchases => {
      if (revision !== generation) return snapshot;
      return publish(ownedProductIds(purchases));
    })
    .catch(err => {
      if (checkedAt > 0) {
        // Offline or Play billing unavailable: keep using last known entitlements
        console.warn('[Entitlements] Play query failed, using last known cache:', err);
        return snapshot;
      }
      throw err;
    });

  pending = request;
  try {
    return await request;
  } finally {
    if (pending === request) pending = undefined;
  }
}

export async function hasRemovedAds(): Promise<boolean> {
  return (await getEntitlements()).adsRemoved;
}

export function applyConfirmedPurchase(transaction: Transaction): boolean {
  const products = ownedProductIds([transaction]);
  if (!products.length) return false;
  invalidateEntitlementCache();
  publish([...new Set([...getEntitlementsSnapshot().ownedProducts, ...products])]);
  return true;
}

// ================= HELPER FUNCTIONS =================

/**
 * Checks if the user owns a product ID or entitlement key.
 * If user owns a bundle, all its component product IDs and grants return true.
 */
export function owns(id: string, ent: Entitlements = getEntitlementsSnapshot()): boolean {
  if (isProductId(id)) {
    return ent.allOwnedProductIds.includes(id);
  }
  return ent.grants.has(id as EntitlementKey);
}

export function ownsProduct(entitlements: Entitlements, productId: ProductId): boolean {
  return owns(productId, entitlements);
}

export function hasAdsRemoved(ent: Entitlements = getEntitlementsSnapshot()): boolean {
  return ent.adsRemoved;
}

export function boardLimit(ent: Entitlements = getEntitlementsSnapshot()): number {
  return ent.boardLimit;
}

export function ownedThemes(ent: Entitlements = getEntitlementsSnapshot()): string[] {
  return ent.ownedThemes;
}

export function ownedPacks(ent: Entitlements = getEntitlementsSnapshot()): string[] {
  return ent.ownedPacks;
}

export function ownedFx(ent: Entitlements = getEntitlementsSnapshot()): string[] {
  return ent.ownedFx;
}

// ================= REACT CONTEXT & HOOK =================

export interface EntitlementsContextValue {
  entitlements: Entitlements;
  busy: boolean;
  owns: (id: string) => boolean;
  hasAdsRemoved: () => boolean;
  boardLimit: () => number;
  ownedThemes: () => string[];
  ownedPacks: () => string[];
  ownedFx: () => string[];
  refresh: () => Promise<Entitlements>;
}

export const EntitlementsContext = createContext<EntitlementsContextValue | null>(null);

export function EntitlementsProvider({ children }: { children: React.ReactNode }) {
  const [current, setCurrent] = useState<Entitlements>(getEntitlementsSnapshot);
  const [busy, setBusy] = useState(isBillingBusy);

  useEffect(() => {
    const update = () => {
      setCurrent(getEntitlementsSnapshot());
      setBusy(isBillingBusy());
    };
    window.addEventListener(MONETIZATION_CHANGED, update);
    void getEntitlements().then(update).catch(() => undefined);
    return () => window.removeEventListener(MONETIZATION_CHANGED, update);
  }, []);

  const value = useMemo<EntitlementsContextValue>(
    () => ({
      entitlements: current,
      busy,
      owns: (id: string) => owns(id, current),
      hasAdsRemoved: () => current.adsRemoved,
      boardLimit: () => current.boardLimit,
      ownedThemes: () => current.ownedThemes,
      ownedPacks: () => current.ownedPacks,
      ownedFx: () => current.ownedFx,
      refresh: () => getEntitlements(true),
    }),
    [current, busy]
  );

  return React.createElement(EntitlementsContext.Provider, { value }, children);
}

export function useEntitlements(): EntitlementsContextValue {
  const context = useContext(EntitlementsContext);
  const [fallbackEntitlements, setFallbackEntitlements] = useState(getEntitlementsSnapshot);
  const [fallbackBusy, setFallbackBusy] = useState(isBillingBusy);

  useEffect(() => {
    if (context) return;
    const update = () => {
      setFallbackEntitlements(getEntitlementsSnapshot());
      setFallbackBusy(isBillingBusy());
    };
    window.addEventListener(MONETIZATION_CHANGED, update);
    void getEntitlements().then(update).catch(() => undefined);
    return () => window.removeEventListener(MONETIZATION_CHANGED, update);
  }, [context]);

  if (context) return context;

  // Fallback if component is rendered outside EntitlementsProvider
  return {
    entitlements: fallbackEntitlements,
    busy: fallbackBusy,
    owns: (id: string) => owns(id, fallbackEntitlements),
    hasAdsRemoved: () => fallbackEntitlements.adsRemoved,
    boardLimit: () => fallbackEntitlements.boardLimit,
    ownedThemes: () => fallbackThemesFallback(fallbackEntitlements),
    ownedPacks: () => fallbackEntitlements.ownedPacks,
    ownedFx: () => fallbackEntitlements.ownedFx,
    refresh: () => getEntitlements(true),
  };
}

function fallbackThemesFallback(ent: Entitlements): string[] {
  return ent.ownedThemes;
}
