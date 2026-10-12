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
  onPurchase: (item: CatalogItem) => void;
}

export default function StoreItemCard({
  item,
  liveProduct,
  loading,
  isOwned,
  isPending,
  isBusy,
  onPurchase,
}: StoreItemCardProps) {
  const rarity = RARITY_CONFIG[item.rarity];
  const isAvailable = item.available;

  return (
    <article
      id={`store-item-${item.id}`}
      style={{
        borderColor: isAvailable ? rarity.border : '#4d4355',
        boxShadow: isAvailable ? `4px 4px 0px 0px #000000` : 'none',
      }}
      className={`relative p-4 bg-[#1c1b1b] border-[3px] flex flex-col justify-between transition-all ${
        !isAvailable ? 'opacity-65' : ''
      }`}
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
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

        <h3 className="font-headline-xl text-[24px] text-white tracking-wide uppercase leading-tight mb-1">
          {item.name}
        </h3>

        <p className="font-sans text-[13px] text-neutral-300 leading-snug mb-4">
          {item.shortDescription}
        </p>
      </div>

      <div className="pt-2 border-t border-outline/30 flex items-center justify-between gap-2">
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
        ) : liveProduct ? (
          <button
            type="button"
            disabled={isBusy}
            onClick={() => onPurchase(item)}
            style={{
              backgroundColor: rarity.border,
            }}
            className="w-full py-2.5 px-4 font-label-xl text-[15px] font-bold text-black uppercase border-[2px] border-black shadow-[3px_3px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none hover:brightness-110 transition-all cursor-pointer disabled:opacity-50"
          >
            {isBusy ? 'PLEASE WAIT…' : liveProduct.priceString}
          </button>
        ) : (
          <button
            type="button"
            disabled
            className="w-full py-2.5 font-label-xl text-[13px] uppercase bg-[#2a2a2a] text-neutral-400 border border-outline cursor-not-allowed"
          >
            STORE UNAVAILABLE
          </button>
        )}
      </div>
    </article>
  );
}
