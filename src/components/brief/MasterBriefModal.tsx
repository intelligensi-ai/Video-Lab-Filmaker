import React, { useState } from 'react';
import { AspectRatio, MasterBrief } from '../../types/film';
import { Sparkles, X, Clapperboard, Check } from 'lucide-react';
import { VideoLabLogo } from '../common/VideoLabLogo';

interface MasterBriefModalProps {
  isOpen: boolean;
  brief: MasterBrief;
  isGenerating: boolean;
  onClose: () => void;
  onSaveBrief: (brief: MasterBrief) => void;
  onAskAssistantDirector: (brief: MasterBrief) => void;
}

const ASPECT_RATIOS: { value: AspectRatio; label: string; desc: string }[] = [
  { value: '16:9', label: '16:9 Standard', desc: 'Standard widescreen broadcast' },
  { value: '2.39:1', label: '2.39:1 Anamorphic', desc: 'Cinematic scope letterbox' },
  { value: '9:16', label: '9:16 Vertical', desc: 'Mobile-first vertical format' },
  { value: '4:3', label: '4:3 Classic Academy', desc: 'Vintage film & retro indie' },
];

const SUGGESTED_TONES = [
  'Tense Neo-Noir Thriller',
  'Atmospheric Sci-Fi Mystery',
  'Grounded Character Drama',
  'Fast-Paced Action Heist',
  'Cerebral Psychological Horror',
  'Subversive Dark Comedy',
];

export const MasterBriefModal: React.FC<MasterBriefModalProps> = ({
  isOpen,
  brief,
  isGenerating,
  onClose,
  onSaveBrief,
  onAskAssistantDirector,
}) => {
  const [form, setForm] = useState<MasterBrief>({ ...brief });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveBrief(form);
    onClose();
  };

  const handleAskAD = () => {
    onSaveBrief(form);
    onAskAssistantDirector(form);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-[#D5DFDE] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#D8E3E1] flex items-center justify-between bg-[#F4F8F7]">
          <div className="flex items-center gap-3">
            <VideoLabLogo height={22} />
            <div className="h-4 w-px bg-[#D5DFDE]" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#112F2E]">Master Story Brief</h2>
                <span className="text-[10px] font-bold text-[#0F766E] uppercase px-1.5 py-0.2 bg-[#E6F4F2] border border-[#C5E3DF] rounded">
                  Director Slate
                </span>
              </div>
              <p className="text-xs text-[#52706E]">
                Directorial vision guiding characters, scenes, and Assistant Director proposals
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-[#8A9E9C] hover:text-[#112F2E] hover:bg-[#EAF2F0] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs bg-[#F8FAFA]">
          {/* Film Title */}
          <div>
            <label className="block font-semibold text-[#112F2E] mb-1">Film Title</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. The Safehouse Cipher"
              className="w-full px-3 py-2 bg-white rounded-xl border border-[#D5DFDE] focus:border-[#0D9488] focus:outline-none text-sm font-bold text-[#112F2E] shadow-2xs"
            />
          </div>

          {/* Premise / Logline */}
          <div>
            <label className="block font-semibold text-[#112F2E] mb-1">Premise & Logline</label>
            <textarea
              rows={3}
              value={form.premise}
              onChange={(e) => setForm({ ...form, premise: e.target.value })}
              placeholder="Describe the central dramatic premise, conflict, and protagonist goal..."
              className="w-full px-3 py-2 bg-white rounded-xl border border-[#D5DFDE] focus:border-[#0D9488] focus:outline-none text-xs leading-relaxed text-[#112F2E] shadow-2xs"
            />
          </div>

          {/* Target Duration & Aspect Ratio */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-[#112F2E] mb-1">Target Duration</label>
              <input
                type="text"
                value={form.targetDuration}
                onChange={(e) => setForm({ ...form, targetDuration: e.target.value })}
                placeholder="e.g. 60 seconds, 3 minutes"
                className="w-full px-3 py-2 bg-white rounded-xl border border-[#D5DFDE] focus:border-[#0D9488] focus:outline-none text-xs text-[#112F2E] shadow-2xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#112F2E] mb-1">Aspect Ratio Framing</label>
              <select
                value={form.aspectRatio}
                onChange={(e) => setForm({ ...form, aspectRatio: e.target.value as AspectRatio })}
                className="w-full px-3 py-2 bg-white rounded-xl border border-[#D5DFDE] focus:border-[#0D9488] focus:outline-none text-xs text-[#112F2E] shadow-2xs"
              >
                {ASPECT_RATIOS.map((ar) => (
                  <option key={ar.value} value={ar.value}>
                    {ar.label} — {ar.desc}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Cinematic Tone */}
          <div>
            <label className="block font-semibold text-[#112F2E] mb-1">Cinematic Tone & Genre</label>
            <input
              type="text"
              value={form.tone}
              onChange={(e) => setForm({ ...form, tone: e.target.value })}
              className="w-full px-3 py-2 bg-white rounded-xl border border-[#D5DFDE] focus:border-[#0D9488] focus:outline-none text-xs text-[#112F2E] mb-2 shadow-2xs"
            />
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTED_TONES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm({ ...form, tone: t })}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors ${
                    form.tone === t
                      ? 'bg-[#166E67] text-white border-[#166E67] shadow-xs'
                      : 'bg-white text-[#4A6462] border-[#D5DFDE] hover:bg-[#EAF2F0]'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Style & Staging Notes */}
          <div>
            <label className="block font-semibold text-[#112F2E] mb-1">Lighting & Camera Style Notes</label>
            <textarea
              rows={2}
              value={form.styleNotes}
              onChange={(e) => setForm({ ...form, styleNotes: e.target.value })}
              placeholder="e.g. 35mm film grain, moody tungsten shadows, slow deliberate push-ins..."
              className="w-full px-3 py-2 bg-white rounded-xl border border-[#D5DFDE] focus:border-[#0D9488] focus:outline-none text-xs leading-relaxed text-[#112F2E] shadow-2xs"
            />
          </div>
        </form>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-[#D8E3E1] bg-[#F4F8F7] flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-[#52706E] hover:text-[#112F2E] transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSubmit}
              className="px-4 py-2 text-xs font-semibold bg-white hover:bg-[#EAF2F0] border border-[#D5DFDE] text-[#112F2E] rounded-xl transition-colors shadow-2xs"
            >
              Save Brief
            </button>

            <button
              type="button"
              disabled={isGenerating}
              onClick={handleAskAD}
              className="px-4 py-2 text-xs font-bold bg-[#166E67] hover:bg-[#0F766E] text-white rounded-xl flex items-center gap-2 shadow-xs transition-colors disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isGenerating ? 'Generating Proposal...' : 'Ask Assistant Director'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
