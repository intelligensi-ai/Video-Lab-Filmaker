/**
 * Core Domain Models for Intelligensi.ai Video Lab — Filmmaker
 */

export type AspectRatio = '16:9' | '9:16' | '2.39:1' | '4:3';

export type ShotType =
  | 'overhead'
  | 'wide'
  | 'two-shot'
  | 'close-up'
  | 'reaction'
  | 'custom';

export type CameraMovement =
  | 'static'
  | 'pan'
  | 'tilt'
  | 'dolly'
  | 'tracking'
  | 'crane'
  | 'handheld';

export type LightingStyle =
  | 'high-contrast noir'
  | 'warm tungsten'
  | 'neon nocturnal'
  | 'soft diffused natural'
  | 'harsh overhead fluorescent'
  | 'cinematic golden hour';

export type TransitionType =
  | 'cut'
  | 'fade'
  | 'dissolve'
  | 'cross-dissolve'
  | 'dip-to-black'
  | 'dip-to-white'
  | 'wipe-left'
  | 'wipe-right'
  | 'wipe-up'
  | 'wipe-down'
  | 'iris'
  | 'j-cut'
  | 'l-cut';

export interface MasterBrief {
  title: string;
  premise: string;
  targetDuration: string; // e.g. "60 seconds", "2 minutes"
  aspectRatio: AspectRatio;
  tone: string;
  styleNotes: string;
}

export interface Character {
  id: string;
  name: string;
  description: string;
  color: string; // Hex color for badge/avatar
  initials: string;
  avatarUrl?: string;
  voiceNotes?: string;
  costumeNotes?: string;
  sceneAppearances?: number;
  isAuto?: boolean;
}

export interface Location {
  id: string;
  name: string;
  type: 'Interior' | 'Exterior' | 'Both';
  description: string;
  visualReferences?: string[];
  sceneAppearances?: number;
  code: string; // e.g. "II", "IV", "01"
}

export type ScriptElementType = 'action' | 'dialogue' | 'pause';

export interface ActionElement {
  id: string;
  type: 'action';
  text: string;
}

export interface DialogueElement {
  id: string;
  type: 'dialogue';
  characterId: string;
  text: string;
  parenthetical?: string;
}

export interface PauseElement {
  id: string;
  type: 'pause';
  durationSeconds: number;
  notes?: string;
}

export type ScriptElement = ActionElement | DialogueElement | PauseElement;

export interface Take {
  id: string;
  shotId: string;
  takeNumber: number;
  label: string; // e.g. "Take 1 (Demo Synth)", "Take 2 (Uploaded Clip)"
  type: 'demo-generated' | 'uploaded' | 'runtime-generated';
  mediaUrl: string; // Data URL or object URL or generated canvas loop
  mediaType: 'video' | 'image';
  thumbnailUrl?: string;
  promptUsed?: string;
  duration: number; // in seconds
  inPoint?: number; // In trim point in seconds
  outPoint?: number; // Out trim point in seconds
  createdAt: number;
  isSelected: boolean;
  status: 'ready' | 'generating' | 'failed';
  notes?: string;
}

export type SfxCategory =
  | 'impact'
  | 'foley'
  | 'ambience'
  | 'suspense'
  | 'transition'
  | 'mechanical'
  | 'electronic'
  | 'custom';

export interface SfxClip {
  id: string;
  shotId?: string; // Target shot
  sceneId?: string; // Target scene
  name: string; // e.g. "Cinematic Sub Boom", "Heavy Door Slam"
  category: SfxCategory;
  audioUrl: string; // Blob URL, Data URL, or Preset ID
  duration: number; // in seconds (e.g. 1.8s)
  offsetSec: number; // Trigger delay in seconds from shot/scene start (default 0s)
  volume: number; // 0.0 to 1.0 (default 1.0)
  isMuted?: boolean;
  color?: string; // Hex color badge for track display
  notes?: string;
}

export interface Shot {
  id: string;
  sceneId: string;
  shotNumber: number;
  shotType: ShotType;
  action: string;
  cameraMovement: CameraMovement;
  lighting: LightingStyle;
  dialogueSnippet?: string;
  characterIds?: string[];
  duration: number; // in seconds (e.g. 3.5)
  selectedTakeId?: string;
  takes: Take[];
  sfxClips?: SfxClip[]; // Layered sound effects for this shot
}

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

export interface Transition {
  id: string;
  fromShotId: string;
  toShotId: string;
  type: TransitionType;
  duration: number; // seconds, e.g. 0.8s
  audioOffset?: number; // seconds for J-Cut / L-Cut audio overlap (default 0.8s)
}

export interface MediaBin {
  id: string;
  name: string;
  color?: string; // hex color for bin badge
  description?: string;
  createdAt: number;
}

export interface MediaClip {
  id: string;
  binId: string; // Target bin id or 'all'
  title: string;
  mediaType: 'video' | 'audio' | 'image';
  url: string; // Blob URL, Data URL, or static asset path
  thumbnailUrl?: string;
  duration: number; // in seconds
  resolution?: string; // e.g. "4K UHD (3840x2160)", "1080p FHD"
  fps?: number; // e.g. 24, 30, 60
  sizeBytes?: number;
  tags?: string[];
  createdAt: number;
  notes?: string;
}

export interface Scene {
  id: string;
  sceneNumber: number;
  slugline: string; // e.g. "INT. SAFEHOUSE - NIGHT"
  locationId?: string;
  summary: string;
  timeOfDay: 'NIGHT' | 'DAY' | 'DUSK' | 'DAWN';
  scriptElements: ScriptElement[];
  shots: Shot[];
  sfxClips?: SfxClip[]; // Layered sound effects or ambience for this scene
}

export interface FilmProject {
  id: string;
  title: string;
  brief: MasterBrief;
  characters: Character[];
  locations: Location[];
  scenes: Scene[];
  transitions: Record<string, Transition>; // key: `${fromShotId}->${toShotId}`
  activeRuntimeId: string;
  sfxClips?: SfxClip[]; // Project / Timeline SFX pool
  mediaBins?: MediaBin[];
  mediaClips?: MediaClip[];
  createdAt: number;
  updatedAt: number;
}

export interface AssistantDirectorProposal {
  id: string;
  synopsis: string;
  rationale: string;
  suggestedCharacters: Omit<Character, 'id' | 'sceneAppearances'>[];
  suggestedLocations: Omit<Location, 'id' | 'sceneAppearances'>[];
  suggestedScenes: {
    sceneNumber: number;
    slugline: string;
    summary: string;
    timeOfDay: 'NIGHT' | 'DAY' | 'DUSK' | 'DAWN';
    locationName?: string;
    scriptElements: {
      type: 'action' | 'dialogue' | 'pause';
      characterName?: string;
      text?: string;
      parenthetical?: string;
      durationSeconds?: number;
      notes?: string;
    }[];
    shots: {
      shotType: ShotType;
      action: string;
      cameraMovement: CameraMovement;
      lighting: LightingStyle;
      duration: number;
      dialogueSnippet?: string;
    }[];
  }[];
  revisionDiff?: string;
}

export interface GenerationJob {
  id: string;
  shotId: string;
  shotTitle: string;
  takeNumber: number;
  runtimeId: string;
  status: 'planned' | 'generating' | 'ready' | 'failed';
  progress: number; // 0 to 100
  startedAt: number;
  prompt?: string;
  error?: string;
  createdTakeId?: string;
}

export interface RuntimeCapability {
  id: string;
  name: string;
  vendor: string;
  badge: string;
  description: string;
  isAvailable: boolean;
  capabilities: {
    dialogueLipSync: boolean;
    loraIdentity: boolean;
    maxShotDurationSec: number;
    cameraMovementControls: boolean;
    lightingGuidance: boolean;
    referenceImages: boolean;
  };
  supportedAspectRatios: AspectRatio[];
  notice?: string;
}
