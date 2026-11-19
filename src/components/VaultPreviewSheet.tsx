import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Heart,
  BookmarkX,
  MapPin,
  MoreVertical,
  Share2,
  Download,
  Flag,
} from 'lucide-react';
import type { Meme, MoodBoard } from '../types';
import { useCtaInkBurst, CtaInkBurstOverlay } from './CtaInkBurst';
import { memeDimensionCache } from '../utils/dimensions';

export interface VaultPreviewSheetProps {
  isOpen: boolean;
  initialIndex: number;
  memes: Meme[];
  onClose: () => void;
  onIndexChange?: (newIndex: number) => void;
  likedMemes: string[];
  onToggleLike: (meme: Meme) => void;
  onRemoveMeme?: (meme: Meme) => void;
  onRemoveFromVault?: (meme: Meme) => void;
  pinnedMemes?: Meme[];
  moodBoards?: MoodBoard[];
  onOpenPinModal?: (meme: Meme) => void;
  onOpenPin?: (meme: Meme) => void;
  onShareMeme?: (meme: Meme) => void;
  onShare?: (meme: Meme) => void;
  onDownloadMeme?: (meme: Meme) => void;
  onDownload?: (meme: Meme) => void;
  onOpenReportModal?: (meme: Meme) => void;
  onOpenReport?: (meme: Meme) => void;
  onOpenRedditModal?: (meme: Meme) => void;
  onOpenRedditInfo?: (meme: Meme) => void;
}

export const VaultPreviewSheet: React.FC<VaultPreviewSheetProps> = ({
  isOpen,
  initialIndex,
  memes,
  onClose,
  onIndexChange,
  likedMemes,
  onToggleLike,
  onRemoveMeme,
  onRemoveFromVault,
  pinnedMemes = [],
  moodBoards = [],
  onOpenPinModal,
  onOpenPin,
  onShareMeme,
  onShare,
  onDownloadMeme,
  onDownload,
  onOpenReportModal,
  onOpenReport,
  onOpenRedditModal,
  onOpenRedditInfo,
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

  // Dimension cache map for smooth non-letterboxed frame hugging
  const [imageDims, setImageDims] = useState<Record<string, { width: number; height: number }>>({});

  // Gesture tracking refs
  const touchStartPos = useRef<{ x: number; y: number; time: number } | null>(null);
  const gestureAxis = useRef<'horizontal' | 'vertical' | null>(null);
  const isAnimatingRef = useRef<boolean>(false);
  const stageRef = useRef<HTMLElement | null>(null);
  const filmstripThumbsRef = useRef<(HTMLDivElement | null)[]>([]);

  // Stage dimensions measured dynamically via ResizeObserver
  const [stageSize, setStageSize] = useState({ width: 360, height: 380 });

  // Fallback Action Dispatchers
  const handleRemove = useCallback(
    (target: Meme) => {
      if (onRemoveMeme) onRemoveMeme(target);
      else if (onRemoveFromVault) onRemoveFromVault(target);
    },
    [onRemoveMeme, onRemoveFromVault]
  );

  const handleOpenPin = useCallback(
    (target: Meme) => {
      if (onOpenPinModal) onOpenPinModal(target);
      else if (onOpenPin) onOpenPin(target);
    },
    [onOpenPinModal, onOpenPin]
  );

  const handleShare = useCallback(
    (target: Meme) => {
      if (onShareMeme) onShareMeme(target);
      else if (onShare) onShare(target);
    },
    [onShareMeme, onShare]
  );

  const handleDownload = useCallback(
    (target: Meme) => {
      if (onDownloadMeme) onDownloadMeme(target);
      else if (onDownload) onDownload(target);
    },
    [onDownloadMeme, onDownload]
  );

  const handleReport = useCallback(
    (target: Meme) => {
      if (onOpenReportModal) onOpenReportModal(target);
      else if (onOpenReport) onOpenReport(target);
    },
    [onOpenReportModal, onOpenReport]
  );

  const handleReddit = useCallback(
    (target: Meme) => {
      if (onOpenRedditModal) onOpenRedditModal(target);
      else if (onOpenRedditInfo) onOpenRedditInfo(target);
    },
    [onOpenRedditModal, onOpenRedditInfo]
  );

  // Sync activeIndex with initialIndex when modal opens
  useEffect(() => {
    if (isOpen) {
      const clamped = Math.max(0, Math.min(initialIndex, memes.length - 1));
      setActiveIndex(clamped);
      setDragX(0);
      setSheetDragY(0);
      setShowMoreMenu(false);
      isAnimatingRef.current = false;
    }
  }, [isOpen, initialIndex, memes.length]);

  // Clamp activeIndex if memes list mutates (e.g. meme removal)
  useEffect(() => {
    if (memes.length === 0) {
      onClose();
    } else if (activeIndex >= memes.length) {
      const nextIdx = memes.length - 1;
      setActiveIndex(nextIdx);
      onIndexChange?.(nextIdx);
    }
  }, [memes.length, activeIndex, onClose, onIndexChange]);

  // Pre-probe & cache dimensions of active, prev, and next memes
  useEffect(() => {
    const urlsToProbe = [
      memes[activeIndex]?.url,
      activeIndex > 0 ? memes[activeIndex - 1]?.url : null,
      activeIndex < memes.length - 1 ? memes[activeIndex + 1]?.url : null,
    ].filter(Boolean) as string[];

    urlsToProbe.forEach((url) => {
      if (!memeDimensionCache.has(url)) {
        const img = new Image();
        img.src = url;
        img.onload = () => {
          if (img.naturalWidth && img.naturalHeight) {
            memeDimensionCache.set(url, {
              width: img.naturalWidth,
              height: img.naturalHeight,
            });
            setImageDims((prev) => ({
              ...prev,
              [url]: { width: img.naturalWidth, height: img.naturalHeight },
            }));
          }
        };
      }
    });
  }, [activeIndex, memes]);

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

  // Hardware Back & Keyboard Navigation (Escape, ArrowLeft, ArrowRight)
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
        if (activeIndex > 0 && !isAnimatingRef.current) {
          const prevIdx = activeIndex - 1;
          setActiveIndex(prevIdx);
          onIndexChange?.(prevIdx);
        }
      } else if (e.key === 'ArrowRight') {
        if (activeIndex < memes.length - 1 && !isAnimatingRef.current) {
          const nextIdx = activeIndex + 1;
          setActiveIndex(nextIdx);
          onIndexChange?.(nextIdx);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, showMoreMenu, activeIndex, memes.length, onClose, onIndexChange]);

  const handleSelectIndex = (idx: number) => {
    if (idx === activeIndex || idx < 0 || idx >= memes.length || isAnimatingRef.current) return;
    setShowMoreMenu(false);
    setActiveIndex(idx);
    onIndexChange?.(idx);
  };

  // Tight Aspect-Ratio hugging frame calculation (ZERO Pillarbox/Letterbox)
  const getFittedFrameStyle = useCallback(
    (memeItem?: Meme | null): React.CSSProperties => {
      if (!memeItem) return { width: '300px', height: '300px' };

      const cached = memeDimensionCache.get(memeItem.url) || imageDims[memeItem.url];
      const maxW = Math.max(160, Math.min(stageSize.width - 24, 350));
      const maxH = Math.max(160, Math.min(stageSize.height - 16, 380));

      if (cached?.width && cached?.height && cached.width > 0 && cached.height > 0) {
        const aspect = cached.width / cached.height;
        let w = maxW;
        let h = Math.round(w / aspect);
        if (h > maxH) {
          h = maxH;
          w = Math.round(h * aspect);
        }
        return {
          width: `${w}px`,
          height: `${h}px`,
        };
      }

      return {
        maxWidth: `${maxW}px`,
        maxHeight: `${maxH}px`,
        width: 'auto',
        height: 'auto',
      };
    },
    [stageSize, imageDims]
  );

  // --- SECTION B: Main Meme Stage Gesture Physics ---
  const handleStagePointerDown = (e: React.PointerEvent) => {
    if (isAnimatingRef.current) return;
    if (showMoreMenu) setShowMoreMenu(false);
    touchStartPos.current = { x: e.clientX, y: e.clientY, time: performance.now() };
    gestureAxis.current = null;
    setIsDraggingTrack(true);
    setTrackTransition('none');
  };

  const handleStagePointerMove = (e: React.PointerEvent) => {
    if (!touchStartPos.current || !isDraggingTrack || isAnimatingRef.current) return;
    const dx = e.clientX - touchStartPos.current.x;
    const dy = e.clientY - touchStartPos.current.y;

    // Strict gesture axis-locking threshold
    if (!gestureAxis.current) {
      if (Math.hypot(dx, dy) >= 7) {
        if (Math.abs(dx) > Math.abs(dy)) {
          gestureAxis.current = 'horizontal';
        } else if (dy > 0 && dy > Math.abs(dx)) {
          gestureAxis.current = 'vertical';
          setIsDraggingSheet(true);
        }
      }
      return;
    }

    if (gestureAxis.current === 'horizontal') {
      e.stopPropagation();
      // Boundary rubber-band damping (0.28x)
      let effectiveDx = dx;
      if (
        (activeIndex === 0 && dx > 0) ||
        (activeIndex === memes.length - 1 && dx < 0)
      ) {
        effectiveDx = dx * 0.28;
      }
      setDragX(effectiveDx);
    } else if (gestureAxis.current === 'vertical') {
      e.stopPropagation();
      if (dy > 0) {
        setSheetDragY(dy);
      }
    }
  };

  const handleStagePointerUp = (e: React.PointerEvent) => {
    if (!touchStartPos.current || isAnimatingRef.current) {
      setIsDraggingTrack(false);
      setIsDraggingSheet(false);
      return;
    }

    const dx = e.clientX - touchStartPos.current.x;
    const dy = e.clientY - touchStartPos.current.y;
    const dt = Math.max(1, performance.now() - touchStartPos.current.time);
    const vx = dx / dt;
    const vy = dy / dt;

    if (gestureAxis.current === 'horizontal') {
      const commitThreshold = Math.min(stageSize.width * 0.2, 70);
      const isQuickFlick = Math.abs(vx) > 0.4;
      const slideStride = stageSize.width + 16;

      // Swipe Left (dx < 0) -> Advance to Next Meme
      if ((dx < -commitThreshold || (isQuickFlick && vx < -0.4)) && activeIndex < memes.length - 1) {
        isAnimatingRef.current = true;
        setTrackTransition('transform 240ms cubic-bezier(0.16, 1, 0.3, 1)');
        setDragX(-slideStride);
        setTimeout(() => {
          const nextIdx = activeIndex + 1;
          setActiveIndex(nextIdx);
          onIndexChange?.(nextIdx);
          setTrackTransition('none');
          setDragX(0);
          isAnimatingRef.current = false;
        }, 240);
      }
      // Swipe Right (dx > 0) -> Revert to Previous Meme
      else if ((dx > commitThreshold || (isQuickFlick && vx > 0.4)) && activeIndex > 0) {
        isAnimatingRef.current = true;
        setTrackTransition('transform 240ms cubic-bezier(0.16, 1, 0.3, 1)');
        setDragX(slideStride);
        setTimeout(() => {
          const prevIdx = activeIndex - 1;
          setActiveIndex(prevIdx);
          onIndexChange?.(prevIdx);
          setTrackTransition('none');
          setDragX(0);
          isAnimatingRef.current = false;
        }, 240);
      } else {
        // Snap back to center
        setTrackTransition('transform 200ms cubic-bezier(0.16, 1, 0.3, 1)');
        setDragX(0);
      }
    } else if (gestureAxis.current === 'vertical') {
      const sheetHeight = window.innerHeight * 0.85;
      if (dy > sheetHeight * 0.24 || vy > 0.4) {
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

  // --- Top Handle Drag-to-Dismiss Physics ---
  const handleSheetDragStart = (e: React.PointerEvent) => {
    touchStartPos.current = { x: e.clientX, y: e.clientY, time: performance.now() };
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
    const dt = Math.max(1, performance.now() - touchStartPos.current.time);
    const vy = dy / dt;
    const sheetHeight = window.innerHeight * 0.85;

    if (dy > sheetHeight * 0.24 || vy > 0.4) {
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

  // Mirroring ShareModal.tsx dock offset coordinate
  const dockOffsetBottom = 'calc(60px + max(env(safe-area-inset-bottom, 0px), 16px))';

  return (
    <>
      {/* Dimmed Scrim / Backdrop (Top ~12% / 104px of Meme Vault remains visible behind this scrim) */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/70 backdrop-blur-[4px] z-[1040] select-none"
        style={{
          opacity: isOpen ? Math.max(0, 1 - sheetDragY / 300) : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: isDraggingSheet ? 'none' : 'opacity 300ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      />

      {/* Slide-Up Bottom Sheet Shell */}
      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: dockOffsetBottom,
          zIndex: 1045,
          display: 'flex',
          justifyContent: 'center',
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
      >
        <section
          style={{
            width: '100%',
            maxWidth: '460px',
            maxHeight: 'calc(100vh - 104px)',
            backgroundColor: '#18181b',
            borderTop: '4px solid #f4c300',
            borderLeft: '4px solid #000000',
            borderRight: '4px solid #000000',
            boxShadow: '0px -6px 0px 0px #9b30ff',
            display: 'flex',
            flexDirection: 'column',
            transform: isOpen
              ? sheetDragY > 0
                ? `translate3d(0, ${sheetDragY}px, 0)`
                : 'translate3d(0, 0, 0)'
              : 'translate3d(0, 100%, 0)',
            transition: isDraggingSheet ? 'none' : 'transform 320ms cubic-bezier(0.16, 1, 0.3, 1)',
            willChange: 'transform',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Drag Handle Container */}
          <div
            className="w-full flex justify-center pt-2.5 pb-1 cursor-grab active:cursor-grabbing shrink-0 select-none"
            style={{ touchAction: 'none' }}
            onPointerDown={handleSheetDragStart}
            onPointerMove={handleSheetDragMove}
            onPointerUp={handleSheetDragEnd}
            onPointerCancel={handleSheetDragEnd}
          >
            <div className="w-[56px] h-[6px] bg-[#f4c300] border-[1.5px] border-black shadow-[1px_1px_0px_#000000]" />
          </div>

          {/* SECTION A: Sheet Top Header Row */}
          <section className="px-4 py-2 border-b border-[#2a2832] flex items-center justify-between shrink-0 select-none">
            {/* Left: Position Counter Box */}
            <div className="bg-[#1c1c1e] px-3 py-1.5 border-2 border-black shadow-[3px_3px_0px_#000] flex items-center font-mono font-extrabold text-sm">
              <span className="text-[#f4c300]">{activeIndex + 1}</span>
              <span className="text-neutral-500 mx-1">/</span>
              <span className="text-white">{memes.length}</span>
            </div>

            {/* Right: Action Cluster (Reddit / Report + Close Button) */}
            <div className="flex items-center space-x-2">
              {currentMeme.source === 'Reddit' ? (
                <button
                  type="button"
                  onClick={() => handleReddit(currentMeme)}
                  className="h-9 px-3 bg-[#FF4500] border-2 border-black shadow-[3px_3px_0px_#000] flex items-center space-x-1.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer transition-none"
                  title="View Reddit Source"
                >
                  <span className="w-3.5 h-3.5 border border-white flex items-center justify-center text-[10px] font-bold text-white leading-none">
                    i
                  </span>
                  <span className="font-mono font-extrabold text-xs text-white tracking-wider">
                    REDDIT
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleReport(currentMeme)}
                  className="h-9 px-3 bg-[#DC2626] border-2 border-black shadow-[3px_3px_0px_#000] flex items-center space-x-1.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer transition-none"
                  title="Report Curated Meme"
                >
                  <Flag size={14} className="text-white fill-current shrink-0" />
                  <span className="font-mono font-extrabold text-xs text-white tracking-wider">
                    REPORT
                  </span>
                </button>
              )}

              {/* Close Button (×) */}
              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 bg-[#FF2A85] border-2 border-black shadow-[3px_3px_0px_#000] flex items-center justify-center text-white font-impact text-xl leading-none active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer transition-none"
                title="Close preview"
              >
                ×
              </button>
            </div>
          </section>

          {/* SECTION B: Main Meme Preview Stage (ZERO TEXT & 3-Slot Native Pager) */}
          <section
            ref={stageRef}
            className="flex-1 w-full min-h-0 relative overflow-hidden flex items-center justify-center px-4 py-2 select-none"
            style={{ touchAction: 'none' }}
            onPointerDown={handleStagePointerDown}
            onPointerMove={handleStagePointerMove}
            onPointerUp={handleStagePointerUp}
            onPointerCancel={handleStagePointerUp}
          >
            {/* 3-Slot Virtualized Track */}
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
                    transform: `translate3d(calc(-100% - 16px), 0, 0)`,
                  }}
                >
                  <div
                    className="border-[3px] border-[#9b30ff] shadow-[4px_4px_0px_#f4c300] bg-black p-0.5 inline-flex items-center justify-center overflow-hidden"
                    style={getFittedFrameStyle(prevMeme)}
                  >
                    <img
                      src={prevMeme.url}
                      alt=""
                      className="w-full h-full object-fill block pointer-events-none select-none"
                      draggable={false}
                    />
                  </div>
                </div>
              )}

              {/* Slot 0: Current Active Meme */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div
                  className="border-[3px] border-[#9b30ff] shadow-[4px_4px_0px_#f4c300] bg-black p-0.5 inline-flex items-center justify-center overflow-hidden"
                  style={getFittedFrameStyle(currentMeme)}
                >
                  <img
                    src={currentMeme.url}
                    alt=""
                    className="w-full h-full object-fill block pointer-events-none select-none"
                    draggable={false}
                    onLoad={(e) => {
                      const img = e.currentTarget;
                      if (img.naturalWidth && img.naturalHeight) {
                        memeDimensionCache.set(currentMeme.url, {
                          width: img.naturalWidth,
                          height: img.naturalHeight,
                        });
                        setImageDims((prev) => ({
                          ...prev,
                          [currentMeme.url]: { width: img.naturalWidth, height: img.naturalHeight },
                        }));
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
                    transform: `translate3d(calc(100% + 16px), 0, 0)`,
                  }}
                >
                  <div
                    className="border-[3px] border-[#9b30ff] shadow-[4px_4px_0px_#f4c300] bg-black p-0.5 inline-flex items-center justify-center overflow-hidden"
                    style={getFittedFrameStyle(nextMeme)}
                  >
                    <img
                      src={nextMeme.url}
                      alt=""
                      className="w-full h-full object-fill block pointer-events-none select-none"
                      draggable={false}
                    />
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* SECTION C: 4-Button Neo-Brutalist CTA Row + Ink-Burst (ZERO TEXT ABOVE!) */}
          <section className="px-4 py-2 shrink-0 select-none relative z-30">
            {/* Popover Dismiss Backdrop */}
            {showMoreMenu && (
              <div
                className="fixed inset-0 z-40 bg-black/30"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMoreMenu(false);
                }}
              />
            )}

            <div className="grid grid-cols-4 gap-2.5 w-full max-w-[356px] mx-auto relative">
              {/* 1. LIKE */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMoreMenu(false);
                  triggerCtaEffect('like', '#FF2A85', e);
                  onToggleLike(currentMeme);
                }}
                className="mc-cta-btn h-[54px] border-[4px] border-black shadow-[4px_4px_0px_#000000] flex flex-col items-center justify-center relative active:translate-x-[2px] active:translate-y-[2px] active:shadow-none cursor-pointer select-none"
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
                  className="relative z-10 font-mono font-bold text-[10px] uppercase tracking-wider leading-none mt-0.5"
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
                  handleRemove(currentMeme);
                }}
                className="mc-cta-btn h-[54px] bg-[#A855F7] border-[4px] border-black shadow-[4px_4px_0px_#000000] flex flex-col items-center justify-center relative active:translate-x-[2px] active:translate-y-[2px] active:shadow-none cursor-pointer select-none"
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
                <span className="relative z-10 font-mono font-bold text-[10px] uppercase tracking-wider leading-none text-black mt-0.5">
                  REMOVE
                </span>
              </button>

              {/* 3. PIN */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMoreMenu(false);
                  triggerCtaEffect('pin', '#FACC15', e);
                  handleOpenPin(currentMeme);
                }}
                className="mc-cta-btn h-[54px] border-[4px] border-black shadow-[4px_4px_0px_#000000] flex flex-col items-center justify-center relative active:translate-x-[2px] active:translate-y-[2px] active:shadow-none cursor-pointer select-none"
                style={{
                  background: isCurrentPinned
                    ? '#FACC15'
                    : 'linear-gradient(180deg, #231e12 0%, #171510 100%)',
                  borderColor: isCurrentPinned ? '#000000' : '#FACC15',
                  color: isCurrentPinned ? '#000000' : '#FACC15',
                }}
                aria-label="Pin meme to mood board"
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
                  className="relative z-10 font-mono font-bold text-[10px] uppercase tracking-wider leading-none mt-0.5"
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
                  className="mc-cta-btn h-[54px] w-full border-[4px] border-black shadow-[4px_4px_0px_#000000] flex flex-col items-center justify-center relative active:translate-x-[2px] active:translate-y-[2px] active:shadow-none cursor-pointer select-none"
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
                    className="relative z-10 font-mono font-bold text-[10px] uppercase tracking-wider leading-none mt-0.5"
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
                    className="absolute right-0 bottom-full mb-3 w-44 bg-white border-4 border-black shadow-[4px_4px_0px_#000000] z-50 flex flex-col divide-y-4 divide-black animate-more-menu select-none"
                  >
                    {/* 1. SHARE (#A855F7) */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMoreMenu(false);
                        handleShare(currentMeme);
                      }}
                      className="w-full h-10 bg-[#A855F7] px-3 flex items-center gap-2.5 active:opacity-90 font-mono font-bold text-[12px] text-black uppercase cursor-pointer text-left transition-none"
                    >
                      <Share2 size={16} strokeWidth={2.5} color="#000000" className="shrink-0" />
                      <span>SHARE</span>
                    </button>

                    {/* 2. DOWNLOAD (#FACC15) */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMoreMenu(false);
                        handleDownload(currentMeme);
                      }}
                      className="w-full h-10 bg-[#FACC15] px-3 flex items-center gap-2.5 active:opacity-90 font-mono font-bold text-[12px] text-black uppercase cursor-pointer text-left transition-none"
                    >
                      <Download size={16} strokeWidth={2.5} color="#000000" className="shrink-0" />
                      <span>DOWNLOAD</span>
                    </button>

                    {/* 3. REPORT (#FF2A85) */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMoreMenu(false);
                        handleReport(currentMeme);
                      }}
                      className="w-full h-10 bg-[#FF2A85] px-3 flex items-center gap-2.5 active:opacity-90 font-mono font-bold text-[12px] text-black uppercase cursor-pointer text-left transition-none"
                    >
                      <Flag size={16} strokeWidth={2.5} color="#000000" className="shrink-0" />
                      <span>REPORT</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* SECTION D: Bottom Horizontal Thumbnail Filmstrip Tray */}
          <section className="border-t border-[#2b2933] bg-[#121116] pt-2.5 pb-3 px-3 flex flex-col items-center select-none shrink-0">
            {/* Scroll Track */}
            <div
              className="w-full flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-1 px-1 touch-pan-x"
              style={{
                touchAction: 'pan-x',
                WebkitOverflowScrolling: 'touch',
                overscrollBehaviorX: 'contain',
              }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {memes.map((m, idx) => {
                const isActive = idx === activeIndex;
                return (
                  <div
                    key={`${m.url}-${idx}`}
                    ref={(el) => {
                      filmstripThumbsRef.current[idx] = el;
                    }}
                    className="flex flex-col items-center shrink-0 cursor-pointer"
                    onClick={() => handleSelectIndex(idx)}
                  >
                    {isActive ? (
                      <div className="w-[54px] h-[54px] border-[3px] border-[#f4c300] outline outline-2 outline-black bg-black shrink-0 shadow-[2px_2px_0px_#000] overflow-hidden">
                        <img
                          src={m.url}
                          alt=""
                          className="w-full h-full object-cover block pointer-events-none select-none"
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 shrink-0 opacity-55 hover:opacity-85 transition-opacity border-[1.5px] border-[#302d38] overflow-hidden bg-black">
                        <img
                          src={m.url}
                          alt=""
                          className="w-full h-full object-cover block pointer-events-none select-none"
                          loading="lazy"
                        />
                      </div>
                    )}
                    {/* Active yellow indicator bar */}
                    <div
                      className={`w-5 h-[3px] mt-1.5 shrink-0 ${
                        isActive ? 'bg-[#f4c300]' : 'bg-transparent'
                      }`}
                    />
                  </div>
                );
              })}
            </div>

            {/* Android Home Gesture Bar */}
            <div className="mt-2 w-[72px] h-1 bg-white/70 mx-auto shrink-0" />
          </section>
        </section>
      </div>
    </>
  );
};
