import React from 'react';
import type { CatalogItem } from '../../monetization/catalog';
import { CATALOG_BY_ID, RARITY_CONFIG } from '../../monetization/catalog';
import type { Product } from '@capgo/native-purchases';
import { calculateSavings } from '../../monetization/purchases';

interface BundleCardProps {
  key?: React.Key;
  bundle: CatalogItem;
  liveProducts: Product[];
  loading: boolean;
  isOwned: boolean;
  isPending: boolean;
  isBusy: boolean;
  isHero?: boolean;
  ownsComponent: (id: string) => boolean;
  onPurchase: (bundle: CatalogItem) => void;
}

export default function BundleCard({
  bundle,
  liveProducts,
  loading,
  isOwned,
  isPending,
  isBusy,
  isHero = false,
  ownsComponent,
  onPurchase,
}: BundleCardProps) {
  const rarity = RARITY_CONFIG[bundle.rarity];
  const liveProduct = liveProducts.find((p) => p.identifier === bundle.id);
  const isAvailable = bundle.available;

  // Live savings percentage
  const savingsPct = calculateSavings(bundle.id, liveProducts);

  // Component ownership count
  const totalComponents = bundle.includes.length;
  const ownedCount = bundle.includes.filter((id) => ownsComponent(id)).length;
  const hasPartialOwnership = !isOwned && ownedCount > 0 && totalComponents > 0;

  return (
    <article
      id={`store-item-${bundle.id}`}
      style={{
        borderColor: isAvailable ? rarity.border : '#4d4355',
        boxShadow: isHero
          ? '8px 8px 0px 0px #9b30ff'
          : isAvailable
          ? `6px 6px 0px 0px #000000`
          : 'none',
      }}
      className={`relative p-5 bg-[#1c1b1b] border-[4px] flex flex-col justify-between transition-all ${
        isHero ? 'bg-gradient-to-b from-[#262118] to-[#1c1b1b]' : ''
      } ${!isAvailable ? 'opacity-65' : ''}`}
    >
      {/* Top Banner Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          {isHero && (
            <span className="font-label-xl text-[12px] uppercase px-2.5 py-1 bg-[#f4c300] text-black font-bold border-2 border-black shadow-[2px_2px_0_#000]">
              BEST VALUE
            </span>
          )}
          <span
            style={{
              borderColor: rarity.border,
              color: rarity.text,
            }}
            className="font-label-md text-[11px] uppercase border px-2 py-0.5 tracking-wider bg-black/50"
          >
            {rarity.label}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {savingsPct !== null && !isOwned && (
            <span className="font-label-xl text-[12px] uppercase px-2 py-0.5 bg-[#dd0061] text-white font-bold border border-black shadow-[2px_2px_0_#000]">
              SAVE {savingsPct}%
            </span>
          )}

          {isOwned ? (
            <span className="font-label-xl text-[12px] uppercase px-2 py-0.5 bg-[#f4c300] text-black font-bold border border-black shadow-[2px_2px_0_#000]">
              OWNED ✓
            </span>
          ) : isPending ? (
            <span className="font-label-xl text-[12px] uppercase px-2 py-0.5 bg-[#ffe399] text-black font-bold border border-black">
              PAYMENT PENDING
            </span>
          ) : !isAvailable ? (
            <span className="font-label-md text-[11px] uppercase px-1.5 py-0.5 bg-[#353534] text-neutral-400 border border-outline">
              COMING SOON
            </span>
          ) : null}
        </div>
      </div>

      <div>
        <h3
          className={`font-headline-xl text-white tracking-wide uppercase leading-tight mb-1 ${
            isHero ? 'text-[32px] sm:text-[36px] text-[#f4c300]' : 'text-[26px]'
          }`}
        >
          {bundle.name}
        </h3>

        <p className="font-sans text-[14px] text-neutral-300 leading-snug mb-4">
          {bundle.shortDescription}
        </p>

        {/* INCLUDES Chips */}
        {bundle.includes.length > 0 && (
          <div className="mb-4">
            <span className="block font-label-md text-[11px] text-neutral-400 uppercase tracking-wider mb-2">
              INCLUDES ({bundle.includes.length} UNLOCKS):
            </span>
            <div className="flex flex-wrap gap-1.5">
              {bundle.includes.map((componentId) => {
                const component = CATALOG_BY_ID[componentId];
                if (!component) return null;
                const owned = ownsComponent(componentId);
                return (
                  <span
                    key={componentId}
                    className={`font-label-md text-[11px] uppercase px-2 py-1 border flex items-center gap-1 ${
                      owned
                        ? 'bg-[#152000] border-[#7abb00] text-[#ceff8c]'
                        : 'bg-[#2a2a2a] border-outline/50 text-neutral-300'
                    }`}
                  >
                    {owned ? '✓ ' : ''}
                    {component.name}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Partial ownership warning note */}
        {hasPartialOwnership && (
          <div className="mb-4 p-2.5 bg-[#261f18] border-2 border-[#f4c300]/60 font-sans text-[12px] text-[#ffe08b] leading-tight">
            ⚠️ <strong>YOU ALREADY OWN {ownedCount} OF {totalComponents} ITEMS</strong>
            <p className="text-[11px] text-neutral-300 mt-0.5">
              Google Play charges full bundle price without prorating.
            </p>
          </div>
        )}
      </div>

      {/* Action Button */}
      <div className="pt-3 border-t border-outline/30 flex items-center justify-between gap-2">
        {isOwned ? (
          <div className="w-full text-center py-3 font-label-xl text-[15px] bg-[#2a2a2a] text-[#f4c300] border-2 border-outline/40">
            BUNDLE OWNED ✓
          </div>
        ) : isPending ? (
          <div className="w-full text-center py-3 font-label-xl text-[14px] bg-[#3d2f00] text-[#ffe399] border-2 border-[#f4c300]">
            PROCESSING PAYMENT…
          </div>
        ) : !isAvailable ? (
          <button
            type="button"
            disabled
            className="w-full py-3 font-label-xl text-[14px] uppercase bg-[#201f1f] text-neutral-500 border-2 border-neutral-700 cursor-not-allowed"
          >
            COMING SOON
          </button>
        ) : loading ? (
          <div className="w-full py-3.5 bg-neutral-800 loading-shimmer border-2 border-neutral-700" />
        ) : liveProduct ? (
          <button
            type="button"
            disabled={isBusy}
            onClick={() => onPurchase(bundle)}
            style={{
              backgroundColor: isHero ? '#f4c300' : rarity.border,
            }}
            className="w-full py-3 px-5 font-headline-lg text-[18px] text-black uppercase border-[2px] border-black shadow-[4px_4px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none hover:brightness-110 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isBusy ? 'PLEASE WAIT…' : `GET BUNDLE — ${liveProduct.priceString}`}
          </button>
        ) : (
          <button
            type="button"
            disabled
            className="w-full py-3 font-label-xl text-[14px] uppercase bg-[#2a2a2a] text-neutral-400 border border-outline cursor-not-allowed"
          >
            STORE UNAVAILABLE
          </button>
        )}
      </div>
    </article>
  );
}
