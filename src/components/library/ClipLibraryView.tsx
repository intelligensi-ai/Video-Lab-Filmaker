/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { MediaBin, MediaClip, FilmProject } from '../../types/film';
import {
  Folder,
  FolderPlus,
  Film,
  Music,
  Image as ImageIcon,
  Upload,
  Plus,
  Search,
  Filter,
  Trash2,
  Play,
  Pause,
  ExternalLink,
  Tag,
  Clock,
  Sparkles,
  Layers,
  ArrowRight,
  MoreVertical,
  Check,
  X,
} from 'lucide-react';

interface ClipLibraryViewProps {
  project: FilmProject;
  selectedShotId?: string;
  onAddClip: (clip: Omit<MediaClip, 'id' | 'createdAt'>) => void;
  onDeleteClip: (clipId: string) => void;
  onCreateBin: (bin: Omit<MediaBin, 'id' | 'createdAt'>) => void;
  onDeleteBin: (binId: string) => void;
  onAssignClipToShot: (shotId: string, clip: MediaClip) => void;
  onAppendClipToTimeline: (clip: MediaClip) => void;
}

export const ClipLibraryView: React.FC<ClipLibraryViewProps> = ({
  project,
  selectedShotId,
  onAddClip,
  onDeleteClip,
  onCreateBin,
  onDeleteBin,
  onAssignClipToShot,
  onAppendClipToTimeline,
}) => {
  const [selectedBinId, setSelectedBinId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [mediaTypeFilter, setMediaTypeFilter] = useState<'all' | 'video' | 'audio' | 'image'>('all');
  const [previewingClipId, setPreviewingClipId] = useState<string | null>(null);

  // New Bin Modal state
  const [isCreatingBin, setIsCreatingBin] = useState(false);
  const [newBinName, setNewBinName] = useState('');
  const [newBinColor, setNewBinColor] = useState('#0D9488');

  // Drag over states
  const [isDraggingOverLibrary, setIsDraggingOverLibrary] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const bins = project.mediaBins || [];
  const clips = project.mediaClips || [];

  // Filtered clips
  const filteredClips = clips.filter((clip) => {
    const matchesBin = selectedBinId === 'all' || clip.binId === selectedBinId;
    const matchesType = mediaTypeFilter === 'all' || clip.mediaType === mediaTypeFilter;
    const matchesSearch =
      searchQuery === '' ||
      clip.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      clip.tags?.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
      clip.notes?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesBin && matchesType && matchesSearch;
  });

  // Handle file uploads from computer (drag & drop or button click)
  const handleProcessFiles = async (files: FileList | File[]) => {
    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        const isVideo = file.type.startsWith('video');
        const isAudio = file.type.startsWith('audio');
        const isImage = file.type.startsWith('image');

        if (!isVideo && !isAudio && !isImage) continue;

        const mediaType: 'video' | 'audio' | 'image' = isVideo
          ? 'video'
          : isAudio
          ? 'audio'
          : 'image';
        const url = URL.createObjectURL(file);

        // Calculate duration and resolution using temporary media element
        let duration = 4.0;
        let resolution = isVideo ? '1080p FHD' : isImage ? 'High Res Photo' : 'Stereo Audio';

        if (isVideo) {
          await new Promise<void>((resolve) => {
            const vid = document.createElement('video');
            vid.preload = 'metadata';
            vid.src = url;
            vid.onloadedmetadata = () => {
              duration = vid.duration && isFinite(vid.duration) ? +vid.duration.toFixed(1) : 4.0;
              resolution = `${vid.videoWidth}×${vid.videoHeight}`;
              resolve();
            };
            vid.onerror = () => resolve();
          });
        } else if (isAudio) {
          await new Promise<void>((resolve) => {
            const aud = document.createElement('audio');
            aud.preload = 'metadata';
            aud.src = url;
            aud.onloadedmetadata = () => {
              duration = aud.duration && isFinite(aud.duration) ? +aud.duration.toFixed(1) : 3.0;
              resolution = 'WAV 48kHz';
              resolve();
            };
            aud.onerror = () => resolve();
          });
        }

        const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
        const targetBinId = selectedBinId !== 'all' ? selectedBinId : 'bin_broll';

        onAddClip({
          binId: targetBinId,
          title: cleanTitle,
          mediaType,
          url,
          thumbnailUrl: isImage || isVideo ? url : undefined,
          duration,
          resolution,
          fps: 24,
          sizeBytes: file.size,
          tags: [mediaType, 'imported'],
          notes: `Imported ${file.name} (${(file.size / (1024 * 1024)).toFixed(1)} MB)`,
        });
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateNewBinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBinName.trim()) return;
    onCreateBin({
      name: newBinName.trim(),
      color: newBinColor,
      description: `Bin for ${newBinName.trim()} footage and takes`,
    });
    setNewBinName('');
    setIsCreatingBin(false);
  };

  const currentShot = project.scenes
    .flatMap((sc) => sc.shots)
    .find((s) => s.id === selectedShotId);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOverLibrary(true);
      }}
      onDragLeave={() => setIsDraggingOverLibrary(false)}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOverLibrary(false);
        if (e.dataTransfer.files?.length) {
          handleProcessFiles(e.dataTransfer.files);
        }
      }}
      className="flex-1 flex flex-col h-full bg-[#F8FBFA] overflow-hidden select-none relative"
    >
      {/* Hidden File Input for Native File Picker */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="video/*,audio/*,image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) handleProcessFiles(e.target.files);
        }}
      />

      {/* Global Drag-Over Overlay */}
      {isDraggingOverLibrary && (
        <div className="absolute inset-0 z-50 bg-[#0D9488]/90 text-white flex flex-col items-center justify-center p-6 text-center backdrop-blur-xs animate-pulse pointer-events-none">
          <Upload className="w-14 h-14 mb-2 animate-bounce" />
          <h2 className="text-xl font-bold">Drop Video & Audio Clips into Library</h2>
          <p className="text-xs text-white/90 font-mono mt-1">
            Files will be imported into {selectedBinId === 'all' ? 'default bin' : 'selected bin'}
          </p>
        </div>
      )}

      {/* Library Top Action Bar */}
      <div className="p-4 bg-white border-b border-[#D8E3E1] flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-2xs">
        {/* Left: Search & Filter Chips */}
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8A9E9C]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search clips by name, tags, or notes..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#F4F8F7] border border-[#D5DFDE] rounded-xl text-[#112F2E] placeholder-[#8A9E9C] focus:outline-none focus:border-[#0D9488] focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Type Filter Pills */}
          <div className="flex items-center bg-[#F2F7F6] p-0.5 rounded-xl border border-[#D8E3E1] text-[11px] font-semibold text-[#52706E]">
            <button
              onClick={() => setMediaTypeFilter('all')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                mediaTypeFilter === 'all' ? 'bg-[#166E67] text-white shadow-2xs' : 'hover:text-[#112F2E]'
              }`}
            >
              All ({clips.length})
            </button>
            <button
              onClick={() => setMediaTypeFilter('video')}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all ${
                mediaTypeFilter === 'video' ? 'bg-[#166E67] text-white shadow-2xs' : 'hover:text-[#112F2E]'
              }`}
            >
              <Film className="w-3 h-3" />
              <span>Videos</span>
            </button>
            <button
              onClick={() => setMediaTypeFilter('audio')}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all ${
                mediaTypeFilter === 'audio' ? 'bg-[#166E67] text-white shadow-2xs' : 'hover:text-[#112F2E]'
              }`}
            >
              <Music className="w-3 h-3" />
              <span>Audio</span>
            </button>
            <button
              onClick={() => setMediaTypeFilter('image')}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all ${
                mediaTypeFilter === 'image' ? 'bg-[#166E67] text-white shadow-2xs' : 'hover:text-[#112F2E]'
              }`}
            >
              <ImageIcon className="w-3 h-3" />
              <span>Stills</span>
            </button>
          </div>
        </div>

        {/* Right: Upload / Add Media Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="px-3.5 py-1.5 bg-[#166E67] hover:bg-[#0F766E] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{isUploading ? 'Importing...' : '+ Add Media'}</span>
          </button>
        </div>
      </div>

      {/* Main Split Layout: Left Bins Sidebar | Right Clips Grid */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Bins Sidebar */}
        <div className="w-56 border-r border-[#D8E3E1] bg-white p-3 flex flex-col justify-between shrink-0 overflow-y-auto">
          <div className="space-y-3">
            {/* Bins Header */}
            <div className="flex items-center justify-between px-1">
              <span className="font-bold text-[11px] uppercase tracking-wider text-[#52706E]">
                Media Bins
              </span>
              <button
                onClick={() => setIsCreatingBin(true)}
                className="p-1 text-[#166E67] hover:bg-[#EAF2F0] rounded-lg transition-colors"
                title="Create New Media Bin"
              >
                <FolderPlus className="w-4 h-4" />
              </button>
            </div>

            {/* Create Bin Input Form (when open) */}
            {isCreatingBin && (
              <form onSubmit={handleCreateNewBinSubmit} className="bg-[#F4F8F7] p-2.5 rounded-xl border border-[#D5DFDE] space-y-2">
                <span className="text-[10px] font-bold text-[#112F2E]">New Bin Name</span>
                <input
                  type="text"
                  value={newBinName}
                  onChange={(e) => setNewBinName(e.target.value)}
                  placeholder="e.g. Drone Shots"
                  autoFocus
                  className="w-full px-2 py-1 text-xs bg-white border border-[#CBD5D1] rounded-lg text-[#112F2E] focus:outline-none focus:border-[#0D9488]"
                />
                <div className="flex items-center gap-1.5">
                  {['#0D9488', '#5B4FB9', '#D97706', '#059669', '#DC2626', '#2563EB'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewBinColor(c)}
                      style={{ backgroundColor: c }}
                      className={`w-4 h-4 rounded-full transition-transform ${
                        newBinColor === c ? 'scale-125 ring-2 ring-zinc-400' : 'opacity-80 hover:opacity-100'
                      }`}
                    />
                  ))}
                </div>
                <div className="flex items-center justify-end gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsCreatingBin(false)}
                    className="px-2 py-0.5 text-[10px] font-semibold text-zinc-500 hover:text-zinc-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-2 py-0.5 text-[10px] font-bold bg-[#166E67] text-white rounded-md shadow-2xs"
                  >
                    Create
                  </button>
                </div>
              </form>
            )}

            {/* Bins List */}
            <div className="space-y-1">
              {/* All Clips Super Bin */}
              <button
                onClick={() => setSelectedBinId('all')}
                className={`w-full text-left px-2.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
                  selectedBinId === 'all'
                    ? 'bg-[#166E67] text-white shadow-xs'
                    : 'text-[#4A6462] hover:bg-[#F2F7F6] hover:text-[#112F2E]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5" />
                  <span>All Footage</span>
                </div>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                    selectedBinId === 'all' ? 'bg-white/20 text-white' : 'bg-[#E6F4F2] text-[#0F766E]'
                  }`}
                >
                  {clips.length}
                </span>
              </button>

              {/* User Bins */}
              {bins.map((bin) => {
                const count = clips.filter((c) => c.binId === bin.id).length;
                const isSelected = selectedBinId === bin.id;

                return (
                  <button
                    key={bin.id}
                    onClick={() => setSelectedBinId(bin.id)}
                    className={`w-full text-left px-2.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all group/bin ${
                      isSelected
                        ? 'bg-[#166E67] text-white shadow-xs'
                        : 'text-[#4A6462] hover:bg-[#F2F7F6] hover:text-[#112F2E]'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        style={{ backgroundColor: bin.color || '#0D9488' }}
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                      />
                      <span className="truncate">{bin.name}</span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-[#E6F4F2] text-[#0F766E]'
                        }`}
                      >
                        {count}
                      </span>
                      {bin.id !== 'bin_broll' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteBin(bin.id);
                          }}
                          className={`opacity-0 group-hover/bin:opacity-100 p-0.5 rounded hover:text-rose-500 transition-opacity ${
                            isSelected ? 'text-white' : 'text-zinc-400'
                          }`}
                          title="Delete Bin"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom Hint */}
          <div className="p-2.5 bg-[#F4F8F7] rounded-xl border border-[#D5DFDE] text-[10px] text-[#52706E] leading-relaxed">
            <p className="font-semibold text-[#112F2E] flex items-center gap-1 mb-0.5">
              <Sparkles className="w-3 h-3 text-[#0D9488]" />
              <span>Smart Bins</span>
            </p>
            Drag video and audio files from your desktop directly into this panel or bins to import immediately.
          </div>
        </div>

        {/* Right Clips Grid View */}
        <div className="flex-1 p-4 overflow-y-auto">
          {filteredClips.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
              {filteredClips.map((clip) => {
                const isVideo = clip.mediaType === 'video';
                const isAudio = clip.mediaType === 'audio';
                const isPreviewing = previewingClipId === clip.id;

                return (
                  <div
                    key={clip.id}
                    className="bg-white rounded-2xl border border-[#D5DFDE] hover:border-[#0D9488]/50 shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col group/card"
                  >
                    {/* Media Thumbnail / Preview Area */}
                    <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
                      {isAudio ? (
                        <div className="w-full h-full bg-gradient-to-br from-teal-900 to-slate-900 p-3 flex flex-col items-center justify-center text-center">
                          <Music className="w-8 h-8 text-emerald-400 mb-1" />
                          <span className="text-[10px] font-mono text-emerald-200">
                            {clip.resolution || 'Audio Stem 48kHz'}
                          </span>
                        </div>
                      ) : isPreviewing && isVideo ? (
                        <video
                          src={clip.url}
                          autoPlay
                          loop
                          muted
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <img
                          src={clip.thumbnailUrl || clip.url}
                          alt={clip.title}
                          className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-300"
                        />
                      )}

                      {/* Top Badges: Type & Duration */}
                      <div className="absolute top-2 left-2 flex items-center gap-1 z-10">
                        <span className="px-1.5 py-0.5 rounded bg-black/80 text-white text-[9px] font-bold font-mono uppercase flex items-center gap-1">
                          {isVideo && <Film className="w-2.5 h-2.5 text-cyan-400" />}
                          {isAudio && <Music className="w-2.5 h-2.5 text-emerald-400" />}
                          {!isVideo && !isAudio && <ImageIcon className="w-2.5 h-2.5 text-amber-400" />}
                          <span>{clip.mediaType}</span>
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-black/80 text-[#2DD4BF] text-[9px] font-mono font-bold">
                          {clip.duration.toFixed(1)}s
                        </span>
                      </div>

                      {/* Play / Preview Hover Overlay */}
                      {isVideo && (
                        <button
                          onClick={() =>
                            setPreviewingClipId(isPreviewing ? null : clip.id)
                          }
                          className="absolute inset-0 bg-black/40 opacity-0 group-hover/card:opacity-100 flex items-center justify-center text-white transition-opacity"
                        >
                          <div className="w-10 h-10 rounded-full bg-[#0D9488] flex items-center justify-center shadow-lg">
                            {isPreviewing ? (
                              <Pause className="w-5 h-5 fill-current" />
                            ) : (
                              <Play className="w-5 h-5 ml-0.5 fill-current" />
                            )}
                          </div>
                        </button>
                      )}
                    </div>

                    {/* Card Content */}
                    <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                      <div>
                        <div className="flex items-start justify-between gap-1">
                          <h4 className="font-bold text-xs text-[#112F2E] leading-tight line-clamp-1" title={clip.title}>
                            {clip.title}
                          </h4>
                          <button
                            onClick={() => onDeleteClip(clip.id)}
                            className="text-zinc-400 hover:text-rose-600 transition-colors shrink-0"
                            title="Delete Clip from Library"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-[10px] text-[#52706E] font-mono mt-0.5">
                          {clip.resolution} · {((clip.sizeBytes || 0) / (1024 * 1024)).toFixed(1)} MB
                        </p>
                      </div>

                      {/* Tags */}
                      {clip.tags && clip.tags.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1">
                          {clip.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="text-[9px] px-1.5 py-0.2 bg-[#F2F7F6] text-[#0F766E] border border-[#D8E5E4] rounded-md font-mono"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Action Triggers: Use as Shot Take or Append to Cut */}
                      <div className="pt-2 border-t border-[#E8EFF0] flex items-center gap-1.5">
                        {currentShot && (
                          <button
                            onClick={() => onAssignClipToShot(currentShot.id, clip)}
                            className="flex-1 py-1.5 bg-[#E6F4F2] hover:bg-[#0D9488] text-[#0F766E] hover:text-white rounded-xl text-[10px] font-bold transition-colors flex items-center justify-center gap-1"
                            title={`Assign this clip as a new take to Scene ${currentShot.shotNumber}`}
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>Take for Shot</span>
                          </button>
                        )}

                        <button
                          onClick={() => onAppendClipToTimeline(clip)}
                          className="flex-1 py-1.5 bg-[#166E67] hover:bg-[#0F766E] text-white rounded-xl text-[10px] font-bold transition-colors flex items-center justify-center gap-1 shadow-2xs"
                          title="Append as a new shot at the end of the project timeline"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Append to Cut</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-[#D5DFDE] rounded-2xl bg-white/60">
              <Film className="w-12 h-12 text-[#8A9E9C] mb-2" />
              <h3 className="font-bold text-sm text-[#112F2E]">No media found in this bin</h3>
              <p className="text-xs text-[#52706E] max-w-sm mt-1 mb-4">
                Drag and drop video, audio stems, or stills from your desktop or click below to import clips into this bin.
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-[#166E67] hover:bg-[#0F766E] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>+ Import Media from Computer</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
