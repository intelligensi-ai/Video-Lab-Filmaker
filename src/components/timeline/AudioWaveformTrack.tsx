/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { SfxClip, Shot } from '../../types/film';
import { getClipWaveform, WaveformData } from '../../services/audio/waveformService';
import { Play, Pause, Music, Volume2, Sparkles, Activity } from 'lucide-react';

interface AudioWaveformTrackProps {
  shot: Shot;
  shotStartTime: number;
  shotDuration: number;
  currentTimeSec: number;
  isPlaying: boolean;
  sfxClips: SfxClip[];
  onAuditionClip: (e: React.MouseEvent, clip: SfxClip) => void;
  auditioningClipId: string | null;
  onDropAudioFile?: (file: File) => void;
  dialogueSnippet?: string;
  isDragOver?: boolean;
}

export const AudioWaveformTrack: React.FC<AudioWaveformTrackProps> = ({
  shot,
  shotStartTime,
  shotDuration,
  currentTimeSec,
  isPlaying,
  sfxClips,
  onAuditionClip,
  auditioningClipId,
  onDropAudioFile,
  dialogueSnippet,
  isDragOver,
}) => {
  const [showBeatGrid, setShowBeatGrid] = useState(true);
  const primaryClip = sfxClips[0];

  // Calculate waveform data for this shot lane
  const waveform: WaveformData = useMemo(() => {
    const clipId = primaryClip ? primaryClip.id : `shot_audio_${shot.id}`;
    const category = primaryClip ? primaryClip.category : dialogueSnippet ? 'dialogue' : 'foley';
    return getClipWaveform(clipId, Math.max(1.0, shotDuration), category, {
      bpm: 112,
      pointsPerSec: 28,
    });
  }, [primaryClip, shot.id, shotDuration, dialogueSnippet]);

  // Current progress of playhead within this shot (0.0 to 1.0)
  const isPlayingThisShot =
    currentTimeSec >= shotStartTime && currentTimeSec <= shotStartTime + shotDuration;
  const playheadProgress = isPlayingThisShot
    ? Math.max(0, Math.min(1.0, (currentTimeSec - shotStartTime) / shotDuration))
    : currentTimeSec > shotStartTime + shotDuration
    ? 1.0
    : 0.0;

  const isAuditioning = primaryClip && auditioningClipId === primaryClip.id;

  return (
    <div
      className={`relative h-18 rounded-lg border p-1.5 flex flex-col justify-between transition-all overflow-hidden select-none group/waveform ${
        isDragOver
          ? 'bg-emerald-100 border-emerald-500 ring-2 ring-emerald-500/40'
          : isPlayingThisShot
          ? 'bg-[#F0FDF4] border-emerald-300 shadow-2xs'
          : 'bg-[#F2F6F5] border-[#DCE7E6] hover:border-[#0D9488]/40'
      }`}
    >
      {/* Top Header: Clip Badge, Dialogue Cue, and Audio Controls */}
      <div className="flex items-center justify-between z-10 text-[9px] font-mono leading-none">
        <div className="flex items-center gap-1.5 min-w-0">
          {primaryClip ? (
            <button
              onClick={(e) => onAuditionClip(e, primaryClip)}
              className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-transform ${
                isAuditioning || isPlayingThisShot
                  ? 'bg-emerald-600 text-white scale-105 shadow-xs'
                  : 'bg-white text-[#0D9488] hover:bg-[#0D9488] hover:text-white border border-[#C5DEDD]'
              }`}
              title={isAuditioning ? 'Stop Audition' : `Audition ${primaryClip.name}`}
            >
              {isAuditioning ? (
                <Pause className="w-2.5 h-2.5 fill-current" />
              ) : (
                <Play className="w-2.5 h-2.5 ml-0.2 fill-current" />
              )}
            </button>
          ) : (
            <div className="w-3.5 h-3.5 rounded bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Activity className="w-2.5 h-2.5" />
            </div>
          )}

          <span className="font-sans font-bold text-[#112F2E] truncate max-w-[130px]" title={primaryClip?.name || 'Live Track A1 Stems'}>
            {primaryClip ? primaryClip.name : dialogueSnippet ? 'Dialogue Sync Wave' : 'Track A1 Foley'}
          </span>

          {dialogueSnippet && (
            <span
              className="hidden sm:inline-flex px-1 py-0.2 bg-[#EDE9FE] text-[#5B4FB9] border border-[#DDD6FE] rounded text-[8px] font-sans truncate max-w-[110px]"
              title={`Dialogue: "${dialogueSnippet}"`}
            >
              "{dialogueSnippet}"
            </span>
          )}
        </div>

        {/* Right Info: Duration & Beat Toggle */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setShowBeatGrid(!showBeatGrid)}
            className={`px-1 py-0.2 rounded text-[8px] border transition-colors ${
              showBeatGrid
                ? 'bg-amber-100 text-amber-800 border-amber-300'
                : 'bg-white text-zinc-400 border-zinc-200'
            }`}
            title="Toggle Beat Markers (112 BPM Sync)"
          >
            BEATS
          </button>
          <span className="text-[#0D9488] font-bold bg-[#E6F4F2] px-1 py-0.2 rounded border border-[#CDEAE7]">
            {shotDuration.toFixed(1)}s
          </span>
        </div>
      </div>

      {/* Main Waveform Canvas / SVG Container */}
      <div className="relative flex-1 my-0.5 rounded overflow-hidden flex items-center justify-center bg-white/70 border border-[#E3EDEC]">
        {/* Subtle Horizontal Center Decibel Baseline */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-zinc-200/90 pointer-events-none" />

        {/* Beat Markers (Tempo Sync Grid at 112 BPM) */}
        {showBeatGrid &&
          waveform.beats.map((beatTime, idx) => {
            const beatLeftPct = (beatTime / shotDuration) * 100;
            const isDownbeat = idx % 4 === 0;
            return (
              <div
                key={idx}
                style={{ left: `${beatLeftPct}%` }}
                className={`absolute top-0 bottom-0 pointer-events-none z-0 ${
                  isDownbeat
                    ? 'w-px bg-amber-400/80 shadow-[0_0_2px_rgba(251,191,36,0.6)]'
                    : 'w-px bg-teal-400/40 border-r border-dotted border-teal-300/60'
                }`}
                title={`Beat ${idx + 1} (${beatTime}s)`}
              />
            );
          })}

        {/* Waveform Bars (Symmetrical Top & Bottom Mirrors) */}
        <div className="absolute inset-0 flex items-center justify-between px-1 gap-px z-1">
          {waveform.samples.map((sample, i) => {
            const sampleProgress = i / waveform.samples.length;
            const isPlayed = sampleProgress <= playheadProgress;
            const isPeakHot = sample.peak > 0.85;
            const isRmsMid = sample.peak > 0.55;

            // Height in percentage (0 to 92%)
            const barHeightPct = Math.max(8, sample.peak * 92);

            let barColor = isPlayed
              ? isPeakHot
                ? 'bg-amber-500'
                : 'bg-emerald-600'
              : isPeakHot
              ? 'bg-amber-400/80'
              : isRmsMid
              ? 'bg-[#0D9488]'
              : 'bg-[#5EEAD4]';

            if (isAuditioning) {
              barColor = isPeakHot ? 'bg-amber-300' : 'bg-teal-400';
            }

            return (
              <div
                key={i}
                className="flex-1 flex flex-col items-center justify-center h-full group/sample"
              >
                <div
                  style={{ height: `${barHeightPct}%` }}
                  className={`w-full max-w-[3px] rounded-full transition-all duration-75 ${barColor} ${
                    isPlayed && isPlaying ? 'scale-y-105' : ''
                  }`}
                  title={`${sample.db} dBFS ${sample.isBeat ? '· Beat' : ''}`}
                />
              </div>
            );
          })}
        </div>

        {/* Active Playhead Progress Needle in Waveform */}
        {playheadProgress > 0 && playheadProgress < 1 && (
          <div
            style={{ left: `${playheadProgress * 100}%` }}
            className="absolute top-0 bottom-0 w-0.5 bg-emerald-500 z-10 pointer-events-none shadow-[0_0_4px_rgba(16,185,129,0.8)]"
          >
            <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-emerald-600 rounded-full border border-white" />
          </div>
        )}
      </div>

      {/* Bottom Track Footer: Decibel scale (-24dB ... -6dB ... 0dB) & Volume */}
      <div className="flex items-center justify-between text-[8px] font-mono text-[#6A8B88] z-10">
        <div className="flex items-center gap-2">
          <span>-36dB</span>
          <span className="text-[#0D9488] font-bold">-12dB (Safe)</span>
          <span className="text-amber-600 font-bold">-3dB</span>
          <span className="text-rose-500 font-bold">0dB Peak</span>
        </div>

        <div className="flex items-center gap-1 text-[8px] text-[#0D9488]">
          <Volume2 className="w-2.5 h-2.5" />
          <span>{primaryClip ? `${Math.round((primaryClip.volume || 1.0) * 100)}%` : '100%'}</span>
        </div>
      </div>
    </div>
  );
};
