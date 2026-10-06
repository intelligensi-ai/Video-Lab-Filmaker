/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  FilmProject,
  Character,
  Location,
  Scene,
  Shot,
  ShotType,
  AssistantDirectorProposal,
  GenerationJob,
  Take,
  SfxClip,
  MediaBin,
  MediaClip,
  getEffectiveShotDuration,
} from './types/film';
import { INITIAL_SAMPLE_PROJECT } from './data/sampleProject';
import { projectStorage, StorageQuotaInfo } from './services/storage/projectStorage';
import { extractVideoMetadata } from './services/media/videoMetadata';
import { geminiAssistantDirector } from './services/assistantDirector/geminiAdapter';
import { getRuntime } from './services/runtimes/runtimeRegistry';
import { TableReadItem } from './services/speech/tableReadService';

import { ProjectHeader } from './components/header/ProjectHeader';
import { KandinskyGraphic } from './components/background/KandinskyGraphic';
import { ScriptView } from './components/script/ScriptView';
import { CharacterView } from './components/characters/CharacterView';
import { LocationView } from './components/locations/LocationView';
import { ClipLibraryView } from './components/library/ClipLibraryView';
import { ClipLibraryModal } from './components/library/ClipLibraryModal';
import { VideoPreviewPlayer } from './components/player/VideoPreviewPlayer';
import { Timeline } from './components/timeline/Timeline';

import { MasterBriefModal } from './components/brief/MasterBriefModal';
import { ProposalReviewModal } from './components/assistantDirector/ProposalReviewModal';
import { TakeManagerModal } from './components/takes/TakeManagerModal';
import { TableReadModal } from './components/speech/TableReadModal';
import { GenerationQueueDrawer } from './components/queue/GenerationQueueDrawer';
import { RuntimeCapabilitiesModal } from './components/runtimes/RuntimeCapabilitiesModal';
import { ExportModal } from './components/export/ExportModal';

import { FileText, Users, MapPin, Film, Folder } from 'lucide-react';

export default function App() {
  const [project, setProject] = useState<FilmProject>(INITIAL_SAMPLE_PROJECT);
  const [projectsList, setProjectsList] = useState<
    Array<{ id: string; title: string; updatedAt: number }>
  >([]);
  const [isSaving, setIsSaving] = useState(false);
  const [quotaInfo, setQuotaInfo] = useState<StorageQuotaInfo>({
    usedBytes: 0,
    quotaBytes: 1024 * 1024 * 1024,
    percentage: 1,
    isNearLimit: false,
  });

  // Left panel navigation tab
  const [activeTab, setActiveTab] = useState<'script' | 'characters' | 'library' | 'locations'>('script');
  const [isClipLibraryModalOpen, setIsClipLibraryModalOpen] = useState(false);

  // Active selected shot (synced across script, player, and timeline)
  const [selectedShotId, setSelectedShotId] = useState<string>(
    INITIAL_SAMPLE_PROJECT.scenes[0]?.shots[0]?.id || ''
  );

  // Global cut playback coordinator for timeline & preview player
  const [isPlayingCut, setIsPlayingCut] = useState(false);
  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [isLoopingCut, setIsLoopingCut] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [timelineInPoint, setTimelineInPoint] = useState<number | null>(null);
  const [timelineOutPoint, setTimelineOutPoint] = useState<number | null>(null);

  const handleSelectShot = useCallback((shotId: string) => {
    setSelectedShotId(shotId);
    const allShots = project.scenes.flatMap((sc) => sc.shots);
    let acc = 0;
    for (const s of allShots) {
      if (s.id === shotId) {
        setCurrentTimeSec(acc);
        break;
      }
      acc += getEffectiveShotDuration(s);
    }
  }, [project.scenes]);

  const handleTogglePlayCut = useCallback(() => {
    setIsPlayingCut((prev) => !prev);
  }, []);

  const handleSeekCutTime = useCallback((timeSec: number) => {
    setCurrentTimeSec(timeSec);
  }, []);

  const handleToggleLoopCut = useCallback(() => {
    setIsLoopingCut((prev) => !prev);
  }, []);

  const handleChangePlaybackRate = useCallback((rate: number) => {
    setPlaybackRate(rate);
  }, []);

  const handleSetTimelineInOut = useCallback((inPoint: number | null, outPoint: number | null) => {
    setTimelineInPoint(inPoint);
    setTimelineOutPoint(outPoint);
  }, []);

  const handleJumpCut = useCallback(
    (direction: 'prev' | 'next' | 'start' | 'end') => {
      const allShots = project.scenes.flatMap((sc) => sc.shots);
      if (allShots.length === 0) return;

      let acc = 0;
      const shotTimes: { id: string; start: number; end: number }[] = [];
      for (const s of allShots) {
        const dur = getEffectiveShotDuration(s);
        shotTimes.push({ id: s.id, start: acc, end: acc + dur });
        acc += dur;
      }
      const totalCutDur = acc;

      if (direction === 'start') {
        const startT = timelineInPoint !== null ? timelineInPoint : 0;
        setCurrentTimeSec(startT);
        if (allShots[0]) setSelectedShotId(allShots[0].id);
        return;
      }

      if (direction === 'end') {
        const endT = timelineOutPoint !== null ? timelineOutPoint : totalCutDur;
        setCurrentTimeSec(endT);
        if (allShots.length > 0) setSelectedShotId(allShots[allShots.length - 1].id);
        return;
      }

      const curIdx = shotTimes.findIndex(
        (st) => currentTimeSec >= st.start - 0.05 && currentTimeSec < st.end
      );

      if (direction === 'prev') {
        if (curIdx > 0) {
          const cur = shotTimes[curIdx];
          if (currentTimeSec - cur.start > 0.4) {
            setCurrentTimeSec(cur.start);
            setSelectedShotId(cur.id);
          } else {
            const prev = shotTimes[curIdx - 1];
            setCurrentTimeSec(prev.start);
            setSelectedShotId(prev.id);
          }
        } else if (curIdx === 0) {
          setCurrentTimeSec(0);
        }
      } else if (direction === 'next') {
        if (curIdx >= 0 && curIdx < shotTimes.length - 1) {
          const next = shotTimes[curIdx + 1];
          setCurrentTimeSec(next.start);
          setSelectedShotId(next.id);
        } else {
          setCurrentTimeSec(totalCutDur);
        }
      }
    },
    [project.scenes, currentTimeSec, timelineInPoint, timelineOutPoint]
  );

  const handleStepFrame = useCallback(
    (deltaSec: number) => {
      const allShots = project.scenes.flatMap((sc) => sc.shots);
      let total = 0;
      for (const s of allShots) total += getEffectiveShotDuration(s);
      const newTime = Math.max(0, Math.min(total, +(currentTimeSec + deltaSec).toFixed(3)));
      setCurrentTimeSec(newTime);

      let acc = 0;
      for (const s of allShots) {
        const dur = getEffectiveShotDuration(s);
        if (newTime >= acc && newTime < acc + dur) {
          setSelectedShotId(s.id);
          break;
        }
        acc += dur;
      }
    },
    [project.scenes, currentTimeSec]
  );

  const handlePlayShot = useCallback((shotId: string) => {
    handleSelectShot(shotId);
    setIsPlayingCut(true);
  }, [handleSelectShot]);

  // Left vs Right Panel Width Split (percentage, default 52% left, 48% right)
  const [leftPanelWidthPct, setLeftPanelWidthPct] = useState(52);
  const [isDraggingDivider, setIsDraggingDivider] = useState(false);

  // Modals & Drawers state
  const [isBriefOpen, setIsBriefOpen] = useState(false);
  const [isProposalOpen, setIsProposalOpen] = useState(false);
  const [isTakeManagerOpen, setIsTakeManagerOpen] = useState(false);
  const [isTableReadOpen, setIsTableReadOpen] = useState(false);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isRuntimesOpen, setIsRuntimesOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Active Proposal state
  const [currentProposal, setCurrentProposal] = useState<AssistantDirectorProposal | null>(null);
  const [isGeneratingProposal, setIsGeneratingProposal] = useState(false);
  const [isRevisingProposal, setIsRevisingProposal] = useState(false);

  // Generation Queue state
  const [generationJobs, setGenerationJobs] = useState<GenerationJob[]>([]);

  // Table read item callback
  const [activeTableReadItem, setActiveTableReadItem] = useState<TableReadItem | null>(null);

  // Load project on mount
  useEffect(() => {
    async function init() {
      const list = await projectStorage.listProjects();
      setProjectsList(list);

      const activeId = projectStorage.getActiveProjectId() || INITIAL_SAMPLE_PROJECT.id;
      const loaded = await projectStorage.getProject(activeId);
      if (loaded) {
        const hasAnySfx = loaded.scenes.some((sc) =>
          sc.shots.some((sh) => sh.sfxClips && sh.sfxClips.length > 0) || (sc.sfxClips && sc.sfxClips.length > 0)
        );
        if (!hasAnySfx && loaded.id === INITIAL_SAMPLE_PROJECT.id) {
          loaded.scenes = INITIAL_SAMPLE_PROJECT.scenes;
        }
        setProject(loaded);
        const firstShot = loaded.scenes[0]?.shots[0]?.id;
        if (firstShot) setSelectedShotId(firstShot);
      }

      const quota = await projectStorage.getQuota();
      setQuotaInfo(quota);
    }
    init();
  }, []);

  // Auto-save project whenever it changes
  const saveCurrentProject = useCallback(async (updated: FilmProject) => {
    setIsSaving(true);
    setProject(updated);
    await projectStorage.saveProject(updated);
    const list = await projectStorage.listProjects();
    setProjectsList(list);
    const quota = await projectStorage.getQuota();
    setQuotaInfo(quota);
    setTimeout(() => setIsSaving(false), 300);
  }, []);

  // Divider resize handlers
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingDivider) return;
      const containerWidth = window.innerWidth;
      const newPct = Math.max(30, Math.min(70, (e.clientX / containerWidth) * 100));
      setLeftPanelWidthPct(newPct);
    };

    const handleMouseUp = () => {
      setIsDraggingDivider(false);
    };

    if (isDraggingDivider) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingDivider]);

  // Project Management Handlers
  const handleRenameProject = (newTitle: string) => {
    const updated = { ...project, title: newTitle };
    saveCurrentProject(updated);
  };

  const handleSelectProject = async (id: string) => {
    const p = await projectStorage.getProject(id);
    if (p) {
      setProject(p);
      projectStorage.setActiveProjectId(id);
      const firstShot = p.scenes[0]?.shots[0]?.id;
      if (firstShot) setSelectedShotId(firstShot);
    }
  };

  const handleNewProject = async () => {
    const newProj: FilmProject = {
      id: `proj_${Date.now()}`,
      title: 'Untitled Film',
      brief: {
        title: 'Untitled Film',
        premise: 'A new story waiting to be filmed.',
        targetDuration: '60 seconds',
        aspectRatio: '16:9',
        tone: 'Cinematic Noir',
        styleNotes: 'Rich lighting and measured pacing.',
      },
      characters: [],
      locations: [],
      scenes: [
        {
          id: `scene_${Date.now()}`,
          sceneNumber: 1,
          slugline: 'INT. NEW LOCATION - DAY',
          summary: 'The opening scene.',
          timeOfDay: 'DAY',
          scriptElements: [
            { id: `el_${Date.now()}_1`, type: 'action', text: 'Scene opening action...' },
          ],
          shots: [
            {
              id: `shot_${Date.now()}`,
              sceneId: `scene_${Date.now()}`,
              shotNumber: 1,
              shotType: 'wide',
              action: 'Establishing wide angle of the location.',
              cameraMovement: 'static',
              lighting: 'soft diffused natural',
              duration: 3.5,
              takes: [],
            },
          ],
        },
      ],
      transitions: {},
      activeRuntimeId: 'local_demo_engine',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await saveCurrentProject(newProj);
    projectStorage.setActiveProjectId(newProj.id);
    setSelectedShotId(newProj.scenes[0].shots[0].id);
  };

  const handleDuplicateProject = async () => {
    const dup = await projectStorage.duplicateProject(project.id);
    setProject(dup);
    projectStorage.setActiveProjectId(dup.id);
    const list = await projectStorage.listProjects();
    setProjectsList(list);
  };

  const handleDeleteProject = async () => {
    if (projectsList.length <= 1) return;
    await projectStorage.deleteProject(project.id);
    const remaining = projectsList.filter((p) => p.id !== project.id);
    setProjectsList(remaining);
    if (remaining[0]) {
      handleSelectProject(remaining[0].id);
    }
  };

  // Character Management Handlers
  const handleAddCharacter = (char: Character) => {
    const updated = { ...project, characters: [...project.characters, char] };
    saveCurrentProject(updated);
  };

  const handleUpdateCharacter = (char: Character) => {
    const updated = {
      ...project,
      characters: project.characters.map((c) => (c.id === char.id ? char : c)),
    };
    saveCurrentProject(updated);
  };

  const handleDeleteCharacter = (charId: string) => {
    const updated = {
      ...project,
      characters: project.characters.filter((c) => c.id !== charId),
    };
    saveCurrentProject(updated);
  };

  // Location Management Handlers
  const handleAddLocation = (loc: Location) => {
    const updated = { ...project, locations: [...project.locations, loc] };
    saveCurrentProject(updated);
  };

  const handleUpdateLocation = (loc: Location) => {
    const updated = {
      ...project,
      locations: project.locations.map((l) => (l.id === loc.id ? loc : l)),
    };
    saveCurrentProject(updated);
  };

  const handleDeleteLocation = (locId: string) => {
    const updated = {
      ...project,
      locations: project.locations.filter((l) => l.id !== locId),
    };
    saveCurrentProject(updated);
  };

  // Scene & Shot Management Handlers
  const handleUpdateScene = (updatedScene: Scene) => {
    const updated = {
      ...project,
      scenes: project.scenes.map((sc) => (sc.id === updatedScene.id ? updatedScene : sc)),
    };
    saveCurrentProject(updated);
  };

  const handleAddScene = () => {
    const newSceneNumber = project.scenes.length + 1;
    const newSceneId = `scene_${Date.now()}`;
    const newShotId = `shot_${Date.now()}_1`;

    const newScene: Scene = {
      id: newSceneId,
      sceneNumber: newSceneNumber,
      slugline: `INT. LOCATION ${newSceneNumber} - NIGHT`,
      summary: 'New scene beat.',
      timeOfDay: 'NIGHT',
      scriptElements: [
        { id: `el_${Date.now()}_1`, type: 'action', text: 'Action beat begins...' },
      ],
      shots: [
        {
          id: newShotId,
          sceneId: newSceneId,
          shotNumber: 1,
          shotType: 'wide',
          action: 'Wide shot covering the new scene entrance.',
          cameraMovement: 'static',
          lighting: 'warm tungsten',
          duration: 3.5,
          takes: [],
        },
      ],
    };

    const updated = { ...project, scenes: [...project.scenes, newScene] };
    saveCurrentProject(updated);
    setSelectedShotId(newShotId);
  };

  const handleDeleteScene = (sceneId: string) => {
    const updatedScenes = project.scenes
      .filter((s) => s.id !== sceneId)
      .map((s, idx) => ({ ...s, sceneNumber: idx + 1 }));
    const updated = { ...project, scenes: updatedScenes };
    saveCurrentProject(updated);
    if (updatedScenes[0]?.shots[0]) {
      setSelectedShotId(updatedScenes[0].shots[0].id);
    }
  };

  const handleAddShotToScene = (sceneId: string, shotType: ShotType = 'close-up') => {
    const newScenes = project.scenes.map((scene) => {
      if (scene.id === sceneId) {
        const nextNumber = scene.shots.length + 1;
        const newShotId = `shot_${Date.now()}_${nextNumber}`;
        const newShot: Shot = {
          id: newShotId,
          sceneId: scene.id,
          shotNumber: nextNumber,
          shotType,
          action: `${shotType.toUpperCase()} framing on character action and environment.`,
          cameraMovement: 'static',
          lighting: 'high-contrast noir',
          duration: 3.5,
          takes: [],
        };
        setSelectedShotId(newShotId);
        return {
          ...scene,
          shots: [...scene.shots, newShot],
        };
      }
      return scene;
    });

    saveCurrentProject({ ...project, scenes: newScenes });
  };

  // Assistant Director Proposal Flows
  const handleAskAssistantDirector = async (brief: typeof project.brief) => {
    setIsGeneratingProposal(true);
    setIsBriefOpen(false);
    try {
      const proposal = await geminiAssistantDirector.propose(brief);
      setCurrentProposal(proposal);
      setIsProposalOpen(true);
    } catch (e) {
      console.error('Failed to generate proposal:', e);
    } finally {
      setIsGeneratingProposal(false);
    }
  };

  const handleRequestRevision = async (revisionText: string) => {
    if (!currentProposal) return;
    setIsRevisingProposal(true);
    try {
      const revised = await geminiAssistantDirector.revise(
        currentProposal,
        revisionText,
        project.brief
      );
      setCurrentProposal(revised);
    } catch (e) {
      console.error('Failed to revise proposal:', e);
    } finally {
      setIsRevisingProposal(false);
    }
  };

  const handleApplyProposal = (
    proposal: AssistantDirectorProposal,
    selection: {
      acceptCharacters: boolean;
      acceptLocations: boolean;
      acceptScenes: boolean;
    }
  ) => {
    const updated = { ...project };

    // 1. Characters
    if (selection.acceptCharacters) {
      const newChars: Character[] = proposal.suggestedCharacters.map((c, i) => ({
        id: `char_prop_${Date.now()}_${i}`,
        name: c.name,
        description: c.description,
        color: c.color || '#5B4FB9',
        initials: c.name[0] || '?',
        voiceNotes: c.voiceNotes,
        costumeNotes: c.costumeNotes,
        sceneAppearances: 1,
        isAuto: true,
      }));
      // Merge uniquely by name
      const existingNames = new Set(updated.characters.map((c) => c.name.toUpperCase()));
      newChars.forEach((nc) => {
        if (!existingNames.has(nc.name.toUpperCase())) {
          updated.characters.push(nc);
        }
      });
    }

    // 2. Locations
    if (selection.acceptLocations) {
      const newLocs: Location[] = proposal.suggestedLocations.map((l, i) => ({
        id: `loc_prop_${Date.now()}_${i}`,
        name: l.name,
        type: l.type,
        description: l.description,
        code: l.code || 'III',
        sceneAppearances: 1,
      }));
      const existingNames = new Set(updated.locations.map((l) => l.name.toUpperCase()));
      newLocs.forEach((nl) => {
        if (!existingNames.has(nl.name.toUpperCase())) {
          updated.locations.push(nl);
        }
      });
    }

    // 3. Scenes
    if (selection.acceptScenes && proposal.suggestedScenes.length > 0) {
      const importedScenes: Scene[] = proposal.suggestedScenes.map((sc, scIdx) => {
        const scId = `scene_prop_${Date.now()}_${scIdx}`;
        return {
          id: scId,
          sceneNumber: sc.sceneNumber,
          slugline: sc.slugline,
          summary: sc.summary,
          timeOfDay: sc.timeOfDay,
          scriptElements: sc.scriptElements.map((el, elIdx) => {
            const elId = `el_prop_${Date.now()}_${scIdx}_${elIdx}`;
            if (el.type === 'dialogue') {
              const matchedChar = updated.characters.find(
                (c) => c.name.toUpperCase() === el.characterName?.toUpperCase()
              );
              return {
                id: elId,
                type: 'dialogue' as const,
                characterId: matchedChar?.id || updated.characters[0]?.id || 'char_rena',
                text: el.text || '',
                parenthetical: el.parenthetical,
              };
            } else if (el.type === 'pause') {
              return {
                id: elId,
                type: 'pause' as const,
                durationSeconds: el.durationSeconds || 1.5,
                notes: el.notes,
              };
            } else {
              return {
                id: elId,
                type: 'action' as const,
                text: el.text || '',
              };
            }
          }),
          shots: sc.shots.map((sh, shIdx) => ({
            id: `shot_prop_${Date.now()}_${scIdx}_${shIdx}`,
            sceneId: scId,
            shotNumber: shIdx + 1,
            shotType: sh.shotType,
            action: sh.action,
            cameraMovement: sh.cameraMovement,
            lighting: sh.lighting,
            duration: sh.duration,
            dialogueSnippet: sh.dialogueSnippet,
            takes: [],
          })),
        };
      });

      updated.scenes = importedScenes;
      if (importedScenes[0]?.shots[0]) {
        setSelectedShotId(importedScenes[0].shots[0].id);
      }
    }

    saveCurrentProject(updated);
  };

  // Media Library & Clip Bins Handlers
  const handleAddMediaClip = useCallback((newClip: Omit<MediaClip, 'id' | 'createdAt'>) => {
    const clip: MediaClip = {
      ...newClip,
      id: `clip_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      createdAt: Date.now(),
    };
    setProject((prev) => {
      const updated = {
        ...prev,
        mediaClips: [clip, ...(prev.mediaClips || [])],
        updatedAt: Date.now(),
      };
      saveCurrentProject(updated);
      return updated;
    });
  }, []);

  const handleDeleteMediaClip = useCallback((clipId: string) => {
    setProject((prev) => {
      const updated = {
        ...prev,
        mediaClips: (prev.mediaClips || []).filter((c) => c.id !== clipId),
        updatedAt: Date.now(),
      };
      saveCurrentProject(updated);
      return updated;
    });
  }, []);

  const handleCreateBin = useCallback((newBin: Omit<MediaBin, 'id' | 'createdAt'>) => {
    const bin: MediaBin = {
      ...newBin,
      id: `bin_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      createdAt: Date.now(),
    };
    setProject((prev) => {
      const updated = {
        ...prev,
        mediaBins: [...(prev.mediaBins || []), bin],
        updatedAt: Date.now(),
      };
      saveCurrentProject(updated);
      return updated;
    });
  }, []);

  const handleDeleteBin = useCallback((binId: string) => {
    setProject((prev) => {
      const updated = {
        ...prev,
        mediaBins: (prev.mediaBins || []).filter((b) => b.id !== binId),
        mediaClips: (prev.mediaClips || []).map((c) =>
          c.binId === binId ? { ...c, binId: 'bin_broll' } : c
        ),
        updatedAt: Date.now(),
      };
      saveCurrentProject(updated);
      return updated;
    });
  }, []);

  const handleAssignClipToShot = useCallback((shotId: string, clip: MediaClip) => {
    setProject((prev) => {
      const newScenes = prev.scenes.map((scene) => ({
        ...scene,
        shots: scene.shots.map((shot) => {
          if (shot.id !== shotId) return shot;
          const newTake: Take = {
            id: `take_${Date.now()}`,
            shotId: shot.id,
            takeNumber: (shot.takes?.length || 0) + 1,
            label: `Take ${(shot.takes?.length || 0) + 1} (${clip.title})`,
            type: 'uploaded',
            mediaUrl: clip.url,
            mediaType: clip.mediaType === 'audio' ? 'video' : clip.mediaType,
            thumbnailUrl: clip.thumbnailUrl || clip.url,
            duration: clip.duration || 4.0,
            inPoint: 0,
            outPoint: clip.duration || 4.0,
            createdAt: Date.now(),
            isSelected: true,
            status: 'ready',
            notes: clip.notes || `Assigned from ${clip.title}`,
          };
          const updatedTakes = shot.takes.map((t) => ({ ...t, isSelected: false })).concat(newTake);
          return {
            ...shot,
            duration: clip.duration || shot.duration,
            selectedTakeId: newTake.id,
            takes: updatedTakes,
          };
        }),
      }));
      const updated = { ...prev, scenes: newScenes, updatedAt: Date.now() };
      saveCurrentProject(updated);
      return updated;
    });
  }, []);

  const handleAppendClipToTimeline = useCallback((clip: MediaClip) => {
    setProject((prev) => {
      const lastScene = prev.scenes[prev.scenes.length - 1];
      if (!lastScene) return prev;
      const newShotId = `shot_${Date.now()}`;
      const newTake: Take = {
        id: `take_${Date.now()}`,
        shotId: newShotId,
        takeNumber: 1,
        label: `Take 1 (${clip.title})`,
        type: 'uploaded',
        mediaUrl: clip.url,
        mediaType: clip.mediaType === 'audio' ? 'video' : clip.mediaType,
        thumbnailUrl: clip.thumbnailUrl || clip.url,
        duration: clip.duration || 4.0,
        inPoint: 0,
        outPoint: clip.duration || 4.0,
        createdAt: Date.now(),
        isSelected: true,
        status: 'ready',
        notes: `Imported from Clip Library`,
      };
      const newShot: Shot = {
        id: newShotId,
        sceneId: lastScene.id,
        shotNumber: lastScene.shots.length + 1,
        shotType: 'custom',
        action: `Coverage of ${clip.title}`,
        cameraMovement: 'static',
        lighting: 'cinematic golden hour',
        duration: clip.duration || 4.0,
        selectedTakeId: newTake.id,
        takes: [newTake],
      };
      const updatedScenes = prev.scenes.map((sc) =>
        sc.id === lastScene.id ? { ...sc, shots: [...sc.shots, newShot] } : sc
      );
      const updated = { ...prev, scenes: updatedScenes, updatedAt: Date.now() };
      saveCurrentProject(updated);
      return updated;
    });
  }, []);

  // Takes & Video Generation Handlers
  const handleSelectCutTake = (shotId: string, takeId: string) => {
    const newScenes = project.scenes.map((sc) => ({
      ...sc,
      shots: sc.shots.map((shot) => {
        if (shot.id === shotId) {
          return {
            ...shot,
            selectedTakeId: takeId,
            takes: shot.takes.map((t) => ({ ...t, isSelected: t.id === takeId })),
          };
        }
        return shot;
      }),
    }));
    saveCurrentProject({ ...project, scenes: newScenes });
  };

  const handleGenerateNewTake = async (shotId: string, promptOverride?: string) => {
    // Locate the shot
    let targetShot: Shot | undefined;
    for (const sc of project.scenes) {
      const found = sc.shots.find((s) => s.id === shotId);
      if (found) {
        targetShot = found;
        break;
      }
    }
    if (!targetShot) return;

    const runtime = getRuntime(project.activeRuntimeId);

    // Create job entry in queue
    const jobId = `job_${Date.now()}`;
    const newJob: GenerationJob = {
      id: jobId,
      shotId,
      shotTitle: `Shot ${targetShot.shotNumber} (${targetShot.shotType})`,
      takeNumber: (targetShot.takes?.length || 0) + 1,
      runtimeId: runtime.declaration.name,
      status: 'generating',
      progress: 10,
      startedAt: Date.now(),
      prompt: promptOverride || targetShot.action,
    };
    setGenerationJobs((prev) => [newJob, ...prev]);

    try {
      const take = await runtime.generateTake(
        {
          shot: targetShot,
          project,
          characters: project.characters,
          promptOverride,
        },
        (pct) => {
          setGenerationJobs((prev) =>
            prev.map((j) => (j.id === jobId ? { ...j, progress: pct } : j))
          );
        }
      );

      // Append new take without overwriting previous takes
      const newScenes = project.scenes.map((sc) => ({
        ...sc,
        shots: sc.shots.map((shot) => {
          if (shot.id === shotId) {
            const existing = shot.takes || [];
            return {
              ...shot,
              selectedTakeId: take.id, // Auto-select new take
              takes: [...existing.map((t) => ({ ...t, isSelected: false })), take],
            };
          }
          return shot;
        }),
      }));

      await saveCurrentProject({ ...project, scenes: newScenes });

      setGenerationJobs((prev) =>
        prev.map((j) =>
          j.id === jobId ? { ...j, status: 'ready', progress: 100, createdTakeId: take.id } : j
        )
      );
    } catch (err: any) {
      setGenerationJobs((prev) =>
        prev.map((j) =>
          j.id === jobId ? { ...j, status: 'failed', error: err.message || 'Generation failed' } : j
        )
      );
    }
  };

  const handleUploadTakeMedia = async (shotId: string, file: File) => {
    const isVideo = file.type.startsWith('video') || /\.(mp4|webm|mov|m4v|mkv)$/i.test(file.name);
    let videoDuration = 3.5;
    let videoThumbnail: string | undefined;

    if (isVideo) {
      try {
        const meta = await extractVideoMetadata(file);
        videoDuration = meta.duration;
        videoThumbnail = meta.thumbnailUrl;
      } catch (e) {
        console.warn('Failed to extract video metadata:', e);
      }
    }

    const { url } = await projectStorage.saveMedia(file, 'take');
    const cleanName = file.name.replace(/\.[^/.]+$/, '');

    const newScenes = project.scenes.map((sc) => ({
      ...sc,
      shots: sc.shots.map((shot) => {
        if (shot.id === shotId) {
          const existing = shot.takes || [];
          const nextTakeNumber = existing.length + 1;
          const newTake: Take = {
            id: `take_up_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            shotId,
            takeNumber: nextTakeNumber,
            label: `Take ${nextTakeNumber} (${cleanName})`,
            type: 'uploaded',
            mediaUrl: url,
            mediaType: isVideo ? 'video' : 'image',
            duration: isVideo ? videoDuration : (shot.duration || 3.5),
            inPoint: 0,
            outPoint: isVideo ? videoDuration : (shot.duration || 3.5),
            createdAt: Date.now(),
            isSelected: true,
            status: 'ready',
            notes: isVideo ? `Uploaded video (${videoDuration}s)` : `Uploaded still frame`,
          };
          return {
            ...shot,
            duration: isVideo ? videoDuration : shot.duration,
            selectedTakeId: newTake.id,
            takes: [...existing.map((t) => ({ ...t, isSelected: false })), newTake],
          };
        }
        return shot;
      }),
    }));

    await saveCurrentProject({ ...project, scenes: newScenes });
    setSelectedShotId(shotId);
  };

  const handleUpdateTakeInOut = useCallback(
    async (shotId: string, takeId: string, inPoint: number, outPoint: number) => {
      const trimmedDuration = Math.max(0.2, +(outPoint - inPoint).toFixed(2));
      const newScenes = project.scenes.map((sc) => ({
        ...sc,
        shots: sc.shots.map((shot) => {
          if (shot.id === shotId) {
            const updatedTakes = shot.takes.map((t) => {
              if (t.id === takeId) {
                return {
                  ...t,
                  inPoint,
                  outPoint,
                  duration: t.duration || outPoint,
                };
              }
              return t;
            });

            const isActiveTake =
              shot.selectedTakeId === takeId ||
              (!shot.selectedTakeId && updatedTakes[0]?.id === takeId);

            return {
              ...shot,
              duration: isActiveTake ? trimmedDuration : shot.duration,
              takes: updatedTakes,
            };
          }
          return shot;
        }),
      }));

      await saveCurrentProject({ ...project, scenes: newScenes });
    },
    [project, saveCurrentProject]
  );

  const handleAddSfxToShot = useCallback(
    async (shotId: string, clip: SfxClip) => {
      const newScenes = project.scenes.map((sc) => ({
        ...sc,
        shots: sc.shots.map((shot) => {
          if (shot.id === shotId) {
            const existing = shot.sfxClips || [];
            return {
              ...shot,
              sfxClips: [...existing, clip],
            };
          }
          return shot;
        }),
      }));
      await saveCurrentProject({ ...project, scenes: newScenes });
    },
    [project, saveCurrentProject]
  );

  const handleRemoveSfxFromShot = useCallback(
    async (shotId: string, clipId: string) => {
      const newScenes = project.scenes.map((sc) => ({
        ...sc,
        shots: sc.shots.map((shot) => {
          if (shot.id === shotId) {
            return {
              ...shot,
              sfxClips: (shot.sfxClips || []).filter((c) => c.id !== clipId),
            };
          }
          return shot;
        }),
      }));
      await saveCurrentProject({ ...project, scenes: newScenes });
    },
    [project, saveCurrentProject]
  );

  const handleUpdateSfxClip = useCallback(
    async (shotId: string, clipId: string, updates: Partial<SfxClip>) => {
      const newScenes = project.scenes.map((sc) => ({
        ...sc,
        shots: sc.shots.map((shot) => {
          if (shot.id === shotId) {
            return {
              ...shot,
              sfxClips: (shot.sfxClips || []).map((c) =>
                c.id === clipId ? { ...c, ...updates } : c
              ),
            };
          }
          return shot;
        }),
      }));
      await saveCurrentProject({ ...project, scenes: newScenes });
    },
    [project, saveCurrentProject]
  );

  const handleAddSfxToScene = useCallback(
    async (sceneId: string, clip: SfxClip) => {
      const newScenes = project.scenes.map((sc) => {
        if (sc.id === sceneId) {
          return {
            ...sc,
            sfxClips: [...(sc.sfxClips || []), clip],
          };
        }
        return sc;
      });
      await saveCurrentProject({ ...project, scenes: newScenes });
    },
    [project, saveCurrentProject]
  );

  const handleRemoveSfxFromScene = useCallback(
    async (sceneId: string, clipId: string) => {
      const newScenes = project.scenes.map((sc) => {
        if (sc.id === sceneId) {
          return {
            ...sc,
            sfxClips: (sc.sfxClips || []).filter((c) => c.id !== clipId),
          };
        }
        return sc;
      });
      await saveCurrentProject({ ...project, scenes: newScenes });
    },
    [project, saveCurrentProject]
  );

  const handleDropVideoToNewShot = async (sceneId: string, file: File, cameraAngle: ShotType = 'wide') => {
    const isVideo = file.type.startsWith('video') || /\.(mp4|webm|mov|m4v|mkv)$/i.test(file.name);
    let videoDuration = 3.5;

    if (isVideo) {
      try {
        const meta = await extractVideoMetadata(file);
        videoDuration = meta.duration;
      } catch (e) {
        console.warn('Failed to extract video metadata:', e);
      }
    }

    const { url } = await projectStorage.saveMedia(file, 'take');
    const cleanName = file.name.replace(/\.[^/.]+$/, '');

    const targetScene = project.scenes.find((s) => s.id === sceneId) || project.scenes[0];
    if (!targetScene) return;

    const nextNumber = targetScene.shots.length + 1;
    const newShotId = `shot_${Date.now()}_${nextNumber}`;
    const newTakeId = `take_up_${Date.now()}`;

    const newTake: Take = {
      id: newTakeId,
      shotId: newShotId,
      takeNumber: 1,
      label: `Take 1 (${cleanName})`,
      type: 'uploaded',
      mediaUrl: url,
      mediaType: isVideo ? 'video' : 'image',
      duration: isVideo ? videoDuration : 3.5,
      inPoint: 0,
      outPoint: isVideo ? videoDuration : 3.5,
      createdAt: Date.now(),
      isSelected: true,
      status: 'ready',
      notes: `Uploaded video · ${cameraAngle.toUpperCase()}`,
    };

    const newShot: Shot = {
      id: newShotId,
      sceneId: targetScene.id,
      shotNumber: nextNumber,
      shotType: cameraAngle,
      action: `${cameraAngle.toUpperCase()} framing with uploaded video: "${file.name}".`,
      cameraMovement: 'static',
      lighting: 'cinematic golden hour',
      duration: isVideo ? videoDuration : 3.5,
      selectedTakeId: newTakeId,
      takes: [newTake],
    };

    const newScenes = project.scenes.map((s) => {
      if (s.id === targetScene.id) {
        return {
          ...s,
          shots: [...s.shots, newShot],
        };
      }
      return s;
    });

    await saveCurrentProject({ ...project, scenes: newScenes });
    setSelectedShotId(newShotId);
  };

  const handleUpdateShotCameraAngle = (shotId: string, shotType: ShotType) => {
    const newScenes = project.scenes.map((sc) => ({
      ...sc,
      shots: sc.shots.map((sh) => (sh.id === shotId ? { ...sh, shotType } : sh)),
    }));
    saveCurrentProject({ ...project, scenes: newScenes });
  };

  const handleRenameTake = (shotId: string, takeId: string, newLabel: string) => {
    const newScenes = project.scenes.map((sc) => ({
      ...sc,
      shots: sc.shots.map((shot) => {
        if (shot.id === shotId) {
          return {
            ...shot,
            takes: shot.takes.map((t) => (t.id === takeId ? { ...t, label: newLabel } : t)),
          };
        }
        return shot;
      }),
    }));
    saveCurrentProject({ ...project, scenes: newScenes });
  };

  const handleDeleteTake = (shotId: string, takeId: string) => {
    const newScenes = project.scenes.map((sc) => ({
      ...sc,
      shots: sc.shots.map((shot) => {
        if (shot.id === shotId) {
          const remaining = shot.takes.filter((t) => t.id !== takeId);
          return {
            ...shot,
            selectedTakeId: remaining[0]?.id || '',
            takes: remaining,
          };
        }
        return shot;
      }),
    }));
    saveCurrentProject({ ...project, scenes: newScenes });
  };

  // Find currently selected shot object
  const currentSelectedShot = project.scenes
    .flatMap((s) => s.shots)
    .find((s) => s.id === selectedShotId) || null;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#F6F2E9] text-[#2B2620] relative font-sans">
      {/* Kandinsky Geometric Nodes & Arcs Background */}
      <KandinskyGraphic />

      {/* Top Application Bar */}
      <ProjectHeader
        project={project}
        projectsList={projectsList}
        quotaInfo={quotaInfo}
        isSaving={isSaving}
        onRenameProject={handleRenameProject}
        onSelectProject={handleSelectProject}
        onNewProject={handleNewProject}
        onDuplicateProject={handleDuplicateProject}
        onDeleteProject={handleDeleteProject}
        onOpenBrief={() => setIsBriefOpen(true)}
        onOpenTableRead={() => setIsTableReadOpen(true)}
        onOpenQueue={() => setIsQueueOpen(true)}
        onOpenRuntimes={() => setIsRuntimesOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
      />

      {/* Main Resizable Workspace */}
      <div className="flex-1 flex overflow-hidden relative z-10">
        {/* Left Panel: Script, Characters, Locations (White & Teal Workspace) */}
        <div
          style={{ width: `${leftPanelWidthPct}%` }}
          className="h-full flex flex-col border-r border-[#D5DFDE] bg-white/95 backdrop-blur-md overflow-hidden shadow-xs"
        >
          {/* Tabs matching Intelligensi White & Teal UI */}
          <div className="h-11 px-4 bg-[#F4F8F7] border-b border-[#D8E3E1] flex items-center gap-2 shrink-0">
            {/* Script Tab */}
            <button
              onClick={() => setActiveTab('script')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'script'
                  ? 'bg-[#166E67] text-white shadow-xs'
                  : 'text-[#4A6462] hover:text-[#112F2E] hover:bg-[#E7EFEB]'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Script</span>
            </button>

            {/* Characters Tab with Count Badge */}
            <button
              onClick={() => setActiveTab('characters')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'characters'
                  ? 'bg-[#166E67] text-white shadow-xs'
                  : 'text-[#4A6462] hover:text-[#112F2E] hover:bg-[#E7EFEB]'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Characters</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  activeTab === 'characters' ? 'bg-white/25 text-white' : 'bg-[#D6E3E1] text-[#166E67]'
                }`}
              >
                {project.characters.length}
              </span>
            </button>

            {/* Library of Clips Tab & Button (Supports Bins, Drag & Drop, Take Assignment) */}
            <button
              onClick={() => setActiveTab('library')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'library'
                  ? 'bg-[#166E67] text-white shadow-xs'
                  : 'text-[#4A6462] hover:text-[#112F2E] hover:bg-[#E7EFEB]'
              }`}
              title="Open Library of Video Clips & Media Bins"
            >
              <Film className="w-3.5 h-3.5" />
              <span>Clips Library</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  activeTab === 'library' ? 'bg-white/25 text-white' : 'bg-[#D6E3E1] text-[#166E67]'
                }`}
              >
                {project.mediaClips?.length || 0}
              </span>
            </button>

            {/* Locations Tab with Count Badge */}
            <button
              onClick={() => setActiveTab('locations')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'locations'
                  ? 'bg-[#166E67] text-white shadow-xs'
                  : 'text-[#4A6462] hover:text-[#112F2E] hover:bg-[#E7EFEB]'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Locations</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  activeTab === 'locations' ? 'bg-white/25 text-white' : 'bg-[#D6E3E1] text-[#166E67]'
                }`}
              >
                {project.locations.length}
              </span>
            </button>
          </div>

          {/* Left Panel View Content */}
          <div className="flex-1 overflow-hidden bg-[#F8FAFA]">
            {activeTab === 'script' && (
              <ScriptView
                scenes={project.scenes}
                characters={project.characters}
                locations={project.locations}
                selectedShotId={selectedShotId}
                onSelectShot={handleSelectShot}
                onUpdateScene={handleUpdateScene}
                onAddScene={handleAddScene}
                onDeleteScene={handleDeleteScene}
                onAddShotToScene={handleAddShotToScene}
                onUploadTakeMedia={handleUploadTakeMedia}
                onDropVideoToNewShot={handleDropVideoToNewShot}
                onUpdateShotCameraAngle={handleUpdateShotCameraAngle}
              />
            )}
            {activeTab === 'characters' && (
              <CharacterView
                characters={project.characters}
                onAddCharacter={handleAddCharacter}
                onUpdateCharacter={handleUpdateCharacter}
                onDeleteCharacter={handleDeleteCharacter}
              />
            )}
            {activeTab === 'library' && (
              <ClipLibraryView
                project={project}
                selectedShotId={selectedShotId}
                onAddClip={handleAddMediaClip}
                onDeleteClip={handleDeleteMediaClip}
                onCreateBin={handleCreateBin}
                onDeleteBin={handleDeleteBin}
                onAssignClipToShot={handleAssignClipToShot}
                onAppendClipToTimeline={handleAppendClipToTimeline}
              />
            )}
            {activeTab === 'locations' && (
              <LocationView
                locations={project.locations}
                onAddLocation={handleAddLocation}
                onUpdateLocation={handleUpdateLocation}
                onDeleteLocation={handleDeleteLocation}
              />
            )}
          </div>
        </div>

        {/* Resizable Splitter Bar */}
        <div
          onMouseDown={() => setIsDraggingDivider(true)}
          className="w-1.5 bg-[#D5DFDE] hover:bg-[#0D9488] cursor-col-resize transition-colors shrink-0 flex items-center justify-center group"
          title="Drag to resize workspace panels"
        >
          <div className="w-0.5 h-6 bg-[#A8B8B7] group-hover:bg-white rounded" />
        </div>

        {/* Right Panel: Large Video Monitor Preview Player */}
        <div
          style={{ width: `${100 - leftPanelWidthPct}%` }}
          className="h-full flex flex-col bg-[#141414] overflow-hidden"
        >
          <VideoPreviewPlayer
            project={project}
            selectedShotId={selectedShotId}
            tableReadActive={isTableReadOpen}
            activeTableReadItem={activeTableReadItem}
            onSelectShot={handleSelectShot}
            onOpenTakeManager={(shotId) => {
              setSelectedShotId(shotId);
              setIsTakeManagerOpen(true);
            }}
            onQuickGenerateTake={(shotId) => handleGenerateNewTake(shotId)}
            onUploadTakeMedia={handleUploadTakeMedia}
            onUpdateTakeInOut={handleUpdateTakeInOut}
            isPlayingCut={isPlayingCut}
            onTogglePlayCut={handleTogglePlayCut}
            currentTimeSec={currentTimeSec}
            onSeekCutTime={handleSeekCutTime}
            onTimeUpdateCut={(t) => setCurrentTimeSec(t)}
            isLoopingCut={isLoopingCut}
            onToggleLoopCut={handleToggleLoopCut}
            playbackRate={playbackRate}
            timelineInPoint={timelineInPoint}
            timelineOutPoint={timelineOutPoint}
          />
        </div>
      </div>

      {/* Bottom Multi-Track Timeline */}
      <Timeline
        project={project}
        selectedShotId={selectedShotId}
        onSelectShot={handleSelectShot}
        onUpdateProject={saveCurrentProject}
        onOpenTakeManager={(shotId) => {
          setSelectedShotId(shotId);
          setIsTakeManagerOpen(true);
        }}
        onUploadTakeMedia={handleUploadTakeMedia}
        onDropVideoToNewShot={handleDropVideoToNewShot}
        isPlayingCut={isPlayingCut}
        currentTimeSec={currentTimeSec}
        onTogglePlayCut={handleTogglePlayCut}
        onSeekCutTime={handleSeekCutTime}
        onPlayShot={handlePlayShot}
        isLoopingCut={isLoopingCut}
        onToggleLoopCut={handleToggleLoopCut}
        playbackRate={playbackRate}
        onChangePlaybackRate={handleChangePlaybackRate}
        timelineInPoint={timelineInPoint}
        timelineOutPoint={timelineOutPoint}
        onSetTimelineInOut={handleSetTimelineInOut}
        onStepFrame={handleStepFrame}
        onJumpCut={handleJumpCut}
        onAddSfxToShot={handleAddSfxToShot}
        onRemoveSfxFromShot={handleRemoveSfxFromShot}
        onUpdateSfxClip={handleUpdateSfxClip}
        onAddSfxToScene={handleAddSfxToScene}
        onRemoveSfxFromScene={handleRemoveSfxFromScene}
      />

      {/* Modals & Dialogs */}
      <MasterBriefModal
        isOpen={isBriefOpen}
        brief={project.brief}
        isGenerating={isGeneratingProposal}
        onClose={() => setIsBriefOpen(false)}
        onSaveBrief={(b) => saveCurrentProject({ ...project, brief: b })}
        onAskAssistantDirector={handleAskAssistantDirector}
      />

      <ProposalReviewModal
        isOpen={isProposalOpen}
        proposal={currentProposal}
        brief={project.brief}
        isRevising={isRevisingProposal}
        onClose={() => setIsProposalOpen(false)}
        onApplyProposal={handleApplyProposal}
        onRequestRevision={handleRequestRevision}
      />

      <TakeManagerModal
        isOpen={isTakeManagerOpen}
        shot={currentSelectedShot}
        project={project}
        isGenerating={generationJobs.some((j) => j.status === 'generating')}
        onClose={() => setIsTakeManagerOpen(false)}
        onSelectCutTake={handleSelectCutTake}
        onGenerateNewTake={handleGenerateNewTake}
        onUploadTakeMedia={handleUploadTakeMedia}
        onRenameTake={handleRenameTake}
        onDeleteTake={handleDeleteTake}
        onUpdateShotCameraAngle={handleUpdateShotCameraAngle}
      />

      <TableReadModal
        isOpen={isTableReadOpen}
        scenes={project.scenes}
        characters={project.characters}
        onClose={() => {
          setIsTableReadOpen(false);
          setActiveTableReadItem(null);
        }}
        onActiveItemChange={(item) => setActiveTableReadItem(item)}
      />

      <GenerationQueueDrawer
        isOpen={isQueueOpen}
        jobs={generationJobs}
        onClose={() => setIsQueueOpen(false)}
        onRetryJob={(jobId) => {
          const j = generationJobs.find((x) => x.id === jobId);
          if (j) handleGenerateNewTake(j.shotId);
        }}
        onCancelJob={(jobId) => {
          setGenerationJobs((prev) =>
            prev.map((j) => (j.id === jobId ? { ...j, status: 'failed', error: 'Cancelled' } : j))
          );
        }}
        onClearCompleted={() => {
          setGenerationJobs((prev) => prev.filter((j) => j.status !== 'ready'));
        }}
      />

      <RuntimeCapabilitiesModal
        isOpen={isRuntimesOpen}
        activeRuntimeId={project.activeRuntimeId}
        onClose={() => setIsRuntimesOpen(false)}
        onSelectRuntime={(rid) => {
          saveCurrentProject({ ...project, activeRuntimeId: rid });
          setIsRuntimesOpen(false);
        }}
      />

      <ExportModal
        isOpen={isExportOpen}
        project={project}
        currentTimeSec={currentTimeSec}
        timelineInPoint={timelineInPoint}
        timelineOutPoint={timelineOutPoint}
        onClose={() => setIsExportOpen(false)}
      />

      <ClipLibraryModal
        isOpen={isClipLibraryModalOpen}
        project={project}
        selectedShotId={selectedShotId}
        onClose={() => setIsClipLibraryModalOpen(false)}
        onAddClip={handleAddMediaClip}
        onDeleteClip={handleDeleteMediaClip}
        onCreateBin={handleCreateBin}
        onDeleteBin={handleDeleteBin}
        onAssignClipToShot={handleAssignClipToShot}
        onAppendClipToTimeline={handleAppendClipToTimeline}
      />
    </div>
  );
}
