import React, { useState } from 'react';
import {
  X,
  Flag,
  AlertTriangle,
  ShieldAlert,
  Loader2,
  CheckCircle,
} from 'lucide-react';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  meme: {
    id?: string;
    url: string;
    title: string;
    author: string;
    source?: string;
  } | null;
  onSubmitReport: (reason: string, details: string) => Promise<void>;
  isSubmitting: boolean;
}

const REPORT_REASONS = [
  {
    id: 'offensive_author',
    label: 'OFFENSIVE AUTHOR / USERNAME',
    description: 'Inappropriate or harmful username/handle',
  },
  {
    id: 'hate_speech',
    label: 'HATE SPEECH / HARASSMENT',
    description: 'Attacking individuals, groups, or slurs',
  },
  {
    id: 'nsfw_content',
    label: 'INAPPROPRIATE / NSFW CONTENT',
    description: 'Adult, sexual, or overtly graphic material',
  },
  {
    id: 'violence_danger',
    label: 'VIOLENT OR DANGEROUS CONTENT',
    description: 'Promoting self-harm, weapons, or violence',
  },
  {
    id: 'other',
    label: 'OTHER VIOLATION',
    description: 'Spam, copyright, or other issues',
  },
];

export default function ReportModal({
  isOpen,
  onClose,
  meme,
  onSubmitReport,
  isSubmitting,
}: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>(REPORT_REASONS[0].label);
  const [details, setDetails] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen || !meme) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReason) {
      setErrorMsg('PLEASE SELECT A REASON');
      return;
    }
    setErrorMsg('');
    await onSubmitReport(selectedReason, details.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-lg animate-in fade-in duration-200">
      <div className="w-full max-w-[480px] bg-surface-container border-[4px] border-error-container shadow-[8px_8px_0px_0px_var(--color-secondary-container)] relative flex flex-col overflow-hidden text-on-surface max-h-[90vh]">
        {/* Header */}
        <div className="bg-surface-container-low border-b-[3px] border-outline px-md py-sm flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <ShieldAlert size={20} className="text-error" />
            <span className="font-label-xl text-[15px] uppercase text-error tracking-wider font-bold">
              REPORT CONTENT
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center border-[2px] border-outline bg-surface-container hover:bg-error-container hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-md flex flex-col gap-sm overflow-y-auto">
          {/* Target preview info */}
          <div className="bg-surface-container-low border-[2px] border-outline/50 p-3 flex flex-col gap-1">
            <span className="font-label-md text-[10px] text-outline uppercase tracking-wider">FLAGGED ITEM</span>
            <div className="flex items-center justify-between gap-2">
              <span className="font-headline-lg-mobile text-[16px] text-on-surface uppercase truncate font-bold">
                {meme.source === 'Reddit' ? meme.title : 'MEME CAPSULE DROP'}
              </span>
              <span className="font-label-md text-[10px] text-tertiary uppercase border border-tertiary/40 px-1 py-0.5 shrink-0">
                {meme.source || 'MEME'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="font-label-md text-[11px] text-error font-mono">
                AUTHOR: @{meme.author}
              </span>
            </div>
          </div>

          {/* Reason selection */}
          <div className="flex flex-col gap-1.5">
            <label className="font-label-md text-[11px] text-outline uppercase tracking-wider">
              SELECT REASON FOR REPORT
            </label>
            <div className="flex flex-col gap-1.5">
              {REPORT_REASONS.map((r) => {
                const isSelected = selectedReason === r.label;
                return (
                  <button
                    type="button"
                    key={r.id}
                    onClick={() => setSelectedReason(r.label)}
                    className={`flex flex-col items-start p-2.5 text-left border-[2px] transition-all ${
                      isSelected
                        ? 'border-error bg-error-container/40 text-on-surface shadow-[2px_2px_0px_0px_var(--color-error)]'
                        : 'border-outline/40 bg-surface-container-low hover:border-outline text-on-surface/80'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-label-xl text-[12px] uppercase font-bold tracking-tight">
                        {r.label}
                      </span>
                      {isSelected && <CheckCircle size={14} className="text-error" />}
                    </div>
                    <span className="font-body-md text-[12px] text-on-surface-variant/90 mt-0.5 normal-case leading-snug">
                      {r.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Details input */}
          <div className="flex flex-col gap-1">
            <label className="font-label-md text-[11px] text-outline uppercase tracking-wider">
              ADDITIONAL DETAILS (OPTIONAL)
            </label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Provide any additional context (e.g. offensive username, targeted hate, etc.)..."
              rows={2}
              maxLength={300}
              className="w-full bg-surface-container-low border-[2px] border-outline text-on-surface font-body-md text-[13px] p-2 focus:outline-none focus:border-error resize-none leading-relaxed"
            />
            <span className="text-[9px] text-outline text-right font-mono">
              {details.length}/300
            </span>
          </div>

          {errorMsg && (
            <div className="flex items-center gap-1.5 text-error text-[12px] font-label-md bg-error-container/20 border border-error p-2">
              <AlertTriangle size={14} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Submit / Cancel buttons */}
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 bg-surface-container-high border-[2px] border-outline py-2.5 font-label-xl text-[13px] uppercase text-outline active:scale-[0.98] transition-all disabled:opacity-50"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-error text-[#000] border-[2px] border-background py-2.5 font-label-xl text-[13px] uppercase font-bold shadow-[3px_3px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 hover:brightness-110"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>SENDING...</span>
                </>
              ) : (
                <>
                  <Flag size={14} />
                  <span>SUBMIT REPORT</span>
                </>
              )}
            </button>
          </div>
          <p className="font-body-md text-[11px] text-outline text-center mt-1 leading-snug">
            Reported content will be hidden from your feed and submitted to moderators.
          </p>
        </form>
      </div>
    </div>
  );
}
