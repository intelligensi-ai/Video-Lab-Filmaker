/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Transition, TransitionType } from '../../types/film';
import {
  Scissors,
  Blend,
  Sun,
  Zap,
  ArrowRight,
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  Circle,
  Volume2,
  Clock,
  Sparkles,
  Sliders,
  Check,
  X,
} from 'lucide-react';

interface TransitionHandleProps {
  transitionKey: string;
  fromShotId: string;
  toShotId: string;
  currentTransition?: Transition | null;
  onSetTransition: (
    fromShotId: string,
    toShotId: string,
    type: TransitionType,
    duration: number,
    audioOffset?: number
  ) => void;
  isOpen: boolean;
  onToggleOpen: () => void;
  onClose: () => void;
}

export const TRANSITION_CONFIGS: {
  type: TransitionType;
  label: string;
  category: 'dissolve' | 'wipe' | 'split' | 'cut';
  description: string;
  defaultDuration: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}[] = [
  {
    type: 'cut',
    label: 'Hard Cut',
    category: 'cut',
    description: 'Instantaneous frame cut with zero overlap',
    defaultDuration: 0,
    icon: Scissors,
    color: '#6B7280',
  },
  {
    type: 'cross-dissolve',
    label: 'Cross Dissolve',
    category: 'dissolve',
    description: 'Smooth opacity cross-fade blending both clips',
    defaultDuration: 0.8,
    icon: Blend,
    color: '#0D9488',
  },
  {
    type: 'dip-to-black',
    label: 'Dip to Black',
    category: 'dissolve',
    description: 'Fades down to 100% black then resolves to next shot',
    defaultDuration: 1.0,
    icon: Sun,
    color: '#B45309',
  },
  {
    type: 'dip-to-white',
    label: 'Dip to White',
    category: 'dissolve',
    description: 'Cinematic overexposure flash dissolve',
    defaultDuration: 0.6,
    icon: Zap,
    color: '#EAB308',
  },
  {
    type: 'wipe-right',
    label: 'Wipe Right',
    category: 'wipe',
    description: 'Horizontal linear wipe revealing from left to right',
    defaultDuration: 0.7,
    icon: ArrowRight,
    color: '#2563EB',
  },
  {
    type: 'wipe-left',
    label: 'Wipe Left',
    category: 'wipe',
    description: 'Horizontal wipe revealing right to left',
    defaultDuration: 0.7,
    icon: ArrowLeft,
    color: '#3B82F6',
  },
  {
    type: 'wipe-down',
    label: 'Wipe Down',
    category: 'wipe',
    description: 'Vertical curtain wipe from top to bottom',
    defaultDuration: 0.8,
    icon: ArrowDown,
    color: '#6366F1',
  },
  {
    type: 'iris',
    label: 'Iris Circle',
    category: 'wipe',
    description: 'Classic cinematic expanding circular iris wipe',
    defaultDuration: 0.9,
    icon: Circle,
    color: '#8B5CF6',
  },
  {
    type: 'j-cut',
    label: 'J-Cut (Audio Lead)',
    category: 'split',
    description: 'Incoming shot audio begins before the visual cut',
    defaultDuration: 0.8,
    icon: Volume2,
    color: '#059669',
  },
  {
    type: 'l-cut',
    label: 'L-Cut (Audio Lag)',
    category: 'split',
    description: 'Outgoing shot audio lingers after the visual cut',
    defaultDuration: 0.8,
    icon: Volume2,
    color: '#10B981',
  },
];

export const TransitionHandle: React.FC<TransitionHandleProps> = ({
  transitionKey,
  fromShotId,
  toShotId,
  currentTransition,
  onSetTransition,
  isOpen,
  onToggleOpen,
  onClose,
}) => {
  const currentType = currentTransition?.type || 'cut';
  const currentDuration = currentTransition ? currentTransition.duration : 0;
  const currentAudioOffset = currentTransition?.audioOffset ?? 0.8;

  const activeConfig =
    TRANSITION_CONFIGS.find((c) => c.type === currentType) ||
    (currentType === 'dissolve' ? TRANSITION_CONFIGS[1] : TRANSITION_CONFIGS[0]);

  // Dragging handle state to adjust duration
  const [isDraggingHandle, setIsDraggingHandle] = useState(false);
  const dragStartXRef = useRef(0);
  const initialDurationRef = useRef(currentDuration);

  const handleMouseDownDrag = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDraggingHandle(true);
    dragStartXRef.current = e.clientX;
    initialDurationRef.current = currentDuration || 0.5;
  };

  useEffect(() => {
    if (!isDraggingHandle) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = Math.abs(e.clientX - dragStartXRef.current);
      // 100px drag = 1.0s change
      const newDur = Math.max(0.1, Math.min(3.0, +(initialDurationRef.current + (deltaX / 100)).toFixed(2)));
      const typeToUse = currentType === 'cut' ? 'cross-dissolve' : currentType;
      onSetTransition(fromShotId, toShotId, typeToUse, newDur, currentAudioOffset);
    };

    const handleMouseUp = () => {
      setIsDraggingHandle(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingHandle, currentType, currentAudioOffset, fromShotId, toShotId, onSetTransition]);

  const IconComponent = activeConfig.icon;

  return (
    <div className="relative flex flex-col items-center justify-center shrink-0 px-1 select-none">
      {/* Draggable Transition Handle Badge & Brackets */}
      <div className="flex items-center gap-0.5 group/handle">
        {/* Left Drag Handle Bracket */}
        {currentType !== 'cut' && (
          <div
            onMouseDown={handleMouseDownDrag}
            className="w-1.5 h-6 bg-zinc-300 hover:bg-[#0D9488] rounded-l cursor-ew-resize transition-colors flex items-center justify-center text-[7px] text-zinc-600"
            title="Drag handle to adjust transition duration"
          >
            [
          </div>
        )}

        {/* Center Transition Trigger Button */}
        <button
          onClick={onToggleOpen}
          className={`px-2 py-1 rounded-md text-[10px] font-mono font-semibold transition-all border shadow-2xs flex items-center gap-1.5 ${
            currentType === 'cross-dissolve' || currentType === 'dissolve'
              ? 'bg-teal-50 text-[#0F766E] border-teal-300 hover:bg-teal-100'
              : currentType === 'dip-to-black' || currentType === 'fade'
              ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
              : currentType === 'dip-to-white'
              ? 'bg-yellow-50 text-yellow-800 border-yellow-300 hover:bg-yellow-100'
              : currentType.startsWith('wipe') || currentType === 'iris'
              ? 'bg-blue-50 text-blue-800 border-blue-300 hover:bg-blue-100'
              : currentType === 'j-cut' || currentType === 'l-cut'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
              : 'bg-white hover:bg-[#F2F7F6] text-[#52706E] border-[#D5DFDE]'
          }`}
          title="Click to select Transition Engine effect (Dissolve, Wipe, J/L-Cut, Fade)"
        >
          <IconComponent className="w-3 h-3" />
          <span className="uppercase">
            {activeConfig.label}
            {currentDuration > 0 && ` (${currentDuration}s)`}
          </span>
        </button>

        {/* Right Drag Handle Bracket */}
        {currentType !== 'cut' && (
          <div
            onMouseDown={handleMouseDownDrag}
            className="w-1.5 h-6 bg-zinc-300 hover:bg-[#0D9488] rounded-r cursor-ew-resize transition-colors flex items-center justify-center text-[7px] text-zinc-600"
            title="Drag handle to adjust transition duration"
          >
            ]
          </div>
        )}
      </div>

      {/* Transition Selection Popover Menu */}
      {isOpen && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 w-72 bg-white border border-[#CBD5D1] rounded-2xl shadow-2xl p-3 z-50 text-xs space-y-2.5">
          {/* Header */}
          <div className="flex items-center justify-between pb-1.5 border-b border-[#E5EFEF]">
            <div className="flex items-center gap-1.5 font-bold text-xs text-[#112F2E]">
              <Sparkles className="w-3.5 h-3.5 text-[#0D9488]" />
              <span>Transition Engine</span>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-zinc-400 hover:text-zinc-700 rounded-md"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Duration Slider & Quick Presets (if not hard cut) */}
          {currentType !== 'cut' && (
            <div className="bg-[#F4F8F7] p-2 rounded-xl border border-[#D8E5E4] space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-semibold text-[#112F2E]">
                <span>Duration</span>
                <span className="font-mono text-[#0D9488] font-bold">{currentDuration}s</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="2.5"
                step="0.1"
                value={currentDuration}
                onChange={(e) =>
                  onSetTransition(
                    fromShotId,
                    toShotId,
                    currentType,
                    +e.target.value,
                    currentAudioOffset
                  )
                }
                className="w-full accent-[#0D9488] h-1.5 bg-[#D1DFDE] rounded-lg appearance-none cursor-pointer"
              />

              {/* Quick Preset Buttons */}
              <div className="flex items-center justify-between gap-1 pt-1">
                {[0.3, 0.5, 0.8, 1.2, 1.8].map((sec) => (
                  <button
                    key={sec}
                    onClick={() =>
                      onSetTransition(fromShotId, toShotId, currentType, sec, currentAudioOffset)
                    }
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono border transition-colors ${
                      currentDuration === sec
                        ? 'bg-[#0D9488] text-white border-[#0D9488]'
                        : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300'
                    }`}
                  >
                    {sec}s
                  </button>
                ))}
              </div>

              {/* J-Cut / L-Cut Audio Lead Offset Slider */}
              {(currentType === 'j-cut' || currentType === 'l-cut') && (
                <div className="pt-1.5 border-t border-[#D8E5E4] space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-emerald-800 font-semibold">
                    <span>Audio Overlap / Lead-in</span>
                    <span className="font-mono">{currentAudioOffset}s</span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="2.0"
                    step="0.1"
                    value={currentAudioOffset}
                    onChange={(e) =>
                      onSetTransition(
                        fromShotId,
                        toShotId,
                        currentType,
                        currentDuration,
                        +e.target.value
                      )
                    }
                    className="w-full accent-emerald-600 h-1 bg-[#D1DFDE] rounded appearance-none cursor-pointer"
                  />
                </div>
              )}
            </div>
          )}

          {/* Transitions List */}
          <div className="max-h-56 overflow-y-auto space-y-1 pr-0.5">
            {TRANSITION_CONFIGS.map((cfg) => {
              const isSelected =
                currentType === cfg.type ||
                (currentType === 'dissolve' && cfg.type === 'cross-dissolve') ||
                (currentType === 'fade' && cfg.type === 'dip-to-black');

              const CfgIcon = cfg.icon;

              return (
                <button
                  key={cfg.type}
                  onClick={() => {
                    const dur = cfg.type === 'cut' ? 0 : currentDuration > 0 ? currentDuration : cfg.defaultDuration;
                    onSetTransition(fromShotId, toShotId, cfg.type, dur, currentAudioOffset);
                    if (cfg.type === 'cut') onClose();
                  }}
                  className={`w-full text-left p-1.5 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                    isSelected
                      ? 'bg-[#E6F4F2] border-[#0D9488] text-[#0F766E] shadow-xs'
                      : 'bg-white hover:bg-[#F8FBFA] border-[#E5EFEF] text-zinc-700'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      style={{ color: cfg.color }}
                      className="w-5 h-5 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0"
                    >
                      <CfgIcon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-[11px] leading-tight flex items-center gap-1.5">
                        <span>{cfg.label}</span>
                        {cfg.category === 'split' && (
                          <span className="text-[8px] px-1 py-0.2 rounded bg-emerald-100 text-emerald-700 font-mono">
                            PRO AUDIO
                          </span>
                        )}
                      </div>
                      <p className="text-[9px] text-zinc-500 truncate max-w-[170px]">
                        {cfg.description}
                      </p>
                    </div>
                  </div>

                  {isSelected && <Check className="w-4 h-4 text-[#0D9488] shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
