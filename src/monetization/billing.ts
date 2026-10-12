import { Capacitor } from '@capacitor/core';
import { NativePurchases, PURCHASE_TYPE, type Product, type Transaction } from '@capgo/native-purchases';
import { PRODUCT_IDS, type ProductId } from './products';

// The native plugin shares/closes a BillingClient between methods. Serialize all
// operations, including catalog queries and foreground ownership reconciliation.
let queue: Promise<unknown> = Promise.resolve();

export function withBilling<T>(operation: () => Promise<T>): Promise<T> {
  const next = queue.catch(() => undefined).then(async () => {
    if (Capacitor.getPlatform() !== 'android') {
      throw new Error('Google Play requires Android');
    }
    const { isBillingSupported } = await NativePurchases.isBillingSupported();
    if (!isBillingSupported) {
      throw new Error('Google Play Billing unavailable');
    }
    return operation();
  });
  queue = next;
  return next;
}

export async function checkIsBillingAvailable(): Promise<boolean> {
  if (Capacitor.getPlatform() !== 'android') return false;
  try {
    const { isBillingSupported } = await NativePurchases.isBillingSupported();
    return Boolean(isBillingSupported);
  } catch {
    return false;
  }
}

export function queryOwnedPurchases(): Promise<Transaction[]> {
  return withBilling(async () => {
    const { purchases } = await NativePurchases.getPurchases({ productType: PURCHASE_TYPE.INAPP });
    // Recover completed-but-unacknowledged purchases, including delayed payments
    // completed while the app was stopped. Never acknowledge pending purchases.
    for (const purchase of purchases) {
      if (
        purchase.purchaseState === '1' &&
        purchase.isAcknowledged === false &&
        purchase.purchaseToken &&
        PRODUCT_IDS.some(id => id === purchase.productIdentifier)
      ) {
        try {
          await NativePurchases.acknowledgePurchase({ purchaseToken: purchase.purchaseToken });
        } catch (e) {
          console.warn('[Billing] Acknowledge error:', e);
        }
      }
    }
    return purchases;
  });
}

import { CATALOG } from './catalog';

export const FALLBACK_PRODUCTS: Product[] = CATALOG.map((item) => ({
  identifier: item.id,
  description: item.shortDescription,
  title: item.name,
  price: item.basePriceINR,
  priceString: `₹${item.basePriceINR}`,
  currencyCode: 'INR',
  currencySymbol: '₹',
  isFamilyShareable: false,
  subscriptionGroupIdentifier: '',
  subscriptionPeriod: null as any,
  introductoryPrice: null,
  discounts: [],
} as Product));

export async function queryProducts(): Promise<Product[]> {
  try {
    const live = await withBilling(async () => {
      const { products } = await NativePurchases.getProducts({
        productIdentifiers: PRODUCT_IDS,
        productType: PURCHASE_TYPE.INAPP,
      });
      return products;
    });
    if (live && live.length > 0) {
      return live;
    }
  } catch (err) {
    console.warn('[Billing] Query live products failed, using reference catalog prices:', err);
  }
  return FALLBACK_PRODUCTS;
}

export function buyProduct(product: Product): Promise<Transaction> {
  return withBilling(async () => {
    const transaction = await NativePurchases.purchaseProduct({
      productIdentifier: product.identifier as ProductId,
      productType: PURCHASE_TYPE.INAPP,
      offerToken: product.offerToken,
      quantity: 1,
      isConsumable: false,
      // We manually acknowledge immediately upon receipt or on resume
      autoAcknowledgePurchases: false,
    });

    if (
      transaction.purchaseState === '1' &&
      transaction.isAcknowledged !== true &&
      transaction.purchaseToken
    ) {
      try {
        await NativePurchases.acknowledgePurchase({ purchaseToken: transaction.purchaseToken });
      } catch (err) {
        console.warn('[Billing] Immediate acknowledge error:', err);
      }
    }
    return transaction;
  });
}
