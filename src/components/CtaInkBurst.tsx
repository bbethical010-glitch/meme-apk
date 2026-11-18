import React, { useState, useCallback, useRef, useEffect } from 'react';

export type CtaBtnKey = 'like' | 'vault' | 'pin' | 'more';

export interface CtaEffectState {
  key: CtaBtnKey | null;
  tick: number;
  x: number;
  y: number;
  size: number;
  color: string;
}

export function useCtaInkBurst() {
  const [ctaEffects, setCtaEffects] = useState<CtaEffectState>({
    key: null,
    tick: 0,
    x: 0,
    y: 0,
    size: 0,
    color: '#FF2A85',
  });

  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerCtaEffect = useCallback(
    (key: CtaBtnKey, color: string, e: React.MouseEvent<HTMLButtonElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 2;
      const x = (e.clientX || rect.left + rect.width / 2) - rect.left - size / 2;
      const y = (e.clientY || rect.top + rect.height / 2) - rect.top - size / 2;

      if (clearTimerRef.current) {
        clearTimeout(clearTimerRef.current);
      }

      const tick = Date.now();
      setCtaEffects({ key, tick, x, y, size, color });

      clearTimerRef.current = setTimeout(() => {
        setCtaEffects((prev) => (prev.tick === tick ? { ...prev, key: null } : prev));
      }, 450);
    },
    []
  );

  useEffect(() => {
    return () => {
      if (clearTimerRef.current) {
        clearTimeout(clearTimerRef.current);
      }
    };
  }, []);

  return { ctaEffects, triggerCtaEffect };
}

export interface CtaInkBurstOverlayProps {
  btnKey: CtaBtnKey;
  accentHex: string;
  ctaEffects: CtaEffectState;
}

export const CtaInkBurstOverlay: React.FC<CtaInkBurstOverlayProps> = ({
  btnKey,
  accentHex,
  ctaEffects,
}) => {
  const isCurrentEffect = ctaEffects.key === btnKey && Date.now() - ctaEffects.tick < 600;

  return (
    <>
      <div className="ink-layer">
        {isCurrentEffect && (
          <span
            key={`ink-${ctaEffects.tick}`}
            className="ink-ripple"
            style={{
              width: `${ctaEffects.size}px`,
              height: `${ctaEffects.size}px`,
              left: `${ctaEffects.x}px`,
              top: `${ctaEffects.y}px`,
              backgroundColor: `${accentHex}55`,
            }}
          />
        )}
      </div>
      {isCurrentEffect && (
        <div key={`burst-${ctaEffects.tick}`} className="burst-wrapper">
          <svg
            viewBox="0 0 100 100"
            className="w-full h-full animate-burst-ticks"
            fill="none"
            stroke={accentHex}
            strokeWidth="4"
            strokeLinecap="square"
          >
            <line x1="50" y1="2" x2="50" y2="14" />
            <line x1="50" y1="86" x2="50" y2="98" />
            <line x1="6" y1="24" x2="17" y2="31" />
            <line x1="83" y1="69" x2="94" y2="76" />
            <line x1="6" y1="76" x2="17" y2="69" />
            <line x1="83" y1="31" x2="94" y2="24" />
          </svg>
        </div>
      )}
    </>
  );
};
