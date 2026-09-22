import React, { useState, useEffect } from 'react';
import { animated } from '@react-spring/web';
import {
  Download,
  Flag,
  Share2,
} from 'lucide-react';
import type { Meme } from '../types';

interface MemeCardProps {
  meme: Meme;
  position: number;
  style: any;
  bind?: any;
  isDragging?: boolean;
  isLoading?: boolean;
  shakeCard?: boolean;
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
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [memeDimensions, setMemeDimensions] = useState<{ width: number; height: number } | null>(null);
  const isActive = position === 0;

  const handleImageSuccess = React.useCallback((naturalWidth: number, naturalHeight: number) => {
    setImageLoaded(true);
    setImageError(false);
    if (naturalWidth && naturalHeight) {
      const dims = { width: naturalWidth, height: naturalHeight };
      setMemeDimensions(dims);
      if (isActive && onDimensionsLoaded) {
        onDimensionsLoaded(dims);
      }
    }
  }, [isActive, onDimensionsLoaded]);

  useEffect(() => {
    setMemeDimensions(null);
    setImageLoaded(false);
    setImageError(false);

    // Immediate cached image check: if already complete in browser/WebView cache
    if (imgRef.current?.complete && imgRef.current?.naturalWidth > 0) {
      handleImageSuccess(imgRef.current.naturalWidth, imgRef.current.naturalHeight);
    }
  }, [meme.url, handleImageSuccess]);

  // When card transitions to active position (position 0), check if image already completed
  useEffect(() => {
    if (isActive && imgRef.current?.complete && imgRef.current?.naturalWidth > 0) {
      handleImageSuccess(imgRef.current.naturalWidth, imgRef.current.naturalHeight);
    }
  }, [isActive, handleImageSuccess]);

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

  return (
    <animated.div
      {...gestureBindings}
      style={{
        ...style,
        border: '3px solid #9b30ff',
        borderRadius: '0px',
        background: '#1c1b1b',
        overflow: 'hidden',
        width: 'min(85vw, 380px)',
        aspectRatio: memeDimensions ? `${memeDimensions.width} / ${memeDimensions.height}` : '4/3',
        minHeight: '200px',
        maxHeight: '75vh',
        position: 'absolute',
        cursor: isActive ? (isDragging ? 'grabbing' : 'grab') : 'default',
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
      className={`select-none ${isActive && shakeCard ? 'animate-shake' : ''}`}
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

        {/* Double-Tap Reaction Overlay (DANK!, CRINGE!, etc.) - sits above image, below label strip */}
        {isActive && memeFeedback && (
          <div className="absolute inset-0 z-25 flex items-center justify-center pointer-events-none">
            <span className="font-headline-xl text-[48px] text-secondary-container text-stroke-yellow -rotate-[12deg] skew-x-[-10deg] neo-shadow-pink uppercase select-none animate-ping">
              {memeFeedback}
            </span>
          </div>
        )}

        {/* Download + Share Overlay (Top-Right, Active Card Only) */}
        {isActive && (
          <div
            className="absolute top-[10px] right-[10px] z-20 flex items-center gap-2 pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {onDownload && (
              <button
                type="button"
                onClick={onDownload}
                title="Download"
                style={{
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(13, 13, 13, 0.75)',
                  border: '1.5px solid #f4c300',
                  borderRadius: '0px',
                  color: '#f4c300',
                  backdropFilter: 'blur(4px)',
                  WebkitBackdropFilter: 'blur(4px)',
                  cursor: 'pointer',
                }}
              >
                <Download size={20} strokeWidth={2.5} />
              </button>
            )}
            {onShare && (
              <button
                type="button"
                onClick={onShare}
                title="Share"
                style={{
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(13, 13, 13, 0.75)',
                  border: '1.5px solid #9b30ff',
                  borderRadius: '0px',
                  color: '#9b30ff',
                  backdropFilter: 'blur(4px)',
                  WebkitBackdropFilter: 'blur(4px)',
                  cursor: 'pointer',
                }}
              >
                <Share2 size={20} strokeWidth={2.5} />
              </button>
            )}
          </div>
        )}

        {/* Report Overlay (Bottom-Right, Active Card Only) — icon only */}
        {isActive && onOpenReport && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onOpenReport(); }}
            onPointerDown={(e) => e.stopPropagation()}
            title="Report meme"
            style={{
              position: 'absolute',
              bottom: '10px',
              right: '10px',
              zIndex: 20,
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(13, 13, 13, 0.6)',
              border: '1px solid #988ca1',
              borderRadius: '0px',
              color: '#988ca1',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
              cursor: 'pointer',
            }}
            className="pointer-events-auto"
          >
            <Flag size={16} />
          </button>
        )}

        {/* Bottom Label Strip (Reddit Attribution — Active Card Only) */}
        {isActive && (
          <div
            className="absolute bottom-0 w-full z-20 flex items-center justify-between px-[16px] py-[10px] pointer-events-auto"
            style={{
              background: 'linear-gradient(transparent, rgba(13, 13, 13, 0.95))',
              fontFamily: 'Oswald, sans-serif',
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#988ca1',
            }}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
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
      </div>
    </animated.div>
  );
};
