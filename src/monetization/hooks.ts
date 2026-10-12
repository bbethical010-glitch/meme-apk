import { useEffect, useState } from 'react';
import type { Product } from '@capgo/native-purchases';
import { queryProducts } from './billing';
export { useEntitlements, EntitlementsProvider } from './entitlements';

// One batched native query shared by Store rows and contextual purchase controls.
let catalogRequest: Promise<Product[]> | undefined;
let catalog: Product[] | undefined;
let catalogAt = 0;

function loadCatalog(): Promise<Product[]> {
  if (catalog && Date.now() - catalogAt < 5 * 60 * 1000) return Promise.resolve(catalog);
  catalogRequest ??= queryProducts()
    .then(products => {
      catalog = products;
      catalogAt = Date.now();
      return products;
    })
    .finally(() => {
      catalogRequest = undefined;
    });
  return catalogRequest;
}

export function useCatalog() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [attempt, retry] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    loadCatalog()
      .then(result => {
        if (active) setProducts(result);
      })
      .catch(() => {
        if (active) setProducts([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  return {
    products,
    loading,
    retry: () => {
      catalogAt = 0;
      retry(value => value + 1);
    },
  };
}
