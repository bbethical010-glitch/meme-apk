import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ShieldAlert, Check, Sparkles, AlertTriangle } from 'lucide-react';

interface DateOfBirthModalProps {
  isOpen: boolean;
  onConfirm: (dob: string) => void;
}

export default function DateOfBirthModal({ isOpen, onConfirm }: DateOfBirthModalProps) {
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  const dayRef = useRef<HTMLInputElement>(null);
  const monthRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);
  const nativePickerRef = useRef<HTMLInputElement>(null);

  // Auto-focus day on open
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        dayRef.current?.focus();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Trap back navigation and Escape key while modal is open
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    };

    const handlePopState = (e: PopStateEvent) => {
      // Re-push history state to prevent navigating back
      window.history.pushState({ dobLock: true }, '');
    };

    window.history.pushState({ dobLock: true }, '');
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Validation calculations
  const d = parseInt(day, 10);
  const m = parseInt(month, 10);
  const y = parseInt(year, 10);

  const hasAllFields = day.trim().length > 0 && month.trim().length > 0 && year.trim().length === 4;

  let isValidDate = false;
  let computedAge: number | null = null;
  let validationError: string | null = null;

  const currentYear = new Date().getFullYear();

  if (hasAllFields) {
    if (isNaN(d) || isNaN(m) || isNaN(y)) {
      validationError = 'Please enter numbers only.';
    } else if (y < 1900 || y > currentYear) {
      validationError = `Enter a valid 4-digit year (1900 - ${currentYear}).`;
    } else if (m < 1 || m > 12) {
      validationError = 'Month must be between 01 and 12.';
    } else {
      const daysInMonth = new Date(y, m, 0).getDate();
      if (d < 1 || d > daysInMonth) {
        validationError = `Day must be between 01 and ${daysInMonth} for this month.`;
      } else {
        const birthDate = new Date(y, m - 1, d);
        const today = new Date();
        if (birthDate > today) {
          validationError = 'Date of birth cannot be in the future.';
        } else {
          let age = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
          }
          computedAge = age;

          if (age < 18) {
            validationError = `You must be at least 18 years old to enter Meme Capsule (age: ${age}).`;
          } else {
            isValidDate = true;
          }
        }
      }
    }
  }

  const handleDayChange = (val: string) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 2);
    setDay(cleaned);
    if (cleaned.length === 2) {
      monthRef.current?.focus();
    }
  };

  const handleMonthChange = (val: string) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 2);
    setMonth(cleaned);
    if (cleaned.length === 2) {
      yearRef.current?.focus();
    }
  };

  const handleYearChange = (val: string) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 4);
    setYear(cleaned);
  };

  const handleNativePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value; // YYYY-MM-DD
    if (val) {
      const parts = val.split('-');
      if (parts.length === 3) {
        setYear(parts[0]);
        setMonth(parts[1]);
        setDay(parts[2]);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAttemptedSubmit(true);

    if (!isValidDate || computedAge === null || computedAge < 18) {
      return;
    }

    const mm = String(m).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    const formatted = `${y}-${mm}-${dd}`;
    onConfirm(formatted);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Confirm Date of Birth"
      className="fixed inset-0 z-[2000] flex items-center justify-center p-3.5 sm:p-5 bg-black/92 backdrop-blur-lg select-none"
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <div className="w-full max-w-[460px] bg-[#1c1b1b] border-[4px] border-black shadow-[8px_8px_0px_0px_#f4c300] flex flex-col overflow-hidden text-white animate-in fade-in zoom-in-95 duration-200">
        {/* Top Header Tag */}
        <div className="bg-[#261f18] border-b-[3px] border-black px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-[#f4c300] text-black border border-black shadow-[1px_1px_0_#000]">
              <Calendar size={18} strokeWidth={2.5} />
            </div>
            <div>
              <span className="font-label-md text-[11px] text-[#f4c300] uppercase tracking-widest block font-bold">
                ONE-TIME VERIFICATION
              </span>
              <span className="font-label-md text-[10px] text-neutral-400 uppercase">
                FIRST LAUNCH REQUIREMENT
              </span>
            </div>
          </div>

          <span className="font-label-xl text-[11px] uppercase px-2 py-0.5 bg-[#dd0061] text-white font-bold border border-black shadow-[1px_1px_0_#000]">
            18+ ONLY
          </span>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 flex flex-col gap-4">
          <div>
            <h2 className="font-headline-xl text-[28px] sm:text-[32px] text-white tracking-tighter uppercase leading-none skew-x-[-2deg] mb-1.5">
              CONFIRM DATE OF BIRTH
            </h2>
            <p className="font-sans text-[13px] text-neutral-300 leading-snug">
              Please enter your date of birth to proceed into Meme Capsule. This is required once to verify age eligibility and ensure appropriate curation.
            </p>
          </div>

          {/* One-time Warning Badge */}
          <div className="p-2.5 bg-[#2a1a1a] border-2 border-[#dd0061] flex items-start gap-2 shadow-[2px_2px_0_#000]">
            <ShieldAlert size={18} className="text-[#dd0061] shrink-0 mt-0.5" />
            <div className="text-[11px] leading-tight">
              <strong className="text-white uppercase font-bold block mb-0.5">
                SINGLE-ENTRY VERIFICATION
              </strong>
              <span className="text-neutral-300">
                You can input this only once. It cannot be altered or bypassed later.
              </span>
            </div>
          </div>

          {/* DOB Input Boxes (DD / MM / YYYY) */}
          <div className="space-y-1.5 pt-1">
            <label className="font-label-xl text-[12px] text-secondary-container uppercase tracking-wider block">
              ENTER YOUR DATE OF BIRTH
            </label>

            <div className="grid grid-cols-3 gap-2.5">
              {/* Day Input */}
              <div className="flex flex-col gap-1">
                <span className="font-label-md text-[10px] text-neutral-400 uppercase">
                  DAY (DD)
                </span>
                <input
                  ref={dayRef}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={2}
                  value={day}
                  placeholder="DD"
                  onChange={(e) => handleDayChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Backspace' && !day) {
                      dayRef.current?.focus();
                    }
                  }}
                  className="w-full bg-[#131313] text-white text-center font-headline-xl text-[24px] py-2.5 border-[3px] border-outline focus:border-[#f4c300] focus:outline-none shadow-[2px_2px_0_#000] tracking-wider"
                />
              </div>

              {/* Month Input */}
              <div className="flex flex-col gap-1">
                <span className="font-label-md text-[10px] text-neutral-400 uppercase">
                  MONTH (MM)
                </span>
                <input
                  ref={monthRef}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={2}
                  value={month}
                  placeholder="MM"
                  onChange={(e) => handleMonthChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Backspace' && !month) {
                      dayRef.current?.focus();
                    }
                  }}
                  className="w-full bg-[#131313] text-white text-center font-headline-xl text-[24px] py-2.5 border-[3px] border-outline focus:border-[#f4c300] focus:outline-none shadow-[2px_2px_0_#000] tracking-wider"
                />
              </div>

              {/* Year Input */}
              <div className="flex flex-col gap-1">
                <span className="font-label-md text-[10px] text-neutral-400 uppercase">
                  YEAR (YYYY)
                </span>
                <input
                  ref={yearRef}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  value={year}
                  placeholder="YYYY"
                  onChange={(e) => handleYearChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Backspace' && !year) {
                      monthRef.current?.focus();
                    }
                  }}
                  className="w-full bg-[#131313] text-white text-center font-headline-xl text-[24px] py-2.5 border-[3px] border-outline focus:border-[#f4c300] focus:outline-none shadow-[2px_2px_0_#000] tracking-wider"
                />
              </div>
            </div>

            {/* Native Calendar Picker Button */}
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => nativePickerRef.current?.showPicker?.() || nativePickerRef.current?.click()}
                className="text-[11px] font-label-md text-[#f4c300] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Calendar size={13} />
                <span>OR PICK FROM CALENDAR</span>
              </button>
              <input
                ref={nativePickerRef}
                type="date"
                max={`${currentYear}-12-31`}
                min="1900-01-01"
                onChange={handleNativePickerChange}
                className="sr-only"
              />
            </div>
          </div>

          {/* Validation Feedback Status */}
          {validationError ? (
            <div className="p-2.5 bg-[#331111] border-2 border-[#ff5555] text-[#ffb4ab] text-[12px] font-sans flex items-center gap-2">
              <AlertTriangle size={16} className="text-[#ff5555] shrink-0" />
              <span>{validationError}</span>
            </div>
          ) : isValidDate && computedAge !== null ? (
            <div className="p-2.5 bg-[#152000] border-2 border-[#7abb00] text-[#ceff8c] text-[12px] font-label-xl uppercase flex items-center gap-2 shadow-[2px_2px_0_#000]">
              <Check size={16} className="text-[#7abb00] shrink-0 stroke-[3]" />
              <span>AGE CONFIRMED: {computedAge} YEARS OLD ✓</span>
            </div>
          ) : attemptedSubmit && !hasAllFields ? (
            <div className="p-2 bg-[#331111] border-2 border-[#ff5555] text-[#ffb4ab] text-[12px] font-sans">
              Please enter your full Day, Month, and Year to proceed.
            </div>
          ) : null}

          {/* Mandatory Submission Note */}
          <p className="text-[11px] text-neutral-400 font-sans leading-tight">
            * By confirming, you verify that you are at least 18 years old. You cannot use the application without providing a valid date of birth.
          </p>

          {/* Submit Action Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={!isValidDate}
              className={`w-full py-3.5 px-4 font-headline-xl text-[19px] uppercase border-[3px] border-black transition-all flex items-center justify-center gap-2 ${
                isValidDate
                  ? 'bg-[#f4c300] hover:bg-[#ffe08b] text-black shadow-[4px_4px_0_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer'
                  : 'bg-[#2a2a2a] text-neutral-500 border-neutral-700 cursor-not-allowed opacity-60'
              }`}
            >
              <Sparkles size={18} />
              <span>CONFIRM & ENTER CAPSULE</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
