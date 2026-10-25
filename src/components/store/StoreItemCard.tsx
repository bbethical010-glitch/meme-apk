import React from 'react';
import type { CatalogItem } from '../../monetization/catalog';
import { RARITY_CONFIG } from '../../monetization/catalog';
import type { Product } from '@capgo/native-purchases';

interface StoreItemCardProps {
  key?: React.Key;
  item: CatalogItem;
  liveProduct?: Product;
  loading: boolean;
  isOwned: boolean;
  isPending: boolean;
  isBusy: boolean;
  isTestMode?: boolean;
  onPurchase: (item: CatalogItem) => void;
}

export default function StoreItemCard({
  item,
  liveProduct,
  loading,
  isOwned,
  isPending,
  isBusy,
  isTestMode = false,
  onPurchase,
}: StoreItemCardProps) {
  const rarity = RARITY_CONFIG[item.rarity];
  const isAvailable = item.available;
  const displayPrice = liveProduct?.priceString || `₹${item.basePriceINR}`;

  return (
    <article
      id={`store-item-${item.id}`}
      style={{
        borderColor: isAvailable ? rarity.border : '#4d4355',
        boxShadow: isAvailable ? `4px 4px 0px 0px #000000` : 'none',
      }}
      className={`relative p-4 bg-[#1c1b1b] border-[3px] w-[275px] shrink-0 snap-start flex flex-col justify-between h-full select-none transition-all ${
        !isAvailable ? 'opacity-65' : ''
      }`}
    >
      <div>
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-1 mb-2">
          <span
            style={{
              borderColor: rarity.border,
              color: rarity.text,
            }}
            className="font-label-md text-[11px] uppercase border px-1.5 py-0.5 tracking-wider bg-black/40"
          >
            {rarity.label}
          </span>

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

        {/* Title */}
        <h3 className="font-headline-xl text-[24px] text-white tracking-wide uppercase leading-tight mb-2">
          {item.name}
        </h3>

        {/* Short Description */}
        <p className="font-body-md text-[13.5px] text-[#e5e2e1] leading-relaxed mb-3.5 normal-case font-normal">
          {item.shortDescription}
        </p>

        {/* Feature highlight chip */}
        <div className="p-2.5 bg-black/50 border border-outline/40 mb-2">
          <span className="font-label-md text-[11px] text-secondary-container uppercase tracking-widest font-bold block mb-1">
            PERMANENT UNLOCK
          </span>
          <span className="font-body-md text-[12px] text-neutral-300 leading-normal normal-case block">
            One-time purchase. Bound to your device & Google Play account.
          </span>
        </div>
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
            onClick={() => onPurchase(item)}
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
