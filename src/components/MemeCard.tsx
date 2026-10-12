import React, { useState, useEffect } from 'react';
import { animated } from '@react-spring/web';
import {
  Download,
  Flag,
  Share2,
} from 'lucide-react';
import type { Meme } from '../types';
import { memeDimensionCache } from '../utils/dimensions';

interface MemeCardProps {
  meme: Meme;
  position: number;
  style: any;
  bind?: any;
  isDragging?: boolean;
  isLoading?: boolean;
  shakeCard?: boolean;
  shakeClass?: string;
  memeFeedback?: string | null;
  floatingReaction?: string | null;
  onDimensionsLoaded?: (dims: { width: number; height: number }) => void;
  // Action Handlers for active card (position 0)
  isLiked?: boolean;
  onToggleLike?: () => void;
  reactionEmoji?: string;
  onOpenReactionPicker?: () => void;
  onShare?: () => void;
  onDownload?: () => void;
  isFavorited?: boolean;
  onToggleFavorite?: () => void;
  onOpenBoardPicker?: () => void;
  isPinnedToBoard?: boolean;
  onOpenReport?: () => void;
  onImagePointerDown?: () => void;
  onImagePointerUp?: () => void;
}

export const MemeCard: React.FC<MemeCardProps> = ({
  meme,
  position,
  style,
  bind,
  isDragging = false,
  isLoading = false,
  shakeCard = false,
  shakeClass = 'animate-shake',
  memeFeedback = null,
  floatingReaction = null,
  onDimensionsLoaded,
  isLiked = false,
  onToggleLike,
  reactionEmoji,
  onOpenReactionPicker,
  onShare,
  onDownload,
  isFavorited = false,
  onToggleFavorite,
  onOpenBoardPicker,
  isPinnedToBoard = false,
  onOpenReport,
  onImagePointerDown,
  onImagePointerUp,
}) => {
  const imgRef = React.useRef<HTMLImageElement>(null);
  const retryCountRef = React.useRef<number>(0);
  const [imageLoaded, setImageLoaded] = useState<boolean>(() => {
    return Boolean(meme.url && memeDimensionCache.has(meme.url));
  });
  const [imageError, setImageError] = useState(false);
  const [memeDimensions, setMemeDimensions] = useState<{ width: number; height: number } | null>(() => {
    return meme.url ? memeDimensionCache.get(meme.url) || null : null;
  });
  const isActive = position === 0;

  const handleImageSuccess = React.useCallback((naturalWidth: number, naturalHeight: number) => {
    retryCountRef.current = 0;
    setImageLoaded(true);
    setImageError(false);
    if (naturalWidth && naturalHeight) {
      const dims = { width: naturalWidth, height: naturalHeight };
      setMemeDimensions(dims);
      if (meme.url) {
        memeDimensionCache.set(meme.url, dims);
      }
      if (isActive && onDimensionsLoaded) {
        onDimensionsLoaded(dims);
      }
    }
  }, [isActive, onDimensionsLoaded, meme.url]);

  useEffect(() => {
    retryCountRef.current = 0;
    const cached = meme.url ? memeDimensionCache.get(meme.url) : null;
    if (cached) {
      setMemeDimensions(cached);
      setImageLoaded(true);
      if (isActive && onDimensionsLoaded) {
        onDimensionsLoaded(cached);
      }
    } else if (imgRef.current?.complete && imgRef.current?.naturalWidth > 0) {
      handleImageSuccess(imgRef.current.naturalWidth, imgRef.current.naturalHeight);
    } else {
      setMemeDimensions(null);
      setImageLoaded(false);
    }
    setImageError(false);
  }, [meme.url, handleImageSuccess, isActive, onDimensionsLoaded]);

  // Recover seamlessly when returning to the app from an external share intent or background
  useEffect(() => {
    const handleVisibilityResume = () => {
      if (document.visibilityState !== 'visible' || !meme.url) return;
      const imgEl = imgRef.current;
      if (imgEl && imgEl.complete && imgEl.naturalWidth > 0) {
        handleImageSuccess(imgEl.naturalWidth, imgEl.naturalHeight);
      } else if (imageError || (imgEl && !imgEl.complete)) {
        setImageError(false);
        if (imgEl) {
          imgEl.src = meme.url;
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityResume);
    window.addEventListener('focus', handleVisibilityResume);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityResume);
      window.removeEventListener('focus', handleVisibilityResume);
    };
  }, [meme.url, imageError, handleImageSuccess]);

  // When card transitions to active position (position 0), report dimensions if available
  useEffect(() => {
    if (isActive) {
      const cached = meme.url ? memeDimensionCache.get(meme.url) : null;
      if (cached && onDimensionsLoaded) {
        onDimensionsLoaded(cached);
      } else if (imgRef.current?.complete && imgRef.current?.naturalWidth > 0) {
        handleImageSuccess(imgRef.current.naturalWidth, imgRef.current.naturalHeight);
      }
    }
  }, [isActive, meme.url, onDimensionsLoaded, handleImageSuccess]);

  // Safety timer: Never leave user stuck on DECRYPTING... for more than 2.5s if card is active
  useEffect(() => {
    if (isActive && !imageLoaded && !imageError) {
      const timer = setTimeout(() => {
        if (imgRef.current?.complete && imgRef.current?.naturalWidth > 0) {
          handleImageSuccess(imgRef.current.naturalWidth, imgRef.current.naturalHeight);
        } else {
          // Dismiss shimmer so whatever bytes arrived or browser rendering can be seen
          setImageLoaded(true);
        }
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [isActive, imageLoaded, imageError, handleImageSuccess]);

  // Bind handlers only on the active front card
  const gestureBindings = isActive && bind ? bind() : {};

  const lastActionTimeRef = React.useRef<number>(0);

  // Instant, single-try touch/click trigger for mobile WebView & desktop
  const createTapProps = (action: () => void) => {
    const execute = (e: React.SyntheticEvent) => {
      e.stopPropagation();
      if ('preventDefault' in e && e.type !== 'touchstart') {
        e.preventDefault();
      }
      const now = Date.now();
      if (now - lastActionTimeRef.current < 400) return;
      lastActionTimeRef.current = now;
      action();
    };

    return {
      onPointerDown: (e: React.PointerEvent) => execute(e),
      onTouchStart: (e: React.TouchEvent) => execute(e),
      onClick: (e: React.MouseEvent) => execute(e),
      onPointerUp: (e: React.PointerEvent) => {
        e.stopPropagation();
      },
      onTouchEnd: (e: React.TouchEvent) => {
        e.stopPropagation();
      },
    };
  };

  return (
    <animated.div
      {...gestureBindings}
      style={{
        ...style,
        border: '3px solid #9b30ff',
        borderRadius: '0px',
        background: '#1c1b1b',
        overflow: 'hidden',
        width: '100%',
        height: '100%',
        position: 'absolute',
        pointerEvents: isActive ? 'auto' : 'none',
        cursor: isActive ? (isDragging ? 'grabbing' : 'grab') : 'default',
        touchAction: isActive ? 'none' : 'auto',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
      className={`select-none ${isActive && shakeCard ? shakeClass : ''}`}
    >
      {/* Image Area */}
      <div
        className="w-full h-full relative overflow-hidden bg-[#131313] flex items-center justify-center"
        onPointerDown={isActive ? onImagePointerDown : undefined}
        onPointerUp={isActive ? onImagePointerUp : undefined}
        onPointerCancel={isActive ? onImagePointerUp : undefined}
        onPointerMove={isActive ? onImagePointerUp : undefined}
      >
        {meme.url ? (
          <img
            ref={imgRef}
            src={meme.url}
            alt={meme.title || 'Meme'}
            onLoad={(e) => {
              const target = e.currentTarget;
              handleImageSuccess(target.naturalWidth, target.naturalHeight);
            }}
            onError={() => {
              if (document.visibilityState === 'hidden') {
                // Ignore background socket cancellation; visibilitychange listener will recover on resume
                return;
              }
              if (retryCountRef.current < 2 && meme.url) {
                retryCountRef.current += 1;
                setTimeout(() => {
                  if (imgRef.current && meme.url) {
                    imgRef.current.src = meme.url;
                  }
                }, 400 * retryCountRef.current);
                return;
              }
              console.warn('Image load error for meme:', meme.url);
              setImageError(true);
              setImageLoaded(true);
            }}
            className="w-full h-full object-contain pointer-events-none select-none"
            loading={isActive || position === 1 ? 'eager' : 'lazy'}
            draggable={false}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#988ca1] font-label-md text-[12px] uppercase">
            MEME READY
          </div>
        )}

        {/* Loading Shimmer Overlay (Active Card Only) */}
        {isActive && !imageError && (isLoading || !imageLoaded) && (
          <div className="absolute inset-0 z-30 loading-shimmer opacity-90 flex flex-col items-center justify-center">
            <span className="font-label-xl text-[14px] text-white tracking-widest uppercase bg-black/60 px-3 py-1 border border-primary-container">
              DECRYPTING...
            </span>
          </div>
        )}

        {/* Broken / Corrupted Image State */}
        {imageError && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-surface-container-highest p-4 text-center">
            <span className="font-label-xl text-[13px] text-tertiary uppercase tracking-wider mb-2">
              SIGNAL CORRUPTED
            </span>
            <span className="font-body-md text-[11px] text-outline uppercase">
              SWIPE TO SKIP TO NEXT MEME
            </span>
          </div>
        )}

        {/* Reaction badge (if user assigned emoji reaction to this meme) */}
        {reactionEmoji && (
          <div className="absolute top-[12px] right-[12px] z-20 bg-background/90 border-[2px] border-outline px-1.5 py-0.5 text-[18px] leading-none pointer-events-none shadow-[2px_2px_0px_0px_#000]">
            {reactionEmoji}
          </div>
        )}

        {/* Floating Reaction Animation Overlay (e.g. 💀, 🔥 floating up) */}
        {isActive && floatingReaction && (
          <div className="absolute inset-0 z-35 flex items-center justify-center pointer-events-none">
            <span className="text-[70px] animate-reaction-float select-none">{floatingReaction}</span>
          </div>
        )}

        {/* Double-Tap Reaction Overlay (DANK!, CRINGE!, etc.) */}
        {isActive && memeFeedback && (
          <div className="absolute inset-0 z-25 flex items-center justify-center pointer-events-none">
            <span className="font-headline-xl text-[48px] text-secondary-container text-stroke-yellow -rotate-[12deg] skew-x-[-10deg] neo-shadow-pink uppercase select-none animate-ping">
              {memeFeedback}
            </span>
          </div>
        )}
      </div>

      {/* Bottom Label Strip (Reddit Attribution — Active Card Only) */}
      {isActive && (
        <div
          className="absolute bottom-0 w-full z-30 flex items-center justify-between px-[16px] py-[10px] pointer-events-none"
          style={{
            background: 'linear-gradient(transparent, rgba(13, 13, 13, 0.95))',
            fontFamily: 'Oswald, sans-serif',
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: '#988ca1',
          }}
        >
          {meme.source === 'Reddit' ? (
            <div className="flex flex-col min-w-0 pr-2 max-w-[75%]">
              <span className="text-white font-bold text-[13px] truncate leading-tight drop-shadow-[1px_1px_0px_#000]">
                {meme.title || 'UNTITLED MASTERPIECE'}
              </span>
              <span className="text-[#988ca1] text-[10px] truncate leading-tight mt-0.5">
                @{meme.author || 'reddit'} • r/{meme.subreddit}
              </span>
            </div>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
            {meme.source === 'Reddit' && (
              <span className="text-[9px] border border-outline/40 px-1 py-0.5 text-secondary">
                REDDIT
              </span>
            )}
          </div>
        </div>
      )}
    </animated.div>
  );
};
