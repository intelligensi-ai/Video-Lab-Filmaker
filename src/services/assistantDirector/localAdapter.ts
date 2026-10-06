import { AssistantDirectorProposal, MasterBrief, ShotType, CameraMovement, LightingStyle } from '../../types/film';
import { IAssistantDirectorAdapter } from './types';

export class LocalDemoAssistantDirectorAdapter implements IAssistantDirectorAdapter {
  name = 'Intelligensi Local Assistant Director (Deterministic Engine)';

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async propose(brief: MasterBrief): Promise<AssistantDirectorProposal> {
    // Generate an intelligent baseline proposal tuned to the master brief
    const isNoir = brief.tone.toLowerCase().includes('noir') || brief.tone.toLowerCase().includes('thrill');
    const isSciFi = brief.tone.toLowerCase().includes('sci-fi') || brief.tone.toLowerCase().includes('cyber');
    const isComedy = brief.tone.toLowerCase().includes('comedy') || brief.tone.toLowerCase().includes('light');

    const leadName = isSciFi ? 'KORA' : isComedy ? 'BARNABY' : 'RENA';
    const counterpartName = isSciFi ? 'VEX' : isComedy ? 'LEO' : 'MARCUS';

    return {
      id: `prop_${Date.now()}`,
      synopsis: `In "${brief.title || 'The Assignment'}", ${brief.premise || 'a covert operative verifies sensitive information under immense pressure.'} The sequence is calibrated for ${brief.targetDuration} across key focal beats.`,
      rationale: `Structured for a ${brief.tone} style at ${brief.aspectRatio} aspect ratio. Prioritizes tight eyeline tension, contrasting shot scales, and sharp character beats.`,
      suggestedCharacters: [
        {
          name: leadName,
          description: `Primary protagonist. Calculating, acutely watchful, carrying deep tradecraft experience.`,
          color: '#5B4FB9',
          initials: leadName[0],
          voiceNotes: 'Precise, low vocal register, deliberate cadence without hesitation.',
          costumeNotes: 'Dark tailored field coat with subtle concealed lapel pocket.',
          isAuto: true,
        },
        {
          name: counterpartName,
          description: `Crucial counterpart holding the missing piece of intelligence. Anxious and protective of their source.`,
          color: '#365314',
          initials: counterpartName[0],
          voiceNotes: 'Soft-spoken, breathless bursts with nervous pauses.',
          costumeNotes: 'Worn textured overshirt and wire-rimmed optical glasses.',
          isAuto: true,
        },
      ],
      suggestedLocations: [
        {
          name: 'THE INTERCEPT CHAMBER',
          type: 'Interior',
          description: 'A fortified private room with audio monitoring decks and slit-window amber lighting.',
          code: 'II',
        },
        {
          name: 'PERIMETER ALLEY',
          type: 'Exterior',
          description: 'Wet asphalt corridor illuminated by periodic green and neon sodium vapor lamps.',
          code: 'V',
        },
      ],
      suggestedScenes: [
        {
          sceneNumber: 1,
          slugline: 'INT. INTERCEPT CHAMBER - NIGHT',
          summary: `${leadName} checks the surveillance ledger while ${counterpartName} warns that the frequency has already been monitored.`,
          timeOfDay: 'NIGHT',
          locationName: 'THE INTERCEPT CHAMBER',
          scriptElements: [
            {
              type: 'action',
              text: 'The tungsten desk lamp hums. A reel of magnetic audio tape spools on the console.',
            },
            {
              type: 'dialogue',
              characterName: leadName,
              text: 'The timestamp is off by eleven minutes. Who cleared this channel?',
              parenthetical: 'holding the ledger flat on the timber desk',
            },
            {
              type: 'pause',
              durationSeconds: 1.8,
              notes: 'Distended silence as rain beats against the shutter slats.',
            },
            {
              type: 'dialogue',
              characterName: counterpartName,
              text: 'Nobody cleared it. They wanted us to think we were the only ones listening.',
              parenthetical: 'keeping his back against the brickwork',
            },
            {
              type: 'action',
              text: `${leadName} snaps the cassette bay shut. Her gaze darts toward the hallway feed.`,
            },
          ],
          shots: [
            {
              shotType: 'overhead' as ShotType,
              action: `High-angle top-down shot of ${leadName}'s gloved hands aligning the cipher slides over the desk map.`,
              cameraMovement: 'dolly' as CameraMovement,
              lighting: 'high-contrast noir' as LightingStyle,
              duration: 3.5,
              dialogueSnippet: 'The timestamp is off by eleven minutes...',
            },
            {
              shotType: 'close-up' as ShotType,
              action: `Tight punch on ${leadName}'s eyes as she catches the anomalous frequency reading.`,
              cameraMovement: 'static' as CameraMovement,
              lighting: 'warm tungsten' as LightingStyle,
              duration: 3.8,
              dialogueSnippet: 'Who cleared this channel?',
            },
            {
              shotType: 'two-shot' as ShotType,
              action: `Profile framing past ${counterpartName}'s tense posture as ${leadName} stands up.`,
              cameraMovement: 'pan' as CameraMovement,
              lighting: 'high-contrast noir' as LightingStyle,
              duration: 4.2,
              dialogueSnippet: 'They wanted us to think we were the only ones listening...',
            },
          ],
        },
        {
          sceneNumber: 2,
          slugline: 'EXT. PERIMETER ALLEY - CONTINUOUS',
          summary: 'A silhouette slips past the emergency staircase as an engine revs in the distance.',
          timeOfDay: 'NIGHT',
          locationName: 'PERIMETER ALLEY',
          scriptElements: [
            {
              type: 'action',
              text: 'Rainwater cascades through the rusted fire escape grating. Headlights flash against the wet brick.',
            },
            {
              type: 'dialogue',
              characterName: leadName,
              text: 'Vehicle at the north junction. Take the secondary staircase now.',
              parenthetical: 'speaking into collar mic',
            },
          ],
          shots: [
            {
              shotType: 'wide' as ShotType,
              action: 'Cinematic wide frame through falling rain as headlights sweep across the alley pavement.',
              cameraMovement: 'crane' as CameraMovement,
              lighting: 'neon nocturnal' as LightingStyle,
              duration: 4.5,
              dialogueSnippet: 'Vehicle at the north junction...',
            },
          ],
        },
      ],
    };
  }

  async revise(
    currentProposal: AssistantDirectorProposal,
    revisionRequest: string,
    brief: MasterBrief
  ): Promise<AssistantDirectorProposal> {
    const revised: AssistantDirectorProposal = JSON.parse(JSON.stringify(currentProposal));
    revised.id = `prop_rev_${Date.now()}`;
    const reqLower = revisionRequest.toLowerCase();

    const diffNotes: string[] = [];

    // Specific case requested in user prompt: "make Rena more guarded"
    if (reqLower.includes('rena') || reqLower.includes('guarded') || reqLower.includes('cautious') || reqLower.includes('defensive')) {
      const renaChar = revised.suggestedCharacters.find((c) => c.name.toUpperCase().includes('RENA') || c.name === 'KORA');
      if (renaChar) {
        renaChar.description = `${renaChar.name} is deeply guarded, cynical, and hyper-vigilant. She refuses eye contact unless demanding verification.`;
        renaChar.voiceNotes = 'Flat, quiet, clipped delivery. Never answers questions directly; uses counter-questions.';
        diffNotes.push(`Sharpened ${renaChar.name}'s character psychology: made significantly more guarded, skeptical, and detached.`);
      }

      // Update dialogue in scene 1
      if (revised.suggestedScenes[0]) {
        const sc1 = revised.suggestedScenes[0];
        sc1.scriptElements = sc1.scriptElements.map((el) => {
          if (el.type === 'dialogue' && (el.characterName?.includes('RENA') || el.characterName === 'KORA')) {
            return {
              ...el,
              text: "I don't care what you were told, Marcus. You touched the encryption table before I arrived.",
              parenthetical: 'stepping two paces back, hand hovering near inner pocket',
            };
          }
          return el;
        });

        // Update close-up shot description to reflect guardedness
        const closeUp = sc1.shots.find((s) => s.shotType === 'close-up');
        if (closeUp) {
          closeUp.action = `Extreme close-up on Rena's cold, unblinking glare as she reassesses whether Marcus is compromised.`;
          closeUp.cameraMovement = 'static';
          closeUp.lighting = 'high-contrast noir';
        }
        diffNotes.push(`Adjusted Scene 1 dialogue and close-up framing to accentuate Rena's heightened suspicion.`);
      }
    } else if (reqLower.includes('action') || reqLower.includes('pace') || reqLower.includes('faster')) {
      diffNotes.push('Accelerated scene pacing: reduced shot durations by 25% and added handheld camera movement.');
      for (const scene of revised.suggestedScenes) {
        for (const shot of scene.shots) {
          shot.duration = Math.max(2.0, +(shot.duration * 0.75).toFixed(1));
          if (shot.cameraMovement === 'static') shot.cameraMovement = 'handheld';
        }
      }
    } else if (reqLower.includes('twist') || reqLower.includes('ending') || reqLower.includes('cliffhanger')) {
      diffNotes.push('Added dramatic third beat: remote siren and sudden power outage.');
      if (revised.suggestedScenes[0]) {
        revised.suggestedScenes[0].scriptElements.push({
          type: 'action',
          text: 'The tungsten lamp suddenly pops and dies. Emergency amber backup beacons begin to rotate.',
        });
        revised.suggestedScenes[0].shots.push({
          shotType: 'reaction',
          action: 'Macro shot of the power breaker tripping, plunged into amber shadow.',
          cameraMovement: 'tilt',
          lighting: 'neon nocturnal',
          duration: 3.0,
          dialogueSnippet: 'Power cuts out abruptly.',
        });
      }
    } else {
      // General tailored revision
      diffNotes.push(`Applied filmmaker directorial feedback: "${revisionRequest}". Re-calibrated character motivations and shot staging.`);
      revised.rationale = `${revised.rationale} Updated per directorial note: "${revisionRequest}".`;
    }

    revised.revisionDiff = diffNotes.join(' • ');
    return revised;
  }
}

export const localAssistantDirector = new LocalDemoAssistantDirectorAdapter();
