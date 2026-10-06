/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { FilmProject, MediaBin, MediaClip } from '../../types/film';
import { ClipLibraryView } from './ClipLibraryView';
import { VideoLabLogo } from '../common/VideoLabLogo';
import { X, Film, Folder } from 'lucide-react';

interface ClipLibraryModalProps {
  isOpen: boolean;
  project: FilmProject;
  selectedShotId?: string;
  onClose: () => void;
  onAddClip: (clip: Omit<MediaClip, 'id' | 'createdAt'>) => void;
  onDeleteClip: (clipId: string) => void;
  onCreateBin: (bin: Omit<MediaBin, 'id' | 'createdAt'>) => void;
  onDeleteBin: (binId: string) => void;
  onAssignClipToShot: (shotId: string, clip: MediaClip) => void;
  onAppendClipToTimeline: (clip: MediaClip) => void;
}

export const ClipLibraryModal: React.FC<ClipLibraryModalProps> = ({
  isOpen,
  project,
  selectedShotId,
  onClose,
  onAddClip,
  onDeleteClip,
  onCreateBin,
  onDeleteBin,
  onAssignClipToShot,
  onAppendClipToTimeline,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-hidden">
      <div className="bg-white border border-[#CBD5D1] rounded-2xl w-full max-w-6xl h-[88vh] shadow-2xl overflow-hidden flex flex-col my-auto">
        {/* Modal Top Header */}
        <div className="px-5 py-3 border-b border-[#D8E3E1] flex items-center justify-between bg-[#F4F8F7] shrink-0">
          <div className="flex items-center gap-3">
            <VideoLabLogo height={22} />
            <div className="h-4 w-px bg-[#D5DFDE]" />
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-[#112F2E]">Clip & Media Library</h2>
              <span className="text-[10px] font-bold text-[#0F766E] uppercase px-1.5 py-0.2 bg-[#E6F4F2] border border-[#C5E3DF] rounded">
                Media Bins
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body: Embedded ClipLibraryView */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <ClipLibraryView
            project={project}
            selectedShotId={selectedShotId}
            onAddClip={onAddClip}
            onDeleteClip={onDeleteClip}
            onCreateBin={onCreateBin}
            onDeleteBin={onDeleteBin}
            onAssignClipToShot={(shotId, clip) => {
              onAssignClipToShot(shotId, clip);
              onClose();
            }}
            onAppendClipToTimeline={(clip) => {
              onAppendClipToTimeline(clip);
              onClose();
            }}
          />
        </div>
      </div>
    </div>
  );
};
