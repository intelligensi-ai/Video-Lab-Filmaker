/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { FilmProject } from '../../types/film';
import {
  X,
  Download,
  FileText,
  CheckCircle2,
  Film,
  Camera,
  Music,
  Volume2,
  VolumeX,
  Sliders,
  Settings,
  Grid,
  Monitor,
  Smartphone,
  Square,
  Sparkles,
  Play,
  RotateCcw,
  Check,
  Minus,
  Plus,
  Clock,
  Layers,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { VideoLabLogo } from '../common/VideoLabLogo';
import {
  EXPORT_PRESETS,
  ExportPreset,
  MovieExportOptions,
  RenderProgress,
  captureScreenshot,
  renderMovieCut,
  AspectRatioType,
} from '../../services/media/movieExportService';

interface ExportModalProps {
  isOpen: boolean;
  project: FilmProject;
  currentTimeSec?: number;
  timelineInPoint?: number | null;
  timelineOutPoint?: number | null;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  project,
  currentTimeSec = 0,
  timelineInPoint = null,
  timelineOutPoint = null,
  onClose,
}) => {
  // Preset Selection
  const [selectedPresetId, setSelectedPresetId] = useState<string>('youtube_1080p');
  const [isSettingsOpen, setIsSettingsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'presets' | 'audio' | 'pro_edl'>('presets');

  // Custom Resolution & Aspect Ratio
  const [customWidth, setCustomWidth] = useState(1920);
  const [customHeight, setCustomHeight] = useState(1080);
  const [customAspect, setCustomAspect] = useState<AspectRatioType>('16:9');
  const [cropMode, setCropMode] = useState<'cover' | 'contain' | 'letterbox'>('cover');

  // Audio Options
  const [audioOption, setAudioOption] = useState<'full_mix' | 'sfx_only' | 'video_only' | 'mute'>('full_mix');
  const [masterVolume, setMasterVolume] = useState(1.0);
  const [normalizeAudio, setNormalizeAudio] = useState(true);
  const [sampleRate, setSampleRate] = useState<number>(48000);

  // Range and Burn-in options
  const [exportRange, setExportRange] = useState<'all' | 'in_out'>('all');
  const [burnInDialogue, setBurnInDialogue] = useState(false);
  const [burnInTimecode, setBurnInTimecode] = useState(false);

  // Render & Screenshot Execution state
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState<RenderProgress | null>(null);
  const [renderResult, setRenderResult] = useState<{
    url: string;
    blob: Blob;
    sizeMb: number;
    durationSec: number;
  } | null>(null);

  const [screenshotPreview, setScreenshotPreview] = useState<{
    dataUrl: string;
    blob: Blob;
    width: number;
    height: number;
  } | null>(null);
  const [isCapturingScreenshot, setIsCapturingScreenshot] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  if (!isOpen) return null;

  const currentPreset = EXPORT_PRESETS.find((p) => p.id === selectedPresetId) || EXPORT_PRESETS[0];

  const handleSelectPreset = (preset: ExportPreset) => {
    setSelectedPresetId(preset.id);
    setCustomWidth(preset.width);
    setCustomHeight(preset.height);
    setCustomAspect(preset.aspectRatio);

    if (preset.category === 'still') {
      // Trigger screenshot preview
      handleCaptureScreenshotPreview(preset.width, preset.height);
    }
  };

  const handleCaptureScreenshotPreview = async (w = customWidth, h = customHeight) => {
    setIsCapturingScreenshot(true);
    try {
      const res = await captureScreenshot(project, currentTimeSec, {
        width: w,
        height: h,
        burnInDialogue,
        burnInTimecode,
      });
      setScreenshotPreview(res);
    } catch (err) {
      console.error('Screenshot capture failed:', err);
    } finally {
      setIsCapturingScreenshot(false);
    }
  };

  const handleDownloadScreenshot = () => {
    if (!screenshotPreview) return;
    const a = document.createElement('a');
    a.href = screenshotPreview.dataUrl;
    a.download = `${project.title.toLowerCase().replace(/\s+/g, '_')}_frame_${currentTimeSec.toFixed(1)}s.png`;
    a.click();
  };

  const handleStartMovieRender = async () => {
    setIsRendering(true);
    setRenderResult(null);
    abortControllerRef.current = new AbortController();

    const exportOptions: MovieExportOptions = {
      width: customWidth,
      height: customHeight,
      aspectRatio: customAspect,
      fps: currentPreset.fps || 24,
      audioOption,
      masterVolume,
      normalizeAudio,
      sampleRate,
      burnInDialogue,
      burnInTimecode,
      range: exportRange,
      inPointSec: timelineInPoint,
      outPointSec: timelineOutPoint,
      cropMode,
    };

    try {
      const result = await renderMovieCut(
        project,
        exportOptions,
        (progress) => setRenderProgress(progress),
        abortControllerRef.current.signal
      );
      setRenderResult(result);

      // Auto trigger download
      const a = document.createElement('a');
      a.href = result.url;
      a.download = `${project.title.toLowerCase().replace(/\s+/g, '_')}_${customAspect.replace(':', '_')}.webm`;
      a.click();
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('cancelled')) {
        setRenderProgress(null);
      } else {
        setRenderProgress({
          phase: 'error',
          progressPct: 0,
          currentShotIndex: 0,
          totalShots: 0,
          currentShotName: 'Error during movie render',
          elapsedSec: 0,
          estimatedRemainingSec: 0,
          errorMessage: err instanceof Error ? err.message : String(err),
        });
      }
    } finally {
      setIsRendering(false);
    }
  };

  const handleCancelRender = () => {
    abortControllerRef.current?.abort();
    setIsRendering(false);
    setRenderProgress(null);
  };

  // Generate real CMX 3600 EDL string
  const generateEDL = () => {
    let edl = `TITLE: ${project.title.toUpperCase()}\nFCM: NON-DROP FRAME\n\n`;
    let timeAcc = 0;
    let eventNumber = 1;

    project.scenes.forEach((scene) => {
      scene.shots.forEach((shot) => {
        const startSec = timeAcc;
        const endSec = timeAcc + (shot.duration || 3.5);
        timeAcc = endSec;

        const formatTC = (sec: number) => {
          const h = '00';
          const m = String(Math.floor(sec / 60)).padStart(2, '0');
          const s = String(Math.floor(sec % 60)).padStart(2, '0');
          const f = String(Math.floor((sec % 1) * 24)).padStart(2, '0');
          return `${h}:${m}:${s}:${f}`;
        };

        const activeTake =
          shot.takes.find((t) => t.id === shot.selectedTakeId) || shot.takes[0];

        edl += `${String(eventNumber).padStart(3, '0')}  AX       V     C        ${formatTC(
          0
        )} ${formatTC(shot.duration)} ${formatTC(startSec)} ${formatTC(endSec)}\n`;
        edl += `* FROM CLIP NAME: ${activeTake ? activeTake.label : `SHOT_${shot.shotNumber}`}\n`;
        edl += `* SCENE ${scene.sceneNumber} SHOT ${shot.shotNumber} - ${shot.shotType.toUpperCase()}\n`;
        if (shot.dialogueSnippet) {
          edl += `* DIALOGUE: "${shot.dialogueSnippet}"\n`;
        }
        edl += `\n`;
        eventNumber++;
      });
    });

    return edl;
  };

  const handleDownloadEDL = () => {
    const content = generateEDL();
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.title.toLowerCase().replace(/\s+/g, '_')}_cut.edl`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadJSON = () => {
    const json = JSON.stringify(project, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.title.toLowerCase().replace(/\s+/g, '_')}_project.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white border border-[#CBD5D1] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[94vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#D8E3E1] flex items-center justify-between bg-[#F4F8F7] shrink-0">
          <div className="flex items-center gap-3">
            <VideoLabLogo height={20} />
            <div className="h-4 w-px bg-[#D5DFDE]" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#112F2E]">Export Movie</h2>
                <span className="text-[10px] font-bold text-[#0F766E] uppercase px-1.5 py-0.2 bg-[#E6F4F2] border border-[#C5E3DF] rounded">
                  Director Master
                </span>
              </div>
              <p className="text-xs text-[#52706E]">
                Render, encode, and export your film cut with social presets & audio mastering
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-[#8A9E9C] hover:text-[#112F2E] hover:bg-[#EAF2F0] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 bg-[#F8FAFA] text-xs text-[#112F2E]">
          {/* 1. MINTY SETTINGS CARD (Exactly matching the screenshot!) */}
          <div className="bg-[#EDF8F6] border border-[#BCE4DE] rounded-2xl p-4 shadow-xs transition-all">
            {/* Header: SETTINGS with collapse icon */}
            <div className="flex items-center justify-between pb-3 border-b border-[#C8EAE4]">
              <div className="flex items-center gap-2 text-[#0D9488]">
                <Settings className="w-4 h-4 animate-spin-slow" />
                <span className="font-extrabold text-xs uppercase tracking-wider">Settings</span>
              </div>

              <button
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                className="p-1 text-[#0D9488] hover:bg-[#D9F3EF] rounded-md transition-colors"
                title={isSettingsOpen ? 'Collapse Settings' : 'Expand Settings'}
              >
                {isSettingsOpen ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              </button>
            </div>

            {/* Top configuration summary pills (matching screenshot) */}
            <div className="flex flex-wrap items-center gap-2.5 pt-3">
              {/* Resolution Pill */}
              <div className="flex-1 min-w-[140px] bg-white/90 border border-[#C2E4DE] px-3 py-2 rounded-xl flex items-center gap-2 shadow-2xs">
                <Grid className="w-3.5 h-3.5 text-[#0D9488]" />
                <span className="font-bold font-mono text-[11px] text-[#112F2E]">
                  {customWidth} x {customHeight}
                </span>
              </div>

              {/* Aspect Ratio Pill */}
              <div className="flex-1 min-w-[150px] bg-white/90 border border-[#C2E4DE] px-3 py-2 rounded-xl flex items-center gap-2 shadow-2xs">
                <Monitor className="w-3.5 h-3.5 text-[#0D9488]" />
                <span className="font-semibold text-[11px] text-[#112F2E] capitalize">
                  {customAspect === '16:9' ? 'Landscape · 16:9' : customAspect === '9:16' ? 'Portrait · 9:16' : customAspect === '1:1' ? 'Square · 1:1' : 'Cinema · 2.39:1'}
                </span>
              </div>

              {/* Audio Options Pill (User: "dont worry about director sound but do offer audio options") */}
              <div
                onClick={() => setActiveTab('audio')}
                className="flex-1 min-w-[160px] bg-white/90 border border-[#C2E4DE] hover:border-[#0D9488] px-3 py-2 rounded-xl flex items-center justify-between gap-2 shadow-2xs cursor-pointer group"
                title="Click to configure master audio mix options"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Music className="w-3.5 h-3.5 text-[#0D9488]" />
                  <span className="font-semibold text-[11px] text-[#112F2E] truncate">
                    {audioOption === 'full_mix'
                      ? 'Full SFX Mix'
                      : audioOption === 'sfx_only'
                      ? 'SFX Stems'
                      : audioOption === 'video_only'
                      ? 'Video Audio'
                      : 'Silent Video'}
                  </span>
                </div>
                <span className="text-[10px] text-[#0D9488] group-hover:underline font-bold">Edit</span>
              </div>
            </div>

            {/* Presets Cards Grid (matching screenshot) */}
            {isSettingsOpen && (
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5 pt-3.5">
                {EXPORT_PRESETS.map((preset) => {
                  const isSelected = selectedPresetId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      onClick={() => handleSelectPreset(preset)}
                      className={`relative flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all shadow-2xs ${
                        isSelected
                          ? 'bg-white border-[#0D9488] ring-2 ring-[#0D9488]/30 shadow-md scale-[1.02]'
                          : 'bg-white/80 border-[#CDEAE5] hover:bg-white hover:border-[#0D9488]/40'
                      }`}
                    >
                      {/* Preset Icon */}
                      <div className="mb-2">
                        {preset.iconType === 'youtube' && (
                          <div className="w-7 h-5 bg-[#FF0000] rounded-md flex items-center justify-center shadow-xs">
                            <div className="w-0 h-0 border-y-3 border-y-transparent border-l-6 border-l-white ml-0.5" />
                          </div>
                        )}
                        {preset.iconType === 'instagram' && (
                          <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center p-1 text-white shadow-xs">
                            <div className="w-3.5 h-3.5 border-2 border-white rounded-md flex items-center justify-center">
                              <div className="w-1.5 h-1.5 rounded-full border border-white" />
                            </div>
                          </div>
                        )}
                        {preset.iconType === 'tiktok' && (
                          <div className="w-6 h-6 rounded-lg bg-black flex items-center justify-center text-white shadow-xs font-bold text-[11px]">
                            <span className="text-[#25F4EE] drop-shadow-[1px_1px_0px_#FE2C55]">d</span>
                          </div>
                        )}
                        {preset.iconType === 'cinema' && (
                          <div className="w-6 h-6 rounded-lg bg-[#112F2E] flex items-center justify-center text-[#2DD4BF] shadow-xs">
                            <Film className="w-3.5 h-3.5" />
                          </div>
                        )}
                        {preset.iconType === 'screenshot' && (
                          <div className="w-6 h-6 rounded-lg bg-[#0D9488] flex items-center justify-center text-white shadow-xs">
                            <Camera className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>

                      <span className="font-bold text-[11px] text-[#112F2E] leading-tight">
                        {preset.name}
                      </span>
                      <span className="text-[9px] text-[#52706E] font-medium mt-0.5">
                        {preset.badge}
                      </span>

                      {isSelected && (
                        <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#0D9488]" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. TABBED CONTROLS BAR: Movie Options vs Audio Options vs Pro EDL */}
          <div className="flex items-center gap-1 border-b border-[#D8E3E1] pb-2 text-xs">
            <button
              onClick={() => setActiveTab('presets')}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'presets'
                  ? 'bg-[#166E67] text-white shadow-xs'
                  : 'text-[#52706E] hover:text-[#112F2E] hover:bg-[#EAEFF0]'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>Movie Render Config</span>
            </button>

            <button
              onClick={() => setActiveTab('audio')}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'audio'
                  ? 'bg-[#166E67] text-white shadow-xs'
                  : 'text-[#52706E] hover:text-[#112F2E] hover:bg-[#EAEFF0]'
              }`}
            >
              <Music className="w-3.5 h-3.5" />
              <span>Audio Options</span>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-emerald-100 text-emerald-800 font-bold">
                {audioOption === 'full_mix' ? 'Full Mix' : audioOption}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('pro_edl')}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'pro_edl'
                  ? 'bg-[#166E67] text-white shadow-xs'
                  : 'text-[#52706E] hover:text-[#112F2E] hover:bg-[#EAEFF0]'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>EDL & JSON Cutlists</span>
            </button>
          </div>

          {/* TAB 1: Movie Render Config */}
          {activeTab === 'presets' && (
            <div className="space-y-3.5">
              {/* Timeline Export Scope */}
              <div className="bg-white border border-[#D5DFDE] rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                <div>
                  <h4 className="font-bold text-xs text-[#112F2E]">Export Range</h4>
                  <p className="text-[11px] text-[#52706E]">
                    Choose whether to export the full cut or marked timeline In/Out range
                  </p>
                </div>

                <div className="flex items-center gap-1.5 bg-[#EEF4F3] p-0.5 rounded-lg font-mono text-[10px]">
                  <button
                    onClick={() => setExportRange('all')}
                    className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                      exportRange === 'all'
                        ? 'bg-white text-[#0D9488] shadow-2xs'
                        : 'text-[#52706E] hover:text-[#112F2E]'
                    }`}
                  >
                    Entire Cut
                  </button>
                  <button
                    onClick={() => setExportRange('in_out')}
                    className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                      exportRange === 'in_out'
                        ? 'bg-white text-[#0D9488] shadow-2xs'
                        : 'text-[#52706E] hover:text-[#112F2E]'
                    }`}
                    title={
                      timelineInPoint !== null && timelineOutPoint !== null
                        ? `Export [${timelineInPoint.toFixed(1)}s - ${timelineOutPoint.toFixed(1)}s]`
                        : 'No In/Out marks set on timeline (uses full cut)'
                    }
                  >
                    In/Out Marks
                    {timelineInPoint !== null && timelineOutPoint !== null && (
                      <span className="ml-1 text-[#0D9488]">
                        [{timelineInPoint.toFixed(1)}-{timelineOutPoint.toFixed(1)}s]
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Aspect Ratio Cropping Mode & Burn-In Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Fit Mode */}
                <div className="bg-white border border-[#D5DFDE] rounded-xl p-3 shadow-2xs">
                  <span className="font-bold text-xs text-[#112F2E] block mb-1">Cropping Mode</span>
                  <div className="flex items-center gap-1 text-[10px]">
                    {(['cover', 'contain', 'letterbox'] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setCropMode(mode)}
                        className={`flex-1 py-1 rounded-lg border font-medium capitalize transition-all ${
                          cropMode === mode
                            ? 'bg-[#E6F4F2] border-[#0D9488] text-[#0F766E] font-bold'
                            : 'bg-white border-[#D5DFDE] text-[#52706E] hover:bg-[#F8FAFA]'
                        }`}
                      >
                        {mode === 'cover' ? 'Fill (Crop)' : mode === 'contain' ? 'Fit (Center)' : 'Letterbox'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Visual Burn-ins */}
                <div className="bg-white border border-[#D5DFDE] rounded-xl p-3 shadow-2xs flex flex-col justify-between">
                  <span className="font-bold text-xs text-[#112F2E] block mb-1">Visual Overlays</span>
                  <div className="flex items-center gap-3 text-[11px]">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={burnInDialogue}
                        onChange={(e) => setBurnInDialogue(e.target.checked)}
                        className="rounded accent-[#0D9488]"
                      />
                      <span>Burn-In Subtitles</span>
                    </label>

                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={burnInTimecode}
                        onChange={(e) => setBurnInTimecode(e.target.checked)}
                        className="rounded accent-[#0D9488]"
                      />
                      <span>Burn-In Timecode</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Still Screenshot Preview if Screenshot Preset Selected */}
              {selectedPresetId === 'screenshot_still' && (
                <div className="bg-white border border-[#D5DFDE] rounded-xl p-4 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-xs text-[#112F2E]">Screenshot Frame Capture</h4>
                      <p className="text-[11px] text-[#52706E]">
                        Capturing current timeline playhead @ {currentTimeSec.toFixed(2)}s at {customWidth}x{customHeight}
                      </p>
                    </div>

                    <button
                      onClick={() => handleCaptureScreenshotPreview()}
                      disabled={isCapturingScreenshot}
                      className="px-3 py-1.5 bg-[#E6F4F2] hover:bg-[#D5EFEA] text-[#0F766E] rounded-lg font-bold flex items-center gap-1 text-[11px] transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Refresh Frame</span>
                    </button>
                  </div>

                  {screenshotPreview ? (
                    <div className="rounded-lg overflow-hidden border border-[#D5DFDE] relative aspect-video bg-black max-h-48 flex items-center justify-center">
                      <img
                        src={screenshotPreview.dataUrl}
                        alt="Screenshot preview"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="h-32 bg-[#F2F7F6] rounded-lg border border-dashed border-[#C5DCDA] flex flex-col items-center justify-center text-[#52706E]">
                      <Camera className="w-6 h-6 text-[#0D9488] mb-1 animate-pulse" />
                      <span>Click below to generate high-resolution still</span>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={handleDownloadScreenshot}
                      disabled={!screenshotPreview}
                      className="px-4 py-2 bg-[#0D9488] hover:bg-[#0F766E] disabled:opacity-50 text-white rounded-xl font-bold flex items-center gap-1.5 text-xs shadow-xs"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download Screenshot (PNG)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Audio Options (User emphasized: "dont worry about director sound but do offer audio options") */}
          {activeTab === 'audio' && (
            <div className="space-y-3.5">
              {/* Audio Track Mix Mode */}
              <div className="bg-white border border-[#D5DFDE] rounded-xl p-4 shadow-2xs space-y-2.5">
                <div>
                  <h4 className="font-bold text-xs text-[#112F2E]">Audio Track Mix Selection</h4>
                  <p className="text-[11px] text-[#52706E]">
                    Control how Foley sound effects and production audio are compiled into the exported movie
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {[
                    {
                      id: 'full_mix',
                      label: 'Full Foley & Audio Mix',
                      desc: 'Mixes all layered A1 SFX stems + video take sound',
                      icon: Music,
                    },
                    {
                      id: 'sfx_only',
                      label: 'SFX Stems Only (Cinematic)',
                      desc: 'Isolates atmospheric Foley, impact booms, drones & risers',
                      icon: Volume2,
                    },
                    {
                      id: 'video_only',
                      label: 'Video Audio Only',
                      desc: 'Production dialogue and camera sound with no Foley SFX',
                      icon: Film,
                    },
                    {
                      id: 'mute',
                      label: 'Mute / Silent Video',
                      desc: 'Clean silent movie cut without audio tracks',
                      icon: VolumeX,
                    },
                  ].map((item) => {
                    const isSelected = audioOption === item.id;
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.id}
                        onClick={() => setAudioOption(item.id as any)}
                        className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-[#F0FDFA] border-[#0D9488] ring-2 ring-[#0D9488]/30 shadow-xs'
                            : 'bg-white border-[#D5DFDE] hover:bg-[#F9FCFC]'
                        }`}
                      >
                        <div
                          className={`p-1.5 rounded-lg shrink-0 ${
                            isSelected ? 'bg-[#0D9488] text-white' : 'bg-[#EAF2F0] text-[#52706E]'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-xs text-[#112F2E] block">
                            {item.label}
                          </span>
                          <span className="text-[10px] text-[#52706E] leading-relaxed block">
                            {item.desc}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Master Volume & Normalization */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-white border border-[#D5DFDE] rounded-xl p-3.5 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-[#112F2E]">Master Audio Level</span>
                    <span className="font-mono text-xs font-bold text-[#0D9488]">
                      {Math.round(masterVolume * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1.5"
                    step="0.05"
                    value={masterVolume}
                    onChange={(e) => setMasterVolume(+e.target.value)}
                    className="w-full accent-[#0D9488] cursor-pointer"
                  />
                  <span className="text-[10px] text-[#52706E] block">
                    Adjusts overall export loudness gain
                  </span>
                </div>

                <div className="bg-white border border-[#D5DFDE] rounded-xl p-3.5 shadow-2xs space-y-2.5 flex flex-col justify-between">
                  <div>
                    <span className="font-bold text-xs text-[#112F2E] block">Loudness Normalization</span>
                    <span className="text-[10px] text-[#52706E] block">
                      Enforces -14 LUFS target streaming loudness standard
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#112F2E]">
                      <input
                        type="checkbox"
                        checked={normalizeAudio}
                        onChange={(e) => setNormalizeAudio(e.target.checked)}
                        className="rounded accent-[#0D9488]"
                      />
                      <span>Normalize for Streaming (-14 LUFS)</span>
                    </label>

                    <div className="flex items-center gap-1 font-mono text-[10px] bg-[#EEF4F3] px-2 py-0.5 rounded">
                      <span>48 kHz</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Pro EDL & JSON Cutlists */}
          {activeTab === 'pro_edl' && (
            <div className="space-y-3">
              {/* EDL Card */}
              <div className="p-4 bg-white border border-[#D5DFDE] rounded-xl flex items-center justify-between shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#E6F4F2] flex items-center justify-center text-[#0F766E]">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[#112F2E]">CMX 3600 Edit Decision List (.EDL)</h3>
                    <p className="text-[11px] text-[#52706E]">
                      Import into DaVinci Resolve, Adobe Premiere Pro, or Final Cut Pro with exact shot cuts.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleDownloadEDL}
                  className="px-3.5 py-2 bg-[#166E67] hover:bg-[#0F766E] text-white font-bold rounded-xl flex items-center gap-1.5 shrink-0 transition-colors shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .EDL</span>
                </button>
              </div>

              {/* Project JSON Manifest */}
              <div className="p-4 bg-white border border-[#D5DFDE] rounded-xl flex items-center justify-between shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#E6F4F2] flex items-center justify-center text-[#0D9488]">
                    <Film className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[#112F2E]">Complete Film Project Manifest (.JSON)</h3>
                    <p className="text-[11px] text-[#52706E]">
                      Full structured story brief, characters, locations, scenes, takes, and transition metadata.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleDownloadJSON}
                  className="px-3.5 py-2 bg-white hover:bg-[#EAF2F0] border border-[#D5DFDE] text-[#166E67] font-bold rounded-xl flex items-center gap-1.5 shrink-0 transition-colors shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export JSON</span>
                </button>
              </div>
            </div>
          )}

          {/* Active Render Progress Box */}
          {isRendering && renderProgress && (
            <div className="bg-[#0F2322] text-white rounded-xl p-4 shadow-lg space-y-3 animate-fade-in border border-emerald-500/30">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Film className="w-4 h-4 text-emerald-400 animate-spin-slow" />
                  <span className="font-bold text-emerald-300">
                    Rendering Movie: {renderProgress.currentShotName}
                  </span>
                </div>
                <span className="font-mono text-emerald-400 font-bold">
                  {renderProgress.progressPct}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-teal-400 to-emerald-400 transition-all duration-200"
                  style={{ width: `${renderProgress.progressPct}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono text-zinc-300">
                <span>
                  Shot {renderProgress.currentShotIndex} of {renderProgress.totalShots}
                </span>
                <span>
                  Elapsed: {renderProgress.elapsedSec}s · ETA: ~{renderProgress.estimatedRemainingSec}s
                </span>
                <button
                  onClick={handleCancelRender}
                  className="text-rose-400 hover:text-rose-300 font-bold transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Render Result Success Notice */}
          {renderResult && (
            <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-4 flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-emerald-950">Movie Export Succeeded!</h4>
                  <p className="text-[11px] text-emerald-800">
                    Rendered {renderResult.durationSec.toFixed(1)}s movie cut ({renderResult.sizeMb} MB) at {customWidth}x{customHeight}
                  </p>
                </div>
              </div>

              <a
                href={renderResult.url}
                download={`${project.title.toLowerCase().replace(/\s+/g, '_')}_cut.webm`}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl flex items-center gap-1.5 text-xs shadow-xs transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Download Again</span>
              </a>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-[#D8E3E1] bg-[#F4F8F7] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-[#52706E]">
            <span className="font-semibold text-[#112F2E]">Target:</span>
            <span>{currentPreset.name}</span>
            <span>·</span>
            <span className="font-mono">{customWidth}x{customHeight}</span>
            <span>·</span>
            <span>{currentPreset.fps || 24} FPS</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={isRendering}
              className="px-4 py-2 bg-white hover:bg-[#EAEFF0] border border-[#D5DFDE] text-[#4A6462] hover:text-[#112F2E] text-xs font-semibold rounded-xl transition-colors shadow-2xs"
            >
              Close
            </button>

            {selectedPresetId === 'screenshot_still' ? (
              <button
                onClick={handleDownloadScreenshot}
                disabled={!screenshotPreview}
                className="px-5 py-2 bg-[#0D9488] hover:bg-[#0F766E] disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5"
              >
                <Camera className="w-4 h-4" />
                <span>Capture Screenshot</span>
              </button>
            ) : (
              <button
                onClick={handleStartMovieRender}
                disabled={isRendering}
                className="px-5 py-2 bg-[#0D9488] hover:bg-[#0F766E] disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-2 hover:scale-[1.02] active:scale-95"
              >
                <Film className="w-4 h-4" />
                <span>{isRendering ? 'Rendering Movie...' : 'Export Movie'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
