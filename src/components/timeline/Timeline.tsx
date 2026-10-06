import React, { useState, useRef, useEffect } from 'react';
import {
  FilmProject,
  Shot,
  Take,
  Transition,
  TransitionType,
  ShotType,
  SfxClip,
  getEffectiveShotDuration,
  getEffectiveShotInPoint,
  getEffectiveShotOutPoint,
} from '../../types/film';
import {
  Scissors,
  Sun,
  Blend,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Layers,
  Sparkles,
  Upload,
  Film,
  Video,
  Play,
  Pause,
  Music,
  Volume2,
  VolumeX,
  Trash2,
  Sliders,
  FileAudio,
  Radio,
  SlidersHorizontal,
} from 'lucide-react';
import {
  playSfxAudio,
  stopAllSfx,
  createSfxClipFromFile,
} from '../../services/audio/sfxService';
import { SfxManagerModal } from '../audio/SfxManagerModal';
import { TimelineTransport, ShotTimeInfo } from './TimelineTransport';
import { AudioWaveformTrack } from './AudioWaveformTrack';
import { TransitionHandle } from './TransitionHandle';

interface TimelineProps {
  project: FilmProject;
  selectedShotId?: string;
  onSelectShot: (shotId: string) => void;
  onUpdateProject: (project: FilmProject) => void;
  onOpenTakeManager: (shotId: string) => void;
  onUploadTakeMedia?: (shotId: string, file: File) => void;
  onDropVideoToNewShot?: (sceneId: string, file: File, cameraAngle?: ShotType) => void;
  // Playback coordination
  isPlayingCut?: boolean;
  currentTimeSec?: number;
  onTogglePlayCut?: () => void;
  onSeekCutTime?: (timeSec: number) => void;
  onPlayShot?: (shotId: string) => void;
  // Transport enhancements
  isLoopingCut?: boolean;
  onToggleLoopCut?: () => void;
  playbackRate?: number;
  onChangePlaybackRate?: (rate: number) => void;
  timelineInPoint?: number | null;
  timelineOutPoint?: number | null;
  onSetTimelineInOut?: (inPoint: number | null, outPoint: number | null) => void;
  onStepFrame?: (deltaSec: number) => void;
  onJumpCut?: (direction: 'prev' | 'next' | 'start' | 'end') => void;
  // Dedicated SFX Track actions
  onAddSfxToShot?: (shotId: string, clip: SfxClip) => void;
  onRemoveSfxFromShot?: (shotId: string, clipId: string) => void;
  onUpdateSfxClip?: (shotId: string, clipId: string, updates: Partial<SfxClip>) => void;
  onAddSfxToScene?: (sceneId: string, clip: SfxClip) => void;
  onRemoveSfxFromScene?: (sceneId: string, clipId: string) => void;
}

export const Timeline: React.FC<TimelineProps> = ({
  project,
  selectedShotId,
  onSelectShot,
  onUpdateProject,
  onOpenTakeManager,
  onUploadTakeMedia,
  onDropVideoToNewShot,
  isPlayingCut = false,
  currentTimeSec = 0,
  onTogglePlayCut,
  onSeekCutTime,
  onPlayShot,
  isLoopingCut = false,
  onToggleLoopCut,
  playbackRate = 1.0,
  onChangePlaybackRate,
  timelineInPoint = null,
  timelineOutPoint = null,
  onSetTimelineInOut,
  onStepFrame,
  onJumpCut,
  onAddSfxToShot,
  onRemoveSfxFromShot,
  onUpdateSfxClip,
  onAddSfxToScene,
  onRemoveSfxFromScene,
}) => {
  const [editingTransitionKey, setEditingTransitionKey] = useState<string | null>(null);
  const [draggingOverShotId, setDraggingOverShotId] = useState<string | null>(null);
  const [draggingOverSfxShotId, setDraggingOverSfxShotId] = useState<string | null>(null);
  const [isDraggingOverAppend, setIsDraggingOverAppend] = useState(false);
  const [isSnapping, setIsSnapping] = useState(true);
  const appendFileInputRef = useRef<HTMLInputElement>(null);

  // SFX Track state
  const [isMasterSfxMuted, setIsMasterSfxMuted] = useState(false);
  const [masterSfxVolume, setMasterSfxVolume] = useState(1.0);
  const [auditioningClipId, setAuditioningClipId] = useState<string | null>(null);
  const [isSfxModalOpen, setIsSfxModalOpen] = useState(false);
  const [sfxModalTargetShot, setSfxModalTargetShot] = useState<Shot | null>(null);
  const [sfxModalTargetScene, setSfxModalTargetScene] = useState<any | null>(null);
  const [activeVolumePopoverClipId, setActiveVolumePopoverClipId] = useState<string | null>(null);

  // Flatten all shots across all scenes in sequential order using trimmed durations
  const allShots: {
    shot: Shot;
    sceneNumber: number;
    sceneId: string;
    duration: number;
    startTime: number;
    endTime: number;
  }[] = [];

  let accumulatedTime = 0;
  project.scenes.forEach((scene) => {
    scene.shots.forEach((shot) => {
      const duration = getEffectiveShotDuration(shot);
      allShots.push({
        shot,
        sceneNumber: scene.sceneNumber,
        sceneId: scene.id,
        duration,
        startTime: accumulatedTime,
        endTime: accumulatedTime + duration,
      });
      accumulatedTime += duration;
    });
  });

  const totalDuration = allShots.reduce((acc, item) => acc + item.duration, 0);

  // Count total SFX clips in project
  const totalSfxCount = allShots.reduce(
    (acc, item) => acc + (item.shot.sfxClips?.length || 0),
    0
  ) + project.scenes.reduce((acc, sc) => acc + (sc.sfxClips?.length || 0), 0);

  // Format timecode (00:00:00:00)
  const formatTimecode = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const frames = Math.floor((seconds % 1) * 24);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}:${String(frames).padStart(2, '0')}`;
  };

  // --- Real-time SFX Audio Trigger Synchronization During Timeline Playback ---
  const triggeredSfxRef = useRef<Set<string>>(new Set());
  const activeStopFnsRef = useRef<Map<string, () => void>>(new Map());

  // Stop active sounds when playback pauses or seeks
  useEffect(() => {
    if (!isPlayingCut) {
      stopAllSfx();
      triggeredSfxRef.current.clear();
      activeStopFnsRef.current.clear();
    }
  }, [isPlayingCut]);

  // Trigger SFX on cue as playhead moves
  useEffect(() => {
    if (!isPlayingCut) return;

    // Reset triggered set when looped back to start
    if (currentTimeSec < 0.12) {
      triggeredSfxRef.current.clear();
    }

    if (isMasterSfxMuted) return;

    allShots.forEach((item) => {
      const shotSfxClips = item.shot.sfxClips || [];
      shotSfxClips.forEach((clip) => {
        if (clip.isMuted) return;
        const triggerTime = item.startTime + (clip.offsetSec || 0);

        // Within 140ms trigger window
        if (currentTimeSec >= triggerTime && currentTimeSec < triggerTime + 0.14) {
          if (!triggeredSfxRef.current.has(clip.id)) {
            triggeredSfxRef.current.add(clip.id);
            const effectiveVol = (clip.volume ?? 1.0) * masterSfxVolume;
            playSfxAudio(clip.audioUrl, effectiveVol).then((stopFn) => {
              activeStopFnsRef.current.set(clip.id, stopFn);
              setTimeout(() => {
                activeStopFnsRef.current.delete(clip.id);
              }, (clip.duration || 2.0) * 1000);
            });
          }
        }
      });
    });
  }, [isPlayingCut, currentTimeSec, allShots, isMasterSfxMuted, masterSfxVolume]);

  // Audition individual SFX clip directly in track
  const handleToggleAuditionClip = async (e: React.MouseEvent, clip: SfxClip) => {
    e.stopPropagation();
    if (auditioningClipId === clip.id) {
      stopAllSfx();
      setAuditioningClipId(null);
      return;
    }

    stopAllSfx();
    setAuditioningClipId(clip.id);

    try {
      const stopFn = await playSfxAudio(clip.audioUrl, (clip.volume ?? 1.0) * masterSfxVolume);
      setTimeout(() => {
        setAuditioningClipId((curr) => (curr === clip.id ? null : curr));
      }, (clip.duration || 2.0) * 1000);
    } catch {
      setAuditioningClipId(null);
    }
  };

  // Drag & drop audio file onto a shot's SFX drop zone
  const handleDropAudioFileToShot = async (shotId: string, file: File) => {
    const isAudio = file.type.startsWith('audio') || /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(file.name);
    if (!isAudio) return;

    const clip = await createSfxClipFromFile(file, shotId, undefined, 0);
    if (onAddSfxToShot) {
      onAddSfxToShot(shotId, clip);
    } else {
      const newScenes = project.scenes.map((sc) => ({
        ...sc,
        shots: sc.shots.map((sh) =>
          sh.id === shotId ? { ...sh, sfxClips: [...(sh.sfxClips || []), clip] } : sh
        ),
      }));
      onUpdateProject({ ...project, scenes: newScenes });
    }
  };

  // Remove SFX clip from shot
  const handleRemoveSfxFromShotAction = (e: React.MouseEvent, shotId: string, clipId: string) => {
    e.stopPropagation();
    stopAllSfx();
    if (onRemoveSfxFromShot) {
      onRemoveSfxFromShot(shotId, clipId);
    } else {
      const newScenes = project.scenes.map((sc) => ({
        ...sc,
        shots: sc.shots.map((sh) =>
          sh.id === shotId ? { ...sh, sfxClips: (sh.sfxClips || []).filter((c) => c.id !== clipId) } : sh
        ),
      }));
      onUpdateProject({ ...project, scenes: newScenes });
    }
  };

  // Update SFX clip (volume, mute, offset)
  const handleUpdateSfxClipAction = (shotId: string, clipId: string, updates: Partial<SfxClip>) => {
    if (onUpdateSfxClip) {
      onUpdateSfxClip(shotId, clipId, updates);
    } else {
      const newScenes = project.scenes.map((sc) => ({
        ...sc,
        shots: sc.shots.map((sh) =>
          sh.id === shotId
            ? { ...sh, sfxClips: (sh.sfxClips || []).map((c) => (c.id === clipId ? { ...c, ...updates } : c)) }
            : sh
        ),
      }));
      onUpdateProject({ ...project, scenes: newScenes });
    }
  };

  // Add SFX from modal callback
  const handleAddSfxFromModal = (clip: SfxClip, targetType: 'shot' | 'scene', targetId: string) => {
    if (targetType === 'shot') {
      if (onAddSfxToShot) {
        onAddSfxToShot(targetId, clip);
      } else {
        const newScenes = project.scenes.map((sc) => ({
          ...sc,
          shots: sc.shots.map((sh) =>
            sh.id === targetId ? { ...sh, sfxClips: [...(sh.sfxClips || []), clip] } : sh
          ),
        }));
        onUpdateProject({ ...project, scenes: newScenes });
      }
    } else {
      if (onAddSfxToScene) {
        onAddSfxToScene(targetId, clip);
      } else {
        const newScenes = project.scenes.map((sc) =>
          sc.id === targetId ? { ...sc, sfxClips: [...(sc.sfxClips || []), clip] } : sc
        );
        onUpdateProject({ ...project, scenes: newScenes });
      }
    }
  };

  // Move shot left or right
  const handleMoveShot = (index: number, direction: 'left' | 'right') => {
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= allShots.length) return;

    const currentItem = allShots[index];
    const targetItem = allShots[targetIndex];

    const newScenes = [...project.scenes];
    const srcScene = newScenes.find((s) => s.id === currentItem.sceneId);
    const destScene = newScenes.find((s) => s.id === targetItem.sceneId);

    if (!srcScene || !destScene) return;

    if (srcScene.id === destScene.id) {
      const shotIdx1 = srcScene.shots.findIndex((s) => s.id === currentItem.shot.id);
      const shotIdx2 = srcScene.shots.findIndex((s) => s.id === targetItem.shot.id);
      const temp = srcScene.shots[shotIdx1];
      srcScene.shots[shotIdx1] = srcScene.shots[shotIdx2];
      srcScene.shots[shotIdx2] = temp;
      srcScene.shots.forEach((s, idx) => (s.shotNumber = idx + 1));
    } else {
      srcScene.shots = srcScene.shots.filter((s) => s.id !== currentItem.shot.id);
      destScene.shots.push(currentItem.shot);
      currentItem.shot.sceneId = destScene.id;
      srcScene.shots.forEach((s, idx) => (s.shotNumber = idx + 1));
      destScene.shots.forEach((s, idx) => (s.shotNumber = idx + 1));
    }

    onUpdateProject({ ...project, scenes: newScenes });
  };

  // Adjust duration of a shot
  const handleDurationChange = (shotId: string, delta: number) => {
    const newScenes = project.scenes.map((scene) => ({
      ...scene,
      shots: scene.shots.map((shot) => {
        if (shot.id === shotId) {
          const newDur = Math.max(1.0, Math.min(60.0, +(shot.duration + delta).toFixed(1)));
          return { ...shot, duration: newDur };
        }
        return shot;
      }),
    }));
    onUpdateProject({ ...project, scenes: newScenes });
  };

  // Update or set a transition between two adjacent shots
  const handleSetTransition = (
    fromId: string,
    toId: string,
    type: TransitionType,
    duration: number,
    audioOffset: number = 0.8
  ) => {
    const key = `${fromId}->${toId}`;
    if (type === 'cut' || duration === 0) {
      const { [key]: _, ...rest } = project.transitions;
      onUpdateProject({ ...project, transitions: rest });
      return;
    }
    const newTransitions = {
      ...project.transitions,
      [key]: {
        id: `trans_${Date.now()}`,
        fromShotId: fromId,
        toShotId: toId,
        type,
        duration,
        audioOffset,
      },
    };
    onUpdateProject({ ...project, transitions: newTransitions });
  };

  // Formatted shot time information for the Precision Scrubber Ruler
  const shotsWithTimes: ShotTimeInfo[] = allShots.map((item) => ({
    shotId: item.shot.id,
    sceneNumber: item.sceneNumber,
    shotNumber: item.shot.shotNumber,
    shotType: item.shot.shotType,
    action: item.shot.action,
    startTime: item.startTime,
    endTime: item.endTime,
    duration: item.duration,
  }));

  const activeShotItem =
    allShots.find((s) => s.shot.id === selectedShotId) ||
    allShots.find((s) => currentTimeSec >= s.startTime && currentTimeSec < s.endTime) ||
    allShots[0];

  const handleInternalStepFrame = (deltaSec: number) => {
    if (onStepFrame) {
      onStepFrame(deltaSec);
    } else if (onSeekCutTime) {
      const nextTime = Math.max(0, Math.min(totalDuration, +(currentTimeSec + deltaSec).toFixed(3)));
      onSeekCutTime(nextTime);
      const targetShot = allShots.find((s) => nextTime >= s.startTime && nextTime < s.endTime);
      if (targetShot) onSelectShot(targetShot.shot.id);
    }
  };

  const handleInternalJumpCut = (direction: 'prev' | 'next' | 'start' | 'end') => {
    if (onJumpCut) {
      onJumpCut(direction);
    } else {
      if (direction === 'start') {
        onSeekCutTime?.(0);
        if (allShots[0]) onSelectShot(allShots[0].shot.id);
      } else if (direction === 'end') {
        onSeekCutTime?.(totalDuration);
        if (allShots.length > 0) onSelectShot(allShots[allShots.length - 1].shot.id);
      } else if (direction === 'prev') {
        const curIdx = allShots.findIndex(
          (s) => currentTimeSec >= s.startTime - 0.05 && currentTimeSec < s.endTime
        );
        if (curIdx > 0) {
          const currentShot = allShots[curIdx];
          if (currentTimeSec - currentShot.startTime > 0.4) {
            onSeekCutTime?.(currentShot.startTime);
            onSelectShot(currentShot.shot.id);
          } else {
            const prev = allShots[curIdx - 1];
            onSeekCutTime?.(prev.startTime);
            onSelectShot(prev.shot.id);
          }
        } else if (curIdx === 0) {
          onSeekCutTime?.(0);
        }
      } else if (direction === 'next') {
        const curIdx = allShots.findIndex(
          (s) => currentTimeSec >= s.startTime - 0.05 && currentTimeSec < s.endTime
        );
        if (curIdx >= 0 && curIdx < allShots.length - 1) {
          const next = allShots[curIdx + 1];
          onSeekCutTime?.(next.startTime);
          onSelectShot(next.shot.id);
        } else {
          onSeekCutTime?.(totalDuration);
        }
      }
    }
  };

  return (
    <div className="h-[295px] bg-white/95 backdrop-blur-md border-t border-[#D5DFDE] flex flex-col select-none text-[#112F2E] shadow-sm shrink-0">
      {/* Proper Timeline Transport Deck & Scrubber Bar */}
      <TimelineTransport
        totalDuration={totalDuration}
        currentTimeSec={currentTimeSec}
        isPlayingCut={isPlayingCut}
        onTogglePlayCut={onTogglePlayCut}
        onSeekCutTime={onSeekCutTime}
        onStepFrame={handleInternalStepFrame}
        onJumpCut={handleInternalJumpCut}
        isLoopingCut={isLoopingCut}
        onToggleLoopCut={onToggleLoopCut}
        playbackRate={playbackRate}
        onChangePlaybackRate={onChangePlaybackRate}
        timelineInPoint={timelineInPoint}
        timelineOutPoint={timelineOutPoint}
        onSetTimelineInOut={onSetTimelineInOut}
        onPlayInOutRange={() => {
          if (timelineInPoint !== null) {
            onSeekCutTime?.(timelineInPoint);
          }
          if (!isPlayingCut && onTogglePlayCut) {
            onTogglePlayCut();
          }
        }}
        isSnapping={isSnapping}
        onToggleSnapping={() => setIsSnapping((prev) => !prev)}
        currentShotNumber={activeShotItem ? `${activeShotItem.sceneNumber}.${activeShotItem.shot.shotNumber}` : undefined}
        currentShotType={activeShotItem?.shot.shotType}
        currentShotDuration={activeShotItem?.duration}
        totalShotsCount={allShots.length}
        masterSfxVolume={masterSfxVolume}
        onChangeMasterSfxVolume={setMasterSfxVolume}
        isMasterSfxMuted={isMasterSfxMuted}
        onToggleMasterSfxMute={() => setIsMasterSfxMuted((prev) => !prev)}
        totalSfxCount={totalSfxCount}
        onOpenSfxModal={() => {
          const targetS = allShots.find((s) => s.shot.id === selectedShotId)?.shot || allShots[0]?.shot;
          setSfxModalTargetShot(targetS || null);
          setIsSfxModalOpen(true);
        }}
        shotsWithTimes={shotsWithTimes}
      />

      {/* Main Multi-Track Scroll Area */}
      <div className="flex-1 overflow-x-auto p-2.5 flex items-stretch gap-2 bg-[#F8FAFA] relative">
        {/* Track Headers Rail (Left sticky column) */}
        <div className="sticky left-0 z-30 shrink-0 flex flex-col justify-between py-0.5 bg-[#F8FAFA]/95 backdrop-blur-xs pr-2 border-r border-[#D8E3E1]">
          {/* V1 Track Label */}
          <div className="h-28 w-16 bg-[#EEF5F4] border border-[#C5DCDA] rounded-lg p-1.5 flex flex-col justify-between text-center shadow-2xs">
            <span className="text-[10px] font-mono font-bold text-[#0D9488] uppercase tracking-wider">
              V1 Video
            </span>
            <div className="flex items-center justify-center text-[#0D9488]">
              <Film className="w-4 h-4 opacity-75" />
            </div>
            <span className="text-[8px] font-mono text-[#52706E]">
              {allShots.length} clips
            </span>
          </div>

          {/* A1 Track Label */}
          <div className="h-16 w-16 bg-[#F0FDF4] border border-emerald-300 rounded-lg p-1.5 flex flex-col justify-between text-center shadow-2xs mt-1">
            <span className="text-[10px] font-mono font-bold text-emerald-800 uppercase tracking-wider">
              A1 SFX
            </span>
            <div className="flex items-center justify-center text-emerald-600">
              <Music className="w-4 h-4 opacity-80" />
            </div>
            <span className="text-[8px] font-mono text-emerald-700">
              {totalSfxCount} stems
            </span>
          </div>
        </div>

        {/* Shot & Audio Track Columns */}
        {allShots.map((item, index) => {
          const isSelected = selectedShotId === item.shot.id;
          const isDragOverThisShot = draggingOverShotId === item.shot.id;
          const isDragOverThisSfx = draggingOverSfxShotId === item.shot.id;
          const selectedTake =
            item.shot.takes.find((t) => t.id === item.shot.selectedTakeId) || item.shot.takes[0];

          const isVideoTake = selectedTake?.mediaType === 'video';

          // Check if this shot is currently active on the playhead
          const isCurrentlyPlayingThisShot =
            isPlayingCut &&
            currentTimeSec >= item.startTime &&
            currentTimeSec < item.endTime;

          const progressWithinShot = isCurrentlyPlayingThisShot
            ? Math.max(0, Math.min(1, (currentTimeSec - item.startTime) / item.duration))
            : 0;

          const nextItem = allShots[index + 1];
          const transKey = nextItem ? `${item.shot.id}->${nextItem.shot.id}` : '';
          const currentTransition = transKey ? project.transitions[transKey] : null;

          const shotSfxClips = item.shot.sfxClips || [];

          return (
            <React.Fragment key={item.shot.id}>
              {/* Vertical Multi-Track Column for this Shot */}
              <div className="flex flex-col justify-between min-w-[210px] max-w-[245px] shrink-0 gap-1">
                {/* 1. V1 Video Track Card */}
                <div
                  onClick={() => {
                    onSelectShot(item.shot.id);
                    if (onSeekCutTime) {
                      onSeekCutTime(item.startTime);
                    }
                  }}
                  onDoubleClick={() => {
                    onSelectShot(item.shot.id);
                    if (onPlayShot) {
                      onPlayShot(item.shot.id);
                    } else if (onTogglePlayCut && !isPlayingCut) {
                      onTogglePlayCut();
                    }
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDraggingOverShotId(item.shot.id);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    if (draggingOverShotId === item.shot.id) {
                      setDraggingOverShotId(null);
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDraggingOverShotId(null);
                    const file = e.dataTransfer.files?.[0];
                    if (file && onUploadTakeMedia) {
                      onUploadTakeMedia(item.shot.id, file);
                    }
                  }}
                  className={`group relative h-28 rounded-xl border p-2 flex flex-col justify-between cursor-pointer transition-all ${
                    isDragOverThisShot
                      ? 'bg-[#CCFBF1] border-[#0D9488] ring-4 ring-[#0D9488]/40 scale-[1.02] shadow-lg'
                      : isCurrentlyPlayingThisShot
                      ? 'bg-[#F0FDFA] border-emerald-500 ring-2 ring-emerald-500/50 shadow-md'
                      : isSelected
                      ? 'bg-[#F0FDFA] border-[#0D9488] ring-2 ring-[#0D9488]/30 shadow-md'
                      : 'bg-white border-[#D5DFDE] hover:border-[#0D9488]/40 hover:bg-[#F9FCFC] shadow-2xs'
                  }`}
                >
                  {/* Drag Over Active Overlay */}
                  {isDragOverThisShot && (
                    <div className="absolute inset-0 bg-[#0D9488]/90 text-white rounded-xl z-20 flex flex-col items-center justify-center p-2 text-center pointer-events-none backdrop-blur-2xs animate-pulse">
                      <Film className="w-6 h-6 mb-1 animate-bounce" />
                      <span className="font-bold text-[11px] leading-tight">Drop Video Clip</span>
                      <span className="text-[9px] opacity-90">
                        Shot {item.sceneNumber}.{item.shot.shotNumber} ({item.shot.shotType})
                      </span>
                    </div>
                  )}

                  {/* Top Row: Scene.Shot Number, Type, and Duration Controls */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-bold text-[#0D9488]">
                        {item.sceneNumber}.{item.shot.shotNumber}
                      </span>
                      <span className="px-1.5 py-0.2 text-[9px] font-bold uppercase bg-[#E6F4F2] text-[#0F766E] border border-[#C5E3DF] rounded">
                        {item.shot.shotType}
                      </span>
                      {isVideoTake && (
                        <span
                          className="px-1 py-0.2 text-[8px] font-mono font-bold bg-[#0D9488] text-white rounded flex items-center gap-0.5"
                          title={
                            typeof selectedTake.inPoint === 'number'
                              ? `Scene Trim: IN ${selectedTake.inPoint.toFixed(1)}s -> OUT ${(selectedTake.outPoint ?? item.duration).toFixed(1)}s`
                              : 'Video Clip'
                          }
                        >
                          <Video className="w-2.5 h-2.5" />
                          <span>VID</span>
                          {typeof selectedTake.inPoint === 'number' && typeof selectedTake.outPoint === 'number' && (
                            <span className="text-[#CCFBF1] font-normal ml-0.5">
                              [{selectedTake.inPoint.toFixed(1)}-{selectedTake.outPoint.toFixed(1)}s]
                            </span>
                          )}
                        </span>
                      )}
                    </div>

                    {/* Duration adjust controls */}
                    <div className="flex items-center gap-1 bg-[#EEF4F3] border border-[#D5DFDE] rounded px-1 text-[10px] font-mono text-[#112F2E]">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDurationChange(item.shot.id, -0.5);
                        }}
                        className="hover:text-[#0D9488] font-bold px-0.5"
                        title="Shorten shot (-0.5s)"
                      >
                        -
                      </button>
                      <span>{item.duration.toFixed(1)}s</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDurationChange(item.shot.id, +0.5);
                        }}
                        className="hover:text-[#0D9488] font-bold px-0.5"
                        title="Lengthen shot (+0.5s)"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Middle Row: Take Thumbnail Preview & Motion Info */}
                  <div className="flex items-center gap-2 my-1">
                    <div className="w-14 h-9 rounded bg-black overflow-hidden relative shrink-0 border border-black/20 group/thumb">
                      {selectedTake?.mediaUrl ? (
                        selectedTake.mediaType === 'video' ? (
                          <div className="relative w-full h-full">
                            <video
                              src={selectedTake.mediaUrl}
                              className="w-full h-full object-cover"
                              muted
                              playsInline
                              preload="metadata"
                              loop
                              onLoadedMetadata={(e) => {
                                e.currentTarget.currentTime = selectedTake.inPoint ?? 0;
                              }}
                              onMouseEnter={(e) => {
                                const v = e.currentTarget;
                                const inPt = selectedTake.inPoint ?? 0;
                                v.currentTime = inPt;
                                v.play().catch(() => {});
                              }}
                              onTimeUpdate={(e) => {
                                const v = e.currentTarget;
                                const inPt = selectedTake.inPoint ?? 0;
                                const outPt = selectedTake.outPoint;
                                if (typeof outPt === 'number' && outPt > inPt) {
                                  if (v.currentTime >= outPt - 0.05) {
                                    v.currentTime = inPt;
                                  }
                                }
                              }}
                              onMouseLeave={(e) => {
                                const v = e.currentTarget;
                                v.pause();
                                v.currentTime = selectedTake.inPoint ?? 0;
                              }}
                            />
                            {/* Play indicator badge */}
                            <div className="absolute top-1 left-1 bg-black/60 backdrop-blur-2xs text-[#2DD4BF] p-0.5 rounded pointer-events-none">
                              <Play className="w-2.5 h-2.5 fill-current" />
                            </div>
                          </div>
                        ) : (
                          <img
                            src={selectedTake.mediaUrl}
                            alt="Take thumbnail"
                            className="w-full h-full object-cover"
                          />
                        )
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-[8px] text-zinc-400 font-mono">
                          <Video className="w-3 h-3 text-zinc-500 mb-0.5" />
                          <span>Drop Vid</span>
                        </div>
                      )}

                      {/* Quick video upload icon on thumbnail hover */}
                      <label
                        onClick={(e) => e.stopPropagation()}
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center cursor-pointer transition-opacity text-white"
                        title="Click to browse and upload video for this shot"
                      >
                        <Upload className="w-3.5 h-3.5 text-[#2DD4BF]" />
                        <input
                          type="file"
                          accept="video/*,video/mp4,video/webm,video/quicktime"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file && onUploadTakeMedia) {
                              onUploadTakeMedia(item.shot.id, file);
                            }
                          }}
                        />
                      </label>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-[#112F2E] truncate font-medium">
                        {item.shot.action}
                      </p>
                      <p className="text-[10px] text-[#52706E] font-mono truncate">
                        {item.shot.cameraMovement} · {item.shot.lighting}
                      </p>
                    </div>
                  </div>

                  {/* Bottom Row: Take Selector & Reorder Handles */}
                  <div className="flex items-center justify-between pt-1 border-t border-[#E5EFEF]">
                    {/* Take Selector Button */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenTakeManager(item.shot.id);
                        }}
                        className="text-[10px] font-mono font-medium text-[#0F766E] hover:underline flex items-center gap-0.5"
                        title="Compare and manage camera angles & takes"
                      >
                        <Layers className="w-3 h-3 text-[#0D9488]" />
                        <span>
                          Take {selectedTake?.takeNumber || 1}/{item.shot.takes.length || 1}
                        </span>
                      </button>
                    </div>

                    {/* Reorder Arrows */}
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {index > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveShot(index, 'left');
                          }}
                          className="p-1 hover:bg-[#EAF2F0] rounded text-[#52706E] hover:text-[#112F2E]"
                          title="Move Shot Left (Earlier in cut)"
                        >
                          <ChevronLeft className="w-3 h-3" />
                        </button>
                      )}
                      {index < allShots.length - 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveShot(index, 'right');
                          }}
                          className="p-1 hover:bg-[#EAF2F0] rounded text-[#52706E] hover:text-[#112F2E]"
                          title="Move Shot Right (Later in cut)"
                        >
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Active Live Playhead Sweep Line on Card */}
                  {isCurrentlyPlayingThisShot && (
                    <div className="absolute bottom-0 inset-x-0 h-1 bg-[#CCFBF1] rounded-b-xl overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 transition-all duration-100 ease-linear"
                        style={{ width: `${progressWithinShot * 100}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* 2. Dedicated A1 Audio Track Lane with Frame-Accurate Waveform Visualization */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDraggingOverSfxShotId(item.shot.id);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    if (draggingOverSfxShotId === item.shot.id) {
                      setDraggingOverSfxShotId(null);
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDraggingOverSfxShotId(null);
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleDropAudioFileToShot(item.shot.id, file);
                  }}
                  className="relative"
                >
                  <AudioWaveformTrack
                    shot={item.shot}
                    shotStartTime={item.startTime}
                    shotDuration={item.duration}
                    currentTimeSec={currentTimeSec}
                    isPlaying={isPlayingCut || false}
                    sfxClips={shotSfxClips}
                    onAuditionClip={handleToggleAuditionClip}
                    auditioningClipId={auditioningClipId}
                    onDropAudioFile={(file) => handleDropAudioFileToShot(item.shot.id, file)}
                    dialogueSnippet={item.shot.dialogueSnippet}
                    isDragOver={isDragOverThisSfx}
                  />
                </div>
              </div>

              {/* Interstitial Transition Engine Between Shots */}
              {nextItem && (
                <TransitionHandle
                  transitionKey={transKey}
                  fromShotId={item.shot.id}
                  toShotId={nextItem.shot.id}
                  currentTransition={currentTransition}
                  onSetTransition={handleSetTransition}
                  isOpen={editingTransitionKey === transKey}
                  onToggleOpen={() =>
                    setEditingTransitionKey(editingTransitionKey === transKey ? null : transKey)
                  }
                  onClose={() => setEditingTransitionKey(null)}
                />
              )}
            </React.Fragment>
          );
        })}

        {/* Append Video Shot Drop Target at end of Timeline */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDraggingOverAppend(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setIsDraggingOverAppend(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDraggingOverAppend(false);
            const files = Array.from(e.dataTransfer.files);
            const targetSceneId =
              project.scenes[project.scenes.length - 1]?.id || project.scenes[0]?.id;
            if (targetSceneId && files.length > 0 && onDropVideoToNewShot) {
              files.forEach((f) => onDropVideoToNewShot(targetSceneId, f, 'wide'));
            }
          }}
          onClick={() => appendFileInputRef.current?.click()}
          className={`h-46 min-w-[170px] rounded-xl border-2 border-dashed flex flex-col items-center justify-center p-3 text-center cursor-pointer transition-all shrink-0 ${
            isDraggingOverAppend
              ? 'border-[#0D9488] bg-[#CCFBF1] text-[#0F766E] scale-105 shadow-md ring-2 ring-[#0D9488]/40'
              : 'border-[#D5DFDE] bg-white/70 hover:bg-white hover:border-[#0D9488]/50 text-[#52706E]'
          }`}
          title="Drag and drop video files here or click to browse and append new shot"
        >
          <input
            ref={appendFileInputRef}
            type="file"
            accept="video/*,video/mp4,video/webm,video/quicktime"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              const targetSceneId =
                project.scenes[project.scenes.length - 1]?.id || project.scenes[0]?.id;
              if (targetSceneId && files.length > 0 && onDropVideoToNewShot) {
                files.forEach((f) => onDropVideoToNewShot(targetSceneId, f, 'wide'));
              }
            }}
          />
          <div className="w-8 h-8 rounded-full bg-[#E6F4F2] text-[#0D9488] flex items-center justify-center mb-1.5 shadow-2xs">
            <Plus className="w-4 h-4" />
          </div>
          <span className="font-bold text-[11px] text-[#112F2E]">Append Video Shot</span>
          <span className="text-[9px] text-[#52706E] mt-0.5">MP4, WebM, MOV clips</span>
        </div>
      </div>

      {/* SfxManagerModal for selecting / uploading sound effects */}
      <SfxManagerModal
        isOpen={isSfxModalOpen}
        targetShot={sfxModalTargetShot}
        targetScene={sfxModalTargetScene}
        project={project}
        onClose={() => setIsSfxModalOpen(false)}
        onAddSfxClip={handleAddSfxFromModal}
      />
    </div>
  );
};
