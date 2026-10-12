import { ownsProduct } from '../monetization/entitlements';
import { useCatalog, useEntitlements } from '../monetization/hooks';
import { purchaseProduct, isProductPending } from '../monetization/purchases';
import type { ProductId } from '../monetization/products';
import { monetizationToast } from '../monetization/events';

export default function ProductPurchase({
  productId,
  onPurchased,
}: {
  productId: ProductId;
  onPurchased?: () => void;
}) {
  const { products, loading, retry } = useCatalog();
  const { entitlements, busy } = useEntitlements();
  const product = products.find(item => item.identifier === productId);

  if (ownsProduct(entitlements, productId)) {
    return <span className="text-[#f4c300] font-label-xl">OWNED ✓</span>;
  }

  if (isProductPending(productId)) {
    return <span className="text-secondary-container font-label-xl">PAYMENT PENDING</span>;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 font-label-md">
      <span>{loading ? 'LOADING…' : product?.priceString || 'UNAVAILABLE'}</span>
      <button
        type="button"
        disabled={busy || loading || !product}
        onClick={async () => {
          const ok = await purchaseProduct(productId);
          if (ok) {
            monetizationToast('PURCHASE UNLOCKED ✓');
            onPurchased?.();
          }
        }}
        className="bg-[#f4c300] text-black px-4 py-2 border-2 border-black shadow-[3px_3px_0_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-40 cursor-pointer"
      >
        {busy ? 'PLEASE WAIT…' : 'GET'}
      </button>
      {!loading && !product && (
        <button type="button" onClick={retry} className="underline text-xs cursor-pointer">
          RETRY PLAY STORE
        </button>
      )}
    </div>
  );
}
