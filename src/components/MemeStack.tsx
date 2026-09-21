import React, { useRef, useImperativeHandle, forwardRef, useEffect, useState } from 'react';
import { useSprings, to } from '@react-spring/web';
import { useDrag } from '@use-gesture/react';
import { MemeCard } from './MemeCard';
import type { Meme, DismissDecision } from '../types';

export interface MemeStackRef {
  triggerKeep: () => void;
  triggerSkip: () => void;
  triggerSave: () => void;
}

interface MemeStackProps {
  memes: Meme[];
  onDismiss: (decision: DismissDecision, meme: Meme) => void;
  isLoading?: boolean;
  shakeCard?: boolean;
  memeFeedback?: string | null;
  floatingReaction?: string | null;
  onDoubleTap?: () => void;
  likedMemes?: string[];
  onToggleLike?: (m: Meme) => void;
  onShare?: (m: Meme) => void;
  onDownload?: (m: Meme) => void;
  favorites?: Meme[];
  onToggleFavorite?: (m: Meme) => void;
  onOpenReport?: (m: Meme) => void;
  memeReactions?: Record<string, string>;
  onOpenReactionPicker?: () => void;
  onOpenBoardPicker?: () => void;
  isPinnedToBoard?: (m: Meme) => boolean;
  onLongPress?: (m: Meme) => void;
}

const SPRING_CONFIG = {
  tension: 280,
  friction: 26,
  mass: 1.2,
};

const POS_CONFIG = [
  // Position 0 (Active front card)
  {
    scale: 1.0,
    y: 0,
    z: 0,
    x: 0,
    rotateZ: 0,
    opacity: 1.0,
    zIndex: 40,
    boxShadow: '8px 8px 0px #f4c300',
  },
  // Position 1 (Second card)
  {
    scale: 0.95,
    y: 18,
    z: -40,
    x: 0,
    rotateZ: 0,
    opacity: 0.9,
    zIndex: 30,
    boxShadow: '6px 6px 0px #9b30ff',
  },
  // Position 2 (Third card)
  {
    scale: 0.90,
    y: 34,
    z: -80,
    x: 0,
    rotateZ: 0,
    opacity: 0.75,
    zIndex: 20,
    boxShadow: '4px 4px 0px #dd0061',
  },
  // Position 3 (Fourth card)
  {
    scale: 0.85,
    y: 48,
    z: -120,
    x: 0,
    rotateZ: 0,
    opacity: 0.5,
    zIndex: 10,
    boxShadow: '0px 0px 0px rgba(0,0,0,0)',
  },
];

export const MemeStack = forwardRef<MemeStackRef, MemeStackProps>(
  (
    {
      memes,
      onDismiss,
      isLoading = false,
      shakeCard = false,
      memeFeedback = null,
      floatingReaction = null,
      onDoubleTap,
      likedMemes = [],
      onToggleLike,
      onShare,
      onDownload,
      favorites = [],
      onToggleFavorite,
      onOpenReport,
      memeReactions = {},
      onOpenReactionPicker,
      onOpenBoardPicker,
      isPinnedToBoard,
      onLongPress,
    },
    ref
  ) => {
    const isDismissingRef = useRef(false);
    const [isDragging, setIsDragging] = useState(false);
    const lastTapTimeRef = useRef<number>(0);
    const pointerDownPosRef = useRef<{ x: number; y: number } | null>(null);
    const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Visible 4 cards
    const visibleMemes = memes.slice(0, 4);
    const [activeDimensions, setActiveDimensions] = useState<{ width: number; height: number } | null>(null);

    // Spring controller for 4 card positions
    const [springs, api] = useSprings(4, (index) => ({
      ...POS_CONFIG[index],
      config: SPRING_CONFIG,
    }));

    // Reset springs and dimensions whenever the top meme changes and we're not actively dismissing
    useEffect(() => {
      setActiveDimensions(null);
      if (!isDismissingRef.current) {
        api.start((index) => ({
          ...POS_CONFIG[index],
          config: SPRING_CONFIG,
          immediate: false,
        }));
      }
    }, [memes[0]?.url, api]);

    // Handle dismissal logic with spring animation
    const dismissCard = (decision: DismissDecision) => {
      if (isDismissingRef.current || memes.length === 0) return;
      isDismissingRef.current = true;

      const activeMeme = memes[0];
      const flyoutDistanceX = typeof window !== 'undefined' ? window.innerWidth + 200 : 600;
      const flyoutDistanceY = typeof window !== 'undefined' ? window.innerHeight + 200 : 700;

      let targetX = 0;
      let targetY = 0;
      let targetRotate = 0;
      let targetScale = 1.0;

      if (decision === 'keep') {
        targetX = flyoutDistanceX;
        targetRotate = 15;
      } else if (decision === 'skip') {
        targetX = -flyoutDistanceX;
        targetRotate = -15;
      } else if (decision === 'save') {
        targetY = -flyoutDistanceY;
        targetScale = 0.5;
      }

      // Animate top card flying out and remaining cards springing forward simultaneously
      api.start((i) => {
        if (i === 0) {
          return {
            x: targetX,
            y: targetY,
            rotateZ: targetRotate,
            scale: targetScale,
            opacity: 0,
            config: { tension: 260, friction: 24, mass: 1 },
          };
        }

        // Cards 1, 2, 3 spring forward to positions 0, 1, 2
        const nextPos = POS_CONFIG[i - 1];
        return {
          ...nextPos,
          config: SPRING_CONFIG,
        };
      });

      // After flyout completes, notify parent to pop the queue and reset position values
      setTimeout(() => {
        onDismiss(decision, activeMeme);
        // Reset springs back to default layout for the new top 4 memes
        api.start((i) => ({
          ...POS_CONFIG[i],
          immediate: true,
        }));
        isDismissingRef.current = false;
      }, 260);
    };

    // Imperative methods for external triggers (like HIT ME button)
    useImperativeHandle(ref, () => ({
      triggerKeep: () => dismissCard('keep'),
      triggerSkip: () => dismissCard('skip'),
      triggerSave: () => dismissCard('save'),
    }));

    // Gesture binding for Position 0 using @use-gesture/react
    const bind = useDrag(
      ({ active, movement: [mx, my], velocity: [vx, vy], direction: [dx, dy], cancel }) => {
        if (isDismissingRef.current) {
          cancel();
          return;
        }

        setIsDragging(active);

        // While dragging: active card tracks pointer; second card scales up toward 1.0
        if (active) {
          api.start((i) => {
            if (i === 0) {
              return {
                x: mx,
                y: my,
                rotateZ: (mx / 80) * 15,
                scale: 1.0,
                immediate: true,
              };
            }
            if (i === 1) {
              const dragDistance = Math.max(Math.abs(mx), Math.max(0, -my));
              const progress = Math.min(1, dragDistance / 80);
              return {
                scale: 0.95 + progress * 0.05,
                y: 18 - progress * 18,
                opacity: 0.9 + progress * 0.1,
                immediate: true,
              };
            }
            return {};
          });
          return;
        }

        // On release: check drag thresholds (80px horizontal or 60px vertical upward)
        const isSwipeRight = mx > 80 || (vx > 0.5 && dx > 0 && mx > 25);
        const isSwipeLeft = mx < -80 || (vx > 0.5 && dx < 0 && mx < -25);
        const isSwipeUp = my < -60 || (vy > 0.5 && dy < 0 && my < -20);

        if (isSwipeRight) {
          dismissCard('keep');
        } else if (isSwipeLeft) {
          dismissCard('skip');
        } else if (isSwipeUp) {
          dismissCard('save');
        } else {
          // Below threshold: spring card 0 back to position 0 and card 1 back to position 1
          api.start((i) => ({
            ...POS_CONFIG[i],
            config: SPRING_CONFIG,
          }));
        }
      },
      {
        filterTaps: true,
        rubberband: true,
      }
    );

    // Double-tap & Long-press detection on active card
    const handlePointerDown = (e: React.PointerEvent) => {
      pointerDownPosRef.current = { x: e.clientX, y: e.clientY };

      // Long press (600ms) for gallery download
      if (onLongPress && memes[0]) {
        longPressTimerRef.current = setTimeout(() => {
          onLongPress(memes[0]);
        }, 600);
      }
    };

    const handlePointerUp = (e: React.PointerEvent) => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }

      if (!pointerDownPosRef.current) return;
      const dist = Math.hypot(
        e.clientX - pointerDownPosRef.current.x,
        e.clientY - pointerDownPosRef.current.y
      );
      pointerDownPosRef.current = null;

      // If user moved less than 8px, treat as tap
      if (dist < 8) {
        const now = Date.now();
        if (now - lastTapTimeRef.current < 320) {
          // Double-tap detected!
          if (onDoubleTap) onDoubleTap();
          lastTapTimeRef.current = 0;
        } else {
          lastTapTimeRef.current = now;
        }
      }
    };

    if (visibleMemes.length === 0) {
      return null;
    }

    return (
      <div
        className="w-full flex justify-center items-center relative perspective-deck select-none"
        style={{
          width: 'min(85vw, 380px)',
          aspectRatio: activeDimensions ? `${activeDimensions.width} / ${activeDimensions.height}` : '4/3',
          minHeight: '200px',
          maxHeight: '75vh',
        }}
      >
        {/* Render 4 stacked cards from bottom (position 3) to top (position 0) */}
        {visibleMemes.map((item, index) => {
          const springStyle = springs[index];
          const isActive = index === 0;

          // Transform with 3D depth
          const animatedTransformStyle = {
            transform: to(
              [springStyle.x, springStyle.y, springStyle.z, springStyle.scale, springStyle.rotateZ],
              (x, y, z, scale, rotateZ) =>
                `translate3d(${x}px, ${y}px, ${z}px) scale(${scale}) rotateZ(${rotateZ}deg)`
            ),
            opacity: springStyle.opacity,
            zIndex: springStyle.zIndex,
            boxShadow: springStyle.boxShadow,
          };

          return (
            <MemeCard
              key={item.url || index}
              meme={item}
              position={index}
              style={animatedTransformStyle}
              bind={isActive ? bind : undefined}
              isDragging={isActive && isDragging}
              isLoading={isActive ? isLoading : false}
              shakeCard={isActive ? shakeCard : false}
              memeFeedback={isActive ? memeFeedback : null}
              floatingReaction={isActive ? floatingReaction : null}
              onDimensionsLoaded={isActive ? setActiveDimensions : undefined}
              isLiked={isActive && likedMemes.includes(item.url)}
              onToggleLike={isActive && onToggleLike ? () => onToggleLike(item) : undefined}
              reactionEmoji={isActive ? memeReactions[item.url] : undefined}
              onOpenReactionPicker={isActive ? onOpenReactionPicker : undefined}
              onShare={isActive && onShare ? () => onShare(item) : undefined}
              onDownload={isActive && onDownload ? () => onDownload(item) : undefined}
              isFavorited={isActive && favorites.some((f) => f.url === item.url)}
              onToggleFavorite={isActive && onToggleFavorite ? () => onToggleFavorite(item) : undefined}
              onOpenBoardPicker={isActive ? onOpenBoardPicker : undefined}
              isPinnedToBoard={isActive && isPinnedToBoard ? isPinnedToBoard(item) : false}
              onOpenReport={isActive && onOpenReport ? () => onOpenReport(item) : undefined}
              onImagePointerDown={isActive ? (e: any) => handlePointerDown(e) : undefined}
              onImagePointerUp={isActive ? (e: any) => handlePointerUp(e) : undefined}
            />
          );
        })}
      </div>
    );
  }
);

MemeStack.displayName = 'MemeStack';
