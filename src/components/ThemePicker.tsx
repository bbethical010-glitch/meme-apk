import { useEffect, useState } from 'react';
import { PRODUCTS, PRODUCT_DETAILS, type ProductId } from '../monetization/products';
import { useEntitlements } from '../monetization/hooks';
import ProductPurchase from './ProductPurchase';

export const THEME_KEY = 'meme_capsule_theme';
export const THEME_CHANGED = 'meme-capsule-theme-changed';

function selectTheme(id: string) {
  localStorage.setItem(THEME_KEY, id);
  const appContainer = document.querySelector('.app-container');
  if (appContainer) {
    if (id === 'classic') {
      appContainer.removeAttribute('data-theme');
    } else {
      appContainer.setAttribute('data-theme', id);
    }
  }
  window.dispatchEvent(new Event(THEME_CHANGED));
}

interface ThemePickerProps {
  onOpenStore?: (focus?: ProductId) => void;
}

export default function ThemePicker({ onOpenStore }: ThemePickerProps) {
  const { entitlements } = useEntitlements();
  const [locked, setLocked] = useState<ProductId | null>(null);
  const [selected, setSelected] = useState(() => localStorage.getItem(THEME_KEY) || 'classic');

  useEffect(() => {
    const update = () => setSelected(localStorage.getItem(THEME_KEY) || 'classic');
    window.addEventListener(THEME_CHANGED, update);
    return () => window.removeEventListener(THEME_CHANGED, update);
  }, []);

  const themes = [
    { id: 'classic', name: 'CLASSIC', color: '#9b30ff' },
    { id: PRODUCTS.THEME_CYBERPUNK, name: 'CYBER CYAN', color: '#00e5ff' },
    { id: PRODUCTS.THEME_ACID, name: 'ACID GREEN', color: '#adff2f' },
    { id: PRODUCTS.THEME_MIDNIGHT_GOLD, name: 'MIDNIGHT GOLD', color: '#f4c300' },
    { id: PRODUCTS.THEME_BLOOD_ORANGE, name: 'BLOOD ORANGE', color: '#ff5722' },
  ];

  return (
    <div className="border-t-[3px] border-outline pt-4 font-label-md">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-label-xl text-[14px] text-primary uppercase tracking-wider">
          COSMETIC THEMES
        </h3>
        <span className="font-label-md text-[11px] text-outline uppercase">
          PERMANENT ACCENTS
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {themes.map((theme) => {
          const owned = theme.id === 'classic' || entitlements.ownedThemes.includes(theme.id);
          const isSelected = selected === theme.id;

          return (
            <button
              key={theme.id}
              type="button"
              aria-pressed={owned && isSelected}
              onClick={() => {
                if (owned) {
                  selectTheme(theme.id);
                  setLocked(null);
                } else {
                  if (onOpenStore) {
                    onOpenStore(theme.id as ProductId);
                  } else {
                    setLocked(theme.id as ProductId);
                  }
                }
              }}
              style={{
                borderColor: theme.color,
                boxShadow: isSelected ? `3px 3px 0px 0px ${theme.color}` : '2px 2px 0px 0px #000',
              }}
              className={`border-2 p-2.5 text-left text-xs uppercase flex items-center justify-between transition-all cursor-pointer ${
                isSelected
                  ? 'bg-surface-container-high text-white font-bold'
                  : 'bg-[#131313] text-neutral-300 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  style={{ backgroundColor: theme.color }}
                  className="w-3.5 h-3.5 border border-black shrink-0 inline-block"
                />
                <span className="font-label-md text-[12px]">{theme.name}</span>
              </div>
              <span className="font-bold text-[11px]">
                {owned ? (isSelected ? '✓' : '') : '🔒'}
              </span>
            </button>
          );
        })}
      </div>

      {locked && !entitlements.ownedThemes.includes(locked) && (
        <div className="mt-3 p-3 border-2 border-primary-container bg-surface-container-low shadow-[3px_3px_0_#000]">
          <div className="flex justify-between items-center gap-2">
            <h4 className="font-headline-lg text-[18px] text-[#f4c300] uppercase">
              {PRODUCT_DETAILS[locked].name}
            </h4>
            <button
              type="button"
              onClick={() => setLocked(null)}
              aria-label="Close theme offer"
              className="text-white hover:text-red-400 p-1 font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
          <p className="text-sm text-outline my-2">{PRODUCT_DETAILS[locked].benefit}</p>
          <div className="flex items-center gap-2 pt-1">
            <ProductPurchase
              productId={locked}
              onPurchased={() => {
                selectTheme(locked);
                setLocked(null);
              }}
            />
            {onOpenStore && (
              <button
                type="button"
                onClick={() => onOpenStore(PRODUCTS.BUNDLE_STYLE)}
                className="bg-primary text-black px-3 py-1.5 font-label-xl text-[12px] uppercase border border-black shadow-[2px_2px_0_#000] cursor-pointer"
              >
                VIEW DRIP PACK
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
