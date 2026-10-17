import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, setDoc, doc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Engineer } from '../types';
import { formatDateForDisplay, toFirestoreTimestamp } from '../lib/dateUtils';
import { useAuth } from '../context/AuthContext';
import { EngineerModal } from './EngineerModal';
import { Wrench, Search, Plus, Trash2, Edit3, RefreshCw, Sparkles, Mail, Phone, Calendar, Hash, ShieldCheck, List, LayoutGrid } from 'lucide-react';

export const EngineersView: React.FC = () => {
  const { userRole } = useAuth();
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEngineer, setEditingEngineer] = useState<Engineer | null>(null);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    const path = 'engineers';
    setLoading(true);
    setError(null);

    const unsubscribe = onSnapshot(
      collection(db, path),
      (snapshot) => {
        const list: Engineer[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          list.push({
            id: docSnap.id, // Doc ID is personId (e.g. H287330)
            name: data.name || '',
            sapNumber: data.sapNumber || '',
            optimaNumber: data.optimaNumber || '',
            optimaExpiry: data.optimaExpiry,
            h2sExpiry: data.h2sExpiry,
            tbosietExpiry: data.tbosietExpiry,
            visaExpiry: data.visaExpiry,
            customerMedicalExpiry: data.customerMedicalExpiry,
            passportExpiry: data.passportExpiry,
            eidExpiry: data.eidExpiry,
            onshoreSecurityPassExpiry: data.onshoreSecurityPassExpiry,
            offshoreSecurityPassExpiry: data.offshoreSecurityPassExpiry,
            wmsExpiry: data.wmsExpiry,
            uaeHomeContact: data.uaeHomeContact || '',
            email: data.email || '',
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          });
        });
        setEngineers(list);
        setLoading(false);
      },
      (err) => {
        setLoading(false);
        const errMsg = err?.message || String(err);
        if (errMsg.toLowerCase().includes('offline') || errMsg.toLowerCase().includes('unavailable')) {
          console.warn('Firestore snapshot listener is offline for engineers collection:', errMsg);
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

  const handleSaveEngineer = async (engineerData: Engineer, isEdit: boolean) => {
    const docPath = `engineers/${engineerData.id}`;
    try {
      await setDoc(doc(db, 'engineers', engineerData.id), {
        name: engineerData.name,
        sapNumber: engineerData.sapNumber,
        optimaNumber: engineerData.optimaNumber,
        optimaExpiry: engineerData.optimaExpiry || null,
        h2sExpiry: engineerData.h2sExpiry || null,
        tbosietExpiry: engineerData.tbosietExpiry || null,
        visaExpiry: engineerData.visaExpiry || null,
        customerMedicalExpiry: engineerData.customerMedicalExpiry || null,
        passportExpiry: engineerData.passportExpiry || null,
        eidExpiry: engineerData.eidExpiry || null,
        onshoreSecurityPassExpiry: engineerData.onshoreSecurityPassExpiry || null,
        offshoreSecurityPassExpiry: engineerData.offshoreSecurityPassExpiry || null,
        wmsExpiry: engineerData.wmsExpiry || null,
        uaeHomeContact: engineerData.uaeHomeContact,
        email: engineerData.email,
        updatedAt: engineerData.updatedAt,
        createdAt: engineerData.createdAt,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, docPath);
    }
  };

  const handleDeleteEngineer = async (id: string) => {
    if (!window.confirm(`Delete engineer document "${id}" from Firestore?`)) return;
    const docPath = `engineers/${id}`;
    try {
      await deleteDoc(doc(db, 'engineers', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, docPath);
    }
  };

  const handleSeedData = async () => {
    setSeeding(true);
    setError(null);

    const d = (dateStr: string) => toFirestoreTimestamp(dateStr);

    const sampleEngineers: Engineer[] = [
      {
        id: 'H287330',
        name: 'Michael R. Adams',
        sapNumber: '8049102',
        optimaNumber: 'OPT-99201',
        optimaExpiry: d('2027-08-15'),
        h2sExpiry: d('2026-11-20'),
        tbosietExpiry: d('2028-03-10'),
        visaExpiry: d('2027-05-30'),
        customerMedicalExpiry: d('2026-12-01'),
        passportExpiry: d('2030-01-15'),
        eidExpiry: d('2027-05-30'),
        onshoreSecurityPassExpiry: d('2026-10-10'),
        offshoreSecurityPassExpiry: d('2026-09-25'),
        wmsExpiry: d('2027-02-14'),
        uaeHomeContact: '+971 50 491 8201',
        email: 'michael.adams@halliburton.com',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'H394821',
        name: 'Elena Rostova',
        sapNumber: '8091223',
        optimaNumber: 'OPT-88120',
        optimaExpiry: d('2027-09-01'),
        h2sExpiry: d('2027-01-15'),
        tbosietExpiry: d('2027-06-20'),
        visaExpiry: d('2026-12-31'),
        customerMedicalExpiry: d('2027-04-10'),
        passportExpiry: d('2029-08-22'),
        eidExpiry: d('2026-12-31'),
        onshoreSecurityPassExpiry: d('2027-02-28'),
        offshoreSecurityPassExpiry: d('2026-11-15'),
        wmsExpiry: d('2027-07-04'),
        uaeHomeContact: '+971 52 881 0293',
        email: 'elena.rostova@halliburton.com',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'H502918',
        name: 'David K. O\'Connor',
        sapNumber: '8103942',
        optimaNumber: 'OPT-77211',
        optimaExpiry: d('2026-10-10'),
        h2sExpiry: d('2026-09-01'),
        tbosietExpiry: d('2027-11-15'),
        visaExpiry: d('2028-02-20'),
        customerMedicalExpiry: d('2026-11-30'),
        passportExpiry: d('2031-04-12'),
        eidExpiry: d('2028-02-20'),
        onshoreSecurityPassExpiry: d('2027-03-15'),
        offshoreSecurityPassExpiry: d('2026-10-30'),
        wmsExpiry: d('2027-05-18'),
        uaeHomeContact: '+971 55 902 1182',
        email: 'david.oconnor@halliburton.com',
        createdAt: new Date().toISOString(),
      },
    ];

    try {
      for (const eng of sampleEngineers) {
        await setDoc(doc(db, 'engineers', eng.id), eng);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'engineers');
    } finally {
      setSeeding(false);
    }
  };

  const filteredEngineers = engineers.filter((eng) => {
    const q = searchQuery.toLowerCase();
    return (
      eng.id.toLowerCase().includes(q) ||
      eng.name.toLowerCase().includes(q) ||
      eng.sapNumber.toLowerCase().includes(q) ||
      eng.optimaNumber.toLowerCase().includes(q) ||
      eng.email.toLowerCase().includes(q) ||
      eng.uaeHomeContact.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Metrics Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border-2 border-[#141414] p-4 flex flex-col justify-between h-24 shadow-[2px_2px_0px_0px_#141414]">
          <span className="text-[10px] uppercase font-bold text-[#141414] opacity-70">Total Engineer Docs</span>
          <span className="text-3xl font-mono font-bold tracking-tighter text-[#141414]">
            {engineers.length.toString().padStart(2, '0')}
          </span>
        </div>

        <div className="bg-white border-2 border-[#141414] p-4 flex flex-col justify-between h-24 shadow-[2px_2px_0px_0px_#141414]">
          <span className="text-[10px] uppercase font-bold text-[#141414] opacity-70">Firestore Collection</span>
          <span className="text-xs font-mono font-bold text-[#d71920] uppercase truncate">
            engineers/{"{personId}"}
          </span>
        </div>

        <div className="bg-white border-2 border-[#141414] p-4 flex flex-col justify-between h-24 shadow-[2px_2px_0px_0px_#141414]">
          <span className="text-[10px] uppercase font-bold text-[#141414] opacity-70">Expiry Fields</span>
          <span className="text-xs font-mono font-bold text-[#141414] uppercase">
            10 Expiries (Timestamps)
          </span>
        </div>

        <div className="bg-white border-2 border-[#141414] p-4 flex flex-col justify-between h-24 shadow-[2px_2px_0px_0px_#141414]">
          <span className="text-[10px] uppercase font-bold text-[#141414] opacity-70">Doc ID Spec</span>
          <span className="text-xs font-mono font-bold text-[#d71920] uppercase">
            PERSON_ID (e.g. H287330)
          </span>
        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-white border-2 border-[#141414] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-[2px_2px_0px_0px_#141414]">
        <div>
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-[#d71920]" />
            <h2 className="text-sm font-black uppercase tracking-wider text-[#141414]">
              Engineers Roster Database
            </h2>
          </div>
          <p className="text-[11px] font-mono text-gray-600 mt-0.5">
            Document ID is <code className="text-[#d71920] font-bold">personId</code> with SAP, Optima & 10 Firestore Timestamp Expiry fields.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {engineers.length === 0 && !loading && (
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
              Seed Engineer Docs
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
              setEditingEngineer(null);
              setIsModalOpen(true);
            }}
            className="px-4 py-1.5 bg-[#d71920] hover:bg-[#b01319] text-white text-xs font-bold uppercase tracking-widest border-2 border-[#141414] transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            + Add Engineer Doc
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-100 border-2 border-[#d71920] text-xs text-[#d71920] font-mono">
          <p className="font-bold">Firestore Error Diagnostics:</p>
          <pre className="mt-1 text-[11px]">{error}</pre>
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-white border-2 border-[#141414] p-3 shadow-[2px_2px_0px_0px_#141414]">
        <div className="relative">
          <Search className="w-4 h-4 text-[#141414] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by personId (H287330), Name, SAP #, Optima #, Email..."
            className="w-full bg-[#f9f9f9] border-2 border-[#141414] pl-9 pr-3 py-1.5 text-xs font-mono text-[#141414] focus:outline-none focus:bg-white"
          />
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="bg-white border-2 border-[#141414] p-12 text-center text-[#141414] font-mono text-xs space-y-2">
          <div className="w-6 h-6 border-2 border-[#141414] border-t-[#d71920] rounded-full animate-spin mx-auto" />
          <p className="font-bold uppercase tracking-wider">Listening to Firestore engineers feed...</p>
        </div>
      ) : filteredEngineers.length === 0 ? (
        <div className="bg-white border-2 border-[#141414] p-12 text-center text-[#141414]">
          <Wrench className="w-8 h-8 text-[#d71920] mx-auto mb-2" />
          <div className="text-sm font-bold uppercase tracking-wider">No Engineer Documents Found</div>
          <p className="text-xs font-mono text-gray-600 mt-1">
            {searchQuery
              ? 'No documents match your query.'
              : 'The "engineers" Firestore collection is currently empty.'}
          </p>
          {engineers.length === 0 && (
            <button
              onClick={handleSeedData}
              disabled={seeding}
              className="mt-4 px-4 py-2 bg-[#d71920] text-white text-xs font-bold uppercase tracking-widest border-2 border-[#141414]"
            >
              Seed Sample Engineer Docs
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
                  <th className="px-3 py-3 border-r border-[#141414]">Name & Email</th>
                  <th className="px-3 py-3 border-r border-[#141414]">SAP / Optima #</th>
                  <th className="px-3 py-3 border-r border-[#141414]">Optima Expiry</th>
                  <th className="px-3 py-3 border-r border-[#141414]">H2S Expiry</th>
                  <th className="px-3 py-3 border-r border-[#141414]">TBOSIET Expiry</th>
                  <th className="px-3 py-3 border-r border-[#141414]">Visa Expiry</th>
                  <th className="px-3 py-3 border-r border-[#141414]">EID Expiry</th>
                  <th className="px-3 py-3 text-right w-20">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredEngineers.map((eng) => (
                  <tr key={eng.id} className="hover:bg-[#f9f9f9] transition-colors">
                    <td className="px-3 py-2.5 border-r border-gray-200 font-bold text-[#d71920]">
                      {eng.id}
                    </td>
                    <td className="px-3 py-2.5 border-r border-gray-200 font-bold text-[#141414]">
                      {eng.name}
                      <div className="text-[10px] font-normal text-gray-500">{eng.email || 'No email'}</div>
                    </td>
                    <td className="px-3 py-2.5 border-r border-gray-200 text-[11px]">
                      <div><span className="font-bold text-[#141414]">SAP:</span> {eng.sapNumber || '—'}</div>
                      <div><span className="font-bold text-[#d71920]">Optima:</span> {eng.optimaNumber || '—'}</div>
                    </td>
                    <td className="px-3 py-2.5 border-r border-gray-200 text-[11px]">
                      {formatDateForDisplay(eng.optimaExpiry)}
                    </td>
                    <td className="px-3 py-2.5 border-r border-gray-200 text-[11px]">
                      {formatDateForDisplay(eng.h2sExpiry)}
                    </td>
                    <td className="px-3 py-2.5 border-r border-gray-200 text-[11px]">
                      {formatDateForDisplay(eng.tbosietExpiry)}
                    </td>
                    <td className="px-3 py-2.5 border-r border-gray-200 text-[11px]">
                      {formatDateForDisplay(eng.visaExpiry)}
                    </td>
                    <td className="px-3 py-2.5 border-r border-gray-200 text-[11px]">
                      {formatDateForDisplay(eng.eidExpiry)}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setEditingEngineer(eng);
                            setIsModalOpen(true);
                          }}
                          className="p-1 hover:bg-[#141414] hover:text-white transition-colors border border-transparent hover:border-[#141414]"
                          title="Edit Document"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteEngineer(eng.id)}
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
        /* High Density Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredEngineers.map((eng) => (
            <div
              key={eng.id}
              className="bg-white border-2 border-[#141414] p-5 shadow-[3px_3px_0px_0px_#141414] flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between border-b-2 border-[#141414] pb-2 mb-3">
                  <span className="font-mono font-bold text-xs bg-[#141414] text-white px-2 py-0.5">
                    Person ID: {eng.id}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-[#d71920] border border-[#d71920] px-1.5 py-0.5">
                    SAP: {eng.sapNumber || 'N/A'}
                  </span>
                </div>

                <h3 className="font-bold text-sm text-[#141414] uppercase">{eng.name}</h3>
                <div className="text-xs font-mono text-gray-600 mb-3 flex items-center gap-2">
                  <Mail className="w-3 h-3 text-gray-400" />
                  <span>{eng.email || 'No email provided'}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono bg-[#f5f5f5] p-2 border border-[#141414] mb-3">
                  <div><span className="font-bold text-[#141414]">Optima #:</span> {eng.optimaNumber || '—'}</div>
                  <div><span className="font-bold text-[#141414]">UAE Contact:</span> {eng.uaeHomeContact || '—'}</div>
                  <div><span className="font-bold text-[#141414]">Optima Exp:</span> {formatDateForDisplay(eng.optimaExpiry)}</div>
                  <div><span className="font-bold text-[#141414]">H2S Exp:</span> {formatDateForDisplay(eng.h2sExpiry)}</div>
                  <div><span className="font-bold text-[#141414]">TBOSIET Exp:</span> {formatDateForDisplay(eng.tbosietExpiry)}</div>
                  <div><span className="font-bold text-[#141414]">Visa Exp:</span> {formatDateForDisplay(eng.visaExpiry)}</div>
                  <div><span className="font-bold text-[#141414]">Passport Exp:</span> {formatDateForDisplay(eng.passportExpiry)}</div>
                  <div><span className="font-bold text-[#141414]">EID Exp:</span> {formatDateForDisplay(eng.eidExpiry)}</div>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-200 flex items-center justify-between text-xs font-mono">
                <span className="text-[10px] text-gray-500">
                  Medical: {formatDateForDisplay(eng.customerMedicalExpiry)}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingEngineer(eng);
                      setIsModalOpen(true);
                    }}
                    className="px-2 py-1 bg-[#141414] text-white text-[10px] font-bold uppercase hover:bg-[#d71920] transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteEngineer(eng.id)}
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
      <EngineerModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingEngineer(null);
        }}
        onSave={handleSaveEngineer}
        initialData={editingEngineer}
        existingIds={engineers.map((e) => e.id)}
      />
    </div>
  );
};
