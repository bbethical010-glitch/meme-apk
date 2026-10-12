export type ArcadeFxStyle = 'classic' | 'retro_slam' | 'neon_glitch' | 'cassette_pop';

export const FX_STORAGE_KEY = 'meme_capsule_fx';
export const FX_CHANGED = 'meme-capsule-fx-changed';

export interface FxConfig {
  id: ArcadeFxStyle;
  name: string;
  description: string;
  spring: {
    tension: number;
    friction: number;
    mass: number;
  };
  shakeClass: string;
}

export const ARCADE_FX_STYLES: Record<ArcadeFxStyle, FxConfig> = {
  classic: {
    id: 'classic',
    name: 'CLASSIC',
    description: 'Original balanced physics and crisp arcade shake.',
    spring: {
      tension: 280,
      friction: 26,
      mass: 1.2,
    },
    shakeClass: 'animate-shake',
  },
  retro_slam: {
    id: 'retro_slam',
    name: 'RETRO SLAM',
    description: 'Harder bounce with subtle rotational impact snap.',
    spring: {
      tension: 340,
      friction: 18,
      mass: 1.4,
    },
    shakeClass: 'animate-shake-retro',
  },
  neon_glitch: {
    id: 'neon_glitch',
    name: 'NEON GLITCH',
    description: 'High-speed micro-jitter with chromatic aberration pulse.',
    spring: {
      tension: 310,
      friction: 22,
      mass: 1.0,
    },
    shakeClass: 'animate-shake-glitch',
  },
  cassette_pop: {
    id: 'cassette_pop',
    name: 'CASSETTE POP',
    description: 'Elastic rubber overshoot with slight physical scale pop.',
    spring: {
      tension: 240,
      friction: 14,
      mass: 0.9,
    },
    shakeClass: 'animate-shake-pop',
  },
};

export function getActiveFx(ownedFx: string[] = ['classic']): ArcadeFxStyle {
  if (typeof window === 'undefined') return 'classic';
  const saved = localStorage.getItem(FX_STORAGE_KEY) as ArcadeFxStyle | null;
  if (saved && ownedFx.includes(saved) && ARCADE_FX_STYLES[saved]) {
    return saved;
  }
  return 'classic';
}

export function setActiveFx(style: ArcadeFxStyle): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(FX_STORAGE_KEY, style);
  window.dispatchEvent(new Event(FX_CHANGED));
}
