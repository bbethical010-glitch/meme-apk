import { buyProduct, queryProducts, queryOwnedPurchases } from './billing';
import {
  applyConfirmedPurchase,
  getEntitlements,
  invalidateEntitlementCache,
  ownsProduct,
  getEntitlementsSnapshot,
  grantProductDirectly,
  resetAllEntitlements,
  grantAllProductsDirectly,
} from './entitlements';
import { monetizationToast, notifyMonetizationChanged } from './events';
import type { ProductId } from './products';
import { CATALOG_BY_ID } from './catalog';
import type { Product } from '@capgo/native-purchases';

export type PurchaseResult = 'purchased' | 'cancelled' | 'pending' | 'failed' | 'already_owned';

let busy = false;
export function isBillingBusy(): boolean {
  return busy;
}

// Track pending payment products (e.g. UPI/cash flow where user must authorize later)
const PENDING_STORAGE_KEY = 'meme_capsule_pending_purchases';
let pendingProducts: Set<ProductId> = new Set();

try {
  const savedPending = JSON.parse(localStorage.getItem(PENDING_STORAGE_KEY) || '[]');
  if (Array.isArray(savedPending)) {
    pendingProducts = new Set(savedPending as ProductId[]);
  }
} catch {
  // Ignore corrupted storage
}

function persistPending() {
  try {
    localStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify([...pendingProducts]));
  } catch {
    // Memory remains valid
  }
  notifyMonetizationChanged();
}

export function isProductPending(productId: ProductId): boolean {
  return pendingProducts.has(productId);
}

export function getPendingProducts(): ProductId[] {
  return [...pendingProducts];
}

/**
 * Reconciles pending transactions whenever app returns to foreground.
 */
export async function reconcilePendingPurchases(): Promise<void> {
  if (pendingProducts.size === 0) return;
  try {
    const purchases = await queryOwnedPurchases();
    let changed = false;

    for (const purchase of purchases) {
      const pid = purchase.productIdentifier as ProductId;
      if (pendingProducts.has(pid)) {
        if (purchase.purchaseState === '1') {
          // Payment has cleared!
          pendingProducts.delete(pid);
          applyConfirmedPurchase(purchase);
          changed = true;
          monetizationToast('PAYMENT CONFIRMED! ITEM UNLOCKED');
        }
      }
    }

    if (changed) {
      persistPending();
      await getEntitlements(true);
    }
  } catch {
    // If reconciliation fails, keep pending state intact until next opportunity
  }
}

// Hook into window visibility change for auto-checking pending purchases on app resume
if (typeof window !== 'undefined') {
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      void reconcilePendingPurchases();
    }
  });
  window.addEventListener('focus', () => {
    void reconcilePendingPurchases();
  });
}

export async function purchase(productId: ProductId): Promise<PurchaseResult> {
  if (busy) return 'failed';
  busy = true;
  notifyMonetizationChanged();

  try {
    const current = await getEntitlements(false);
    if (ownsProduct(current, productId)) {
      return 'already_owned';
    }

    const availableProducts = await queryProducts();
    const product = availableProducts.find(item => item.identifier === productId);
    if (!product) {
      return 'failed';
    }

    const transaction = await buyProduct(product);

    // State "1" = PURCHASED
    if (transaction.purchaseState === '1') {
      pendingProducts.delete(productId);
      persistPending();
      applyConfirmedPurchase(transaction);
      await getEntitlements(true).catch(() => undefined);
      return 'purchased';
    }

    // State "0" or "2" = PENDING (e.g. UPI/cash methods)
    if (transaction.purchaseState === '0' || transaction.purchaseState === '2') {
      pendingProducts.add(productId);
      persistPending();
      return 'pending';
    }

    return 'failed';
  } catch (error) {
    const message = error instanceof Error ? error.message : String((error as { message?: string })?.message || '');
    const code = String((error as { code?: string })?.code || '');
    const errorStr = `${code} ${message}`.toLowerCase();

    // User cancelled purchase flow: silent exit with no error toast
    if (
      errorStr.includes('user_canceled') ||
      errorStr.includes('user_cancelled') ||
      errorStr.includes('user cancelled') ||
      errorStr.includes('canceled') ||
      errorStr.includes('cancelled') ||
      errorStr.includes('responsecode: 1')
    ) {
      return 'cancelled';
    }

    // Item already owned on Google Play account
    if (errorStr.includes('already_owned') || errorStr.includes('item_already_owned')) {
      invalidateEntitlementCache();
      const reconciled = await getEntitlements(true).catch(() => getEntitlementsSnapshot());
      if (ownsProduct(reconciled, productId)) {
        return 'already_owned';
      }
    }

    return 'failed';
  } finally {
    busy = false;
    notifyMonetizationChanged();
  }
}

export async function purchaseProduct(productId: ProductId): Promise<boolean> {
  const result = await purchase(productId);
  return result === 'purchased' || result === 'already_owned';
}

/**
 * Executes a simulated test purchase without Google Play Billing.
 * Instantly grants entitlements and triggers celebration.
 */
export async function testPurchase(productId: ProductId): Promise<PurchaseResult> {
  pendingProducts.delete(productId);
  persistPending();
  grantProductDirectly(productId);
  monetizationToast('TEST UNLOCK SUCCESSFUL! ITEM READY');
  notifyMonetizationChanged();
  return 'purchased';
}

/**
 * Resets all purchases back to 0.
 * Reverts the app to the 100% free-tier state to test free limits.
 */
export function resetTestPurchases(): void {
  pendingProducts.clear();
  persistPending();
  resetAllEntitlements();
  monetizationToast('ALL UNLOCKS RESET (FREE TIER ACTIVE)');
  notifyMonetizationChanged();
}

/**
 * Unlocks all catalog products in test mode.
 */
export function grantAllTestPurchases(): void {
  pendingProducts.clear();
  persistPending();
  grantAllProductsDirectly();
  monetizationToast('ALL STORE ITEMS UNLOCKED (TEST MODE)');
  notifyMonetizationChanged();
}

export async function restorePurchases(): Promise<void> {
  if (busy) return;
  busy = true;
  notifyMonetizationChanged();

  try {
    invalidateEntitlementCache();
    const entitlements = await getEntitlements(true);
    if (entitlements.ownedProducts.length > 0) {
      monetizationToast('PURCHASES RESTORED');
    } else {
      monetizationToast('NOTHING TO RESTORE');
    }
  } catch {
    monetizationToast('STORE UNAVAILABLE. PLEASE TRY AGAIN LATER.');
  } finally {
    busy = false;
    notifyMonetizationChanged();
  }
}

/**
 * Computes savings percentage from live Play Store prices:
 * savings % = 1 - (bundlePrice / sum(componentPrices))
 * If any component price is missing or <= 0, returns null.
 */
export function calculateSavings(bundleId: ProductId, liveProducts: Product[]): number | null {
  const bundleItem = CATALOG_BY_ID[bundleId];
  if (!bundleItem || bundleItem.kind !== 'bundle' || bundleItem.includes.length === 0) {
    return null;
  }

  const bundleProduct = liveProducts.find(p => p.identifier === bundleId);
  if (!bundleProduct || !bundleProduct.price || bundleProduct.price <= 0) {
    return null;
  }

  let componentSum = 0;
  for (const componentId of bundleItem.includes) {
    const compProduct = liveProducts.find(p => p.identifier === componentId);
    if (!compProduct || !compProduct.price || compProduct.price <= 0) {
      // Missing a component price -> hide savings badge
      return null;
    }
    componentSum += compProduct.price;
  }

  if (componentSum <= bundleProduct.price) {
    return null;
  }

  const savingsRatio = 1 - bundleProduct.price / componentSum;
  const savingsPct = Math.round(savingsRatio * 100);
  return savingsPct > 0 ? savingsPct : null;
}
