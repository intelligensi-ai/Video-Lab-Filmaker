/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  Upload,
  Sparkles,
  Music,
  Trash2,
  Plus,
  Clock,
  Sliders,
  Check,
  X,
  Radio,
  FileAudio,
  Layers,
} from 'lucide-react';
import { FilmProject, Scene, Shot, SfxCategory, SfxClip } from '../../types/film';
import {
  CINEMATIC_SFX_PRESETS,
  SfxPresetDefinition,
  createSfxClipFromFile,
  createSfxClipFromPreset,
  playSfxAudio,
  stopAllSfx,
} from '../../services/audio/sfxService';

interface SfxManagerModalProps {
  isOpen: boolean;
  targetShot?: Shot | null;
  targetScene?: Scene | null;
  project: FilmProject;
  onClose: () => void;
  onAddSfxClip: (clip: SfxClip, targetType: 'shot' | 'scene', targetId: string) => void;
}

export const SfxManagerModal: React.FC<SfxManagerModalProps> = ({
  isOpen,
  targetShot,
  targetScene,
  project,
  onClose,
  onAddSfxClip,
}) => {
  const [activeTab, setActiveTab] = useState<'presets' | 'upload'>('presets');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [playingPresetId, setPlayingPresetId] = useState<string | null>(null);
  const [timingOffsetSec, setTimingOffsetSec] = useState<number>(0);
  const [volumeLevel, setVolumeLevel] = useState<number>(1.0);
  const [targetLevel, setTargetLevel] = useState<'shot' | 'scene'>(targetShot ? 'shot' : 'scene');
  const [selectedShotId, setSelectedShotId] = useState<string>(targetShot?.id || project.scenes[0]?.shots[0]?.id || '');

  // Upload file state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadDuration, setUploadDuration] = useState<number>(2.0);
  const [customClipName, setCustomClipName] = useState<string>('');
  const [customCategory, setCustomCategory] = useState<SfxCategory>('foley');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isAuditioningUpload, setIsAuditioningUpload] = useState<boolean>(false);
  const uploadAudioRef = useRef<HTMLAudioElement | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const stopAuditionRef = useRef<(() => void) | null>(null);

  if (!isOpen) return null;

  const allShots = project.scenes.flatMap((sc) => sc.shots);
  const currentTargetShot = allShots.find((s) => s.id === selectedShotId) || targetShot;
  const currentTargetScene = targetScene || project.scenes.find((sc) => sc.shots.some((s) => s.id === currentTargetShot?.id)) || project.scenes[0];

  const filteredPresets = selectedCategory === 'all'
    ? CINEMATIC_SFX_PRESETS
    : CINEMATIC_SFX_PRESETS.filter((p) => p.category === selectedCategory);

  const handleAuditionPreset = async (presetId: string) => {
    if (playingPresetId === presetId) {
      stopAllSfx();
      setPlayingPresetId(null);
      return;
    }

    stopAllSfx();
    setPlayingPresetId(presetId);

    try {
      const stop = await playSfxAudio(presetId, volumeLevel);
      stopAuditionRef.current = stop;
      const preset = CINEMATIC_SFX_PRESETS.find((p) => p.id === presetId);
      const dur = (preset?.duration || 2.0) * 1000;
      setTimeout(() => {
        setPlayingPresetId((cur) => (cur === presetId ? null : cur));
      }, dur);
    } catch {
      setPlayingPresetId(null);
    }
  };

  const handleApplyPreset = async (preset: SfxPresetDefinition) => {
    const targetId = targetLevel === 'shot' ? (currentTargetShot?.id || '') : (currentTargetScene?.id || '');
    if (!targetId) return;

    const clip = await createSfxClipFromPreset(
      preset,
      targetLevel === 'shot' ? targetId : undefined,
      targetLevel === 'scene' ? targetId : undefined,
      timingOffsetSec
    );
    clip.volume = volumeLevel;

    onAddSfxClip(clip, targetLevel, targetId);
    stopAllSfx();
    onClose();
  };

  const handleFileSelected = (file: File) => {
    setUploadedFile(file);
    const cleanName = file.name.replace(/\.[^/.]+$/, '');
    setCustomClipName(cleanName);

    const tempUrl = URL.createObjectURL(file);
    const aud = new Audio(tempUrl);
    aud.onloadedmetadata = () => {
      setUploadDuration(aud.duration ? +aud.duration.toFixed(2) : 2.0);
    };
  };

  const handleAuditionUpload = () => {
    if (!uploadedFile) return;
    if (isAuditioningUpload && uploadAudioRef.current) {
      uploadAudioRef.current.pause();
      setIsAuditioningUpload(false);
      return;
    }

    const tempUrl = URL.createObjectURL(uploadedFile);
    const aud = new Audio(tempUrl);
    aud.volume = volumeLevel;
    uploadAudioRef.current = aud;
    aud.onended = () => setIsAuditioningUpload(false);
    aud.play().catch(() => {});
    setIsAuditioningUpload(true);
  };

  const handleCommitUpload = async () => {
    if (!uploadedFile) return;
    setIsUploading(true);

    try {
      const targetId = targetLevel === 'shot' ? (currentTargetShot?.id || '') : (currentTargetScene?.id || '');
      const clip = await createSfxClipFromFile(
        uploadedFile,
        targetLevel === 'shot' ? targetId : undefined,
        targetLevel === 'scene' ? targetId : undefined,
        timingOffsetSec
      );

      clip.name = customClipName || clip.name;
      clip.category = customCategory;
      clip.volume = volumeLevel;

      onAddSfxClip(clip, targetLevel, targetId);
      stopAllSfx();
      onClose();
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 select-none animate-fade-in">
      <div className="bg-[#1C1C1E] border border-white/15 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[88vh] overflow-hidden text-white font-sans">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-[#242426]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0D9488]/20 border border-[#0D9488]/40 flex items-center justify-center text-[#2DD4BF]">
              <Music className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Sound Design & SFX Layering</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#0D9488]/30 text-[#2DD4BF] border border-[#0D9488]/40">
                  Audio Stem
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Layer sound effects and foley onto timeline scenes and individual shots
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              stopAllSfx();
              onClose();
            }}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Target Destination & Timing Config Bar */}
        <div className="px-6 py-3 bg-[#18181A] border-b border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Target Selector */}
          <div className="flex items-center gap-2">
            <span className="text-zinc-400 font-medium">Layer Target:</span>
            <div className="inline-flex rounded-lg bg-black/40 p-0.5 border border-white/10">
              <button
                onClick={() => setTargetLevel('shot')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  targetLevel === 'shot'
                    ? 'bg-[#0D9488] text-white shadow-xs'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Shot Level
              </button>
              <button
                onClick={() => setTargetLevel('scene')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  targetLevel === 'scene'
                    ? 'bg-[#0D9488] text-white shadow-xs'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Scene Ambience
              </button>
            </div>

            {targetLevel === 'shot' ? (
              <select
                value={selectedShotId}
                onChange={(e) => setSelectedShotId(e.target.value)}
                className="bg-[#2C2C2E] border border-white/15 rounded-md px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-[#0D9488]"
              >
                {project.scenes.flatMap((sc) =>
                  sc.shots.map((sh) => (
                    <option key={sh.id} value={sh.id}>
                      Shot {sc.sceneNumber}.{sh.shotNumber} ({sh.shotType.toUpperCase()}) - {sh.action.substring(0, 30)}...
                    </option>
                  ))
                )}
              </select>
            ) : (
              <span className="font-mono text-zinc-300 font-semibold px-2 py-1 bg-black/30 rounded border border-white/10">
                Scene {currentTargetScene?.sceneNumber}: {currentTargetScene?.slugline || 'Scene Master'}
              </span>
            )}
          </div>

          {/* Trigger Timing Offset */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#2DD4BF]" />
              <span className="text-zinc-400">Offset:</span>
              <input
                type="number"
                min="0"
                max="30"
                step="0.1"
                value={timingOffsetSec}
                onChange={(e) => setTimingOffsetSec(Math.max(0, +e.target.value))}
                className="w-14 bg-[#2C2C2E] border border-white/15 rounded px-1.5 py-0.5 text-center text-xs font-mono text-white focus:outline-none focus:border-[#0D9488]"
              />
              <span className="text-zinc-500 font-mono">s</span>
            </div>

            {/* Volume level */}
            <div className="flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-zinc-400" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volumeLevel}
                onChange={(e) => setVolumeLevel(+e.target.value)}
                className="w-16 accent-[#0D9488] cursor-pointer"
                title={`Volume: ${Math.round(volumeLevel * 100)}%`}
              />
              <span className="text-[11px] font-mono text-zinc-400 w-7">
                {Math.round(volumeLevel * 100)}%
              </span>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-white/10 bg-[#1F1F21] px-6">
          <button
            onClick={() => setActiveTab('presets')}
            className={`py-2.5 px-4 font-semibold text-xs border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'presets'
                ? 'border-[#2DD4BF] text-[#2DD4BF]'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Cinematic SFX Library ({CINEMATIC_SFX_PRESETS.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('upload')}
            className={`py-2.5 px-4 font-semibold text-xs border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'upload'
                ? 'border-[#2DD4BF] text-[#2DD4BF]'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Custom Audio File</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#161618]">
          {activeTab === 'presets' ? (
            <div className="space-y-4">
              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {['all', 'impact', 'foley', 'suspense', 'mechanical', 'electronic', 'ambience'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium uppercase tracking-wider transition-colors ${
                      selectedCategory === cat
                        ? 'bg-[#0D9488] text-white font-bold shadow-2xs'
                        : 'bg-[#262628] text-zinc-400 hover:text-zinc-200 hover:bg-[#303034]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Preset Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredPresets.map((preset) => {
                  const isPlaying = playingPresetId === preset.id;
                  return (
                    <div
                      key={preset.id}
                      className="p-3 bg-[#222226] hover:bg-[#27272B] border border-white/10 hover:border-[#0D9488]/50 rounded-xl transition-all flex flex-col justify-between group shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{preset.icon}</span>
                          <div>
                            <h4 className="text-xs font-bold text-white group-hover:text-[#2DD4BF] transition-colors">
                              {preset.name}
                            </h4>
                            <p className="text-[10px] text-zinc-400 font-mono mt-0.5">
                              {preset.category.toUpperCase()} · {preset.duration}s
                            </p>
                          </div>
                        </div>

                        {/* Audition Button */}
                        <button
                          onClick={() => handleAuditionPreset(preset.id)}
                          className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                            isPlaying
                              ? 'bg-rose-500 text-white animate-pulse shadow-md'
                              : 'bg-white/10 hover:bg-[#0D9488] text-zinc-300 hover:text-white'
                          }`}
                          title={isPlaying ? 'Stop' : 'Audition Preview'}
                        >
                          {isPlaying ? (
                            <Pause className="w-3.5 h-3.5 fill-current" />
                          ) : (
                            <Play className="w-3.5 h-3.5 ml-0.5 fill-current" />
                          )}
                        </button>
                      </div>

                      <p className="text-[11px] text-zinc-400 line-clamp-2 italic mb-3">
                        {preset.description}
                      </p>

                      <div className="flex items-center justify-between pt-2 border-t border-white/10 text-[11px]">
                        <span className="text-zinc-500 font-mono text-[10px]">
                          Offset: +{timingOffsetSec.toFixed(1)}s
                        </span>
                        <button
                          onClick={() => handleApplyPreset(preset)}
                          className="px-2.5 py-1 bg-[#0D9488] hover:bg-[#0F766E] text-white rounded-md text-xs font-semibold flex items-center gap-1 transition-colors shadow-2xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Layer into {targetLevel === 'shot' ? 'Shot' : 'Scene'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* File Drop Target */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleFileSelected(file);
                }}
                className="border-2 border-dashed border-white/20 hover:border-[#0D9488] bg-[#202024] hover:bg-[#232328] rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*,audio/mp3,audio/wav,audio/ogg,audio/m4a,audio/flac,audio/aac"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelected(file);
                  }}
                />

                <div className="w-12 h-12 rounded-full bg-[#0D9488]/20 text-[#2DD4BF] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <FileAudio className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-sm text-white mb-1">
                  {uploadedFile ? uploadedFile.name : 'Click to Browse or Drag Audio File Here'}
                </h3>
                <p className="text-xs text-zinc-400 max-w-sm">
                  Accepts MP3, WAV, OGG, M4A, FLAC audio stems up to 100MB
                </p>
                {uploadedFile && (
                  <div className="mt-3 px-3 py-1 bg-[#0D9488]/20 border border-[#0D9488]/40 rounded-full text-xs text-[#2DD4BF] font-mono">
                    Detected Duration: {uploadDuration}s · Size: {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                  </div>
                )}
              </div>

              {/* Uploaded File Config Form */}
              {uploadedFile && (
                <div className="p-4 bg-[#202024] border border-white/10 rounded-xl space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                        Clip Display Name
                      </label>
                      <input
                        type="text"
                        value={customClipName}
                        onChange={(e) => setCustomClipName(e.target.value)}
                        className="w-full bg-[#18181A] border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#0D9488]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                        Category
                      </label>
                      <select
                        value={customCategory}
                        onChange={(e) => setCustomCategory(e.target.value as SfxCategory)}
                        className="w-full bg-[#18181A] border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#0D9488]"
                      >
                        <option value="foley">Foley Sound</option>
                        <option value="impact">Impact & Hit</option>
                        <option value="ambience">Atmosphere & Ambience</option>
                        <option value="suspense">Suspense & Drone</option>
                        <option value="mechanical">Mechanical & Gear</option>
                        <option value="electronic">Electronic / Sci-Fi</option>
                        <option value="custom">Custom Audio</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/10">
                    <button
                      onClick={handleAuditionUpload}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                        isAuditioningUpload
                          ? 'bg-rose-600 text-white'
                          : 'bg-white/10 hover:bg-white/20 text-white'
                      }`}
                    >
                      {isAuditioningUpload ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                      <span>{isAuditioningUpload ? 'Stop Preview' : 'Audition Audio'}</span>
                    </button>

                    <button
                      disabled={isUploading}
                      onClick={handleCommitUpload}
                      className="px-4 py-1.5 bg-[#0D9488] hover:bg-[#0F766E] disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
                    >
                      <Check className="w-4 h-4" />
                      <span>{isUploading ? 'Uploading...' : `Layer onto ${targetLevel === 'shot' ? 'Shot' : 'Scene'}`}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
