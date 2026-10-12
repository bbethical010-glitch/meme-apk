import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  CATALOG_BY_ID,
  type CatalogItem,
} from '../../monetization/catalog';
import { PRODUCTS, type ProductId } from '../../monetization/products';
import { useCatalog, useEntitlements } from '../../monetization/hooks';
import {
  purchase,
  restorePurchases,
  isProductPending,
} from '../../monetization/purchases';
import { RotateCcw } from 'lucide-react';
import StoreItemCard from './StoreItemCard';
import BundleCard from './BundleCard';
import ThemeCard from './ThemeCard';
import PurchaseCelebration from './PurchaseCelebration';

interface StoreScreenProps {
  onClose: () => void;
  initialFocus?: ProductId | null;
}

export default function StoreScreen({ onClose, initialFocus }: StoreScreenProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const { products: liveProducts, loading: loadingCatalog, retry } = useCatalog();
  const { entitlements, busy: isBillingBusy } = useEntitlements();

  const [celebratedItem, setCelebratedItem] = useState<string | null>(null);

  // Theme preview state
  const [previewThemeId, setPreviewThemeId] = useState<string | null>(null);
  const [previewSecondsLeft, setPreviewSecondsLeft] = useState<number>(8);
  const originalThemeRef = useRef<string>(localStorage.getItem('meme_capsule_theme') || 'classic');

  // Handle hardware back button, Escape key, popstate
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopImmediatePropagation();
        onClose();
      }
    };

    const handlePopState = () => {
      onClose();
    };

    window.history.pushState({ memeCapsuleStore: true }, '');
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('popstate', handlePopState);
      previous?.focus();
    };
  }, [onClose]);

  // Handle scroll to initial focus
  useEffect(() => {
    if (initialFocus) {
      const timer = setTimeout(() => {
        const el = document.getElementById(`store-item-${initialFocus}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [initialFocus]);

  // Theme preview timer
  useEffect(() => {
    if (!previewThemeId) return;

    const appContainer = document.querySelector('.app-container');
    if (appContainer) {
      appContainer.setAttribute('data-theme', previewThemeId);
    }

    const interval = setInterval(() => {
      setPreviewSecondsLeft((prev) => {
        if (prev <= 1) {
          // Time expired -> revert
          revertPreview();
          return 8;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [previewThemeId]);

  const revertPreview = useCallback(() => {
    setPreviewThemeId(null);
    setPreviewSecondsLeft(8);
    const saved = localStorage.getItem('meme_capsule_theme') || 'classic';
    const appContainer = document.querySelector('.app-container');
    if (appContainer) {
      appContainer.setAttribute('data-theme', saved);
    }
    window.dispatchEvent(new Event('meme-capsule-theme-changed'));
  }, []);

  // Cleanup preview on unmount
  useEffect(() => {
    return () => {
      const saved = localStorage.getItem('meme_capsule_theme') || 'classic';
      const appContainer = document.querySelector('.app-container');
      if (appContainer) {
        appContainer.setAttribute('data-theme', saved);
      }
    };
  }, []);

  const handlePreviewTheme = (themeId: string) => {
    if (previewThemeId === themeId) {
      revertPreview();
      return;
    }
    setPreviewThemeId(themeId);
    setPreviewSecondsLeft(8);
  };

  const handlePurchase = async (item: CatalogItem) => {
    const result = await purchase(item.id);
    if (result === 'purchased') {
      // If user bought while previewing, persist theme permanently
      if (previewThemeId && item.grants.includes(previewThemeId as any)) {
        localStorage.setItem('meme_capsule_theme', previewThemeId);
        window.dispatchEvent(new Event('meme-capsule-theme-changed'));
        setPreviewThemeId(null);
      }
      setCelebratedItem(item.name);
    }
  };

  const ownsComponent = useCallback(
    (id: string) => {
      return entitlements.allOwnedProductIds.includes(id as ProductId);
    },
    [entitlements.allOwnedProductIds]
  );

  // Grouped catalog items
  const heroItem = CATALOG_BY_ID[PRODUCTS.BUNDLE_ULTIMATE];
  const bundleItems = [
    CATALOG_BY_ID[PRODUCTS.BUNDLE_STARTER],
    CATALOG_BY_ID[PRODUCTS.BUNDLE_STYLE],
    CATALOG_BY_ID[PRODUCTS.BUNDLE_MEME_LOVERS],
    CATALOG_BY_ID[PRODUCTS.PRO_BUNDLE],
  ];
  const unlockItems = [
    CATALOG_BY_ID[PRODUCTS.REMOVE_ADS],
    CATALOG_BY_ID[PRODUCTS.UNLIMITED_BOARDS],
    CATALOG_BY_ID[PRODUCTS.FX_ARCADE],
  ];
  const themeItems = [
    CATALOG_BY_ID[PRODUCTS.THEME_CYBERPUNK],
    CATALOG_BY_ID[PRODUCTS.THEME_ACID],
    CATALOG_BY_ID[PRODUCTS.THEME_MIDNIGHT_GOLD],
    CATALOG_BY_ID[PRODUCTS.THEME_BLOOD_ORANGE],
  ];
  const memePackItems = [
    CATALOG_BY_ID[PRODUCTS.PACK_DARK_HUMOUR],
    CATALOG_BY_ID[PRODUCTS.PACK_WHOLESOME],
    CATALOG_BY_ID[PRODUCTS.PACK_DESI],
    CATALOG_BY_ID[PRODUCTS.PACK_GAMING],
  ];

  return (
    <section
      aria-label="Capsule Store"
      className="fixed inset-0 z-[1050] bg-[#131313] text-white overflow-y-auto px-4 py-5 select-none"
      style={{
        paddingTop: 'max(env(safe-area-inset-top), 20px)',
        paddingBottom: 'max(env(safe-area-inset-bottom), 24px)',
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <div className="max-w-[640px] mx-auto pb-10">
        {/* Header */}
        <header className="flex justify-between items-center gap-3 mb-6 pb-4 border-b-[3px] border-outline">
          <div>
            <span className="font-label-md text-[12px] text-secondary-container uppercase tracking-widest block">
              PERMANENT ONE-TIME UNLOCKS
            </span>
            <h2 className="font-headline-xl text-[36px] sm:text-[44px] text-white tracking-tighter uppercase leading-none skew-x-[-2deg]">
              CAPSULE STORE
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close Store"
            className="w-12 h-12 bg-[#9b30ff] hover:bg-[#dd0061] text-white font-headline-xl text-[24px] border-[2px] border-black shadow-[3px_3px_0_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none flex items-center justify-center cursor-pointer transition-all"
          >
            ✕
          </button>
        </header>

        {/* 1. HERO SECTION: CAPSULE MAX */}
        <div className="mb-8">
          <span className="font-label-xl text-[13px] text-[#f4c300] uppercase tracking-wider block mb-2">
            ★ FEATURED COLLECTOR PACK
          </span>
          {heroItem && (
            <BundleCard
              bundle={heroItem}
              liveProducts={liveProducts}
              loading={loadingCatalog}
              isOwned={entitlements.ownedProducts.includes(heroItem.id)}
              isPending={isProductPending(heroItem.id)}
              isBusy={isBillingBusy}
              isHero={true}
              ownsComponent={ownsComponent}
              onPurchase={handlePurchase}
            />
          )}
        </div>

        {/* 2. BUNDLES SECTION */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3 border-b-2 border-outline/50 pb-1">
            <span className="font-headline-lg text-[22px] text-white uppercase tracking-wide">
              VALUE BUNDLES
            </span>
            <span className="font-label-md text-[11px] text-neutral-400 uppercase">
              BIGGER DISCOUNTS
            </span>
          </div>
          <div className="flex flex-col gap-4">
            {bundleItems.map((bundle) => {
              if (!bundle) return null;
              return (
                <BundleCard
                  key={bundle.id}
                  bundle={bundle}
                  liveProducts={liveProducts}
                  loading={loadingCatalog}
                  isOwned={entitlements.ownedProducts.includes(bundle.id)}
                  isPending={isProductPending(bundle.id)}
                  isBusy={isBillingBusy}
                  ownsComponent={ownsComponent}
                  onPurchase={handlePurchase}
                />
              );
            })}
          </div>
        </div>

        {/* 3. UNLOCKS SECTION */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3 border-b-2 border-outline/50 pb-1">
            <span className="font-headline-lg text-[22px] text-white uppercase tracking-wide">
              PERMANENT UNLOCKS
            </span>
            <span className="font-label-md text-[11px] text-neutral-400 uppercase">
              SINGLE PASSES
            </span>
          </div>
          <div className="flex flex-col gap-3.5">
            {unlockItems.map((item) => {
              if (!item) return null;
              return (
                <StoreItemCard
                  key={item.id}
                  item={item}
                  liveProduct={liveProducts.find((p) => p.identifier === item.id)}
                  loading={loadingCatalog}
                  isOwned={ownsComponent(item.id)}
                  isPending={isProductPending(item.id)}
                  isBusy={isBillingBusy}
                  onPurchase={handlePurchase}
                />
              );
            })}
          </div>
        </div>

        {/* 4. THEMES SECTION */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3 border-b-2 border-outline/50 pb-1">
            <span className="font-headline-lg text-[22px] text-white uppercase tracking-wide">
              COLOUR THEMES
            </span>
            <span className="font-label-md text-[11px] text-neutral-400 uppercase">
              TAP PREVIEW TO TEST
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {themeItems.map((item) => {
              if (!item) return null;
              return (
                <ThemeCard
                  key={item.id}
                  item={item}
                  liveProduct={liveProducts.find((p) => p.identifier === item.id)}
                  loading={loadingCatalog}
                  isOwned={ownsComponent(item.id)}
                  isPending={isProductPending(item.id)}
                  isBusy={isBillingBusy}
                  isPreviewing={previewThemeId === item.id}
                  onPreview={handlePreviewTheme}
                  onPurchase={handlePurchase}
                />
              );
            })}
          </div>
        </div>

        {/* 5. MEME PACKS SECTION */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3 border-b-2 border-outline/50 pb-1">
            <span className="font-headline-lg text-[22px] text-white uppercase tracking-wide">
              DROP MODE PACKS
            </span>
            <span className="font-label-md text-[11px] text-neutral-400 uppercase">
              NICHE CURATIONS
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {memePackItems.map((item) => {
              if (!item) return null;
              return (
                <StoreItemCard
                  key={item.id}
                  item={item}
                  liveProduct={liveProducts.find((p) => p.identifier === item.id)}
                  loading={loadingCatalog}
                  isOwned={ownsComponent(item.id)}
                  isPending={isProductPending(item.id)}
                  isBusy={isBillingBusy}
                  onPurchase={handlePurchase}
                />
              );
            })}
          </div>
        </div>

        {/* 6. FOOTER & RESTORE */}
        <footer className="mt-10 pt-5 border-t-[3px] border-outline flex flex-col gap-4 text-center">
          <button
            type="button"
            disabled={isBillingBusy}
            onClick={() => void restorePurchases()}
            className="w-full py-3 bg-surface-container-high hover:bg-primary text-white border-[2px] border-outline font-label-xl text-[14px] uppercase shadow-[3px_3px_0_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <RotateCcw size={16} />
            <span>{isBillingBusy ? 'CHECKING ACCOUNT…' : 'RESTORE PURCHASES'}</span>
          </button>

          <p className="font-sans text-[12px] text-neutral-400 leading-snug max-w-[480px] mx-auto">
            Purchases are bound to your Google Play account. No accounts, no logins, no subscriptions, and no recurring fees. Restore anytime on any Android device using your Google account.
          </p>

          {!loadingCatalog && liveProducts.length === 0 && (
            <div className="p-3 bg-[#261f18] border-2 border-[#f4c300] text-[#ffe08b] font-label-md text-[12px]">
              Google Play services could not be reached. Prices will appear once a connection is established.
              <button onClick={retry} className="block mx-auto mt-1.5 underline cursor-pointer text-white">
                RETRY CONNECTION
              </button>
            </div>
          )}
        </footer>
      </div>

      {/* Floating Theme Preview Countdown Banner */}
      {previewThemeId && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[1150] w-[90%] max-w-[400px] bg-[#f4c300] text-black border-[3px] border-black shadow-[6px_6px_0px_0px_#000] p-3 flex items-center justify-between font-label-xl">
          <div className="flex flex-col">
            <span className="text-[11px] text-black/70 leading-none">PREVIEW ACTIVE</span>
            <span className="text-[15px] font-bold leading-tight">
              {CATALOG_BY_ID[previewThemeId as ProductId]?.name || 'THEME'} — {previewSecondsLeft}S
            </span>
          </div>
          <button
            type="button"
            onClick={revertPreview}
            className="bg-black text-white px-3 py-1 text-[12px] uppercase border border-black active:scale-95 cursor-pointer font-bold"
          >
            REVERT
          </button>
        </div>
      )}

      {/* Purchase Success Celebration Modal */}
      {celebratedItem && (
        <PurchaseCelebration
          itemName={celebratedItem}
          onDismiss={() => setCelebratedItem(null)}
        />
      )}
    </section>
  );
}
