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
  testPurchase,
  resetTestPurchases,
  grantAllTestPurchases,
  isProductPending,
} from '../../monetization/purchases';
import { RotateCcw, Sparkles, Shield, ChevronLeft, ChevronRight } from 'lucide-react';
import StoreItemCard from './StoreItemCard';
import BundleCard from './BundleCard';
import ThemeCard from './ThemeCard';
import PurchaseCelebration from './PurchaseCelebration';

interface StoreScreenProps {
  onClose: () => void;
  initialFocus?: ProductId | null;
}

type StoreCategory = 'featured' | 'bundles' | 'passes' | 'themes' | 'packs' | 'account';

const CATEGORIES: { id: StoreCategory; label: string; icon?: string }[] = [
  { id: 'featured', label: '★ FEATURED' },
  { id: 'bundles', label: 'BUNDLES' },
  { id: 'passes', label: 'PASSES' },
  { id: 'themes', label: 'THEMES' },
  { id: 'packs', label: 'PACKS' },
  { id: 'account', label: 'ACCOUNT' },
];

export default function StoreScreen({ onClose, initialFocus }: StoreScreenProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { products: liveProducts, loading: loadingCatalog, retry } = useCatalog();
  const { entitlements, busy: isBillingBusy } = useEntitlements();

  const [activeCategory, setActiveCategory] = useState<StoreCategory>('featured');
  const [celebratedItem, setCelebratedItem] = useState<string | null>(null);

  // Theme preview state
  const [previewThemeId, setPreviewThemeId] = useState<string | null>(null);
  const [previewSecondsLeft, setPreviewSecondsLeft] = useState<number>(8);

  // Test mode is enabled when live Google Play billing products are not returned or for offline QA
  const [isTestMode, setIsTestMode] = useState<boolean>(true);

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

  // Handle initial focus scroll
  useEffect(() => {
    if (initialFocus) {
      const timer = setTimeout(() => {
        const el = document.getElementById(`store-item-${initialFocus}`);
        if (el && scrollRef.current) {
          el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
          // Determine category
          if (initialFocus === PRODUCTS.BUNDLE_ULTIMATE) setActiveCategory('featured');
          else if (initialFocus.startsWith('bundle_') || initialFocus === PRODUCTS.PRO_BUNDLE) setActiveCategory('bundles');
          else if (initialFocus.startsWith('theme_')) setActiveCategory('themes');
          else if (initialFocus.startsWith('pack_')) setActiveCategory('packs');
          else setActiveCategory('passes');
        }
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [initialFocus]);

  // Synchronize category tabs on horizontal scroll
  const handleScroll = useCallback(() => {
    const container = scrollRef.current;
    if (!container) return;

    const sections: StoreCategory[] = ['featured', 'bundles', 'passes', 'themes', 'packs', 'account'];
    const containerLeft = container.getBoundingClientRect().left;

    let closestCat: StoreCategory = 'featured';
    let minDistance = Number.POSITIVE_INFINITY;

    for (const cat of sections) {
      const el = document.getElementById(`section-${cat}`);
      if (el) {
        const rect = el.getBoundingClientRect();
        const distance = Math.abs(rect.left - containerLeft);
        if (distance < minDistance) {
          minDistance = distance;
          closestCat = cat;
        }
      }
    }

    setActiveCategory(closestCat);
  }, []);

  const scrollToCategory = (cat: StoreCategory) => {
    setActiveCategory(cat);
    const el = document.getElementById(`section-${cat}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
    }
  };

  const scrollByAmount = (offset: number) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

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
    // If in test mode or billing is unavailable, execute simulated test unlock
    if (isTestMode) {
      const result = await testPurchase(item.id);
      if (result === 'purchased') {
        if (previewThemeId && item.grants.includes(previewThemeId as any)) {
          localStorage.setItem('meme_capsule_theme', previewThemeId);
          window.dispatchEvent(new Event('meme-capsule-theme-changed'));
          setPreviewThemeId(null);
        }
        setCelebratedItem(item.name);
      }
      return;
    }

    const result = await purchase(item.id);
    if (result === 'purchased') {
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
      className="fixed inset-0 z-[1050] bg-[#131313] text-white flex flex-col justify-between overflow-hidden select-none"
      style={{
        paddingTop: 'max(env(safe-area-inset-top), 16px)',
        paddingBottom: 'max(env(safe-area-inset-bottom), 16px)',
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      {/* 1. TOP HEADER & CLOSE BUTTON */}
      <div className="px-4 pb-2 shrink-0 border-b-[2px] border-outline/60">
        <div className="flex justify-between items-center gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-label-md text-[11px] text-secondary-container uppercase tracking-widest block">
                GAME STORE
              </span>
              <span className="font-label-md text-[10px] bg-[#9b30ff] text-white px-1.5 py-0.2 border border-black uppercase font-bold">
                ONE-TIME UNLOCKS
              </span>
            </div>
            <h2 className="font-headline-xl text-[32px] sm:text-[38px] text-white tracking-tighter uppercase leading-none skew-x-[-2deg]">
              CAPSULE STORE
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Close Store"
              className="w-11 h-11 bg-[#9b30ff] hover:bg-[#dd0061] text-white font-headline-xl text-[22px] border-[2px] border-black shadow-[3px_3px_0_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none flex items-center justify-center cursor-pointer transition-all"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Test Mode & QA Control Strip */}
        <div className="mt-2 pt-2 border-t border-outline/30 flex items-center justify-between gap-2 text-[11px] overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[#f4c300] font-bold">⚡ FREE TESTING:</span>
            <button
              type="button"
              onClick={() => setIsTestMode(!isTestMode)}
              className={`px-2 py-0.5 border text-[10px] font-bold uppercase transition-all ${
                isTestMode
                  ? 'bg-[#f4c300] text-black border-black shadow-[1px_1px_0_#000]'
                  : 'bg-neutral-800 text-neutral-400 border-neutral-600'
              }`}
            >
              {isTestMode ? 'TEST UNLOCKS ON' : 'PLAY BILLING MODE'}
            </button>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={resetTestPurchases}
              title="Reset all purchases back to free tier to test limits"
              className="px-2 py-0.5 bg-[#2a2a2a] hover:bg-[#dd0061] text-[#ffb4ab] border border-outline/50 uppercase font-bold active:scale-95"
            >
              RESET UNLOCKS (TEST FREE)
            </button>
            <button
              type="button"
              onClick={grantAllTestPurchases}
              title="Unlock everything instantly for testing"
              className="px-2 py-0.5 bg-[#152000] hover:bg-[#7abb00] text-[#ceff8c] border border-[#7abb00]/60 uppercase font-bold active:scale-95"
            >
              UNLOCK ALL (TEST)
            </button>
          </div>
        </div>
      </div>

      {/* 2. CLASH OF CLANS HORIZONTAL CATEGORY NAVIGATION TABS */}
      <nav
        aria-label="Store Categories"
        className="px-4 py-2 shrink-0 border-b-[2px] border-outline/50 bg-[#161616] flex items-center gap-1.5 overflow-x-auto scrollbar-none"
      >
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => scrollToCategory(cat.id)}
              className={`px-3 py-1.5 border-[2px] font-label-xl text-[12px] uppercase shrink-0 transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#f4c300] text-black border-black font-bold shadow-[2px_2px_0px_0px_#000]'
                  : 'bg-[#1c1b1b] text-neutral-400 border-[#4d4355] hover:text-white hover:border-neutral-400'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </nav>

      {/* 3. MAIN HORIZONTAL SCROLLING GAME SHOP ARENA */}
      <div className="relative flex-grow min-h-0 flex items-stretch">
        {/* Subtle Lateral Scroll Chevrons for Desktop / Wider screens */}
        <button
          type="button"
          onClick={() => scrollByAmount(-300)}
          className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 bg-black/80 text-white border border-outline items-center justify-center shadow-[2px_2px_0_#000] active:scale-90"
        >
          <ChevronLeft size={20} />
        </button>
        <button
          type="button"
          onClick={() => scrollByAmount(300)}
          className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 bg-black/80 text-white border border-outline items-center justify-center shadow-[2px_2px_0_#000] active:scale-90"
        >
          <ChevronRight size={20} />
        </button>

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="w-full h-full flex flex-row items-stretch gap-6 overflow-x-auto snap-x snap-mandatory scrollbar-none px-4 py-3"
        >
          {/* SECTION 1: ★ FEATURED (Hero Offer) */}
          <section id="section-featured" className="flex flex-col shrink-0">
            <div className="flex items-center gap-1.5 mb-2 px-1">
              <span className="font-headline-lg text-[16px] text-[#f4c300] uppercase tracking-wide">
                ★ FEATURED OFFER
              </span>
              <span className="font-label-md text-[10px] text-neutral-400 uppercase">
                (ULTIMATE PACK)
              </span>
            </div>
            <div className="flex-grow flex items-stretch">
              {heroItem && (
                <BundleCard
                  bundle={heroItem}
                  liveProducts={liveProducts}
                  loading={loadingCatalog}
                  isOwned={entitlements.ownedProducts.includes(heroItem.id)}
                  isPending={isProductPending(heroItem.id)}
                  isBusy={isBillingBusy}
                  isHero={true}
                  isTestMode={isTestMode}
                  ownsComponent={ownsComponent}
                  onPurchase={handlePurchase}
                />
              )}
            </div>
          </section>

          {/* SECTION 2: VALUE BUNDLES */}
          <section id="section-bundles" className="flex flex-col shrink-0">
            <div className="flex items-center gap-1.5 mb-2 px-1">
              <span className="font-headline-lg text-[16px] text-[#dd0061] uppercase tracking-wide">
                VALUE BUNDLES
              </span>
              <span className="font-label-md text-[10px] text-neutral-400 uppercase">
                (4 BUNDLES)
              </span>
            </div>
            <div className="flex-grow flex flex-row gap-4 items-stretch">
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
                    isTestMode={isTestMode}
                    ownsComponent={ownsComponent}
                    onPurchase={handlePurchase}
                  />
                );
              })}
            </div>
          </section>

          {/* SECTION 3: PERMANENT PASSES */}
          <section id="section-passes" className="flex flex-col shrink-0">
            <div className="flex items-center gap-1.5 mb-2 px-1">
              <span className="font-headline-lg text-[16px] text-[#9b30ff] uppercase tracking-wide">
                PERMANENT PASSES
              </span>
              <span className="font-label-md text-[10px] text-neutral-400 uppercase">
                (3 UNLOCKS)
              </span>
            </div>
            <div className="flex-grow flex flex-row gap-4 items-stretch">
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
                    isTestMode={isTestMode}
                    onPurchase={handlePurchase}
                  />
                );
              })}
            </div>
          </section>

          {/* SECTION 4: COLOUR THEMES */}
          <section id="section-themes" className="flex flex-col shrink-0">
            <div className="flex items-center gap-1.5 mb-2 px-1">
              <span className="font-headline-lg text-[16px] text-[#00e5ff] uppercase tracking-wide">
                COLOUR THEMES
              </span>
              <span className="font-label-md text-[10px] text-neutral-400 uppercase">
                (TAP PREVIEW)
              </span>
            </div>
            <div className="flex-grow flex flex-row gap-4 items-stretch">
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
                    isTestMode={isTestMode}
                    onPreview={handlePreviewTheme}
                    onPurchase={handlePurchase}
                  />
                );
              })}
            </div>
          </section>

          {/* SECTION 5: DROP MODE PACKS */}
          <section id="section-packs" className="flex flex-col shrink-0">
            <div className="flex items-center gap-1.5 mb-2 px-1">
              <span className="font-headline-lg text-[16px] text-[#7abb00] uppercase tracking-wide">
                DROP MODE PACKS
              </span>
              <span className="font-label-md text-[10px] text-neutral-400 uppercase">
                (NICHE FILTERS)
              </span>
            </div>
            <div className="flex-grow flex flex-row gap-4 items-stretch">
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
                    isTestMode={isTestMode}
                    onPurchase={handlePurchase}
                  />
                );
              })}
            </div>
          </section>

          {/* SECTION 6: GOOGLE PLAY ACCOUNT & QA CARD */}
          <section id="section-account" className="flex flex-col shrink-0">
            <div className="flex items-center gap-1.5 mb-2 px-1">
              <span className="font-headline-lg text-[16px] text-white uppercase tracking-wide">
                PLAY STORE & QA
              </span>
              <span className="font-label-md text-[10px] text-neutral-400 uppercase">
                ACCOUNT
              </span>
            </div>
            <article className="w-[280px] p-4 bg-[#1c1b1b] border-[3px] border-outline shadow-[4px_4px_0_#000] shrink-0 snap-start flex flex-col justify-between h-full select-none">
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Shield size={18} className="text-[#f4c300]" />
                  <span className="font-label-xl text-[13px] text-white uppercase font-bold">
                    ACCOUNT BINDING
                  </span>
                </div>

                <p className="font-sans text-[12px] text-neutral-300 leading-snug mb-3">
                  All one-time purchases are permanently bound to your Google Play account. No passwords, no logins, and zero recurring fees.
                </p>

                <div className="p-2.5 bg-black/40 border border-outline/40 mb-3 space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between text-neutral-400">
                    <span>OWNED UNLOCKS:</span>
                    <strong className="text-[#f4c300] font-mono">
                      {entitlements.ownedProducts.length}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between text-neutral-400">
                    <span>MOOD BOARDS:</span>
                    <strong className="text-white font-mono">
                      {entitlements.unlimitedBoards ? 'UNLIMITED' : 'FREE CAP (3)'}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between text-neutral-400">
                    <span>ADS STATUS:</span>
                    <strong className="text-white font-mono">
                      {entitlements.adsRemoved ? 'REMOVED' : 'ACTIVE'}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2 border-t border-outline/40">
                <button
                  type="button"
                  disabled={isBillingBusy}
                  onClick={() => void restorePurchases()}
                  className="w-full py-2.5 bg-surface-container-high hover:bg-primary text-white border-[2px] border-outline font-label-xl text-[13px] uppercase shadow-[2px_2px_0_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RotateCcw size={15} />
                  <span>{isBillingBusy ? 'CHECKING…' : 'RESTORE PURCHASES'}</span>
                </button>

                <button
                  type="button"
                  onClick={resetTestPurchases}
                  className="w-full py-2 bg-[#2a2a2a] hover:bg-[#dd0061] text-[#ffb4ab] border border-outline font-label-md text-[11px] uppercase transition-all"
                >
                  RESET UNLOCKS (TEST FREE TIER)
                </button>
              </div>
            </article>
          </section>
        </div>
      </div>

      {/* Floating Theme Preview Countdown Banner */}
      {previewThemeId && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[1150] w-[90%] max-w-[400px] bg-[#f4c300] text-black border-[3px] border-black shadow-[6px_6px_0px_0px_#000] p-3 flex items-center justify-between font-label-xl animate-in fade-in">
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
