import React, { useEffect } from 'react';
import { X, ExternalLink, MessageSquare, ThumbsUp, Sparkles, Radio } from 'lucide-react';
import type { Meme } from './types';

interface RedditInfoModalProps {
  isOpen: boolean;
  meme: Meme | null;
  onClose: () => void;
}

export const RedditInfoModal: React.FC<RedditInfoModalProps> = ({
  isOpen,
  meme,
  onClose,
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

  const redditUrl =
    meme.postLink ||
    (meme.subreddit ? `https://reddit.com/r/${meme.subreddit}` : 'https://reddit.com');

  const handleOpenReddit = () => {
    window.open(redditUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[420px] bg-surface-container border-[4px] border-secondary-container shadow-[8px_8px_0px_0px_#000] relative flex flex-col overflow-hidden text-on-surface animate-in zoom-in-95 duration-150 select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-surface-container-low border-b-[3px] border-outline px-4 py-3 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <span className="bg-[#ff4500] text-white px-2 py-0.5 text-[11px] font-bold tracking-wider uppercase border border-white/30 shadow-[1px_1px_0px_#000]">
              REDDIT
            </span>
            <span className="font-label-xl text-[14px] uppercase tracking-wider font-bold text-on-surface truncate">
              DROP INTEL
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

        {/* Modal Body */}
        <div className="p-5 flex flex-col gap-4 max-h-[80vh] overflow-y-auto">
          {/* Framed Meme Thumbnail Preview */}
          {meme.url && (
            <div className="w-full max-h-[180px] bg-background border-[2px] border-outline shadow-[3px_3px_0px_0px_#000] overflow-hidden flex items-center justify-center relative">
              <img
                src={meme.url}
                alt={meme.title || 'Meme preview'}
                className="w-full max-h-[180px] object-contain select-none pointer-events-none"
              />
            </div>
          )}

          {/* Title Block */}
          <div className="bg-surface-container-low border-[2px] border-outline/50 p-3 shadow-[2px_2px_0px_0px_#000]">
            <span className="font-label-md text-[10px] text-outline uppercase tracking-wider block mb-1">
              ORIGINAL POST TITLE
            </span>
            <h3 className="font-headline-lg text-[16px] sm:text-[18px] uppercase text-white font-bold leading-snug break-words">
              {meme.title || 'UNTITLED MASTERPIECE'}
            </h3>
          </div>

          {/* Intel Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Subreddit */}
            <div className="bg-surface-container-low border-[2px] border-outline/50 p-2.5 shadow-[2px_2px_0px_0px_#000]">
              <span className="font-label-md text-[10px] text-outline uppercase tracking-wider block mb-0.5">
                SUBREDDIT
              </span>
              <span className="font-label-xl text-[13px] text-secondary font-bold truncate block">
                r/{meme.subreddit || 'memes'}
              </span>
            </div>

            {/* Author */}
            <div className="bg-surface-container-low border-[2px] border-outline/50 p-2.5 shadow-[2px_2px_0px_0px_#000]">
              <span className="font-label-md text-[10px] text-outline uppercase tracking-wider block mb-0.5">
                AUTHOR
              </span>
              <span className="font-label-xl text-[13px] text-on-surface font-bold truncate block">
                u/{meme.author || 'reddit'}
              </span>
            </div>

            {/* Upvotes */}
            {typeof meme.likes === 'number' && meme.likes > 0 && (
              <div className="bg-surface-container-low border-[2px] border-outline/50 p-2.5 shadow-[2px_2px_0px_0px_#000]">
                <span className="font-label-md text-[10px] text-outline uppercase tracking-wider block mb-0.5">
                  UPVOTES
                </span>
                <span className="font-label-xl text-[13px] text-secondary-container font-bold truncate flex items-center gap-1">
                  <ThumbsUp size={12} />
                  {meme.likes.toLocaleString()}
                </span>
              </div>
            )}

            {/* Feed Relay */}
            <div className="bg-surface-container-low border-[2px] border-outline/50 p-2.5 shadow-[2px_2px_0px_0px_#000]">
              <span className="font-label-md text-[10px] text-outline uppercase tracking-wider block mb-0.5">
                RELAY STREAM
              </span>
              <span className="font-label-xl text-[13px] text-[#ff4500] font-bold truncate flex items-center gap-1">
                <Radio size={12} />
                AUXILIARY
              </span>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col gap-2 pt-1">
            {redditUrl && (
              <button
                type="button"
                onClick={handleOpenReddit}
                className="w-full py-2.5 px-4 bg-[#ff4500] hover:bg-[#ff5722] active:translate-x-[1px] active:translate-y-[1px] border-[2px] border-outline text-white font-headline-md text-[14px] uppercase tracking-wider flex items-center justify-center gap-2 shadow-[3px_3px_0px_0px_#000] cursor-pointer transition-all font-bold"
              >
                <span>OPEN ON REDDIT</span>
                <ExternalLink size={15} />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 px-4 bg-secondary-container hover:bg-secondary-fixed active:translate-x-[1px] active:translate-y-[1px] border-[2px] border-outline text-[#131313] font-headline-md text-[14px] uppercase tracking-wider shadow-[3px_3px_0px_0px_#000] cursor-pointer transition-all font-bold"
            >
              CLOSE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RedditInfoModal;
