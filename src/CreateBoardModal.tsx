import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Layers, Sparkles, Pipette, Palette } from 'lucide-react';
import { MoodBoard } from './types';

interface CreateBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateBoard: (title: string, color: MoodBoard['color']) => void;
}

const PRESET_NAMES = [
  'DANK VAULT',
  '3 AM THOUGHTS',
  'WORK CHAOS',
  'BRAINROT CORE',
  'GIGACHAD MOOD',
  'RELATABLE PAIN',
];

interface ColorPreset {
  id: string;
  name: string;
  hex: string;
}

const COLOR_PRESETS: ColorPreset[] = [
  { id: 'secondary', name: 'YELLOW', hex: '#f4c300' },
  { id: 'primary', name: 'PURPLE', hex: '#9b30ff' },
  { id: 'tertiary', name: 'PINK', hex: '#ff007f' },
  { id: '#00f0ff', name: 'CYAN', hex: '#00f0ff' },
  { id: '#39ff14', name: 'LIME', hex: '#39ff14' },
  { id: '#ff5500', name: 'ORANGE', hex: '#ff5500' },
  { id: '#ffffff', name: 'WHITE', hex: '#ffffff' },
  { id: '#ff2a2a', name: 'RED', hex: '#ff2a2a' },
];

export const resolveColorHex = (color?: string): string => {
  if (!color) return '#f4c300';
  if (color === 'primary') return '#9b30ff';
  if (color === 'secondary') return '#f4c300';
  if (color === 'tertiary') return '#ff007f';
  return color;
};

export const CreateBoardModal: React.FC<CreateBoardModalProps> = ({
  isOpen,
  onClose,
  onCreateBoard,
}) => {
  const [title, setTitle] = useState('');
  const [selectedColor, setSelectedColor] = useState<string>('#f4c300');
  const [customHex, setCustomHex] = useState<string>('#00F0FF');
  const colorInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setSelectedColor('#f4c300');
      setCustomHex('#00F0FF');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentEffectiveHex = resolveColorHex(selectedColor);

  const handleCustomHexChange = (value: string) => {
    let clean = value.trim();
    if (!clean.startsWith('#')) {
      clean = '#' + clean;
    }
    setCustomHex(clean);
    if (/^#[0-9A-Fa-f]{6}$/.test(clean) || /^#[0-9A-Fa-f]{3}$/.test(clean)) {
      setSelectedColor(clean);
    }
  };

  const handleNativeColorPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const hex = e.target.value.toUpperCase();
    setCustomHex(hex);
    setSelectedColor(hex);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateBoard(title, selectedColor);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-150 select-none overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[440px] my-auto bg-surface-container border-[4px] border-secondary-container shadow-[8px_8px_0px_0px_#000] relative flex flex-col overflow-hidden text-on-surface animate-in zoom-in-95 duration-150 max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
        style={{ borderColor: currentEffectiveHex }}
      >
        {/* Header */}
        <div className="bg-surface-container-low border-b-[3px] border-outline px-4 py-3 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <Layers size={18} style={{ color: currentEffectiveHex }} />
            <span className="font-label-xl text-[14px] uppercase tracking-wider font-bold text-on-surface">
              CREATE MOOD BOARD
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4 overflow-y-auto">
          <div>
            <label className="font-label-xl text-[11px] text-outline uppercase tracking-wider block mb-1.5">
              BOARD TITLE
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="E.G. 3 AM THOUGHTS, WORK PAIN..."
              maxLength={30}
              autoFocus
              className="w-full bg-background border-[3px] border-outline text-on-surface font-label-xl uppercase px-3 py-2.5 text-[15px] tracking-wide placeholder:text-outline/40 focus:border-secondary-container focus:outline-none shadow-[2px_2px_0px_0px_#000]"
            />
          </div>

          {/* Quick Preset Buttons */}
          <div>
            <span className="font-label-md text-[10px] text-outline uppercase block mb-1.5 flex items-center gap-1">
              <Sparkles size={12} style={{ color: currentEffectiveHex }} />
              QUICK INSPIRATION
            </span>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_NAMES.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setTitle(name)}
                  className={`px-2.5 py-1 text-[11px] font-label-xl uppercase border-[2px] transition-all cursor-pointer ${
                    title.toUpperCase() === name
                      ? 'bg-secondary-container text-on-secondary-container border-background shadow-[2px_2px_0px_0px_#000]'
                      : 'bg-surface-container-high text-outline border-outline/30 hover:text-on-surface hover:border-outline'
                  }`}
                  style={{ touchAction: 'manipulation' }}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          {/* Color Accent Picker Section */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-label-xl text-[11px] text-outline uppercase tracking-wider flex items-center gap-1">
                <Palette size={13} style={{ color: currentEffectiveHex }} />
                THEME ACCENT COLOR
              </span>
              <span className="font-label-md text-[10px] uppercase font-bold text-outline">
                {selectedColor.toUpperCase()}
              </span>
            </div>

            {/* Quick Palette Grid */}
            <div className="grid grid-cols-4 gap-1.5 mb-2.5">
              {COLOR_PRESETS.map((preset) => {
                const isSelected = selectedColor.toLowerCase() === preset.hex.toLowerCase();
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setSelectedColor(preset.hex);
                      setCustomHex(preset.hex.toUpperCase());
                    }}
                    className={`py-1.5 px-2 border-[2px] flex items-center justify-center gap-1.5 cursor-pointer font-label-xl text-[11px] uppercase transition-all ${
                      isSelected
                        ? 'border-background shadow-[2px_2px_0px_0px_#000] font-bold'
                        : 'border-outline/40 bg-surface-container-low text-outline hover:text-on-surface'
                    }`}
                    style={{
                      touchAction: 'manipulation',
                      backgroundColor: isSelected ? preset.hex : undefined,
                      color: isSelected ? '#000' : undefined,
                    }}
                  >
                    <span
                      className="w-2.5 h-2.5 shrink-0 border border-black/40"
                      style={{ backgroundColor: preset.hex }}
                    />
                    <span className="truncate">{preset.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Custom Color Selector & Wheel Picker */}
            <div className="bg-surface-container-low border-[2px] border-outline/60 p-2.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {/* Native Color Picker trigger */}
                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => colorInputRef.current?.click()}
                    title="Open Color Wheel"
                    className="w-9 h-9 border-[2px] border-background shadow-[2px_2px_0px_0px_#000] cursor-pointer flex items-center justify-center transition-transform active:scale-95"
                    style={{ backgroundColor: currentEffectiveHex }}
                  >
                    <Pipette size={16} className="text-black drop-shadow-[0px_1px_1px_rgba(255,255,255,0.8)]" />
                  </button>
                  <input
                    ref={colorInputRef}
                    type="color"
                    value={currentEffectiveHex.startsWith('#') && currentEffectiveHex.length === 7 ? currentEffectiveHex : '#00F0FF'}
                    onChange={handleNativeColorPick}
                    className="absolute inset-0 opacity-0 pointer-events-none w-0 h-0"
                  />
                </div>

                <div className="flex flex-col min-w-0">
                  <span className="font-label-md text-[10px] text-outline uppercase leading-tight">
                    CUSTOM COLOR / HEX
                  </span>
                  <input
                    type="text"
                    value={customHex}
                    onChange={(e) => handleCustomHexChange(e.target.value)}
                    placeholder="#RRGGBB"
                    maxLength={7}
                    className="bg-background border border-outline/50 font-label-xl text-[13px] px-2 py-0.5 text-on-surface uppercase focus:outline-none focus:border-secondary-container w-[95px] mt-0.5"
                  />
                </div>
              </div>

              {/* Live Tag Preview */}
              <div
                className="px-3 py-1.5 border-[2px] border-background flex items-center gap-1.5 shadow-[2px_2px_0px_0px_#000] shrink-0"
                style={{ backgroundColor: currentEffectiveHex, color: '#000' }}
              >
                <span className="font-label-xl text-[11px] font-bold uppercase truncate max-w-[110px]">
                  {title.trim() ? title : 'PREVIEW'}
                </span>
                <span className="text-[10px] opacity-75 font-label-md">(0)</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 w-full mt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-[48px] bg-surface-container-high text-on-surface border-[2px] border-outline font-label-xl uppercase text-[14px] shadow-[3px_3px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none hover:bg-surface-container-highest transition-all flex items-center justify-center cursor-pointer"
              style={{ touchAction: 'manipulation' }}
            >
              CANCEL
            </button>
            <button
              type="submit"
              className="flex-1 h-[48px] text-black border-[2px] border-background font-label-xl uppercase text-[14px] shadow-[3px_3px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none hover:brightness-110 transition-all flex items-center justify-center gap-1.5 cursor-pointer font-bold"
              style={{
                touchAction: 'manipulation',
                backgroundColor: currentEffectiveHex,
              }}
            >
              <Plus size={16} strokeWidth={3} />
              <span>BUILD BOARD</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateBoardModal;
