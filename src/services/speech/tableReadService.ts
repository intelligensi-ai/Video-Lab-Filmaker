import { Character, Scene, ScriptElement } from '../../types/film';

export interface TableReadItem {
  elementId: string;
  sceneId: string;
  sceneNumber: number;
  slugline: string;
  type: 'slugline' | 'action' | 'dialogue' | 'pause';
  speakerName?: string;
  speakerColor?: string;
  parenthetical?: string;
  text: string;
  durationSeconds: number;
}

export class TableReadService {
  private isPlaying = false;
  private isPaused = false;
  private currentIndex = 0;
  private items: TableReadItem[] = [];
  private charactersMap: Map<string, Character> = new Map();
  private timer: number | null = null;
  private voiceNarration: SpeechSynthesisVoice | null = null;
  private voicesByCharacter: Map<string, { voice?: SpeechSynthesisVoice; pitch: number; rate: number }> = new Map();

  public onItemChange?: (item: TableReadItem, index: number, total: number) => void;
  public onComplete?: () => void;
  public onStateChange?: (isPlaying: boolean, isPaused: boolean) => void;

  constructor() {
    this.initVoices();
  }

  private initVoices() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const load = () => {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          // Choose natural English voices
          const enVoices = voices.filter((v) => v.lang.startsWith('en'));
          this.voiceNarration = enVoices.find((v) => v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha')) || enVoices[0] || voices[0];
        }
      };
      load();
      window.speechSynthesis.onvoiceschanged = load;
    }
  }

  public prepare(scenes: Scene[], characters: Character[]): TableReadItem[] {
    this.charactersMap = new Map(characters.map((c) => [c.id, c]));
    this.assignCharacterVoices(characters);

    const items: TableReadItem[] = [];

    for (const scene of scenes) {
      // Scene slugline header beat
      items.push({
        elementId: `slug_${scene.id}`,
        sceneId: scene.id,
        sceneNumber: scene.sceneNumber,
        slugline: scene.slugline,
        type: 'slugline',
        text: `Scene ${scene.sceneNumber}: ${scene.slugline}`,
        durationSeconds: 2.0,
      });

      for (const el of scene.scriptElements) {
        if (el.type === 'action') {
          items.push({
            elementId: el.id,
            sceneId: scene.id,
            sceneNumber: scene.sceneNumber,
            slugline: scene.slugline,
            type: 'action',
            text: el.text,
            durationSeconds: Math.max(2.5, el.text.split(' ').length * 0.35),
          });
        } else if (el.type === 'dialogue') {
          const char = this.charactersMap.get(el.characterId);
          const speakerName = char ? char.name : 'SPEAKER';
          items.push({
            elementId: el.id,
            sceneId: scene.id,
            sceneNumber: scene.sceneNumber,
            slugline: scene.slugline,
            type: 'dialogue',
            speakerName,
            speakerColor: char?.color || '#5B4FB9',
            parenthetical: el.parenthetical,
            text: el.text,
            durationSeconds: Math.max(2.0, el.text.split(' ').length * 0.4),
          });
        } else if (el.type === 'pause') {
          items.push({
            elementId: el.id,
            sceneId: scene.id,
            sceneNumber: scene.sceneNumber,
            slugline: scene.slugline,
            type: 'pause',
            text: el.notes ? `[Beat: ${el.notes}]` : `[Pause: ${el.durationSeconds}s]`,
            durationSeconds: el.durationSeconds || 1.5,
          });
        }
      }
    }

    this.items = items;
    this.currentIndex = 0;
    return items;
  }

  private assignCharacterVoices(characters: Character[]) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const voices = window.speechSynthesis.getVoices().filter((v) => v.lang.startsWith('en'));

    characters.forEach((char, index) => {
      const voice = voices[(index + 1) % (voices.length || 1)] || this.voiceNarration;
      // Vary pitch and rate for distinct personality
      const pitch = index % 2 === 0 ? 1.15 : 0.85;
      const rate = 1.0;
      this.voicesByCharacter.set(char.id, { voice, pitch, rate });
    });
  }

  public start(useSpeech = true) {
    if (this.items.length === 0) return;
    this.isPlaying = true;
    this.isPaused = false;
    this.onStateChange?.(this.isPlaying, this.isPaused);
    this.playCurrentItem(useSpeech);
  }

  public pause() {
    this.isPaused = true;
    this.onStateChange?.(this.isPlaying, this.isPaused);
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.pause();
    }
    if (this.timer) {
      window.clearTimeout(this.timer);
      this.timer = null;
    }
  }

  public resume(useSpeech = true) {
    if (!this.isPlaying) {
      this.start(useSpeech);
      return;
    }
    this.isPaused = false;
    this.onStateChange?.(this.isPlaying, this.isPaused);
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    } else {
      this.playCurrentItem(useSpeech);
    }
  }

  public stop() {
    this.isPlaying = false;
    this.isPaused = false;
    this.currentIndex = 0;
    if (this.timer) {
      window.clearTimeout(this.timer);
      this.timer = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.onStateChange?.(this.isPlaying, this.isPaused);
  }

  public stepForward(useSpeech = true) {
    if (this.currentIndex < this.items.length - 1) {
      this.currentIndex++;
      this.playCurrentItem(useSpeech);
    }
  }

  public stepBackward(useSpeech = true) {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.playCurrentItem(useSpeech);
    }
  }

  private playCurrentItem(useSpeech: boolean) {
    if (this.timer) {
      window.clearTimeout(this.timer);
      this.timer = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    if (this.currentIndex >= this.items.length) {
      this.stop();
      this.onComplete?.();
      return;
    }

    const item = this.items[this.currentIndex];
    this.onItemChange?.(item, this.currentIndex, this.items.length);

    if (useSpeech && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      let spokenText = item.text;
      let pitch = 1.0;
      let rate = 1.0;
      let voice = this.voiceNarration;

      if (item.type === 'dialogue') {
        spokenText = item.text;
        const charEntry = Array.from(this.charactersMap.values()).find((c) => c.name === item.speakerName);
        if (charEntry && this.voicesByCharacter.has(charEntry.id)) {
          const config = this.voicesByCharacter.get(charEntry.id)!;
          pitch = config.pitch;
          rate = config.rate;
          if (config.voice) voice = config.voice;
        }
      } else if (item.type === 'pause') {
        spokenText = ''; // silent pause
      }

      if (spokenText) {
        const utter = new SpeechSynthesisUtterance(spokenText);
        if (voice) utter.voice = voice;
        utter.pitch = pitch;
        utter.rate = rate;

        utter.onend = () => {
          if (!this.isPlaying || this.isPaused) return;
          this.currentIndex++;
          this.playCurrentItem(useSpeech);
        };

        utter.onerror = () => {
          // Fallback to timer
          this.scheduleNext(item.durationSeconds * 1000, useSpeech);
        };

        window.speechSynthesis.speak(utter);
      } else {
        // Silent pause or slugline
        this.scheduleNext(item.durationSeconds * 1000, useSpeech);
      }
    } else {
      // Text-only fallback mode
      this.scheduleNext(item.durationSeconds * 1000, useSpeech);
    }
  }

  private scheduleNext(ms: number, useSpeech: boolean) {
    this.timer = window.setTimeout(() => {
      if (!this.isPlaying || this.isPaused) return;
      this.currentIndex++;
      this.playCurrentItem(useSpeech);
    }, ms);
  }

  public getCurrentIndex(): number {
    return this.currentIndex;
  }
}

export const tableReadService = new TableReadService();
