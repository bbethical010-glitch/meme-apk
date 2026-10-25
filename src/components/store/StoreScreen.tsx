import React, { useEffect, useRef, useState, useCallback } from 'react';
import { CATALOG_BY_ID, type CatalogItem } from '../../monetization/catalog';
import { PRODUCTS, type ProductId } from '../../monetization/products';
import { useCatalog, useEntitlements } from '../../monetization/hooks';
import {
  purchase,
  restorePurchases,
  isProductPending,
} from '../../monetization/purchases';
import { RotateCcw, Shield, Check, Zap, Ban, Sparkles } from 'lucide-react';
import PurchaseCelebration from './PurchaseCelebration';

interface StoreScreenProps {
  onClose: () => void;
  initialFocus?: ProductId | null;
}

export default function StoreScreen({ onClose, initialFocus }: StoreScreenProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  useCatalog();
  const { entitlements, busy: isBillingBusy } = useEntitlements();

  const [celebratedItem, setCelebratedItem] = useState<string | null>(null);

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
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [initialFocus]);

  const handlePurchase = async (item: CatalogItem) => {
    const result = await purchase(item.id);
    if (result === 'purchased') {
      setCelebratedItem(item.name);
    }
  };

  const ownsComponent = useCallback(
    (id: string) => {
      return entitlements.allOwnedProductIds.includes(id as ProductId);
    },
    [entitlements.allOwnedProductIds]
  );

  // The 3 exact packs: Combo Pack, Remove Ads, Unlimited Mood Boards
  const comboItem = CATALOG_BY_ID[PRODUCTS.PRO_BUNDLE];
  const removeAdsItem = CATALOG_BY_ID[PRODUCTS.REMOVE_ADS];
  const boardsItem = CATALOG_BY_ID[PRODUCTS.UNLIMITED_BOARDS];

  const ownsCombo = entitlements.ownedProducts.includes(PRODUCTS.PRO_BUNDLE) ||
    (ownsComponent(PRODUCTS.REMOVE_ADS) && ownsComponent(PRODUCTS.UNLIMITED_BOARDS));
  const ownsAds = ownsComponent(PRODUCTS.REMOVE_ADS);
  const ownsBoards = ownsComponent(PRODUCTS.UNLIMITED_BOARDS);

  const isComboPending = isProductPending(PRODUCTS.PRO_BUNDLE);
  const isAdsPending = isProductPending(PRODUCTS.REMOVE_ADS);
  const isBoardsPending = isProductPending(PRODUCTS.UNLIMITED_BOARDS);

  // Authoritative prices from catalog (₹199 Remove Ads, ₹49 Unlimited Boards, ₹199 Combo Pack)
  const comboPrice = `₹${comboItem?.basePriceINR || 199}`;
  const adsPrice = `₹${removeAdsItem?.basePriceINR || 199}`;
  const boardsPrice = `₹${boardsItem?.basePriceINR || 49}`;

  return (
    <section
      aria-label="Capsule Store"
      className="fixed inset-0 z-[1050] bg-[#131313] text-white flex flex-col justify-between overflow-hidden select-none"
      style={{
        paddingTop: 'max(env(safe-area-inset-top), 12px)',
        paddingBottom: 'max(env(safe-area-inset-bottom), 12px)',
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      {/* 1. TOP HEADER & CLOSE BUTTON */}
      <div className="px-4 pb-2 shrink-0 border-b-[2px] border-outline/60">
        <div className="flex justify-between items-center gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-label-md text-[11px] text-[#f4c300] uppercase tracking-widest block font-bold">
                GAME STORE
              </span>
              <span className="font-label-md text-[10px] bg-[#9b30ff] text-white px-1.5 py-0.2 border border-black uppercase font-bold">
                ONE-TIME UNLOCKS
              </span>
            </div>
            <h2 className="font-headline-xl text-[30px] sm:text-[36px] text-white tracking-tighter uppercase leading-none skew-x-[-2deg]">
              CAPSULE STORE
            </h2>
          </div>

          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close Store"
            className="w-10 h-10 bg-[#9b30ff] hover:bg-[#dd0061] text-white font-headline-xl text-[20px] border-[2px] border-black shadow-[3px_3px_0_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none flex items-center justify-center cursor-pointer transition-all"
          >
            ✕
          </button>
        </div>
      </div>

      {/* 2. MAIN STORE ARENA - 3 COMPACT PACKS COVERING SCREEN PROPERLY */}
      <div
        ref={scrollRef}
        className="flex-grow min-h-0 overflow-y-auto px-4 py-3 space-y-3 scrollbar-none"
      >
        {/* PACK 1: COMBO PACK (BEST VALUE HERO OFFER) */}
        {comboItem && (
          <article
            id={`store-item-${comboItem.id}`}
            className={`relative w-full p-3.5 sm:p-4 bg-gradient-to-br from-[#241d08] via-[#1c1b1b] to-[#141414] border-[3px] border-[#f4c300] shadow-[4px_4px_0px_0px_#000] select-none transition-all ${
              ownsCombo ? 'border-outline/60 opacity-90' : ''
            }`}
          >
            {/* Top Row: Badges & Savings */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-1.5">
                <span className="font-label-xl text-[10px] uppercase px-2 py-0.5 bg-[#f4c300] text-black font-extrabold border border-black shadow-[1px_1px_0_#000]">
                  ★ BEST VALUE
                </span>
                <span className="font-label-md text-[10px] uppercase border border-[#f4c300] text-[#f4c300] px-1.5 py-0.5 tracking-wider bg-black/60 font-bold">
                  COMBO
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {!ownsCombo && (
                  <span className="font-label-xl text-[10px] uppercase px-2 py-0.5 bg-[#dd0061] text-white font-extrabold border border-black shadow-[1px_1px_0_#000]">
                    SAVE 20%
                  </span>
                )}
                {ownsCombo && (
                  <span className="font-label-xl text-[11px] uppercase px-2 py-0.5 bg-[#f4c300] text-black font-extrabold border border-black">
                    OWNED ✓
                  </span>
                )}
              </div>
            </div>

            {/* Title & Price Header */}
            <div className="flex items-baseline justify-between gap-2 mb-1.5">
              <h3 className="font-headline-xl text-[21px] sm:text-[23px] text-white uppercase tracking-tight leading-none">
                {comboItem.name}
              </h3>
              <div className="flex items-baseline gap-1.5 shrink-0">
                <span className="text-neutral-500 line-through text-[13px] font-mono">₹248</span>
                <span className="text-[#f4c300] font-headline-xl text-[20px] sm:text-[22px] font-bold">
                  {comboPrice}
                </span>
              </div>
            </div>

            <p className="text-[12px] text-neutral-300 mb-2.5 leading-snug">
              Get both <strong className="text-white">REMOVE ADS</strong> and <strong className="text-white">UNLIMITED MOOD BOARDS</strong> in one discounted pack.
            </p>

            {/* Feature Pills */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="flex items-center gap-1.5 p-1.5 bg-black/60 border border-outline/40">
                <Ban size={13} className="text-[#9b30ff] shrink-0" />
                <span className="text-[10px] font-bold uppercase text-white truncate">NO ADS FOREVER</span>
              </div>
              <div className="flex items-center gap-1.5 p-1.5 bg-black/60 border border-outline/40">
                <Zap size={13} className="text-[#dd0061] shrink-0" />
                <span className="text-[10px] font-bold uppercase text-white truncate">UNLIMITED BOARDS</span>
              </div>
            </div>

            {/* Action Button */}
            {ownsCombo ? (
              <div className="w-full py-2 bg-[#2a2a2a] text-[#f4c300] border-2 border-outline/40 text-center font-label-xl text-[12px] uppercase font-bold flex items-center justify-center gap-1.5">
                <Check size={15} strokeWidth={3} />
                <span>UNLOCKED & ACTIVE</span>
              </div>
            ) : isComboPending ? (
              <div className="w-full py-2 bg-[#3d2f00] text-[#ffe399] border-2 border-[#f4c300] text-center font-label-xl text-[12px] uppercase font-bold">
                PROCESSING PAYMENT…
              </div>
            ) : (
              <button
                type="button"
                disabled={isBillingBusy}
                onClick={() => handlePurchase(comboItem)}
                className="w-full py-2.5 bg-[#f4c300] hover:bg-[#ffe399] text-black border-[2px] border-black font-label-xl text-[13px] uppercase font-extrabold shadow-[3px_3px_0_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer transition-all flex items-center justify-center gap-1.5"
              >
                <Sparkles size={15} strokeWidth={2.5} />
                <span>UNLOCK COMBO PACK • {comboPrice}</span>
              </button>
            )}
          </article>
        )}

        {/* PACK 2: REMOVE ADS */}
        {removeAdsItem && (
          <article
            id={`store-item-${removeAdsItem.id}`}
            className={`relative w-full p-3.5 sm:p-4 bg-[#1c1b1b] border-[3px] border-[#9b30ff] shadow-[4px_4px_0px_0px_#000] select-none transition-all ${
              ownsAds ? 'border-outline/60 opacity-90' : ''
            }`}
          >
            {/* Top Row: Badges */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-1.5">
                <span className="font-label-md text-[10px] uppercase border border-[#9b30ff] text-[#9b30ff] px-1.5 py-0.5 tracking-wider bg-black/60 font-bold">
                  SINGLE PASS
                </span>
                <span className="font-label-xl text-[10px] uppercase px-1.5 py-0.5 bg-[#9b30ff] text-white font-extrabold border border-black shadow-[1px_1px_0_#000]">
                  POPULAR
                </span>
              </div>
              {ownsAds && (
                <span className="font-label-xl text-[11px] uppercase px-2 py-0.5 bg-[#f4c300] text-black font-extrabold border border-black">
                  OWNED ✓
                </span>
              )}
            </div>

            {/* Title & Price Header */}
            <div className="flex items-baseline justify-between gap-2 mb-1.5">
              <h3 className="font-headline-xl text-[19px] sm:text-[21px] text-white uppercase tracking-tight leading-none">
                {removeAdsItem.name}
              </h3>
              <span className="text-[#9b30ff] font-headline-xl text-[19px] sm:text-[21px] font-bold shrink-0">
                {adsPrice}
              </span>
            </div>

            <p className="text-[12px] text-neutral-300 mb-2.5 leading-snug">
              Nukes all interstitial and banner ads forever across all screens. Pure, uninterrupted meme chaos.
            </p>

            <div className="flex items-center gap-1.5 p-1.5 bg-black/50 border border-outline/40 mb-3 text-[10px] text-neutral-200">
              <Ban size={13} className="text-[#9b30ff] shrink-0" />
              <span>Zero interstitial & banner ads • Rewarded video bonus drops remain optional</span>
            </div>

            {/* Action Button */}
            {ownsAds ? (
              <div className="w-full py-2 bg-[#2a2a2a] text-[#f4c300] border-2 border-outline/40 text-center font-label-xl text-[12px] uppercase font-bold flex items-center justify-center gap-1.5">
                <Check size={15} strokeWidth={3} />
                <span>ADS REMOVED</span>
              </div>
            ) : isAdsPending ? (
              <div className="w-full py-2 bg-[#3d2f00] text-[#ffe399] border-2 border-[#f4c300] text-center font-label-xl text-[12px] uppercase font-bold">
                PROCESSING PAYMENT…
              </div>
            ) : (
              <button
                type="button"
                disabled={isBillingBusy}
                onClick={() => handlePurchase(removeAdsItem)}
                className="w-full py-2.5 bg-[#9b30ff] hover:bg-[#b04dff] text-white border-[2px] border-black font-label-xl text-[13px] uppercase font-extrabold shadow-[3px_3px_0_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer transition-all flex items-center justify-center gap-1.5"
              >
                <span>GET REMOVE ADS • {adsPrice}</span>
              </button>
            )}
          </article>
        )}

        {/* PACK 3: UNLIMITED MOOD BOARDS */}
        {boardsItem && (
          <article
            id={`store-item-${boardsItem.id}`}
            className={`relative w-full p-3.5 sm:p-4 bg-[#1c1b1b] border-[3px] border-[#dd0061] shadow-[4px_4px_0px_0px_#000] select-none transition-all ${
              ownsBoards ? 'border-outline/60 opacity-90' : ''
            }`}
          >
            {/* Top Row: Badges */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-1.5">
                <span className="font-label-md text-[10px] uppercase border border-[#dd0061] text-[#dd0061] px-1.5 py-0.5 tracking-wider bg-black/60 font-bold">
                  SINGLE PASS
                </span>
                <span className="font-label-xl text-[10px] uppercase px-1.5 py-0.5 bg-[#dd0061] text-white font-extrabold border border-black shadow-[1px_1px_0_#000]">
                  CREATOR
                </span>
              </div>
              {ownsBoards && (
                <span className="font-label-xl text-[11px] uppercase px-2 py-0.5 bg-[#f4c300] text-black font-extrabold border border-black">
                  OWNED ✓
                </span>
              )}
            </div>

            {/* Title & Price Header */}
            <div className="flex items-baseline justify-between gap-2 mb-1.5">
              <h3 className="font-headline-xl text-[19px] sm:text-[21px] text-white uppercase tracking-tight leading-none">
                {boardsItem.name}
              </h3>
              <span className="text-[#dd0061] font-headline-xl text-[19px] sm:text-[21px] font-bold shrink-0">
                {boardsPrice}
              </span>
            </div>

            <p className="text-[12px] text-neutral-300 mb-2.5 leading-snug">
              Removes the free 3-board limit. Create and customize infinite themed meme binders.
            </p>

            <div className="flex items-center gap-1.5 p-1.5 bg-black/50 border border-outline/40 mb-3 text-[10px] text-neutral-200">
              <Zap size={13} className="text-[#dd0061] shrink-0" />
              <span>Infinite board creation • Full custom color customization</span>
            </div>

            {/* Action Button */}
            {ownsBoards ? (
              <div className="w-full py-2 bg-[#2a2a2a] text-[#f4c300] border-2 border-outline/40 text-center font-label-xl text-[12px] uppercase font-bold flex items-center justify-center gap-1.5">
                <Check size={15} strokeWidth={3} />
                <span>UNLIMITED BOARDS ACTIVE</span>
              </div>
            ) : isBoardsPending ? (
              <div className="w-full py-2 bg-[#3d2f00] text-[#ffe399] border-2 border-[#f4c300] text-center font-label-xl text-[12px] uppercase font-bold">
                PROCESSING PAYMENT…
              </div>
            ) : (
              <button
                type="button"
                disabled={isBillingBusy}
                onClick={() => handlePurchase(boardsItem)}
                className="w-full py-2.5 bg-[#dd0061] hover:bg-[#ff1a7d] text-white border-[2px] border-black font-label-xl text-[13px] uppercase font-extrabold shadow-[3px_3px_0_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer transition-all flex items-center justify-center gap-1.5"
              >
                <span>GET UNLIMITED BOARDS • {boardsPrice}</span>
              </button>
            )}
          </article>
        )}

        {/* 3. GOOGLE PLAY ACCOUNT & RESTORE BAR */}
        <div className="p-3 bg-[#181717] border-[2px] border-outline/40 shadow-[2px_2px_0_#000] flex flex-col sm:flex-row items-center justify-between gap-2.5 text-[11px]">
          <div className="flex items-center gap-2 text-neutral-300">
            <Shield size={16} className="text-[#f4c300] shrink-0" />
            <span className="leading-snug">
              Purchases are permanent & bound to your Google Play account. No subscriptions.
            </span>
          </div>
          <button
            type="button"
            disabled={isBillingBusy}
            onClick={() => void restorePurchases()}
            className="w-full sm:w-auto px-3.5 py-1.5 bg-[#262525] hover:bg-[#9b30ff] text-white border border-outline font-label-xl text-[11px] uppercase shadow-[1px_1px_0_#000] active:scale-95 transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
          >
            <RotateCcw size={13} />
            <span>{isBillingBusy ? 'CHECKING…' : 'RESTORE PURCHASES'}</span>
          </button>
        </div>
      </div>

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
