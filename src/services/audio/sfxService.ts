/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SfxCategory, SfxClip } from '../../types/film';
import { projectStorage } from '../storage/projectStorage';

export interface SfxPresetDefinition {
  id: string;
  name: string;
  category: SfxCategory;
  duration: number;
  description: string;
  color: string;
  icon: string;
  synthesize: (actx: BaseAudioContext) => AudioBuffer;
}

// Convert AudioBuffer to uncompressed 16-bit PCM WAV Blob
export function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const out = new DataView(new ArrayBuffer(length));
  const sampleRate = buffer.sampleRate;
  let offset = 0;
  let pos = 0;

  function setUint16(data: number) {
    out.setUint16(pos, data, true);
    pos += 2;
  }
  function setUint32(data: number) {
    out.setUint32(pos, data, true);
    pos += 4;
  }

  // RIFF header
  out.setUint32(0, 0x46464952, false); // "RIFF"
  out.setUint32(4, length - 8, true); // file length - 8
  out.setUint32(8, 0x45564157, false); // "WAVE"
  out.setUint32(12, 0x20746d66, false); // "fmt " chunk
  setUint32(16); // length = 16
  setUint16(1); // PCM
  setUint16(numOfChan);
  setUint32(sampleRate);
  setUint32(sampleRate * 2 * numOfChan); // avg bytes/sec
  setUint16(numOfChan * 2); // block-align
  setUint16(16); // 16-bit
  out.setUint32(pos, 0x61746164, false); // "data" chunk
  pos += 4;
  setUint32(length - pos - 4); // chunk length

  const channels: Float32Array[] = [];
  for (let i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  while (offset < buffer.length) {
    for (let i = 0; i < numOfChan; i++) {
      const sample = Math.max(-1, Math.min(1, channels[i][offset]));
      const intSample = sample < 0 ? sample * 32768 : sample * 32767;
      out.setInt16(pos, intSample | 0, true);
      pos += 2;
    }
    offset++;
  }

  return new Blob([out], { type: 'audio/wav' });
}

// Preset sound effects generated using Web Audio procedural synthesis
export const CINEMATIC_SFX_PRESETS: SfxPresetDefinition[] = [
  {
    id: 'sfx_sub_boom',
    name: '💥 Sub-Bass Impact Boom',
    category: 'impact',
    duration: 2.2,
    description: 'Deep 80Hz-35Hz sub-bass trailer boom with rumbling decaying tail',
    color: '#E11D48',
    icon: '💥',
    synthesize: (actx: BaseAudioContext) => {
      const sampleRate = actx.sampleRate;
      const duration = 2.2;
      const buffer = actx.createBuffer(2, sampleRate * duration, sampleRate);
      const left = buffer.getChannelData(0);
      const right = buffer.getChannelData(1);

      for (let i = 0; i < buffer.length; i++) {
        const t = i / sampleRate;
        const freq = 85 * Math.exp(-t * 3.5) + 32;
        const env = Math.exp(-t * 1.8);
        const sub = Math.sin(2 * Math.PI * freq * t) * env;
        const click = t < 0.015 ? (Math.random() * 2 - 1) * (1 - t / 0.015) * 0.6 : 0;
        const rumble = t > 0.05 ? (Math.random() * 2 - 1) * Math.exp(-t * 2.2) * 0.12 : 0;
        const sample = Math.tanh((sub + click + rumble) * 1.4) * 0.9;
        left[i] = sample;
        right[i] = sample * (0.95 + 0.05 * Math.sin(t * 8));
      }
      return buffer;
    },
  },
  {
    id: 'sfx_door_slam',
    name: '🚪 Heavy Metal Door Slam',
    category: 'mechanical',
    duration: 1.2,
    description: 'Resonant vault door latch snap and echoing acoustic body impact',
    color: '#D97706',
    icon: '🚪',
    synthesize: (actx: BaseAudioContext) => {
      const sampleRate = actx.sampleRate;
      const duration = 1.2;
      const buffer = actx.createBuffer(2, sampleRate * duration, sampleRate);
      const left = buffer.getChannelData(0);
      const right = buffer.getChannelData(1);

      for (let i = 0; i < buffer.length; i++) {
        const t = i / sampleRate;
        const latchClick = t < 0.03 ? (Math.random() * 2 - 1) * Math.exp(-t * 120) * 0.8 : 0;
        const thudFreq = 120 * Math.exp(-t * 8) + 45;
        const thudEnv = Math.exp(-t * 3.8);
        const body = Math.sin(2 * Math.PI * thudFreq * t) * thudEnv * 0.85;
        const metalRing = Math.sin(2 * Math.PI * 340 * t) * Math.exp(-t * 4.5) * 0.2;
        const sample = (latchClick + body + metalRing) * 0.9;
        left[i] = sample;
        right[i] = sample;
      }
      return buffer;
    },
  },
  {
    id: 'sfx_footsteps',
    name: '👣 Footsteps on Wet Concrete',
    category: 'foley',
    duration: 1.6,
    description: 'Two rhythmic detective footsteps with grit and subtle reverb',
    color: '#0D9488',
    icon: '👣',
    synthesize: (actx: BaseAudioContext) => {
      const sampleRate = actx.sampleRate;
      const duration = 1.6;
      const buffer = actx.createBuffer(2, sampleRate * duration, sampleRate);
      const left = buffer.getChannelData(0);
      const right = buffer.getChannelData(1);

      function stepAt(tOffset: number, t: number, pan: number) {
        if (t < tOffset || t > tOffset + 0.35) return 0;
        const st = t - tOffset;
        const heel = Math.sin(2 * Math.PI * 90 * st) * Math.exp(-st * 28) * 0.6;
        const grit = (Math.random() * 2 - 1) * Math.exp(-st * 35) * 0.35;
        return (heel + grit) * pan;
      }

      for (let i = 0; i < buffer.length; i++) {
        const t = i / sampleRate;
        const step1 = stepAt(0.1, t, 0.85);
        const step2 = stepAt(0.75, t, 0.7);
        const sample = (step1 + step2) * 0.85;
        left[i] = sample * 1.1;
        right[i] = sample * 0.9;
      }
      return buffer;
    },
  },
  {
    id: 'sfx_tension_riser',
    name: '⚡ Tension Whoosh Riser',
    category: 'suspense',
    duration: 3.0,
    description: 'Rising pitch sweep with filtered air rush building suspense',
    color: '#7C3AED',
    icon: '⚡',
    synthesize: (actx: BaseAudioContext) => {
      const sampleRate = actx.sampleRate;
      const duration = 3.0;
      const buffer = actx.createBuffer(2, sampleRate * duration, sampleRate);
      const left = buffer.getChannelData(0);
      const right = buffer.getChannelData(1);

      for (let i = 0; i < buffer.length; i++) {
        const t = i / sampleRate;
        const progress = t / duration;
        const freq = 120 + Math.pow(progress, 3) * 1600;
        const amp = Math.pow(progress, 2.2);
        const tone = Math.sin(2 * Math.PI * freq * t) * amp * 0.45;
        const noise = (Math.random() * 2 - 1) * amp * 0.35;
        const sample = (tone + noise) * 0.8;
        left[i] = sample;
        right[i] = sample * (0.8 + 0.4 * progress);
      }
      return buffer;
    },
  },
  {
    id: 'sfx_camera_shutter',
    name: '📸 35mm Camera Shutter Click',
    category: 'mechanical',
    duration: 0.9,
    description: 'Crisp mechanical SLR reflex mirror flip and film motor advance',
    color: '#059669',
    icon: '📸',
    synthesize: (actx: BaseAudioContext) => {
      const sampleRate = actx.sampleRate;
      const duration = 0.9;
      const buffer = actx.createBuffer(2, sampleRate * duration, sampleRate);
      const left = buffer.getChannelData(0);
      const right = buffer.getChannelData(1);

      for (let i = 0; i < buffer.length; i++) {
        const t = i / sampleRate;
        const snap1 = t < 0.04 ? (Math.random() * 2 - 1) * Math.exp(-t * 90) * 0.9 : 0;
        const snap2 = t > 0.08 && t < 0.14 ? (Math.random() * 2 - 1) * Math.exp(-(t - 0.08) * 80) * 0.75 : 0;
        const motor = t > 0.16 && t < 0.5 ? Math.sin(2 * Math.PI * 480 * t) * (Math.random() * 0.3) * Math.exp(-(t - 0.16) * 6) * 0.3 : 0;
        const sample = (snap1 + snap2 + motor) * 0.85;
        left[i] = sample;
        right[i] = sample;
      }
      return buffer;
    },
  },
  {
    id: 'sfx_heartbeat',
    name: '💓 Suspense Heartbeat Pulse',
    category: 'suspense',
    duration: 2.0,
    description: 'Deep muffled cardiovascular lub-dub thuds in slow suspense tempo',
    color: '#EC4899',
    icon: '💓',
    synthesize: (actx: BaseAudioContext) => {
      const sampleRate = actx.sampleRate;
      const duration = 2.0;
      const buffer = actx.createBuffer(2, sampleRate * duration, sampleRate);
      const left = buffer.getChannelData(0);
      const right = buffer.getChannelData(1);

      function thud(tOffset: number, t: number, freq: number) {
        if (t < tOffset || t > tOffset + 0.35) return 0;
        const st = t - tOffset;
        return Math.sin(2 * Math.PI * freq * st) * Math.exp(-st * 16) * 0.8;
      }

      for (let i = 0; i < buffer.length; i++) {
        const t = i / sampleRate;
        const lub = thud(0.1, t, 56);
        const dub = thud(0.38, t, 48) * 0.75;
        const lub2 = thud(1.1, t, 56) * 0.9;
        const dub2 = thud(1.38, t, 48) * 0.65;
        const sample = (lub + dub + lub2 + dub2) * 0.9;
        left[i] = sample;
        right[i] = sample;
      }
      return buffer;
    },
  },
  {
    id: 'sfx_radio_static',
    name: '📻 Radio Frequency Glitch',
    category: 'electronic',
    duration: 1.5,
    description: 'Vintage analog communication static burst with demodulation hum',
    color: '#2563EB',
    icon: '📻',
    synthesize: (actx: BaseAudioContext) => {
      const sampleRate = actx.sampleRate;
      const duration = 1.5;
      const buffer = actx.createBuffer(2, sampleRate * duration, sampleRate);
      const left = buffer.getChannelData(0);
      const right = buffer.getChannelData(1);

      for (let i = 0; i < buffer.length; i++) {
        const t = i / sampleRate;
        const env = Math.sin((t / duration) * Math.PI);
        const carrier = Math.sin(2 * Math.PI * (1200 + Math.sin(t * 30) * 400) * t) * 0.2;
        const noise = (Math.random() * 2 - 1) * 0.6;
        const sample = (carrier + noise) * env * 0.65;
        left[i] = sample;
        right[i] = sample * (Math.random() > 0.5 ? 0.9 : 1.1);
      }
      return buffer;
    },
  },
  {
    id: 'sfx_ambient_rain',
    name: '🌧️ Safehouse Rain & Room Ambience',
    category: 'ambience',
    duration: 4.0,
    description: 'Subtle rain patter against glass window with low warm room tone',
    color: '#0284C7',
    icon: '🌧️',
    synthesize: (actx: BaseAudioContext) => {
      const sampleRate = actx.sampleRate;
      const duration = 4.0;
      const buffer = actx.createBuffer(2, sampleRate * duration, sampleRate);
      const left = buffer.getChannelData(0);
      const right = buffer.getChannelData(1);

      let lastLeft = 0;
      let lastRight = 0;

      for (let i = 0; i < buffer.length; i++) {
        const whiteL = Math.random() * 2 - 1;
        const whiteR = Math.random() * 2 - 1;
        // Simple low-pass filter
        lastLeft = lastLeft * 0.92 + whiteL * 0.08;
        lastRight = lastRight * 0.92 + whiteR * 0.08;
        const t = i / sampleRate;
        const droplet = Math.random() > 0.996 ? (Math.random() * 2 - 1) * 0.3 : 0;
        const drone = Math.sin(2 * Math.PI * 65 * t) * 0.05;
        left[i] = (lastLeft * 1.5 + droplet + drone) * 0.5;
        right[i] = (lastRight * 1.5 + droplet + drone) * 0.5;
      }
      return buffer;
    },
  },
];

// Audio URL Cache for presets to prevent recreating on every click
const presetUrlCache = new Map<string, string>();
const activeAudioNodes: { stop: () => void }[] = [];

let sharedAudioContext: AudioContext | null = null;
function getSharedAudioContext(): AudioContext {
  if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    sharedAudioContext = new AudioCtx();
  }
  if (sharedAudioContext.state === 'suspended') {
    sharedAudioContext.resume().catch(() => {});
  }
  return sharedAudioContext;
}

/**
 * Generate a real, playable Blob URL for a preset SFX sound
 */
export async function getPresetAudioUrl(presetId: string): Promise<string> {
  const cached = presetUrlCache.get(presetId);
  if (cached) return cached;

  const preset = CINEMATIC_SFX_PRESETS.find((p) => p.id === presetId);
  if (!preset) {
    throw new Error(`Preset with ID ${presetId} not found`);
  }

  const actx = getSharedAudioContext();
  const buffer = preset.synthesize(actx);
  const blob = audioBufferToWav(buffer);
  const url = URL.createObjectURL(blob);
  presetUrlCache.set(presetId, url);
  return url;
}

/**
 * Audition / play a sound effect immediately (preset or user audio URL)
 */
export async function playSfxAudio(audioUrlOrPresetId: string, volume = 1.0): Promise<() => void> {
  const actx = getSharedAudioContext();
  let sourceUrl = audioUrlOrPresetId;

  if (audioUrlOrPresetId.startsWith('sfx_')) {
    sourceUrl = await getPresetAudioUrl(audioUrlOrPresetId);
  }

  const audio = new Audio(sourceUrl);
  audio.volume = Math.max(0, Math.min(1, volume));

  const controller = {
    stop: () => {
      audio.pause();
      audio.currentTime = 0;
    },
  };

  activeAudioNodes.push(controller);

  audio.onended = () => {
    const idx = activeAudioNodes.indexOf(controller);
    if (idx >= 0) activeAudioNodes.splice(idx, 1);
  };

  await audio.play().catch(() => {
    // Ignore autoplay restriction or interruption
  });

  return controller.stop;
}

/**
 * Stop all active sound effects currently playing
 */
export function stopAllSfx(): void {
  while (activeAudioNodes.length > 0) {
    const node = activeAudioNodes.pop();
    node?.stop();
  }
}

/**
 * Extract duration of any user uploaded audio file
 */
export function extractAudioFileDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const audio = new Audio();
    audio.src = objectUrl;

    audio.onloadedmetadata = () => {
      const dur = audio.duration && !isNaN(audio.duration) ? +audio.duration.toFixed(2) : 2.0;
      URL.revokeObjectURL(objectUrl);
      resolve(Math.max(0.2, dur));
    };

    audio.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(2.0); // Safe fallback
    };
  });
}

/**
 * Create an SfxClip from a user uploaded File
 */
export async function createSfxClipFromFile(
  file: File,
  shotId?: string,
  sceneId?: string,
  offsetSec = 0
): Promise<SfxClip> {
  const duration = await extractAudioFileDuration(file);
  const { url } = await projectStorage.saveMedia(file, 'sfx');
  const cleanName = file.name.replace(/\.[^/.]+$/, '');

  const colors = ['#0D9488', '#2563EB', '#7C3AED', '#D97706', '#E11D48', '#059669'];
  const color = colors[Math.floor(Math.random() * colors.length)];

  return {
    id: `sfx_up_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    shotId,
    sceneId,
    name: cleanName,
    category: 'custom',
    audioUrl: url,
    duration,
    offsetSec,
    volume: 1.0,
    isMuted: false,
    color,
    notes: `Uploaded audio (${duration}s)`,
  };
}

/**
 * Create an SfxClip from a Preset definition
 */
export async function createSfxClipFromPreset(
  preset: SfxPresetDefinition,
  shotId?: string,
  sceneId?: string,
  offsetSec = 0
): Promise<SfxClip> {
  const url = await getPresetAudioUrl(preset.id);
  return {
    id: `sfx_${preset.id}_${Date.now()}`,
    shotId,
    sceneId,
    name: preset.name,
    category: preset.category,
    audioUrl: url,
    duration: preset.duration,
    offsetSec,
    volume: 1.0,
    isMuted: false,
    color: preset.color,
    notes: preset.description,
  };
}
