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
  isTestMode?: boolean;
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
  isTestMode = false,
  ownsComponent,
  onPurchase,
}: BundleCardProps) {
  const rarity = RARITY_CONFIG[bundle.rarity];
  const liveProduct = liveProducts.find((p) => p.identifier === bundle.id);
  const isAvailable = bundle.available;
  const displayPrice = liveProduct?.priceString || `₹${bundle.basePriceINR}`;

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
          ? '6px 6px 0px 0px #f4c300'
          : isAvailable
          ? `4px 4px 0px 0px #000000`
          : 'none',
      }}
      className={`relative p-4 bg-[#1c1b1b] border-[3px] ${
        isHero ? 'w-[305px] bg-gradient-to-b from-[#262118] to-[#1c1b1b]' : 'w-[285px]'
      } shrink-0 snap-start flex flex-col justify-between h-full select-none transition-all ${
        !isAvailable ? 'opacity-65' : ''
      }`}
    >
      <div>
        {/* Top Banner Ribbon */}
        <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2.5">
          <div className="flex items-center gap-1.5">
            {isHero && (
              <span className="font-label-xl text-[11px] uppercase px-2 py-0.5 bg-[#f4c300] text-black font-bold border border-black shadow-[1px_1px_0_#000]">
                BEST VALUE
              </span>
            )}
            <span
              style={{
                borderColor: rarity.border,
                color: rarity.text,
              }}
              className="font-label-md text-[10px] uppercase border px-1.5 py-0.5 tracking-wider bg-black/50"
            >
              {rarity.label}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {savingsPct !== null && !isOwned && (
              <span className="font-label-xl text-[11px] uppercase px-1.5 py-0.5 bg-[#dd0061] text-white font-bold border border-black shadow-[1px_1px_0_#000]">
                SAVE {savingsPct}%
              </span>
            )}

            {isOwned ? (
              <span className="font-label-xl text-[11px] uppercase px-2 py-0.5 bg-[#f4c300] text-black font-bold border border-black shadow-[1px_1px_0_#000]">
                OWNED ✓
              </span>
            ) : isPending ? (
              <span className="font-label-xl text-[11px] uppercase px-1.5 py-0.5 bg-[#ffe399] text-black font-bold border border-black">
                PENDING
              </span>
            ) : !isAvailable ? (
              <span className="font-label-md text-[10px] uppercase px-1.5 py-0.5 bg-[#353534] text-neutral-400 border border-outline">
                COMING SOON
              </span>
            ) : null}
          </div>
        </div>

        {/* Title */}
        <h3
          className={`font-headline-xl text-white tracking-wide uppercase leading-tight mb-1.5 ${
            isHero ? 'text-[28px] text-[#f4c300]' : 'text-[24px]'
          }`}
        >
          {bundle.name}
        </h3>

        {/* Description */}
        <p className="font-sans text-[13px] text-neutral-300 leading-snug mb-3">
          {bundle.shortDescription}
        </p>

        {/* INCLUDES Chips (Scrollable if tall) */}
        {bundle.includes.length > 0 && (
          <div className="mb-3">
            <span className="block font-label-md text-[10px] text-neutral-400 uppercase tracking-wider mb-1.5">
              INCLUDES ({bundle.includes.length} UNLOCKS):
            </span>
            <div className="flex flex-wrap gap-1 max-h-[140px] overflow-y-auto scrollbar-none pr-1">
              {bundle.includes.map((componentId) => {
                const component = CATALOG_BY_ID[componentId];
                if (!component) return null;
                const owned = ownsComponent(componentId);
                return (
                  <span
                    key={componentId}
                    className={`font-label-md text-[10px] uppercase px-1.5 py-0.5 border flex items-center gap-1 ${
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
          <div className="mb-3 p-2 bg-[#261f18] border-2 border-[#f4c300]/60 font-sans text-[11px] text-[#ffe08b] leading-tight">
            ⚠️ <strong>ALREADY OWN {ownedCount} OF {totalComponents} ITEMS</strong>
            <p className="text-[10px] text-neutral-300 mt-0.5">
              Google Play charges full bundle price without prorating.
            </p>
          </div>
        )}
      </div>

      {/* Bottom Action Area */}
      <div className="pt-3 border-t border-outline/30 mt-auto">
        {isOwned ? (
          <div className="w-full text-center py-2.5 font-label-xl text-[14px] bg-[#2a2a2a] text-[#f4c300] border-2 border-outline/40">
            OWNED
          </div>
        ) : isPending ? (
          <div className="w-full text-center py-2.5 font-label-xl text-[13px] bg-[#3d2f00] text-[#ffe399] border-2 border-[#f4c300]">
            PROCESSING PAYMENT…
          </div>
        ) : !isAvailable ? (
          <button
            type="button"
            disabled
            className="w-full py-2.5 font-label-xl text-[14px] uppercase bg-[#201f1f] text-neutral-500 border-2 border-neutral-700 cursor-not-allowed"
          >
            COMING SOON
          </button>
        ) : loading ? (
          <div className="w-full py-3 bg-neutral-800 loading-shimmer border-2 border-neutral-700" />
        ) : (
          <button
            type="button"
            disabled={isBusy}
            onClick={() => onPurchase(bundle)}
            style={{
              backgroundColor: rarity.border,
            }}
            className="w-full py-2.5 px-3 font-label-xl text-[15px] font-bold text-black uppercase border-[2px] border-black shadow-[3px_3px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none hover:brightness-110 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            <span>{isBusy ? 'PLEASE WAIT…' : displayPrice}</span>
            {isTestMode && !isBusy && (
              <span className="text-[10px] bg-black text-white px-1 py-0.5 border border-black font-normal">
                TEST
              </span>
            )}
          </button>
        )}
      </div>
    </article>
  );
}
