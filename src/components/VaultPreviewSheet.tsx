import React, { useState, useEffect, useRef, memo } from 'react';
import {
  Heart,
  BookmarkX,
  MapPin,
  MoreVertical,
  Share2,
  Download,
  Flag,
  X,
} from 'lucide-react';
import type { Meme, MoodBoard } from '../types';

export interface VaultPreviewSheetProps {
  isOpen: boolean;
  initialIndex: number;
  memes: Meme[];
  onClose: () => void;
  onIndexChange?: (newIndex: number) => void;
  likedMemes: string[];
  pinnedMemes?: Meme[];
  moodBoards?: MoodBoard[] | { id: string; memeUrls: string[] }[];
  onToggleLike: (meme: Meme) => void;
  onRemoveMeme: (meme: Meme) => void;
  onOpenPinModal: (meme: Meme) => void;
  onShareMeme: (meme: Meme) => void;
  onDownloadMeme: (meme: Meme) => void;
  onOpenReportModal: (meme: Meme) => void;
  onOpenRedditModal: (meme: Meme) => void;
}

interface CtaEffectState {
  key: string;
  tick: number;
  x: number;
  y: number;
  size: number;
  color: string;
}

export const VaultPreviewSheet: React.FC<VaultPreviewSheetProps> = memo(({
  isOpen,
  initialIndex,
  memes,
  onClose,
  onIndexChange,
  likedMemes,
  pinnedMemes = [],
  moodBoards = [],
  onToggleLike,
  onRemoveMeme,
  onOpenPinModal,
  onShareMeme,
  onDownloadMeme,
  onOpenReportModal,
  onOpenRedditModal,
}) => {
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [sheetDragY, setSheetDragY] = useState(0);
  const [isDraggingSheet, setIsDraggingSheet] = useState(false);

  // Gallery Horizontal Swipe Pager State
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [trackTransition, setTrackTransition] = useState<string>('none');
  const isTransitioningRef = useRef(false);

  // CTA Ink-Burst State
  const [ctaEffect, setCtaEffect] = useState<CtaEffectState | null>(null);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const activeThumbRef = useRef<HTMLDivElement | null>(null);

  // Touch & pointer tracking refs
  const touchMetaRef = useRef<{
    startX: number;
    startY: number;
    lastX: number;
    lastY: number;
    lastTime: number;
    velocityX: number;
    velocityY: number;
    directionLocked: 'horizontal' | 'vertical' | null;
  }>({
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    lastTime: 0,
    velocityX: 0,
    velocityY: 0,
    directionLocked: null,
  });

  // Sync activeIndex with initialIndex when sheet opens
  useEffect(() => {
    if (isOpen) {
      setActiveIndex(Math.max(0, Math.min(initialIndex, memes.length - 1)));
      setSheetDragY(0);
      setSwipeOffset(0);
      setTrackTransition('none');
      setShowMoreMenu(false);
      isTransitioningRef.current = false;
    }
  }, [isOpen, initialIndex, memes.length]);

  // Clamp activeIndex if memes length changes (e.g. after removing a meme)
  useEffect(() => {
    if (isOpen) {
      if (memes.length === 0) {
        onClose();
      } else if (activeIndex >= memes.length) {
        setActiveIndex(memes.length - 1);
      }
    }
  }, [isOpen, memes.length, activeIndex, onClose]);

  // Inform parent of index changes
  useEffect(() => {
    onIndexChange?.(activeIndex);
  }, [activeIndex, onIndexChange]);

  // Auto-center active thumbnail in filmstrip
  useEffect(() => {
    if (isOpen && activeThumbRef.current) {
      activeThumbRef.current.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }
  }, [activeIndex, isOpen]);

  // Keyboard navigation (Escape, ArrowLeft, ArrowRight)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showMoreMenu) {
          setShowMoreMenu(false);
        } else {
          onClose();
        }
      }
      if (e.key === 'ArrowRight' && activeIndex < memes.length - 1 && !isTransitioningRef.current) {
        isTransitioningRef.current = true;
        const stageWidth = stageRef.current?.offsetWidth || 360;
        setTrackTransition('transform 240ms cubic-bezier(0.16, 1, 0.3, 1)');
        setSwipeOffset(-(stageWidth + 20));
        setTimeout(() => {
          setTrackTransition('none');
          setActiveIndex((i) => i + 1);
          setSwipeOffset(0);
          isTransitioningRef.current = false;
        }, 240);
      }
      if (e.key === 'ArrowLeft' && activeIndex > 0 && !isTransitioningRef.current) {
        isTransitioningRef.current = true;
        const stageWidth = stageRef.current?.offsetWidth || 360;
        setTrackTransition('transform 240ms cubic-bezier(0.16, 1, 0.3, 1)');
        setSwipeOffset(stageWidth + 20);
        setTimeout(() => {
          setTrackTransition('none');
          setActiveIndex((i) => i - 1);
          setSwipeOffset(0);
          isTransitioningRef.current = false;
        }, 240);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, activeIndex, memes.length, showMoreMenu]);

  if (!isOpen || memes.length === 0) return null;

  const currentMeme = memes[activeIndex] || memes[0];
  const isLiked = likedMemes.includes(currentMeme.url);
  const isPinned =
    pinnedMemes.some((p) => p.url === currentMeme.url) ||
    moodBoards.some((b) => b.memeUrls.includes(currentMeme.url));

  // Ink-Burst Trigger
  const triggerCtaEffect = (
    key: string,
    color: string,
    e: React.MouseEvent<HTMLElement> | React.TouchEvent<HTMLElement>
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2;
    const clientX = 'touches' in e && e.touches[0] ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e && e.touches[0] ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    const x = (clientX || rect.left + rect.width / 2) - rect.left - size / 2;
    const y = (clientY || rect.top + rect.height / 2) - rect.top - size / 2;

    const tick = Date.now();
    setCtaEffect({ key, tick, x, y, size, color });
    setTimeout(() => {
      setCtaEffect((prev) => (prev?.tick === tick ? null : prev));
    }, 450);
  };

  const renderBurstAndInk = (btnKey: string, accentHex: string) => {
    const isCurrent = ctaEffect?.key === btnKey && Date.now() - ctaEffect.tick < 500;
    return (
      <>
        <div className="ink-layer">
          {isCurrent && (
            <span
              key={`ink-${ctaEffect.tick}`}
              className="ink-ripple"
              style={{
                width: `${ctaEffect.size}px`,
                height: `${ctaEffect.size}px`,
                left: `${ctaEffect.x}px`,
                top: `${ctaEffect.y}px`,
                backgroundColor: `${accentHex}55`,
              }}
            />
          )}
        </div>
        {isCurrent && (
          <div key={`burst-${ctaEffect.tick}`} className="burst-wrapper">
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

  // --- Horizontal Gallery Swiping Gesture Logic ---
  const handleTouchStart = (e: React.TouchEvent | React.PointerEvent) => {
    // If it's a pointer event from touch, let touch events handle it to prevent double-firing
    if ('pointerType' in e && e.pointerType === 'touch') return;
    if (isTransitioningRef.current) return;
    if (showMoreMenu) setShowMoreMenu(false);

    const clientX = 'touches' in e && e.touches[0] ? e.touches[0].clientX : (e as React.PointerEvent).clientX;
    const clientY = 'touches' in e && e.touches[0] ? e.touches[0].clientY : (e as React.PointerEvent).clientY;
    touchMetaRef.current = {
      startX: clientX,
      startY: clientY,
      lastX: clientX,
      lastY: clientY,
      lastTime: performance.now(),
      velocityX: 0,
      velocityY: 0,
      directionLocked: null,
    };
    setIsSwiping(false);
    setTrackTransition('none');
  };

  const handleTouchMove = (e: React.TouchEvent | React.PointerEvent) => {
    if ('pointerType' in e && e.pointerType === 'touch') return;
    if (isTransitioningRef.current) return;

    const meta = touchMetaRef.current;
    const clientX = 'touches' in e && e.touches[0] ? e.touches[0].clientX : (e as React.PointerEvent).clientX;
    const clientY = 'touches' in e && e.touches[0] ? e.touches[0].clientY : (e as React.PointerEvent).clientY;

    const dx = clientX - meta.startX;
    const dy = clientY - meta.startY;

    if (!meta.directionLocked) {
      if (Math.abs(dx) > 7 && Math.abs(dx) > Math.abs(dy)) {
        meta.directionLocked = 'horizontal';
      } else if (dy > 7 && dy > Math.abs(dx)) {
        meta.directionLocked = 'vertical';
      }
    }

    if (meta.directionLocked === 'horizontal') {
      if (e.cancelable) e.preventDefault();
      setIsSwiping(true);

      const now = performance.now();
      const dt = Math.max(1, now - meta.lastTime);
      meta.velocityX = (clientX - meta.lastX) / dt;
      meta.lastX = clientX;
      meta.lastTime = now;

      // Rubber-band resistance at boundaries (0.25x)
      let effectiveDx = dx;
      if (
        (activeIndex === 0 && dx > 0) ||
        (activeIndex === memes.length - 1 && dx < 0)
      ) {
        effectiveDx = dx * 0.25;
      }
      setTrackTransition('none');
      setSwipeOffset(effectiveDx);
    } else if (meta.directionLocked === 'vertical') {
      const now = performance.now();
      const dt = Math.max(1, now - meta.lastTime);
      meta.velocityY = (clientY - meta.lastY) / dt;
      meta.lastY = clientY;
      meta.lastTime = now;

      setIsDraggingSheet(true);
      setSheetDragY(Math.max(0, dy));
    }
  };

  const handleTouchEnd = (e?: React.TouchEvent | React.PointerEvent) => {
    if (e && 'pointerType' in e && e.pointerType === 'touch') return;
    if (isTransitioningRef.current) return;

    const meta = touchMetaRef.current;

    if (meta.directionLocked === 'horizontal') {
      const stageWidth = stageRef.current?.offsetWidth || 360;
      const slideStride = stageWidth + 20;
      const threshold = stageWidth * 0.2;
      const shouldAdvance =
        (swipeOffset < -threshold || meta.velocityX < -0.4) &&
        activeIndex < memes.length - 1;
      const shouldRevert =
        (swipeOffset > threshold || meta.velocityX > 0.4) && activeIndex > 0;

      setIsSwiping(false);

      if (shouldAdvance) {
        isTransitioningRef.current = true;
        setTrackTransition('transform 240ms cubic-bezier(0.16, 1, 0.3, 1)');
        setSwipeOffset(-slideStride);
        setTimeout(() => {
          setTrackTransition('none');
          setActiveIndex((i) => i + 1);
          setSwipeOffset(0);
          isTransitioningRef.current = false;
        }, 240);
      } else if (shouldRevert) {
        isTransitioningRef.current = true;
        setTrackTransition('transform 240ms cubic-bezier(0.16, 1, 0.3, 1)');
        setSwipeOffset(slideStride);
        setTimeout(() => {
          setTrackTransition('none');
          setActiveIndex((i) => i - 1);
          setSwipeOffset(0);
          isTransitioningRef.current = false;
        }, 240);
      } else {
        setTrackTransition('transform 200ms cubic-bezier(0.16, 1, 0.3, 1)');
        setSwipeOffset(0);
      }
    } else if (meta.directionLocked === 'vertical') {
      setIsDraggingSheet(false);
      if (sheetDragY > 120 || meta.velocityY > 0.4) {
        onClose();
      } else {
        setSheetDragY(0);
      }
    }

    meta.directionLocked = null;
  };

  // 3-Slot Virtualized Track Models
  const prevMeme = activeIndex > 0 ? memes[activeIndex - 1] : null;
  const nextMeme = activeIndex < memes.length - 1 ? memes[activeIndex + 1] : null;

  return (
    <>
      {/* 1. TOP 12% PEEKING SCRIM (Dimmed & Blurred Background) */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/70 backdrop-blur-[4px] z-[1040]"
        style={{
          opacity: isOpen ? Math.max(0, 1 - sheetDragY / 280) : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: isDraggingSheet ? 'none' : 'opacity 280ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      />

      {/* 2. SLIDE-UP BOTTOM SHEET WRAPPER (Top 104px Anchor, Bottom 0px Flush) */}
      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          top: 'max(calc(env(safe-area-inset-top, 0px) + 90px), 104px)',
          zIndex: 1045,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          pointerEvents: 'none',
        }}
      >
        <section
          aria-label="Meme Preview Sheet"
          style={{
            width: '100%',
            maxWidth: '480px',
            margin: '0 auto',
            height: '100%',
            backgroundColor: '#121116',
            borderTop: '4px solid #f4c300',
            borderLeft: '3px solid #000000',
            borderRight: '3px solid #000000',
            boxShadow: '0px -4px 0px 0px #000000',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            pointerEvents: 'auto',
            transform: isOpen
              ? `translate3d(0, ${sheetDragY}px, 0)`
              : 'translate3d(0, 100%, 0)',
            transition: isDraggingSheet
              ? 'none'
              : 'transform 320ms cubic-bezier(0.16, 1, 0.3, 1)',
            willChange: 'transform',
            paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 12px)',
          }}
        >
          {/* DRAG HANDLE */}
          <div
            className="w-full flex justify-center pt-2.5 pb-1 cursor-grab active:cursor-grabbing select-none"
            onTouchStart={(e) => {
              const startY = e.touches[0].clientY;
              const moveListener = (moveEvt: TouchEvent) => {
                setSheetDragY(Math.max(0, moveEvt.touches[0].clientY - startY));
                setIsDraggingSheet(true);
              };
              const endListener = (endEvt: TouchEvent) => {
                const finalDy = endEvt.changedTouches[0].clientY - startY;
                setIsDraggingSheet(false);
                if (finalDy > 100) onClose();
                else setSheetDragY(0);
                window.removeEventListener('touchmove', moveListener);
                window.removeEventListener('touchend', endListener);
              };
              window.addEventListener('touchmove', moveListener);
              window.addEventListener('touchend', endListener);
            }}
            onPointerDown={(e) => {
              if (e.pointerType === 'touch') return;
              const startY = e.clientY;
              const moveListener = (moveEvt: PointerEvent) => {
                setSheetDragY(Math.max(0, moveEvt.clientY - startY));
                setIsDraggingSheet(true);
              };
              const endListener = (endEvt: PointerEvent) => {
                const finalDy = endEvt.clientY - startY;
                setIsDraggingSheet(false);
                if (finalDy > 100) onClose();
                else setSheetDragY(0);
                window.removeEventListener('pointermove', moveListener);
                window.removeEventListener('pointerup', endListener);
              };
              window.addEventListener('pointermove', moveListener);
              window.addEventListener('pointerup', endListener);
            }}
          >
            <div className="w-[56px] h-[6px] bg-[#f4c300] border-[1.5px] border-black shadow-[1px_1px_0px_#000000]" />
          </div>

          {/* SECTION A: HEADER ROW */}
          <header className="px-4 py-1.5 border-b border-[#2a2832] flex items-center justify-between select-none shrink-0">
            {/* Position Counter Box */}
            <div className="bg-[#1c1c1e] px-3 py-1.5 border-2 border-black shadow-[2.5px_2.5px_0px_#000] flex items-center font-mono font-extrabold text-sm">
              <span className="text-[#f4c300]">{activeIndex + 1}</span>
              <span className="text-[#7a7a7a] mx-1">/</span>
              <span className="text-white">{memes.length}</span>
            </div>

            {/* Action Cluster: Source Badge + Close Button */}
            <div className="flex items-center space-x-2">
              {currentMeme.source === 'Reddit' ? (
                <button
                  type="button"
                  onClick={() => onOpenRedditModal(currentMeme)}
                  className="h-9 px-3 bg-[#FF4500] border-2 border-black shadow-[2.5px_2.5px_0px_#000] flex items-center space-x-1.5 active:translate-x-0.5 active:translate-y-0.5 transition-none cursor-pointer"
                  title="Reddit Source Details"
                >
                  <span className="w-3.5 h-3.5 border border-white flex items-center justify-center text-[10px] font-bold text-white leading-none">
                    i
                  </span>
                  <span className="font-mono font-extrabold text-xs tracking-wider text-white">
                    REDDIT
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onOpenReportModal(currentMeme)}
                  className="h-9 px-3 bg-[#DC2626] border-2 border-black shadow-[2.5px_2.5px_0px_#000] flex items-center space-x-1.5 active:translate-x-0.5 active:translate-y-0.5 transition-none cursor-pointer"
                  title="Report Meme"
                >
                  <Flag size={14} className="text-white fill-current" />
                  <span className="font-mono font-extrabold text-xs tracking-wider text-white">
                    REPORT
                  </span>
                </button>
              )}

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 bg-[#FF2A85] border-2 border-black shadow-[2.5px_2.5px_0px_#000] flex items-center justify-center text-white active:translate-x-0.5 active:translate-y-0.5 transition-none cursor-pointer font-black"
                title="Close Preview"
              >
                <X size={18} strokeWidth={3} />
              </button>
            </div>
          </header>

          {/* SECTION B: MAIN MEME STAGE (ZERO TEXT, HUGE STAGE, 3-SLOT HORIZONTAL GALLERY SWIPE) */}
          <section
            ref={stageRef}
            className="flex-1 min-h-0 w-full flex items-center justify-center relative overflow-hidden px-4 py-1 select-none"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
            onPointerDown={handleTouchStart}
            onPointerMove={handleTouchMove}
            onPointerUp={handleTouchEnd}
            onPointerCancel={handleTouchEnd}
          >
            {/* 3-Slot Virtualized Track */}
            <div
              className="w-full h-full relative flex items-center justify-center"
              style={{
                transform: `translate3d(${swipeOffset}px, 0, 0)`,
                transition: trackTransition,
                willChange: 'transform',
              }}
            >
              {/* Previous Slot */}
              {prevMeme && (
                <div
                  className="absolute inset-0 flex items-center justify-center p-2"
                  style={{ transform: 'translate3d(calc(-100% - 20px), 0, 0)' }}
                >
                  <div
                    className="border-[3px] border-[#9b30ff] shadow-[4px_4px_0px_#f4c300] bg-black inline-flex items-center justify-center p-0.5"
                    style={{
                      maxWidth: 'min(90vw, 360px)',
                      maxHeight: 'min(48vh, 380px)',
                    }}
                  >
                    <img
                      src={prevMeme.url}
                      alt=""
                      loading="eager"
                      className="w-auto h-auto object-contain block select-none pointer-events-none"
                      style={{
                        maxWidth: 'min(90vw - 12px, 348px)',
                        maxHeight: 'min(48vh - 12px, 368px)',
                      }}
                      draggable={false}
                    />
                  </div>
                </div>
              )}

              {/* Current Slot (Active) */}
              <div className="absolute inset-0 flex items-center justify-center p-2">
                <div
                  className="border-[3px] border-[#9b30ff] shadow-[4px_4px_0px_#f4c300] bg-black inline-flex items-center justify-center p-0.5"
                  style={{
                    maxWidth: 'min(90vw, 360px)',
                    maxHeight: 'min(48vh, 380px)',
                  }}
                >
                  <img
                    src={currentMeme.url}
                    alt=""
                    loading="eager"
                    className="w-auto h-auto object-contain block select-none pointer-events-none"
                    style={{
                      maxWidth: 'min(90vw - 12px, 348px)',
                      maxHeight: 'min(48vh - 12px, 368px)',
                    }}
                    draggable={false}
                  />
                </div>
              </div>

              {/* Next Slot */}
              {nextMeme && (
                <div
                  className="absolute inset-0 flex items-center justify-center p-2"
                  style={{ transform: 'translate3d(calc(100% + 20px), 0, 0)' }}
                >
                  <div
                    className="border-[3px] border-[#9b30ff] shadow-[4px_4px_0px_#f4c300] bg-black inline-flex items-center justify-center p-0.5"
                    style={{
                      maxWidth: 'min(90vw, 360px)',
                      maxHeight: 'min(48vh, 380px)',
                    }}
                  >
                    <img
                      src={nextMeme.url}
                      alt=""
                      loading="eager"
                      className="w-auto h-auto object-contain block select-none pointer-events-none"
                      style={{
                        maxWidth: 'min(90vw - 12px, 348px)',
                        maxHeight: 'min(48vh - 12px, 368px)',
                      }}
                      draggable={false}
                    />
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* SECTION C: 4 HOME-SCREEN-MATCHED CTA BUTTONS + INK-BURST */}
          <section className="px-4 py-2 select-none relative shrink-0" onClick={(e) => e.stopPropagation()}>
            <div className="w-full max-w-[356px] mx-auto grid grid-cols-4 gap-2.5">
              {/* 1. LIKE BUTTON */}
              <button
                type="button"
                onClick={(e) => {
                  triggerCtaEffect('like', '#FF2A85', e);
                  onToggleLike(currentMeme);
                }}
                className="mc-cta-btn h-[54px] flex flex-col items-center justify-center gap-1 relative"
                style={{
                  background: isLiked
                    ? '#FF2A85'
                    : 'linear-gradient(180deg, #1e1318 0%, #151113 100%)',
                  borderColor: isLiked ? '#000000' : '#FF2A85',
                  color: isLiked ? '#000000' : '#FF2A85',
                }}
              >
                {renderBurstAndInk('like', '#FF2A85')}
                <div
                  className={`relative z-10 flex items-center justify-center ${
                    ctaEffect?.key === 'like' ? 'animate-burst' : ''
                  }`}
                >
                  <Heart
                    size={22}
                    strokeWidth={2.6}
                    fill={isLiked ? '#000000' : 'none'}
                    color={isLiked ? '#000000' : '#FF2A85'}
                  />
                </div>
                <span className="relative z-10 font-mono font-bold text-[10px] uppercase tracking-wider leading-none">
                  {isLiked ? 'LIKED' : 'LIKE'}
                </span>
              </button>

              {/* 2. REMOVE BUTTON (Always active purple since meme is inside Vault) */}
              <button
                type="button"
                onClick={(e) => {
                  triggerCtaEffect('vault', '#A855F7', e);
                  onRemoveMeme(currentMeme);
                }}
                className="mc-cta-btn h-[54px] flex flex-col items-center justify-center gap-1 relative"
                style={{
                  background: '#A855F7',
                  borderColor: '#000000',
                  color: '#000000',
                }}
                title="Remove Meme from Vault"
              >
                {renderBurstAndInk('vault', '#A855F7')}
                <div
                  className={`relative z-10 flex items-center justify-center ${
                    ctaEffect?.key === 'vault' ? 'animate-burst' : ''
                  }`}
                >
                  <BookmarkX size={22} strokeWidth={2.6} color="#000000" />
                </div>
                <span className="relative z-10 font-mono font-bold text-[10px] uppercase tracking-wider leading-none text-black">
                  REMOVE
                </span>
              </button>

              {/* 3. PIN BUTTON */}
              <button
                type="button"
                onClick={(e) => {
                  triggerCtaEffect('pin', '#FACC15', e);
                  onOpenPinModal(currentMeme);
                }}
                className="mc-cta-btn h-[54px] flex flex-col items-center justify-center gap-1 relative"
                style={{
                  background: isPinned
                    ? '#FACC15'
                    : 'linear-gradient(180deg, #231e12 0%, #171510 100%)',
                  borderColor: isPinned ? '#000000' : '#FACC15',
                  color: isPinned ? '#000000' : '#FACC15',
                }}
              >
                {renderBurstAndInk('pin', '#FACC15')}
                <div
                  className={`relative z-10 flex items-center justify-center ${
                    ctaEffect?.key === 'pin' ? 'animate-burst' : ''
                  }`}
                >
                  <MapPin
                    size={22}
                    strokeWidth={2.6}
                    fill={isPinned ? '#000000' : 'none'}
                    color={isPinned ? '#000000' : '#FACC15'}
                  />
                </div>
                <span className="relative z-10 font-mono font-bold text-[10px] uppercase tracking-wider leading-none">
                  {isPinned ? 'PINNED' : 'PIN'}
                </span>
              </button>

              {/* 4. MORE BUTTON + ANCHORED UPWARD MENU */}
              <div className="relative flex z-50">
                <button
                  type="button"
                  onClick={(e) => {
                    triggerCtaEffect('more', '#00E5FF', e);
                    setShowMoreMenu((prev) => !prev);
                  }}
                  className="mc-cta-btn h-[54px] w-full flex flex-col items-center justify-center gap-1 relative z-50"
                  style={{
                    background: showMoreMenu
                      ? '#00E5FF'
                      : 'linear-gradient(180deg, #111a1f 0%, #0f1418 100%)',
                    borderColor: showMoreMenu ? '#000000' : '#00E5FF',
                    color: showMoreMenu ? '#000000' : '#00E5FF',
                  }}
                  aria-expanded={showMoreMenu}
                >
                  {renderBurstAndInk('more', '#00E5FF')}
                  <div
                    className={`relative z-10 flex items-center justify-center ${
                      ctaEffect?.key === 'more' ? 'animate-burst' : ''
                    }`}
                  >
                    <MoreVertical
                      size={22}
                      strokeWidth={2.8}
                      color={showMoreMenu ? '#000000' : '#00E5FF'}
                    />
                  </div>
                  <span className="relative z-10 font-mono font-bold text-[10px] uppercase tracking-wider leading-none">
                    MORE
                  </span>
                </button>

                {/* Secondary Popover Menu (#moreMenu) */}
                {showMoreMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-40 bg-transparent"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMoreMenu(false);
                      }}
                    />
                    <div
                      className="absolute right-0 bottom-full mb-3 w-44 bg-white border-4 border-black shadow-[4px_4px_0px_#000000] z-50 flex flex-col divide-y-4 divide-black animate-more-menu select-none"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setShowMoreMenu(false);
                          onShareMeme(currentMeme);
                        }}
                        className="w-full h-10 bg-[#A855F7] px-3 flex items-center gap-2.5 active:opacity-90 font-mono font-bold text-[12px] text-black uppercase cursor-pointer"
                      >
                        <Share2 size={16} strokeWidth={2.5} color="#000" />
                        <span>SHARE</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowMoreMenu(false);
                          onDownloadMeme(currentMeme);
                        }}
                        className="w-full h-10 bg-[#FACC15] px-3 flex items-center gap-2.5 active:opacity-90 font-mono font-bold text-[12px] text-black uppercase cursor-pointer"
                      >
                        <Download size={16} strokeWidth={2.5} color="#000" />
                        <span>DOWNLOAD</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowMoreMenu(false);
                          onOpenReportModal(currentMeme);
                        }}
                        className="w-full h-10 bg-[#FF2A85] px-3 flex items-center gap-2.5 active:opacity-90 font-mono font-bold text-[12px] text-black uppercase cursor-pointer"
                      >
                        <Flag size={16} strokeWidth={2.5} color="#000" />
                        <span>REPORT</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </section>

          {/* SECTION D: BOTTOM HORIZONTAL THUMBNAIL FILMSTRIP */}
          <footer className="border-t border-[#2b2933] bg-[#121116] pt-2 pb-2 px-3 flex flex-col items-center select-none shrink-0">
            {/* Filmstrip Scrolling Track */}
            <div
              className="w-full flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-1"
              onTouchStart={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
            >
              {memes.map((m, idx) => {
                const isActive = idx === activeIndex;
                return (
                  <div
                    key={m.url || idx}
                    ref={isActive ? activeThumbRef : null}
                    onClick={() => {
                      if (idx !== activeIndex && !isTransitioningRef.current) {
                        setTrackTransition('none');
                        setSwipeOffset(0);
                        setActiveIndex(idx);
                      }
                    }}
                    className="flex flex-col items-center flex-shrink-0 cursor-pointer"
                  >
                    <div
                      className={`overflow-hidden transition-all duration-150 ${
                        isActive
                          ? 'w-[54px] h-[54px] border-[3px] border-[#f4c300] outline outline-2 outline-black bg-black shadow-[2px_2px_0px_#000]'
                          : 'w-12 h-12 opacity-50 border-[1.5px] border-[#302d38] hover:opacity-80'
                      }`}
                    >
                      <img src={m.url} alt="" className="w-full h-full object-cover" />
                    </div>
                    {isActive ? (
                      <div className="w-5 h-[3px] bg-[#f4c300] mt-1.5" />
                    ) : (
                      <div className="w-5 h-[3px] bg-transparent mt-1.5" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Android Home Gesture Indicator Bar */}
            <div className="mt-2 w-[72px] h-1 bg-white/70" />
          </footer>
        </section>
      </div>
    </>
  );
});

VaultPreviewSheet.displayName = 'VaultPreviewSheet';
