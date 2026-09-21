import React, { useState } from 'react';
import {
  Flame,
  Bookmark,
  ArrowRight,
  ArrowLeft,
  X,
  Zap,
  CheckCircle2,
} from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ONBOARDING_SLIDES = [
  {
    id: 1,
    tag: '🗿',
    title: 'MEME CAPSULE',
    subtitle: 'Pure memes. Zero algorithm.',
    bullets: [
      'Tap HIT ME → instant random drop',
      'Swipe up → next meme',
      'Double-tap → like it',
    ],
    icon: Flame,
    color: 'from-primary-container to-tertiary-container',
  },
  {
    id: 2,
    tag: '⚡',
    title: 'SAVE & SHARE',
    subtitle: 'Your meme arsenal.',
    bullets: [
      'Long-press image → download to gallery',
      'Bookmark → saves to your Vault',
      'Share → send to any app instantly',
    ],
    icon: Bookmark,
    color: 'from-secondary-container to-primary-container',
  },
  {
    id: 3,
    tag: '👑',
    title: 'GO PRO',
    subtitle: 'Remove ads. Unlock everything.',
    bullets: [
      'Triple Drop → 3 memes at once',
      'Unlimited Vault storage',
      'Zero ads, forever',
    ],
    icon: Zap,
    color: 'from-tertiary-container to-secondary-container',
  },
];

export default function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  if (!isOpen) return null;

  const slide = ONBOARDING_SLIDES[currentSlide];
  const IconComponent = slide.icon;
  const isLastSlide = currentSlide === ONBOARDING_SLIDES.length - 1;

  const nextSlide = () => {
    if (isLastSlide) {
      onClose();
    } else {
      setCurrentSlide((prev) => prev + 1);
    }
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => Math.max(0, prev - 1));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="w-full max-w-[420px] bg-surface-container border-[4px] border-primary-container shadow-[8px_8px_0px_0px_var(--color-secondary-container)] relative flex flex-col overflow-hidden text-on-surface">
        {/* Compact top bar */}
        <div className="bg-surface-container-low border-b-[3px] border-outline px-md py-2 flex justify-between items-center">
          <div className="flex gap-1.5">
            {ONBOARDING_SLIDES.map((_, idx) => (
              <div
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  idx === currentSlide ? 'w-8 bg-secondary-container' : 'w-2 bg-outline-variant'
                }`}
              />
            ))}
          </div>
          <button
            onClick={onClose}
            className="p-1 text-outline hover:text-on-surface border-[2px] border-outline bg-background active:translate-x-0.5 active:translate-y-0.5 transition-all"
            title="Skip"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-md flex flex-col gap-md">
          {/* Hero icon row */}
          <div className={`w-full py-6 bg-gradient-to-br ${slide.color} border-[3px] border-background shadow-[4px_4px_0px_0px_#000] flex items-center justify-center gap-4`}>
            <span className="text-[40px] leading-none select-none">{slide.tag}</span>
            <div className="flex flex-col">
              <h2 className="font-headline-xl text-[28px] text-white tracking-tighter uppercase leading-none drop-shadow-[2px_2px_0px_#000]">
                {slide.title}
              </h2>
              <p className="font-label-xl text-[14px] text-white/80 uppercase tracking-wide mt-1">
                {slide.subtitle}
              </p>
            </div>
          </div>

          {/* Bullet points */}
          <ul className="flex flex-col gap-2">
            {slide.bullets.map((bullet, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-secondary-container font-bold text-[16px] leading-none mt-0.5">→</span>
                <span className="font-label-xl text-[15px] text-on-surface uppercase leading-snug">{bullet}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <div className="bg-surface-container-low border-t-[3px] border-outline p-md flex items-center justify-between gap-sm">
          {currentSlide > 0 ? (
            <button
              onClick={prevSlide}
              className="bg-surface-container-high text-on-surface border-[2px] border-background px-3 py-2 font-label-xl text-[14px] uppercase shadow-[3px_3px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center gap-1"
            >
              <ArrowLeft size={16} /> BACK
            </button>
          ) : (
            <button
              onClick={onClose}
              className="text-outline hover:text-on-surface font-label-md text-[13px] uppercase underline underline-offset-4"
            >
              SKIP
            </button>
          )}

          <button
            onClick={nextSlide}
            className={`flex-1 max-w-[200px] border-[3px] border-background px-4 py-2.5 font-headline-lg-mobile text-[20px] uppercase tracking-tighter shadow-[4px_4px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-2 ${
              isLastSlide
                ? 'bg-secondary-container text-on-secondary-container'
                : 'bg-primary-container text-on-primary-container'
            }`}
          >
            {isLastSlide ? (
              <>
                <CheckCircle2 size={20} /> LET'S GO
              </>
            ) : (
              <>
                NEXT <ArrowRight size={20} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
