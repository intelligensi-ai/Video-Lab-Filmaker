import { IVideoRuntimeAdapter } from './types';
import { localVideoRuntime } from './localVideoRuntime';
import { deployStudioRuntime } from './deployStudioStub';
import { RuntimeCapability } from '../../types/film';

export const RUNTIMES: Record<string, IVideoRuntimeAdapter> = {
  local_demo_engine: localVideoRuntime,
  deploy_studio_ltx: deployStudioRuntime,
};

export const AVAILABLE_RUNTIME_DECLARATIONS: RuntimeCapability[] = [
  localVideoRuntime.declaration,
  deployStudioRuntime.declaration,
  {
    id: 'veo_31_runtime',
    name: 'Google Veo 3.1 Preview',
    vendor: 'Google DeepMind',
    badge: 'ADVANCED CLUSTER',
    description: 'High definition video generation model supporting text-to-video, image-conditioned video, and camera direction controls.',
    isAvailable: false,
    capabilities: {
      dialogueLipSync: false,
      loraIdentity: false,
      maxShotDurationSec: 8.0,
      cameraMovementControls: true,
      lightingGuidance: true,
      referenceImages: true,
    },
    supportedAspectRatios: ['16:9', '9:16'],
    notice: 'Veo 3.1 requires server-side paid API tier configuration.',
  },
];

export function getRuntime(id: string): IVideoRuntimeAdapter {
  return RUNTIMES[id] || localVideoRuntime;
}
