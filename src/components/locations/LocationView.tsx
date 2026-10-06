import React, { useState } from 'react';
import { Location } from '../../types/film';
import { Search, Plus, Trash2, Edit3, ImagePlus, Building2, MapPin } from 'lucide-react';

interface LocationViewProps {
  locations: Location[];
  onAddLocation: (location: Location) => void;
  onUpdateLocation: (location: Location) => void;
  onDeleteLocation: (locationId: string) => void;
}

export const LocationView: React.FC<LocationViewProps> = ({
  locations,
  onAddLocation,
  onUpdateLocation,
  onDeleteLocation,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingLoc, setEditingLoc] = useState<Location | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const filtered = locations.filter((loc) =>
    loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    loc.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateNew = () => {
    const newLoc: Location = {
      id: `loc_${Date.now()}`,
      name: 'NEW LOCATION',
      type: 'Interior',
      description: '',
      sceneAppearances: 0,
      code: 'III',
    };
    setEditingLoc(newLoc);
    setIsCreating(true);
  };

  const handleSaveLoc = (loc: Location) => {
    if (isCreating) {
      onAddLocation(loc);
    } else {
      onUpdateLocation(loc);
    }
    setEditingLoc(null);
    setIsCreating(false);
  };

  return (
    <div className="h-full flex flex-col p-4 bg-[#F8FAFA]">
      {/* Top Search & Action Bar - Matching White & Teal Clean UI */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8A9E9C]" />
          <input
            type="text"
            placeholder="Search locations"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-16 py-2 bg-white hover:bg-[#F2F7F6] focus:bg-white text-[#112F2E] placeholder-[#8A9E9C] text-sm rounded-xl border border-[#D5DFDE] focus:border-[#0D9488] focus:outline-none transition-colors shadow-2xs"
          />
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-[#8A9E9C]">
            {filtered.length} of {locations.length}
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

      {/* Location Cards Grid - Matching White & Teal Modern Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 overflow-y-auto pr-1 pb-12">
        {filtered.map((loc) => (
          <div
            key={loc.id}
            className="group relative bg-white hover:bg-[#F4F8F7] border border-[#D5DFDE] rounded-2xl p-4 transition-all shadow-xs flex flex-col justify-between"
          >
            {/* Top row: Icon & Roman Numeral Badge */}
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-full bg-[#E6F4F2] border border-[#CBE2DF] flex items-center justify-center text-[#0F766E]">
                <Building2 className="w-5 h-5" />
              </div>

              <div className="flex items-center gap-2">
                {/* Roman Numeral Tag e.g. "II" */}
                <span className="px-2.5 py-1 text-xs font-mono font-semibold tracking-wider text-[#0F766E] bg-[#E6F4F2] border border-[#C5E3DF] rounded-md">
                  {loc.code || 'I'}
                </span>

                {/* Edit & Delete actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => {
                      setEditingLoc(loc);
                      setIsCreating(false);
                    }}
                    className="p-1.5 hover:bg-[#EAF2F0] rounded-md text-[#112F2E] transition-colors"
                    title="Edit Location"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDeleteLocation(loc.id)}
                    className="p-1.5 hover:bg-rose-50 rounded-md text-rose-700 transition-colors"
                    title="Delete Location"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Content Details */}
            <div className="mb-3">
              <h3 className="font-bold text-base tracking-wide text-[#112F2E] uppercase font-sans mb-1">
                {loc.name}
              </h3>

              <p className="text-xs text-[#52706E] line-clamp-2 leading-relaxed italic mb-2">
                {loc.description || 'No description'}
              </p>

              {/* Subtext e.g. "Interior · 1 scene" */}
              <div className="text-xs text-[#0F766E] font-medium flex items-center gap-1.5">
                <span>{loc.type}</span>
                <span aria-hidden="true" className="text-[#A5BDBB]">·</span>
                <span>{loc.sceneAppearances || 0} scenes</span>
              </div>
            </div>

            {/* Visual References preview strip */}
            {loc.visualReferences && loc.visualReferences.length > 0 && (
              <div className="flex items-center gap-1.5 pt-2 border-t border-[#E5EFEF] overflow-x-auto">
                {loc.visualReferences.map((refUrl, i) => (
                  <img
                    key={i}
                    src={refUrl}
                    alt="Location reference"
                    className="w-12 h-8 rounded object-cover border border-[#D5DFDE]"
                  />
                ))}
              </div>
            )}
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-2 py-12 text-center text-[#8A9E9C] text-sm">
            No locations found matching "{searchQuery}". Click "+ New" to create one.
          </div>
        )}
      </div>

      {/* Edit / Create Location Modal */}
      {editingLoc && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#D5DFDE] rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-[#112F2E]">
              {isCreating ? 'Create Location' : `Edit ${editingLoc.name}`}
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-[#52706E] mb-1">Location Name</label>
                <input
                  type="text"
                  value={editingLoc.name}
                  onChange={(e) => setEditingLoc({ ...editingLoc, name: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 bg-[#F8FAFA] rounded-lg border border-[#D5DFDE] focus:bg-white text-sm font-semibold text-[#112F2E] focus:border-[#0D9488] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-[#52706E] mb-1">Roman Code (e.g. I, II, III)</label>
                <input
                  type="text"
                  value={editingLoc.code || ''}
                  onChange={(e) => setEditingLoc({ ...editingLoc, code: e.target.value.toUpperCase() })}
                  className="w-24 px-3 py-1.5 bg-[#F8FAFA] rounded-lg border border-[#D5DFDE] focus:bg-white text-xs font-mono font-bold text-[#0F766E] focus:border-[#0D9488] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-[#52706E] mb-1">Type</label>
                <select
                  value={editingLoc.type}
                  onChange={(e) => setEditingLoc({ ...editingLoc, type: e.target.value as any })}
                  className="w-full px-3 py-2 bg-[#F8FAFA] rounded-lg border border-[#D5DFDE] focus:bg-white text-xs text-[#112F2E]"
                >
                  <option value="Interior">Interior (INT.)</option>
                  <option value="Exterior">Exterior (EXT.)</option>
                  <option value="Stage/Studio">Stage/Studio</option>
                  <option value="Virtual Set">Virtual Set</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-[#52706E] mb-1">Visual Architecture & Lighting Notes</label>
                <textarea
                  rows={3}
                  value={editingLoc.description}
                  onChange={(e) => setEditingLoc({ ...editingLoc, description: e.target.value })}
                  placeholder="e.g. High concrete ceiling with industrial mercury lamps..."
                  className="w-full px-3 py-2 bg-[#F8FAFA] rounded-lg border border-[#D5DFDE] focus:bg-white text-xs text-[#112F2E] focus:border-[#0D9488] focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5EFEF]">
              <button
                onClick={() => setEditingLoc(null)}
                className="px-4 py-2 text-xs font-medium text-[#52706E] hover:text-[#112F2E]"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveLoc(editingLoc)}
                className="px-4 py-2 bg-[#166E67] text-white text-xs font-semibold rounded-lg hover:bg-[#0F766E] shadow-xs"
              >
                Save Location
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
