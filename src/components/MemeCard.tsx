import React, { useState, useEffect } from 'react';
import { animated } from '@react-spring/web';
import {
  Bookmark,
  Download,
  Flag,
  Heart,
  LayoutGrid,
  Share2,
  Smile,
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
  const [imageLoaded, setImageLoaded] = useState(false);
  const [memeDimensions, setMemeDimensions] = useState<{ width: number; height: number } | null>(null);
  const isActive = position === 0;

  useEffect(() => {
    setMemeDimensions(null);
    setImageLoaded(false);
  }, [meme.url]);

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
            src={meme.url}
            alt={meme.title || 'Meme'}
            onLoad={(e) => {
              setImageLoaded(true);
              const target = e.currentTarget;
              if (target.naturalWidth && target.naturalHeight) {
                const dims = { width: target.naturalWidth, height: target.naturalHeight };
                setMemeDimensions(dims);
                if (isActive && onDimensionsLoaded) {
                  onDimensionsLoaded(dims);
                }
              }
            }}
            className="w-full h-full object-contain pointer-events-none select-none"
            loading={isActive ? 'eager' : 'lazy'}
            draggable={false}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#988ca1] font-label-md text-[12px] uppercase">
            MEME READY
          </div>
        )}

        {/* Loading Shimmer Overlay (Active Card Only) */}
        {isActive && (isLoading || !imageLoaded) && (
          <div className="absolute inset-0 z-30 loading-shimmer opacity-90 flex flex-col items-center justify-center">
            <span className="font-label-xl text-[14px] text-white tracking-widest uppercase bg-black/60 px-3 py-1 border border-primary-container">
              DECRYPTING...
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

        {/* Floating Action Rail (Active Card Only) */}
        {isActive && (
          <div
            className="absolute right-2 bottom-12 z-30 flex flex-col items-center gap-1.5 pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {/* Like */}
            {onToggleLike && (
              <button
                type="button"
                onClick={onToggleLike}
                title="Like meme"
                className={`floating-action-btn ${isLiked ? 'bg-tertiary-container/95' : ''}`}
                style={{ width: '34px', height: '34px' }}
              >
                <Heart
                  size={16}
                  strokeWidth={2.5}
                  className={isLiked ? 'text-on-tertiary-container' : 'text-white'}
                  fill={isLiked ? 'currentColor' : 'none'}
                />
              </button>
            )}

            {/* Quick React */}
            {onOpenReactionPicker && (
              <button
                type="button"
                onClick={onOpenReactionPicker}
                title="React"
                className={`floating-action-btn ${reactionEmoji ? 'bg-secondary-container/95' : ''}`}
                style={{ width: '34px', height: '34px' }}
              >
                {reactionEmoji ? (
                  <span className="text-[16px] leading-none">{reactionEmoji}</span>
                ) : (
                  <Smile size={16} strokeWidth={2.5} className="text-white" />
                )}
              </button>
            )}

            {/* Share */}
            {onShare && (
              <button
                type="button"
                onClick={onShare}
                title="Share"
                className="floating-action-btn"
                style={{ width: '34px', height: '34px' }}
              >
                <Share2 size={16} strokeWidth={2.5} className="text-white" />
              </button>
            )}

            {/* Download */}
            {onDownload && (
              <button
                type="button"
                onClick={onDownload}
                title="Save image"
                className="floating-action-btn"
                style={{ width: '34px', height: '34px' }}
              >
                <Download size={16} strokeWidth={2.5} className="text-white" />
              </button>
            )}

            {/* Vault */}
            {onToggleFavorite && (
              <button
                type="button"
                onClick={onToggleFavorite}
                title="Add to Vault"
                className={`floating-action-btn ${isFavorited ? 'bg-secondary-container/95' : ''}`}
                style={{ width: '34px', height: '34px' }}
              >
                <Bookmark
                  size={16}
                  strokeWidth={2.5}
                  className={isFavorited ? 'text-on-secondary-container' : 'text-white'}
                  fill={isFavorited ? 'currentColor' : 'none'}
                />
              </button>
            )}

            {/* Pin to Board */}
            {onOpenBoardPicker && (
              <button
                type="button"
                onClick={onOpenBoardPicker}
                title="Pin to Mood Board"
                className={`floating-action-btn ${isPinnedToBoard ? 'bg-primary-container/95' : ''}`}
                style={{ width: '34px', height: '34px' }}
              >
                <LayoutGrid size={15} strokeWidth={2.5} className="text-white" />
              </button>
            )}
          </div>
        )}

        {/* Bottom Label Strip (Always visible on active card) */}
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
              <div className="flex flex-col min-w-0 pr-2 max-w-[65%]">
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
              {onOpenReport && (
                <button
                  type="button"
                  onClick={onOpenReport}
                  className="flex items-center gap-0.5 text-error text-[9px] border border-error/50 px-1 py-0.5 bg-error-container/30 hover:bg-error-container/60 active:scale-95 transition-all"
                  title="Report meme"
                >
                  <Flag size={9} />
                  <span>REPORT</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </animated.div>
  );
};
