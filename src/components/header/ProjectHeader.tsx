import React, { useState } from 'react';
import { FilmProject } from '../../types/film';
import {
  Film,
  Sparkles,
  Play,
  Layers,
  Cpu,
  Download,
  FolderOpen,
  Copy,
  Plus,
  Trash2,
  CheckCircle2,
  HardDrive,
  ChevronDown,
} from 'lucide-react';
import { StorageQuotaInfo } from '../../services/storage/projectStorage';
import { VideoLabLogo } from '../common/VideoLabLogo';

interface ProjectHeaderProps {
  project: FilmProject;
  projectsList: Array<{ id: string; title: string; updatedAt: number }>;
  quotaInfo: StorageQuotaInfo;
  isSaving: boolean;
  onRenameProject: (newTitle: string) => void;
  onSelectProject: (projectId: string) => void;
  onNewProject: () => void;
  onDuplicateProject: () => void;
  onDeleteProject: () => void;
  onOpenBrief: () => void;
  onOpenTableRead: () => void;
  onOpenQueue: () => void;
  onOpenRuntimes: () => void;
  onOpenExport: () => void;
}

export const ProjectHeader: React.FC<ProjectHeaderProps> = ({
  project,
  projectsList,
  quotaInfo,
  isSaving,
  onRenameProject,
  onSelectProject,
  onNewProject,
  onDuplicateProject,
  onDeleteProject,
  onOpenBrief,
  onOpenTableRead,
  onOpenQueue,
  onOpenRuntimes,
  onOpenExport,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(project.title);
  const [showProjectMenu, setShowProjectMenu] = useState(false);

  const handleTitleSubmit = () => {
    if (titleInput.trim() && titleInput.trim() !== project.title) {
      onRenameProject(titleInput.trim());
    }
    setIsEditingTitle(false);
  };

  return (
    <header className="relative z-30 h-14 border-b border-[#D6DFDE] bg-white/90 backdrop-blur-md px-4 flex items-center justify-between text-[#192C2B]">
      {/* Zone 1: Brand & Project Identity */}
      <div className="flex items-center gap-4">
        {/* Official VideoLab Brand Logo */}
        <div className="flex items-center pr-4 border-r border-[#D6DFDE]">
          <VideoLabLogo height={28} />
        </div>

        {/* Tier Indicator Pill: Creator · Filmmaker · Studio */}
        <div className="hidden md:flex items-center bg-[#EDF3F2] p-0.5 rounded-full border border-[#D1DDD9] text-[10px] font-semibold text-[#607D78]">
          <span className="px-2 py-0.5 rounded-full text-[#829E9A]">CREATOR</span>
          <span className="px-2 py-0.5 rounded-full bg-[#166E67] text-white shadow-2xs">FILMMAKER</span>
          <span className="px-2 py-0.5 rounded-full text-[#829E9A]">STUDIO</span>
        </div>

        {/* Project Selector & Title */}
        <div className="relative flex items-center gap-2 pl-1">
          {isEditingTitle ? (
            <input
              type="text"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTitleSubmit();
                if (e.key === 'Escape') {
                  setTitleInput(project.title);
                  setIsEditingTitle(false);
                }
              }}
              autoFocus
              className="px-2.5 py-1 text-xs font-semibold bg-white border border-[#166E67] rounded-md text-[#192C2B] focus:outline-none shadow-xs"
            />
          ) : (
            <button
              onClick={() => setIsEditingTitle(true)}
              title="Click to rename project"
              className="text-xs font-bold hover:text-[#166E67] transition-colors truncate max-w-[190px] text-left"
            >
              {project.title}
            </button>
          )}

          {/* Project Dropdown Trigger */}
          <button
            onClick={() => setShowProjectMenu(!showProjectMenu)}
            className="p-1 text-[#607D78] hover:text-[#192C2B] rounded hover:bg-[#EDF3F2] transition-colors"
            title="Projects Menu"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>

          {/* Project Dropdown Menu */}
          {showProjectMenu && (
            <div
              className="absolute left-0 top-9 w-64 bg-white border border-[#D6DFDE] rounded-xl shadow-xl py-1.5 z-50 text-xs"
              onMouseLeave={() => setShowProjectMenu(false)}
            >
              <div className="px-3 py-1.5 font-medium text-[#607D78] uppercase tracking-wider text-[10px]">
                Active Film Projects
              </div>
              <div className="max-h-48 overflow-y-auto divide-y divide-[#EDF3F2]">
                {projectsList.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      onSelectProject(p.id);
                      setTitleInput(p.title);
                      setShowProjectMenu(false);
                    }}
                    className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-[#F2F7F6] ${
                      p.id === project.id ? 'font-semibold text-[#166E67] bg-[#EDF3F2]/70' : 'text-[#192C2B]'
                    }`}
                  >
                    <span className="truncate">{p.title}</span>
                    {p.id === project.id && <CheckCircle2 className="w-3 h-3 text-[#166E67] shrink-0" />}
                  </button>
                ))}
              </div>
              <div className="border-t border-[#D6DFDE] mt-1 pt-1">
                <button
                  onClick={() => {
                    onNewProject();
                    setShowProjectMenu(false);
                  }}
                  className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-[#F2F7F6] text-[#192C2B]"
                >
                  <Plus className="w-3.5 h-3.5 text-[#166E67]" /> New Film Project
                </button>
                <button
                  onClick={() => {
                    onDuplicateProject();
                    setShowProjectMenu(false);
                  }}
                  className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-[#F2F7F6] text-[#192C2B]"
                >
                  <Copy className="w-3.5 h-3.5 text-[#0D9488]" /> Duplicate Current Cut
                </button>
                {projectsList.length > 1 && (
                  <button
                    onClick={() => {
                      onDeleteProject();
                      setShowProjectMenu(false);
                    }}
                    className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-rose-50 text-rose-700"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete Film Project
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Auto-save & Quota state */}
          <div className="flex items-center gap-1.5 text-[11px] text-[#607D78] pl-2 border-l border-[#D6DFDE]">
            {isSaving ? (
              <span className="text-[#166E67] animate-pulse">Saving...</span>
            ) : (
              <span className="flex items-center gap-1 text-[#166E67] font-medium">
                <CheckCircle2 className="w-3 h-3" /> Saved
              </span>
            )}
            <span aria-hidden="true">·</span>
            <span
              className="flex items-center gap-1 cursor-help hover:text-[#192C2B]"
              title={`Local Storage: ${(quotaInfo.usedBytes / (1024 * 1024)).toFixed(1)} MB used (${
                quotaInfo.percentage
              }%). Large clips stored via IndexedDB.`}
            >
              <HardDrive className="w-3 h-3 text-[#607D78]" />
              {quotaInfo.percentage}%
            </span>
          </div>
        </div>
      </div>

      {/* Zone 2: Primary Filmmaking Workstation Actions */}
      <div className="flex items-center gap-2">
        {/* Story Brief & Assistant Director */}
        <button
          onClick={onOpenBrief}
          className="px-3.5 py-1.5 text-xs font-semibold bg-[#166E67] text-white rounded-lg hover:bg-[#135E58] transition-colors flex items-center gap-1.5 shadow-xs"
          title="Master Story Brief & Assistant Director Proposals"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#2DD4BF]" />
          <span>Assistant Director</span>
        </button>

        {/* Table Read Mode */}
        <button
          onClick={onOpenTableRead}
          className="px-3 py-1.5 text-xs font-semibold bg-white hover:bg-[#F2F7F6] text-[#192C2B] border border-[#CBD5D1] rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
          title="Play scene cards and dialogue before generation"
        >
          <Play className="w-3.5 h-3.5 text-[#166E67]" />
          <span>Table Read</span>
        </button>

        {/* Generation Queue */}
        <button
          onClick={onOpenQueue}
          className="px-2.5 py-1.5 text-xs font-medium bg-white hover:bg-[#F2F7F6] text-[#192C2B] border border-[#CBD5D1] rounded-lg transition-colors flex items-center gap-1 shadow-2xs"
          title="View Generation Queue"
        >
          <Layers className="w-3.5 h-3.5 text-[#607D78]" />
          <span>Queue</span>
        </button>

        {/* Runtime Capabilities */}
        <button
          onClick={onOpenRuntimes}
          className="px-2.5 py-1.5 text-xs font-medium bg-white hover:bg-[#F2F7F6] text-[#192C2B] border border-[#CBD5D1] rounded-lg transition-colors flex items-center gap-1 shadow-2xs"
          title="Selected Video Runtime & Capabilities"
        >
          <Cpu className="w-3.5 h-3.5 text-[#166E67]" />
          <span className="truncate max-w-[90px]">
            {project.activeRuntimeId === 'local_demo_engine' ? 'Local Demo' : 'Deploy Studio'}
          </span>
        </button>

        {/* Export Movie */}
        <button
          onClick={onOpenExport}
          className="px-3.5 py-1.5 text-xs font-bold bg-[#2DD4BF] text-[#0A433D] rounded-lg hover:bg-[#20C0AC] transition-all flex items-center gap-1.5 shadow-xs hover:scale-[1.02] active:scale-95 cursor-pointer"
          title="Export Movie with social presets, audio mastering & formats"
        >
          <Film className="w-3.5 h-3.5" />
          <span>Export Movie</span>
        </button>
      </div>
    </header>
  );
};
