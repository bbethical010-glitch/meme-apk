import React, { useState } from 'react';
import { ShieldCheck, FileText, Check, ChevronDown, ChevronUp, BarChart3, Radio } from 'lucide-react';

interface PrivacyConsentModalProps {
  isOpen: boolean;
  onAgree: (analyticsConsent: boolean, advertisingConsent: boolean) => void;
  onViewPolicy: () => void;
}

export default function PrivacyConsentModal({
  isOpen,
  onAgree,
  onViewPolicy,
}: PrivacyConsentModalProps) {
  const [hasConfirmedAgeAndPolicy, setHasConfirmedAgeAndPolicy] = useState(false);
  const [analyticsConsent, setAnalyticsConsent] = useState(true);
  const [advertisingConsent, setAdvertisingConsent] = useState(true);
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);

  if (!isOpen) return null;

  const handleAcceptAll = () => {
    onAgree(true, true);
  };

  const handleSaveCustom = () => {
    onAgree(analyticsConsent, advertisingConsent);
  };

  const handleEssentialOnly = () => {
    onAgree(false, false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md font-sans text-neutral-200">
      <div className="w-full max-w-[520px] bg-[#18181b] border-2 border-neutral-700 rounded-xl shadow-2xl flex flex-col overflow-hidden text-neutral-200">
        
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-neutral-800 bg-[#202024]">
          <div className="p-2 bg-purple-950/60 border border-purple-800/60 rounded-lg text-purple-400">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white leading-tight uppercase tracking-wide">
              Privacy, Consent & Terms
            </h2>
            <p className="text-xs text-neutral-400">
              Meme Capsule • Phase 1 Analytics Consent
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-4 text-xs sm:text-sm leading-relaxed text-neutral-300 overflow-y-auto max-h-[60vh]">
          <p className="text-neutral-300">
            Meme Capsule is built on privacy by default and data minimization. Please review your consent preferences below:
          </p>

          {/* Key Highlights */}
          <div className="space-y-2.5 p-3.5 bg-neutral-900 border border-neutral-800 rounded-lg text-xs">
            <div className="flex items-start gap-2.5">
              <span className="text-amber-400 font-bold shrink-0 mt-0.5">•</span>
              <div>
                <strong className="text-white">18+ Requirement:</strong> Adult humor arcade intended strictly for users aged 18 and older.
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="text-emerald-400 font-bold shrink-0 mt-0.5">•</span>
              <div>
                <strong className="text-white">Zero Accounts & Zero PII:</strong> No email, phone number, contacts, IMEI, MAC address, GPS coordinates, or personal gallery data is ever collected or transmitted.
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="text-blue-400 font-bold shrink-0 mt-0.5">•</span>
              <div>
                <strong className="text-white">Anonymous Identity:</strong> One local random install identifier is created. Events use a 64-character lowercase SHA-256 user hash.
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="text-purple-400 font-bold shrink-0 mt-0.5">•</span>
              <div>
                <strong className="text-white">Full Consent Control:</strong> You can grant, deny, or revoke analytics consent at any time in Settings.
              </div>
            </div>
          </div>

          {/* View Policy Link */}
          <div>
            <button
              type="button"
              onClick={onViewPolicy}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-neutral-800/90 hover:bg-neutral-800 border border-neutral-700 hover:border-neutral-600 rounded-lg text-blue-400 hover:text-blue-300 text-xs font-semibold transition-colors cursor-pointer"
            >
              <FileText size={15} />
              <span>Read Full Privacy Policy (memecapsule.wtf/privacy)</span>
            </button>
          </div>

          {/* Mandatory 18+ and Terms confirmation */}
          <label className="flex items-start gap-3 p-3 bg-neutral-900/60 border border-neutral-800 rounded-lg cursor-pointer hover:bg-neutral-900 transition-colors select-none">
            <div className="relative flex items-center mt-0.5">
              <input
                type="checkbox"
                checked={hasConfirmedAgeAndPolicy}
                onChange={(e) => setHasConfirmedAgeAndPolicy(e.target.checked)}
                className="peer sr-only"
                id="consent-age-checkbox"
              />
              <div className="w-5 h-5 rounded border border-neutral-600 bg-neutral-800 peer-checked:bg-purple-600 peer-checked:border-purple-500 flex items-center justify-center transition-colors">
                {hasConfirmedAgeAndPolicy && <Check size={14} className="text-white stroke-[3]" />}
              </div>
            </div>
            <span className="text-xs text-neutral-300 leading-snug">
              I confirm that I am at least <strong className="text-white">18 years of age</strong> and agree to the <strong className="text-white">Terms & Privacy Policy</strong>.
            </span>
          </label>

          {/* Granular Consent Controls Section */}
          <div className="border border-neutral-800 rounded-lg overflow-hidden bg-neutral-900/40">
            <button
              type="button"
              onClick={() => setIsCustomizeOpen(!isCustomizeOpen)}
              className="w-full flex items-center justify-between p-3 text-xs font-semibold text-neutral-300 hover:text-white hover:bg-neutral-800/50 transition-colors"
            >
              <span className="flex items-center gap-2">
                <BarChart3 size={15} className="text-purple-400" />
                <span>Customize Consent Options (Analytics & Ads)</span>
              </span>
              {isCustomizeOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {isCustomizeOpen && (
              <div className="p-3.5 space-y-3 border-t border-neutral-800 bg-neutral-950/60 text-xs">
                {/* Analytics Consent Toggle */}
                <label className="flex items-start gap-3 p-2.5 rounded bg-neutral-900/80 border border-neutral-800 cursor-pointer">
                  <div className="relative flex items-center mt-0.5">
                    <input
                      type="checkbox"
                      checked={analyticsConsent}
                      onChange={(e) => setAnalyticsConsent(e.target.checked)}
                      className="peer sr-only"
                    />
                    <div className="w-4 h-4 rounded border border-neutral-600 bg-neutral-800 peer-checked:bg-emerald-600 peer-checked:border-emerald-500 flex items-center justify-center">
                      {analyticsConsent && <Check size={12} className="text-white stroke-[3]" />}
                    </div>
                  </div>
                  <div>
                    <div className="font-semibold text-white flex items-center gap-1.5">
                      <span>Anonymous Product Analytics</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${analyticsConsent ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-neutral-800 text-neutral-400'}`}>
                        {analyticsConsent ? 'GRANTED' : 'DENIED'}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      Sends pseudonymous usage telemetry (view, like, share, app lifecycle) via SQLite batch queue to diagnose bugs and improve humor variety. Zero PII.
                    </p>
                  </div>
                </label>

                {/* Advertising Consent Toggle */}
                <label className="flex items-start gap-3 p-2.5 rounded bg-neutral-900/80 border border-neutral-800 cursor-pointer">
                  <div className="relative flex items-center mt-0.5">
                    <input
                      type="checkbox"
                      checked={advertisingConsent}
                      onChange={(e) => setAdvertisingConsent(e.target.checked)}
                      className="peer sr-only"
                    />
                    <div className="w-4 h-4 rounded border border-neutral-600 bg-neutral-800 peer-checked:bg-emerald-600 peer-checked:border-emerald-500 flex items-center justify-center">
                      {advertisingConsent && <Check size={12} className="text-white stroke-[3]" />}
                    </div>
                  </div>
                  <div>
                    <div className="font-semibold text-white flex items-center gap-1.5">
                      <span>Non-Personalized Ad Measurement</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${advertisingConsent ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-neutral-800 text-neutral-400'}`}>
                        {advertisingConsent ? 'GRANTED' : 'DENIED'}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      Measures basic AdMob display counts for rewarded bonuses and interstitial cooldowns without personal profile tracking.
                    </p>
                  </div>
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Action Footer */}
        <div className="px-5 py-4 bg-[#202024] border-t border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <button
            type="button"
            disabled={!hasConfirmedAgeAndPolicy}
            onClick={handleEssentialOnly}
            className={`w-full sm:w-auto px-4 py-2 text-xs font-semibold rounded-lg transition-all border border-neutral-700 ${
              hasConfirmedAgeAndPolicy
                ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white cursor-pointer'
                : 'bg-neutral-800/50 text-neutral-500 cursor-not-allowed opacity-60'
            }`}
          >
            Decline Analytics (Essential Only)
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {isCustomizeOpen ? (
              <button
                type="button"
                disabled={!hasConfirmedAgeAndPolicy}
                onClick={handleSaveCustom}
                className={`w-full sm:w-auto px-5 py-2 text-xs font-bold rounded-lg transition-all shadow-md ${
                  hasConfirmedAgeAndPolicy
                    ? 'bg-purple-600 hover:bg-purple-500 text-white cursor-pointer active:scale-[0.98]'
                    : 'bg-neutral-800 text-neutral-500 cursor-not-allowed opacity-60'
                }`}
              >
                Save Preferences & Continue
              </button>
            ) : (
              <button
                type="button"
                disabled={!hasConfirmedAgeAndPolicy}
                onClick={handleAcceptAll}
                className={`w-full sm:w-auto px-5 py-2 text-xs font-bold rounded-lg transition-all shadow-md ${
                  hasConfirmedAgeAndPolicy
                    ? 'bg-purple-600 hover:bg-purple-500 text-white cursor-pointer active:scale-[0.98]'
                    : 'bg-neutral-800 text-neutral-500 cursor-not-allowed opacity-60'
                }`}
              >
                Accept All & Continue
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
