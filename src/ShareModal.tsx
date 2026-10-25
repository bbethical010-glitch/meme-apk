import React, { useState, useEffect, memo } from 'react';
import type { Meme } from './types';

export const PLAY_STORE_LINK = 'https://play.google.com/store/apps/details?id=com.meme.capsule';

export function buildMemeShareMessage(meme: Meme | null): string {
  const displayTitle =
    meme?.source === 'Reddit' && meme?.title
      ? meme.title
      : 'Meme Capsule Drop';
  return `💊 Caught this wild drop on MEME CAPSULE! 🔥\n"${displayTitle}"\n\n📲 Download Meme Capsule on Google Play:\n${PLAY_STORE_LINK}`;
}

interface ShareModalProps {
  isOpen: boolean;
  meme: Meme | null;
  activeFallbackMeme?: Meme | null;
  showRibbon?: boolean;
  onOpen: () => void;
  onClose: () => void;
  onShareToApp: (meme: Meme, shareMessage: string, targetPackage: string, appName: string) => void;
  onNativeShare: (meme: Meme, shareMessage: string) => void;
  onCopySharePayload: (textToCopy: string) => void;
}

const SHARE_SHEET_STYLES = `
  @keyframes mc-whatsapp-ring {
    0%, 100% { transform: rotate(0deg) scale(1); }
    15% { transform: rotate(-12deg) scale(1.1); }
    30% { transform: rotate(12deg) scale(1.1); }
    45% { transform: rotate(-8deg) scale(1.05); }
    60% { transform: rotate(8deg) scale(1.05); }
    75% { transform: rotate(0deg) scale(1); }
  }
  @keyframes mc-insta-spin-pulse {
    0%, 100% { transform: scale(1) rotate(0deg); }
    50% { transform: scale(1.12) rotate(6deg); }
  }
  @keyframes mc-fb-float {
    0%, 100% { transform: translate3d(0, 0px, 0) scale(1); }
    50% { transform: translate3d(0, -3px, 0) scale(1.1); }
  }
  @keyframes mc-x-slash {
    0%, 100% { transform: skewX(0deg) scale(1); }
    25% { transform: skewX(-8deg) scale(1.08); }
    50% { transform: skewX(6deg) scale(1.04); }
    75% { transform: skewX(-4deg) scale(1.06); }
  }
  @keyframes mc-tg-fly {
    0%, 100% { transform: translate3d(0px, 0px, 0) rotate(0deg); }
    40% { transform: translate3d(2px, -2px, 0) rotate(-6deg) scale(1.08); }
    70% { transform: translate3d(-1px, 1px, 0) rotate(3deg) scale(0.98); }
  }
  @keyframes mc-discord-wobble {
    0%, 100% { transform: rotate(0deg) scale(1); }
    25% { transform: rotate(-8deg) scale(1.08); }
    75% { transform: rotate(8deg) scale(1.08); }
  }
  @keyframes mc-more-pulse {
    0%, 100% { transform: scale(1) rotate(0deg); }
    50% { transform: scale(1.14) rotate(90deg); }
  }
  .mc-anim-whatsapp { animation: mc-whatsapp-ring 2.4s infinite ease-in-out; }
  .mc-anim-insta { animation: mc-insta-spin-pulse 2.2s infinite ease-in-out; }
  .mc-anim-fb { animation: mc-fb-float 2s infinite ease-in-out; }
  .mc-anim-x { animation: mc-x-slash 2.3s infinite ease-in-out; }
  .mc-anim-tg { animation: mc-tg-fly 2.1s infinite ease-in-out; }
  .mc-anim-discord { animation: mc-discord-wobble 2s infinite ease-in-out; }
  .mc-anim-more { animation: mc-more-pulse 2.6s infinite ease-in-out; }
  .mc-sheet-paused svg { animation-play-state: paused !important; }
  .mc-tactile-btn {
    transition: transform 0.08s ease, box-shadow 0.08s ease;
    cursor: pointer;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
  }
  .mc-tactile-btn:active {
    transform: translate3d(3px, 3px, 0) !important;
    box-shadow: 0px 0px 0px #000000 !important;
  }
  .mc-tactile-btn-sm {
    transition: transform 0.08s ease, box-shadow 0.08s ease;
    cursor: pointer;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
  }
  .mc-tactile-btn-sm:active {
    transform: translate3d(2px, 2px, 0) !important;
    box-shadow: 0px 0px 0px #000000 !important;
  }
`;

export const ShareModal: React.FC<ShareModalProps> = memo(({
  isOpen,
  meme,
  activeFallbackMeme,
  showRibbon = true,
  onOpen,
  onClose,
  onShareToApp,
  onNativeShare,
  onCopySharePayload,
}) => {
  const [copied, setCopied] = useState(false);
  const [sheetToast, setSheetToast] = useState<{ title: string; desc: string } | null>(null);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const sheetRef = React.useRef<HTMLElement | null>(null);
  const dragMetaRef = React.useRef<{
    active: boolean;
    startY: number;
    lastY: number;
    lastTime: number;
    velocityY: number;
    fromHandle: boolean;
  }>({
    active: false,
    startY: 0,
    lastY: 0,
    lastTime: 0,
    velocityY: 0,
    fromHandle: false,
  });

  const ribbonTouchStartYRef = React.useRef<number | null>(null);

  const effectiveMeme = meme || activeFallbackMeme || null;

  useEffect(() => {
    if (!isOpen) {
      setCopied(false);
      setSheetToast(null);
      setDragY(0);
      setIsDragging(false);
      dragMetaRef.current.active = false;
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Full promotional share message + Play Store download link (preserved 100% for clipboard & share intents)
  const shareMessage = buildMemeShareMessage(effectiveMeme);
  const displayTitle =
    effectiveMeme?.source === 'Reddit' && effectiveMeme?.title
      ? effectiveMeme.title
      : 'Meme Capsule Drop';

  const triggerSheetToast = (title: string, desc: string) => {
    setSheetToast({ title, desc });
    setTimeout(() => {
      setSheetToast((prev) => (prev?.title === title ? null : prev));
    }, 2000);
  };

  const handleCopy = async () => {
    if (!effectiveMeme) return;
    const fullCopyPayload = `${shareMessage}\n\n🖼️ ${effectiveMeme.url}`;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(fullCopyPayload);
      } else {
        const tempInput = document.createElement('textarea');
        tempInput.value = fullCopyPayload;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
      }
    } catch (err) {
      console.warn('Clipboard fallback', err);
    }
    onCopySharePayload(fullCopyPayload);
    setCopied(true);
    triggerSheetToast('COPIED TO CLIPBOARD!', 'Message + Play Store link ready to paste.');
    setTimeout(() => {
      setCopied(false);
    }, 1800);
  };

  const handleSocialClick = (appName: string, pkgName: string) => {
    if (!effectiveMeme) return;
    triggerSheetToast(`SHARING TO ${appName.toUpperCase()}`, 'Opening app...');
    onShareToApp(effectiveMeme, shareMessage, pkgName, appName);
  };

  const handleMoreNativeShare = () => {
    if (!effectiveMeme) return;
    triggerSheetToast('OPENING SHARE MENU', 'Launching system share options...');
    onNativeShare(effectiveMeme, shareMessage);
  };

  const handleQuickShare = () => {
    if (!effectiveMeme) return;
    triggerSheetToast('QUICK SHARE', 'Opening system Quick Share...');
    onNativeShare(effectiveMeme, shareMessage);
  };

  // --- Instagram-Style 0-Latency 1:1 Drag-to-Dismiss Handlers ---
  const beginDrag = (clientY: number, fromHandle: boolean) => {
    if (!isOpen) return;
    const scrollTop = sheetRef.current?.scrollTop ?? 0;
    if (!fromHandle && scrollTop > 0) return;

    const now = performance.now();
    dragMetaRef.current = {
      active: true,
      startY: clientY,
      lastY: clientY,
      lastTime: now,
      velocityY: 0,
      fromHandle,
    };
  };

  const moveDrag = (clientY: number, e?: React.SyntheticEvent) => {
    const meta = dragMetaRef.current;
    if (!meta.active || !isOpen) return;

    const deltaY = clientY - meta.startY;
    const scrollTop = sheetRef.current?.scrollTop ?? 0;

    // If dragging inside scrollable content and moving upward, allow native scroll unless already dragging sheet
    if (!meta.fromHandle && deltaY < 0 && !isDragging) {
      meta.active = false;
      return;
    }
    if (!meta.fromHandle && scrollTop > 0 && !isDragging) {
      meta.active = false;
      return;
    }

    if (deltaY > 2 || isDragging) {
      if (e && 'preventDefault' in e && e.cancelable) {
        e.preventDefault();
      }
      if (!isDragging) {
        setIsDragging(true);
      }
      const now = performance.now();
      const dt = Math.max(1, now - meta.lastTime);
      meta.velocityY = (clientY - meta.lastY) / dt;
      meta.lastY = clientY;
      meta.lastTime = now;

      // Clamped at 0 so the sheet cannot drag above its maximum expansion height
      setDragY(Math.max(0, deltaY));
    }
  };

  const endDrag = () => {
    const meta = dragMetaRef.current;
    if (!meta.active) return;
    meta.active = false;

    if (!isDragging) {
      setDragY(0);
      return;
    }

    const sheetHeight = sheetRef.current?.offsetHeight || 420;
    const dismissThreshold = sheetHeight * 0.26; // 26% of sheet height (within 25%-30% spec)
    const shouldDismiss = dragY > dismissThreshold || meta.velocityY > 0.5;

    setIsDragging(false);
    setDragY(0);

    if (shouldDismiss) {
      onClose();
    }
  };

  // Exact top horizontal border coordinate of the 3-tab bottom dock (0px breathing space)
  const dockOffsetBottom = 'calc(60px + max(env(safe-area-inset-bottom, 0px), 16px))';
  const sheetHeightEstimate = sheetRef.current?.offsetHeight || 420;
  const backdropOpacity = isOpen
    ? Math.max(0, 1 - dragY / (sheetHeightEstimate * 1.05))
    : 0;

  return (
    <>
      <style>{SHARE_SHEET_STYLES}</style>

      {/* PERSISTENT CLOSED-STATE SHARE SHEET RIBBON — SITS 100% FLUSH (0px GAP) ON TOP BORDER OF 3-TAB DOCK */}
      {showRibbon && effectiveMeme && (
        <div
          style={{
            position: 'fixed',
            left: '50%',
            bottom: dockOffsetBottom,
            transform: 'translate3d(-50%, 0, 0)',
            width: '100%',
            maxWidth: '500px',
            marginBottom: 0,
            paddingBottom: 0,
            zIndex: 49,
            display: 'flex',
            justifyContent: 'center',
            pointerEvents: isOpen ? 'none' : 'auto',
            opacity: isOpen ? 0 : 1,
            transition: 'opacity 180ms ease',
          }}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpen();
            }}
            onPointerDown={(e) => {
              e.stopPropagation();
              ribbonTouchStartYRef.current = e.clientY;
            }}
            onPointerMove={(e) => {
              e.stopPropagation();
              if (ribbonTouchStartYRef.current !== null && ribbonTouchStartYRef.current - e.clientY > 14) {
                ribbonTouchStartYRef.current = null;
                onOpen();
              }
            }}
            onPointerUp={(e) => {
              e.stopPropagation();
              ribbonTouchStartYRef.current = null;
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
              ribbonTouchStartYRef.current = e.touches[0]?.clientY ?? null;
            }}
            onTouchMove={(e) => {
              e.stopPropagation();
              const currentY = e.touches[0]?.clientY;
              if (
                ribbonTouchStartYRef.current !== null &&
                currentY !== undefined &&
                ribbonTouchStartYRef.current - currentY > 14
              ) {
                ribbonTouchStartYRef.current = null;
                onOpen();
              }
            }}
            onTouchEnd={(e) => {
              e.stopPropagation();
              ribbonTouchStartYRef.current = null;
            }}
            aria-label="Open Share Sheet"
            title="Tap or drag up to open Share Sheet"
            style={{
              width: '100%',
              height: '22px',
              margin: 0,
              padding: 0,
              backgroundColor: '#18181b',
              borderTop: '3px solid #f4c300',
              borderLeft: '3px solid #000000',
              borderRight: '3px solid #000000',
              borderBottom: '0px solid transparent',
              boxShadow: '0px -2px 0px 0px #9b30ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'ns-resize',
              touchAction: 'none',
              userSelect: 'none',
            }}
          >
            <span
              style={{
                width: '58px',
                height: '6px',
                backgroundColor: '#f4c300',
                border: '1.5px solid #000000',
                boxShadow: '1px 1px 0px #9b30ff',
                display: 'inline-block',
              }}
            />
          </button>
        </div>
      )}

      {/* BACKDROP DIMMER (Follows 1:1 drag progress, blocks background gestures when open) */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.78)',
          zIndex: 998,
          opacity: backdropOpacity,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: isDragging ? 'none' : 'opacity 300ms cubic-bezier(0.16, 1, 0.3, 1)',
          willChange: 'opacity',
        }}
      />

      {/* MINI TOAST NOTIFICATION */}
      {isOpen && sheetToast && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translate3d(-50%, 0, 0)',
            zIndex: 1030,
            width: '92%',
            maxWidth: '380px',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              backgroundColor: '#ADFF2F',
              color: '#000000',
              border: '3px solid #000000',
              padding: '10px 14px',
              boxShadow: '5px 5px 0px #000000',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <span style={{ fontSize: '18px', flexShrink: 0 }}>✅</span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <h4
                style={{
                  fontFamily: 'Anton, sans-serif',
                  fontSize: '14px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: '#000000',
                  margin: 0,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {sheetToast.title}
              </h4>
              <p
                style={{
                  fontFamily: 'monospace',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#171717',
                  margin: 0,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {sheetToast.desc}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* EXPANDING SHARE SHEET — RISES DIRECTLY FROM THE FLUSH DOCK TOP BORDER OVER 320ms */}
      <div
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: dockOffsetBottom,
          zIndex: 1005,
          display: 'flex',
          justifyContent: 'center',
          pointerEvents: isOpen ? 'auto' : 'none',
          overflow: 'hidden',
        }}
      >
        <section
          ref={sheetRef}
          className={isOpen ? '' : 'mc-sheet-paused'}
          onTouchStart={(e) => {
            e.stopPropagation();
            beginDrag(e.touches[0].clientY, false);
          }}
          onTouchMove={(e) => {
            e.stopPropagation();
            moveDrag(e.touches[0].clientY, e);
          }}
          onTouchEnd={(e) => {
            e.stopPropagation();
            endDrag();
          }}
          onTouchCancel={(e) => {
            e.stopPropagation();
            endDrag();
          }}
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
            overflowY: isDragging ? 'hidden' : 'auto',
            userSelect: 'none',
            transform: isOpen
              ? `translate3d(0, ${dragY}px, 0)`
              : 'translate3d(0, 104%, 0)',
            opacity: isOpen ? 1 : 0,
            transition: isDragging
              ? 'none'
              : 'transform 320ms cubic-bezier(0.16, 1, 0.3, 1), opacity 220ms ease',
            willChange: 'transform, opacity',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
          }}
        >
          {/* Interactive Drag Handle & Header Zone (0-Latency 1:1 Finger Tracking) */}
          <div
            onTouchStart={(e) => {
              e.stopPropagation();
              beginDrag(e.touches[0].clientY, true);
            }}
            onTouchMove={(e) => {
              e.stopPropagation();
              moveDrag(e.touches[0].clientY, e);
            }}
            onTouchEnd={(e) => {
              e.stopPropagation();
              endDrag();
            }}
            onPointerDown={(e) => {
              e.stopPropagation();
              if (e.pointerType === 'mouse') {
                beginDrag(e.clientY, true);
              }
            }}
            onPointerMove={(e) => {
              e.stopPropagation();
              if (e.pointerType === 'mouse') {
                moveDrag(e.clientY, e);
              }
            }}
            onPointerUp={(e) => {
              e.stopPropagation();
              if (e.pointerType === 'mouse') {
                endDrag();
              }
            }}
            style={{
              touchAction: 'none',
              cursor: 'grab',
              backgroundColor: '#18181b',
              padding: '10px 16px 8px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              borderBottom: '3px solid #000000',
            }}
          >
            {/* Drag Pill */}
            <div
              onClick={() => {
                if (!isDragging) onClose();
              }}
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  width: '64px',
                  height: '7px',
                  backgroundColor: '#FFDE4D',
                  border: '1.5px solid #000000',
                  boxShadow: '1px 1px 0px #dcb8ff',
                }}
              />
            </div>

            {/* Sheet Header Bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    width: '12px',
                    height: '12px',
                    backgroundColor: '#FF69B4',
                    border: '2px solid #000000',
                    display: 'inline-block',
                    flexShrink: 0,
                  }}
                />
                <h2
                  style={{
                    fontFamily: 'Anton, sans-serif',
                    fontSize: '21px',
                    color: '#FFFFFF',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    lineHeight: 1,
                    margin: 0,
                  }}
                >
                  SHARE MEME
                </h2>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="mc-tactile-btn-sm"
                style={{
                  width: '34px',
                  height: '34px',
                  backgroundColor: '#171717',
                  color: '#FFFFFF',
                  border: '3px solid #000000',
                  boxShadow: '3px 3px 0px #000000',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'Anton, sans-serif',
                  fontSize: '16px',
                  flexShrink: 0,
                }}
                aria-label="Close Share Sheet"
              >
                ✕
              </button>
            </div>
          </div>

          <div
            style={{
              padding: '12px 16px 14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            {/* Compact Meme Thumbnail Preview Card (Promotional Text Box Removed from Frontend; Payload Preserved) */}
            {effectiveMeme && (
              <div
                style={{
                  backgroundColor: '#262626',
                  border: '3px solid #000000',
                  padding: '8px 10px',
                  boxShadow: '4px 4px 0px #000000',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                {/* Thumbnail */}
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    backgroundColor: '#DCB8FF',
                    border: '2px solid #000000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    overflow: 'hidden',
                    boxShadow: '2px 2px 0px #000000',
                  }}
                >
                  <img
                    src={effectiveMeme.url}
                    alt={displayTitle}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>

                {/* Meme Title */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4
                    style={{
                      fontFamily: 'Anton, sans-serif',
                      fontSize: '15px',
                      textTransform: 'uppercase',
                      color: '#FFFFFF',
                      letterSpacing: '0.03em',
                      margin: 0,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {displayTitle}
                  </h4>
                  <span
                    style={{
                      fontSize: '10px',
                      fontFamily: 'monospace',
                      color: '#ADFF2F',
                      fontWeight: 700,
                      display: 'block',
                      marginTop: '2px',
                    }}
                  >
                    READY TO SHARE
                  </span>
                </div>

                <span
                  style={{
                    backgroundColor: '#f4c300',
                    color: '#000000',
                    border: '2px solid #000000',
                    padding: '2px 6px',
                    fontFamily: 'Anton, sans-serif',
                    fontSize: '11px',
                    letterSpacing: '0.04em',
                    flexShrink: 0,
                  }}
                >
                  HD
                </span>
              </div>
            )}

            {/* Social Media Destinations Grid (Clean, no debug headers) */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                gap: '8px',
              }}
            >
              {/* WhatsApp */}
              <button
                type="button"
                onClick={() => handleSocialClick('WhatsApp', 'com.whatsapp')}
                className="mc-tactile-btn"
                style={{
                  backgroundColor: '#25D366',
                  color: '#000000',
                  border: '3px solid #000000',
                  padding: '8px 6px',
                  boxShadow: '3px 3px 0px #000000',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                }}
              >
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    backgroundColor: '#FFFFFF',
                    border: '2px solid #000000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '2px 2px 0px #000000',
                  }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="mc-anim-whatsapp"
                    style={{ width: '22px', height: '22px', color: '#25D366' }}
                    fill="currentColor"
                  >
                    <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.1.824zm-3.423-14.416c-6.627 0-12 5.373-12 12 0 2.126.556 4.124 1.529 5.859l-1.529 5.584 5.716-1.499c1.693.923 3.633 1.456 5.699 1.456 6.627 0 12-5.373 12-12s-5.373-11.4-11.415-11.4z" />
                  </svg>
                </div>
                <span
                  style={{
                    fontFamily: 'Anton, sans-serif',
                    fontSize: '11px',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    color: '#000000',
                  }}
                >
                  WhatsApp
                </span>
              </button>

              {/* Instagram */}
              <button
                type="button"
                onClick={() => handleSocialClick('Instagram', 'com.instagram.android')}
                className="mc-tactile-btn"
                style={{
                  backgroundColor: '#FF69B4',
                  color: '#000000',
                  border: '3px solid #000000',
                  padding: '8px 6px',
                  boxShadow: '3px 3px 0px #000000',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                }}
              >
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    backgroundColor: '#FFDE4D',
                    border: '2px solid #000000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '2px 2px 0px #000000',
                  }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="mc-anim-insta"
                    style={{ width: '22px', height: '22px', color: '#000000' }}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                    <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" />
                  </svg>
                </div>
                <span
                  style={{
                    fontFamily: 'Anton, sans-serif',
                    fontSize: '11px',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    color: '#000000',
                  }}
                >
                  Instagram
                </span>
              </button>

              {/* Facebook */}
              <button
                type="button"
                onClick={() => handleSocialClick('Facebook', 'com.facebook.katana')}
                className="mc-tactile-btn"
                style={{
                  backgroundColor: '#1877F2',
                  color: '#FFFFFF',
                  border: '3px solid #000000',
                  padding: '8px 6px',
                  boxShadow: '3px 3px 0px #000000',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                }}
              >
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    backgroundColor: '#FFFFFF',
                    border: '2px solid #000000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '2px 2px 0px #000000',
                  }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="mc-anim-fb"
                    style={{ width: '22px', height: '22px', color: '#1877F2' }}
                    fill="currentColor"
                  >
                    <path d="M15.12 5.32H17V2.14A26.11 26.11 0 0 0 14.26 2c-2.72 0-4.58 1.66-4.58 4.7v2.62H6.61v3.56h3.07V22h3.68v-9.12h3.06l.46-3.56h-3.52V6.65c0-1.05.29-1.73 1.76-1.73Z" />
                  </svg>
                </div>
                <span
                  style={{
                    fontFamily: 'Anton, sans-serif',
                    fontSize: '11px',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    color: '#FFFFFF',
                  }}
                >
                  Facebook
                </span>
              </button>

              {/* X (Twitter) */}
              <button
                type="button"
                onClick={() => handleSocialClick('X (Twitter)', 'com.twitter.android')}
                className="mc-tactile-btn"
                style={{
                  backgroundColor: '#000000',
                  color: '#FFDE4D',
                  border: '3px solid #000000',
                  padding: '8px 6px',
                  boxShadow: '3px 3px 0px #000000',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                }}
              >
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    backgroundColor: '#FFDE4D',
                    border: '2px solid #000000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '2px 2px 0px #000000',
                  }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="mc-anim-x"
                    style={{ width: '18px', height: '18px', color: '#000000' }}
                    fill="currentColor"
                  >
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </div>
                <span
                  style={{
                    fontFamily: 'Anton, sans-serif',
                    fontSize: '11px',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    color: '#FFDE4D',
                  }}
                >
                  X
                </span>
              </button>

              {/* Telegram */}
              <button
                type="button"
                onClick={() => handleSocialClick('Telegram', 'org.telegram.messenger')}
                className="mc-tactile-btn"
                style={{
                  backgroundColor: '#229ED9',
                  color: '#FFFFFF',
                  border: '3px solid #000000',
                  padding: '8px 6px',
                  boxShadow: '3px 3px 0px #000000',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                }}
              >
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    backgroundColor: '#FFFFFF',
                    border: '2px solid #000000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '2px 2px 0px #000000',
                  }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="mc-anim-tg"
                    style={{ width: '22px', height: '22px', color: '#229ED9' }}
                    fill="currentColor"
                  >
                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                  </svg>
                </div>
                <span
                  style={{
                    fontFamily: 'Anton, sans-serif',
                    fontSize: '11px',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    color: '#FFFFFF',
                  }}
                >
                  Telegram
                </span>
              </button>

              {/* Discord */}
              <button
                type="button"
                onClick={() => handleSocialClick('Discord', 'com.discord')}
                className="mc-tactile-btn"
                style={{
                  backgroundColor: '#5865F2',
                  color: '#FFFFFF',
                  border: '3px solid #000000',
                  padding: '8px 6px',
                  boxShadow: '3px 3px 0px #000000',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                }}
              >
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    backgroundColor: '#ADFF2F',
                    border: '2px solid #000000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '2px 2px 0px #000000',
                  }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="mc-anim-discord"
                    style={{ width: '22px', height: '22px', color: '#000000' }}
                    fill="currentColor"
                  >
                    <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
                  </svg>
                </div>
                <span
                  style={{
                    fontFamily: 'Anton, sans-serif',
                    fontSize: '11px',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    color: '#FFFFFF',
                  }}
                >
                  Discord
                </span>
              </button>
            </div>

            {/* QuickShare & More Options Row */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: '8px',
              }}
            >
              <button
                type="button"
                onClick={handleQuickShare}
                className="mc-tactile-btn"
                style={{
                  backgroundColor: '#00F0FF',
                  color: '#000000',
                  border: '3px solid #000000',
                  padding: '9px 10px',
                  boxShadow: '3px 3px 0px #000000',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                }}
              >
                <span>📡 QUICKSHARE</span>
              </button>
              <button
                type="button"
                onClick={handleMoreNativeShare}
                className="mc-tactile-btn"
                style={{
                  backgroundColor: '#FF8C00',
                  color: '#000000',
                  border: '3px solid #000000',
                  padding: '9px 10px',
                  boxShadow: '3px 3px 0px #000000',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="mc-anim-more"
                  style={{ width: '16px', height: '16px', color: '#000000', flexShrink: 0 }}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                  <circle cx="19" cy="12" r="1.5" fill="currentColor" />
                  <circle cx="5" cy="12" r="1.5" fill="currentColor" />
                </svg>
                <span>MORE OPTIONS</span>
              </button>
            </div>

            {/* Copy to Clipboard Button */}
            <button
              type="button"
              onClick={handleCopy}
              className="mc-tactile-btn"
              style={{
                width: '100%',
                backgroundColor: copied ? '#ADFF2F' : '#FFDE4D',
                color: '#000000',
                border: '3px solid #000000',
                padding: '12px',
                boxShadow: '4px 4px 0px #000000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <span style={{ fontSize: '18px' }}>{copied ? '🔥' : '📋'}</span>
              <span
                style={{
                  fontFamily: 'Anton, sans-serif',
                  fontSize: '17px',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  color: '#000000',
                }}
              >
                {copied ? 'COPIED TO CLIPBOARD! ⚡' : 'COPY TO CLIPBOARD'}
              </span>
            </button>
          </div>
        </section>
      </div>
    </>
  );
});

export default ShareModal;
