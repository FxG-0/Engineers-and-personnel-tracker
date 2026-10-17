import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, setDoc, doc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Personnel, PersonnelCategory, LocationType } from '../types';
import { formatDateForDisplay, toFirestoreTimestamp } from '../lib/dateUtils';
import { parseLocationData } from '../lib/personnelUtils';
import { useAuth } from '../context/AuthContext';
import { PersonnelModal } from './PersonnelModal';
import { Users, Search, Plus, Trash2, Edit3, RefreshCw, Sparkles, MapPin, Calendar, List, LayoutGrid, MessageSquare, Tag } from 'lucide-react';

export const PersonnelView: React.FC = () => {
  const { userRole } = useAuth();
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPersonnel, setEditingPersonnel] = useState<Personnel | null>(null);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    const path = 'personnel';
    setLoading(true);
    setError(null);

    const unsubscribe = onSnapshot(
      collection(db, path),
      (snapshot) => {
        const list: Personnel[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const locInfo = parseLocationData(data);
          list.push({
            id: docSnap.id, // Doc ID is personId (e.g. H287330)
            name: data.name || '',
            hitchDays: typeof data.hitchDays === 'number' ? data.hitchDays : 0,
            dateArrivedAUH: data.dateArrivedAUH,
            dateTraveledHome: data.dateTraveledHome,
            daysOff: typeof data.daysOff === 'number' ? data.daysOff : 0,
            category: (data.category as PersonnelCategory) || 'Commuter',
            locationType: locInfo.locationType,
            rigName: locInfo.rigName,
            location: locInfo.locationDisplay,
            status: locInfo.status,
            dateReturn: data.dateReturn,
            comments: data.comments || '',
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          });
        });
        setPersonnel(list);
        setLoading(false);
      },
      (err) => {
        setLoading(false);
        const errMsg = err?.message || String(err);
        if (errMsg.toLowerCase().includes('offline') || errMsg.toLowerCase().includes('unavailable')) {
          console.warn('Firestore snapshot listener is offline for personnel collection:', errMsg);
        } else {
          try {
            handleFirestoreError(err, OperationType.GET, path);
          } catch (catched) {
            setError(catched instanceof Error ? catched.message : String(catched));
          }
        }
      }
    );

    return () => unsubscribe();
  }, []);

  const handleSavePersonnel = async (personnelData: Personnel, isEdit: boolean) => {
    const docPath = `personnel/${personnelData.id}`;
    const isRig = personnelData.locationType === 'Rig';
    const cleanRigName = isRig ? (personnelData.rigName || '').trim() : '';
    const autoStatus = isRig ? 'On Rig' : 'Off Rig';
    const legacyLoc = isRig ? (cleanRigName || 'Rig') : personnelData.locationType;

    try {
      await setDoc(doc(db, 'personnel', personnelData.id), {
        name: personnelData.name,
        hitchDays: personnelData.hitchDays,
        dateArrivedAUH: personnelData.dateArrivedAUH || null,
        dateTraveledHome: personnelData.dateTraveledHome || null,
        daysOff: personnelData.daysOff,
        category: personnelData.category,
        locationType: personnelData.locationType,
        rigName: cleanRigName,
        location: legacyLoc,
        status: autoStatus,
        dateReturn: personnelData.dateReturn || null,
        comments: personnelData.comments,
        updatedAt: personnelData.updatedAt || new Date().toISOString(),
        createdAt: personnelData.createdAt,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, docPath);
    }
  };

  const handleDeletePersonnel = async (id: string) => {
    if (!window.confirm(`Delete field personnel document "${id}" from Firestore?`)) return;
    const docPath = `personnel/${id}`;
    try {
      await deleteDoc(doc(db, 'personnel', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, docPath);
    }
  };

  const handleSeedData = async () => {
    setSeeding(true);
    setError(null);

    const d = (dateStr: string) => toFirestoreTimestamp(dateStr);

    const samplePersonnel: Personnel[] = [
      {
        id: 'H287330',
        name: 'Michael R. Adams',
        hitchDays: 28,
        dateArrivedAUH: d('2026-07-10'),
        dateTraveledHome: d('2026-08-07'),
        daysOff: 28,
        category: 'Commuter',
        locationType: 'Rig',
        rigName: 'AD-181',
        location: 'AD-181',
        status: 'On Rig',
        dateReturn: d('2026-09-04'),
        comments: 'Upper Zakum platform assignment; H2S refresher completed.',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'H394821',
        name: 'Elena Rostova',
        hitchDays: 35,
        dateArrivedAUH: d('2026-06-01'),
        dateTraveledHome: d('2026-07-05'),
        daysOff: 35,
        category: 'Consultant',
        locationType: 'Office',
        rigName: '',
        location: 'Office',
        status: 'Off Rig',
        dateReturn: d('2026-08-10'),
        comments: 'Leading Sperry Drilling automation field test.',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'H502918',
        name: 'David K. O\'Connor',
        hitchDays: 28,
        dateArrivedAUH: d('2026-07-20'),
        dateTraveledHome: d('2026-08-17'),
        daysOff: 28,
        category: 'PRL',
        locationType: 'Rig',
        rigName: 'GW-154',
        location: 'GW-154',
        status: 'On Rig',
        dateReturn: d('2026-09-14'),
        comments: 'Stimulation & fracturing specialist on rotation.',
        createdAt: new Date().toISOString(),
      },
    ];

    try {
      for (const p of samplePersonnel) {
        await setDoc(doc(db, 'personnel', p.id), p);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'personnel');
    } finally {
      setSeeding(false);
    }
  };

  const filteredPersonnel = personnel.filter((item) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      item.id.toLowerCase().includes(q) ||
      item.name.toLowerCase().includes(q) ||
      item.location.toLowerCase().includes(q) ||
      item.status.toLowerCase().includes(q) ||
      item.comments.toLowerCase().includes(q);

    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border-2 border-[#141414] p-4 flex flex-col justify-between h-24 shadow-[2px_2px_0px_0px_#141414]">
          <span className="text-[10px] uppercase font-bold text-[#141414] opacity-70">Total Field Personnel</span>
          <span className="text-3xl font-mono font-bold tracking-tighter text-[#141414]">
            {personnel.length.toString().padStart(2, '0')}
          </span>
        </div>

        <div className="bg-white border-2 border-[#141414] p-4 flex flex-col justify-between h-24 shadow-[2px_2px_0px_0px_#141414]">
          <span className="text-[10px] uppercase font-bold text-[#141414] opacity-70">Firestore Collection</span>
          <span className="text-xs font-mono font-bold text-[#d71920] uppercase truncate">
            personnel/{"{personId}"}
          </span>
        </div>

        <div className="bg-white border-2 border-[#141414] p-4 flex flex-col justify-between h-24 shadow-[2px_2px_0px_0px_#141414]">
          <span className="text-[10px] uppercase font-bold text-[#141414] opacity-70">Categories</span>
          <span className="text-xs font-mono font-bold text-[#141414] uppercase">
            Consultant / Commuter / PRL / Loan
          </span>
        </div>

        <div className="bg-white border-2 border-[#141414] p-4 flex flex-col justify-between h-24 shadow-[2px_2px_0px_0px_#141414]">
          <span className="text-[10px] uppercase font-bold text-[#141414] opacity-70">Doc ID Link</span>
          <span className="text-xs font-mono font-bold text-[#d71920] uppercase">
            Matches Engineer Doc ID
          </span>
        </div>
      </div>

      {/* Control Banner */}
      <div className="bg-white border-2 border-[#141414] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-[2px_2px_0px_0px_#141414]">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#d71920]" />
            <h2 className="text-sm font-black uppercase tracking-wider text-[#141414]">
              Field Personnel Database
            </h2>
          </div>
          <p className="text-[11px] font-mono text-gray-600 mt-0.5">
            Document ID matches engineer's <code className="text-[#d71920] font-bold">personId</code> with hitch days, AUH dates, category & location.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {personnel.length === 0 && !loading && (
            <button
              onClick={handleSeedData}
              disabled={seeding}
              className="px-3 py-1.5 bg-[#f5f5f5] hover:bg-[#141414] hover:text-white border-2 border-[#141414] text-xs font-bold uppercase tracking-wider text-[#141414] transition-colors flex items-center gap-1.5"
            >
              {seeding ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-[#d71920]" />
              )}
              Seed Personnel Docs
            </button>
          )}

          <div className="flex border-2 border-[#141414] bg-[#f5f5f5] p-0.5">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 text-xs font-bold ${viewMode === 'table' ? 'bg-[#141414] text-white' : 'text-[#141414]'}`}
              title="Table View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 text-xs font-bold ${viewMode === 'cards' ? 'bg-[#141414] text-white' : 'text-[#141414]'}`}
              title="Cards View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={() => {
              setEditingPersonnel(null);
              setIsModalOpen(true);
            }}
            className="px-4 py-1.5 bg-[#d71920] hover:bg-[#b01319] text-white text-xs font-bold uppercase tracking-widest border-2 border-[#141414] transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            + Add Personnel Doc
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-100 border-2 border-[#d71920] text-xs text-[#d71920] font-mono">
          <p className="font-bold">Firestore Error Diagnostics:</p>
          <pre className="mt-1 text-[11px]">{error}</pre>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white border-2 border-[#141414] p-3 grid grid-cols-1 md:grid-cols-12 gap-3 shadow-[2px_2px_0px_0px_#141414]">
        <div className="md:col-span-8 relative">
          <Search className="w-4 h-4 text-[#141414] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by personId (H287330), Name, Location / Rig, Status, Comments..."
            className="w-full bg-[#f9f9f9] border-2 border-[#141414] pl-9 pr-3 py-1.5 text-xs font-mono text-[#141414] focus:outline-none focus:bg-white"
          />
        </div>

        <div className="md:col-span-4">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full bg-[#f9f9f9] border-2 border-[#141414] px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[#141414] focus:outline-none focus:bg-white"
          >
            <option value="all">ALL CATEGORIES</option>
            <option value="Consultant">CONSULTANT</option>
            <option value="Commuter">COMMUTER</option>
            <option value="PRL">PRL</option>
            <option value="Loan">LOAN</option>
          </select>
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="bg-white border-2 border-[#141414] p-12 text-center text-[#141414] font-mono text-xs space-y-2">
          <div className="w-6 h-6 border-2 border-[#141414] border-t-[#d71920] rounded-full animate-spin mx-auto" />
          <p className="font-bold uppercase tracking-wider">Listening to Firestore personnel feed...</p>
        </div>
      ) : filteredPersonnel.length === 0 ? (
        <div className="bg-white border-2 border-[#141414] p-12 text-center text-[#141414]">
          <Users className="w-8 h-8 text-[#d71920] mx-auto mb-2" />
          <div className="text-sm font-bold uppercase tracking-wider">No Personnel Documents Found</div>
          <p className="text-xs font-mono text-gray-600 mt-1">
            {searchQuery || categoryFilter !== 'all'
              ? 'No documents match your query.'
              : 'The "personnel" Firestore collection is currently empty.'}
          </p>
          {personnel.length === 0 && (
            <button
              onClick={handleSeedData}
              disabled={seeding}
              className="mt-4 px-4 py-2 bg-[#d71920] text-white text-xs font-bold uppercase tracking-widest border-2 border-[#141414]"
            >
              Seed Sample Personnel Docs
            </button>
          )}
        </div>
      ) : viewMode === 'table' ? (
        /* High Density Table View */
        <div className="bg-white border-2 border-[#141414] overflow-hidden shadow-[3px_3px_0px_0px_#141414]">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs font-mono">
              <thead>
                <tr className="bg-[#f5f5f5] border-b-2 border-[#141414] text-[10px] uppercase font-bold text-[#141414]">
                  <th className="px-3 py-3 border-r border-[#141414]">Person ID</th>
                  <th className="px-3 py-3 border-r border-[#141414]">Full Name</th>
                  <th className="px-3 py-3 border-r border-[#141414]">Category</th>
                  <th className="px-3 py-3 border-r border-[#141414]">Location / Rig</th>
                  <th className="px-3 py-3 border-r border-[#141414]">Status</th>
                  <th className="px-3 py-3 border-r border-[#141414]">Hitch / Days Off</th>
                  <th className="px-3 py-3 border-r border-[#141414]">Arrived AUH</th>
                  <th className="px-3 py-3 border-r border-[#141414]">Traveled Home</th>
                  <th className="px-3 py-3 border-r border-[#141414]">Date Return</th>
                  <th className="px-3 py-3 text-right w-20">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredPersonnel.map((p) => (
                  <tr key={p.id} className="hover:bg-[#f9f9f9] transition-colors">
                    <td className="px-3 py-2.5 border-r border-gray-200 font-bold text-[#d71920]">
                      {p.id}
                    </td>
                    <td className="px-3 py-2.5 border-r border-gray-200 font-bold text-[#141414]">
                      {p.name}
                      {p.comments && (
                        <div className="text-[10px] font-normal text-gray-500 truncate max-w-[180px]">
                          {p.comments}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 border-r border-gray-200 font-bold text-[#141414]">
                      <span className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 text-[10px]">
                        {p.category}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 border-r border-gray-200 text-[11px]">
                      {p.location || '—'}
                    </td>
                    <td className="px-3 py-2.5 border-r border-gray-200 text-[11px] font-bold text-[#d71920]">
                      {p.status || '—'}
                    </td>
                    <td className="px-3 py-2.5 border-r border-gray-200 text-[11px]">
                      {p.hitchDays} On / {p.daysOff} Off
                    </td>
                    <td className="px-3 py-2.5 border-r border-gray-200 text-[11px]">
                      {formatDateForDisplay(p.dateArrivedAUH)}
                    </td>
                    <td className="px-3 py-2.5 border-r border-gray-200 text-[11px]">
                      {formatDateForDisplay(p.dateTraveledHome)}
                    </td>
                    <td className="px-3 py-2.5 border-r border-gray-200 text-[11px]">
                      {formatDateForDisplay(p.dateReturn)}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setEditingPersonnel(p);
                            setIsModalOpen(true);
                          }}
                          className="p-1 hover:bg-[#141414] hover:text-white transition-colors border border-transparent hover:border-[#141414]"
                          title="Edit Document"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeletePersonnel(p.id)}
                          className="p-1 hover:bg-[#d71920] hover:text-white transition-colors border border-transparent hover:border-[#141414]"
                          title="Delete Document"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPersonnel.map((p) => (
            <div
              key={p.id}
              className="bg-white border-2 border-[#141414] p-5 shadow-[3px_3px_0px_0px_#141414] flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between border-b-2 border-[#141414] pb-2 mb-3">
                  <span className="font-mono font-bold text-xs bg-[#141414] text-white px-2 py-0.5">
                    Person ID: {p.id}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-[#d71920] border border-[#d71920] px-1.5 py-0.5">
                    {p.category}
                  </span>
                </div>

                <h3 className="font-bold text-sm text-[#141414] uppercase">{p.name}</h3>
                <div className="text-xs font-mono text-[#d71920] font-bold mb-3 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-gray-500" />
                  <span>{p.location || 'Unassigned Location'}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono bg-[#f5f5f5] p-2 border border-[#141414] mb-3">
                  <div><span className="font-bold text-[#141414]">Status:</span> {p.status}</div>
                  <div><span className="font-bold text-[#141414]">Rotation:</span> {p.hitchDays}d / {p.daysOff}d</div>
                  <div><span className="font-bold text-[#141414]">Arrived AUH:</span> {formatDateForDisplay(p.dateArrivedAUH)}</div>
                  <div><span className="font-bold text-[#141414]">Traveled Home:</span> {formatDateForDisplay(p.dateTraveledHome)}</div>
                  <div className="col-span-2"><span className="font-bold text-[#d71920]">Date Return:</span> {formatDateForDisplay(p.dateReturn)}</div>
                </div>

                {p.comments && (
                  <p className="text-[11px] font-mono text-gray-600 bg-gray-50 p-2 border border-gray-200 mb-2">
                    <span className="font-bold text-[#141414]">Notes: </span>{p.comments}
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-gray-200 flex items-center justify-between text-xs font-mono">
                <span className="text-[10px] text-gray-500">
                  {p.updatedAt ? new Date(p.updatedAt).toLocaleDateString() : 'Synced'}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingPersonnel(p);
                      setIsModalOpen(true);
                    }}
                    className="px-2 py-1 bg-[#141414] text-white text-[10px] font-bold uppercase hover:bg-[#d71920] transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeletePersonnel(p.id)}
                    className="px-2 py-1 bg-white border border-[#141414] text-[10px] font-bold uppercase hover:bg-red-100 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <PersonnelModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingPersonnel(null);
        }}
        onSave={handleSavePersonnel}
        initialData={editingPersonnel}
        existingIds={personnel.map((p) => p.id)}
      />
    </div>
  );
};
