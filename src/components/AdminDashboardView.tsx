import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, setDoc, doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Engineer, Personnel, PersonnelCategory, LocationType } from '../types';
import { formatDateForInput, formatDateForDisplay, toFirestoreTimestamp, getDaysRemaining } from '../lib/dateUtils';
import { parseLocationData, LOCATION_TYPE_OPTIONS, getEngineerCriticalExpiries, formatDateNice } from '../lib/personnelUtils';
import { 
  ShieldCheck, 
  Search, 
  Wrench, 
  Users, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Save, 
  Filter, 
  ArrowUpDown, 
  MapPin, 
  Tag, 
  RefreshCw,
  Lock,
  Calendar,
  Hash,
  Eye,
  Check
} from 'lucide-react';

export const AdminDashboardView: React.FC = () => {
  const { userRole } = useAuth();

  // Firestore collections real-time state
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [personnel, setPersonnel] = useState<Personnel[]>([]);

  const [engineersLoading, setEngineersLoading] = useState(true);
  const [personnelLoading, setPersonnelLoading] = useState(true);

  const [engineersError, setEngineersError] = useState<string | null>(null);
  const [personnelError, setPersonnelError] = useState<string | null>(null);

  // Global search input for name or personId across both tables
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Expand state for 30-day expiry summary panel
  const [showExpirySummaryList, setShowExpirySummaryList] = useState<boolean>(false);

  // Personnel Table Sort & Filter state
  const [personnelLocationFilter, setPersonnelLocationFilter] = useState<string>('all');
  const [personnelCategoryFilter, setPersonnelCategoryFilter] = useState<string>('all');
  const [personnelSortField, setPersonnelSortField] = useState<'id' | 'name' | 'hitchDays' | 'locationType' | 'rigName' | 'category' | 'dateReturn'>('name');
  const [personnelSortOrder, setPersonnelSortOrder] = useState<'asc' | 'desc'>('asc');

  // Track modified row status / notification
  const [savingRowId, setSavingRowId] = useState<string | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Active tab in admin view (All in one stacked page or section scroll)
  const [adminSection, setAdminSection] = useState<'both' | 'engineers' | 'personnel'>('both');

  // 1. Real-time Firestore subscription to `engineers` collection
  useEffect(() => {
    setEngineersLoading(true);
    setEngineersError(null);

    const unsubscribe = onSnapshot(
      collection(db, 'engineers'),
      (snapshot) => {
        const list: Engineer[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          list.push({
            id: docSnap.id, // Person ID e.g. H287330
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
        setEngineersLoading(false);
      },
      (err) => {
        setEngineersLoading(false);
        const msg = err?.message || String(err);
        if (!msg.toLowerCase().includes('offline')) {
          setEngineersError(msg);
        }
      }
    );

    return () => unsubscribe();
  }, []);

  // 2. Real-time Firestore subscription to `personnel` collection
  useEffect(() => {
    setPersonnelLoading(true);
    setPersonnelError(null);

    const unsubscribe = onSnapshot(
      collection(db, 'personnel'),
      (snapshot) => {
        const list: Personnel[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const locInfo = parseLocationData(data);
          list.push({
            id: docSnap.id, // Person ID e.g. H287330
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
        setPersonnelLoading(false);
      },
      (err) => {
        setPersonnelLoading(false);
        const msg = err?.message || String(err);
        if (!msg.toLowerCase().includes('offline')) {
          setPersonnelError(msg);
        }
      }
    );

    return () => unsubscribe();
  }, []);

  // Access guard
  if (userRole !== 'admin') {
    return (
      <div className="bg-white border-2 border-[#141414] p-8 max-w-2xl mx-auto shadow-[4px_4px_0px_0px_#141414] space-y-4 text-center">
        <div className="w-12 h-12 bg-red-100 border-2 border-[#d71920] text-[#d71920] rounded-full flex items-center justify-center mx-auto">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-black uppercase text-[#141414]">Access Restricted: Admin Only</h2>
        <p className="text-xs font-mono text-gray-600">
          You are currently signed in with a standard user role. The Admin Dashboard is restricted to accounts with administrator privileges.
        </p>
      </div>
    );
  }

  // --- Helper Expiry Badge Generator ---
  // Green: > 60 days
  // Yellow: 30-60 days
  // Red: < 30 days or past
  const renderExpiryBadge = (dateVal: any) => {
    const dateStr = formatDateForInput(dateVal);
    if (!dateStr) {
      return (
        <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase bg-gray-100 text-gray-500 border border-gray-300 rounded-xs shrink-0">
          NOT SET
        </span>
      );
    }

    const days = getDaysRemaining(dateStr);
    if (days === null) {
      return (
        <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase bg-gray-100 text-gray-500 border border-gray-300 rounded-xs shrink-0">
          INVALID
        </span>
      );
    }

    if (days > 60) {
      return (
        <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-500 rounded-xs shrink-0 inline-flex items-center gap-1">
          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
          <span>{days}d (&gt;60d)</span>
        </span>
      );
    }

    if (days >= 30 && days <= 60) {
      return (
        <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase bg-amber-100 text-amber-900 border border-amber-500 rounded-xs shrink-0 inline-flex items-center gap-1">
          <Clock className="w-2.5 h-2.5 text-amber-600" />
          <span>{days}d (30-60d)</span>
        </span>
      );
    }

    const isPast = days < 0;
    return (
      <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase bg-red-100 text-[#d71920] border border-[#d71920] rounded-xs shrink-0 inline-flex items-center gap-1">
        <AlertCircle className="w-2.5 h-2.5 text-[#d71920]" />
        <span>{isPast ? `EXPIRED (${Math.abs(days)}d ago)` : `CRITICAL (${days}d left)`}</span>
      </span>
    );
  };

  // --- Helper Hitch Days Badge Generator ---
  // Green < 50
  // Yellow 50-80
  // Red > 80
  const renderHitchDaysBadge = (hitchVal: number) => {
    if (hitchVal < 50) {
      return (
        <span className="px-2 py-0.5 text-[10px] font-mono font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-500 rounded-xs inline-flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          <span>{hitchVal}d (&lt;50d)</span>
        </span>
      );
    }
    if (hitchVal >= 50 && hitchVal <= 80) {
      return (
        <span className="px-2 py-0.5 text-[10px] font-mono font-black uppercase bg-amber-100 text-amber-900 border border-amber-500 rounded-xs inline-flex items-center gap-1">
          <Clock className="w-3 h-3 text-amber-600" />
          <span>{hitchVal}d (50-80d)</span>
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 text-[10px] font-mono font-black uppercase bg-red-100 text-[#d71920] border border-[#d71920] rounded-xs inline-flex items-center gap-1">
        <AlertCircle className="w-3 h-3 text-[#d71920]" />
        <span>{hitchVal}d (&gt;80d)</span>
      </span>
    );
  };

  // --- Inline Field Update Handlers ---
  const handleUpdateEngineerField = async (personId: string, fieldName: keyof Engineer, val: any) => {
    setSavingRowId(`eng-${personId}-${String(fieldName)}`);
    const docRef = doc(db, 'engineers', personId);
    let updatedVal = val;

    // Convert date string input to Timestamp if it's an expiry field
    if (String(fieldName).endsWith('Expiry')) {
      updatedVal = toFirestoreTimestamp(val);
    }

    try {
      await updateDoc(docRef, {
        [fieldName]: updatedVal,
        updatedAt: new Date().toISOString(),
      });
      setSaveSuccessMsg(`Updated ${String(fieldName)} for ${personId}`);
      setTimeout(() => setSaveSuccessMsg(null), 2500);
    } catch (err) {
      console.error(`Failed to update ${String(fieldName)}:`, err);
    } finally {
      setSavingRowId(null);
    }
  };

  const handleUpdatePersonnelField = async (personId: string, fieldName: keyof Personnel | 'locationType' | 'rigName', val: any) => {
    setSavingRowId(`p-${personId}-${String(fieldName)}`);
    const docRef = doc(db, 'personnel', personId);
    let updatedVal = val;

    if (String(fieldName).startsWith('date')) {
      updatedVal = toFirestoreTimestamp(val);
    } else if (fieldName === 'hitchDays' || fieldName === 'daysOff') {
      updatedVal = Number(val) || 0;
    }

    const payload: Record<string, any> = {
      [fieldName]: updatedVal,
      updatedAt: new Date().toISOString(),
    };

    if (fieldName === 'locationType') {
      const newLocType = updatedVal as LocationType;
      const autoStatus = newLocType === 'Rig' ? 'On Rig' : 'Off Rig';
      payload.status = autoStatus;
      if (newLocType !== 'Rig') {
        payload.rigName = '';
        payload.location = newLocType;
      } else {
        const currentP = personnel.find((p) => p.id === personId);
        payload.location = currentP?.rigName || 'Rig';
      }
    } else if (fieldName === 'rigName') {
      payload.location = updatedVal;
    }

    try {
      await updateDoc(docRef, payload);
      setSaveSuccessMsg(`Updated ${String(fieldName)} for ${personId}`);
      setTimeout(() => setSaveSuccessMsg(null), 2500);
    } catch (err) {
      console.error(`Failed to update ${String(fieldName)}:`, err);
    } finally {
      setSavingRowId(null);
    }
  };

  // --- Filtering & Sorting ---
  const q = searchQuery.trim().toLowerCase();

  // Engineers filtered by name or personId (id)
  const filteredEngineers = engineers.filter((eng) => {
    if (!q) return true;
    return eng.id.toLowerCase().includes(q) || eng.name.toLowerCase().includes(q);
  });

  // Personnel filtered by search (name or personId), locationType, category
  const filteredPersonnel = personnel
    .filter((p) => {
      // Search box filter by name or personId
      if (q && !p.id.toLowerCase().includes(q) && !p.name.toLowerCase().includes(q)) {
        return false;
      }
      // LocationType filter
      if (personnelLocationFilter !== 'all' && p.locationType !== personnelLocationFilter) {
        return false;
      }
      // Category filter
      if (personnelCategoryFilter !== 'all' && p.category !== personnelCategoryFilter) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      let valA: any = a[personnelSortField] || '';
      let valB: any = b[personnelSortField] || '';

      if (personnelSortField === 'hitchDays') {
        valA = Number(valA) || 0;
        valB = Number(valB) || 0;
      } else if (personnelSortField === 'dateReturn') {
        valA = formatDateForInput(valA);
        valB = formatDateForInput(valB);
      } else {
        valA = String(valA).toLowerCase();
        valB = String(valB).toLowerCase();
      }

      if (valA < valB) return personnelSortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return personnelSortOrder === 'asc' ? 1 : -1;
      return 0;
    });

  // --- 30-Day Expiry Audit Summary ---
  const engineersWithCriticalExpiries = engineers
    .map((eng) => {
      const criticals = getEngineerCriticalExpiries(eng);
      return { engineer: eng, criticals };
    })
    .filter((item) => item.criticals.length > 0);

  const totalPeopleWithExpiries = engineersWithCriticalExpiries.length;
  const totalCriticalCertsCount = engineersWithCriticalExpiries.reduce(
    (sum, item) => sum + item.criticals.length,
    0
  );

  return (
    <div className="space-y-6">
      
      {/* Top Header & Search Bar */}
      <div className="bg-white border-2 border-[#141414] p-5 shadow-[4px_4px_0px_0px_#141414] space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-[#141414] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-[#d71920]" />
              <h1 className="text-lg font-black uppercase tracking-wider text-[#141414]">
                Administrator Real-Time Master Control
              </h1>
            </div>
            <p className="text-xs font-mono text-gray-600 mt-1">
              Live Firestore feed (<code className="text-[#d71920] font-bold">onSnapshot</code>) for <code className="font-bold text-[#141414]">engineers</code> & <code className="font-bold text-[#141414]">personnel</code>. Every document field is editable inline.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {saveSuccessMsg && (
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 border-2 border-emerald-500 font-mono text-xs font-bold animate-pulse flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                {saveSuccessMsg}
              </span>
            )}
            <div className="flex border-2 border-[#141414] bg-[#f5f5f5]">
              <button
                onClick={() => setAdminSection('both')}
                className={`px-3 py-1 text-xs font-mono font-bold uppercase ${adminSection === 'both' ? 'bg-[#141414] text-white' : 'text-[#141414]'}`}
              >
                All Tables
              </button>
              <button
                onClick={() => setAdminSection('engineers')}
                className={`px-3 py-1 text-xs font-mono font-bold uppercase border-l border-[#141414] ${adminSection === 'engineers' ? 'bg-[#141414] text-white' : 'text-[#141414]'}`}
              >
                Engineers ({engineers.length})
              </button>
              <button
                onClick={() => setAdminSection('personnel')}
                className={`px-3 py-1 text-xs font-mono font-bold uppercase border-l border-[#141414] ${adminSection === 'personnel' ? 'bg-[#141414] text-white' : 'text-[#141414]'}`}
              >
                Personnel ({personnel.length})
              </button>
            </div>
          </div>
        </div>

        {/* Global Search Box (filter by name or personId across both tables) */}
        <div className="bg-[#f5f5f5] border-2 border-[#141414] p-3 space-y-2">
          <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#141414]">
            Global Master Search (Filters Both Engineers & Personnel Tables by Name or Person ID):
          </label>
          <div className="relative">
            <Search className="w-4 h-4 text-[#141414] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Type Name (e.g. 'Michael') or Person ID (e.g. 'H287330')..."
              className="w-full bg-white border-2 border-[#141414] pl-9 pr-3 py-2 text-xs font-mono font-bold text-[#141414] focus:outline-none focus:ring-2 focus:ring-[#d71920]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-[#d71920] hover:underline"
              >
                CLEAR
              </button>
            )}
          </div>
        </div>
      </div>

      {/* SUMMARY PANEL FOR EXPIRIES WITHIN 30 DAYS */}
      <div className="bg-white border-2 border-[#141414] shadow-[4px_4px_0px_0px_#141414] overflow-hidden">
        <div className="p-4 bg-amber-50 border-b-2 border-[#141414] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#d71920] text-white shrink-0 border-2 border-[#141414]">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black uppercase tracking-wider text-[#141414]">
                  30-Day Expiry Compliance Monitor
                </h2>
                <span className="px-2 py-0.5 bg-[#d71920] text-white font-mono text-[10px] font-bold uppercase rounded-xs">
                  Real-Time Audit
                </span>
              </div>
              <p className="text-xs font-mono text-gray-700 mt-0.5">
                <span className="font-bold text-[#d71920] text-sm">{totalPeopleWithExpiries}</span> {totalPeopleWithExpiries === 1 ? 'person has' : 'people have'} at least one certification or official document expiring within 30 days or already expired ({totalCriticalCertsCount} total critical certs).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowExpirySummaryList(!showExpirySummaryList)}
              className="px-3.5 py-2 bg-[#141414] hover:bg-[#d71920] text-white font-mono font-bold text-xs uppercase tracking-wider border-2 border-[#141414] transition-colors flex items-center gap-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]"
            >
              <Eye className="w-4 h-4" />
              {showExpirySummaryList ? 'Hide Expiring Personnel' : `Expand to See Who (${totalPeopleWithExpiries})`}
              {showExpirySummaryList ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Expanded Personnel List */}
        {showExpirySummaryList && (
          <div className="p-4 bg-[#fdfdfd] space-y-3 font-mono text-xs border-t-2 border-[#141414]">
            {totalPeopleWithExpiries === 0 ? (
              <div className="p-4 bg-emerald-50 border-2 border-emerald-500 text-emerald-900 font-mono text-xs text-center font-bold">
                No personnel currently have expiries within 30 days. All certifications are compliant!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {engineersWithCriticalExpiries.map(({ engineer: eng, criticals }) => (
                  <div 
                    key={eng.id}
                    className="bg-white border-2 border-[#141414] p-3 shadow-[3px_3px_0px_0px_#141414] flex flex-col justify-between gap-3"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                        <div>
                          <span className="font-black text-xs text-[#141414] block">
                            {eng.name || 'Unnamed Person'}
                          </span>
                          <span className="text-[10px] text-gray-500 font-bold">
                            Person ID: <code className="bg-[#141414] text-white px-1.5 py-0.2">{eng.id}</code>
                          </span>
                        </div>
                        <span className="px-2 py-0.5 text-[9px] font-bold bg-red-100 text-[#d71920] border border-[#d71920]">
                          {criticals.length} Critical
                        </span>
                      </div>

                      <div className="space-y-1.5 pt-1">
                        {criticals.map((c) => (
                          <div 
                            key={c.key}
                            className={`p-1.5 border text-[11px] flex items-start gap-1.5 ${
                              c.days < 0 
                                ? 'bg-red-50 border-[#d71920] text-red-950 font-bold' 
                                : 'bg-amber-50 border-amber-500 text-amber-950 font-medium'
                            }`}
                          >
                            <AlertCircle className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${c.days < 0 ? 'text-[#d71920]' : 'text-amber-600'}`} />
                            <div className="flex-1 leading-tight">
                              <span className="font-bold uppercase text-[10px] block text-[#141414]">{c.label}</span>
                              <span>{c.days < 0 ? `EXPIRED ${Math.abs(c.days)}d ago (${c.dateNice})` : `In ${c.days} day${c.days === 1 ? '' : 's'} (${c.dateNice})`}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setSearchQuery(eng.id);
                        setAdminSection('engineers');
                      }}
                      className="w-full py-1 bg-[#f5f5f5] hover:bg-[#141414] hover:text-white border border-[#141414] text-[10px] font-mono font-bold uppercase transition-colors text-center"
                    >
                      Filter Table to this Person →
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* TABLE 1: ALL ENGINEERS DOCUMENTS (INLINE EDITABLE) */}
      {(adminSection === 'both' || adminSection === 'engineers') && (
        <div className="bg-white border-2 border-[#141414] p-5 shadow-[4px_4px_0px_0px_#141414] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-2 border-[#141414] pb-3">
            <div className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-[#d71920]" />
              <h2 className="text-sm font-black uppercase tracking-wider text-[#141414]">
                Engineers Master Database — Inline Editable ({filteredEngineers.length} Docs)
              </h2>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-mono text-gray-600">
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold border border-emerald-400">&gt;60d (Green)</span>
              <span className="px-2 py-0.5 bg-amber-100 text-amber-900 font-bold border border-amber-400">30-60d (Yellow)</span>
              <span className="px-2 py-0.5 bg-red-100 text-[#d71920] font-bold border border-red-400">&lt;30d (Red)</span>
            </div>
          </div>

          {engineersLoading ? (
            <div className="py-8 text-center font-mono text-xs text-gray-500 space-y-2">
              <div className="w-5 h-5 border-2 border-[#141414] border-t-[#d71920] rounded-full animate-spin mx-auto" />
              <p>Loading engineers real-time feed...</p>
            </div>
          ) : filteredEngineers.length === 0 ? (
            <div className="p-8 text-center font-mono text-xs text-gray-500 bg-gray-50 border-2 border-dashed border-gray-300">
              No engineer documents found matching query "{searchQuery}".
            </div>
          ) : (
            <div className="overflow-x-auto border-2 border-[#141414]">
              <table className="w-full border-collapse text-left text-xs font-mono">
                <thead>
                  <tr className="bg-[#141414] text-white text-[10px] uppercase font-bold tracking-wider">
                    <th className="px-3 py-2.5 border-r border-[#333]">Person ID</th>
                    <th className="px-3 py-2.5 border-r border-[#333]">Name</th>
                    <th className="px-3 py-2.5 border-r border-[#333]">SAP #</th>
                    <th className="px-3 py-2.5 border-r border-[#333]">Optima #</th>
                    <th className="px-3 py-2.5 border-r border-[#333]">Email</th>
                    <th className="px-3 py-2.5 border-r border-[#333]">Optima Exp</th>
                    <th className="px-3 py-2.5 border-r border-[#333]">H2S Exp</th>
                    <th className="px-3 py-2.5 border-r border-[#333]">TBOSIET Exp</th>
                    <th className="px-3 py-2.5 border-r border-[#333]">Visa Exp</th>
                    <th className="px-3 py-2.5 border-r border-[#333]">Medical Exp</th>
                    <th className="px-3 py-2.5 border-r border-[#333]">Passport Exp</th>
                    <th className="px-3 py-2.5 border-r border-[#333]">EID Exp</th>
                    <th className="px-3 py-2.5 border-r border-[#333]">Onshore Pass</th>
                    <th className="px-3 py-2.5 border-r border-[#333]">Offshore Pass</th>
                    <th className="px-3 py-2.5 border-r border-[#333]">WMS Exp</th>
                    <th className="px-3 py-2.5">UAE Contact</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-300 bg-white">
                  {filteredEngineers.map((eng) => (
                    <tr key={eng.id} className="hover:bg-amber-50/50 transition-colors">
                      {/* Person ID (ReadOnly doc ID) */}
                      <td className="px-2 py-2 border-r border-gray-300 font-bold text-[#d71920] bg-gray-50">
                        {eng.id}
                      </td>

                      {/* Name */}
                      <td className="px-2 py-2 border-r border-gray-300 min-w-[150px]">
                        <input
                          key={`eng-name-${eng.id}-${eng.name}`}
                          type="text"
                          defaultValue={eng.name}
                          onBlur={(e) => {
                            if (e.target.value !== eng.name) {
                              handleUpdateEngineerField(eng.id, 'name', e.target.value);
                            }
                          }}
                          className="w-full bg-white border border-gray-300 px-1.5 py-1 text-xs font-bold font-mono text-[#141414] focus:outline-none focus:border-[#d71920]"
                        />
                      </td>

                      {/* SAP Number */}
                      <td className="px-2 py-2 border-r border-gray-300 min-w-[100px]">
                        <input
                          key={`eng-sap-${eng.id}-${eng.sapNumber}`}
                          type="text"
                          defaultValue={eng.sapNumber}
                          onBlur={(e) => {
                            if (e.target.value !== eng.sapNumber) {
                              handleUpdateEngineerField(eng.id, 'sapNumber', e.target.value);
                            }
                          }}
                          className="w-full bg-white border border-gray-300 px-1.5 py-1 text-xs font-mono text-[#141414] focus:outline-none focus:border-[#d71920]"
                        />
                      </td>

                      {/* Optima Number */}
                      <td className="px-2 py-2 border-r border-gray-300 min-w-[110px]">
                        <input
                          key={`eng-optima-${eng.id}-${eng.optimaNumber}`}
                          type="text"
                          defaultValue={eng.optimaNumber}
                          onBlur={(e) => {
                            if (e.target.value !== eng.optimaNumber) {
                              handleUpdateEngineerField(eng.id, 'optimaNumber', e.target.value);
                            }
                          }}
                          className="w-full bg-white border border-gray-300 px-1.5 py-1 text-xs font-mono text-[#141414] focus:outline-none focus:border-[#d71920]"
                        />
                      </td>

                      {/* Email */}
                      <td className="px-2 py-2 border-r border-gray-300 min-w-[170px]">
                        <input
                          key={`eng-email-${eng.id}-${eng.email}`}
                          type="email"
                          defaultValue={eng.email}
                          onBlur={(e) => {
                            if (e.target.value !== eng.email) {
                              handleUpdateEngineerField(eng.id, 'email', e.target.value);
                            }
                          }}
                          className="w-full bg-white border border-gray-300 px-1.5 py-1 text-xs font-mono text-[#141414] focus:outline-none focus:border-[#d71920]"
                        />
                      </td>

                      {/* Expiry 1: Optima Expiry */}
                      <td className="px-2 py-2 border-r border-gray-300 min-w-[190px]">
                        <div className="flex flex-col gap-1">
                          <input
                            key={`eng-optimaExp-${eng.id}-${formatDateForInput(eng.optimaExpiry)}`}
                            type="date"
                            defaultValue={formatDateForInput(eng.optimaExpiry)}
                            onChange={(e) => handleUpdateEngineerField(eng.id, 'optimaExpiry', e.target.value)}
                            className="w-full bg-white border border-gray-300 px-1 py-0.5 text-[11px] font-mono text-[#141414] focus:outline-none focus:border-[#d71920]"
                          />
                          {renderExpiryBadge(eng.optimaExpiry)}
                        </div>
                      </td>

                      {/* Expiry 2: H2S Expiry */}
                      <td className="px-2 py-2 border-r border-gray-300 min-w-[190px]">
                        <div className="flex flex-col gap-1">
                          <input
                            key={`eng-h2sExp-${eng.id}-${formatDateForInput(eng.h2sExpiry)}`}
                            type="date"
                            defaultValue={formatDateForInput(eng.h2sExpiry)}
                            onChange={(e) => handleUpdateEngineerField(eng.id, 'h2sExpiry', e.target.value)}
                            className="w-full bg-white border border-gray-300 px-1 py-0.5 text-[11px] font-mono text-[#141414] focus:outline-none focus:border-[#d71920]"
                          />
                          {renderExpiryBadge(eng.h2sExpiry)}
                        </div>
                      </td>

                      {/* Expiry 3: TBOSIET Expiry */}
                      <td className="px-2 py-2 border-r border-gray-300 min-w-[190px]">
                        <div className="flex flex-col gap-1">
                          <input
                            key={`eng-tbosietExp-${eng.id}-${formatDateForInput(eng.tbosietExpiry)}`}
                            type="date"
                            defaultValue={formatDateForInput(eng.tbosietExpiry)}
                            onChange={(e) => handleUpdateEngineerField(eng.id, 'tbosietExpiry', e.target.value)}
                            className="w-full bg-white border border-gray-300 px-1 py-0.5 text-[11px] font-mono text-[#141414] focus:outline-none focus:border-[#d71920]"
                          />
                          {renderExpiryBadge(eng.tbosietExpiry)}
                        </div>
                      </td>

                      {/* Expiry 4: Visa Expiry */}
                      <td className="px-2 py-2 border-r border-gray-300 min-w-[190px]">
                        <div className="flex flex-col gap-1">
                          <input
                            key={`eng-visaExp-${eng.id}-${formatDateForInput(eng.visaExpiry)}`}
                            type="date"
                            defaultValue={formatDateForInput(eng.visaExpiry)}
                            onChange={(e) => handleUpdateEngineerField(eng.id, 'visaExpiry', e.target.value)}
                            className="w-full bg-white border border-gray-300 px-1 py-0.5 text-[11px] font-mono text-[#141414] focus:outline-none focus:border-[#d71920]"
                          />
                          {renderExpiryBadge(eng.visaExpiry)}
                        </div>
                      </td>

                      {/* Expiry 5: Customer Medical Expiry */}
                      <td className="px-2 py-2 border-r border-gray-300 min-w-[190px]">
                        <div className="flex flex-col gap-1">
                          <input
                            key={`eng-medicalExp-${eng.id}-${formatDateForInput(eng.customerMedicalExpiry)}`}
                            type="date"
                            defaultValue={formatDateForInput(eng.customerMedicalExpiry)}
                            onChange={(e) => handleUpdateEngineerField(eng.id, 'customerMedicalExpiry', e.target.value)}
                            className="w-full bg-white border border-gray-300 px-1 py-0.5 text-[11px] font-mono text-[#141414] focus:outline-none focus:border-[#d71920]"
                          />
                          {renderExpiryBadge(eng.customerMedicalExpiry)}
                        </div>
                      </td>

                      {/* Expiry 6: Passport Expiry */}
                      <td className="px-2 py-2 border-r border-gray-300 min-w-[190px]">
                        <div className="flex flex-col gap-1">
                          <input
                            key={`eng-passportExp-${eng.id}-${formatDateForInput(eng.passportExpiry)}`}
                            type="date"
                            defaultValue={formatDateForInput(eng.passportExpiry)}
                            onChange={(e) => handleUpdateEngineerField(eng.id, 'passportExpiry', e.target.value)}
                            className="w-full bg-white border border-gray-300 px-1 py-0.5 text-[11px] font-mono text-[#141414] focus:outline-none focus:border-[#d71920]"
                          />
                          {renderExpiryBadge(eng.passportExpiry)}
                        </div>
                      </td>

                      {/* Expiry 7: EID Expiry */}
                      <td className="px-2 py-2 border-r border-gray-300 min-w-[190px]">
                        <div className="flex flex-col gap-1">
                          <input
                            key={`eng-eidExp-${eng.id}-${formatDateForInput(eng.eidExpiry)}`}
                            type="date"
                            defaultValue={formatDateForInput(eng.eidExpiry)}
                            onChange={(e) => handleUpdateEngineerField(eng.id, 'eidExpiry', e.target.value)}
                            className="w-full bg-white border border-gray-300 px-1 py-0.5 text-[11px] font-mono text-[#141414] focus:outline-none focus:border-[#d71920]"
                          />
                          {renderExpiryBadge(eng.eidExpiry)}
                        </div>
                      </td>

                      {/* Expiry 8: Onshore Security Pass Expiry */}
                      <td className="px-2 py-2 border-r border-gray-300 min-w-[190px]">
                        <div className="flex flex-col gap-1">
                          <input
                            key={`eng-onshoreExp-${eng.id}-${formatDateForInput(eng.onshoreSecurityPassExpiry)}`}
                            type="date"
                            defaultValue={formatDateForInput(eng.onshoreSecurityPassExpiry)}
                            onChange={(e) => handleUpdateEngineerField(eng.id, 'onshoreSecurityPassExpiry', e.target.value)}
                            className="w-full bg-white border border-gray-300 px-1 py-0.5 text-[11px] font-mono text-[#141414] focus:outline-none focus:border-[#d71920]"
                          />
                          {renderExpiryBadge(eng.onshoreSecurityPassExpiry)}
                        </div>
                      </td>

                      {/* Expiry 9: Offshore Security Pass Expiry */}
                      <td className="px-2 py-2 border-r border-gray-300 min-w-[190px]">
                        <div className="flex flex-col gap-1">
                          <input
                            key={`eng-offshoreExp-${eng.id}-${formatDateForInput(eng.offshoreSecurityPassExpiry)}`}
                            type="date"
                            defaultValue={formatDateForInput(eng.offshoreSecurityPassExpiry)}
                            onChange={(e) => handleUpdateEngineerField(eng.id, 'offshoreSecurityPassExpiry', e.target.value)}
                            className="w-full bg-white border border-gray-300 px-1 py-0.5 text-[11px] font-mono text-[#141414] focus:outline-none focus:border-[#d71920]"
                          />
                          {renderExpiryBadge(eng.offshoreSecurityPassExpiry)}
                        </div>
                      </td>

                      {/* Expiry 10: WMS Expiry */}
                      <td className="px-2 py-2 border-r border-gray-300 min-w-[190px]">
                        <div className="flex flex-col gap-1">
                          <input
                            key={`eng-wmsExp-${eng.id}-${formatDateForInput(eng.wmsExpiry)}`}
                            type="date"
                            defaultValue={formatDateForInput(eng.wmsExpiry)}
                            onChange={(e) => handleUpdateEngineerField(eng.id, 'wmsExpiry', e.target.value)}
                            className="w-full bg-white border border-gray-300 px-1 py-0.5 text-[11px] font-mono text-[#141414] focus:outline-none focus:border-[#d71920]"
                          />
                          {renderExpiryBadge(eng.wmsExpiry)}
                        </div>
                      </td>

                      {/* UAE Contact */}
                      <td className="px-2 py-2 min-w-[140px]">
                        <input
                          key={`eng-uaeContact-${eng.id}-${eng.uaeHomeContact}`}
                          type="text"
                          defaultValue={eng.uaeHomeContact}
                          onBlur={(e) => {
                            if (e.target.value !== eng.uaeHomeContact) {
                              handleUpdateEngineerField(eng.id, 'uaeHomeContact', e.target.value);
                            }
                          }}
                          className="w-full bg-white border border-gray-300 px-1.5 py-1 text-xs font-mono text-[#141414] focus:outline-none focus:border-[#d71920]"
                        />
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TABLE 2: ALL PERSONNEL DOCUMENTS (SORTABLE, FILTERABLE BY LOCATION & CATEGORY) */}
      {(adminSection === 'both' || adminSection === 'personnel') && (
        <div className="bg-white border-2 border-[#141414] p-5 shadow-[4px_4px_0px_0px_#141414] space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b-2 border-[#141414] pb-3">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-[#d71920]" />
              <h2 className="text-sm font-black uppercase tracking-wider text-[#141414]">
                Field Personnel Database — Rotation & Assignment ({filteredPersonnel.length} Docs)
              </h2>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-mono text-gray-600">
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold border border-emerald-400">&lt;50d Hitch (Green)</span>
              <span className="px-2 py-0.5 bg-amber-100 text-amber-900 font-bold border border-amber-400">50-80d Hitch (Yellow)</span>
              <span className="px-2 py-0.5 bg-red-100 text-[#d71920] font-bold border border-red-400">&gt;80d Hitch (Red)</span>
            </div>
          </div>

          {/* Sort & Filter Control Bar for Personnel Table */}
          <div className="bg-[#f5f5f5] border-2 border-[#141414] p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-mono text-xs">
            
            {/* Location Type Filter */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#141414] mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#d71920]" />
                Filter by Location Type:
              </label>
              <select
                value={personnelLocationFilter}
                onChange={(e) => setPersonnelLocationFilter(e.target.value)}
                className="w-full bg-white border-2 border-[#141414] px-2.5 py-1.5 text-xs font-bold text-[#141414] focus:outline-none"
              >
                <option value="all">ALL LOCATION TYPES ({personnel.length})</option>
                {LOCATION_TYPE_OPTIONS.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#141414] mb-1 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-[#d71920]" />
                Filter by Category:
              </label>
              <select
                value={personnelCategoryFilter}
                onChange={(e) => setPersonnelCategoryFilter(e.target.value)}
                className="w-full bg-white border-2 border-[#141414] px-2.5 py-1.5 text-xs font-bold text-[#141414] focus:outline-none"
              >
                <option value="all">ALL CATEGORIES</option>
                <option value="Consultant">CONSULTANT</option>
                <option value="Commuter">COMMUTER</option>
                <option value="PRL">PRL</option>
                <option value="Loan">LOAN</option>
              </select>
            </div>

            {/* Sort Field */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#141414] mb-1 flex items-center gap-1">
                <ArrowUpDown className="w-3.5 h-3.5 text-[#d71920]" />
                Sort By Field:
              </label>
              <select
                value={personnelSortField}
                onChange={(e) => setPersonnelSortField(e.target.value as any)}
                className="w-full bg-white border-2 border-[#141414] px-2.5 py-1.5 text-xs font-bold text-[#141414] focus:outline-none"
              >
                <option value="name">Name</option>
                <option value="id">Person ID</option>
                <option value="hitchDays">Hitch Days</option>
                <option value="locationType">Location Type</option>
                <option value="rigName">Rig Name</option>
                <option value="category">Category</option>
                <option value="dateReturn">Date Return</option>
              </select>
            </div>

            {/* Sort Order */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#141414] mb-1">
                Sort Direction:
              </label>
              <button
                onClick={() => setPersonnelSortOrder(personnelSortOrder === 'asc' ? 'desc' : 'asc')}
                className="w-full bg-white border-2 border-[#141414] px-3 py-1.5 text-xs font-bold text-[#141414] hover:bg-gray-100 flex items-center justify-between"
              >
                <span>{personnelSortOrder === 'asc' ? 'ASCENDING (A-Z, 0-9)' : 'DESCENDING (Z-A, 9-0)'}</span>
                <ArrowUpDown className="w-3.5 h-3.5 text-[#d71920]" />
              </button>
            </div>

          </div>

          {personnelLoading ? (
            <div className="py-8 text-center font-mono text-xs text-gray-500 space-y-2">
              <div className="w-5 h-5 border-2 border-[#141414] border-t-[#d71920] rounded-full animate-spin mx-auto" />
              <p>Loading personnel real-time feed...</p>
            </div>
          ) : filteredPersonnel.length === 0 ? (
            <div className="p-8 text-center font-mono text-xs text-gray-500 bg-gray-50 border-2 border-dashed border-gray-300">
              No personnel documents found matching current filters.
            </div>
          ) : (
            <div className="overflow-x-auto border-2 border-[#141414]">
              <table className="w-full border-collapse text-left text-xs font-mono">
                <thead>
                  <tr className="bg-[#141414] text-white text-[10px] uppercase font-bold tracking-wider">
                    <th className="px-3 py-2.5 border-r border-[#333]">Person ID</th>
                    <th className="px-3 py-2.5 border-r border-[#333]">Name</th>
                    <th className="px-3 py-2.5 border-r border-[#333]">Hitch Days & Badge</th>
                    <th className="px-3 py-2.5 border-r border-[#333]">Category</th>
                    <th className="px-3 py-2.5 border-r border-[#333]">Location Type</th>
                    <th className="px-3 py-2.5 border-r border-[#333]">Rig Name (if Rig)</th>
                    <th className="px-3 py-2.5 border-r border-[#333]">Status</th>
                    <th className="px-3 py-2.5 border-r border-[#333]">Arrived AUH</th>
                    <th className="px-3 py-2.5 border-r border-[#333]">Traveled Home</th>
                    <th className="px-3 py-2.5 border-r border-[#333]">Date Return</th>
                    <th className="px-3 py-2.5">Comments / Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-300 bg-white">
                  {filteredPersonnel.map((p) => (
                    <tr key={p.id} className="hover:bg-amber-50/50 transition-colors">
                      
                      {/* Person ID (ReadOnly doc ID) */}
                      <td className="px-2.5 py-2.5 border-r border-gray-300 font-bold text-[#d71920] bg-gray-50">
                        {p.id}
                      </td>

                      {/* Name */}
                      <td className="px-2.5 py-2.5 border-r border-gray-300 min-w-[150px]">
                        <input
                          key={`p-name-${p.id}-${p.name}`}
                          type="text"
                          defaultValue={p.name}
                          onBlur={(e) => {
                            if (e.target.value !== p.name) {
                              handleUpdatePersonnelField(p.id, 'name', e.target.value);
                            }
                          }}
                          className="w-full bg-white border border-gray-300 px-2 py-1 text-xs font-bold font-mono text-[#141414] focus:outline-none focus:border-[#d71920]"
                        />
                      </td>

                      {/* Hitch Days + Rule Badge */}
                      <td className="px-2.5 py-2.5 border-r border-gray-300 min-w-[170px]">
                        <div className="flex items-center gap-2">
                          <input
                            key={`p-hitch-${p.id}-${p.hitchDays}`}
                            type="number"
                            min="0"
                            defaultValue={p.hitchDays}
                            onBlur={(e) => {
                              const val = Number(e.target.value);
                              if (val !== p.hitchDays) {
                                handleUpdatePersonnelField(p.id, 'hitchDays', val);
                              }
                            }}
                            className="w-16 bg-white border border-gray-300 px-1.5 py-1 text-xs font-bold font-mono text-[#141414] focus:outline-none focus:border-[#d71920]"
                          />
                          {renderHitchDaysBadge(p.hitchDays)}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-2.5 py-2.5 border-r border-gray-300 min-w-[130px]">
                        <select
                          value={p.category}
                          onChange={(e) => handleUpdatePersonnelField(p.id, 'category', e.target.value as PersonnelCategory)}
                          className="w-full bg-white border border-gray-300 px-1.5 py-1 text-xs font-bold font-mono text-[#141414] focus:outline-none focus:border-[#d71920]"
                        >
                          <option value="Consultant">Consultant</option>
                          <option value="Commuter">Commuter</option>
                          <option value="PRL">PRL</option>
                          <option value="Loan">Loan</option>
                        </select>
                      </td>

                      {/* Location Type */}
                      <td className="px-2.5 py-2.5 border-r border-gray-300 min-w-[140px]">
                        <select
                          value={p.locationType}
                          onChange={(e) => handleUpdatePersonnelField(p.id, 'locationType', e.target.value as LocationType)}
                          className="w-full bg-white border border-gray-300 px-1.5 py-1 text-xs font-bold font-mono text-[#141414] focus:outline-none focus:border-[#d71920]"
                        >
                          {LOCATION_TYPE_OPTIONS.map((loc) => (
                            <option key={loc} value={loc}>{loc}</option>
                          ))}
                        </select>
                      </td>

                      {/* Rig Name (Only enabled if LocationType is Rig) */}
                      <td className="px-2.5 py-2.5 border-r border-gray-300 min-w-[150px]">
                        {p.locationType === 'Rig' ? (
                          <input
                            type="text"
                            key={`rigname-${p.id}-${p.rigName}`}
                            defaultValue={p.rigName}
                            placeholder="e.g. AD-181"
                            onBlur={(e) => {
                              if (e.target.value !== p.rigName) {
                                handleUpdatePersonnelField(p.id, 'rigName', e.target.value);
                              }
                            }}
                            className="w-full bg-white border border-gray-300 px-2 py-1 text-xs font-mono text-[#141414] focus:outline-none focus:border-[#d71920]"
                          />
                        ) : (
                          <input
                            type="text"
                            value=""
                            disabled
                            placeholder="Disabled"
                            className="w-full bg-gray-100 border border-gray-200 px-2 py-1 text-xs font-mono text-gray-400 cursor-not-allowed"
                          />
                        )}
                      </td>

                      {/* Status (Auto-computed based on locationType: On Rig if locationType === 'Rig', Off Rig otherwise) */}
                      <td className="px-2.5 py-2.5 border-r border-gray-300 min-w-[125px]">
                        {(() => {
                          const isOnRig = p.locationType === 'Rig';
                          return (
                            <span className={`px-2 py-1 text-[10px] font-mono font-bold uppercase rounded-xs border inline-flex items-center gap-1.5 ${
                              isOnRig 
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-500' 
                                : 'bg-gray-100 text-gray-700 border-gray-300'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${isOnRig ? 'bg-emerald-600 animate-pulse' : 'bg-gray-400'}`} />
                              {isOnRig ? 'On Rig' : 'Off Rig'}
                            </span>
                          );
                        })()}
                      </td>

                      {/* Date Arrived AUH */}
                      <td className="px-2.5 py-2.5 border-r border-gray-300 min-w-[145px]">
                        <input
                          key={`p-dateAUH-${p.id}-${formatDateForInput(p.dateArrivedAUH)}`}
                          type="date"
                          defaultValue={formatDateForInput(p.dateArrivedAUH)}
                          onChange={(e) => handleUpdatePersonnelField(p.id, 'dateArrivedAUH', e.target.value)}
                          className="w-full bg-white border border-gray-300 px-1.5 py-1 text-xs font-mono text-[#141414] focus:outline-none focus:border-[#d71920]"
                        />
                      </td>

                      {/* Date Traveled Home */}
                      <td className="px-2.5 py-2.5 border-r border-gray-300 min-w-[145px]">
                        <input
                          key={`p-dateHome-${p.id}-${formatDateForInput(p.dateTraveledHome)}`}
                          type="date"
                          defaultValue={formatDateForInput(p.dateTraveledHome)}
                          onChange={(e) => handleUpdatePersonnelField(p.id, 'dateTraveledHome', e.target.value)}
                          className="w-full bg-white border border-gray-300 px-1.5 py-1 text-xs font-mono text-[#141414] focus:outline-none focus:border-[#d71920]"
                        />
                      </td>

                      {/* Date Return */}
                      <td className="px-2.5 py-2.5 border-r border-gray-300 min-w-[145px]">
                        <input
                          key={`p-dateReturn-${p.id}-${formatDateForInput(p.dateReturn)}`}
                          type="date"
                          defaultValue={formatDateForInput(p.dateReturn)}
                          onChange={(e) => handleUpdatePersonnelField(p.id, 'dateReturn', e.target.value)}
                          className="w-full bg-white border border-gray-300 px-1.5 py-1 text-xs font-mono text-[#141414] focus:outline-none focus:border-[#d71920]"
                        />
                      </td>

                      {/* Comments */}
                      <td className="px-2.5 py-2.5 min-w-[200px]">
                        <input
                          key={`p-comments-${p.id}-${p.comments}`}
                          type="text"
                          defaultValue={p.comments}
                          onBlur={(e) => {
                            if (e.target.value !== p.comments) {
                              handleUpdatePersonnelField(p.id, 'comments', e.target.value);
                            }
                          }}
                          className="w-full bg-white border border-gray-300 px-2 py-1 text-xs font-mono text-gray-700 focus:outline-none focus:border-[#d71920]"
                        />
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
