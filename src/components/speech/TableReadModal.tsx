import React, { useEffect, useState } from 'react';
import { Character, Scene } from '../../types/film';
import {
  tableReadService,
  TableReadItem,
} from '../../services/speech/tableReadService';
import {
  X,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Sparkles,
  BookOpen,
} from 'lucide-react';

interface TableReadModalProps {
  isOpen: boolean;
  scenes: Scene[];
  characters: Character[];
  onClose: () => void;
  onActiveItemChange?: (item: TableReadItem | null) => void;
}

export const TableReadModal: React.FC<TableReadModalProps> = ({
  isOpen,
  scenes,
  characters,
  onClose,
  onActiveItemChange,
}) => {
  const [items, setItems] = useState<TableReadItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [useSpeech, setUseSpeech] = useState(true);

  useEffect(() => {
    if (!isOpen) {
      tableReadService.stop();
      onActiveItemChange?.(null);
      return;
    }

    const prepared = tableReadService.prepare(scenes, characters);
    setItems(prepared);
    setCurrentIndex(0);

    tableReadService.onItemChange = (item, idx) => {
      setCurrentIndex(idx);
      onActiveItemChange?.(item);
    };

    tableReadService.onStateChange = (playing, paused) => {
      setIsPlaying(playing);
      setIsPaused(paused);
    };

    tableReadService.onComplete = () => {
      setIsPlaying(false);
      setIsPaused(false);
      onActiveItemChange?.(null);
    };

    return () => {
      tableReadService.stop();
    };
  }, [isOpen, scenes, characters]);

  if (!isOpen) return null;

  const currentItem = items[currentIndex];

  const handleTogglePlay = () => {
    if (isPlaying && !isPaused) {
      tableReadService.pause();
    } else if (isPaused) {
      tableReadService.resume(useSpeech);
    } else {
      tableReadService.start(useSpeech);
    }
  };

  const handleStop = () => {
    tableReadService.stop();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-[#D5DFDE] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#D8E3E1] flex items-center justify-between bg-[#F4F8F7]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#166E67] flex items-center justify-center text-white shadow-xs">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#112F2E]">Live Screenplay Table Read</h2>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-[#E6F4F2] text-[#0F766E] border border-[#C5E3DF] rounded">
                  {useSpeech ? 'Spoken Audio Active' : 'Text-Only Fallback'}
                </span>
              </div>
              <p className="text-xs text-[#52706E]">
                Audition dialogue pacing, voice assignments, and dramatic pauses before generating video takes.
              </p>
            </div>
          </div>

          <button
            onClick={handleStop}
            className="p-1.5 text-[#8A9E9C] hover:text-[#112F2E] hover:bg-[#EAF2F0] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Focus Read Card Area */}
        <div className="flex-1 p-8 flex flex-col items-center justify-center text-center overflow-y-auto min-h-[280px] bg-[#F8FAFA]">
          {currentItem ? (
            <div className="max-w-xl space-y-4 animate-fade-in">
              {/* Scene Slugline Context */}
              <div className="font-mono text-xs font-bold text-[#0D9488] uppercase tracking-wider">
                Scene {currentItem.sceneNumber} · {currentItem.slugline}
              </div>

              {/* Speaker Indicator if Dialogue */}
              {currentItem.type === 'dialogue' && (
                <div className="flex flex-col items-center gap-2">
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-md"
                    style={{ backgroundColor: currentItem.speakerColor || '#0D9488' }}
                  >
                    {currentItem.speakerName ? currentItem.speakerName[0] : '?'}
                  </div>
                  <div className="font-bold font-sans text-sm text-[#112F2E] uppercase tracking-wide">
                    {currentItem.speakerName}
                    {currentItem.parenthetical && (
                      <span className="text-xs text-[#52706E] font-normal italic ml-2 lowercase">
                        ({currentItem.parenthetical})
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Spoken Text or Action Prose */}
              <div
                className={`text-lg md:text-xl font-serif leading-relaxed px-4 ${
                  currentItem.type === 'action'
                    ? 'italic text-[#4A6462]'
                    : currentItem.type === 'pause'
                    ? 'font-mono text-sm text-[#52706E]'
                    : 'font-semibold text-[#112F2E]'
                }`}
              >
                {currentItem.text}
              </div>

              {/* Pause notice */}
              {currentItem.type === 'pause' && (
                <div className="text-xs text-[#0D9488] font-mono">
                  (Dramatic beat: {currentItem.durationSeconds}s)
                </div>
              )}
            </div>
          ) : (
            <div className="text-zinc-400 text-sm">Table read completed or stopped.</div>
          )}
        </div>

        {/* Progress Tracker */}
        <div className="px-6 py-2.5 bg-white border-t border-[#D8E3E1] flex items-center justify-between text-[11px] font-mono text-[#52706E]">
          <span>
            Beat {currentIndex + 1} of {items.length}
          </span>
          <div className="w-48 h-1.5 bg-[#E0EAE9] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#0D9488] transition-all duration-300"
              style={{ width: `${items.length ? ((currentIndex + 1) / items.length) * 100 : 0}%` }}
            />
          </div>
          <span>{Math.round(((currentIndex + 1) / (items.length || 1)) * 100)}%</span>
        </div>

        {/* Controls Footer */}
        <div className="px-6 py-4 border-t border-[#D8E3E1] bg-[#F4F8F7] flex items-center justify-between">
          <button
            onClick={() => setUseSpeech(!useSpeech)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border ${
              useSpeech
                ? 'bg-[#E6F4F2] border-[#0D9488] text-[#0F766E]'
                : 'bg-white border-[#D5DFDE] text-[#52706E]'
            }`}
            title="Toggle Browser Speech Synthesis"
          >
            {useSpeech ? <Volume2 className="w-4 h-4 text-[#0D9488]" /> : <VolumeX className="w-4 h-4" />}
            <span>{useSpeech ? 'Speech Voice ON' : 'Text Pacing Only'}</span>
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={() => tableReadService.stepBackward(useSpeech)}
              className="p-2 text-[#52706E] hover:text-[#112F2E] hover:bg-[#EAF2F0] rounded-full transition-colors"
              title="Previous line"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              onClick={handleTogglePlay}
              className="w-11 h-11 rounded-full bg-[#166E67] hover:bg-[#0F766E] text-white flex items-center justify-center shadow-md transition-transform active:scale-95"
            >
              {isPlaying && !isPaused ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            </button>

            <button
              onClick={() => tableReadService.stepForward(useSpeech)}
              className="p-2 text-[#52706E] hover:text-[#112F2E] hover:bg-[#EAF2F0] rounded-full transition-colors"
              title="Next line"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleStop}
            className="px-4 py-2 bg-[#112F2E] text-white text-xs font-semibold rounded-xl hover:bg-black transition-colors shadow-2xs"
          >
            End Read
          </button>
        </div>
      </div>
    </div>
  );
};
