import React from 'react';
import { GenerationJob } from '../../types/film';
import { X, Layers, Clock, AlertCircle, CheckCircle2, RefreshCw, StopCircle } from 'lucide-react';

interface GenerationQueueDrawerProps {
  isOpen: boolean;
  jobs: GenerationJob[];
  onClose: () => void;
  onRetryJob: (jobId: string) => void;
  onCancelJob: (jobId: string) => void;
  onClearCompleted: () => void;
}

export const GenerationQueueDrawer: React.FC<GenerationQueueDrawerProps> = ({
  isOpen,
  jobs,
  onClose,
  onRetryJob,
  onCancelJob,
  onClearCompleted,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white border-l border-[#D5DFDE] shadow-2xl flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#D8E3E1] flex items-center justify-between bg-[#F4F8F7]">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#0D9488]" />
          <div>
            <h2 className="text-sm font-bold text-[#112F2E]">Video Generation Queue</h2>
            <p className="text-[11px] text-[#52706E]">
              {jobs.filter((j) => j.status === 'generating').length} active, {jobs.length} total
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onClearCompleted}
            className="px-2 py-1 text-[11px] text-[#52706E] hover:text-[#112F2E] hover:bg-[#EAF2F0] rounded"
          >
            Clear Ready
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-[#8A9E9C] hover:text-[#112F2E] hover:bg-[#EAF2F0] rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Jobs List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F8FAFA]">
        {jobs.map((job) => (
          <div
            key={job.id}
            className="p-3 bg-white border border-[#D5DFDE] rounded-xl text-xs space-y-2 shadow-2xs"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {job.status === 'generating' && (
                  <RefreshCw className="w-3.5 h-3.5 text-[#0D9488] animate-spin" />
                )}
                {job.status === 'ready' && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                )}
                {job.status === 'failed' && (
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                )}
                {job.status === 'planned' && (
                  <Clock className="w-3.5 h-3.5 text-[#52706E]" />
                )}
                <span className="font-bold text-[#112F2E]">{job.shotTitle}</span>
              </div>

              <span
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                  job.status === 'ready'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : job.status === 'generating'
                    ? 'bg-[#E6F4F2] text-[#0F766E] border border-[#C5E3DF]'
                    : job.status === 'failed'
                    ? 'bg-rose-50 text-rose-800 border border-rose-200'
                    : 'bg-[#EEF4F3] text-[#52706E]'
                }`}
              >
                {job.status}
              </span>
            </div>

            <p className="text-[11px] text-[#52706E] truncate italic">"{job.prompt}"</p>

            {/* Progress Bar if Generating */}
            {job.status === 'generating' && (
              <div className="w-full h-1.5 bg-[#E0EAE9] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#0D9488] transition-all duration-300"
                  style={{ width: `${job.progress}%` }}
                />
              </div>
            )}

            {job.error && <p className="text-[11px] text-rose-700">{job.error}</p>}

            <div className="flex items-center justify-between pt-1 text-[10px] text-[#52706E]">
              <span className="font-mono">Runtime: {job.runtimeId}</span>

              <div className="flex items-center gap-1">
                {job.status === 'generating' && (
                  <button
                    onClick={() => onCancelJob(job.id)}
                    className="hover:text-rose-700 flex items-center gap-0.5"
                  >
                    <StopCircle className="w-3 h-3" /> Cancel
                  </button>
                )}
                {job.status === 'failed' && (
                  <button
                    onClick={() => onRetryJob(job.id)}
                    className="hover:text-[#0D9488] flex items-center gap-0.5 font-bold"
                  >
                    <RefreshCw className="w-3 h-3" /> Retry
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {jobs.length === 0 && (
          <div className="py-16 text-center text-[#8A9E9C] text-xs">
            No video generation tasks in queue.
          </div>
        )}
      </div>
    </div>
  );
};
