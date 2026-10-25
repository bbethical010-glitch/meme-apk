import React from 'react';
import type { CatalogItem } from '../../monetization/catalog';
import { RARITY_CONFIG } from '../../monetization/catalog';
import type { Product } from '@capgo/native-purchases';
import { PRODUCTS } from '../../monetization/products';

interface ThemeCardProps {
  key?: React.Key;
  item: CatalogItem;
  liveProduct?: Product;
  loading: boolean;
  isOwned: boolean;
  isPending: boolean;
  isBusy: boolean;
  isPreviewing: boolean;
  isTestMode?: boolean;
  onPreview: (themeId: string) => void;
  onPurchase: (item: CatalogItem) => void;
}

const THEME_PALETTES: Record<string, { primary: string; secondary: string; bg: string }> = {
  [PRODUCTS.THEME_CYBERPUNK]: {
    primary: '#9bf6ff',
    secondary: '#00b5cf',
    bg: '#001619',
  },
  [PRODUCTS.THEME_ACID]: {
    primary: '#ceff8c',
    secondary: '#7abb00',
    bg: '#152000',
  },
  [PRODUCTS.THEME_MIDNIGHT_GOLD]: {
    primary: '#f4c300',
    secondary: '#b8860b',
    bg: '#0e0e0e',
  },
  [PRODUCTS.THEME_BLOOD_ORANGE]: {
    primary: '#ff5722',
    secondary: '#d84315',
    bg: '#210b05',
  },
};

export default function ThemeCard({
  item,
  liveProduct,
  loading,
  isOwned,
  isPending,
  isBusy,
  isPreviewing,
  isTestMode = false,
  onPreview,
  onPurchase,
}: ThemeCardProps) {
  const rarity = RARITY_CONFIG[item.rarity];
  const palette = THEME_PALETTES[item.id] || {
    primary: '#9b30ff',
    secondary: '#f4c300',
    bg: '#131313',
  };
  const displayPrice = liveProduct?.priceString || `₹${item.basePriceINR}`;

  return (
    <article
      id={`store-item-${item.id}`}
      style={{
        borderColor: rarity.border,
        boxShadow: '4px 4px 0px 0px #000000',
      }}
      className="p-4 bg-[#1c1b1b] border-[3px] w-[275px] shrink-0 snap-start flex flex-col justify-between h-full select-none transition-all"
    >
      <div>
        {/* Color Palette Swatch Box with Preview button */}
        <div
          style={{ backgroundColor: palette.bg }}
          className="w-full h-16 border-2 border-black p-2.5 flex items-center justify-between mb-3 shadow-[2px_2px_0_#000]"
        >
          <div className="flex items-center gap-2">
            <span
              style={{ backgroundColor: palette.primary }}
              className="w-7 h-7 border-2 border-black shrink-0 inline-block"
            />
            <span
              style={{ backgroundColor: palette.secondary }}
              className="w-5 h-5 border-2 border-black shrink-0 inline-block"
            />
          </div>

          <button
            type="button"
            onClick={() => onPreview(item.id)}
            className={`font-label-md text-[11px] uppercase px-2.5 py-1.5 border border-black shadow-[1px_1px_0_#000] cursor-pointer transition-all ${
              isPreviewing
                ? 'bg-[#f4c300] text-black font-bold'
                : 'bg-[#131313] text-white hover:bg-neutral-800'
            }`}
          >
            {isPreviewing ? 'PREVIEW ON' : 'TEST PREVIEW'}
          </button>
        </div>

        {/* Top Badges */}
        <div className="flex items-center justify-between gap-1 mb-1.5">
          <span
            style={{
              borderColor: rarity.border,
              color: rarity.text,
            }}
            className="font-label-md text-[10px] uppercase border px-1.5 py-0.5 tracking-wider bg-black/40"
          >
            {rarity.label}
          </span>
          {isOwned ? (
            <span className="font-label-xl text-[11px] px-2 py-0.5 bg-[#f4c300] text-black font-bold border border-black shadow-[1px_1px_0_#000]">
              OWNED ✓
            </span>
          ) : isPending ? (
            <span className="font-label-md text-[10px] px-1.5 py-0.5 bg-[#ffe399] text-black border border-black">
              PENDING
            </span>
          ) : null}
        </div>

        {/* Title */}
        <h4 className="font-headline-xl text-[22px] text-white tracking-wide uppercase leading-tight mb-1">
          {item.name}
        </h4>

        {/* Description */}
        <p className="font-body-md text-[13px] text-[#e5e2e1] leading-relaxed mb-3 normal-case font-normal">
          {item.shortDescription}
        </p>

        {/* Perk Note */}
        <div className="p-2.5 bg-black/40 border border-outline/40">
          <span className="font-label-md text-[11px] text-secondary-container uppercase tracking-widest font-bold block mb-0.5">
            ACCENT THEME
          </span>
          <span className="font-body-md text-[12px] text-neutral-300 leading-normal normal-case block">
            Re-colors headers, buttons, cards & highlight borders permanently.
          </span>
        </div>
      </div>

      {/* Bottom Action Area */}
      <div className="pt-3 border-t border-outline/30 mt-auto">
        {isOwned ? (
          <div className="w-full text-center py-2.5 font-label-xl text-[13px] bg-[#2a2a2a] text-[#f4c300] border border-outline/40">
            OWNED
          </div>
        ) : isPending ? (
          <div className="w-full text-center py-2.5 font-label-xl text-[12px] bg-[#3d2f00] text-[#ffe399] border border-[#f4c300]">
            PENDING
          </div>
        ) : loading ? (
          <div className="w-full py-2.5 bg-neutral-800 loading-shimmer border border-neutral-700" />
        ) : (
          <button
            type="button"
            disabled={isBusy}
            onClick={() => onPurchase(item)}
            style={{ backgroundColor: rarity.border }}
            className="w-full py-2.5 px-3 font-label-xl text-[15px] font-bold text-black uppercase border-[2px] border-black shadow-[3px_3px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 hover:brightness-110 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            <span>{isBusy ? 'WAIT…' : displayPrice}</span>
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
