import React, { useState } from 'react';
import { Character } from '../../types/film';
import { Search, Plus, Trash2, Edit3, ImagePlus, User } from 'lucide-react';

interface CharacterViewProps {
  characters: Character[];
  onAddCharacter: (character: Character) => void;
  onUpdateCharacter: (character: Character) => void;
  onDeleteCharacter: (characterId: string) => void;
}

export const CharacterView: React.FC<CharacterViewProps> = ({
  characters,
  onAddCharacter,
  onUpdateCharacter,
  onDeleteCharacter,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingChar, setEditingChar] = useState<Character | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const filtered = characters.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateNew = () => {
    const newChar: Character = {
      id: `char_${Date.now()}`,
      name: 'NEW CHARACTER',
      description: '',
      color: '#0D9488',
      initials: 'N',
      voiceNotes: '',
      costumeNotes: '',
      sceneAppearances: 0,
      isAuto: false,
    };
    setEditingChar(newChar);
    setIsCreating(true);
  };

  const handleSaveChar = (char: Character) => {
    if (isCreating) {
      onAddCharacter(char);
    } else {
      onUpdateCharacter(char);
    }
    setEditingChar(null);
    setIsCreating(false);
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>, char: Character) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      onUpdateCharacter({ ...char, avatarUrl: url });
    }
  };

  return (
    <div className="h-full flex flex-col p-4 bg-[#F8FAFA]">
      {/* Top Search & Action Bar - Matching White & Teal Clean UI */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8A9E9C]" />
          <input
            type="text"
            placeholder="Search characters"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-16 py-2 bg-white hover:bg-[#F2F7F6] focus:bg-white text-[#112F2E] placeholder-[#8A9E9C] text-sm rounded-xl border border-[#D5DFDE] focus:border-[#0D9488] focus:outline-none transition-colors shadow-2xs"
          />
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-[#8A9E9C]">
            {filtered.length} of {characters.length}
          </span>
        </div>

        <button
          onClick={handleCreateNew}
          className="px-4 py-2 bg-[#166E67] hover:bg-[#0F766E] text-white rounded-xl text-sm font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>New</span>
        </button>
      </div>

      {/* Characters Cards Grid - Matching White & Teal Modern Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 overflow-y-auto pr-1 pb-12">
        {filtered.map((char) => (
          <div
            key={char.id}
            className="group relative bg-white hover:bg-[#F4F8F7] border border-[#D5DFDE] rounded-2xl p-4 transition-all shadow-xs flex items-start justify-between"
          >
            <div className="flex items-start gap-4 flex-1">
              {/* Circular Avatar / Photo */}
              <div className="relative shrink-0">
                {char.avatarUrl ? (
                  <img
                    src={char.avatarUrl}
                    alt={char.name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-xs"
                  />
                ) : (
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold font-sans shadow-xs"
                    style={{ backgroundColor: char.color || '#0D9488' }}
                  >
                    {char.initials || char.name[0] || '?'}
                  </div>
                )}

                {/* Upload Image Overlay */}
                <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 rounded-full flex items-center justify-center cursor-pointer transition-opacity text-white">
                  <ImagePlus className="w-5 h-5" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleAvatarUpload(e, char)}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Character Details */}
              <div className="flex-1 min-w-0 pr-2">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h3 className="font-bold text-base tracking-wide text-[#112F2E] uppercase font-sans">
                    {char.name}
                  </h3>

                  {char.isAuto && (
                    <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase bg-[#E6F4F2] text-[#0F766E] border border-[#C5E3DF] rounded-md">
                      AUTO
                    </span>
                  )}
                </div>

                <p className="text-xs text-[#52706E] line-clamp-2 leading-relaxed mb-2 font-sans">
                  {char.description || 'No description'}
                </p>

                {char.voiceNotes && (
                  <div className="text-[11px] text-[#0F766E] font-medium truncate">
                    Voice: {char.voiceNotes}
                  </div>
                )}
              </div>
            </div>

            {/* Right Status & Actions */}
            <div className="flex flex-col items-end justify-between h-full min-h-[64px]">
              {/* Scene appearance count badge e.g. "2x" */}
              <span className="px-2 py-0.5 text-xs font-mono font-medium text-[#52706E] bg-[#EEF4F3] border border-[#D5DFDE] rounded-md">
                {char.sceneAppearances || 0}x
              </span>

              {/* Edit / Delete on hover */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity mt-2">
                <button
                  onClick={() => {
                    setEditingChar(char);
                    setIsCreating(false);
                  }}
                  className="p-1.5 hover:bg-[#EAF2F0] rounded-md text-[#112F2E] transition-colors"
                  title="Edit Character"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onDeleteCharacter(char.id)}
                  className="p-1.5 hover:bg-rose-50 rounded-md text-rose-700 transition-colors"
                  title="Delete Character"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-2 py-12 text-center text-[#8A9E9C] text-sm">
            No characters found matching "{searchQuery}". Click "+ New" to create one.
          </div>
        )}
      </div>

      {/* Edit / Create Character Modal */}
      {editingChar && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#D5DFDE] rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-[#112F2E]">
              {isCreating ? 'Create Character' : `Edit ${editingChar.name}`}
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-[#52706E] mb-1">Character Name (All Caps)</label>
                <input
                  type="text"
                  value={editingChar.name}
                  onChange={(e) =>
                    setEditingChar({
                      ...editingChar,
                      name: e.target.value.toUpperCase(),
                      initials: e.target.value[0]?.toUpperCase() || '?',
                    })
                  }
                  className="w-full px-3 py-2 bg-[#F8FAFA] rounded-lg border border-[#D5DFDE] focus:bg-white text-sm font-semibold text-[#112F2E] focus:border-[#0D9488] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-[#52706E] mb-1">Description & Dramatic Motivation</label>
                <textarea
                  rows={3}
                  value={editingChar.description}
                  onChange={(e) => setEditingChar({ ...editingChar, description: e.target.value })}
                  placeholder="e.g. Senior investigative reporter. Guarded, calculating..."
                  className="w-full px-3 py-2 bg-[#F8FAFA] rounded-lg border border-[#D5DFDE] focus:bg-white text-xs text-[#112F2E] focus:border-[#0D9488] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-[#52706E] mb-1">Voice & Speech Notes</label>
                <input
                  type="text"
                  value={editingChar.voiceNotes || ''}
                  onChange={(e) => setEditingChar({ ...editingChar, voiceNotes: e.target.value })}
                  placeholder="e.g. Measured British cadence, dry, quiet intensity"
                  className="w-full px-3 py-2 bg-[#F8FAFA] rounded-lg border border-[#D5DFDE] focus:bg-white text-xs text-[#112F2E] focus:border-[#0D9488] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-[#52706E] mb-1">Costume & Continuity Notes</label>
                <input
                  type="text"
                  value={editingChar.costumeNotes || ''}
                  onChange={(e) => setEditingChar({ ...editingChar, costumeNotes: e.target.value })}
                  placeholder="e.g. Charcoal trench coat, brass ring on thumb"
                  className="w-full px-3 py-2 bg-[#F8FAFA] rounded-lg border border-[#D5DFDE] focus:bg-white text-xs text-[#112F2E] focus:border-[#0D9488] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-[#52706E] mb-1">Accent Badge Color</label>
                <div className="flex items-center gap-2">
                  {['#0D9488', '#166E67', '#0F766E', '#2563EB', '#D97706', '#E11D48'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setEditingChar({ ...editingChar, color: c })}
                      className={`w-6 h-6 rounded-full border-2 ${
                        editingChar.color === c ? 'border-[#112F2E] scale-110 shadow-xs' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5EFEF]">
              <button
                onClick={() => setEditingChar(null)}
                className="px-4 py-2 text-xs font-medium text-[#52706E] hover:text-[#112F2E]"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveChar(editingChar)}
                className="px-4 py-2 bg-[#166E67] text-white text-xs font-semibold rounded-lg hover:bg-[#0F766E] shadow-xs"
              >
                Save Character
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
