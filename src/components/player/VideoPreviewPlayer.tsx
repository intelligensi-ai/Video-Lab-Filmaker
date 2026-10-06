import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FilmProject, Shot, Take, Transition, TransitionType } from '../../types/film';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronsLeft,
  ChevronsRight,
  Maximize2,
  Volume2,
  VolumeX,
  Layers,
  Upload,
  Sparkles,
  Repeat,
  Tv,
  Film,
  Video,
  Scissors,
  RotateCcw,
} from 'lucide-react';
import { TableReadItem } from '../../services/speech/tableReadService';
import { VideoLabLogo } from '../common/VideoLabLogo';

// Helpers to get trimmed In/Out/Duration for any shot based on selected take
export const getEffectiveShotDuration = (shot: Shot): number => {
  const selectedTake =
    shot.takes.find((t) => t.id === shot.selectedTakeId) || shot.takes[0];
  if (
    selectedTake &&
    typeof selectedTake.inPoint === 'number' &&
    typeof selectedTake.outPoint === 'number' &&
    selectedTake.outPoint > selectedTake.inPoint
  ) {
    return Math.max(0.2, +(selectedTake.outPoint - selectedTake.inPoint).toFixed(2));
  }
  return shot.duration || 3.5;
};

export const getEffectiveShotInPoint = (shot: Shot): number => {
  const selectedTake =
    shot.takes.find((t) => t.id === shot.selectedTakeId) || shot.takes[0];
  return selectedTake?.inPoint ?? 0;
};

export const getEffectiveShotOutPoint = (shot: Shot): number => {
  const selectedTake =
    shot.takes.find((t) => t.id === shot.selectedTakeId) || shot.takes[0];
  if (selectedTake && typeof selectedTake.outPoint === 'number' && selectedTake.outPoint > 0) {
    return selectedTake.outPoint;
  }
  return selectedTake?.duration || shot.duration || 3.5;
};

interface VideoPreviewPlayerProps {
  project: FilmProject;
  selectedShotId?: string;
  tableReadActive: boolean;
  activeTableReadItem?: TableReadItem | null;
  onSelectShot: (shotId: string) => void;
  onOpenTakeManager: (shotId: string) => void;
  onQuickGenerateTake: (shotId: string) => void;
  onUploadTakeMedia?: (shotId: string, file: File) => void;
  onUpdateTakeInOut?: (shotId: string, takeId: string, inPoint: number, outPoint: number) => void;
  // Controlled playback props (optional, fallback to internal state)
  isPlayingCut?: boolean;
  onTogglePlayCut?: () => void;
  currentTimeSec?: number;
  onSeekCutTime?: (timeSec: number) => void;
  onTimeUpdateCut?: (timeSec: number) => void;
  isLoopingCut?: boolean;
  onToggleLoopCut?: () => void;
  playbackRate?: number;
  timelineInPoint?: number | null;
  timelineOutPoint?: number | null;
}

export const VideoPreviewPlayer: React.FC<VideoPreviewPlayerProps> = ({
  project,
  selectedShotId,
  tableReadActive,
  activeTableReadItem,
  onSelectShot,
  onOpenTakeManager,
  onQuickGenerateTake,
  onUploadTakeMedia,
  onUpdateTakeInOut,
  isPlayingCut: propIsPlayingCut,
  onTogglePlayCut: propOnTogglePlayCut,
  currentTimeSec: propCurrentTimeSec,
  onSeekCutTime: propOnSeekCutTime,
  onTimeUpdateCut,
  isLoopingCut: propIsLoopingCut,
  onToggleLoopCut: propOnToggleLoopCut,
  playbackRate = 1.0,
  timelineInPoint = null,
  timelineOutPoint = null,
}) => {
  // Local state for uncontrolled usage or fallback
  const [localIsPlayingCut, setLocalIsPlayingCut] = useState(false);
  const [localCurrentTimeSec, setLocalCurrentTimeSec] = useState(0);

  // Playback mode: controlled vs local
  const isCutControlled = typeof propIsPlayingCut === 'boolean';
  const effectiveIsPlayingCut = isCutControlled ? propIsPlayingCut : localIsPlayingCut;
  const effectiveCurrentTimeSec =
    propCurrentTimeSec !== undefined ? propCurrentTimeSec : localCurrentTimeSec;

  // Single-shot preview mode (when user plays just the active video shot)
  const [isPlayingShot, setIsPlayingShot] = useState(false);
  const [isPlayingInOutRange, setIsPlayingInOutRange] = useState(false);

  // Audio & Display settings
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1.0);
  const [isLooping, setIsLooping] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTransition, setActiveTransition] = useState<{
    type: TransitionType;
    progress: number;
    incomingShot?: Shot;
  } | null>(null);
  const [isDragOverMonitor, setIsDragOverMonitor] = useState(false);

  // Video element tracking (for viewport HUD)
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [showViewportHud, setShowViewportHud] = useState(true);
  const hideHudTimeoutRef = useRef<number | null>(null);

  // Flatten all shots across all scenes in sequential order
  const allShotsInOrder: Shot[] = project.scenes.flatMap((sc) => sc.shots);

  // Calculate total duration of the cut based on trimmed In/Out ranges
  const totalCutDuration = allShotsInOrder.reduce(
    (acc, shot) => acc + getEffectiveShotDuration(shot),
    0
  );

  // Determine current active shot and take based on playback position or manual selection
  let currentShot: Shot | undefined;
  let currentShotStartTime = 0;
  let accumulated = 0;

  if (effectiveIsPlayingCut) {
    for (const shot of allShotsInOrder) {
      const shotDur = getEffectiveShotDuration(shot);
      if (effectiveCurrentTimeSec >= accumulated && effectiveCurrentTimeSec < accumulated + shotDur) {
        currentShot = shot;
        currentShotStartTime = accumulated;
        break;
      }
      accumulated += shotDur;
    }
    if (!currentShot && allShotsInOrder.length > 0) {
      currentShot = allShotsInOrder[allShotsInOrder.length - 1];
      currentShotStartTime = Math.max(0, accumulated - getEffectiveShotDuration(currentShot));
    }
  } else {
    currentShot = allShotsInOrder.find((s) => s.id === selectedShotId) || allShotsInOrder[0];
    for (const shot of allShotsInOrder) {
      if (shot.id === currentShot?.id) {
        currentShotStartTime = accumulated;
        break;
      }
      accumulated += getEffectiveShotDuration(shot);
    }
  }

  // Active selected take for current shot
  const activeTake: Take | undefined = currentShot
    ? currentShot.takes.find((t) => t.id === currentShot?.selectedTakeId) || currentShot.takes[0]
    : undefined;

  // Raw full media duration (source media file duration)
  const rawMediaDuration = Math.max(
    0.5,
    videoDuration || activeTake?.duration || currentShot?.duration || 3.5
  );

  // Active take In / Out points
  const activeInPoint = activeTake ? getEffectiveShotInPoint(currentShot!) : 0;
  const activeOutPoint = activeTake ? getEffectiveShotOutPoint(currentShot!) : rawMediaDuration;

  // Local state for interactive editing of In / Out points
  const [inPoint, setInPoint] = useState<number>(activeInPoint);
  const [outPoint, setOutPoint] = useState<number>(activeOutPoint);

  // Dragging state for In/Out handles on the scrubber
  const [draggingHandle, setDraggingHandle] = useState<'in' | 'out' | 'range' | null>(null);
  const scrubberTrackRef = useRef<HTMLDivElement>(null);
  const dragStartInfoRef = useRef<{
    startX: number;
    startIn: number;
    startOut: number;
    trackWidth: number;
  } | null>(null);

  // Sync local in/out state when active take changes
  useEffect(() => {
    if (currentShot) {
      const newIn = getEffectiveShotInPoint(currentShot);
      const newOut = getEffectiveShotOutPoint(currentShot);
      setInPoint(newIn);
      setOutPoint(newOut);
      inPointRef.current = newIn;
      outPointRef.current = newOut;
    }
  }, [currentShot?.id, activeTake?.id, activeTake?.inPoint, activeTake?.outPoint, rawMediaDuration]);

  // Keep stable refs to avoid recreating animation effects and causing frame drops
  const effectiveCurrentTimeSecRef = useRef(effectiveCurrentTimeSec);
  effectiveCurrentTimeSecRef.current = effectiveCurrentTimeSec;

  const effectiveIsPlayingCutRef = useRef(effectiveIsPlayingCut);
  effectiveIsPlayingCutRef.current = effectiveIsPlayingCut;

  const isPlayingShotRef = useRef(isPlayingShot);
  isPlayingShotRef.current = isPlayingShot;

  const isPlayingInOutRangeRef = useRef(isPlayingInOutRange);
  isPlayingInOutRangeRef.current = isPlayingInOutRange;

  const currentShotRef = useRef(currentShot);
  currentShotRef.current = currentShot;

  const activeTakeRef = useRef(activeTake);
  activeTakeRef.current = activeTake;

  const inPointRef = useRef(inPoint);
  inPointRef.current = inPoint;

  const outPointRef = useRef(outPoint);
  outPointRef.current = outPoint;

  const currentShotStartTimeRef = useRef(currentShotStartTime);
  currentShotStartTimeRef.current = currentShotStartTime;

  const allShotsInOrderRef = useRef(allShotsInOrder);
  allShotsInOrderRef.current = allShotsInOrder;

  const effectiveIsLooping = typeof propIsLoopingCut === 'boolean' ? propIsLoopingCut : isLooping;
  const isLoopingRef = useRef(effectiveIsLooping);
  isLoopingRef.current = effectiveIsLooping;

  const playbackRateRef = useRef(playbackRate);
  playbackRateRef.current = playbackRate;

  const timelineInPointRef = useRef(timelineInPoint);
  timelineInPointRef.current = timelineInPoint;

  const timelineOutPointRef = useRef(timelineOutPoint);
  timelineOutPointRef.current = timelineOutPoint;

  const totalCutDurationRef = useRef(totalCutDuration);
  totalCutDurationRef.current = totalCutDuration;

  const playerContainerRef = useRef<HTMLDivElement>(null);
  const videoElementRef = useRef<HTMLVideoElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastNotifyTimeRef = useRef<number>(0);

  // Format timecode (00:00:00:00)
  const formatTimecode = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const frames = Math.floor((seconds % 1) * 24);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}:${String(frames).padStart(2, '0')}`;
  };

  // Format short seconds (00:00.0)
  const formatShortTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const tenths = Math.floor((seconds % 1) * 10);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${tenths}`;
  };

  // Format frame-accurate seconds with 2 decimal places (00:00.00)
  const formatPrecisionTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const hundredths = Math.floor((seconds % 1) * 100);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(hundredths).padStart(2, '0')}`;
  };

  // Throttled notification to parent to keep UI thread silky smooth
  const notifyTimeUpdate = useCallback(
    (newTime: number, force = false) => {
      const now = performance.now();
      if (force || now - lastNotifyTimeRef.current >= 50) {
        lastNotifyTimeRef.current = now;
        onTimeUpdateCut?.(newTime);
      }
    },
    [onTimeUpdateCut]
  );

  // Seamless shot advancement in the cut (strictly using In/Out trimmed duration)
  const advanceToNextShot = useCallback(() => {
    const shots = allShotsInOrderRef.current;
    const curShot = currentShotRef.current;
    const currentIdx = shots.findIndex((s) => s.id === curShot?.id);

    if (currentIdx >= 0 && currentIdx < shots.length - 1) {
      const nextShot = shots[currentIdx + 1];
      let nextStart = 0;
      for (let i = 0; i <= currentIdx; i++) {
        nextStart += getEffectiveShotDuration(shots[i]);
      }
      onSelectShot(nextShot.id);
      setLocalCurrentTimeSec(nextStart);
      propOnSeekCutTime?.(nextStart);
      notifyTimeUpdate(nextStart, true);

      // Pre-seek next shot's video to its IN point immediately!
      const nextIn = getEffectiveShotInPoint(nextShot);
      if (videoElementRef.current) {
        videoElementRef.current.currentTime = nextIn;
      }
    } else {
      // End of program cut reached
      if (isLoopingRef.current) {
        const loopStart = timelineInPointRef.current !== null ? timelineInPointRef.current : 0;
        const firstShot = shots[0];
        if (firstShot) {
          onSelectShot(firstShot.id);
          setLocalCurrentTimeSec(loopStart);
          propOnSeekCutTime?.(loopStart);
          notifyTimeUpdate(loopStart, true);
          const firstIn = getEffectiveShotInPoint(firstShot);
          if (videoElementRef.current) {
            videoElementRef.current.currentTime = firstIn;
          }
        }
      } else {
        if (propOnTogglePlayCut) {
          propOnTogglePlayCut();
        } else {
          setLocalIsPlayingCut(false);
        }
        setIsPlayingShot(false);
        setIsPlayingInOutRange(false);
      }
    }
  }, [onSelectShot, propOnSeekCutTime, notifyTimeUpdate, propOnTogglePlayCut]);

  // Toggle cut play
  const handleToggleCutPlay = useCallback(() => {
    if (isPlayingShot) setIsPlayingShot(false);
    if (isPlayingInOutRange) setIsPlayingInOutRange(false);

    if (propOnTogglePlayCut) {
      propOnTogglePlayCut();
    } else {
      if (!localIsPlayingCut && localCurrentTimeSec >= totalCutDuration) {
        setLocalCurrentTimeSec(0);
        notifyTimeUpdate(0, true);
      }
      setLocalIsPlayingCut((prev) => !prev);
    }
  }, [isPlayingShot, isPlayingInOutRange, propOnTogglePlayCut, localIsPlayingCut, localCurrentTimeSec, totalCutDuration, notifyTimeUpdate]);

  // Toggle single shot video play
  const handleToggleShotPlay = useCallback(() => {
    if (effectiveIsPlayingCut) handleToggleCutPlay();
    if (isPlayingInOutRange) setIsPlayingInOutRange(false);
    // When playing single shot, ensure it starts at inPoint if currently at 0 or outside
    if (!isPlayingShot && videoElementRef.current) {
      const vTime = videoElementRef.current.currentTime;
      if (vTime < inPoint || vTime >= outPoint) {
        videoElementRef.current.currentTime = inPoint;
      }
    }
    setIsPlayingShot((prev) => !prev);
  }, [effectiveIsPlayingCut, isPlayingInOutRange, isPlayingShot, inPoint, outPoint, handleToggleCutPlay]);

  // Play specifically In to Out range
  const handlePlayInOutRange = useCallback(() => {
    if (effectiveIsPlayingCut) handleToggleCutPlay();
    if (videoElementRef.current) {
      videoElementRef.current.currentTime = inPoint;
      videoElementRef.current.play().catch(() => {});
    }
    setIsPlayingShot(false);
    setIsPlayingInOutRange(true);
  }, [effectiveIsPlayingCut, inPoint, handleToggleCutPlay]);

  // General viewport click (play shot or play cut)
  const handleViewportClick = useCallback(() => {
    if (activeTake?.mediaType === 'video') {
      if (effectiveIsPlayingCut) {
        handleToggleCutPlay();
      } else if (isPlayingInOutRange) {
        setIsPlayingInOutRange(false);
      } else {
        handleToggleShotPlay();
      }
    } else {
      handleToggleCutPlay();
    }
  }, [activeTake?.mediaType, effectiveIsPlayingCut, isPlayingInOutRange, handleToggleCutPlay, handleToggleShotPlay]);

  // --- IN / OUT EDITING ACTIONS ---
  const handleCommitInOut = useCallback(
    (newIn: number, newOut: number) => {
      const sanitizedIn = Math.max(0, Math.min(newIn, newOut - 0.2));
      const sanitizedOut = Math.min(rawMediaDuration, Math.max(sanitizedIn + 0.2, newOut));
      setInPoint(sanitizedIn);
      setOutPoint(sanitizedOut);
      if (currentShot && activeTake && onUpdateTakeInOut) {
        onUpdateTakeInOut(currentShot.id, activeTake.id, sanitizedIn, sanitizedOut);
      }
    },
    [currentShot, activeTake, rawMediaDuration, onUpdateTakeInOut]
  );

  const handleMarkIn = useCallback(() => {
    const curTime = videoElementRef.current ? videoElementRef.current.currentTime : videoCurrentTime;
    const newIn = Math.min(outPoint - 0.2, Math.max(0, curTime));
    handleCommitInOut(newIn, outPoint);
  }, [videoCurrentTime, outPoint, handleCommitInOut]);

  const handleMarkOut = useCallback(() => {
    const curTime = videoElementRef.current ? videoElementRef.current.currentTime : videoCurrentTime;
    const newOut = Math.max(inPoint + 0.2, Math.min(rawMediaDuration, curTime));
    handleCommitInOut(inPoint, newOut);
  }, [videoCurrentTime, inPoint, rawMediaDuration, handleCommitInOut]);

  const handleResetInOut = useCallback(() => {
    handleCommitInOut(0, rawMediaDuration);
    if (videoElementRef.current) {
      videoElementRef.current.currentTime = 0;
    }
  }, [rawMediaDuration, handleCommitInOut]);

  const handleNudgeIn = useCallback(
    (deltaSec: number) => {
      const newIn = Math.max(0, Math.min(outPoint - 0.2, inPoint + deltaSec));
      handleCommitInOut(newIn, outPoint);
      if (videoElementRef.current) {
        videoElementRef.current.currentTime = newIn;
      }
    },
    [inPoint, outPoint, handleCommitInOut]
  );

  const handleNudgeOut = useCallback(
    (deltaSec: number) => {
      const newOut = Math.min(rawMediaDuration, Math.max(inPoint + 0.2, outPoint + deltaSec));
      handleCommitInOut(inPoint, newOut);
      if (videoElementRef.current) {
        videoElementRef.current.currentTime = newOut;
      }
    },
    [inPoint, outPoint, rawMediaDuration, handleCommitInOut]
  );

  // Keyboard Shortcuts (Space, I, O, X)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (e.shiftKey) {
          handlePlayInOutRange();
        } else if (activeTake?.mediaType === 'video' && !effectiveIsPlayingCut) {
          handleToggleShotPlay();
        } else {
          handleToggleCutPlay();
        }
      } else if (e.key === 'i' || e.key === 'I' || e.key === '[') {
        e.preventDefault();
        handleMarkIn();
      } else if (e.key === 'o' || e.key === 'O' || e.key === ']') {
        e.preventDefault();
        handleMarkOut();
      } else if (e.key === 'x' || e.key === 'X') {
        e.preventDefault();
        handleResetInOut();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    activeTake?.mediaType,
    effectiveIsPlayingCut,
    handleToggleCutPlay,
    handleToggleShotPlay,
    handlePlayInOutRange,
    handleMarkIn,
    handleMarkOut,
    handleResetInOut,
  ]);

  // --- DRAGGABLE IN / OUT / RANGE HANDLERS ---
  const handleStartDragHandle = (
    e: React.MouseEvent,
    handleType: 'in' | 'out' | 'range'
  ) => {
    e.stopPropagation();
    e.preventDefault();
    if (!scrubberTrackRef.current) return;

    const rect = scrubberTrackRef.current.getBoundingClientRect();
    dragStartInfoRef.current = {
      startX: e.clientX,
      startIn: inPoint,
      startOut: outPoint,
      trackWidth: rect.width,
    };
    setDraggingHandle(handleType);
  };

  useEffect(() => {
    if (!draggingHandle) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStartInfoRef.current || !scrubberTrackRef.current) return;
      const { startX, startIn, startOut, trackWidth } = dragStartInfoRef.current;
      const deltaX = e.clientX - startX;
      const deltaSec = (deltaX / trackWidth) * rawMediaDuration;

      if (draggingHandle === 'in') {
        const newIn = Math.max(0, Math.min(startOut - 0.2, +(startIn + deltaSec).toFixed(2)));
        setInPoint(newIn);
        inPointRef.current = newIn;
        if (videoElementRef.current) {
          videoElementRef.current.currentTime = newIn;
        }
      } else if (draggingHandle === 'out') {
        const newOut = Math.min(rawMediaDuration, Math.max(startIn + 0.2, +(startOut + deltaSec).toFixed(2)));
        setOutPoint(newOut);
        outPointRef.current = newOut;
        if (videoElementRef.current) {
          videoElementRef.current.currentTime = newOut;
        }
      } else if (draggingHandle === 'range') {
        const span = startOut - startIn;
        const newIn = Math.max(0, Math.min(rawMediaDuration - span, +(startIn + deltaSec).toFixed(2)));
        const newOut = +(newIn + span).toFixed(2);
        setInPoint(newIn);
        setOutPoint(newOut);
        inPointRef.current = newIn;
        outPointRef.current = newOut;
        if (videoElementRef.current) {
          videoElementRef.current.currentTime = newIn;
        }
      }
    };

    const handleMouseUp = () => {
      setDraggingHandle(null);
      dragStartInfoRef.current = null;
      handleCommitInOut(inPointRef.current, outPointRef.current);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingHandle, rawMediaDuration, currentShot, activeTake, onUpdateTakeInOut]);

  // Auto-hide viewport HUD after mouse inactivity
  const handleMouseMoveViewport = () => {
    setShowViewportHud(true);
    if (hideHudTimeoutRef.current) clearTimeout(hideHudTimeoutRef.current);
    if (effectiveIsPlayingCut || isPlayingShot || isPlayingInOutRange) {
      hideHudTimeoutRef.current = window.setTimeout(() => {
        setShowViewportHud(false);
      }, 3000);
    }
  };

  // Jump to specific shot in cut (explicit user action)
  const handleJumpToShot = (shot: Shot) => {
    onSelectShot(shot.id);
    let acc = 0;
    for (const s of allShotsInOrder) {
      if (s.id === shot.id) {
        setLocalCurrentTimeSec(acc);
        propOnSeekCutTime?.(acc);
        notifyTimeUpdate(acc, true);
        break;
      }
      acc += getEffectiveShotDuration(s);
    }

    const shotIn = getEffectiveShotInPoint(shot);
    if (videoElementRef.current) {
      videoElementRef.current.currentTime = shotIn;
    }

    if (!effectiveIsPlayingCut) {
      setIsPlayingShot(false);
      setIsPlayingInOutRange(false);
    }
  };

  // Explicit seek handler for cut scrubber bar
  const handleCutScrubSeek = (posSec: number) => {
    setLocalCurrentTimeSec(posSec);
    propOnSeekCutTime?.(posSec);
    notifyTimeUpdate(posSec, true);

    let acc = 0;
    let targetShot: Shot | undefined;
    let shotStart = 0;
    for (const s of allShotsInOrder) {
      const dur = getEffectiveShotDuration(s);
      if (posSec >= acc && posSec < acc + dur) {
        targetShot = s;
        shotStart = acc;
        break;
      }
      acc += dur;
    }

    if (targetShot && targetShot.id !== currentShot?.id) {
      onSelectShot(targetShot.id);
    }

    const video = videoElementRef.current;
    if (video && activeTake?.mediaType === 'video' && targetShot) {
      const offset = Math.max(0, posSec - shotStart);
      const shotIn = getEffectiveShotInPoint(targetShot);
      const shotOut = getEffectiveShotOutPoint(targetShot);
      const targetVideoTime = Math.min(shotOut, shotIn + offset);
      try {
        video.currentTime = targetVideoTime;
      } catch {
        // ignore
      }
    }
  };

  const handleGoToStart = () => {
    if (allShotsInOrder.length === 0) return;
    const firstShot = allShotsInOrder[0];
    const targetTime = timelineInPoint !== null ? timelineInPoint : 0;
    onSelectShot(firstShot.id);
    setLocalCurrentTimeSec(targetTime);
    propOnSeekCutTime?.(targetTime);
    notifyTimeUpdate(targetTime, true);

    const shotIn = getEffectiveShotInPoint(firstShot);
    if (videoElementRef.current) {
      videoElementRef.current.currentTime = shotIn;
    }
    if (!effectiveIsPlayingCut) {
      setIsPlayingShot(false);
      setIsPlayingInOutRange(false);
    }
  };

  const handleGoToEnd = () => {
    if (allShotsInOrder.length === 0) return;
    const lastShot = allShotsInOrder[allShotsInOrder.length - 1];
    const targetTime = timelineOutPoint !== null ? timelineOutPoint : totalCutDuration;
    onSelectShot(lastShot.id);
    setLocalCurrentTimeSec(targetTime);
    propOnSeekCutTime?.(targetTime);
    notifyTimeUpdate(targetTime, true);

    const shotOut = getEffectiveShotOutPoint(lastShot);
    if (videoElementRef.current) {
      videoElementRef.current.currentTime = shotOut;
    }
    if (!effectiveIsPlayingCut) {
      setIsPlayingShot(false);
      setIsPlayingInOutRange(false);
    }
  };

  const handleNextShot = () => {
    if (!currentShot) return;
    const idx = allShotsInOrder.findIndex((s) => s.id === currentShot?.id);
    if (idx < allShotsInOrder.length - 1) {
      handleJumpToShot(allShotsInOrder[idx + 1]);
    }
  };

  const handlePrevShot = () => {
    if (!currentShot) return;
    const idx = allShotsInOrder.findIndex((s) => s.id === currentShot?.id);
    if (idx > 0) {
      handleJumpToShot(allShotsInOrder[idx - 1]);
    }
  };

  const handleToggleFullscreen = () => {
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Ensure video element starts at inPoint when loaded or switched
  useEffect(() => {
    const video = videoElementRef.current;
    if (!video || !activeTake || activeTake.mediaType !== 'video') return;

    video.muted = isMuted;
    video.volume = volume;
    video.playbackRate = playbackRateRef.current || 1.0;

    const inPt = currentShot ? getEffectiveShotInPoint(currentShot) : (activeTake.inPoint ?? 0);
    const outPt = currentShot ? getEffectiveShotOutPoint(currentShot) : (activeTake.outPoint ?? (video.duration || activeTake.duration || 3.5));

    if (effectiveIsPlayingCut) {
      // Calculate current offset within this shot
      const elapsed = Math.max(0, effectiveCurrentTimeSec - currentShotStartTime);
      const targetTime = Math.min(outPt, inPt + elapsed);
      if (video.readyState >= 1) {
        video.currentTime = targetTime;
      }
      video.play().catch(() => {
        video.muted = true;
        setIsMuted(true);
        video.play().catch(() => {});
      });
    } else if (isPlayingShot || isPlayingInOutRange) {
      if (video.currentTime < inPt || video.currentTime >= outPt) {
        if (video.readyState >= 1) {
          video.currentTime = inPt;
        }
      }
      video.play().catch(() => {
        video.muted = true;
        setIsMuted(true);
        video.play().catch(() => {});
      });
    } else {
      video.pause();
      // Seek to inPoint frame so director sees the start frame of the trimmed scene!
      if (video.readyState >= 1) {
        video.currentTime = inPt;
      }
    }
  }, [
    activeTake?.id,
    activeTake?.mediaUrl,
    activeTake?.inPoint,
    activeTake?.outPoint,
    currentShot?.id,
    effectiveIsPlayingCut,
    isPlayingShot,
    isPlayingInOutRange,
    isMuted,
    volume,
    playbackRate,
  ]);

  // Master Playback Clock Loop (Strictly adhering to in/out points during cut playback)
  useEffect(() => {
    const isPlaying = effectiveIsPlayingCut || isPlayingShot || isPlayingInOutRange;
    if (!isPlaying) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    let lastTime = performance.now();

    const loop = (now: number) => {
      const delta = ((now - lastTime) / 1000) * (playbackRateRef.current || 1.0);
      lastTime = now;

      const isVideo = activeTakeRef.current?.mediaType === 'video';
      const video = videoElementRef.current;

      if (isVideo && video) {
        // --- HARDWARE VIDEO DRIVEN CLOCK ---
        const vTime = video.currentTime;
        setVideoCurrentTime(vTime);

        const curShot = currentShotRef.current;
        const currentIn = curShot ? getEffectiveShotInPoint(curShot) : inPointRef.current;
        const currentOut = curShot ? getEffectiveShotOutPoint(curShot) : outPointRef.current;
        const trimmedShotDur = Math.max(0.2, currentOut - currentIn);

        // Guard against browser starting below In point
        if (!video.seeking && vTime < currentIn - 0.05) {
          video.currentTime = currentIn;
          return;
        }

        // Real-time Transition Detection between adjacent shots
        const timeRemaining = currentOut - vTime;
        const shots = allShotsInOrderRef.current;
        const curIdx = shots.findIndex((s) => s.id === curShot?.id);
        const nextShot = curIdx >= 0 && curIdx < shots.length - 1 ? shots[curIdx + 1] : undefined;
        const transKey = nextShot ? `${curShot?.id}->${nextShot.id}` : '';
        const trans = transKey ? project.transitions[transKey] : undefined;
        const transDur = trans?.duration && trans.duration > 0 ? trans.duration : 0.8;

        if (trans && trans.type !== 'cut' && nextShot && timeRemaining <= transDur && timeRemaining > 0) {
          const progress = Math.max(0, Math.min(1.0, 1 - timeRemaining / transDur));
          setActiveTransition({
            type: trans.type,
            progress,
            incomingShot: nextShot,
          });
        } else {
          setActiveTransition(null);
        }

        if (effectiveIsPlayingCutRef.current) {
          // In program cut, time elapsed within this shot is measured strictly from inPoint
          const shotProgress = Math.max(0, Math.min(trimmedShotDur, vTime - currentIn));
          const cutPos = currentShotStartTimeRef.current + shotProgress;
          setLocalCurrentTimeSec(cutPos);
          notifyTimeUpdate(cutPos);

          // CRITICAL: Cut immediately at Out Point! Never play the rest of the clip!
          if (
            !video.seeking &&
            (vTime >= currentOut - 0.04 ||
              shotProgress >= trimmedShotDur - 0.02 ||
              (timelineOutPointRef.current !== null && cutPos >= timelineOutPointRef.current - 0.03) ||
              video.ended)
          ) {
            advanceToNextShot();
          }
        } else if (isPlayingInOutRangeRef.current) {
          // Loop strictly between In and Out points
          if (vTime >= currentOut - 0.04 || video.ended) {
            if (isLoopingRef.current) {
              video.currentTime = currentIn;
              video.play().catch(() => {});
            } else {
              video.pause();
              video.currentTime = currentIn;
              setIsPlayingInOutRange(false);
            }
          }
        } else if (isPlayingShotRef.current) {
          // Single shot preview: respects in/out bounds as the scene cut
          if (vTime >= currentOut - 0.04 || video.ended) {
            if (isLoopingRef.current) {
              video.currentTime = currentIn;
              video.play().catch(() => {});
            } else {
              video.pause();
              video.currentTime = currentIn;
              setIsPlayingShot(false);
            }
          }
        }
      } else {
        // --- STILL IMAGE DRIVEN CLOCK ---
        if (effectiveIsPlayingCutRef.current) {
          const next = effectiveCurrentTimeSecRef.current + delta;
          effectiveCurrentTimeSecRef.current = next;
          setLocalCurrentTimeSec(next);
          notifyTimeUpdate(next);

          const shotDur = currentShotRef.current
            ? getEffectiveShotDuration(currentShotRef.current)
            : 3.5;
          const shotEnd = currentShotStartTimeRef.current + shotDur;
          const timeRemaining = shotEnd - next;

          const shots = allShotsInOrderRef.current;
          const curIdx = shots.findIndex((s) => s.id === currentShotRef.current?.id);
          const nextShot = curIdx >= 0 && curIdx < shots.length - 1 ? shots[curIdx + 1] : undefined;
          const transKey = nextShot ? `${currentShotRef.current?.id}->${nextShot.id}` : '';
          const trans = transKey ? project.transitions[transKey] : undefined;
          const transDur = trans?.duration && trans.duration > 0 ? trans.duration : 0.8;

          if (trans && trans.type !== 'cut' && nextShot && timeRemaining <= transDur && timeRemaining > 0) {
            const progress = Math.max(0, Math.min(1.0, 1 - timeRemaining / transDur));
            setActiveTransition({
              type: trans.type,
              progress,
              incomingShot: nextShot,
            });
          } else {
            setActiveTransition(null);
          }

          const effectiveShotEnd =
            timelineOutPointRef.current !== null
              ? Math.min(shotEnd, timelineOutPointRef.current)
              : shotEnd;

          if (next >= effectiveShotEnd) {
            advanceToNextShot();
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [
    effectiveIsPlayingCut,
    isPlayingShot,
    isPlayingInOutRange,
    activeTake?.id,
    currentShot?.id,
    advanceToNextShot,
    notifyTimeUpdate,
    project.transitions,
  ]);

  const currentScene = project.scenes.find((sc) => sc.shots.some((s) => s.id === currentShot?.id));

  // Determine aspect ratio class
  const getAspectRatioStyle = () => {
    switch (project.brief.aspectRatio) {
      case '9:16':
        return 'aspect-[9/16] max-h-[82%]';
      case '2.39:1':
        return 'aspect-[2.39/1] w-full';
      case '4:3':
        return 'aspect-[4/3] max-h-[90%]';
      case '16:9':
      default:
        return 'aspect-video w-full';
    }
  };

  const isAnyPlaying = effectiveIsPlayingCut || isPlayingShot || isPlayingInOutRange;
  const inPct = (inPoint / rawMediaDuration) * 100;
  const outPct = (outPoint / rawMediaDuration) * 100;
  const trimmedDuration = Math.max(0.1, outPoint - inPoint);

  return (
    <div
      ref={playerContainerRef}
      onMouseMove={handleMouseMoveViewport}
      className="h-full flex flex-col bg-[#141414] text-white select-none overflow-hidden"
    >
      {/* Top Monitor Bar */}
      <div className="h-10 bg-[#1A1A1A] px-4 flex items-center justify-between border-b border-[#2A2A2A] text-xs font-mono shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 opacity-90 pr-2 border-r border-[#333333]">
            <VideoLabLogo height={20} theme="dark" />
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isAnyPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-[#0D9488]'
              }`}
            />
            <span className="text-[#A1A1AA] uppercase tracking-wider font-sans font-bold text-[11px]">
              {tableReadActive
                ? 'Table Read Mode'
                : effectiveIsPlayingCut
                ? 'Program Cut (In/Out Bounded)'
                : isPlayingInOutRange
                ? 'In/Out Range Loop'
                : isPlayingShot
                ? 'Shot Preview (Live Playing)'
                : 'Director Monitor'}
            </span>
            {currentShot && (
              <span className="text-zinc-400">
                · Scene {currentScene?.sceneNumber}.{currentShot.shotNumber} ({currentShot.shotType.toUpperCase()})
              </span>
            )}
            {activeTake?.mediaType === 'video' && (
              <span className="bg-[#0D9488]/20 text-[#2DD4BF] border border-[#0D9488]/40 px-1.5 py-0.2 rounded text-[10px] font-sans flex items-center gap-1">
                <Video className="w-3 h-3" />
                <span>Trimmed Cut: {trimmedDuration.toFixed(1)}s</span>
              </span>
            )}
          </div>
        </div>

        {/* Timecode Readout */}
        <div className="flex items-center gap-3">
          <span className="text-emerald-400 font-bold tracking-widest text-sm">
            {formatTimecode(effectiveCurrentTimeSec)}
          </span>
          <span className="text-zinc-500">/</span>
          <span className="text-zinc-400 tracking-wider">
            {formatTimecode(totalCutDuration)}
          </span>
        </div>
      </div>

      {/* Main Video Viewport Canvas with Drag-and-Drop */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragOverMonitor(true);
        }}
        onDragLeave={() => setIsDragOverMonitor(false)}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragOverMonitor(false);
          const file = e.dataTransfer.files?.[0];
          if (file && currentShot && onUploadTakeMedia) {
            onUploadTakeMedia(currentShot.id, file);
          }
        }}
        className="flex-1 relative flex items-center justify-center bg-black overflow-hidden p-3 group/viewport"
      >
        {/* Aspect Ratio Box with Cinema Masking */}
        <div
          className={`relative ${getAspectRatioStyle()} bg-[#080808] flex items-center justify-center overflow-hidden rounded-md shadow-2xl transition-all duration-300 ${
            isDragOverMonitor ? 'ring-4 ring-[#0D9488] shadow-[#0D9488]/30' : ''
          }`}
        >
          {/* Active Drag-and-Drop Video Overlay */}
          {isDragOverMonitor && (
            <div className="absolute inset-0 bg-[#0D9488]/90 text-white z-40 flex flex-col items-center justify-center p-6 text-center backdrop-blur-xs animate-pulse">
              <Upload className="w-12 h-12 mb-2 animate-bounce" />
              <h3 className="font-bold text-base">Drop Video into Director Monitor</h3>
              <p className="text-xs opacity-90 font-mono mt-1 max-w-sm">
                Attaches video clip to Scene {currentScene?.sceneNumber}.{currentShot?.shotNumber} (
                {currentShot?.shotType.toUpperCase()})
              </p>
            </div>
          )}

          {/* Active Take Visual Content */}
          {activeTake?.mediaUrl ? (
            activeTake.mediaType === 'video' ? (
              <div className="relative w-full h-full flex items-center justify-center bg-black">
                <video
                  ref={videoElementRef}
                  key={activeTake.id}
                  src={activeTake.mediaUrl}
                  loop={false}
                  muted={isMuted}
                  playsInline
                  preload="auto"
                  onClick={handleViewportClick}
                  onLoadedMetadata={(e) => {
                    const video = e.currentTarget;
                    const dur = video.duration || currentShot?.duration || 3.5;
                    setVideoDuration(dur);
                    const curShot = currentShotRef.current;
                    const shotIn = curShot ? getEffectiveShotInPoint(curShot) : inPointRef.current;
                    const shotOut = curShot ? getEffectiveShotOutPoint(curShot) : dur;
                    if (effectiveIsPlayingCutRef.current) {
                      const elapsed = Math.max(0, effectiveCurrentTimeSecRef.current - currentShotStartTimeRef.current);
                      const target = Math.min(shotOut, shotIn + elapsed);
                      video.currentTime = target;
                      video.play().catch(() => {
                        video.muted = true;
                        setIsMuted(true);
                        video.play().catch(() => {});
                      });
                    } else {
                      video.currentTime = shotIn;
                    }
                  }}
                  onCanPlay={(e) => {
                    const video = e.currentTarget;
                    const curShot = currentShotRef.current;
                    const shotIn = curShot ? getEffectiveShotInPoint(curShot) : inPointRef.current;
                    const shotOut = curShot ? getEffectiveShotOutPoint(curShot) : (video.duration || 3.5);
                    if (effectiveIsPlayingCutRef.current) {
                      const elapsed = Math.max(0, effectiveCurrentTimeSecRef.current - currentShotStartTimeRef.current);
                      const target = Math.min(shotOut, shotIn + elapsed);
                      if (Math.abs(video.currentTime - target) > 0.08) {
                        video.currentTime = target;
                      }
                      if (video.paused) {
                        video.play().catch(() => {
                          video.muted = true;
                          setIsMuted(true);
                          video.play().catch(() => {});
                        });
                      }
                    } else if (isPlayingShotRef.current || isPlayingInOutRangeRef.current) {
                      if (video.currentTime < shotIn || video.currentTime >= shotOut) {
                        video.currentTime = shotIn;
                      }
                      if (video.paused) {
                        video.play().catch(() => {});
                      }
                    }
                  }}
                  onEnded={() => {
                    if (effectiveIsPlayingCutRef.current) {
                      advanceToNextShot();
                    } else if (isLoopingRef.current) {
                      const curShot = currentShotRef.current;
                      const shotIn = curShot ? getEffectiveShotInPoint(curShot) : 0;
                      if (videoElementRef.current) {
                        videoElementRef.current.currentTime = shotIn;
                        videoElementRef.current.play().catch(() => {});
                      }
                    } else {
                      setIsPlayingShot(false);
                      setIsPlayingInOutRange(false);
                    }
                  }}
                  style={{
                    willChange: 'transform',
                    transform: 'translateZ(0)',
                  }}
                  className="w-full h-full object-contain cursor-pointer"
                />

                {/* Central Play/Pause Overlay Button */}
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewportClick();
                  }}
                  className={`absolute inset-0 flex items-center justify-center pointer-events-auto cursor-pointer transition-opacity duration-200 ${
                    !isAnyPlaying
                      ? 'opacity-100 bg-black/30'
                      : 'opacity-0 hover:opacity-100 bg-black/20'
                  }`}
                >
                  <div className="w-16 h-16 rounded-full bg-[#0D9488]/90 hover:bg-[#0D9488] text-white flex items-center justify-center shadow-2xl backdrop-blur-xs transition-transform hover:scale-110 active:scale-95 border-2 border-white/30">
                    {isAnyPlaying ? (
                      <Pause className="w-8 h-8 fill-current" />
                    ) : (
                      <Play className="w-8 h-8 ml-1 fill-current" />
                    )}
                  </div>
                  {!isAnyPlaying && (
                    <span className="absolute mt-24 text-xs font-mono text-white/90 bg-black/60 px-3 py-1 rounded-full border border-white/10">
                      Click to Play (Space)
                    </span>
                  )}
                </div>

                {/* On-Screen Viewport HUD Bar (auto-hides on idle) */}
                <div
                  className={`absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/75 to-transparent p-3 pt-6 flex flex-col gap-2 transition-opacity duration-300 z-30 ${
                    showViewportHud || !isAnyPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'
                  }`}
                >
                  {/* --- DRAGGABLE IN / OUT EDITABLE SCRUBBER TRACK --- */}
                  <div className="flex flex-col gap-1">
                    <div
                      ref={scrubberTrackRef}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!scrubberTrackRef.current) return;
                        const rect = scrubberTrackRef.current.getBoundingClientRect();
                        const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                        const targetSec = pos * rawMediaDuration;
                        if (videoElementRef.current) {
                          videoElementRef.current.currentTime = targetSec;
                        }
                        if (effectiveIsPlayingCut) {
                          handleCutScrubSeek(currentShotStartTime + Math.max(0, targetSec - inPoint));
                        }
                      }}
                      className="relative h-6 bg-black/70 border border-white/20 rounded-md cursor-pointer select-none overflow-hidden group/scrubber"
                      title="Click to seek · Drag In [ or Out ] handle to trim clip duration for the scene"
                    >
                      {/* Dimmed Out-of-Bounds Head Region (0 to inPoint) */}
                      <div
                        className="absolute left-0 top-0 bottom-0 bg-black/70 pointer-events-none"
                        style={{
                          width: `${Math.max(0, inPct)}%`,
                          backgroundImage:
                            'repeating-linear-gradient(45deg, rgba(255,255,255,0.06), rgba(255,255,255,0.06) 4px, transparent 4px, transparent 8px)',
                        }}
                      />

                      {/* Active In-to-Out Range Span */}
                      <div
                        onMouseDown={(e) => handleStartDragHandle(e, 'range')}
                        className="absolute top-0 bottom-0 bg-[#0D9488]/30 hover:bg-[#0D9488]/40 border-y border-[#2DD4BF]/60 transition-colors cursor-grab active:cursor-grabbing flex items-center justify-center group/range"
                        style={{
                          left: `${inPct}%`,
                          width: `${Math.max(0, outPct - inPct)}%`,
                        }}
                        title="Active Cut Range · Drag to slip trim window across clip"
                      >
                        <span className="text-[9px] font-mono text-[#2DD4BF] opacity-0 group-hover/range:opacity-100 transition-opacity font-semibold tracking-wider">
                          IN-TO-OUT: {trimmedDuration.toFixed(1)}s
                        </span>
                      </div>

                      {/* Dimmed Out-of-Bounds Tail Region (outPoint to 100%) */}
                      <div
                        className="absolute right-0 top-0 bottom-0 bg-black/70 pointer-events-none"
                        style={{
                          width: `${Math.max(0, 100 - outPct)}%`,
                          backgroundImage:
                            'repeating-linear-gradient(45deg, rgba(255,255,255,0.06), rgba(255,255,255,0.06) 4px, transparent 4px, transparent 8px)',
                        }}
                      />

                      {/* Draggable IN Point Handle Bracket [ */}
                      <div
                        onMouseDown={(e) => handleStartDragHandle(e, 'in')}
                        className="absolute top-0 bottom-0 -ml-2.5 w-5 flex items-center justify-center cursor-ew-resize z-40 group/inhandle"
                        style={{ left: `${inPct}%` }}
                        title={`Drag In-Point [ (Current: ${formatPrecisionTime(inPoint)})`}
                      >
                        <div className="w-2.5 h-full bg-[#2DD4BF] hover:bg-white rounded-l border border-black/50 shadow-md flex items-center justify-center transition-colors">
                          <span className="text-[10px] font-mono font-black text-black leading-none select-none">
                            [
                          </span>
                        </div>
                        {/* Hover Tooltip */}
                        <div className="absolute -top-7 px-1.5 py-0.5 bg-black/90 text-[#2DD4BF] text-[9px] font-mono rounded shadow pointer-events-none opacity-0 group-hover/inhandle:opacity-100 transition-opacity whitespace-nowrap border border-white/10">
                          IN: {formatPrecisionTime(inPoint)}
                        </div>
                      </div>

                      {/* Draggable OUT Point Handle Bracket ] */}
                      <div
                        onMouseDown={(e) => handleStartDragHandle(e, 'out')}
                        className="absolute top-0 bottom-0 -ml-2.5 w-5 flex items-center justify-center cursor-ew-resize z-40 group/outhandle"
                        style={{ left: `${outPct}%` }}
                        title={`Drag Out-Point ] (Current: ${formatPrecisionTime(outPoint)})`}
                      >
                        <div className="w-2.5 h-full bg-[#2DD4BF] hover:bg-white rounded-r border border-black/50 shadow-md flex items-center justify-center transition-colors">
                          <span className="text-[10px] font-mono font-black text-black leading-none select-none">
                            ]
                          </span>
                        </div>
                        {/* Hover Tooltip */}
                        <div className="absolute -top-7 px-1.5 py-0.5 bg-black/90 text-[#2DD4BF] text-[9px] font-mono rounded shadow pointer-events-none opacity-0 group-hover/outhandle:opacity-100 transition-opacity whitespace-nowrap border border-white/10">
                          OUT: {formatPrecisionTime(outPoint)}
                        </div>
                      </div>

                      {/* Current Video Playhead Needle Line */}
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-white z-30 pointer-events-none shadow-sm"
                        style={{
                          left: `${Math.min(100, Math.max(0, (videoCurrentTime / rawMediaDuration) * 100))}%`,
                        }}
                      >
                        <div className="w-2.5 h-2.5 -ml-1 -mt-0.5 bg-white rotate-45 rounded-2xs" />
                      </div>
                    </div>
                  </div>

                  {/* Micro Transport Bar on Viewport with In/Out Controls */}
                  <div className="flex flex-wrap items-center justify-between text-xs text-white/90 font-mono gap-2 pt-1 border-t border-white/10">
                    {/* Left: Playback Triggers */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleShotPlay();
                        }}
                        className={`px-2 py-0.5 rounded flex items-center gap-1 transition-colors text-[11px] font-sans font-medium ${
                          isPlayingShot
                            ? 'bg-amber-600 text-white'
                            : 'bg-white/10 hover:bg-[#0D9488] text-white'
                        }`}
                        title={isPlayingShot ? 'Pause Shot' : 'Play Shot Video (Starts at In Point)'}
                      >
                        {isPlayingShot ? (
                          <Pause className="w-3 h-3 fill-current" />
                        ) : (
                          <Play className="w-3 h-3 fill-current" />
                        )}
                        <span>{isPlayingShot ? 'Pause' : 'Play Shot'}</span>
                      </button>

                      {/* Play In-to-Out Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlayInOutRange();
                        }}
                        className={`px-2 py-0.5 rounded flex items-center gap-1 transition-colors text-[11px] font-sans font-medium border ${
                          isPlayingInOutRange
                            ? 'bg-[#0D9488] text-white border-[#2DD4BF]'
                            : 'bg-black/60 hover:bg-[#0D9488]/30 text-[#2DD4BF] border-[#0D9488]/50'
                        }`}
                        title="Loop Preview only the trimmed In-to-Out range (Shift+Space)"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Play In-Out ({trimmedDuration.toFixed(1)}s)</span>
                      </button>

                      <span className="text-zinc-400 font-mono text-[11px]">
                        {formatShortTime(videoCurrentTime)} / {formatShortTime(rawMediaDuration)}
                      </span>
                    </div>

                    {/* Center: In / Out Quick Mark Controls */}
                    <div className="flex items-center gap-1.5 bg-black/60 px-2 py-1 rounded border border-white/10">
                      {/* Mark In Button */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkIn();
                          }}
                          className="px-1.5 py-0.5 bg-[#262626] hover:bg-[#0D9488] text-[#2DD4BF] hover:text-white rounded text-[10px] font-bold transition-colors flex items-center gap-0.5"
                          title="Set In Point at current frame (Hotkey: I or [)"
                        >
                          <span>Mark IN [</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNudgeIn(-0.1);
                          }}
                          className="px-1 hover:text-[#2DD4BF] text-zinc-400 font-mono text-[10px]"
                          title="Nudge In -0.1s"
                        >
                          -
                        </button>
                        <span className="text-[10px] text-zinc-200 font-mono font-medium">
                          {formatPrecisionTime(inPoint)}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNudgeIn(+0.1);
                          }}
                          className="px-1 hover:text-[#2DD4BF] text-zinc-400 font-mono text-[10px]"
                          title="Nudge In +0.1s"
                        >
                          +
                        </button>
                      </div>

                      <span className="text-zinc-600">|</span>

                      {/* Mark Out Button */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkOut();
                          }}
                          className="px-1.5 py-0.5 bg-[#262626] hover:bg-[#0D9488] text-[#2DD4BF] hover:text-white rounded text-[10px] font-bold transition-colors flex items-center gap-0.5"
                          title="Set Out Point at current frame (Hotkey: O or ])"
                        >
                          <span>Mark OUT ]</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNudgeOut(-0.1);
                          }}
                          className="px-1 hover:text-[#2DD4BF] text-zinc-400 font-mono text-[10px]"
                          title="Nudge Out -0.1s"
                        >
                          -
                        </button>
                        <span className="text-[10px] text-zinc-200 font-mono font-medium">
                          {formatPrecisionTime(outPoint)}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNudgeOut(+0.1);
                          }}
                          className="px-1 hover:text-[#2DD4BF] text-zinc-400 font-mono text-[10px]"
                          title="Nudge Out +0.1s"
                        >
                          +
                        </button>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleResetInOut();
                        }}
                        className="p-1 hover:text-rose-400 text-zinc-400 transition-colors"
                        title="Reset In/Out Points to full duration (Hotkey: X)"
                      >
                        <RotateCcw className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Right: Audio & Fullscreen */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsMuted(!isMuted);
                        }}
                        className="p-1 hover:text-[#2DD4BF] text-zinc-300"
                        title={isMuted ? 'Unmute' : 'Mute'}
                      >
                        {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsLooping(!isLooping);
                        }}
                        className={`p-1 rounded ${
                          isLooping ? 'text-[#2DD4BF]' : 'text-zinc-400 hover:text-white'
                        }`}
                        title="Toggle Loop"
                      >
                        <Repeat className="w-4 h-4" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleFullscreen();
                        }}
                        className="p-1 hover:text-white text-zinc-400"
                        title="Fullscreen"
                      >
                        <Maximize2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative w-full h-full overflow-hidden flex items-center justify-center">
                {/* Image still with simulated camera pan/dolly motion when playing */}
                <img
                  src={activeTake.mediaUrl}
                  alt="Take visual"
                  className={`w-full h-full object-cover transition-transform duration-1000 ${
                    effectiveIsPlayingCut ? 'scale-105 translate-x-1' : 'scale-100'
                  }`}
                />
                {/* 35mm subtle grain overlay */}
                <div className="absolute inset-0 bg-radial from-transparent via-black/10 to-black/40 pointer-events-none" />
              </div>
            )
          ) : (
            /* Graceful Placeholder for shots without generated take */
            <div className="flex flex-col items-center justify-center text-center p-6 text-zinc-500 space-y-3">
              <Tv className="w-12 h-12 stroke-[1.2] text-zinc-600" />
              <div>
                <p className="font-sans font-semibold text-zinc-300 text-sm">
                  {currentShot
                    ? `Shot ${currentShot.shotNumber} (${currentShot.shotType})`
                    : 'No Shot Selected'}
                </p>
                <p className="text-xs text-zinc-500 max-w-xs mt-1 italic font-serif">
                  {currentShot?.action || 'Select a shot in the script or timeline'}
                </p>
              </div>

              {currentShot && (
                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => onQuickGenerateTake(currentShot!.id)}
                    className="px-3 py-1.5 bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-semibold rounded-md flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generate Demo Take</span>
                  </button>
                  <button
                    onClick={() => onOpenTakeManager(currentShot!.id)}
                    className="px-3 py-1.5 bg-[#262626] hover:bg-[#333333] text-zinc-200 text-xs font-semibold rounded-md flex items-center gap-1.5 border border-zinc-700"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Take</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Intelligensi.ai Cinema Viewport Watermark */}
          <div className="absolute top-3 right-3 pointer-events-none z-20 opacity-40 hover:opacity-90 transition-opacity bg-black/50 backdrop-blur-xs px-2 py-1 rounded border border-white/10 flex items-center gap-1.5">
            <img src="/favicon.png" alt="Intelligensi.ai" className="h-3.5 w-3.5 object-contain" />
            <span
              className="text-[10px] tracking-tight text-white/90 font-light"
              style={{ fontFamily: "'Poppins', sans-serif" }}
            >
              Intelligensi<span className="text-[#2DD4BF] font-normal">.ai</span>
            </span>
          </div>

          {/* Transition Engine Live Effects */}
          {activeTransition && activeTransition.incomingShot && (
            <>
              {/* 1. Cross Dissolve (opacity blend of incoming shot) */}
              {(activeTransition.type === 'cross-dissolve' || activeTransition.type === 'dissolve') && (
                <div
                  style={{ opacity: activeTransition.progress }}
                  className="absolute inset-0 pointer-events-none overflow-hidden z-25 transition-opacity"
                >
                  <img
                    src={
                      activeTransition.incomingShot.takes.find(
                        (t) => t.id === activeTransition.incomingShot?.selectedTakeId
                      )?.mediaUrl || activeTransition.incomingShot.takes[0]?.mediaUrl
                    }
                    alt="Incoming shot"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* 2. Dip to Black */}
              {(activeTransition.type === 'dip-to-black' || activeTransition.type === 'fade') && (
                <div
                  style={{
                    opacity:
                      activeTransition.progress < 0.5
                        ? activeTransition.progress * 2
                        : (1 - activeTransition.progress) * 2,
                  }}
                  className="absolute inset-0 bg-black pointer-events-none z-25"
                />
              )}

              {/* 3. Dip to White */}
              {activeTransition.type === 'dip-to-white' && (
                <div
                  style={{
                    opacity:
                      activeTransition.progress < 0.5
                        ? activeTransition.progress * 2
                        : (1 - activeTransition.progress) * 2,
                  }}
                  className="absolute inset-0 bg-white pointer-events-none z-25"
                />
              )}

              {/* 4. Wipe Right */}
              {activeTransition.type === 'wipe-right' && (
                <div
                  style={{
                    clipPath: `inset(0 ${100 - activeTransition.progress * 100}% 0 0)`,
                  }}
                  className="absolute inset-0 pointer-events-none overflow-hidden z-25"
                >
                  <img
                    src={
                      activeTransition.incomingShot.takes.find(
                        (t) => t.id === activeTransition.incomingShot?.selectedTakeId
                      )?.mediaUrl || activeTransition.incomingShot.takes[0]?.mediaUrl
                    }
                    alt="Incoming shot"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-0 bottom-0 right-0 w-1 bg-white/70 shadow-[0_0_8px_rgba(255,255,255,0.9)]" />
                </div>
              )}

              {/* 5. Wipe Left */}
              {activeTransition.type === 'wipe-left' && (
                <div
                  style={{
                    clipPath: `inset(0 0 0 ${100 - activeTransition.progress * 100}%)`,
                  }}
                  className="absolute inset-0 pointer-events-none overflow-hidden z-25"
                >
                  <img
                    src={
                      activeTransition.incomingShot.takes.find(
                        (t) => t.id === activeTransition.incomingShot?.selectedTakeId
                      )?.mediaUrl || activeTransition.incomingShot.takes[0]?.mediaUrl
                    }
                    alt="Incoming shot"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-0 bottom-0 left-0 w-1 bg-white/70 shadow-[0_0_8px_rgba(255,255,255,0.9)]" />
                </div>
              )}

              {/* 6. Wipe Down */}
              {activeTransition.type === 'wipe-down' && (
                <div
                  style={{
                    clipPath: `inset(0 0 ${100 - activeTransition.progress * 100}% 0)`,
                  }}
                  className="absolute inset-0 pointer-events-none overflow-hidden z-25"
                >
                  <img
                    src={
                      activeTransition.incomingShot.takes.find(
                        (t) => t.id === activeTransition.incomingShot?.selectedTakeId
                      )?.mediaUrl || activeTransition.incomingShot.takes[0]?.mediaUrl
                    }
                    alt="Incoming shot"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-0 inset-x-0 h-1 bg-white/70 shadow-[0_0_8px_rgba(255,255,255,0.9)]" />
                </div>
              )}

              {/* 7. Iris Circle Wipe */}
              {activeTransition.type === 'iris' && (
                <div
                  style={{
                    clipPath: `circle(${activeTransition.progress * 85}% at center)`,
                  }}
                  className="absolute inset-0 pointer-events-none overflow-hidden z-25"
                >
                  <img
                    src={
                      activeTransition.incomingShot.takes.find(
                        (t) => t.id === activeTransition.incomingShot?.selectedTakeId
                      )?.mediaUrl || activeTransition.incomingShot.takes[0]?.mediaUrl
                    }
                    alt="Incoming shot"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 rounded-full border border-white/60 pointer-events-none" />
                </div>
              )}

              {/* 8. J-Cut / L-Cut Indicator */}
              {(activeTransition.type === 'j-cut' || activeTransition.type === 'l-cut') && (
                <div className="absolute top-3 left-3 px-2 py-1 bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 text-[10px] font-mono rounded-lg flex items-center gap-1.5 z-30 backdrop-blur-xs animate-pulse">
                  <Volume2 className="w-3 h-3 text-emerald-400" />
                  <span>{activeTransition.type.toUpperCase()}: Audio Overlap Active</span>
                </div>
              )}
            </>
          )}

          {/* Cinematic Dialogue Subtitle Bar */}
          {currentShot?.dialogueSnippet && !tableReadActive && (
            <div className="absolute bottom-6 inset-x-8 text-center pointer-events-none z-20">
              <span className="inline-block px-4 py-1.5 bg-black/75 backdrop-blur-xs text-[#F4EEDF] font-sans font-medium text-sm md:text-base rounded-md border border-white/10 shadow-lg">
                "{currentShot.dialogueSnippet}"
              </span>
            </div>
          )}

          {/* Table Read Active Highlight Card */}
          {tableReadActive && activeTableReadItem && (
            <div className="absolute bottom-6 inset-x-8 p-3.5 bg-[#1F1D1B]/90 backdrop-blur-md rounded-xl border border-[#0D9488]/40 shadow-2xl flex items-center gap-3 z-20">
              {activeTableReadItem.speakerName ? (
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm"
                  style={{ backgroundColor: activeTableReadItem.speakerColor || '#5B4FB9' }}
                >
                  {activeTableReadItem.speakerName[0]}
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-[#0D9488] flex items-center justify-center text-white font-bold text-xs shrink-0">
                  ACT
                </div>
              )}

              <div className="flex-1 min-w-0 text-left">
                {activeTableReadItem.speakerName && (
                  <div className="text-[11px] font-bold text-[#0D9488] uppercase tracking-wider">
                    {activeTableReadItem.speakerName}{' '}
                    {activeTableReadItem.parenthetical && (
                      <span className="text-zinc-400 italic font-normal">
                        ({activeTableReadItem.parenthetical})
                      </span>
                    )}
                  </div>
                )}
                <div className="text-sm font-medium text-white line-clamp-2 leading-snug">
                  {activeTableReadItem.text}
                </div>
              </div>
            </div>
          )}

          {/* Top Left Media Take Watermark */}
          {activeTake && (
            <div className="absolute top-3 left-3 px-2 py-1 bg-black/70 backdrop-blur-xs rounded text-[10px] font-mono text-zinc-300 border border-white/10 flex items-center gap-1.5 z-20">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  activeTake.mediaType === 'video' ? 'bg-[#2DD4BF]' : 'bg-amber-400'
                }`}
              />
              <span>{activeTake.label}</span>
              {activeTake.mediaType === 'video' && (
                <span className="text-[#2DD4BF] font-semibold uppercase">
                  · IN: {formatPrecisionTime(inPoint)} OUT: {formatPrecisionTime(outPoint)} ({trimmedDuration.toFixed(1)}s)
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Program Cut Scrub Bar (Strictly matching assembled cut duration) */}
      <div className="px-4 py-1.5 bg-[#171717] border-t border-[#262626] shrink-0">
        <div
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            const newTime = pos * totalCutDuration;
            handleCutScrubSeek(newTime);
          }}
          className="relative h-2 bg-[#2E2E2E] hover:h-3 rounded cursor-pointer transition-all overflow-hidden"
          title="Scrub Cut Timeline (Assembled In/Out sequence)"
        >
          {/* Progress fill */}
          <div
            className="absolute left-0 top-0 bottom-0 bg-[#0D9488]"
            style={{
              width: `${
                totalCutDuration ? (effectiveCurrentTimeSec / totalCutDuration) * 100 : 0
              }%`,
            }}
          />
        </div>
      </div>

      {/* Bottom Transport Controls & Take Switcher */}
      <div className="h-14 bg-[#1A1A1A] px-4 flex items-center justify-between border-t border-[#2A2A2A] shrink-0">
        {/* Left: Take Switcher for Selected Shot */}
        <div className="flex items-center gap-2">
          {currentShot ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400 font-mono">Take:</span>
              <select
                value={currentShot.selectedTakeId || currentShot.takes[0]?.id || ''}
                onChange={(e) => {
                  const takeId = e.target.value;
                  currentShot!.selectedTakeId = takeId;
                  setIsPlayingShot(false);
                  setIsPlayingInOutRange(false);
                  setLocalCurrentTimeSec(currentShotStartTime);
                  propOnSeekCutTime?.(currentShotStartTime);
                  notifyTimeUpdate(currentShotStartTime, true);
                  const selectedT = currentShot!.takes.find((t) => t.id === takeId);
                  const newIn = selectedT?.inPoint ?? 0;
                  setInPoint(newIn);
                  setOutPoint(selectedT?.outPoint ?? rawMediaDuration);
                  if (videoElementRef.current) {
                    videoElementRef.current.currentTime = newIn;
                  }
                }}
                className="bg-[#2B2B2B] text-white border border-[#404040] rounded px-2 py-1 text-xs font-medium focus:outline-none focus:border-[#0D9488]"
              >
                {currentShot.takes.map((take) => (
                  <option key={take.id} value={take.id}>
                    {take.label} {take.id === currentShot?.selectedTakeId ? '(In Cut)' : ''}
                    {take.mediaType === 'video' ? ' [VID]' : ''}
                  </option>
                ))}
              </select>

              <button
                onClick={() => onOpenTakeManager(currentShot!.id)}
                className="p-1.5 hover:bg-[#2B2B2B] text-zinc-300 hover:text-white rounded transition-colors text-xs flex items-center gap-1 border border-zinc-700"
                title="Manage and compare takes for this shot"
              >
                <Layers className="w-3.5 h-3.5 text-[#0D9488]" />
                <span>Takes ({currentShot.takes.length})</span>
              </button>
            </div>
          ) : (
            <span className="text-xs text-zinc-500">No shot selected</span>
          )}
        </div>

        {/* Center: Playback Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Back to Start of Timeline */}
          <button
            onClick={handleGoToStart}
            className="p-2 text-zinc-400 hover:text-white hover:bg-[#262626] rounded-full transition-colors"
            title="Back to Start of Timeline (Home / |◀)"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>

          {/* Previous Shot */}
          <button
            onClick={handlePrevShot}
            className="p-2 text-zinc-400 hover:text-white hover:bg-[#262626] rounded-full transition-colors"
            title="Previous Shot (Jump to cut / ◀)"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          {/* Single Shot Preview Play Button (Bound to In/Out) */}
          {activeTake?.mediaType === 'video' && (
            <button
              onClick={handleToggleShotPlay}
              className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all ${
                isPlayingShot
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'bg-[#262626] hover:bg-[#333333] text-zinc-200 border border-zinc-700'
              }`}
              title={isPlayingShot ? 'Pause Shot Preview' : 'Play Shot Video (From In to Out)'}
            >
              {isPlayingShot ? (
                <Pause className="w-3.5 h-3.5 fill-current" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current" />
              )}
              <span>{isPlayingShot ? 'Pause Shot' : 'Play Shot'}</span>
            </button>
          )}

          {/* Master Program Cut Play/Pause Button (Strictly plays trimmed sequence) */}
          <button
            onClick={handleToggleCutPlay}
            className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 ${
              effectiveIsPlayingCut
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white ring-2 ring-emerald-400/50'
                : 'bg-[#0D9488] hover:bg-[#0F766E] text-white'
            }`}
            title={effectiveIsPlayingCut ? 'Pause Cut (Space)' : 'Play Trimmed Program Cut (Space)'}
          >
            {effectiveIsPlayingCut ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 ml-0.5 fill-current" />
            )}
          </button>

          {/* Next Shot */}
          <button
            onClick={handleNextShot}
            className="p-2 text-zinc-400 hover:text-white hover:bg-[#262626] rounded-full transition-colors"
            title="Next Shot (Jump to cut / ▶)"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          {/* Go to End of Timeline */}
          <button
            onClick={handleGoToEnd}
            className="p-2 text-zinc-400 hover:text-white hover:bg-[#262626] rounded-full transition-colors"
            title="Go to End of Timeline (End / ▶|)"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>

          {/* Loop toggle */}
          <button
            onClick={() => setIsLooping(!isLooping)}
            className={`p-1.5 rounded transition-colors ${
              isLooping ? 'text-[#0D9488] bg-[#0D9488]/20' : 'text-zinc-500 hover:text-zinc-300'
            }`}
            title="Toggle Loop Cut"
          >
            <Repeat className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Audio & Fullscreen */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-2 text-zinc-400 hover:text-white hover:bg-[#262626] rounded transition-colors"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            onClick={handleToggleFullscreen}
            className="p-2 text-zinc-400 hover:text-white hover:bg-[#262626] rounded transition-colors"
            title="Toggle Fullscreen"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
