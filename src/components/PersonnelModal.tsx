import React, { useState, useEffect } from 'react';
import { Personnel, PersonnelCategory, LocationType } from '../types';
import { formatDateForInput, toFirestoreTimestamp } from '../lib/dateUtils';
import { parseLocationData, LOCATION_TYPE_OPTIONS } from '../lib/personnelUtils';
import { X, Users, IdCard, AlertCircle, Calendar, MapPin, Hash, MessageSquare, Tag } from 'lucide-react';

interface PersonnelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (personnelData: Personnel, isEdit: boolean) => Promise<void>;
  initialData?: Personnel | null;
  existingIds: string[];
}

export const PersonnelModal: React.FC<PersonnelModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  existingIds,
}) => {
  const [personId, setPersonId] = useState('');
  const [name, setName] = useState('');
  const [hitchDays, setHitchDays] = useState<number>(28);
  const [daysOff, setDaysOff] = useState<number>(28);
  const [category, setCategory] = useState<PersonnelCategory>('Commuter');
  const [locationType, setLocationType] = useState<LocationType>('Rig');
  const [rigName, setRigName] = useState('');
  const [comments, setComments] = useState('');

  // Date fields (stored as YYYY-MM-DD string in local form state)
  const [dateArrivedAUH, setDateArrivedAUH] = useState('');
  const [dateTraveledHome, setDateTraveledHome] = useState('');
  const [dateReturn, setDateReturn] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!initialData;

  useEffect(() => {
    if (initialData) {
      const locInfo = parseLocationData(initialData);
      setPersonId(initialData.id);
      setName(initialData.name || '');
      setHitchDays(initialData.hitchDays ?? 28);
      setDaysOff(initialData.daysOff ?? 28);
      setCategory(initialData.category || 'Commuter');
      setLocationType(locInfo.locationType);
      setRigName(locInfo.rigName);
      setComments(initialData.comments || '');

      setDateArrivedAUH(formatDateForInput(initialData.dateArrivedAUH));
      setDateTraveledHome(formatDateForInput(initialData.dateTraveledHome));
      setDateReturn(formatDateForInput(initialData.dateReturn));
    } else {
      const randomId = `H${Math.floor(100000 + Math.random() * 900000)}`;
      setPersonId(randomId);
      setName('');
      setHitchDays(28);
      setDaysOff(28);
      setCategory('Commuter');
      setLocationType('Rig');
      setRigName('AD-181');
      setComments('');

      const today = new Date().toISOString().split('T')[0];
      setDateArrivedAUH(today);
      setDateTraveledHome('');
      setDateReturn('');
    }
    setError(null);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanId = personId.trim().toUpperCase();
    if (!cleanId) {
      setError('Person ID (Document ID) is required.');
      return;
    }

    if (!isEdit && existingIds.includes(cleanId)) {
      setError(`A personnel document with ID "${cleanId}" already exists in the "personnel" collection.`);
      return;
    }

    if (!name.trim()) {
      setError('Name is required.');
      return;
    }

    setSaving(true);
    try {
      const isRig = locationType === 'Rig';
      const cleanRigName = isRig ? rigName.trim() : '';
      const autoStatus = isRig ? 'On Rig' : 'Off Rig';
      const legacyLoc = isRig ? (cleanRigName || 'Rig') : locationType;

      const personnelData: Personnel = {
        id: cleanId,
        name: name.trim(),
        hitchDays: Number(hitchDays) || 0,
        dateArrivedAUH: toFirestoreTimestamp(dateArrivedAUH),
        dateTraveledHome: toFirestoreTimestamp(dateTraveledHome),
        daysOff: Number(daysOff) || 0,
        category,
        locationType,
        rigName: cleanRigName,
        location: legacyLoc,
        status: autoStatus,
        dateReturn: toFirestoreTimestamp(dateReturn),
        comments: comments.trim(),
        updatedAt: new Date().toISOString(),
        createdAt: initialData?.createdAt || new Date().toISOString(),
      };

      await onSave(personnelData, isEdit);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save personnel document.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#141414]/75 flex items-center justify-center p-4 overflow-y-auto font-sans">
      <div className="bg-white border-2 border-[#141414] w-full max-w-xl shadow-[6px_6px_0px_0px_#141414] overflow-hidden my-8">
        {/* Header */}
        <div className="bg-[#1a1a1a] px-6 py-4 border-b-2 border-[#141414] flex items-center justify-between text-white">
          <div className="flex items-center gap-2 font-black uppercase text-xs tracking-wider">
            <Users className="w-4 h-4 text-[#d71920]" />
            {isEdit ? `Edit Personnel Doc: ${personId}` : '+ Add Personnel Doc'}
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white hover:bg-[#333] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-100 border-2 border-[#d71920] text-xs text-[#d71920] font-mono font-bold flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-[#d71920] shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Firestore Document ID (personId) */}
          <div className="p-3 bg-[#f5f5f5] border-2 border-[#141414] space-y-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[#141414] flex items-center gap-1.5">
              <IdCard className="w-3.5 h-3.5 text-[#d71920]" />
              Person ID / Firestore Document ID (e.g. H287330) <span className="text-[#d71920]">*</span>
            </label>
            <p className="text-[10px] font-mono text-gray-600">
              Matches <code className="text-[#d71920] font-bold">engineers</code> doc ID for the same engineer.
            </p>
            <input
              type="text"
              value={personId}
              onChange={(e) => setPersonId(e.target.value)}
              disabled={isEdit}
              placeholder="e.g. H287330"
              className="w-full bg-white border-2 border-[#141414] px-3 py-1.5 text-xs font-mono font-bold text-[#141414] focus:outline-none uppercase disabled:bg-gray-200"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#141414] mb-1">
                Full Name <span className="text-[#d71920]">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Michael R. Adams"
                className="w-full bg-[#f9f9f9] border-2 border-[#141414] px-3 py-1.5 text-xs font-mono text-[#141414] focus:outline-none focus:bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#141414] mb-1">
                Category
              </label>
              <div className="relative">
                <Tag className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as PersonnelCategory)}
                  className="w-full bg-[#f9f9f9] border-2 border-[#141414] pl-8 pr-3 py-1.5 text-xs font-mono font-bold text-[#141414] focus:outline-none focus:bg-white"
                >
                  <option value="Consultant">Consultant</option>
                  <option value="Commuter">Commuter</option>
                  <option value="PRL">PRL</option>
                  <option value="Loan">Loan</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#141414] mb-1">
                Location Type
              </label>
              <select
                value={locationType}
                onChange={(e) => {
                  const newType = e.target.value as LocationType;
                  setLocationType(newType);
                  if (newType !== 'Rig') setRigName('');
                }}
                className="w-full bg-[#f9f9f9] border-2 border-[#141414] px-2.5 py-1.5 text-xs font-mono font-bold text-[#141414] focus:outline-none focus:bg-white"
              >
                {LOCATION_TYPE_OPTIONS.map((loc) => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#141414] mb-1">
                Rig Name {locationType !== 'Rig' && <span className="text-gray-400 font-normal">(Disabled)</span>}
              </label>
              <input
                type="text"
                disabled={locationType !== 'Rig'}
                value={locationType === 'Rig' ? rigName : ''}
                onChange={(e) => setRigName(e.target.value)}
                placeholder={locationType === 'Rig' ? "e.g. AD-181, GW-154" : "N/A"}
                className={`w-full border-2 border-[#141414] px-2.5 py-1.5 text-xs font-mono text-[#141414] focus:outline-none ${
                  locationType === 'Rig' ? 'bg-[#f9f9f9] focus:bg-white' : 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-300'
                }`}
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#141414] mb-1">
                Status (Auto-computed)
              </label>
              <div className="w-full bg-[#f0f0f0] border-2 border-[#141414] px-2.5 py-1.5 text-xs font-mono font-bold text-[#141414] flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${locationType === 'Rig' ? 'bg-emerald-600 animate-pulse' : 'bg-gray-400'}`} />
                  {locationType === 'Rig' ? 'On Rig' : 'Off Rig'}
                </span>
                <span className="text-[9px] font-normal text-gray-500 uppercase">(Auto)</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#141414] mb-1">
                Hitch Days (number)
              </label>
              <div className="relative">
                <Hash className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  min="0"
                  value={hitchDays}
                  onChange={(e) => setHitchDays(Number(e.target.value))}
                  placeholder="28"
                  className="w-full bg-[#f9f9f9] border-2 border-[#141414] pl-8 pr-3 py-1.5 text-xs font-mono text-[#141414] focus:outline-none focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#141414] mb-1">
                Days Off (number)
              </label>
              <div className="relative">
                <Hash className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  min="0"
                  value={daysOff}
                  onChange={(e) => setDaysOff(Number(e.target.value))}
                  placeholder="28"
                  className="w-full bg-[#f9f9f9] border-2 border-[#141414] pl-8 pr-3 py-1.5 text-xs font-mono text-[#141414] focus:outline-none focus:bg-white"
                />
              </div>
            </div>
          </div>

          {/* Dates Section */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-[#141414] border-b-2 border-[#141414] pb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#d71920]" />
              Rotation & Arrival Dates (Firestore Timestamps)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#141414] mb-1">
                  Date Arrived AUH
                </label>
                <input
                  type="date"
                  value={dateArrivedAUH}
                  onChange={(e) => setDateArrivedAUH(e.target.value)}
                  className="w-full bg-[#f9f9f9] border-2 border-[#141414] px-3 py-1.5 text-xs font-mono text-[#141414] focus:outline-none focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#141414] mb-1">
                  Date Traveled Home
                </label>
                <input
                  type="date"
                  value={dateTraveledHome}
                  onChange={(e) => setDateTraveledHome(e.target.value)}
                  className="w-full bg-[#f9f9f9] border-2 border-[#141414] px-3 py-1.5 text-xs font-mono text-[#141414] focus:outline-none focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#141414] mb-1">
                  Date Return
                </label>
                <input
                  type="date"
                  value={dateReturn}
                  onChange={(e) => setDateReturn(e.target.value)}
                  className="w-full bg-[#f9f9f9] border-2 border-[#141414] px-3 py-1.5 text-xs font-mono text-[#141414] focus:outline-none focus:bg-white"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[#141414] mb-1 flex items-center gap-1">
              <MessageSquare className="w-3.5 h-3.5 text-gray-500" />
              Comments / Notes
            </label>
            <textarea
              rows={2}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="e.g. Visa renewal pending; scheduled for Upper Zakum deployment on return."
              className="w-full bg-[#f9f9f9] border-2 border-[#141414] px-3 py-1.5 text-xs font-mono text-[#141414] focus:outline-none focus:bg-white"
            />
          </div>

          <div className="pt-4 border-t-2 border-[#141414] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border-2 border-[#141414] text-xs font-bold uppercase tracking-wider bg-[#f5f5f5] text-[#141414] hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-[#d71920] hover:bg-[#b01319] text-white text-xs font-bold uppercase tracking-widest border-2 border-[#141414] transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : null}
              {isEdit ? 'Update Document' : 'Save Personnel Document'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
