import React, { useEffect } from 'react';

interface PurchaseCelebrationProps {
  itemName: string;
  onDismiss: () => void;
}

export default function PurchaseCelebration({
  itemName,
  onDismiss,
}: PurchaseCelebrationProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, 2400);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      onClick={onDismiss}
      className="fixed inset-0 z-[1200] flex flex-col items-center justify-center bg-black/85 p-4 cursor-pointer select-none animate-fadeIn"
      style={{ touchAction: 'manipulation' }}
    >
      <div className="relative flex flex-col items-center text-center p-8 bg-[#131313] border-[6px] border-[#f4c300] shadow-[12px_12px_0px_0px_#9b30ff] max-w-[90%] transform animate-slam">
        <div className="bg-[#f4c300] text-black font-label-xl text-[14px] px-3 py-1 mb-4 border-[2px] border-black tracking-widest uppercase">
          PURCHASE VERIFIED
        </div>
        <h1 className="font-headline-xl text-[54px] sm:text-[68px] text-[#f4c300] leading-none tracking-tighter uppercase mb-2 text-stroke-black">
          UNLOCKED!
        </h1>
        <p className="font-headline-lg text-[24px] sm:text-[30px] text-white tracking-wide uppercase mb-6">
          {itemName}
        </p>
        <div className="font-label-md text-[13px] text-neutral-300 border-2 border-outline px-4 py-2 bg-[#1c1b1b]">
          TAP ANYWHERE TO CONTINUE
        </div>
      </div>
    </div>
  );
}
