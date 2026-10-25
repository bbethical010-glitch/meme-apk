import React, { useEffect } from 'react';
import { X, Trash2, PinOff } from 'lucide-react';
import { Meme } from './types';

interface UnpinModalProps {
  isOpen: boolean;
  meme: Meme | null;
  boardTitle?: string;
  onClose: () => void;
  onConfirm: () => void;
}

export const UnpinModal: React.FC<UnpinModalProps> = ({
  isOpen,
  meme,
  boardTitle,
  onClose,
  onConfirm,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !meme) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[400px] bg-surface-container border-[4px] border-secondary-container shadow-[8px_8px_0px_0px_var(--color-primary-container)] relative flex flex-col overflow-hidden text-on-surface animate-in zoom-in-95 duration-150 select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-surface-container-low border-b-[3px] border-outline px-4 py-3 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <PinOff size={18} className="text-secondary-container" />
            <span className="font-label-xl text-[14px] uppercase tracking-wider font-bold text-on-surface truncate">
              {boardTitle ? `UNPIN FROM ${boardTitle}` : 'UNPIN FROM BOARD'}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center border-[2px] border-outline bg-surface-container hover:bg-surface-container-high transition-colors cursor-pointer text-on-surface"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 flex flex-col items-center gap-4">
          {/* Framed Meme Preview */}
          <div className="w-full max-h-[220px] min-h-[140px] bg-background border-[2px] border-outline shadow-[3px_3px_0px_0px_#000] overflow-hidden flex items-center justify-center relative">
            <img
              src={meme.url}
              alt={meme.title || 'Meme preview'}
              className="w-full max-h-[220px] object-contain select-none pointer-events-none"
            />
            {meme.title && (
              <div className="absolute bottom-0 inset-x-0 bg-background/90 border-t-[2px] border-outline px-2.5 py-1 truncate font-label-md text-[11px] text-on-surface uppercase text-center">
                {meme.title}
              </div>
            )}
          </div>

          {/* Copy */}
          <div className="text-center px-1">
            <h3 className="font-headline-xl text-[24px] uppercase text-on-surface leading-tight tracking-tight">
              {boardTitle ? `REMOVE FROM ${boardTitle}?` : 'REMOVE MEME?'}
            </h3>
            <p className="font-label-md text-outline uppercase text-[12px] mt-1.5 leading-relaxed max-w-[320px] mx-auto">
              {boardTitle
                ? `This will remove the meme from "${boardTitle}". You can pin it again anytime from the feed.`
                : 'This will unpin the meme from your moodboard archive. You can pin it again anytime from the feed.'}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 w-full mt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-[48px] bg-surface-container-high text-on-surface border-[2px] border-outline font-label-xl uppercase text-[14px] shadow-[3px_3px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none hover:bg-surface-container-highest transition-all flex items-center justify-center cursor-pointer"
              style={{ touchAction: 'manipulation' }}
            >
              CANCEL
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="flex-1 h-[48px] bg-error-container text-on-error-container border-[2px] border-background font-label-xl uppercase text-[14px] shadow-[3px_3px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none hover:brightness-110 transition-all flex items-center justify-center gap-1.5 cursor-pointer font-bold"
              style={{ touchAction: 'manipulation' }}
            >
              <Trash2 size={16} />
              <span>UNPIN</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnpinModal;
