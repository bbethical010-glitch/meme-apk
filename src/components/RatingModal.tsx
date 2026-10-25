import React, { useState } from 'react';
import { X, Star, ExternalLink, Clock, Flame } from 'lucide-react';

interface RatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRate: (stars: number) => void;
  onDefer: () => void;
}

const STAR_REACTIONS: Record<number, { text: string; color: string; icon: string }> = {
  5: { text: 'GOD-TIER DANKNESS! 🔥', color: 'text-[#FACC15] border-[#FACC15]/40 bg-[#FACC15]/10', icon: '🔥' },
  4: { text: 'CERTIFIED BANGERS! ⚡', color: 'text-[#00E5FF] border-[#00E5FF]/40 bg-[#00E5FF]/10', icon: '⚡' },
  3: { text: 'SOLID CHUCKLES 👌', color: 'text-[#34c759] border-[#34c759]/40 bg-[#34c759]/10', icon: '👌' },
  2: { text: 'NEEDS MORE SPICE 🫠', color: 'text-[#ff9800] border-[#ff9800]/40 bg-[#ff9800]/10', icon: '🫠' },
  1: { text: 'MID CORP SLOP 💀', color: 'text-[#ff3b30] border-[#ff3b30]/40 bg-[#ff3b30]/10', icon: '💀' },
};

export default function RatingModal({
  isOpen,
  onClose,
  onRate,
  onDefer,
}: RatingModalProps) {
  const [selectedStars, setSelectedStars] = useState<number>(5);
  const [hoveredStars, setHoveredStars] = useState<number | null>(null);

  if (!isOpen) return null;

  const currentStars = hoveredStars ?? selectedStars;
  const activeReaction = STAR_REACTIONS[currentStars] || STAR_REACTIONS[5];

  const handleRateSubmit = () => {
    onRate(selectedStars);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-lg animate-in fade-in duration-200">
      <div className="w-full max-w-[460px] bg-surface-container border-[4px] border-black shadow-[8px_8px_0px_0px_#f4c300] relative flex flex-col overflow-hidden text-on-surface">
        
        {/* Header */}
        <div className="bg-surface-container-low border-b-[3px] border-outline px-md py-sm flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <Flame size={20} className="text-[#f4c300] animate-pulse" />
            <span className="font-label-xl text-[15px] uppercase text-[#f4c300] tracking-wider font-bold">
              RATE MEME CAPSULE
            </span>
          </div>
          <button
            type="button"
            onClick={onDefer}
            className="w-8 h-8 flex items-center justify-center border-[2px] border-black bg-surface-container hover:bg-error-container hover:text-white transition-colors cursor-pointer shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5"
            title="Snooze 24H"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-md flex flex-col gap-4">
          
          {/* Headline & Description */}
          <div className="flex flex-col gap-1.5 text-center">
            <span className="font-headline-lg-mobile text-[18px] text-white uppercase font-bold tracking-tight">
              ENJOYING THE ZERO-ALGORITHM CHAOS?
            </span>
            <p className="font-sans text-[13px] text-neutral-300 leading-relaxed">
              Drop us a quick rating on Google Play! Your feedback helps us push fresh bangers, squash slop, and keep the arcade servers alive.
            </p>
          </div>

          {/* Interactive Star Rating Deck */}
          <div className="flex flex-col items-center justify-center gap-2.5 py-2 bg-surface-container-low border-[2px] border-outline/50 p-3 shadow-[inset_0_2px_6px_rgba(0,0,0,0.5)]">
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => {
                const isFilled = star <= currentStars;
                return (
                  <button
                    key={star}
                    type="button"
                    onMouseEnter={() => setHoveredStars(star)}
                    onMouseLeave={() => setHoveredStars(null)}
                    onClick={() => setSelectedStars(star)}
                    className="p-1 cursor-pointer transition-transform duration-100 hover:scale-125 active:scale-95 focus:outline-none"
                    aria-label={`Rate ${star} stars`}
                  >
                    <Star
                      size={36}
                      className={`transition-colors duration-150 ${
                        isFilled
                          ? 'fill-[#f4c300] text-[#f4c300] stroke-black drop-shadow-[0_0_8px_rgba(244,195,0,0.7)]'
                          : 'fill-transparent text-neutral-500 hover:text-neutral-300'
                      }`}
                      strokeWidth={2}
                    />
                  </button>
                );
              })}
            </div>

            {/* Reaction Tag Pill */}
            <div className={`px-3 py-1 border text-[12px] font-mono font-bold uppercase transition-all duration-150 ${activeReaction.color}`}>
              {activeReaction.text}
            </div>
          </div>

          {/* Primary & Defer Buttons */}
          <div className="flex flex-col gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleRateSubmit}
              className="w-full bg-[#f4c300] hover:bg-[#ffdb4d] text-black border-[3px] border-black py-3 px-4 font-label-xl text-[14px] font-bold uppercase tracking-wider shadow-[4px_4px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_0px_#000] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>RATE ON GOOGLE PLAY</span>
              <ExternalLink size={16} className="stroke-[2.5]" />
            </button>

            <button
              type="button"
              onClick={onDefer}
              className="w-full bg-surface-container-high hover:bg-neutral-800 text-neutral-200 hover:text-white border-[2px] border-outline py-2.5 px-4 font-label-xl text-[12px] uppercase tracking-wide shadow-[3px_3px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_0px_#000] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Clock size={14} className="text-secondary-container" />
              <span>REMIND ME IN 24 HOURS</span>
            </button>
          </div>

          <p className="text-[10px] text-outline text-center">
            Redirects directly to the Google Play Store app. Once submitted, this prompt will never bother you again.
          </p>
        </div>

      </div>
    </div>
  );
}
