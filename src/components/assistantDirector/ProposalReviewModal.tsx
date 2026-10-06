import React, { useState } from 'react';
import { AssistantDirectorProposal, MasterBrief } from '../../types/film';
import { Sparkles, Check, X, RefreshCw, Layers, CheckSquare, Square, AlertCircle, ArrowRight } from 'lucide-react';

interface ProposalReviewModalProps {
  isOpen: boolean;
  proposal: AssistantDirectorProposal | null;
  brief: MasterBrief;
  isRevising: boolean;
  onClose: () => void;
  onApplyProposal: (
    proposal: AssistantDirectorProposal,
    selection: {
      acceptCharacters: boolean;
      acceptLocations: boolean;
      acceptScenes: boolean;
    }
  ) => void;
  onRequestRevision: (revisionText: string) => void;
}

export const ProposalReviewModal: React.FC<ProposalReviewModalProps> = ({
  isOpen,
  proposal,
  brief,
  isRevising,
  onClose,
  onApplyProposal,
  onRequestRevision,
}) => {
  const [revisionPrompt, setRevisionPrompt] = useState('make Rena more guarded');
  const [acceptCharacters, setAcceptCharacters] = useState(true);
  const [acceptLocations, setAcceptLocations] = useState(true);
  const [acceptScenes, setAcceptScenes] = useState(true);

  if (!isOpen || !proposal) return null;

  const handleApply = (all = false) => {
    onApplyProposal(proposal, {
      acceptCharacters: all || acceptCharacters,
      acceptLocations: all || acceptLocations,
      acceptScenes: all || acceptScenes,
    });
    onClose();
  };

  const handleRevisionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (revisionPrompt.trim()) {
      onRequestRevision(revisionPrompt.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-[#D5DFDE] rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#D8E3E1] flex items-center justify-between bg-[#F4F8F7]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#166E67] flex items-center justify-center text-white shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#112F2E]">Assistant Director Story Proposal</h2>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#E6F4F2] text-[#0F766E] border border-[#C5E3DF] rounded">
                  Filmmaker Review
                </span>
              </div>
              <p className="text-xs text-[#52706E]">
                Review the proposed narrative, cast, and shot list before applying to your cut.
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

        {/* Scrollable Review Content */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs bg-[#F8FAFA]">
          {/* Revision Diff Alert if this is a revision */}
          {proposal.revisionDiff && (
            <div className="p-3 bg-[#E6F4F2] border border-[#0D9488]/40 rounded-xl flex items-start gap-2.5 text-[#0F766E]">
              <Sparkles className="w-4 h-4 text-[#0D9488] shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Proposed Revision Applied: </span>
                <span>{proposal.revisionDiff}</span>
              </div>
            </div>
          )}

          {/* Synopsis & Rationale */}
          <div className="bg-white border border-[#D5DFDE] rounded-xl p-4 space-y-2 shadow-2xs">
            <div>
              <h3 className="font-bold text-[#112F2E] text-xs uppercase tracking-wider mb-1">Story Synopsis</h3>
              <p className="text-xs text-[#334A49] leading-relaxed font-sans">{proposal.synopsis}</p>
            </div>
            <div className="pt-2 border-t border-[#E5EFEF]">
              <h4 className="font-semibold text-[#52706E] text-[11px] uppercase tracking-wider">Directorial Rationale</h4>
              <p className="text-[11px] text-[#4A6462] italic mt-0.5">{proposal.rationale}</p>
            </div>
          </div>

          {/* Interactive Directorial Revision Input */}
          <div className="bg-white border border-[#D5DFDE] rounded-xl p-4 shadow-2xs">
            <h4 className="font-bold text-[#112F2E] text-xs mb-2 flex items-center gap-1.5">
              <RefreshCw className={`w-3.5 h-3.5 text-[#0D9488] ${isRevising ? 'animate-spin' : ''}`} />
              Request Directorial Revision
            </h4>
            <form onSubmit={handleRevisionSubmit} className="flex items-center gap-2">
              <input
                type="text"
                value={revisionPrompt}
                onChange={(e) => setRevisionPrompt(e.target.value)}
                placeholder="e.g. 'make Rena more guarded', 'add tense chase', 'make ending a twist'"
                className="flex-1 px-3 py-2 bg-[#F8FAFA] border border-[#D5DFDE] rounded-xl text-xs text-[#112F2E] focus:outline-none focus:border-[#0D9488] focus:bg-white"
              />
              <button
                type="submit"
                disabled={isRevising}
                className="px-4 py-2 bg-[#166E67] hover:bg-[#0F766E] text-white font-semibold text-xs rounded-xl transition-colors flex items-center gap-1 shrink-0 disabled:opacity-50 shadow-xs"
              >
                {isRevising ? 'Revising...' : 'Request Revision'}
              </button>
            </form>
            <div className="flex items-center gap-1.5 mt-2.5 text-[11px] text-[#52706E]">
              <span>Quick ideas:</span>
              <button
                type="button"
                onClick={() => setRevisionPrompt('make Rena more guarded and suspicious')}
                className="underline hover:text-[#112F2E]"
              >
                "make Rena more guarded"
              </button>
              <span>·</span>
              <button
                type="button"
                onClick={() => setRevisionPrompt('accelerate pace and add handheld camera tension')}
                className="underline hover:text-[#112F2E]"
              >
                "faster pace & handheld"
              </button>
              <span>·</span>
              <button
                type="button"
                onClick={() => setRevisionPrompt('add power cut and alarm twist at the climax')}
                className="underline hover:text-[#112F2E]"
              >
                "power blackout twist"
              </button>
            </div>
          </div>

          {/* Element Selection Checklist */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-1 border-b border-[#D8E3E1]">
              <span className="font-bold text-xs uppercase tracking-wider text-[#112F2E]">
                Proposed Film Elements to Import
              </span>
              <div className="flex items-center gap-3 text-[11px]">
                <button
                  type="button"
                  onClick={() => {
                    setAcceptCharacters(true);
                    setAcceptLocations(true);
                    setAcceptScenes(true);
                  }}
                  className="text-[#0D9488] font-semibold hover:underline"
                >
                  Select All
                </button>
                <span className="text-[#A5BDBB]">·</span>
                <button
                  type="button"
                  onClick={() => {
                    setAcceptCharacters(false);
                    setAcceptLocations(false);
                    setAcceptScenes(false);
                  }}
                  className="text-[#52706E] hover:underline"
                >
                  Deselect All
                </button>
              </div>
            </div>

            {/* Proposed Characters */}
            <div className="bg-white border border-[#D5DFDE] rounded-xl p-3.5 shadow-2xs">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-[#112F2E] mb-2">
                <input
                  type="checkbox"
                  checked={acceptCharacters}
                  onChange={(e) => setAcceptCharacters(e.target.checked)}
                  className="rounded text-[#0D9488] focus:ring-0"
                />
                <span>Proposed Cast & Characters ({proposal.suggestedCharacters.length})</span>
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-6">
                {proposal.suggestedCharacters.map((c, i) => (
                  <div key={i} className="p-2.5 bg-[#F8FAFA] rounded-lg border border-[#E0E8E7]">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center"
                        style={{ backgroundColor: c.color || '#0D9488' }}
                      >
                        {c.name[0]}
                      </span>
                      <span className="font-bold text-xs text-[#112F2E]">{c.name}</span>
                    </div>
                    <p className="text-[11px] text-[#52706E] mt-1 line-clamp-2">{c.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Proposed Locations */}
            <div className="bg-white border border-[#D5DFDE] rounded-xl p-3.5 shadow-2xs">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-[#112F2E] mb-2">
                <input
                  type="checkbox"
                  checked={acceptLocations}
                  onChange={(e) => setAcceptLocations(e.target.checked)}
                  className="rounded text-[#0D9488] focus:ring-0"
                />
                <span>Proposed Locations ({proposal.suggestedLocations.length})</span>
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-6">
                {proposal.suggestedLocations.map((l, i) => (
                  <div key={i} className="p-2.5 bg-[#F8FAFA] rounded-lg border border-[#E0E8E7]">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-[#112F2E]">{l.name}</span>
                      <span className="font-mono text-[10px] px-1 bg-[#E6F4F2] text-[#0F766E] rounded font-semibold border border-[#C5E3DF]">
                        {l.code}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#52706E] mt-1 line-clamp-2">{l.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Proposed Scenes & Shots */}
            <div className="bg-white border border-[#D5DFDE] rounded-xl p-3.5 shadow-2xs">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-[#112F2E] mb-2">
                <input
                  type="checkbox"
                  checked={acceptScenes}
                  onChange={(e) => setAcceptScenes(e.target.checked)}
                  className="rounded text-[#0D9488] focus:ring-0"
                />
                <span>
                  Proposed Scenes & Shot List ({proposal.suggestedScenes.length} scenes,{' '}
                  {proposal.suggestedScenes.reduce((acc, s) => acc + s.shots.length, 0)} shots)
                </span>
              </label>

              <div className="space-y-2 pl-6">
                {proposal.suggestedScenes.map((sc, i) => (
                  <div key={i} className="p-2.5 bg-[#F8FAFA] rounded-lg border border-[#E0E8E7]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono font-bold text-xs text-[#112F2E]">{sc.slugline}</span>
                      <span className="text-[10px] font-mono text-[#0D9488] font-semibold">
                        {sc.shots.length} shots
                      </span>
                    </div>
                    <p className="text-[11px] text-[#52706E]">{sc.summary}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-[#D8E3E1] bg-[#F4F8F7] flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-[#52706E] hover:text-[#112F2E] transition-colors"
          >
            Discard Proposal
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleApply(false)}
              disabled={!acceptCharacters && !acceptLocations && !acceptScenes}
              className="px-4 py-2 text-xs font-semibold bg-white hover:bg-[#EAF2F0] border border-[#D5DFDE] text-[#112F2E] rounded-xl transition-colors disabled:opacity-50 shadow-2xs"
            >
              Apply Selected Elements
            </button>

            <button
              type="button"
              onClick={() => handleApply(true)}
              className="px-4 py-2 text-xs font-bold bg-[#166E67] hover:bg-[#0F766E] text-white rounded-xl flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Check className="w-4 h-4" />
              <span>Accept All Proposals</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
