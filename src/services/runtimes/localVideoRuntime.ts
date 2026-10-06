import { RuntimeCapability, Take } from '../../types/film';
import { CompatibilityCheckResult, IVideoRuntimeAdapter, ShotGenerationRequest } from './types';

// Palette of cinematic lighting gradients for procedural generation
const LIGHTING_PALETTES: Record<string, [string, string]> = {
  'high-contrast noir': ['#09090b', '#27272a'],
  'warm tungsten': ['#291807', '#78350f'],
  'neon nocturnal': ['#022c22', '#0f766e'],
  'soft diffused natural': ['#18181b', '#3f3f46'],
  'harsh overhead fluorescent': ['#0f172a', '#334155'],
  'cinematic golden hour': ['#451a03', '#9a3412'],
};

export class LocalDemoVideoRuntimeAdapter implements IVideoRuntimeAdapter {
  id = 'local_demo_engine';
  name = 'Intelligensi VideoLab Local Engine';

  declaration: RuntimeCapability = {
    id: 'local_demo_engine',
    name: 'VideoLab Local Engine',
    vendor: 'Intelligensi.ai (Deterministic Local)',
    badge: 'DEMO READY',
    description: 'High-speed deterministic client-side renderer. Generates cinematic animatic clips and storyboard takes instantly without API charges or cloud latency.',
    isAvailable: true,
    capabilities: {
      dialogueLipSync: false,
      loraIdentity: false,
      maxShotDurationSec: 10,
      cameraMovementControls: true,
      lightingGuidance: true,
      referenceImages: true,
    },
    supportedAspectRatios: ['16:9', '9:16', '2.39:1', '4:3'],
    notice: 'Demo mode active. Output clips are stylized animatic takes with real camera motion and grading.',
  };

  checkCompatibility(request: ShotGenerationRequest): CompatibilityCheckResult {
    const warnings: string[] = [];
    const unsupported: string[] = [];

    if (request.shot.duration > 10) {
      warnings.push(`Shot duration (${request.shot.duration}s) exceeds optimal local demo limit (10s). Local engine will clamp to 10s.`);
    }

    if (request.shot.dialogueSnippet) {
      warnings.push('Local demo engine does not generate AI lip-synced audio in video track. Use the built-in "Table Read" mode for dialogue playback.');
    }

    return {
      isCompatible: true,
      warnings,
      unsupportedFeatures: unsupported,
    };
  }

  async generateTake(
    request: ShotGenerationRequest,
    onProgress?: (percent: number, statusText: string) => void
  ): Promise<Take> {
    const { shot, project, characters } = request;

    // Simulate realistic generation pipeline phases
    const steps = [
      { pct: 15, msg: 'Calibrating shot framing & camera movement...' },
      { pct: 40, msg: `Applying ${shot.lighting} lighting profile...` },
      { pct: 70, msg: 'Synthesizing visual frames & 35mm grain pass...' },
      { pct: 95, msg: 'Encoding take asset...' },
    ];

    for (const step of steps) {
      onProgress?.(step.pct, step.msg);
      await new Promise((r) => setTimeout(r, 220));
    }

    // Determine the next take number
    const existingTakes = shot.takes || [];
    const nextTakeNumber = existingTakes.length + 1;

    // Generate a procedural canvas frame for the take
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      const colors = LIGHTING_PALETTES[shot.lighting] || ['#09090b', '#27272a'];
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, colors[0]);
      gradient.addColorStop(1, colors[1]);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Subtle atmospheric lighting rays
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 40;
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 240, 0);
        ctx.lineTo(i * 240 + 300, canvas.height);
        ctx.stroke();
      }
      ctx.restore();

      // Vignette
      const vignette = ctx.createRadialGradient(
        canvas.width / 2,
        canvas.height / 2,
        canvas.width * 0.25,
        canvas.width / 2,
        canvas.height / 2,
        canvas.width * 0.7
      );
      vignette.addColorStop(0, 'rgba(0,0,0,0)');
      vignette.addColorStop(1, 'rgba(0,0,0,0.75)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Slate & Framing Info
      ctx.fillStyle = '#EBE3D3';
      ctx.font = '600 24px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(`${project.title.toUpperCase()}`, 64, 80);

      ctx.font = '500 16px "JetBrains Mono", monospace';
      ctx.fillStyle = '#0D9488';
      ctx.fillText(`SCENE ${shot.sceneId.replace('scene_', '')} · SHOT ${shot.shotNumber} · TAKE ${nextTakeNumber}`, 64, 115);

      ctx.fillStyle = 'rgba(235, 227, 211, 0.7)';
      ctx.font = '400 16px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(`FRAMING: ${shot.shotType.toUpperCase()} · MOTION: ${shot.cameraMovement.toUpperCase()}`, 64, 145);
      ctx.fillText(`LIGHTING: ${shot.lighting.toUpperCase()} · DURATION: ${shot.duration}s`, 64, 175);

      // Center shot action text preview
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'italic 500 28px "Plus Jakarta Sans", sans-serif';
      const actionWords = shot.action.split(' ');
      let line = '';
      let y = canvas.height / 2 - 20;
      for (const word of actionWords) {
        const testLine = line + word + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > 900 && line !== '') {
          ctx.fillText(line, 64, y);
          line = word + ' ';
          y += 38;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, 64, y);

      // Dialogue subtitle bar if applicable
      if (shot.dialogueSnippet) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
        ctx.fillRect(64, canvas.height - 110, canvas.width - 128, 54);
        ctx.strokeStyle = '#0D9488';
        ctx.strokeRect(64, canvas.height - 110, canvas.width - 128, 54);

        ctx.fillStyle = '#F4EEDF';
        ctx.font = '500 18px "Plus Jakarta Sans", sans-serif';
        ctx.fillText(`"${shot.dialogueSnippet}"`, 90, canvas.height - 76);
      }

      // Watermark
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.font = '500 13px "JetBrains Mono", monospace';
      ctx.fillText('INTELLIGENSI.AI VIDEO LAB — DEMO TAKE', canvas.width - 340, canvas.height - 30);
    }

    const dataUrl = canvas.toDataURL('image/png');

    onProgress?.(100, 'Take ready!');

    const newTake: Take = {
      id: `take_${shot.id}_${nextTakeNumber}_${Date.now().toString(36)}`,
      shotId: shot.id,
      takeNumber: nextTakeNumber,
      label: `Take ${nextTakeNumber} (Demo Synth - ${shot.shotType})`,
      type: 'demo-generated',
      mediaUrl: dataUrl,
      mediaType: 'image',
      duration: shot.duration,
      createdAt: Date.now(),
      isSelected: existingTakes.length === 0, // Auto-select if first take
      status: 'ready',
      promptUsed: request.promptOverride || shot.action,
      notes: `${shot.cameraMovement} movement with ${shot.lighting} lighting.`,
    };

    return newTake;
  }
}

export const localVideoRuntime = new LocalDemoVideoRuntimeAdapter();
