import React from 'react';
import { PRODUCTS, type ProductId } from '../monetization/products';

export interface DropMode {
  id: string;
  name: string;
  productId?: ProductId;
}

export const DROP_MODES: DropMode[] = [
  { id: 'all', name: 'ALL MEMES' },
  { id: 'dark_humour', name: 'DARK HUMOUR', productId: PRODUCTS.PACK_DARK_HUMOUR },
  { id: 'wholesome', name: 'WHOLESOME', productId: PRODUCTS.PACK_WHOLESOME },
  { id: 'desi', name: 'DESI', productId: PRODUCTS.PACK_DESI },
  { id: 'gaming', name: 'GAMING', productId: PRODUCTS.PACK_GAMING },
];

interface DropModeSelectorProps {
  activeMode: string;
  onSelectMode: (modeId: string) => void;
  onOpenStore: (focus?: ProductId) => void;
  ownedPacks: string[];
}

export default function DropModeSelector({
  activeMode,
  onSelectMode,
  onOpenStore,
  ownedPacks,
}: DropModeSelectorProps) {
  return (
    <div className="w-full flex flex-col gap-1.5 my-3">
      <div className="flex items-center justify-between">
        <span className="font-label-xl text-[12px] text-secondary-container uppercase tracking-wider">
          DROP MODE
        </span>
        <span className="font-label-md text-[10px] text-outline uppercase">
          NICHE FILTERS
        </span>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {DROP_MODES.map((mode) => {
          const isAll = mode.id === 'all';
          const isOwned = isAll || (mode.productId && ownedPacks.includes(mode.productId));
          const isSelected = activeMode === mode.id;

          return (
            <button
              key={mode.id}
              type="button"
              onClick={() => {
                if (isOwned) {
                  onSelectMode(mode.id);
                } else if (mode.productId) {
                  onOpenStore(mode.productId);
                }
              }}
              style={{
                boxShadow: isSelected ? '2px 2px 0px 0px #000' : 'none',
              }}
              className={`shrink-0 px-2.5 py-1.5 border-[2px] font-label-xl text-[12px] uppercase transition-all flex items-center gap-1 cursor-pointer ${
                isSelected
                  ? 'bg-secondary-container text-black border-black font-bold'
                  : isOwned
                  ? 'bg-surface-container-low text-neutral-300 border-outline hover:text-white'
                  : 'bg-[#1a1a1a] text-neutral-500 border-neutral-700 hover:border-outline'
              }`}
            >
              {!isOwned && <span className="text-[10px]">🔒</span>}
              <span>{mode.name}</span>
              {!isOwned && (
                <span className="text-[9px] px-1 py-0.2 bg-neutral-800 text-neutral-400 border border-neutral-600 ml-0.5">
                  SOON
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
