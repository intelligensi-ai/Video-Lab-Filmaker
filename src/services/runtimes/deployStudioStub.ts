import { RuntimeCapability, Take } from '../../types/film';
import { CompatibilityCheckResult, IVideoRuntimeAdapter, ShotGenerationRequest } from './types';
import { localVideoRuntime } from './localVideoRuntime';

export class DeployStudioRuntimeStub implements IVideoRuntimeAdapter {
  id = 'deploy_studio_ltx';
  name = 'Intelligensi Deploy Studio (LTX-Video v0.9)';

  declaration: RuntimeCapability = {
    id: 'deploy_studio_ltx',
    name: 'Deploy Studio (LTX-Video v0.9 / Wan2.1)',
    vendor: 'Intelligensi.ai Cloud Clusters',
    badge: 'STUDIO TIER',
    description: 'Cloud GPU inference runtime powered by LTX-Video v0.9. Generates photorealistic cinematic motion at up to 1080p from reference frames and camera direction prompts.',
    isAvailable: false, // Marked as requiring backend endpoint configuration
    capabilities: {
      dialogueLipSync: false,
      loraIdentity: true,
      maxShotDurationSec: 5.0, // Hard constraint for LTX-Video inference window
      cameraMovementControls: true,
      lightingGuidance: true,
      referenceImages: true,
    },
    supportedAspectRatios: ['16:9', '9:16'],
    notice: 'Live Deploy Studio connection requires DEPLOY_STUDIO_API_URL and DEPLOY_STUDIO_API_KEY environment variables. The filmmaker adapter is ready for Codex integration.',
  };

  checkCompatibility(request: ShotGenerationRequest): CompatibilityCheckResult {
    const warnings: string[] = [];
    const unsupported: string[] = [];

    // LTX-Video hard 5-second constraint
    if (request.shot.duration > 5.0) {
      warnings.push(
        `Shot duration is ${request.shot.duration}s, but Deploy Studio LTX-Video has a 5.0s maximum generation window. Clip will be generated at 5.0s.`
      );
      unsupported.push('Durations over 5.0s per generation request');
    }

    // Aspect ratio check
    if (request.project.brief.aspectRatio === '2.39:1' || request.project.brief.aspectRatio === '4:3') {
      warnings.push(`Deploy Studio natively outputs 16:9 or 9:16. Aspect ratio ${request.project.brief.aspectRatio} will be letterboxed.`);
    }

    // Audio Lip-sync check
    if (request.shot.dialogueSnippet) {
      warnings.push('LTX-Video generates silent visual takes. Dialogue must be synthesized or recorded via audio stem.');
      unsupported.push('Direct In-Video Audio LipSync');
    }

    return {
      isCompatible: warnings.length === 0,
      warnings,
      unsupportedFeatures: unsupported,
    };
  }

  async generateTake(
    request: ShotGenerationRequest,
    onProgress?: (percent: number, statusText: string) => void
  ): Promise<Take> {
    // Check if backend endpoint is reachable
    let hasLiveEndpoint = false;
    try {
      const res = await fetch('/api/runtime/deploy-studio/status');
      if (res.ok) {
        const data = await res.json();
        hasLiveEndpoint = Boolean(data.connected);
      }
    } catch {
      hasLiveEndpoint = false;
    }

    if (!hasLiveEndpoint) {
      // Honest reporting: do not fake a live cloud connection
      onProgress?.(25, 'Connecting to Deploy Studio Gateway...');
      await new Promise((r) => setTimeout(r, 400));
      onProgress?.(50, 'Notice: No live DEPLOY_STUDIO_API_URL detected.');
      await new Promise((r) => setTimeout(r, 400));
      onProgress?.(75, 'Falling back to high-fidelity Local Demo Engine...');
      await new Promise((r) => setTimeout(r, 400));

      const take = await localVideoRuntime.generateTake(request, onProgress);
      take.label = `Take ${take.takeNumber} (Deploy Studio Stub -> Local Render)`;
      take.notes = 'Generated via Deploy Studio adapter fallback. Connect live cluster endpoint in backend to enable remote GPU inference.';
      return take;
    }

    throw new Error('Deploy Studio endpoint configured but returned unexpected response.');
  }
}

export const deployStudioRuntime = new DeployStudioRuntimeStub();
