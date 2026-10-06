import React, { useState } from 'react';
import { Shot, Take, FilmProject, ShotType } from '../../types/film';
import {
  X,
  Plus,
  Upload,
  Sparkles,
  CheckCircle2,
  Trash2,
  Edit2,
  Play,
  Layers,
  AlertTriangle,
  Film,
  Video,
  Camera,
} from 'lucide-react';

interface TakeManagerModalProps {
  isOpen: boolean;
  shot: Shot | null;
  project: FilmProject;
  isGenerating: boolean;
  onClose: () => void;
  onSelectCutTake: (shotId: string, takeId: string) => void;
  onGenerateNewTake: (shotId: string, promptOverride?: string) => void;
  onUploadTakeMedia: (shotId: string, file: File) => void;
  onRenameTake: (shotId: string, takeId: string, newLabel: string) => void;
  onDeleteTake: (shotId: string, takeId: string) => void;
  onUpdateShotCameraAngle?: (shotId: string, shotType: ShotType) => void;
}

export const TakeManagerModal: React.FC<TakeManagerModalProps> = ({
  isOpen,
  shot,
  project,
  isGenerating,
  onClose,
  onSelectCutTake,
  onGenerateNewTake,
  onUploadTakeMedia,
  onRenameTake,
  onDeleteTake,
  onUpdateShotCameraAngle,
}) => {
  const [promptOverride, setPromptOverride] = useState('');
  const [editingTakeId, setEditingTakeId] = useState<string | null>(null);
  const [editLabelInput, setEditLabelInput] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [draggingOverTakeId, setDraggingOverTakeId] = useState<string | null>(null);

  if (!isOpen || !shot) return null;

  const currentScene = project.scenes.find((sc) => sc.shots.some((s) => s.id === shot.id));

  const CAMERA_ANGLES: { type: ShotType; label: string }[] = [
    { type: 'overhead', label: 'Overhead' },
    { type: 'close-up', label: 'Close-Up' },
    { type: 'wide', label: 'Wide' },
    { type: 'two-shot', label: 'Two-Shot' },
    { type: 'reaction', label: 'Reaction' },
    { type: 'custom', label: 'Custom' },
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach((f) => onUploadTakeMedia(shot.id, f));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files || []);
    files.forEach((f) => onUploadTakeMedia(shot.id, f));
  };

  const handleStartRename = (take: Take) => {
    setEditingTakeId(take.id);
    setEditLabelInput(take.label);
  };

  const handleSaveRename = (takeId: string) => {
    if (editLabelInput.trim()) {
      onRenameTake(shot.id, takeId, editLabelInput.trim());
    }
    setEditingTakeId(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-[#D5DFDE] rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#D8E3E1] flex items-center justify-between bg-[#F4F8F7]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#166E67] flex items-center justify-center text-white shadow-xs">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-[#112F2E]">
                  Take Comparison & Camera Angles — Scene {currentScene?.sceneNumber}.{shot.shotNumber}
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-[#E6F4F2] text-[#0F766E] border border-[#C5E3DF] rounded">
                  {shot.shotType}
                </span>
              </div>
              <p className="text-xs text-[#52706E] italic truncate max-w-lg">"{shot.action}"</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-[#8A9E9C] hover:text-[#112F2E] hover:bg-[#EAF2F0] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera Angle Switcher Bar */}
        <div className="px-6 py-2.5 bg-[#EEF4F3] border-b border-[#D8E3E1] flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-[#0D9488]" />
            <span className="font-semibold text-[#112F2E]">Camera Angle:</span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {CAMERA_ANGLES.map(({ type, label }) => (
              <button
                key={type}
                onClick={() => onUpdateShotCameraAngle?.(shot.id, type)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  shot.shotType === type
                    ? 'bg-[#166E67] text-white shadow-xs'
                    : 'bg-white text-[#4A6462] hover:text-[#112F2E] hover:bg-[#E7EFEB] border border-[#D5DFDE]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs bg-[#F8FAFA]">
          {/* Top Actions: Generate New Take or Upload Take */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Generate Take Card */}
            <div className="bg-white border border-[#D5DFDE] rounded-xl p-4 flex flex-col justify-between shadow-2xs">
              <div>
                <h3 className="font-bold text-[#112F2E] text-xs flex items-center gap-1.5 mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#0D9488]" />
                  Generate Additional Demo Take
                </h3>
                <p className="text-[11px] text-[#52706E] mb-3">
                  Creates a new alternative take without overwriting previous versions.
                </p>
                <input
                  type="text"
                  placeholder="Optional prompt tweak (e.g. 'Add heavy amber backlight')..."
                  value={promptOverride}
                  onChange={(e) => setPromptOverride(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[#F8FAFA] border border-[#D5DFDE] rounded-xl text-xs mb-3 focus:outline-none focus:border-[#0D9488] focus:bg-white text-[#112F2E]"
                />
              </div>

              <button
                type="button"
                disabled={isGenerating}
                onClick={() => {
                  onGenerateNewTake(shot.id, promptOverride);
                  setPromptOverride('');
                }}
                className="w-full py-2 bg-[#166E67] hover:bg-[#0F766E] text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-xs"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isGenerating ? 'Rendering Take...' : 'Generate New Take'}</span>
              </button>
            </div>

            {/* Upload Take Drag-and-Drop Card */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                isDragOver ? 'border-[#0D9488] bg-[#CCFBF1] ring-2 ring-[#0D9488]/30 scale-[1.01]' : 'border-[#D5DFDE] bg-white hover:border-[#0D9488]/50'
              }`}
            >
              <Upload className="w-8 h-8 text-[#0D9488] mb-2" />
              <p className="font-bold text-xs text-[#112F2E]">Drag & Drop Real Video Take</p>
              <p className="text-[11px] text-[#52706E] max-w-xs mt-0.5 mb-3">
                Drop MP4, WebM, or MOV files here. Video duration and playback will sync automatically.
              </p>

              <label className="px-4 py-1.5 bg-[#F4F8F7] hover:bg-[#EAF2F0] border border-[#D5DFDE] text-[#112F2E] font-semibold text-xs rounded-xl cursor-pointer transition-colors shadow-2xs">
                Browse Video Files
                <input
                  type="file"
                  accept="video/*,video/mp4,video/webm,video/quicktime,image/*"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Takes Comparison List */}
          <div>
            <div className="flex items-center justify-between mb-3 pb-1 border-b border-[#D8E3E1]">
              <span className="font-bold text-xs uppercase tracking-wider text-[#112F2E]">
                Available Takes for this Shot ({shot.takes.length})
              </span>
              <span className="text-[11px] text-[#52706E]">
                Select which take is used in the program cut or drop video on a take to replace
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {shot.takes.map((take) => {
                const isSelectedCut =
                  take.id === shot.selectedTakeId ||
                  (!shot.selectedTakeId && take.takeNumber === 1);
                const isDragOverTake = draggingOverTakeId === take.id;

                return (
                  <div
                    key={take.id}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDraggingOverTakeId(take.id);
                    }}
                    onDragLeave={() => setDraggingOverTakeId(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDraggingOverTakeId(null);
                      const file = e.dataTransfer.files?.[0];
                      if (file) {
                        onUploadTakeMedia(shot.id, file);
                      }
                    }}
                    className={`relative rounded-xl border p-3 flex flex-col justify-between transition-all ${
                      isDragOverTake
                        ? 'bg-[#CCFBF1] border-[#0D9488] ring-4 ring-[#0D9488]/40 scale-[1.01]'
                        : isSelectedCut
                        ? 'bg-[#F0FDFA] border-[#0D9488] ring-2 ring-[#0D9488]/30 shadow-md'
                        : 'bg-white border-[#D5DFDE] hover:border-[#0D9488]/40 hover:bg-[#F9FCFC] shadow-2xs'
                    }`}
                  >
                    <div>
                      {/* Thumbnail / Player Preview */}
                      <div className="aspect-video bg-black rounded-lg overflow-hidden relative mb-2 shadow-inner">
                        {take.mediaType === 'video' ? (
                          <video
                            src={take.mediaUrl}
                            controls
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <img
                            src={take.mediaUrl}
                            alt={take.label}
                            className="w-full h-full object-cover"
                          />
                        )}

                        {/* Cut Status Tag */}
                        {isSelectedCut ? (
                          <div className="absolute top-2 left-2 px-2 py-0.5 bg-[#0D9488] text-white font-bold text-[10px] rounded-md shadow-xs flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>IN ACTIVE CUT</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => onSelectCutTake(shot.id, take.id)}
                            className="absolute top-2 left-2 px-2 py-0.5 bg-black/70 hover:bg-[#0D9488] text-white text-[10px] font-medium rounded-md backdrop-blur-xs transition-colors"
                          >
                            Set for Cut
                          </button>
                        )}

                        {/* Take Type Pill */}
                        <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/70 text-white font-mono text-[9px] rounded-md backdrop-blur-xs">
                          {take.mediaType === 'video' ? 'REAL VIDEO' : 'STILL FRAME'}
                        </div>

                        {/* Duration badge */}
                        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/80 text-emerald-400 font-mono text-[9px] rounded">
                          {take.duration}s
                        </div>
                      </div>

                      {/* Take Label & Rename */}
                      <div className="flex items-center justify-between mb-1">
                        {editingTakeId === take.id ? (
                          <div className="flex items-center gap-1 flex-1 mr-2">
                            <input
                              type="text"
                              value={editLabelInput}
                              onChange={(e) => setEditLabelInput(e.target.value)}
                              onBlur={() => handleSaveRename(take.id)}
                              onKeyDown={(e) => e.key === 'Enter' && handleSaveRename(take.id)}
                              autoFocus
                              className="w-full px-2 py-0.5 bg-white border border-[#0D9488] rounded text-xs font-semibold text-[#112F2E]"
                            />
                            <button
                              onClick={() => handleSaveRename(take.id)}
                              className="px-2 py-0.5 bg-[#166E67] text-white rounded font-bold text-xs"
                            >
                              Save
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 flex-1 min-w-0">
                            <span className="font-bold text-xs text-[#112F2E] truncate">
                              {take.label}
                            </span>
                            <button
                              onClick={() => handleStartRename(take)}
                              className="p-0.5 text-[#8A9E9C] hover:text-[#112F2E]"
                              title="Rename Take"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>

                      {take.notes && (
                        <p className="text-[11px] text-[#52706E] line-clamp-2 italic mb-2">
                          {take.notes}
                        </p>
                      )}
                    </div>

                    {/* Bottom row actions */}
                    <div className="pt-2 border-t border-[#E5EFEF] flex items-center justify-between text-[11px] text-[#52706E]">
                      <span className="font-mono">
                        {new Date(take.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>

                      {shot.takes.length > 1 && (
                        <button
                          onClick={() => onDeleteTake(shot.id, take.id)}
                          className="text-rose-700 hover:text-rose-800 flex items-center gap-1 hover:underline"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
