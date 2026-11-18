import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Heart,
  BookmarkX,
  MapPin,
  MoreVertical,
  Share2,
  Download,
  ShieldAlert,
  Info,
  X,
} from 'lucide-react';
import { Meme, MoodBoard } from '../types';
import { useCtaInkBurst, CtaInkBurstOverlay } from './CtaInkBurst';
import { memeDimensionCache, computeCanvasDimensions } from '../utils/dimensions';

export interface VaultPreviewSheetProps {
  isOpen: boolean;
  initialIndex: number;
  memes: Meme[];
  onClose: () => void;
  likedMemes: string[];
  onToggleLike: (meme: Meme) => void;
  onRemoveFromVault: (meme: Meme) => void;
  pinnedMemes: Meme[];
  moodBoards: MoodBoard[];
  onOpenPin: (meme: Meme) => void;
  onShare: (meme: Meme) => void;
  onDownload: (meme: Meme) => void;
  onOpenRedditInfo: (meme: Meme) => void;
  onOpenReport: (meme: Meme) => void;
}

export const VaultPreviewSheet: React.FC<VaultPreviewSheetProps> = ({
  isOpen,
  initialIndex,
  memes,
  onClose,
  likedMemes,
  onToggleLike,
  onRemoveFromVault,
  pinnedMemes,
  moodBoards,
  onOpenPin,
  onShare,
  onDownload,
  onOpenRedditInfo,
  onOpenReport,
}) => {
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const { ctaEffects, triggerCtaEffect } = useCtaInkBurst();

  // Drag & Swipe states
  const [dragX, setDragX] = useState(0);
  const [isDraggingTrack, setIsDraggingTrack] = useState(false);
  const [trackTransition, setTrackTransition] = useState<string>('none');
  const [sheetDragY, setSheetDragY] = useState(0);
  const [isDraggingSheet, setIsDraggingSheet] = useState(false);

  // Gesture tracking refs
  const touchStartPos = useRef<{ x: number; y: number; time: number } | null>(null);
  const gestureAxis = useRef<'horizontal' | 'vertical' | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const filmstripRef = useRef<HTMLDivElement | null>(null);
  const filmstripThumbsRef = useRef<(HTMLButtonElement | null)[]>([]);

  // Stage size for virtualized slides
  const [stageSize, setStageSize] = useState({ width: 360, height: 380 });

  // Sync activeIndex with initialIndex when modal opens
  useEffect(() => {
    if (isOpen) {
      const clamped = Math.max(0, Math.min(initialIndex, memes.length - 1));
      setActiveIndex(clamped);
      setDragX(0);
      setSheetDragY(0);
      setShowMoreMenu(false);
    }
  }, [isOpen, initialIndex, memes.length]);

  // Clamp activeIndex if memes list mutates (e.g. removal)
  useEffect(() => {
    if (memes.length === 0) {
      onClose();
    } else if (activeIndex >= memes.length) {
      setActiveIndex(memes.length - 1);
    }
  }, [memes.length, activeIndex, onClose]);

  // Measure stage size dynamically
  useEffect(() => {
    if (!stageRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setStageSize({ width: Math.round(width), height: Math.round(height) });
        }
      }
    });
    observer.observe(stageRef.current);
    return () => observer.disconnect();
  }, []);

  // Auto-center active thumbnail in filmstrip
  useEffect(() => {
    if (!isOpen) return;
    const activeThumb = filmstripThumbsRef.current[activeIndex];
    if (activeThumb) {
      activeThumb.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [activeIndex, isOpen]);

  // Android Hardware Back button handling (pushState + popstate LIFO)
  useEffect(() => {
    if (!isOpen) return;

    window.history.pushState({ memeCapsuleVaultPreview: true }, '');

    const handlePopState = () => {
      if (showMoreMenu) {
        setShowMoreMenu(false);
        window.history.pushState({ memeCapsuleVaultPreview: true }, '');
      } else {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showMoreMenu) {
          setShowMoreMenu(false);
        } else {
          onClose();
        }
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, showMoreMenu, onClose]);

  // Slide navigation handlers
  const handlePrev = useCallback(() => {
    if (activeIndex > 0) {
      setActiveIndex((prev) => prev - 1);
    }
  }, [activeIndex]);

  const handleNext = useCallback(() => {
    if (activeIndex < memes.length - 1) {
      setActiveIndex((prev) => prev + 1);
    }
  }, [activeIndex, memes.length]);

  const handleSelectIndex = (idx: number) => {
    if (idx === activeIndex || idx < 0 || idx >= memes.length) return;
    setShowMoreMenu(false);
    setActiveIndex(idx);
  };

  // Helper to compute tight aspect-ratio box dimensions
  const getFittedFrameStyle = useCallback(
    (memeItem?: Meme) => {
      if (!memeItem) return { width: 300, height: 300 };

      const cached = memeDimensionCache.get(memeItem.url);
      const availW = Math.max(stageSize.width - 24, 200);
      const availH = Math.max(stageSize.height - 16, 200);

      const dims = computeCanvasDimensions(cached?.width, cached?.height, availW, availH);
      return {
        width: `${dims.width}px`,
        height: `${dims.height}px`,
      };
    },
    [stageSize]
  );

  // --- Zone 2: Main Meme Stage Gesture Handlers ---
  const handleStagePointerDown = (e: React.PointerEvent) => {
    if (showMoreMenu) setShowMoreMenu(false);
    touchStartPos.current = { x: e.clientX, y: e.clientY, time: Date.now() };
    gestureAxis.current = null;
    setIsDraggingTrack(true);
    setTrackTransition('none');
  };

  const handleStagePointerMove = (e: React.PointerEvent) => {
    if (!touchStartPos.current || !isDraggingTrack) return;
    const dx = e.clientX - touchStartPos.current.x;
    const dy = e.clientY - touchStartPos.current.y;

    // 8px threshold to lock axis
    if (!gestureAxis.current) {
      if (Math.hypot(dx, dy) >= 8) {
        if (Math.abs(dx) > Math.abs(dy) * 1.15) {
          gestureAxis.current = 'horizontal';
        } else if (dy > 0 && Math.abs(dy) > Math.abs(dx) * 1.4) {
          gestureAxis.current = 'vertical';
          setIsDraggingSheet(true);
        }
      }
      return;
    }

    if (gestureAxis.current === 'horizontal') {
      // Damping at boundary
      let effectiveDx = dx;
      if (
        (activeIndex === 0 && dx > 0) ||
        (activeIndex === memes.length - 1 && dx < 0)
      ) {
        effectiveDx = dx * 0.28;
      }
      setDragX(effectiveDx);
    } else if (gestureAxis.current === 'vertical') {
      if (dy > 0) {
        setSheetDragY(dy);
      }
    }
  };

  const handleStagePointerUp = (e: React.PointerEvent) => {
    if (!touchStartPos.current) {
      setIsDraggingTrack(false);
      setIsDraggingSheet(false);
      return;
    }

    const dx = e.clientX - touchStartPos.current.x;
    const dy = e.clientY - touchStartPos.current.y;
    const dt = Math.max(1, Date.now() - touchStartPos.current.time);
    const vx = dx / dt;
    const vy = dy / dt;

    if (gestureAxis.current === 'horizontal') {
      const commitThreshold = Math.min(stageSize.width * 0.22, 72);
      const isQuickFlick = Math.abs(vx) > 0.35;

      // Swipe Left (dx < 0) -> Next
      if ((dx < -commitThreshold || (isQuickFlick && vx < -0.35)) && activeIndex < memes.length - 1) {
        setTrackTransition('transform 0.24s cubic-bezier(0.2, 0.9, 0.3, 1)');
        setDragX(-(stageSize.width + 20));
        setTimeout(() => {
          setActiveIndex((prev) => Math.min(memes.length - 1, prev + 1));
          setTrackTransition('none');
          setDragX(0);
        }, 240);
      }
      // Swipe Right (dx > 0) -> Prev
      else if ((dx > commitThreshold || (isQuickFlick && vx > 0.35)) && activeIndex > 0) {
        setTrackTransition('transform 0.24s cubic-bezier(0.2, 0.9, 0.3, 1)');
        setDragX(stageSize.width + 20);
        setTimeout(() => {
          setActiveIndex((prev) => Math.max(0, prev - 1));
          setTrackTransition('none');
          setDragX(0);
        }, 240);
      } else {
        // Snap back
        setTrackTransition('transform 0.22s cubic-bezier(0.2, 0.9, 0.3, 1)');
        setDragX(0);
      }
    } else if (gestureAxis.current === 'vertical') {
      const sheetHeight = window.innerHeight * 0.92;
      if (dy > sheetHeight * 0.24 || vy > 0.5) {
        onClose();
      } else {
        setSheetDragY(0);
      }
    }

    touchStartPos.current = null;
    gestureAxis.current = null;
    setIsDraggingTrack(false);
    setIsDraggingSheet(false);
  };

  // --- Zone 1: Top Handle Drag-to-Dismiss ---
  const handleSheetDragStart = (e: React.PointerEvent) => {
    touchStartPos.current = { x: e.clientX, y: e.clientY, time: Date.now() };
    setIsDraggingSheet(true);
  };

  const handleSheetDragMove = (e: React.PointerEvent) => {
    if (!isDraggingSheet || !touchStartPos.current) return;
    const dy = e.clientY - touchStartPos.current.y;
    if (dy > 0) {
      setSheetDragY(dy);
    }
  };

  const handleSheetDragEnd = (e: React.PointerEvent) => {
    if (!isDraggingSheet || !touchStartPos.current) return;
    const dy = e.clientY - touchStartPos.current.y;
    const dt = Math.max(1, Date.now() - touchStartPos.current.time);
    const vy = dy / dt;
    const sheetHeight = window.innerHeight * 0.92;

    if (dy > sheetHeight * 0.24 || vy > 0.5) {
      onClose();
    } else {
      setSheetDragY(0);
    }
    setIsDraggingSheet(false);
    touchStartPos.current = null;
  };

  if (!isOpen || memes.length === 0) return null;

  const currentMeme = memes[activeIndex] || memes[0];
  const isCurrentLiked = likedMemes.includes(currentMeme.url);
  const isCurrentPinned =
    pinnedMemes.some((p) => p.url === currentMeme.url) ||
    moodBoards.some((b) => b.memeUrls.includes(currentMeme.url));

  // 3-Slot Virtualized Track items
  const prevMeme = activeIndex > 0 ? memes[activeIndex - 1] : null;
  const nextMeme = activeIndex < memes.length - 1 ? memes[activeIndex + 1] : null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[1040] bg-black/80 backdrop-blur-sm select-none animate-in fade-in duration-200"
        onClick={() => {
          if (showMoreMenu) setShowMoreMenu(false);
          else onClose();
        }}
      />

      {/* Slide-Up Bottom Sheet */}
      <div
        className="fixed inset-x-0 bottom-0 z-[1045] max-h-[96vh] h-[92vh] flex flex-col bg-[#0e0d14] border-t-[4px] border-x-[4px] border-black shadow-[0px_-8px_32px_rgba(0,0,0,0.9)] animate-vault-sheet-enter select-none"
        style={{
          transform: sheetDragY > 0 ? `translate3d(0, ${sheetDragY}px, 0)` : undefined,
          transition: isDraggingSheet ? 'none' : 'transform 0.22s cubic-bezier(0.2, 0.9, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Zone 1: Top Handle & Header Bar */}
        <div
          className="w-full flex flex-col shrink-0 select-none cursor-grab active:cursor-grabbing touch-none"
          onPointerDown={handleSheetDragStart}
          onPointerMove={handleSheetDragMove}
          onPointerUp={handleSheetDragEnd}
          onPointerCancel={handleSheetDragEnd}
        >
          {/* Neo-Brutalist Drag Handle */}
          <div className="w-14 h-1.5 bg-[#f4c300] border border-black shadow-[1px_1px_0_#000] my-2 self-center rounded-none" />

          {/* Header Bar */}
          <div className="flex items-center justify-between px-4 py-1.5 border-b-[2px] border-black/40">
            {/* Counter Pill */}
            <div className="flex items-center gap-1.5 bg-[#1c1c1e] text-white border-[2px] border-black px-3 py-1 shadow-[2px_2px_0px_#000] font-mono font-black text-[12px] tracking-wider">
              <span className="text-[#f4c300] animate-counter-tick" key={activeIndex}>
                {activeIndex + 1}
              </span>
              <span className="text-neutral-500 mx-0.5">/</span>
              <span>{memes.length}</span>
            </div>

            {/* Source Meta Button (REDDIT vs REPORT) */}
            <div className="flex items-center gap-2">
              {currentMeme.source === 'Reddit' && (
                <button
                  type="button"
                  onClick={() => onOpenRedditInfo(currentMeme)}
                  className="flex items-center gap-1 px-2.5 py-1 bg-[#FF4500] hover:bg-[#ff5722] text-black border-[2px] border-black shadow-[2px_2px_0px_#000] font-mono font-black text-[11px] uppercase active:translate-x-0.5 active:translate-y-0.5 cursor-pointer transition-all"
                  title="View Reddit Source Metadata"
                >
                  <Info size={13} strokeWidth={2.8} />
                  <span>REDDIT</span>
                </button>
              )}

              {currentMeme.source !== 'Reddit' && (
                <button
                  type="button"
                  onClick={() => onOpenReport(currentMeme)}
                  className="flex items-center gap-1 px-2.5 py-1 bg-[#FF2A85] hover:bg-[#ff4395] text-white border-[2px] border-black shadow-[2px_2px_0px_#000] font-mono font-black text-[11px] uppercase active:translate-x-0.5 active:translate-y-0.5 cursor-pointer transition-all"
                  title="Report Curated Meme"
                >
                  <ShieldAlert size={13} strokeWidth={2.8} />
                  <span>REPORT</span>
                </button>
              )}

              {/* Close Button (✕) */}
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center bg-[#22212a] hover:bg-[#32303e] text-white border-[2px] border-black shadow-[2px_2px_0px_#000] font-mono font-black text-[14px] active:scale-95 cursor-pointer transition-all"
                title="Close preview sheet"
              >
                <X size={16} strokeWidth={3} />
              </button>
            </div>
          </div>
        </div>

        {/* Zone 2: Main Meme Stage (Horizontal 3-Slot Pager) */}
        <div
          ref={stageRef}
          className="flex-1 min-h-0 relative overflow-hidden flex items-center justify-center touch-pan-x select-none"
          onPointerDown={handleStagePointerDown}
          onPointerMove={handleStagePointerMove}
          onPointerUp={handleStagePointerUp}
          onPointerCancel={handleStagePointerUp}
        >
          {/* Virtualized 3-Slot Track */}
          <div
            className="w-full h-full relative flex items-center justify-center"
            style={{
              transform: `translate3d(${dragX}px, 0, 0)`,
              transition: trackTransition,
              willChange: 'transform',
            }}
          >
            {/* Slot -1: Previous Meme */}
            {prevMeme && (
              <div
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                style={{
                  transform: `translate3d(-${stageSize.width + 20}px, 0, 0)`,
                }}
              >
                <div
                  className="flex items-center justify-center border-[3px] border-[#9b30ff] shadow-[6px_6px_0px_#f4c300] bg-black overflow-hidden"
                  style={getFittedFrameStyle(prevMeme)}
                >
                  <img
                    src={prevMeme.url}
                    alt={prevMeme.title || 'Previous Meme'}
                    className="w-full h-full object-contain pointer-events-none select-none"
                    draggable={false}
                  />
                </div>
              </div>
            )}

            {/* Slot 0: Current Active Meme */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div
                className="flex items-center justify-center border-[3px] border-[#9b30ff] shadow-[6px_6px_0px_#f4c300] bg-black overflow-hidden"
                style={getFittedFrameStyle(currentMeme)}
              >
                <img
                  src={currentMeme.url}
                  alt={currentMeme.title || 'Current Meme'}
                  className="w-full h-full object-contain pointer-events-none select-none"
                  draggable={false}
                  onLoad={(e) => {
                    const img = e.currentTarget;
                    if (img.naturalWidth && img.naturalHeight) {
                      memeDimensionCache.set(currentMeme.url, {
                        width: img.naturalWidth,
                        height: img.naturalHeight,
                      });
                    }
                  }}
                />
              </div>
            </div>

            {/* Slot +1: Next Meme */}
            {nextMeme && (
              <div
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                style={{
                  transform: `translate3d(${stageSize.width + 20}px, 0, 0)`,
                }}
              >
                <div
                  className="flex items-center justify-center border-[3px] border-[#9b30ff] shadow-[6px_6px_0px_#f4c300] bg-black overflow-hidden"
                  style={getFittedFrameStyle(nextMeme)}
                >
                  <img
                    src={nextMeme.url}
                    alt={nextMeme.title || 'Next Meme'}
                    className="w-full h-full object-contain pointer-events-none select-none"
                    draggable={false}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Meme Meta Title & Author */}
        <div className="px-4 py-1 text-center shrink-0">
          <h3 className="font-label-xl text-[13px] sm:text-[14px] text-white font-bold truncate uppercase tracking-tight max-w-[90vw] mx-auto">
            {currentMeme.title || 'MEME CAPSULE DROP'}
          </h3>
          <p className="font-mono text-[10px] text-[#A855F7] mt-0.5 uppercase tracking-wide font-bold">
            @{currentMeme.author} {currentMeme.subreddit ? `• r/${currentMeme.subreddit}` : ''}
          </p>
        </div>

        {/* Home-Screen-Matched 4-Button CTA Row */}
        <nav
          id="vaultCtaRow"
          className="grid grid-cols-4 gap-2.5 w-full max-w-[356px] relative select-none mt-1 self-center shrink-0 px-2 z-30"
        >
          {/* Dismiss backdrop when #moreMenu popover is open */}
          {showMoreMenu && (
            <div
              className="fixed inset-0 z-40 bg-black/30 animate-fadeIn"
              onClick={(e) => {
                e.stopPropagation();
                setShowMoreMenu(false);
              }}
            />
          )}

          {/* 1. LIKE */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowMoreMenu(false);
              triggerCtaEffect('like', '#FF2A85', e);
              onToggleLike(currentMeme);
            }}
            className="mc-cta-btn h-[54px] flex flex-col items-center justify-center gap-1 relative cursor-pointer"
            style={{
              background: isCurrentLiked
                ? '#FF2A85'
                : 'linear-gradient(180deg, #1e1318 0%, #151113 100%)',
              borderColor: isCurrentLiked ? '#000000' : '#FF2A85',
              color: isCurrentLiked ? '#000000' : '#FF2A85',
            }}
            aria-label="Like meme"
          >
            <CtaInkBurstOverlay btnKey="like" accentHex="#FF2A85" ctaEffects={ctaEffects} />
            <div
              key={ctaEffects.key === 'like' ? `icon-${ctaEffects.tick}` : 'icon-like'}
              className={`relative z-10 flex items-center justify-center ${
                ctaEffects.key === 'like' ? 'animate-burst' : ''
              }`}
            >
              <Heart
                size={22}
                strokeWidth={2.6}
                fill={isCurrentLiked ? '#000000' : 'none'}
                color={isCurrentLiked ? '#000000' : '#FF2A85'}
              />
            </div>
            <span
              className="relative z-10 font-mono font-bold text-[10px] uppercase tracking-wider leading-none"
              style={{ color: isCurrentLiked ? '#000000' : '#FF2A85' }}
            >
              {isCurrentLiked ? 'LIKED' : 'LIKE'}
            </span>
          </button>

          {/* 2. REMOVE FROM VAULT */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowMoreMenu(false);
              triggerCtaEffect('vault', '#A855F7', e);
              onRemoveFromVault(currentMeme);
            }}
            className="mc-cta-btn h-[54px] flex flex-col items-center justify-center gap-1 relative cursor-pointer"
            style={{
              background: '#A855F7',
              borderColor: '#000000',
              color: '#000000',
            }}
            aria-label="Remove from Vault"
          >
            <CtaInkBurstOverlay btnKey="vault" accentHex="#A855F7" ctaEffects={ctaEffects} />
            <div
              key={ctaEffects.key === 'vault' ? `icon-${ctaEffects.tick}` : 'icon-vault'}
              className={`relative z-10 flex items-center justify-center ${
                ctaEffects.key === 'vault' ? 'animate-burst' : ''
              }`}
            >
              <BookmarkX size={22} strokeWidth={2.6} color="#000000" />
            </div>
            <span className="relative z-10 font-mono font-bold text-[10px] uppercase tracking-wider leading-none text-black">
              REMOVE
            </span>
          </button>

          {/* 3. PIN TO MOOD BOARD */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowMoreMenu(false);
              triggerCtaEffect('pin', '#FACC15', e);
              onOpenPin(currentMeme);
            }}
            className="mc-cta-btn h-[54px] flex flex-col items-center justify-center gap-1 relative cursor-pointer"
            style={{
              background: isCurrentPinned
                ? '#FACC15'
                : 'linear-gradient(180deg, #231e12 0%, #171510 100%)',
              borderColor: isCurrentPinned ? '#000000' : '#FACC15',
              color: isCurrentPinned ? '#000000' : '#FACC15',
            }}
            aria-label="Pin meme to board"
          >
            <CtaInkBurstOverlay btnKey="pin" accentHex="#FACC15" ctaEffects={ctaEffects} />
            <div
              key={ctaEffects.key === 'pin' ? `icon-${ctaEffects.tick}` : 'icon-pin'}
              className={`relative z-10 flex items-center justify-center ${
                ctaEffects.key === 'pin' ? 'animate-burst' : ''
              }`}
            >
              <MapPin
                size={22}
                strokeWidth={2.6}
                fill={isCurrentPinned ? '#000000' : 'none'}
                color={isCurrentPinned ? '#000000' : '#FACC15'}
              />
            </div>
            <span
              className="relative z-10 font-mono font-bold text-[10px] uppercase tracking-wider leading-none"
              style={{ color: isCurrentPinned ? '#000000' : '#FACC15' }}
            >
              {isCurrentPinned ? 'PINNED' : 'PIN'}
            </span>
          </button>

          {/* 4. MORE (⋮) */}
          <div className="relative flex">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                triggerCtaEffect('more', '#00E5FF', e);
                setShowMoreMenu((prev) => !prev);
              }}
              className="mc-cta-btn h-[54px] w-full flex flex-col items-center justify-center gap-1 relative cursor-pointer"
              style={{
                background: showMoreMenu
                  ? '#00E5FF'
                  : 'linear-gradient(180deg, #111a1f 0%, #0f1418 100%)',
                borderColor: showMoreMenu ? '#000000' : '#00E5FF',
                color: showMoreMenu ? '#000000' : '#00E5FF',
              }}
              aria-expanded={showMoreMenu}
              aria-label="More options"
            >
              <CtaInkBurstOverlay btnKey="more" accentHex="#00E5FF" ctaEffects={ctaEffects} />
              <div
                key={ctaEffects.key === 'more' ? `icon-${ctaEffects.tick}` : 'icon-more'}
                className={`relative z-10 flex items-center justify-center ${
                  ctaEffects.key === 'more' ? 'animate-burst' : ''
                }`}
              >
                <MoreVertical
                  size={22}
                  strokeWidth={2.8}
                  color={showMoreMenu ? '#000000' : '#00E5FF'}
                />
              </div>
              <span
                className="relative z-10 font-mono font-bold text-[10px] uppercase tracking-wider leading-none"
                style={{ color: showMoreMenu ? '#000000' : '#00E5FF' }}
              >
                MORE
              </span>
            </button>

            {/* Upward Popover Menu (#moreMenu) */}
            {showMoreMenu && (
              <div
                id="moreMenu"
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 bottom-full mb-3 w-48 bg-white border-4 border-black shadow-[4px_4px_0px_#000000] z-50 flex flex-col divide-y-4 divide-black animate-more-menu select-none"
              >
                {/* 1. SHARE (#A855F7) */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMoreMenu(false);
                    onShare(currentMeme);
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-3 bg-[#A855F7] hover:brightness-105 active:brightness-95 text-black font-mono font-bold text-[13px] uppercase tracking-wider cursor-pointer text-left transition-all"
                >
                  <Share2 size={17} strokeWidth={2.6} color="#000000" className="shrink-0" />
                  <span>SHARE</span>
                </button>

                {/* 2. DOWNLOAD (#FACC15) */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMoreMenu(false);
                    onDownload(currentMeme);
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-3 bg-[#FACC15] hover:brightness-105 active:brightness-95 text-black font-mono font-bold text-[13px] uppercase tracking-wider cursor-pointer text-left transition-all"
                >
                  <Download size={17} strokeWidth={2.6} color="#000000" className="shrink-0" />
                  <span>DOWNLOAD</span>
                </button>

                {/* 3. REPORT (#FF2A85) */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMoreMenu(false);
                    onOpenReport(currentMeme);
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-3 bg-[#FF2A85] hover:brightness-105 active:brightness-95 text-black font-mono font-bold text-[13px] uppercase tracking-wider cursor-pointer text-left transition-all"
                >
                  <ShieldAlert size={17} strokeWidth={2.6} color="#000000" className="shrink-0" />
                  <span>REPORT</span>
                </button>
              </div>
            )}
          </div>
        </nav>

        {/* Zone 3: Bottom Horizontal Filmstrip */}
        <div
          ref={filmstripRef}
          className="w-full max-w-[500px] self-center mt-2.5 px-3 py-1.5 overflow-x-auto scrollbar-none flex items-center gap-2 select-none shrink-0"
          style={{
            touchAction: 'pan-x',
            WebkitOverflowScrolling: 'touch',
            overscrollBehaviorX: 'contain',
            paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)',
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
        >
          {memes.map((m, idx) => {
            const isActive = idx === activeIndex;
            return (
              <button
                key={`${m.url}-${idx}`}
                ref={(el) => {
                  filmstripThumbsRef.current[idx] = el;
                }}
                type="button"
                onClick={() => handleSelectIndex(idx)}
                className={`w-[52px] h-[52px] shrink-0 bg-black overflow-hidden relative cursor-pointer transition-all duration-150 ${
                  isActive
                    ? 'border-[3px] border-[#f4c300] shadow-[2px_2px_0px_#000] scale-105 opacity-100 z-10'
                    : 'border-[2px] border-black/80 opacity-55 hover:opacity-90'
                }`}
                title={`Meme ${idx + 1}`}
              >
                <img
                  src={m.url}
                  alt={m.title || `Thumbnail ${idx + 1}`}
                  className="w-full h-full object-cover pointer-events-none"
                  loading="lazy"
                />
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};
