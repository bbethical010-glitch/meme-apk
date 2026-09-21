import React from 'react';
import {
  X,
  Crown,
  ShieldCheck,
  Zap,
  Layers,
  Infinity,
  Sparkles,
  Loader2,
} from 'lucide-react';

interface ProUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPurchase: () => void;
  onRestore: () => void;
  isPurchasing: boolean;
}

const PRO_FEATURES = [
  {
    icon: ShieldCheck,
    title: 'ZERO ADS. FOREVER.',
    description: 'All interstitial & rewarded ads are permanently nuked. Pure, uninterrupted meme drops.',
    color: 'text-secondary-container',
  },
  {
    icon: Layers,
    title: 'TRIPLE DROP MODE',
    description: 'Unlock "TRIPLE DROP" — fetch 3 memes at once in a swipeable gallery. 3x the chaos per tap.',
    color: 'text-tertiary',
  },
  {
    icon: Infinity,
    title: 'UNLIMITED VAULT',
    description: 'Free users can save 20 memes. Pro users? Infinite vault. Hoard every legendary drop forever.',
    color: 'text-primary',
  },
  {
    icon: Zap,
    title: 'PRIORITY DROPS',
    description: 'Bonus Reward Drops work instantly — no ad required. Just tap and receive your dank payload.',
    color: 'text-secondary',
  },
];

export default function ProUpgradeModal({ isOpen, onClose, onPurchase, onRestore, isPurchasing }: ProUpgradeModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-lg animate-in fade-in duration-200">
      <div className="w-full max-w-[500px] bg-surface-container border-[4px] border-secondary-container shadow-[8px_8px_0px_0px_var(--color-primary-container)] relative flex flex-col overflow-hidden text-on-surface max-h-[90vh]">
        {/* Header */}
        <div className="bg-surface-container-low border-b-[3px] border-outline px-md py-sm flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <Crown size={20} className="text-secondary-container animate-bounce" style={{ animationDuration: '1.5s' }} />
            <span className="font-label-xl text-[15px] uppercase text-secondary-container tracking-wider font-bold">
              UPGRADE TO PRO
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-outline hover:text-on-surface border-[2px] border-outline bg-background active:translate-x-0.5 active:translate-y-0.5 transition-all"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1 p-md sm:p-lg flex flex-col gap-md">
          {/* Hero Banner */}
          <div className="w-full bg-gradient-to-br from-secondary-container via-primary-container to-tertiary-container border-[3px] border-background shadow-[5px_5px_0px_0px_#000] p-md flex flex-col items-center justify-center gap-2 relative overflow-hidden">
            <div className="absolute -top-4 -right-4 opacity-10 font-headline-xl text-[120px] text-white select-none rotate-12">
              💎
            </div>
            <span className="border-[2px] border-background bg-background text-secondary-container px-3 py-1 font-label-md text-[12px] uppercase font-bold tracking-widest rotate-[-2deg] shadow-[2px_2px_0px_0px_var(--color-tertiary)]">
              ONE-TIME PURCHASE
            </span>
            <h2 className="font-headline-xl text-[42px] sm:text-[52px] text-white tracking-tighter uppercase leading-none text-center drop-shadow-[3px_3px_0px_#000]">
              MEME PRO
            </h2>
            <p className="font-label-xl text-[14px] text-white/90 uppercase tracking-wider text-center">
              UNLOCK THE FULL GIGACHAD EXPERIENCE
            </p>
          </div>

          {/* Features List */}
          <div className="flex flex-col gap-sm">
            {PRO_FEATURES.map((feature, idx) => {
              const IconComponent = feature.icon;
              return (
                <div
                  key={idx}
                  className="bg-surface-container-low border-[2px] border-outline p-sm flex items-start gap-sm shadow-[2px_2px_0px_0px_var(--color-outline)]"
                >
                  <div className="shrink-0 w-10 h-10 bg-background border-[2px] border-outline flex items-center justify-center">
                    <IconComponent size={22} className={feature.color} />
                  </div>
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="font-label-xl text-[15px] text-on-surface uppercase font-bold tracking-tight">
                      {feature.title}
                    </span>
                    <span className="font-body-md text-[13px] text-outline leading-snug">
                      {feature.description}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Meme Quote */}
          <div className="bg-surface-container-low border-[2px] border-secondary-container p-sm shadow-[3px_3px_0px_0px_var(--color-secondary-container)] flex items-start gap-sm">
            <Sparkles size={20} className="text-secondary-container shrink-0 mt-0.5" />
            <p className="font-label-xl text-[13px] text-secondary tracking-wide uppercase italic">
              "WITH GREAT POWER COMES GREAT MEMES. INVEST IN YOUR FUTURE, KING." 👑💎
            </p>
          </div>
        </div>

        {/* Footer - Purchase Actions */}
        <div className="bg-surface-container-low border-t-[3px] border-outline p-md flex flex-col gap-sm shrink-0">
          {/* Price Tag */}
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="font-headline-xl text-[36px] text-secondary-container tracking-tighter leading-none">₹99</span>
            <div className="flex flex-col">
              <span className="font-label-md text-[11px] text-outline uppercase leading-none">ONE-TIME</span>
              <span className="font-label-md text-[11px] text-outline uppercase leading-none">FOREVER YOURS</span>
            </div>
          </div>

          {/* Purchase Button */}
          <button
            onClick={onPurchase}
            disabled={isPurchasing}
            className="w-full bg-secondary-container text-on-secondary-container border-[3px] border-background px-5 py-3 font-headline-lg-mobile text-[24px] uppercase tracking-tighter shadow-[5px_5px_0px_0px_#000] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all flex items-center justify-center gap-2 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPurchasing ? (
              <>
                <Loader2 size={24} className="animate-spin" /> PROCESSING...
              </>
            ) : (
              <>
                <Crown size={24} /> BECOME A GIGACHAD
              </>
            )}
          </button>

          {/* Restore Button */}
          <button
            onClick={onRestore}
            disabled={isPurchasing}
            className="w-full text-outline hover:text-on-surface font-label-md text-[13px] uppercase underline underline-offset-4 py-1 disabled:opacity-50"
          >
            ALREADY PURCHASED? RESTORE
          </button>
        </div>
      </div>
    </div>
  );
}
