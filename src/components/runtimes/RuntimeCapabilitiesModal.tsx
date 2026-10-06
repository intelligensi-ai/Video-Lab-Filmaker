import React from 'react';
import { AVAILABLE_RUNTIME_DECLARATIONS } from '../../services/runtimes/runtimeRegistry';
import { RuntimeCapability } from '../../types/film';
import { X, Cpu, Check, AlertTriangle, ShieldCheck, Zap } from 'lucide-react';

interface RuntimeCapabilitiesModalProps {
  isOpen: boolean;
  activeRuntimeId: string;
  onClose: () => void;
  onSelectRuntime: (runtimeId: string) => void;
}

export const RuntimeCapabilitiesModal: React.FC<RuntimeCapabilitiesModalProps> = ({
  isOpen,
  activeRuntimeId,
  onClose,
  onSelectRuntime,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-[#D5DFDE] rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#D8E3E1] flex items-center justify-between bg-[#F4F8F7]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#166E67] flex items-center justify-center text-white shadow-xs">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#112F2E]">Video Generation Runtimes & Capabilities</h2>
              <p className="text-xs text-[#52706E]">
                Inspect supported features before generating takes. Unsupported controls are reported honestly.
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

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs bg-[#F8FAFA]">
          {AVAILABLE_RUNTIME_DECLARATIONS.map((runtime) => {
            const isSelected = activeRuntimeId === runtime.id;

            return (
              <div
                key={runtime.id}
                className={`p-4 rounded-xl border transition-all ${
                  isSelected
                    ? 'bg-[#F0FDFA] border-[#0D9488] ring-2 ring-[#0D9488]/30 shadow-sm'
                    : 'bg-white border-[#D5DFDE] hover:border-[#0D9488]/40 hover:bg-[#F9FCFC] shadow-2xs'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-sm text-[#112F2E]">{runtime.name}</h3>
                      <span className="px-2 py-0.5 text-[9px] font-mono font-bold uppercase bg-[#E6F4F2] text-[#0F766E] border border-[#C5E3DF] rounded">
                        {runtime.badge}
                      </span>
                      {runtime.isAvailable ? (
                        <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-0.5">
                          <Check className="w-3 h-3" /> Ready
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-700 font-medium flex items-center gap-0.5">
                          <AlertTriangle className="w-3 h-3" /> Connection Stub
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#52706E] leading-relaxed">{runtime.description}</p>
                  </div>

                  <button
                    onClick={() => onSelectRuntime(runtime.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors shrink-0 shadow-2xs ${
                      isSelected
                        ? 'bg-[#166E67] text-white shadow-xs'
                        : 'bg-[#F4F8F7] hover:bg-[#EAF2F0] text-[#112F2E] border border-[#D5DFDE]'
                    }`}
                  >
                    {isSelected ? 'Active Runtime' : 'Select'}
                  </button>
                </div>

                {/* Capability Matrix Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3 pt-3 border-t border-[#E5EFEF] text-[11px]">
                  <div className="flex items-center justify-between p-2 bg-[#F8FAFA] border border-[#E0E8E7] rounded-lg">
                    <span className="text-[#52706E]">Max Shot Duration</span>
                    <span className="font-mono font-bold text-[#112F2E]">
                      {runtime.capabilities.maxShotDurationSec}s
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 bg-[#F8FAFA] border border-[#E0E8E7] rounded-lg">
                    <span className="text-[#52706E]">Camera Movement</span>
                    <span
                      className={`font-semibold ${
                        runtime.capabilities.cameraMovementControls ? 'text-emerald-700' : 'text-zinc-400'
                      }`}
                    >
                      {runtime.capabilities.cameraMovementControls ? 'Supported' : 'No'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 bg-[#F8FAFA] border border-[#E0E8E7] rounded-lg">
                    <span className="text-[#52706E]">Lighting Guidance</span>
                    <span
                      className={`font-semibold ${
                        runtime.capabilities.lightingGuidance ? 'text-emerald-700' : 'text-zinc-400'
                      }`}
                    >
                      {runtime.capabilities.lightingGuidance ? 'Supported' : 'No'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 bg-[#F8FAFA] border border-[#E0E8E7] rounded-lg">
                    <span className="text-[#52706E]">Image Conditioning</span>
                    <span
                      className={`font-semibold ${
                        runtime.capabilities.referenceImages ? 'text-emerald-700' : 'text-zinc-400'
                      }`}
                    >
                      {runtime.capabilities.referenceImages ? 'Supported' : 'No'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 bg-[#F8FAFA] border border-[#E0E8E7] rounded-lg">
                    <span className="text-[#52706E]">Dialogue LipSync</span>
                    <span
                      className={`font-semibold ${
                        runtime.capabilities.dialogueLipSync ? 'text-emerald-700' : 'text-zinc-400'
                      }`}
                    >
                      {runtime.capabilities.dialogueLipSync ? 'Native' : 'External Stem'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 bg-[#F8FAFA] border border-[#E0E8E7] rounded-lg">
                    <span className="text-[#52706E]">Character LoRA</span>
                    <span
                      className={`font-semibold ${
                        runtime.capabilities.loraIdentity ? 'text-emerald-700' : 'text-zinc-400'
                      }`}
                    >
                      {runtime.capabilities.loraIdentity ? 'Supported' : 'No'}
                    </span>
                  </div>
                </div>

                {runtime.notice && (
                  <div className="mt-2 text-[10px] text-[#52706E] italic">
                    Note: {runtime.notice}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#D8E3E1] bg-[#F4F8F7] flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#166E67] text-white text-xs font-semibold rounded-xl hover:bg-[#0F766E] transition-colors shadow-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
