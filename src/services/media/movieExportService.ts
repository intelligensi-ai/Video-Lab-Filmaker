/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FilmProject, Shot, Take, getEffectiveShotDuration, getEffectiveShotInPoint, getEffectiveShotOutPoint } from '../../types/film';

export type AspectRatioType = '16:9' | '9:16' | '1:1' | '2.39:1';

export interface MovieExportOptions {
  width: number;
  height: number;
  aspectRatio: AspectRatioType;
  fps: number;
  audioOption: 'full_mix' | 'sfx_only' | 'video_only' | 'mute';
  masterVolume: number;
  normalizeAudio: boolean;
  sampleRate: number;
  burnInDialogue: boolean;
  burnInTimecode: boolean;
  range: 'all' | 'in_out';
  inPointSec?: number | null;
  outPointSec?: number | null;
  cropMode: 'cover' | 'contain' | 'letterbox';
}

export interface RenderProgress {
  phase: 'preparing' | 'rendering' | 'encoding' | 'done' | 'error';
  progressPct: number;
  currentShotIndex: number;
  totalShots: number;
  currentShotName: string;
  elapsedSec: number;
  estimatedRemainingSec: number;
  errorMessage?: string;
  resultBlob?: Blob;
  resultUrl?: string;
  fileSizeMb?: number;
}

export interface ExportPreset {
  id: string;
  name: string;
  category: 'social' | 'cinema' | 'still';
  aspectRatio: AspectRatioType;
  width: number;
  height: number;
  fps: number;
  badge: string;
  description: string;
  iconType: 'youtube' | 'instagram' | 'tiktok' | 'cinema' | 'screenshot';
}

export const EXPORT_PRESETS: ExportPreset[] = [
  {
    id: 'youtube_1080p',
    name: 'YouTube',
    category: 'social',
    aspectRatio: '16:9',
    width: 1920,
    height: 1080,
    fps: 24,
    badge: 'Landscape 16:9',
    description: 'High-bitrate Full HD standard for YouTube videos and streaming',
    iconType: 'youtube',
  },
  {
    id: 'instagram_square',
    name: 'Instagram',
    category: 'social',
    aspectRatio: '1:1',
    width: 1080,
    height: 1080,
    fps: 30,
    badge: 'Square 1:1',
    description: 'Optimized for Instagram feed posts and carousels',
    iconType: 'instagram',
  },
  {
    id: 'tiktok_vertical',
    name: 'TikTok',
    category: 'social',
    aspectRatio: '9:16',
    width: 1080,
    height: 1920,
    fps: 30,
    badge: 'Portrait 9:16',
    description: 'Full-screen vertical video for TikTok, IG Reels, and Shorts',
    iconType: 'tiktok',
  },
  {
    id: 'cinema_scope',
    name: 'Cinema Scope',
    category: 'cinema',
    aspectRatio: '2.39:1',
    width: 1920,
    height: 804,
    fps: 24,
    badge: 'Scope 2.39:1',
    description: 'Ultra-widescreen theatrical anamorphic aspect ratio',
    iconType: 'cinema',
  },
  {
    id: 'screenshot_still',
    name: 'Screenshot',
    category: 'still',
    aspectRatio: '16:9',
    width: 1920,
    height: 1080,
    fps: 0,
    badge: 'Still Frame',
    description: 'Pristine high-resolution PNG/JPG capture of current playhead or shot',
    iconType: 'screenshot',
  },
];

/**
 * Capture a single still frame as a PNG/JPEG Blob at exact target resolution
 */
export async function captureScreenshot(
  project: FilmProject,
  currentTimeSec: number,
  options: {
    width?: number;
    height?: number;
    format?: 'png' | 'jpeg';
    quality?: number;
    burnInDialogue?: boolean;
    burnInTimecode?: boolean;
  } = {}
): Promise<{ blob: Blob; dataUrl: string; width: number; height: number }> {
  const allShots = project.scenes.flatMap((sc) =>
    sc.shots.map((sh) => ({
      shot: sh,
      sceneNumber: sc.sceneNumber,
      duration: getEffectiveShotDuration(sh),
    }))
  );

  let accumulated = 0;
  let targetShotItem = allShots[0];
  let offsetWithinShot = 0;

  for (const item of allShots) {
    if (currentTimeSec >= accumulated && currentTimeSec < accumulated + item.duration) {
      targetShotItem = item;
      offsetWithinShot = currentTimeSec - accumulated;
      break;
    }
    accumulated += item.duration;
  }

  if (!targetShotItem && allShots.length > 0) {
    targetShotItem = allShots[allShots.length - 1];
    offsetWithinShot = targetShotItem.duration;
  }

  const shot = targetShotItem?.shot;
  const activeTake = shot
    ? shot.takes.find((t) => t.id === shot.selectedTakeId) || shot.takes[0]
    : undefined;

  const w = options.width || 1920;
  const h = options.height || 1080;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create canvas context');

  // Fill black background
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, w, h);

  if (activeTake?.mediaUrl) {
    if (activeTake.mediaType === 'video') {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.muted = true;
      video.preload = 'auto';
      video.src = activeTake.mediaUrl;

      await new Promise<void>((resolve) => {
        video.onloadedmetadata = () => {
          const inPt = shot ? getEffectiveShotInPoint(shot) : 0;
          const seekTime = Math.min(video.duration || 3.5, inPt + offsetWithinShot);
          video.currentTime = seekTime;
        };
        video.onseeked = () => resolve();
        video.onerror = () => resolve();
        setTimeout(resolve, 3500);
      });

      drawMediaWithFit(ctx, video, w, h, 'cover');
      video.remove();
    } else {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = activeTake.mediaUrl;
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
        setTimeout(resolve, 3500);
      });
      drawMediaWithFit(ctx, img, w, h, 'cover');
    }
  } else {
    // Fallback card frame
    ctx.fillStyle = '#112F2E';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#2DD4BF';
    ctx.font = 'bold 36px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${project.title.toUpperCase()}`, w / 2, h / 2 - 20);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '24px sans-serif';
    ctx.fillText(
      `Scene ${targetShotItem?.sceneNumber || 1} · Shot ${shot?.shotNumber || 1} (${shot?.shotType || 'WIDE'})`,
      w / 2,
      h / 2 + 25
    );
  }

  // Burn in dialogue if enabled
  if (options.burnInDialogue && shot?.dialogueSnippet) {
    drawSubtitles(ctx, shot.dialogueSnippet, w, h);
  }

  // Burn in timecode if enabled
  if (options.burnInTimecode) {
    drawTimecodeOverlay(ctx, currentTimeSec, w, h);
  }

  const format = options.format || 'png';
  const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
  const quality = options.quality ?? 0.95;

  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        const dataUrl = canvas.toDataURL(mimeType, quality);
        resolve({
          blob: blob || new Blob([], { type: mimeType }),
          dataUrl,
          width: w,
          height: h,
        });
      },
      mimeType,
      quality
    );
  });
}

/**
 * Render and export the complete movie cut as an MP4/WebM video file
 */
export async function renderMovieCut(
  project: FilmProject,
  options: MovieExportOptions,
  onProgress?: (progress: RenderProgress) => void,
  abortSignal?: AbortSignal
): Promise<{ blob: Blob; url: string; sizeMb: number; durationSec: number }> {
  const startTimeMs = performance.now();

  // 1. Determine all shots and timing
  const allShotsWithTimes: {
    shot: Shot;
    sceneNumber: number;
    startTime: number;
    endTime: number;
    duration: number;
    inPoint: number;
    outPoint: number;
    activeTake?: Take;
  }[] = [];

  let accTime = 0;
  project.scenes.forEach((sc) => {
    sc.shots.forEach((sh) => {
      const dur = getEffectiveShotDuration(sh);
      const inPt = getEffectiveShotInPoint(sh);
      const outPt = getEffectiveShotOutPoint(sh);
      const take = sh.takes.find((t) => t.id === sh.selectedTakeId) || sh.takes[0];

      allShotsWithTimes.push({
        shot: sh,
        sceneNumber: sc.sceneNumber,
        startTime: accTime,
        endTime: accTime + dur,
        duration: dur,
        inPoint: inPt,
        outPoint: outPt,
        activeTake: take,
      });
      accTime += dur;
    });
  });

  const totalCutDuration = accTime;
  let targetShots = allShotsWithTimes;
  let renderStartTime = 0;
  let renderEndTime = totalCutDuration;

  if (
    options.range === 'in_out' &&
    typeof options.inPointSec === 'number' &&
    typeof options.outPointSec === 'number' &&
    options.outPointSec > options.inPointSec
  ) {
    renderStartTime = Math.max(0, options.inPointSec);
    renderEndTime = Math.min(totalCutDuration, options.outPointSec);
    targetShots = allShotsWithTimes.filter(
      (s) => s.endTime > renderStartTime && s.startTime < renderEndTime
    );
  }

  const exportDurationSec = Math.max(0.5, renderEndTime - renderStartTime);

  // 2. Setup rendering canvas
  const canvas = document.createElement('canvas');
  canvas.width = options.width;
  canvas.height = options.height;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  // Fill black
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, options.width, options.height);

  // 3. Setup Audio Destination via Web Audio API
  let audioContext: AudioContext | null = null;
  let audioDestination: MediaStreamAudioDestinationNode | null = null;

  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass && options.audioOption !== 'mute') {
      audioContext = new AudioContextClass({ sampleRate: options.sampleRate || 48000 });
      audioDestination = audioContext.createMediaStreamDestination();
    }
  } catch (err) {
    console.warn('AudioContext creation fallback:', err);
  }

  // 4. Setup MediaRecorder with supported codec
  const videoStream = canvas.captureStream(options.fps || 24);
  const streamTracks: MediaStreamTrack[] = [...videoStream.getVideoTracks()];

  if (audioDestination && options.audioOption !== 'mute') {
    const audioTracks = audioDestination.stream.getAudioTracks();
    if (audioTracks.length > 0) {
      streamTracks.push(audioTracks[0]);
    }
  }

  const combinedStream = new MediaStream(streamTracks);

  let selectedMimeType = 'video/webm;codecs=vp9,opus';
  if (!MediaRecorder.isTypeSupported(selectedMimeType)) {
    selectedMimeType = 'video/webm;codecs=vp8,opus';
  }
  if (!MediaRecorder.isTypeSupported(selectedMimeType)) {
    selectedMimeType = 'video/webm';
  }
  if (!MediaRecorder.isTypeSupported(selectedMimeType)) {
    selectedMimeType = 'video/mp4';
  }

  const chunks: Blob[] = [];
  const recorder = new MediaRecorder(combinedStream, {
    mimeType: selectedMimeType,
    videoBitsPerSecond: options.width >= 3840 ? 18000000 : 8000000,
  });

  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      chunks.push(e.data);
    }
  };

  recorder.start(100);

  // 5. Preload Audio Stems for SFX if enabled
  const sfxAudioMap = new Map<string, HTMLAudioElement>();
  if (options.audioOption === 'full_mix' || options.audioOption === 'sfx_only') {
    for (const item of targetShots) {
      const sfxClips = item.shot.sfxClips || [];
      for (const clip of sfxClips) {
        if (!clip.isMuted && clip.audioUrl && !sfxAudioMap.has(clip.id)) {
          const a = new Audio(clip.audioUrl);
          a.crossOrigin = 'anonymous';
          a.volume = Math.max(0, Math.min(1, (clip.volume ?? 1.0) * (options.masterVolume ?? 1.0)));
          sfxAudioMap.set(clip.id, a);

          // Connect to Web Audio stream destination
          if (audioContext && audioDestination) {
            try {
              const src = audioContext.createMediaElementSource(a);
              src.connect(audioDestination);
            } catch {
              // Ignore if already connected
            }
          }
        }
      }
    }
  }

  // 6. Sequential Render Loop through target shots
  let currentRenderTimeSec = renderStartTime;

  for (let shotIdx = 0; shotIdx < targetShots.length; shotIdx++) {
    if (abortSignal?.aborted) {
      recorder.stop();
      throw new Error('Export cancelled by user');
    }

    const currentShotItem = targetShots[shotIdx];
    const shot = currentShotItem.shot;
    const activeTake = currentShotItem.activeTake;
    const shotDuration = currentShotItem.duration;

    // Report progress
    const elapsedRealSec = (performance.now() - startTimeMs) / 1000;
    const renderedCutProgress = Math.max(
      0,
      Math.min(0.98, (currentRenderTimeSec - renderStartTime) / exportDurationSec)
    );
    const estTotalRealSec = renderedCutProgress > 0.05 ? elapsedRealSec / renderedCutProgress : 20;
    const estRemainingSec = Math.max(0, estTotalRealSec - elapsedRealSec);

    onProgress?.({
      phase: 'rendering',
      progressPct: Math.round(renderedCutProgress * 100),
      currentShotIndex: shotIdx + 1,
      totalShots: targetShots.length,
      currentShotName: `Scene ${currentShotItem.sceneNumber}.${shot.shotNumber} (${shot.shotType})`,
      elapsedSec: Math.round(elapsedRealSec),
      estimatedRemainingSec: Math.round(estRemainingSec),
    });

    // Handle video take vs still image take
    if (activeTake?.mediaUrl && activeTake.mediaType === 'video') {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.src = activeTake.mediaUrl;
      video.playsInline = true;
      video.muted = options.audioOption === 'sfx_only' || options.audioOption === 'mute';

      if (audioContext && audioDestination && (options.audioOption === 'full_mix' || options.audioOption === 'video_only')) {
        try {
          const src = audioContext.createMediaElementSource(video);
          src.connect(audioDestination);
        } catch {
          // Ignore
        }
      }

      await new Promise<void>((res) => {
        video.onloadedmetadata = () => res();
        video.onerror = () => res();
        setTimeout(res, 4000);
      });

      const inPt = currentShotItem.inPoint;
      const outPt = currentShotItem.outPoint;
      video.currentTime = inPt;

      await new Promise<void>((res) => {
        video.onseeked = () => res();
        setTimeout(res, 2000);
      });

      await video.play().catch(() => {});

      // Play SFX cues for this shot
      triggerSfxForShot(currentShotItem.shot, sfxAudioMap);

      // Render frames until outPoint or shot duration elapsed
      const startPlayTime = performance.now();
      const expectedShotMs = shotDuration * 1000;

      while (performance.now() - startPlayTime < expectedShotMs && !video.ended) {
        if (abortSignal?.aborted) {
          video.pause();
          recorder.stop();
          throw new Error('Export cancelled');
        }

        if (video.currentTime >= outPt - 0.03) {
          break;
        }

        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, options.width, options.height);
        drawMediaWithFit(ctx, video, options.width, options.height, options.cropMode || 'cover');

        if (options.burnInDialogue && shot.dialogueSnippet) {
          drawSubtitles(ctx, shot.dialogueSnippet, options.width, options.height);
        }
        if (options.burnInTimecode) {
          drawTimecodeOverlay(ctx, currentRenderTimeSec, options.width, options.height);
        }

        await new Promise((r) => setTimeout(r, 1000 / (options.fps || 24)));
      }

      video.pause();
      video.remove();
    } else {
      // Still image or blank graphic
      let img: HTMLImageElement | null = null;
      if (activeTake?.mediaUrl) {
        img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = activeTake.mediaUrl;
        await new Promise<void>((res) => {
          img!.onload = () => res();
          img!.onerror = () => res();
          setTimeout(res, 3500);
        });
      }

      triggerSfxForShot(currentShotItem.shot, sfxAudioMap);

      const totalFrames = Math.max(1, Math.round(shotDuration * (options.fps || 24)));
      for (let f = 0; f < totalFrames; f++) {
        if (abortSignal?.aborted) {
          recorder.stop();
          throw new Error('Export cancelled');
        }

        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, options.width, options.height);

        if (img) {
          // Subtle slow cinematic zoom (1.00 -> 1.04)
          const scale = 1.0 + (f / totalFrames) * 0.035;
          drawMediaWithFit(ctx, img, options.width, options.height, options.cropMode || 'cover', scale);
        } else {
          ctx.fillStyle = '#112F2E';
          ctx.fillRect(0, 0, options.width, options.height);
          ctx.fillStyle = '#2DD4BF';
          ctx.font = 'bold 36px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`SCENE ${currentShotItem.sceneNumber} · SHOT ${shot.shotNumber}`, options.width / 2, options.height / 2 - 20);
          ctx.fillStyle = '#FFFFFF';
          ctx.font = '22px sans-serif';
          ctx.fillText(shot.action || shot.shotType, options.width / 2, options.height / 2 + 25);
        }

        if (options.burnInDialogue && shot.dialogueSnippet) {
          drawSubtitles(ctx, shot.dialogueSnippet, options.width, options.height);
        }
        if (options.burnInTimecode) {
          drawTimecodeOverlay(ctx, currentRenderTimeSec + (f / (options.fps || 24)), options.width, options.height);
        }

        await new Promise((r) => setTimeout(r, 1000 / (options.fps || 24)));
      }
    }

    currentRenderTimeSec += shotDuration;
  }

  // 7. Finish encoding and collect Blob
  onProgress?.({
    phase: 'encoding',
    progressPct: 99,
    currentShotIndex: targetShots.length,
    totalShots: targetShots.length,
    currentShotName: 'Finalizing movie container & audio multiplexing...',
    elapsedSec: Math.round((performance.now() - startTimeMs) / 1000),
    estimatedRemainingSec: 1,
  });

  return new Promise((resolve, reject) => {
    recorder.onstop = () => {
      const finalBlob = new Blob(chunks, { type: selectedMimeType });
      const finalUrl = URL.createObjectURL(finalBlob);
      const sizeMb = +(finalBlob.size / (1024 * 1024)).toFixed(2);

      onProgress?.({
        phase: 'done',
        progressPct: 100,
        currentShotIndex: targetShots.length,
        totalShots: targetShots.length,
        currentShotName: 'Export Complete',
        elapsedSec: Math.round((performance.now() - startTimeMs) / 1000),
        estimatedRemainingSec: 0,
        resultBlob: finalBlob,
        resultUrl: finalUrl,
        fileSizeMb: sizeMb,
      });

      if (audioContext) {
        audioContext.close().catch(() => {});
      }

      resolve({
        blob: finalBlob,
        url: finalUrl,
        sizeMb,
        durationSec: exportDurationSec,
      });
    };

    recorder.onerror = (e) => {
      reject(new Error(`MediaRecorder error: ${e}`));
    };

    recorder.stop();
  });
}

function triggerSfxForShot(shot: Shot, audioMap: Map<string, HTMLAudioElement>) {
  const clips = shot.sfxClips || [];
  for (const clip of clips) {
    if (clip.isMuted) continue;
    const a = audioMap.get(clip.id);
    if (a) {
      const offset = (clip.offsetSec || 0) * 1000;
      setTimeout(() => {
        a.currentTime = 0;
        a.play().catch(() => {});
      }, offset);
    }
  }
}

function drawMediaWithFit(
  ctx: CanvasRenderingContext2D,
  media: HTMLVideoElement | HTMLImageElement,
  targetWidth: number,
  targetHeight: number,
  mode: 'cover' | 'contain' | 'letterbox' = 'cover',
  extraScale = 1.0
) {
  const mediaW = 'videoWidth' in media ? media.videoWidth || 1920 : media.naturalWidth || 1920;
  const mediaH = 'videoHeight' in media ? media.videoHeight || 1080 : media.naturalHeight || 1080;

  const targetAspect = targetWidth / targetHeight;
  const mediaAspect = mediaW / mediaH;

  let drawW = targetWidth;
  let drawH = targetHeight;
  let drawX = 0;
  let drawY = 0;

  if (mode === 'contain' || mode === 'letterbox') {
    if (mediaAspect > targetAspect) {
      drawW = targetWidth;
      drawH = targetWidth / mediaAspect;
      drawY = (targetHeight - drawH) / 2;
    } else {
      drawH = targetHeight;
      drawW = targetHeight * mediaAspect;
      drawX = (targetWidth - drawW) / 2;
    }
  } else {
    // cover
    if (mediaAspect > targetAspect) {
      drawH = targetHeight;
      drawW = targetHeight * mediaAspect;
      drawX = (targetWidth - drawW) / 2;
    } else {
      drawW = targetWidth;
      drawH = targetWidth / mediaAspect;
      drawY = (targetHeight - drawH) / 2;
    }
  }

  if (extraScale !== 1.0) {
    const sw = drawW * extraScale;
    const sh = drawH * extraScale;
    drawX -= (sw - drawW) / 2;
    drawY -= (sh - drawH) / 2;
    drawW = sw;
    drawH = sh;
  }

  ctx.drawImage(media, drawX, drawY, drawW, drawH);
}

function drawSubtitles(
  ctx: CanvasRenderingContext2D,
  text: string,
  targetWidth: number,
  targetHeight: number
) {
  const fontSize = Math.max(18, Math.round(targetHeight * 0.035));
  ctx.font = `600 ${fontSize}px "Inter", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const marginX = targetWidth * 0.08;
  const maxW = targetWidth - marginX * 2;
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(testLine).width > maxW) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);

  const lineHeight = fontSize * 1.35;
  const totalBoxH = lines.length * lineHeight + 18;
  const boxY = targetHeight - totalBoxH - targetHeight * 0.06;

  // Semi-transparent pill backing
  ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
  const boxW = Math.min(
    targetWidth * 0.9,
    Math.max(...lines.map((l) => ctx.measureText(l).width)) + 36
  );
  const boxX = (targetWidth - boxW) / 2;

  ctx.beginPath();
  const radius = 10;
  ctx.roundRect(boxX, boxY, boxW, totalBoxH, radius);
  ctx.fill();

  // White text with subtle drop shadow
  ctx.fillStyle = '#FFFFFF';
  lines.forEach((line, idx) => {
    const lineY = boxY + 12 + idx * lineHeight + fontSize / 2;
    ctx.fillText(line, targetWidth / 2, lineY);
  });
}

function drawTimecodeOverlay(
  ctx: CanvasRenderingContext2D,
  timeSec: number,
  targetWidth: number,
  targetHeight: number
) {
  const mins = Math.floor(timeSec / 60);
  const secs = Math.floor(timeSec % 60);
  const frames = Math.floor((timeSec % 1) * 24);
  const tc = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}:${String(frames).padStart(2, '0')}`;

  const fontSize = Math.max(14, Math.round(targetHeight * 0.025));
  ctx.font = `bold ${fontSize}px monospace`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';

  const pad = 16;
  const textW = ctx.measureText(tc).width + 16;
  const textH = fontSize + 12;

  ctx.fillStyle = 'rgba(15, 35, 34, 0.85)';
  ctx.fillRect(targetWidth - textW - pad, pad, textW, textH);

  ctx.fillStyle = '#2DD4BF';
  ctx.fillText(tc, targetWidth - pad - 8, pad + 6);
}
