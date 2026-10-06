import React, { useState, useRef } from 'react';
import { Character, Location, Scene, ScriptElement, Shot, ShotType, CameraMovement, LightingStyle } from '../../types/film';
import { Plus, Trash2, Camera, MessageSquare, Clock, AlignLeft, ChevronRight, Layers, Sparkles, Upload, Film, Video, Play } from 'lucide-react';

interface ScriptViewProps {
  scenes: Scene[];
  characters: Character[];
  locations: Location[];
  selectedShotId?: string;
  onSelectShot: (shotId: string) => void;
  onUpdateScene: (scene: Scene) => void;
  onAddScene: () => void;
  onDeleteScene: (sceneId: string) => void;
  onAddShotToScene: (sceneId: string, shotType?: ShotType) => void;
  onUploadTakeMedia?: (shotId: string, file: File) => void;
  onDropVideoToNewShot?: (sceneId: string, file: File, cameraAngle?: ShotType) => void;
  onUpdateShotCameraAngle?: (shotId: string, shotType: ShotType) => void;
}

export const ScriptView: React.FC<ScriptViewProps> = ({
  scenes,
  characters,
  locations,
  selectedShotId,
  onSelectShot,
  onUpdateScene,
  onAddScene,
  onDeleteScene,
  onAddShotToScene,
  onUploadTakeMedia,
  onDropVideoToNewShot,
  onUpdateShotCameraAngle,
}) => {
  const [activeSceneId, setActiveSceneId] = useState<string>(scenes[0]?.id || '');
  const [draggingOverShotId, setDraggingOverShotId] = useState<string | null>(null);
  const [draggingOverAngleKey, setDraggingOverAngleKey] = useState<string | null>(null);
  const [draggingOverSceneId, setDraggingOverSceneId] = useState<string | null>(null);
  const sceneFileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  const charactersMap = new Map(characters.map((c) => [c.id, c]));
  const locationsMap = new Map(locations.map((l) => [l.id, l]));

  const CAMERA_ANGLES: ShotType[] = ['overhead', 'close-up', 'wide', 'two-shot', 'reaction'];

  const handleUpdateElement = (scene: Scene, elementIndex: number, updatedElement: ScriptElement) => {
    const newElements = [...scene.scriptElements];
    newElements[elementIndex] = updatedElement;
    onUpdateScene({ ...scene, scriptElements: newElements });
  };

  const handleAddElement = (scene: Scene, type: 'action' | 'dialogue' | 'pause') => {
    const id = `el_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
    let newEl: ScriptElement;

    if (type === 'action') {
      newEl = { id, type: 'action', text: 'New action beat...' };
    } else if (type === 'dialogue') {
      const defaultChar = characters[0]?.id || '';
      newEl = { id, type: 'dialogue', characterId: defaultChar, text: 'New line of dialogue...' };
    } else {
      newEl = { id, type: 'pause', durationSeconds: 2.0, notes: 'Beat' };
    }

    onUpdateScene({
      ...scene,
      scriptElements: [...scene.scriptElements, newEl],
    });
  };

  const handleDeleteElement = (scene: Scene, elementIndex: number) => {
    const newElements = scene.scriptElements.filter((_, idx) => idx !== elementIndex);
    onUpdateScene({ ...scene, scriptElements: newElements });
  };

  const handleDeleteShot = (scene: Scene, shotId: string) => {
    const newShots = scene.shots.filter((s) => s.id !== shotId);
    onUpdateScene({ ...scene, shots: newShots });
  };

  return (
    <div className="h-full flex flex-col bg-[#F8FAFA] overflow-hidden">
      {/* Top Scene Navigation & Quick Add */}
      <div className="p-3 border-b border-[#D8E3E1] bg-[#F2F7F6] flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
          {scenes.map((scene) => (
            <button
              key={scene.id}
              onClick={() => setActiveSceneId(scene.id)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                (activeSceneId || scenes[0]?.id) === scene.id
                  ? 'bg-[#166E67] text-white shadow-xs'
                  : 'bg-white text-[#193B39] hover:bg-[#EAF2F0] border border-[#D5DFDE]'
              }`}
            >
              <span>Scene {scene.sceneNumber}</span>
              <span className="text-[10px] opacity-80 font-mono">({scene.shots.length} shots)</span>
            </button>
          ))}
        </div>

        <button
          onClick={onAddScene}
          className="px-2.5 py-1 bg-white hover:bg-[#EAF2F0] border border-[#D5DFDE] text-[#166E67] rounded-lg text-xs font-semibold flex items-center gap-1 shrink-0 transition-colors shadow-2xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Scene</span>
        </button>
      </div>

      {/* Main Script Scrollable Viewport */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6 pb-20">
        {scenes.map((scene) => {
          const isCurrentScene = (activeSceneId || scenes[0]?.id) === scene.id;
          const loc = scene.locationId ? locationsMap.get(scene.locationId) : null;

          return (
            <div
              key={scene.id}
              id={`scene-container-${scene.id}`}
              className={`rounded-2xl border transition-all p-5 ${
                isCurrentScene
                  ? 'bg-white border-[#166E67]/50 shadow-sm ring-1 ring-[#166E67]/20'
                  : 'bg-white/80 border-[#E0E8E7] opacity-90 hover:opacity-100'
              }`}
            >
              {/* Scene Slugline Header */}
              <div className="flex items-center justify-between gap-3 pb-3 mb-4 border-b border-[#E5EFEF]">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="px-2 py-0.5 text-[11px] font-mono font-bold bg-[#E6F4F2] text-[#0F766E] border border-[#C5E3DF] rounded">
                      SCENE {scene.sceneNumber}
                    </span>
                    <input
                      type="text"
                      value={scene.slugline}
                      onChange={(e) => onUpdateScene({ ...scene, slugline: e.target.value })}
                      className="font-mono uppercase font-bold text-sm text-[#112F2E] bg-transparent hover:bg-[#F2F7F6] focus:bg-white px-2 py-0.5 rounded border border-transparent focus:border-[#0D9488] focus:outline-none flex-1 transition-colors"
                    />
                  </div>

                  <div className="flex items-center gap-3 text-xs text-[#52706E] pl-2 font-sans">
                    <span>
                      Location:{' '}
                      <select
                        value={scene.locationId || ''}
                        onChange={(e) => onUpdateScene({ ...scene, locationId: e.target.value })}
                        className="bg-transparent border-b border-[#CBE0DD] font-medium text-[#112F2E] focus:outline-none py-0.5"
                      >
                        <option value="">No Location Linked</option>
                        {locations.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.name} ({l.code})
                          </option>
                        ))}
                      </select>
                    </span>
                    <span aria-hidden="true" className="text-[#A5BDBB]">·</span>
                    <span>
                      Time:{' '}
                      <select
                        value={scene.timeOfDay}
                        onChange={(e) => onUpdateScene({ ...scene, timeOfDay: e.target.value as any })}
                        className="bg-transparent border-b border-[#CBE0DD] font-medium text-[#112F2E] focus:outline-none py-0.5"
                      >
                        <option value="NIGHT">NIGHT</option>
                        <option value="DAY">DAY</option>
                        <option value="DUSK">DUSK</option>
                        <option value="DAWN">DAWN</option>
                      </select>
                    </span>
                  </div>
                </div>

                {scenes.length > 1 && (
                  <button
                    onClick={() => onDeleteScene(scene.id)}
                    className="p-1.5 text-[#8A9E9C] hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Delete Scene"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Script Elements (Action, Dialogue, Pauses) */}
              <div className="space-y-3 font-mono text-xs">
                {scene.scriptElements.map((el, idx) => (
                  <div key={el.id} className="group relative rounded-lg p-2 hover:bg-[#F4F8F7] transition-colors">
                    {/* Action Line */}
                    {el.type === 'action' && (
                      <div className="flex items-start gap-2">
                        <span className="text-[10px] uppercase font-bold text-[#6D8A88] pt-1.5 shrink-0 w-14 text-right tracking-wider">
                          ACTION
                        </span>
                        <textarea
                          rows={2}
                          value={el.text}
                          onChange={(e) =>
                            handleUpdateElement(scene, idx, { ...el, text: e.target.value })
                          }
                          className="flex-1 bg-transparent hover:bg-white focus:bg-white p-2 rounded-lg border border-transparent focus:border-[#0D9488] focus:outline-none text-[#112F2E] font-mono leading-relaxed transition-all shadow-2xs"
                        />
                        <button
                          onClick={() => handleDeleteElement(scene, idx)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-[#8A9E9C] hover:text-rose-700"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Dialogue Line */}
                    {el.type === 'dialogue' && (
                      <div className="flex flex-col pl-16 pr-4">
                        {/* Speaker Selector & Parenthetical */}
                        <div className="flex items-center gap-2 mb-1">
                          <select
                            value={el.characterId}
                            onChange={(e) =>
                              handleUpdateElement(scene, idx, { ...el, characterId: e.target.value })
                            }
                            className="font-bold text-[#0F766E] uppercase bg-transparent hover:bg-white border-b border-[#0D9488]/40 focus:outline-none py-0.5 text-xs tracking-wider"
                          >
                            {characters.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>

                          <input
                            type="text"
                            placeholder="(parenthetical)"
                            value={el.parenthetical || ''}
                            onChange={(e) =>
                              handleUpdateElement(scene, idx, { ...el, parenthetical: e.target.value })
                            }
                            className="italic text-[11px] text-[#5C7977] bg-transparent hover:bg-white px-1.5 py-0.5 rounded border border-transparent focus:border-[#0D9488] focus:outline-none"
                          />

                          <button
                            onClick={() => handleDeleteElement(scene, idx)}
                            className="opacity-0 group-hover:opacity-100 ml-auto p-1 text-[#8A9E9C] hover:text-rose-700"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Dialogue text */}
                        <textarea
                          rows={2}
                          value={el.text}
                          onChange={(e) =>
                            handleUpdateElement(scene, idx, { ...el, text: e.target.value })
                          }
                          className="bg-transparent hover:bg-white focus:bg-white p-2 rounded-lg border border-transparent focus:border-[#0D9488] focus:outline-none text-[#112F2E] font-mono leading-relaxed transition-all"
                        />
                      </div>
                    )}

                    {/* Pause Line */}
                    {el.type === 'pause' && (
                      <div className="flex items-center gap-2 pl-16 py-1 text-[#5C7977]">
                        <Clock className="w-3.5 h-3.5 text-[#0D9488]" />
                        <span className="text-[11px] font-mono">[PAUSE:</span>
                        <input
                          type="number"
                          step={0.5}
                          value={el.durationSeconds}
                          onChange={(e) =>
                            handleUpdateElement(scene, idx, {
                              ...el,
                              durationSeconds: parseFloat(e.target.value) || 1,
                            })
                          }
                          className="w-12 px-1 py-0.5 text-center bg-white border border-[#D5DFDE] rounded text-xs font-mono"
                        />
                        <span className="text-[11px] font-mono">seconds -</span>
                        <input
                          type="text"
                          value={el.notes || ''}
                          placeholder="notes..."
                          onChange={(e) =>
                            handleUpdateElement(scene, idx, { ...el, notes: e.target.value })
                          }
                          className="flex-1 bg-transparent hover:bg-white px-1 py-0.5 rounded border border-transparent focus:border-[#0D9488] text-[11px] italic"
                        />
                        <span className="text-[11px] font-mono">]</span>
                        <button
                          onClick={() => handleDeleteElement(scene, idx)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-[#8A9E9C] hover:text-rose-700 ml-auto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                {/* Add Script Element Bar */}
                <div className="pt-2 flex items-center gap-2 border-t border-dashed border-[#D5DFDE]">
                  <button
                    onClick={() => handleAddElement(scene, 'action')}
                    className="px-2.5 py-1 text-[11px] font-sans font-medium text-[#4A6462] hover:text-[#112F2E] bg-[#F2F7F6] hover:bg-[#E7EFEB] border border-[#D8E3E1] rounded flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3 h-3" /> Action
                  </button>
                  <button
                    onClick={() => handleAddElement(scene, 'dialogue')}
                    className="px-2.5 py-1 text-[11px] font-sans font-medium text-[#4A6462] hover:text-[#112F2E] bg-[#F2F7F6] hover:bg-[#E7EFEB] border border-[#D8E3E1] rounded flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3 h-3" /> Dialogue
                  </button>
                  <button
                    onClick={() => handleAddElement(scene, 'pause')}
                    className="px-2.5 py-1 text-[11px] font-sans font-medium text-[#4A6462] hover:text-[#112F2E] bg-[#F2F7F6] hover:bg-[#E7EFEB] border border-[#D8E3E1] rounded flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3 h-3" /> Pause
                  </button>
                </div>
              </div>

              {/* Scene Shot List & Staging Beats */}
              <div className="mt-5 pt-4 border-t border-[#E5EFEF]">
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Camera className="w-4 h-4 text-[#0D9488]" />
                    <span className="font-bold text-xs uppercase tracking-wider text-[#112F2E] font-sans">
                      Shot List & Camera Angles ({scene.shots.length})
                    </span>
                    <span className="hidden md:inline-block text-[10px] text-[#52706E] bg-[#EEF4F3] px-2 py-0.5 rounded-md font-mono">
                      Drag & drop video onto any angle or shot
                    </span>
                  </div>

                  {/* Camera Angle Quick Add & Drop Targets */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {CAMERA_ANGLES.map((st) => {
                      const angleKey = `${scene.id}_${st}`;
                      const isDragOverAngle = draggingOverAngleKey === angleKey;

                      return (
                        <button
                          key={st}
                          onClick={() => onAddShotToScene(scene.id, st)}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setDraggingOverAngleKey(angleKey);
                          }}
                          onDragLeave={() => setDraggingOverAngleKey(null)}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setDraggingOverAngleKey(null);
                            const file = e.dataTransfer.files?.[0];
                            if (file && onDropVideoToNewShot) {
                              onDropVideoToNewShot(scene.id, file, st);
                            }
                          }}
                          className={`px-2 py-1 text-[10px] font-semibold rounded-lg border transition-all flex items-center gap-1 ${
                            isDragOverAngle
                              ? 'bg-[#0D9488] text-white border-[#0D9488] ring-2 ring-[#0D9488]/40 scale-105 shadow-md animate-pulse'
                              : 'bg-[#F2F7F6] hover:bg-[#E7EFEB] text-[#166E67] border-[#D5DFDE]'
                          }`}
                          title={`Click to add ${st} shot, or drop video here to create ${st} shot with video`}
                        >
                          <Plus className="w-3 h-3" />
                          <span className="capitalize">{st}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Shots Grid */}
                <div className="space-y-2.5">
                  {scene.shots.map((shot) => {
                    const isSelected = selectedShotId === shot.id;
                    const isDragOverShot = draggingOverShotId === shot.id;
                    const selectedTake = shot.takes.find((t) => t.id === shot.selectedTakeId) || shot.takes[0];

                    return (
                      <div
                        key={shot.id}
                        onClick={() => onSelectShot(shot.id)}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setDraggingOverShotId(shot.id);
                        }}
                        onDragLeave={(e) => {
                          e.preventDefault();
                          if (draggingOverShotId === shot.id) {
                            setDraggingOverShotId(null);
                          }
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setDraggingOverShotId(null);
                          const file = e.dataTransfer.files?.[0];
                          if (file && onUploadTakeMedia) {
                            onUploadTakeMedia(shot.id, file);
                          }
                        }}
                        className={`relative p-3 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                          isDragOverShot
                            ? 'bg-[#CCFBF1] border-[#0D9488] ring-4 ring-[#0D9488]/40 scale-[1.01] shadow-lg'
                            : isSelected
                            ? 'bg-[#F0FDFA] border-[#0D9488] ring-1 ring-[#0D9488] shadow-xs'
                            : 'bg-[#F8FAFA] border-[#DCE5E4] hover:border-[#166E67]/50 hover:bg-white'
                        }`}
                      >
                        {/* Drag Over Active Overlay for Shot Card */}
                        {isDragOverShot && (
                          <div className="absolute inset-0 bg-[#0D9488]/90 text-white rounded-xl z-20 flex flex-col items-center justify-center p-3 text-center pointer-events-none backdrop-blur-2xs animate-pulse">
                            <Film className="w-7 h-7 mb-1 animate-bounce" />
                            <span className="font-bold text-xs">Drop Video Clip to set Take</span>
                            <span className="text-[10px] opacity-90 font-mono">
                              Shot {scene.sceneNumber}.{shot.shotNumber} ({shot.shotType.toUpperCase()})
                            </span>
                          </div>
                        )}

                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          {/* Shot thumbnail preview with click-to-upload */}
                          <div className="w-20 h-13 rounded-lg overflow-hidden bg-black shrink-0 relative border border-black/20 group/thumb">
                            {selectedTake?.mediaUrl ? (
                              selectedTake.mediaType === 'video' ? (
                                <div className="relative w-full h-full">
                                  <video
                                    src={selectedTake.mediaUrl}
                                    className="w-full h-full object-cover"
                                    muted
                                    playsInline
                                    preload="metadata"
                                    loop
                                    onLoadedMetadata={(e) => {
                                      e.currentTarget.currentTime = selectedTake.inPoint ?? 0;
                                    }}
                                    onMouseEnter={(e) => {
                                      const v = e.currentTarget;
                                      const inPt = selectedTake.inPoint ?? 0;
                                      v.currentTime = inPt;
                                      v.play().catch(() => {});
                                    }}
                                    onTimeUpdate={(e) => {
                                      const v = e.currentTarget;
                                      const inPt = selectedTake.inPoint ?? 0;
                                      const outPt = selectedTake.outPoint;
                                      if (typeof outPt === 'number' && outPt > inPt && v.currentTime >= outPt - 0.05) {
                                        v.currentTime = inPt;
                                      }
                                    }}
                                    onMouseLeave={(e) => {
                                      const v = e.currentTarget;
                                      v.pause();
                                      v.currentTime = selectedTake.inPoint ?? 0;
                                    }}
                                  />
                                  <div className="absolute top-1 left-1 bg-black/60 backdrop-blur-2xs text-[#2DD4BF] p-0.5 rounded pointer-events-none">
                                    <Play className="w-2.5 h-2.5 fill-current" />
                                  </div>
                                </div>
                              ) : (
                                <img
                                  src={selectedTake.mediaUrl}
                                  alt="Take preview"
                                  className="w-full h-full object-cover"
                                />
                              )
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center text-[9px] text-zinc-400 font-mono">
                                <Video className="w-3.5 h-3.5 text-zinc-500 mb-0.5" />
                                <span>Drop Video</span>
                              </div>
                            )}

                            {/* Duration badge */}
                            <span className="absolute bottom-1 right-1 px-1.5 py-0.2 text-[9px] font-mono bg-black/75 text-white rounded">
                              {shot.duration}s
                            </span>

                            {/* Hover upload button */}
                            <label
                              onClick={(e) => e.stopPropagation()}
                              className="absolute inset-0 bg-black/60 opacity-0 group-hover/thumb:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-opacity text-white text-[9px] font-semibold"
                              title="Click to browse and upload video clip"
                            >
                              <Upload className="w-4 h-4 text-[#2DD4BF] mb-0.5" />
                              <span>Upload</span>
                              <input
                                type="file"
                                accept="video/*,video/mp4,video/webm,video/quicktime"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file && onUploadTakeMedia) {
                                    onUploadTakeMedia(shot.id, file);
                                  }
                                }}
                              />
                            </label>
                          </div>

                          {/* Shot details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="font-mono text-xs font-bold text-[#0D9488]">
                                Shot {scene.sceneNumber}.{shot.shotNumber}
                              </span>

                              {/* Camera Angle Selector Dropdown */}
                              <div className="relative inline-flex items-center">
                                <select
                                  value={shot.shotType}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    onUpdateShotCameraAngle?.(shot.id, e.target.value as ShotType);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="px-2 py-0.5 text-[10px] font-bold uppercase bg-[#E6F4F2] text-[#0F766E] border border-[#C5E3DF] rounded cursor-pointer hover:bg-[#D6ECE9] focus:outline-none focus:ring-1 focus:ring-[#0D9488]"
                                  title="Change camera angle for this shot"
                                >
                                  <option value="overhead">Overhead</option>
                                  <option value="close-up">Close-up</option>
                                  <option value="wide">Wide</option>
                                  <option value="two-shot">Two-shot</option>
                                  <option value="reaction">Reaction</option>
                                  <option value="custom">Custom</option>
                                </select>
                              </div>

                              <span className="px-1.5 py-0.5 text-[10px] font-medium bg-[#EEF4F3] text-[#4A6462] rounded">
                                {shot.cameraMovement}
                              </span>
                              <span className="text-[10px] text-[#5C7977] font-medium">
                                {shot.lighting}
                              </span>
                            </div>

                            <p className="text-xs text-[#112F2E] line-clamp-2 leading-relaxed font-sans">
                              {shot.action}
                            </p>

                            {shot.dialogueSnippet && (
                              <p className="text-[11px] text-[#0F766E] italic mt-1 truncate">
                                "{shot.dialogueSnippet}"
                              </p>
                            )}

                            {/* Active Take Info */}
                            {selectedTake && (
                              <div className="mt-1 flex items-center gap-2 text-[10px] text-[#52706E] font-mono">
                                <span className="text-[#0D9488] font-semibold">Active Take:</span>
                                <span className="truncate max-w-xs">{selectedTake.label}</span>
                                {selectedTake.mediaType === 'video' && (
                                  <span className="px-1 py-0.2 bg-[#E6F4F2] text-[#0F766E] rounded text-[9px]">
                                    VIDEO
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Right: Takes info & Delete */}
                        <div className="flex flex-col items-end justify-between h-full min-h-[44px] shrink-0">
                          <span className="px-2 py-0.5 text-[10px] font-mono font-semibold bg-white border border-[#D5DFDE] text-[#112F2E] rounded shadow-2xs">
                            {shot.takes.length} take{shot.takes.length !== 1 ? 's' : ''}
                          </span>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteShot(scene, shot.id);
                            }}
                            className="p-1 text-[#8A9E9C] hover:text-rose-700 hover:bg-rose-50 rounded mt-1 transition-colors"
                            title="Delete Shot"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Scene-level Video Drop Target */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDraggingOverSceneId(scene.id);
                  }}
                  onDragLeave={() => setDraggingOverSceneId(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDraggingOverSceneId(null);
                    const files = Array.from(e.dataTransfer.files);
                    if (files.length > 0 && onDropVideoToNewShot) {
                      files.forEach((f) => onDropVideoToNewShot(scene.id, f, 'wide'));
                    }
                  }}
                  className={`mt-3 p-3 rounded-xl border-2 border-dashed flex flex-col sm:flex-row items-center justify-between gap-2 text-center transition-all cursor-pointer ${
                    draggingOverSceneId === scene.id
                      ? 'border-[#0D9488] bg-[#CCFBF1] text-[#0F766E] ring-2 ring-[#0D9488]/30 shadow-sm'
                      : 'border-[#D5DFDE] bg-[#F4F8F7]/60 hover:bg-white hover:border-[#0D9488]/50 text-[#52706E]'
                  }`}
                  onClick={() => sceneFileInputRefs.current[scene.id]?.click()}
                  title="Drop video files here or click to browse"
                >
                  <input
                    ref={(el) => {
                      sceneFileInputRefs.current[scene.id] = el;
                    }}
                    type="file"
                    accept="video/*,video/mp4,video/webm,video/quicktime"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      if (files.length > 0 && onDropVideoToNewShot) {
                        files.forEach((f) => onDropVideoToNewShot(scene.id, f, 'wide'));
                      }
                    }}
                  />
                  <div className="flex items-center gap-2 text-left">
                    <div className="w-7 h-7 rounded-lg bg-[#E6F4F2] text-[#0D9488] flex items-center justify-center shrink-0">
                      <Film className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-semibold text-xs text-[#112F2E] block">
                        Drop video files to create new Camera Angle shots
                      </span>
                      <span className="text-[10px] text-[#52706E]">
                        Or drop directly onto '+ overhead', '+ close-up', or '+ wide' buttons above
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <span className="px-2 py-1 bg-white border border-[#D5DFDE] text-[#166E67] font-semibold text-[10px] rounded-lg shadow-2xs">
                      Browse Video
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
