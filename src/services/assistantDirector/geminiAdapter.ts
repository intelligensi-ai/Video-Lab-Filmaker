import { AssistantDirectorProposal, MasterBrief } from '../../types/film';
import { IAssistantDirectorAdapter } from './types';
import { localAssistantDirector } from './localAdapter';

export class GeminiAssistantDirectorAdapter implements IAssistantDirectorAdapter {
  name = 'Gemini 3.8 Assistant Director (Server-Side GenAI)';

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch('/api/health');
      if (!res.ok) return false;
      const data = await res.json();
      return Boolean(data.hasGeminiKey);
    } catch {
      return false;
    }
  }

  async propose(brief: MasterBrief): Promise<AssistantDirectorProposal> {
    try {
      const res = await fetch('/api/assistant-director/propose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief }),
      });

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data.fallback || !data.proposal) {
        console.info('Using local deterministic Assistant Director engine');
        return localAssistantDirector.propose(brief);
      }

      const raw = data.proposal;
      return {
        id: `prop_gemini_${Date.now()}`,
        synopsis: raw.synopsis || `Proposal for ${brief.title}`,
        rationale: raw.rationale || 'Generated using Gemini 3.8 Flash Assistant Director.',
        suggestedCharacters: raw.suggestedCharacters || [],
        suggestedLocations: raw.suggestedLocations || [],
        suggestedScenes: (raw.suggestedScenes || []).map((sc: any, idx: number) => ({
          sceneNumber: sc.sceneNumber || idx + 1,
          slugline: sc.slugline || `SCENE ${idx + 1}`,
          summary: sc.summary || '',
          timeOfDay: sc.timeOfDay || 'NIGHT',
          locationName: sc.locationName || '',
          scriptElements: sc.scriptElements || [],
          shots: sc.shots || [],
        })),
      };
    } catch (err) {
      console.warn('Gemini Assistant Director unavailable, using deterministic engine:', err);
      return localAssistantDirector.propose(brief);
    }
  }

  async revise(
    currentProposal: AssistantDirectorProposal,
    revisionRequest: string,
    brief: MasterBrief
  ): Promise<AssistantDirectorProposal> {
    try {
      const res = await fetch('/api/assistant-director/propose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brief,
          revisionRequest,
          currentProposal,
        }),
      });

      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();
      if (data.fallback || !data.proposal) {
        return localAssistantDirector.revise(currentProposal, revisionRequest, brief);
      }

      const raw = data.proposal;
      return {
        id: `prop_gemini_rev_${Date.now()}`,
        synopsis: raw.synopsis || currentProposal.synopsis,
        rationale: raw.rationale || `Revised according to "${revisionRequest}"`,
        suggestedCharacters: raw.suggestedCharacters || currentProposal.suggestedCharacters,
        suggestedLocations: raw.suggestedLocations || currentProposal.suggestedLocations,
        suggestedScenes: raw.suggestedScenes || currentProposal.suggestedScenes,
        revisionDiff: `Revision generated with Gemini 3.8: "${revisionRequest}"`,
      };
    } catch {
      return localAssistantDirector.revise(currentProposal, revisionRequest, brief);
    }
  }
}

export const geminiAssistantDirector = new GeminiAssistantDirectorAdapter();
