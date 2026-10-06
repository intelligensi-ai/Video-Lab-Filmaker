/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Repeat,
  Volume2,
  VolumeX,
  Plus,
  Music,
  Film,
  Magnet,
  ChevronLeft,
  ChevronRight,
  Clock,
  Sparkles,
  Maximize2,
  SlidersHorizontal,
} from 'lucide-react';

export interface ShotTimeInfo {
  shotId: string;
  sceneNumber: number;
  shotNumber: number;
  shotType: string;
  action?: string;
  startTime: number;
  endTime: number;
  duration: number;
}

export interface TimelineTransportProps {
  totalDuration: number;
  currentTimeSec: number;
  isPlayingCut: boolean;
  onTogglePlayCut?: () => void;
  onSeekCutTime?: (timeSec: number) => void;
  onStepFrame?: (deltaSec: number) => void;
  onJumpCut?: (direction: 'prev' | 'next' | 'start' | 'end') => void;
  // Looping & Playback Rate
  isLoopingCut?: boolean;
  onToggleLoopCut?: () => void;
  playbackRate?: number;
  onChangePlaybackRate?: (rate: number) => void;
  // Timeline In/Out Mark Range
  timelineInPoint?: number | null;
  timelineOutPoint?: number | null;
  onSetTimelineInOut?: (inPoint: number | null, outPoint: number | null) => void;
  onPlayInOutRange?: () => void;
  // Snapping
  isSnapping?: boolean;
  onToggleSnapping?: () => void;
  // Active shot context
  currentShotNumber?: string;
  currentShotType?: string;
  currentShotDuration?: number;
  totalShotsCount?: number;
  // Master SFX audio controls
  masterSfxVolume: number;
  onChangeMasterSfxVolume: (vol: number) => void;
  isMasterSfxMuted: boolean;
  onToggleMasterSfxMute: () => void;
  totalSfxCount: number;
  onOpenSfxModal?: () => void;
  // Shots info for precision ruler
  shotsWithTimes: ShotTimeInfo[];
}

export const TimelineTransport: React.FC<TimelineTransportProps> = ({
  totalDuration,
  currentTimeSec,
  isPlayingCut,
  onTogglePlayCut,
  onSeekCutTime,
  onStepFrame,
  onJumpCut,
  isLoopingCut = false,
  onToggleLoopCut,
  playbackRate = 1.0,
  onChangePlaybackRate,
  timelineInPoint = null,
  timelineOutPoint = null,
  onSetTimelineInOut,
  onPlayInOutRange,
  isSnapping = true,
  onToggleSnapping,
  currentShotNumber,
  currentShotType,
  currentShotDuration,
  totalShotsCount = 0,
  masterSfxVolume,
  onChangeMasterSfxVolume,
  isMasterSfxMuted,
  onToggleMasterSfxMute,
  totalSfxCount,
  onOpenSfxModal,
  shotsWithTimes,
}) => {
  const rulerRef = useRef<HTMLDivElement>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [hoverPosition, setHoverPosition] = useState<{ xPct: number; timeSec: number; shot?: ShotTimeInfo } | null>(null);

  // Simulated live VU meter state during playback
  const [vuLeft, setVuLeft] = useState(0);
  const [vuRight, setVuRight] = useState(0);

  // Animate VU meters smoothly when playback is running
  useEffect(() => {
    if (!isPlayingCut || isMasterSfxMuted) {
      setVuLeft(0);
      setVuRight(0);
      return;
    }

    let frameId: number;
    const updateVu = () => {
      // Dynamic simulated audio level with realistic peak response
      const base = 0.55 * masterSfxVolume;
      const noiseL = Math.sin(Date.now() / 110) * 0.25 + Math.random() * 0.2;
      const noiseR = Math.cos(Date.now() / 95) * 0.25 + Math.random() * 0.2;
      const l = Math.max(0.05, Math.min(1.0, base + noiseL * masterSfxVolume));
      const r = Math.max(0.05, Math.min(1.0, base + noiseR * masterSfxVolume));

      setVuLeft(l);
      setVuRight(r);
      frameId = requestAnimationFrame(updateVu);
    };

    frameId = requestAnimationFrame(updateVu);
    return () => cancelAnimationFrame(frameId);
  }, [isPlayingCut, isMasterSfxMuted, masterSfxVolume]);

  // Format Timecode as HH:MM:SS:FF (at 24 fps)
  const formatTimecode = (seconds: number) => {
    const s = Math.max(0, seconds);
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    const frames = Math.floor((s % 1) * 24);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}:${String(frames).padStart(2, '0')}`;
  };

  // Format short readable time (00:00.0)
  const formatShortTime = (seconds: number) => {
    const s = Math.max(0, seconds);
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    const tenths = Math.floor((s % 1) * 10);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${tenths}`;
  };

  // Convert click/drag on ruler to timeSec with optional snapping to shot cuts
  const calculateRulerTime = useCallback(
    (clientX: number) => {
      const ruler = rulerRef.current;
      if (!ruler || totalDuration <= 0) return 0;
      const rect = ruler.getBoundingClientRect();
      const clickX = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const rawPct = clickX / rect.width;
      let targetTime = +(rawPct * totalDuration).toFixed(3);

      // Snap to shot boundary cuts if magnet is enabled and within 0.2s
      if (isSnapping) {
        for (const item of shotsWithTimes) {
          if (Math.abs(targetTime - item.startTime) < 0.22) {
            targetTime = item.startTime;
            break;
          }
          if (Math.abs(targetTime - item.endTime) < 0.22) {
            targetTime = item.endTime;
            break;
          }
        }
      }

      return Math.max(0, Math.min(totalDuration, targetTime));
    },
    [totalDuration, isSnapping, shotsWithTimes]
  );

  // Mouse handlers for precision scrubbing
  const handleRulerMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsScrubbing(true);
    const newTime = calculateRulerTime(e.clientX);
    onSeekCutTime?.(newTime);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const scrubbedTime = calculateRulerTime(moveEvent.clientX);
      onSeekCutTime?.(scrubbedTime);
    };

    const handleMouseUp = () => {
      setIsScrubbing(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Ruler hover tooltip calculation
  const handleRulerMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const ruler = rulerRef.current;
    if (!ruler || totalDuration <= 0) return;
    const rect = ruler.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const xPct = (x / rect.width) * 100;
    const timeSec = (x / rect.width) * totalDuration;

    const matchedShot = shotsWithTimes.find((s) => timeSec >= s.startTime && timeSec <= s.endTime);
    setHoverPosition({ xPct, timeSec, shot: matchedShot });
  };

  const handleRulerMouseLeave = () => {
    setHoverPosition(null);
  };

  // Global NLE Keyboard Transport shortcuts listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          (activeEl as HTMLElement).isContentEditable)
      ) {
        return;
      }

      // Space: Toggle Play/Pause
      if (e.code === 'Space') {
        e.preventDefault();
        onTogglePlayCut?.();
      }
      // J: Shuttle backwards / step back
      else if (e.code === 'KeyJ') {
        e.preventDefault();
        onStepFrame?.(-0.5);
      }
      // K: Pause playback
      else if (e.code === 'KeyK') {
        e.preventDefault();
        if (isPlayingCut) onTogglePlayCut?.();
      }
      // L: Shuttle forward / increase rate
      else if (e.code === 'KeyL') {
        e.preventDefault();
        if (!isPlayingCut) onTogglePlayCut?.();
        else if (onChangePlaybackRate) {
          const nextRate = playbackRate === 1.0 ? 1.5 : playbackRate === 1.5 ? 2.0 : 1.0;
          onChangePlaybackRate(nextRate);
        }
      }
      // Left Arrow: Step 1 frame back (Shift = 1 second)
      else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        onStepFrame?.(e.shiftKey ? -1.0 : -1 / 24);
      }
      // Right Arrow: Step 1 frame forward (Shift = 1 second)
      else if (e.code === 'ArrowRight') {
        e.preventDefault();
        onStepFrame?.(e.shiftKey ? 1.0 : 1 / 24);
      }
      // Up Arrow: Previous Cut
      else if (e.code === 'ArrowUp') {
        e.preventDefault();
        onJumpCut?.('prev');
      }
      // Down Arrow: Next Cut
      else if (e.code === 'ArrowDown') {
        e.preventDefault();
        onJumpCut?.('next');
      }
      // Home: Jump to start
      else if (e.code === 'Home') {
        e.preventDefault();
        onJumpCut?.('start');
      }
      // End: Jump to end
      else if (e.code === 'End') {
        e.preventDefault();
        onJumpCut?.('end');
      }
      // I: Mark In point
      else if (e.code === 'KeyI' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        onSetTimelineInOut?.(currentTimeSec, timelineOutPoint ?? null);
      }
      // O: Mark Out point
      else if (e.code === 'KeyO' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        onSetTimelineInOut?.(timelineInPoint ?? null, currentTimeSec);
      }
      // X: Clear In/Out marks
      else if ((e.code === 'KeyX' && e.altKey) || (e.code === 'KeyX' && !e.ctrlKey && !e.metaKey)) {
        if (timelineInPoint !== null || timelineOutPoint !== null) {
          e.preventDefault();
          onSetTimelineInOut?.(null, null);
        }
      }
      // M: Mute / Unmute Master SFX
      else if (e.code === 'KeyM' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        onToggleMasterSfxMute();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    onTogglePlayCut,
    onStepFrame,
    onJumpCut,
    isPlayingCut,
    playbackRate,
    onChangePlaybackRate,
    currentTimeSec,
    timelineInPoint,
    timelineOutPoint,
    onSetTimelineInOut,
    onToggleMasterSfxMute,
  ]);

  // Current playhead percentage on the timeline
  const playheadPct = totalDuration > 0 ? Math.max(0, Math.min(100, (currentTimeSec / totalDuration) * 100)) : 0;

  // Timeline In & Out percentage positions
  const inPointPct =
    timelineInPoint !== null && totalDuration > 0
      ? Math.max(0, Math.min(100, (timelineInPoint / totalDuration) * 100))
      : null;
  const outPointPct =
    timelineOutPoint !== null && totalDuration > 0
      ? Math.max(0, Math.min(100, (timelineOutPoint / totalDuration) * 100))
      : null;

  // Active current frame count (at 24fps)
  const currentFrame = Math.floor(currentTimeSec * 24);
  const totalFrames = Math.floor(totalDuration * 24);

  // Time remaining in cut
  const timeRemainingSec = Math.max(0, totalDuration - currentTimeSec);

  return (
    <div className="flex flex-col bg-[#F3F7F6] border-b border-[#D5DFDE] select-none shrink-0 shadow-2xs">
      {/* 1. PRIMARY TRANSPORT CONTROL DECK */}
      <div className="h-10 px-3 flex items-center justify-between gap-2 border-b border-[#DDE7E5] bg-[#F7FAFA] text-xs">
        {/* Left: Precision Transport Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Jump to Beginning (Home) */}
          <button
            onClick={() => onJumpCut?.('start')}
            className="p-1.5 rounded hover:bg-[#E5EFEF] active:bg-[#D3E5E3] text-[#4A6462] hover:text-[#112F2E] transition-colors"
            title="Go to Beginning (Home / |◀)"
          >
            <SkipBack className="w-3.5 h-3.5 fill-current" />
          </button>

          {/* Previous Cut (Up Arrow) */}
          <button
            onClick={() => onJumpCut?.('prev')}
            className="p-1.5 rounded hover:bg-[#E5EFEF] active:bg-[#D3E5E3] text-[#4A6462] hover:text-[#112F2E] transition-colors"
            title="Previous Edit / Shot (Up Arrow / ◀◀)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Step Back 1s */}
          <button
            onClick={() => onStepFrame?.(-1.0)}
            className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold text-[#4A6462] hover:bg-[#E5EFEF] hover:text-[#112F2E] transition-colors"
            title="Step Back 1.0 Second"
          >
            -1s
          </button>

          {/* Step Back 1 Frame (-1/24s) */}
          <button
            onClick={() => onStepFrame?.(-1 / 24)}
            className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold text-[#0D9488] hover:bg-[#CCFBF1] transition-colors"
            title="Step Back 1 Frame (Left Arrow / J)"
          >
            -1f
          </button>

          {/* PRIMARY PLAY / PAUSE BUTTON */}
          <button
            onClick={onTogglePlayCut}
            className={`px-3.5 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all shadow-xs ${
              isPlayingCut
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white ring-2 ring-emerald-400/50 animate-pulse'
                : 'bg-[#0D9488] hover:bg-[#0F766E] text-white active:scale-95'
            }`}
            title={isPlayingCut ? 'Pause Timeline Cut (Space)' : 'Play Program Timeline (Space)'}
          >
            {isPlayingCut ? (
              <Pause className="w-3.5 h-3.5 fill-current" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
            )}
            <span className="font-sans text-[11px] tracking-wide">
              {isPlayingCut ? 'PAUSE' : 'PLAY CUT'}
            </span>
          </button>

          {/* Step Forward 1 Frame (+1/24s) */}
          <button
            onClick={() => onStepFrame?.(1 / 24)}
            className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold text-[#0D9488] hover:bg-[#CCFBF1] transition-colors"
            title="Step Forward 1 Frame (Right Arrow / L)"
          >
            +1f
          </button>

          {/* Step Forward 1s */}
          <button
            onClick={() => onStepFrame?.(1.0)}
            className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold text-[#4A6462] hover:bg-[#E5EFEF] hover:text-[#112F2E] transition-colors"
            title="Step Forward 1.0 Second"
          >
            +1s
          </button>

          {/* Next Cut (Down Arrow) */}
          <button
            onClick={() => onJumpCut?.('next')}
            className="p-1.5 rounded hover:bg-[#E5EFEF] active:bg-[#D3E5E3] text-[#4A6462] hover:text-[#112F2E] transition-colors"
            title="Next Edit / Shot (Down Arrow / ▶▶)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Jump to End (End) */}
          <button
            onClick={() => onJumpCut?.('end')}
            className="p-1.5 rounded hover:bg-[#E5EFEF] active:bg-[#D3E5E3] text-[#4A6462] hover:text-[#112F2E] transition-colors"
            title="Go to End (End / ▶|)"
          >
            <SkipForward className="w-3.5 h-3.5 fill-current" />
          </button>

          <div className="h-4 w-px bg-[#D0DEDD] mx-1" />

          {/* Loop Playback Toggle */}
          <button
            onClick={onToggleLoopCut}
            className={`px-2 py-0.8 rounded-md text-[10px] font-semibold flex items-center gap-1 transition-all ${
              isLoopingCut
                ? 'bg-[#CCFBF1] text-[#0F766E] border border-[#0D9488]/40 ring-1 ring-[#0D9488]/30 font-bold'
                : 'text-[#52706E] hover:text-[#112F2E] hover:bg-[#E6F0EE]'
            }`}
            title="Toggle Continuous Loop Cut Playback (Cmd/Ctrl+L)"
          >
            <Repeat className={`w-3 h-3 ${isLoopingCut ? 'text-[#0D9488]' : ''}`} />
            <span>LOOP</span>
          </button>

          {/* Playback Rate / Shuttle Multipliers */}
          <div className="flex items-center bg-[#E6ECEB] rounded-md p-0.5 text-[9px] font-mono font-bold text-[#4A6462]">
            {[0.5, 1.0, 1.5, 2.0].map((rate) => (
              <button
                key={rate}
                onClick={() => onChangePlaybackRate?.(rate)}
                className={`px-1.5 py-0.5 rounded transition-all ${
                  playbackRate === rate
                    ? 'bg-white text-[#0D9488] shadow-2xs font-extrabold'
                    : 'hover:text-[#112F2E]'
                }`}
                title={`Shuttle / Playback speed: ${rate}x`}
              >
                {rate}x
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-[#D0DEDD] mx-1" />

          {/* In / Out Mark Range Controls */}
          <div className="flex items-center gap-1 text-[10px] font-mono">
            <button
              onClick={() => onSetTimelineInOut?.(currentTimeSec, timelineOutPoint ?? null)}
              className="px-1.5 py-0.5 rounded bg-white hover:bg-[#E6F4F2] border border-[#C5DCDA] text-[#0F766E] font-bold"
              title="Set Timeline Mark IN point (Key 'I')"
            >
              [ IN
            </button>
            <button
              onClick={() => onSetTimelineInOut?.(timelineInPoint ?? null, currentTimeSec)}
              className="px-1.5 py-0.5 rounded bg-white hover:bg-[#E6F4F2] border border-[#C5DCDA] text-[#0F766E] font-bold"
              title="Set Timeline Mark OUT point (Key 'O')"
            >
              OUT ]
            </button>

            {(timelineInPoint !== null || timelineOutPoint !== null) && (
              <div className="flex items-center gap-1 bg-[#EEF8F6] border border-[#0D9488]/30 px-1.5 py-0.5 rounded text-[9px] text-[#0D9488]">
                <span>
                  [{timelineInPoint !== null ? formatShortTime(timelineInPoint) : '0:00'} -{' '}
                  {timelineOutPoint !== null ? formatShortTime(timelineOutPoint) : formatShortTime(totalDuration)}]
                </span>
                {onPlayInOutRange && (
                  <button
                    onClick={onPlayInOutRange}
                    className="hover:underline font-bold text-[#0F766E]"
                    title="Play strictly between marked In and Out"
                  >
                    Play
                  </button>
                )}
                <button
                  onClick={() => onSetTimelineInOut?.(null, null)}
                  className="hover:text-rose-600 font-bold ml-0.5"
                  title="Clear In/Out marks (Alt+X)"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          {/* Snapping Magnet */}
          <button
            onClick={onToggleSnapping}
            className={`p-1 rounded transition-colors ${
              isSnapping
                ? 'bg-[#CCFBF1] text-[#0D9488]'
                : 'text-[#7D9A98] hover:text-[#112F2E] hover:bg-[#E5EFEF]'
            }`}
            title={isSnapping ? 'Snapping Enabled (Snaps to shot cuts)' : 'Snapping Disabled'}
          >
            <Magnet className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Center: Precision Monospace Timecode & Status HUD */}
        <div className="hidden lg:flex items-center gap-2">
          {/* Main Digital Timecode Readout */}
          <div className="flex items-center gap-1.5 bg-[#0F2322] px-2.5 py-1 rounded-md text-emerald-400 font-mono text-[11px] font-bold tracking-wider shadow-inner">
            <span className="text-white drop-shadow-xs">{formatTimecode(currentTimeSec)}</span>
            <span className="text-emerald-700">/</span>
            <span className="text-emerald-200/80">{formatTimecode(totalDuration)}</span>
            <span className="text-[9px] text-emerald-500/70 font-normal ml-1">
              (-{formatTimecode(timeRemainingSec)})
            </span>
          </div>

          {/* Active Shot Badge */}
          {currentShotNumber && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#E6F4F2] border border-[#C5DCDA] text-[10px] font-mono text-[#0F766E]">
              <span className="font-bold">Shot {currentShotNumber}</span>
              {currentShotType && <span className="uppercase text-[9px] opacity-80">({currentShotType})</span>}
              {typeof currentShotDuration === 'number' && (
                <span className="text-[#52706E]">· {currentShotDuration.toFixed(1)}s</span>
              )}
            </div>
          )}

          {/* Frame count & FPS */}
          <div className="hidden xl:flex items-center gap-1 text-[10px] font-mono text-[#52706E]">
            <span>Fr {currentFrame}/{totalFrames}</span>
            <span className="text-[#A5BDBB]">·</span>
            <span className="px-1 py-0.2 rounded bg-[#E8EEEE] text-[#36514F] text-[9px] font-bold">
              24 FPS
            </span>
          </div>
        </div>

        {/* Right: Master Audio VU Meters & SFX Controls */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Dual Channel Stereo Peak VU Meters (L / R) */}
          <div className="flex flex-col gap-0.5 justify-center py-0.5" title="Master Audio Peak Meters">
            {/* Left Channel */}
            <div className="flex items-center gap-1">
              <span className="text-[8px] font-mono font-bold text-[#52706E] w-2">L</span>
              <div className="w-16 h-1.5 bg-[#1F2E2D] rounded-xs flex gap-0.5 p-0.5 overflow-hidden">
                {[0.12, 0.25, 0.38, 0.5, 0.63, 0.75, 0.88, 1.0].map((step, idx) => {
                  const isActive = vuLeft >= step;
                  const isRed = idx >= 6;
                  const isYellow = idx >= 4 && idx < 6;
                  return (
                    <div
                      key={idx}
                      className={`flex-1 h-full rounded-2xs transition-colors duration-75 ${
                        isActive
                          ? isRed
                            ? 'bg-rose-500 shadow-2xs'
                            : isYellow
                            ? 'bg-amber-400'
                            : 'bg-emerald-400'
                          : 'bg-[#2A3E3C]'
                      }`}
                    />
                  );
                })}
              </div>
            </div>
            {/* Right Channel */}
            <div className="flex items-center gap-1">
              <span className="text-[8px] font-mono font-bold text-[#52706E] w-2">R</span>
              <div className="w-16 h-1.5 bg-[#1F2E2D] rounded-xs flex gap-0.5 p-0.5 overflow-hidden">
                {[0.12, 0.25, 0.38, 0.5, 0.63, 0.75, 0.88, 1.0].map((step, idx) => {
                  const isActive = vuRight >= step;
                  const isRed = idx >= 6;
                  const isYellow = idx >= 4 && idx < 6;
                  return (
                    <div
                      key={idx}
                      className={`flex-1 h-full rounded-2xs transition-colors duration-75 ${
                        isActive
                          ? isRed
                            ? 'bg-rose-500 shadow-2xs'
                            : isYellow
                            ? 'bg-amber-400'
                            : 'bg-emerald-400'
                          : 'bg-[#2A3E3C]'
                      }`}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* Master SFX Audio Slider & Mute */}
          <div className="flex items-center gap-1.5 bg-[#EAEFF0] border border-[#D0DEDD] px-2 py-0.5 rounded-md font-sans">
            <span className="font-mono font-bold text-[10px] text-[#0D9488]">A1 SFX:</span>
            <button
              onClick={onToggleMasterSfxMute}
              className={`p-1 rounded transition-colors ${
                isMasterSfxMuted ? 'bg-rose-100 text-rose-700' : 'text-[#4A6462] hover:text-[#112F2E]'
              }`}
              title={isMasterSfxMuted ? 'Unmute SFX Audio Track (M)' : 'Mute SFX Audio Track (M)'}
            >
              {isMasterSfxMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={masterSfxVolume}
              onChange={(e) => onChangeMasterSfxVolume(+e.target.value)}
              className="w-12 accent-[#0D9488] cursor-pointer"
              title={`Master SFX Volume: ${Math.round(masterSfxVolume * 100)}%`}
            />
            <span className="text-[9px] font-mono text-[#52706E] w-5">
              {Math.round(masterSfxVolume * 100)}%
            </span>

            {/* Quick Add SFX Button */}
            {onOpenSfxModal && (
              <button
                onClick={onOpenSfxModal}
                className="ml-0.5 px-2 py-0.5 bg-[#0D9488] hover:bg-[#0F766E] text-white rounded text-[10px] font-semibold flex items-center gap-1 shadow-2xs transition-colors"
                title="Add sound effect / audio stem"
              >
                <Plus className="w-3 h-3" />
                <span>+ SFX</span>
              </button>
            )}
          </div>

          {/* Track routing indicators */}
          <div className="hidden 2xl:flex items-center gap-2 text-[10px] font-mono text-[#52706E]">
            <span className="flex items-center gap-1">
              <Film className="w-3 h-3 text-[#0D9488]" /> V1 Video
            </span>
            <span className="flex items-center gap-1">
              <Music className="w-3 h-3 text-emerald-600" /> A1 SFX ({totalSfxCount})
            </span>
          </div>
        </div>
      </div>

      {/* 2. MASTER TIMELINE PRECISION SCRUBBER RULER */}
      <div
        ref={rulerRef}
        onMouseDown={handleRulerMouseDown}
        onMouseMove={handleRulerMouseMove}
        onMouseLeave={handleRulerMouseLeave}
        className={`h-7 bg-[#EBF2F1] border-b border-[#D2E2E0] relative cursor-pointer select-none overflow-hidden ${
          isScrubbing ? 'cursor-grabbing' : 'cursor-pointer'
        }`}
        title="Click or drag to scrub across the entire timeline cut (Snaps to shot cuts)"
      >
        {/* Proportional Shot Blocks Background */}
        <div className="absolute inset-0 flex">
          {shotsWithTimes.map((item, idx) => {
            const widthPct = totalDuration > 0 ? (item.duration / totalDuration) * 100 : 0;
            const isShotUnderPlayhead =
              currentTimeSec >= item.startTime && currentTimeSec < item.endTime;

            return (
              <div
                key={item.shotId}
                style={{ width: `${widthPct}%` }}
                className={`h-full border-r border-[#CBDCDA] relative flex items-center px-1.5 transition-colors overflow-hidden ${
                  isShotUnderPlayhead
                    ? 'bg-[#E1F3F1]'
                    : idx % 2 === 0
                    ? 'bg-[#F2F7F6]'
                    : 'bg-[#EAF1F0]'
                }`}
              >
                {/* Shot Cut Label */}
                <span className="text-[9px] font-mono font-bold text-[#5A7E7C] truncate pointer-events-none">
                  {item.sceneNumber}.{item.shotNumber}
                </span>

                {/* Sub-second tick marks */}
                <div className="absolute top-0 right-0 h-2 w-px bg-[#A9C7C4]" />
              </div>
            );
          })}
        </div>

        {/* Major Time Ruler Ticks & Second Labels */}
        <div className="absolute inset-0 pointer-events-none flex justify-between items-end pb-0.5 px-1 font-mono text-[8px] text-[#7A9A98]">
          {Array.from({ length: Math.min(16, Math.ceil(totalDuration / 2) + 1) }).map((_, i) => {
            const stepSec = totalDuration > 60 ? 10 : totalDuration > 30 ? 5 : 2;
            const t = i * stepSec;
            if (t > totalDuration) return null;
            const leftPct = (t / totalDuration) * 100;
            return (
              <div
                key={i}
                style={{ left: `${leftPct}%` }}
                className="absolute bottom-0 flex flex-col items-center -translate-x-1/2"
              >
                <span className="leading-none mb-0.5">{formatShortTime(t)}</span>
                <div className="h-2 w-px bg-[#8BAAA7]" />
              </div>
            );
          })}
        </div>

        {/* Shaded In-to-Out Playback Range Region */}
        {inPointPct !== null && outPointPct !== null && outPointPct > inPointPct && (
          <div
            style={{
              left: `${inPointPct}%`,
              width: `${outPointPct - inPointPct}%`,
            }}
            className="absolute inset-y-0 bg-[#0D9488]/20 border-x-2 border-[#0D9488] pointer-events-none z-10"
          >
            {/* In Bracket Flag */}
            <div className="absolute top-0 left-0 -translate-x-1/2 bg-[#0D9488] text-white px-0.5 text-[7px] font-mono font-bold rounded-b-xs">
              IN
            </div>
            {/* Out Bracket Flag */}
            <div className="absolute top-0 right-0 translate-x-1/2 bg-[#0D9488] text-white px-0.5 text-[7px] font-mono font-bold rounded-b-xs">
              OUT
            </div>
          </div>
        )}

        {/* Hover Scrub Preview Tooltip */}
        {hoverPosition && !isScrubbing && (
          <div
            style={{ left: `${hoverPosition.xPct}%` }}
            className="absolute top-0 -translate-x-1/2 -translate-y-full -mt-1 pointer-events-none z-30 bg-[#0F2322] text-white px-2 py-0.5 rounded shadow-lg text-[10px] font-mono flex items-center gap-1.5 whitespace-nowrap"
          >
            <span className="text-emerald-400 font-bold">{formatTimecode(hoverPosition.timeSec)}</span>
            {hoverPosition.shot && (
              <span className="text-zinc-300">
                · Shot {hoverPosition.shot.sceneNumber}.{hoverPosition.shot.shotNumber} ({hoverPosition.shot.shotType})
              </span>
            )}
          </div>
        )}

        {/* Active Playhead Needle Flag & Scrub Line */}
        <div
          style={{ left: `${playheadPct}%` }}
          className="absolute inset-y-0 -translate-x-1/2 pointer-events-none z-20 flex flex-col items-center"
        >
          {/* Top Inverted Red/Teal Flag */}
          <div className="w-0 h-0 border-x-4 border-x-transparent border-t-5 border-t-[#0D9488] drop-shadow-xs" />
          {/* Vertical Needle Line */}
          <div className="w-0.5 flex-1 bg-[#0D9488] shadow-xs" />
        </div>
      </div>
    </div>
  );
};
