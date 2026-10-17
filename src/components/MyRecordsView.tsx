import React, { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Engineer, Personnel, PersonnelCategory, LocationType } from '../types';
import { formatDateForInput, formatDateForDisplay, toFirestoreTimestamp, getDaysRemaining } from '../lib/dateUtils';
import { parseLocationData, LOCATION_TYPE_OPTIONS, getEngineerCriticalExpiries, formatDateNice } from '../lib/personnelUtils';
import { 
  User, 
  Wrench, 
  Users, 
  Calendar, 
  MapPin, 
  Tag, 
  Hash, 
  MessageSquare, 
  AlertCircle, 
  AlertTriangle,
  CheckCircle2, 
  Clock, 
  Save, 
  RefreshCw, 
  IdCard, 
  ShieldCheck,
  Edit3
} from 'lucide-react';

export const MyRecordsView: React.FC = () => {
  const { currentUser, userRole, updateUserRecord } = useAuth();
  
  const [personId, setPersonId] = useState<string>('');
  const [userDocLoading, setUserDocLoading] = useState<boolean>(true);

  // Real-time Firestore records
  const [engineerData, setEngineerData] = useState<Engineer | null>(null);
  const [personnelData, setPersonnelData] = useState<Personnel | null>(null);
  
  const [engineerLoading, setEngineerLoading] = useState<boolean>(false);
  const [personnelLoading, setPersonnelLoading] = useState<boolean>(false);
  
  const [engineerError, setEngineerError] = useState<string | null>(null);
  const [personnelError, setPersonnelError] = useState<string | null>(null);

  // Local state for editable Engineer expiry dates
  const [expiries, setExpiries] = useState({
    optimaExpiry: '',
    h2sExpiry: '',
    tbosietExpiry: '',
    visaExpiry: '',
    customerMedicalExpiry: '',
    passportExpiry: '',
    eidExpiry: '',
    onshoreSecurityPassExpiry: '',
    offshoreSecurityPassExpiry: '',
    wmsExpiry: '',
  });

  // Local state for editable Personnel fields
  const [personnelForm, setPersonnelForm] = useState({
    hitchDays: 28,
    locationType: 'Other' as LocationType,
    rigName: '',
    category: 'Commuter' as PersonnelCategory,
    dateArrivedAUH: '',
    dateTraveledHome: '',
    dateReturn: '',
    comments: '',
  });

  // Sync statuses
  const [savingEngineer, setSavingEngineer] = useState<boolean>(false);
  const [savingPersonnel, setSavingPersonnel] = useState<boolean>(false);
  const [engineerSavedMsg, setEngineerSavedMsg] = useState<string | null>(null);
  const [personnelSavedMsg, setPersonnelSavedMsg] = useState<string | null>(null);

  // State for personId binding input
  const [bindingPersonIdInput, setBindingPersonIdInput] = useState<string>('');
  const [bindingSaving, setBindingSaving] = useState<boolean>(false);

  // 1. Listen to users/{uid} document in real-time to get personId
  useEffect(() => {
    if (!currentUser?.uid) {
      setUserDocLoading(false);
      return;
    }

    setUserDocLoading(true);
    const userDocRef = doc(db, 'users', currentUser.uid);

    const unsubscribe = onSnapshot(
      userDocRef,
      (docSnap) => {
        setUserDocLoading(false);
        if (docSnap.exists()) {
          const data = docSnap.data();
          const pid = (data.personId || '').trim();
          setPersonId(pid);
        } else {
          setPersonId('');
        }
      },
      (err) => {
        setUserDocLoading(false);
        console.warn('Error reading user doc for personId:', err);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  // 2. Listen to engineers/{personId} document in real-time
  useEffect(() => {
    if (!personId) {
      setEngineerData(null);
      setEngineerLoading(false);
      return;
    }

    setEngineerLoading(true);
    setEngineerError(null);
    const engDocRef = doc(db, 'engineers', personId);

    const unsubscribe = onSnapshot(
      engDocRef,
      (docSnap) => {
        setEngineerLoading(false);
        if (docSnap.exists()) {
          const data = docSnap.data() as Engineer;
          const engObj: Engineer = {
            id: docSnap.id,
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
          };
          setEngineerData(engObj);

          // Populate local edit inputs
          setExpiries({
            optimaExpiry: formatDateForInput(data.optimaExpiry),
            h2sExpiry: formatDateForInput(data.h2sExpiry),
            tbosietExpiry: formatDateForInput(data.tbosietExpiry),
            visaExpiry: formatDateForInput(data.visaExpiry),
            customerMedicalExpiry: formatDateForInput(data.customerMedicalExpiry),
            passportExpiry: formatDateForInput(data.passportExpiry),
            eidExpiry: formatDateForInput(data.eidExpiry),
            onshoreSecurityPassExpiry: formatDateForInput(data.onshoreSecurityPassExpiry),
            offshoreSecurityPassExpiry: formatDateForInput(data.offshoreSecurityPassExpiry),
            wmsExpiry: formatDateForInput(data.wmsExpiry),
          });
        } else {
          setEngineerData(null);
        }
      },
      (err) => {
        setEngineerLoading(false);
        const errMsg = err?.message || String(err);
        if (!errMsg.toLowerCase().includes('offline')) {
          setEngineerError(errMsg);
        }
      }
    );

    return () => unsubscribe();
  }, [personId]);

  // 3. Listen to personnel/{personId} document in real-time
  useEffect(() => {
    if (!personId) {
      setPersonnelData(null);
      setPersonnelLoading(false);
      return;
    }

    setPersonnelLoading(true);
    setPersonnelError(null);
    const pDocRef = doc(db, 'personnel', personId);

    const unsubscribe = onSnapshot(
      pDocRef,
      (docSnap) => {
        setPersonnelLoading(false);
        if (docSnap.exists()) {
          const data = docSnap.data() as Personnel;
          const locInfo = parseLocationData(data);
          const pObj: Personnel = {
            id: docSnap.id,
            name: data.name || '',
            hitchDays: typeof data.hitchDays === 'number' ? data.hitchDays : 28,
            dateArrivedAUH: data.dateArrivedAUH,
            dateTraveledHome: data.dateTraveledHome,
            daysOff: typeof data.daysOff === 'number' ? data.daysOff : 28,
            category: (data.category as PersonnelCategory) || 'Commuter',
            locationType: locInfo.locationType,
            rigName: locInfo.rigName,
            location: locInfo.locationDisplay,
            status: locInfo.status,
            dateReturn: data.dateReturn,
            comments: data.comments || '',
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          };
          setPersonnelData(pObj);

          // Populate local edit inputs
          setPersonnelForm({
            hitchDays: pObj.hitchDays,
            locationType: pObj.locationType,
            rigName: pObj.rigName,
            category: pObj.category,
            dateArrivedAUH: formatDateForInput(pObj.dateArrivedAUH),
            dateTraveledHome: formatDateForInput(pObj.dateTraveledHome),
            dateReturn: formatDateForInput(pObj.dateReturn),
            comments: pObj.comments,
          });
        } else {
          setPersonnelData(null);
        }
      },
      (err) => {
        setPersonnelLoading(false);
        const errMsg = err?.message || String(err);
        if (!errMsg.toLowerCase().includes('offline')) {
          setPersonnelError(errMsg);
        }
      }
    );

    return () => unsubscribe();
  }, [personId]);

  // Bind personId to user document
  const handleAssignPersonId = async (idToAssign: string) => {
    if (!currentUser?.uid) return;
    const cleanId = idToAssign.trim().toUpperCase();
    if (!cleanId) return;

    setBindingSaving(true);
    try {
      await updateUserRecord(currentUser.uid, { personId: cleanId });
      setPersonId(cleanId);
    } catch (err: any) {
      alert(`Failed to assign Person ID: ${err.message}`);
    } finally {
      setBindingSaving(false);
    }
  };

  // Helper for rendering Expiry Date Badges:
  // Green: > 60 days
  // Yellow: 30-60 days
  // Red: < 30 days or past
  const renderExpiryBadge = (dateValString: string) => {
    if (!dateValString) {
      return (
        <span className="px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider bg-gray-100 text-gray-500 border border-gray-300 rounded-xs inline-flex items-center gap-1">
          <Clock className="w-3 h-3 text-gray-400" />
          NOT SET
        </span>
      );
    }

    const days = getDaysRemaining(dateValString);

    if (days === null) {
      return (
        <span className="px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider bg-gray-100 text-gray-500 border border-gray-300 rounded-xs">
          INVALID
        </span>
      );
    }

    if (days > 60) {
      return (
        <span className="px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border-2 border-emerald-500 rounded-xs inline-flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
          <span>{days}d remaining (&gt;60d)</span>
        </span>
      );
    }

    if (days >= 30 && days <= 60) {
      return (
        <span className="px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider bg-amber-100 text-amber-900 border-2 border-amber-500 rounded-xs inline-flex items-center gap-1">
          <Clock className="w-3 h-3 text-amber-600 shrink-0" />
          <span>{days}d remaining (30-60d)</span>
        </span>
      );
    }

    // days < 30 or past
    const isPast = days < 0;
    return (
      <span className="px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider bg-red-100 text-[#d71920] border-2 border-[#d71920] rounded-xs inline-flex items-center gap-1">
        <AlertCircle className="w-3 h-3 text-[#d71920] shrink-0" />
        <span>{isPast ? `EXPIRED (${Math.abs(days)}d ago)` : `CRITICAL (${days}d left)`}</span>
      </span>
    );
  };

  // Hitch Days Color Rule:
  // green if < 50
  // yellow if 50-80
  // red if > 80
  const renderHitchDaysBadge = (hitchVal: number) => {
    if (hitchVal < 50) {
      return (
        <span className="px-2.5 py-1 text-[10px] font-mono font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border-2 border-emerald-500 rounded-xs inline-flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          Standard Hitch (&lt;50d)
        </span>
      );
    }
    if (hitchVal >= 50 && hitchVal <= 80) {
      return (
        <span className="px-2.5 py-1 text-[10px] font-mono font-black uppercase tracking-wider bg-amber-100 text-amber-900 border-2 border-amber-500 rounded-xs inline-flex items-center gap-1">
          <Clock className="w-3.5 h-3.5 text-amber-600" />
          Extended Hitch (50-80d)
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 text-[10px] font-mono font-black uppercase tracking-wider bg-red-100 text-[#d71920] border-2 border-[#d71920] rounded-xs inline-flex items-center gap-1">
        <AlertCircle className="w-3.5 h-3.5 text-[#d71920]" />
        Critical Long Hitch (&gt;80d)
      </span>
    );
  };

  // Write updated Expiry Dates to Firestore (engineers collection)
  const handleSaveEngineerExpiries = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!personId) return;

    setSavingEngineer(true);
    setEngineerSavedMsg(null);
    const docPath = `engineers/${personId}`;

    try {
      await setDoc(
        doc(db, 'engineers', personId),
        {
          optimaExpiry: toFirestoreTimestamp(expiries.optimaExpiry),
          h2sExpiry: toFirestoreTimestamp(expiries.h2sExpiry),
          tbosietExpiry: toFirestoreTimestamp(expiries.tbosietExpiry),
          visaExpiry: toFirestoreTimestamp(expiries.visaExpiry),
          customerMedicalExpiry: toFirestoreTimestamp(expiries.customerMedicalExpiry),
          passportExpiry: toFirestoreTimestamp(expiries.passportExpiry),
          eidExpiry: toFirestoreTimestamp(expiries.eidExpiry),
          onshoreSecurityPassExpiry: toFirestoreTimestamp(expiries.onshoreSecurityPassExpiry),
          offshoreSecurityPassExpiry: toFirestoreTimestamp(expiries.offshoreSecurityPassExpiry),
          wmsExpiry: toFirestoreTimestamp(expiries.wmsExpiry),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      setEngineerSavedMsg('Engineer Expiry Dates saved to Firestore!');
      setTimeout(() => setEngineerSavedMsg(null), 3500);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, docPath);
    } finally {
      setSavingEngineer(false);
    }
  };

  // Write updated Personnel Fields to Firestore (personnel collection)
  const handleSavePersonnelFields = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!personId) return;

    setSavingPersonnel(true);
    setPersonnelSavedMsg(null);
    const docPath = `personnel/${personId}`;

    try {
      const isRig = personnelForm.locationType === 'Rig';
      const cleanRigName = isRig ? personnelForm.rigName.trim() : '';
      const autoStatus = isRig ? 'On Rig' : 'Off Rig';
      const legacyLocation = isRig ? (cleanRigName || 'Rig') : personnelForm.locationType;

      await setDoc(
        doc(db, 'personnel', personId),
        {
          hitchDays: Number(personnelForm.hitchDays) || 0,
          locationType: personnelForm.locationType,
          rigName: cleanRigName,
          location: legacyLocation,
          status: autoStatus,
          category: personnelForm.category,
          dateArrivedAUH: toFirestoreTimestamp(personnelForm.dateArrivedAUH),
          dateTraveledHome: toFirestoreTimestamp(personnelForm.dateTraveledHome),
          dateReturn: toFirestoreTimestamp(personnelForm.dateReturn),
          comments: personnelForm.comments.trim(),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      setPersonnelSavedMsg('Field Personnel details saved to Firestore!');
      setTimeout(() => setPersonnelSavedMsg(null), 3500);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, docPath);
    } finally {
      setSavingPersonnel(false);
    }
  };

  if (userDocLoading) {
    return (
      <div className="bg-white border-2 border-[#141414] p-12 text-center text-[#141414] font-mono text-xs space-y-2 shadow-[2px_2px_0px_0px_#141414]">
        <div className="w-6 h-6 border-2 border-[#141414] border-t-[#d71920] rounded-full animate-spin mx-auto" />
        <p className="font-bold uppercase tracking-wider">Fetching user profile & Person ID...</p>
      </div>
    );
  }

  // If no personId is assigned to current user's users/{uid} document
  if (!personId) {
    return (
      <div className="space-y-6">
        {/* Banner */}
        <div className="bg-white border-2 border-[#141414] p-6 shadow-[3px_3px_0px_0px_#141414] space-y-4">
          <div className="flex items-start gap-3 border-b-2 border-[#141414] pb-4">
            <div className="p-2.5 bg-amber-100 border-2 border-amber-500 text-amber-900 shrink-0">
              <IdCard className="w-6 h-6 text-amber-700" />
            </div>
            <div>
              <h2 className="text-base font-black uppercase tracking-wider text-[#141414]">
                No Person ID Assigned To Account
              </h2>
              <p className="text-xs font-mono text-gray-600 mt-1">
                Your user account (<code className="font-bold text-[#141414]">{currentUser?.email}</code>) currently has no <code className="text-[#d71920] font-bold">personId</code> stored in your <code className="text-[#d71920] font-bold">users/{currentUser?.uid}</code> Firestore document.
              </p>
            </div>
          </div>

          <div className="p-4 bg-[#f5f5f5] border-2 border-[#141414] space-y-3 font-mono text-xs">
            <p className="font-bold text-[#141414] uppercase">
              Select or Enter Your Person ID to Link Your Records:
            </p>
            
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold text-gray-600">Quick Bind Sample ID:</span>
              {['H287330', 'H394821', 'H502918'].map((sampleId) => (
                <button
                  key={sampleId}
                  onClick={() => handleAssignPersonId(sampleId)}
                  disabled={bindingSaving}
                  className="px-3 py-1 bg-white hover:bg-[#d71920] hover:text-white border-2 border-[#141414] font-bold text-xs font-mono transition-colors"
                >
                  Link {sampleId}
                </button>
              ))}
            </div>

            <div className="pt-2 flex items-center gap-2 max-w-md">
              <input
                type="text"
                value={bindingPersonIdInput}
                onChange={(e) => setBindingPersonIdInput(e.target.value)}
                placeholder="Or enter custom ID e.g. H287330"
                className="flex-1 bg-white border-2 border-[#141414] px-3 py-1.5 text-xs font-mono font-bold uppercase text-[#141414] focus:outline-none"
              />
              <button
                onClick={() => handleAssignPersonId(bindingPersonIdInput)}
                disabled={bindingSaving || !bindingPersonIdInput.trim()}
                className="px-4 py-1.5 bg-[#141414] hover:bg-[#d71920] text-white font-bold text-xs font-mono uppercase border-2 border-[#141414] disabled:opacity-40 transition-colors"
              >
                {bindingSaving ? 'Linking...' : 'Save Person ID'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Calculate user's critical/expired certifications (expiries within 30 days or past)
  const userCriticalExpiries = getEngineerCriticalExpiries(expiries);

  return (
    <div className="space-y-6">
      {/* Header Context Bar */}
      <div className="bg-white border-2 border-[#141414] p-5 shadow-[3px_3px_0px_0px_#141414] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-[#d71920]" />
            <h2 className="text-base font-black uppercase tracking-wider text-[#141414]">
              My Personnel & Expiry Records
            </h2>
          </div>
          <p className="text-xs font-mono text-gray-600 mt-1">
            Linked Person ID: <code className="bg-[#141414] text-white px-2 py-0.5 font-bold text-xs">{personId}</code> | Real-time updates active via Firestore <code className="text-[#d71920] font-bold">onSnapshot</code>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-[#f5f5f5] border-2 border-[#141414] px-3 py-1.5 font-mono text-xs flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold text-[#141414] uppercase">Live Sync: {personId}</span>
          </div>

          <button
            onClick={() => {
              if (window.confirm('Change linked Person ID?')) {
                setPersonId('');
              }
            }}
            className="px-2.5 py-1.5 border-2 border-[#141414] bg-white hover:bg-gray-100 text-xs font-mono font-bold text-[#141414] transition-colors flex items-center gap-1"
            title="Switch Person ID"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Switch ID
          </button>
        </div>
      </div>

      {/* USER EXPIRY REMINDER BANNER */}
      {userCriticalExpiries.length > 0 ? (
        <div className="bg-red-50 border-2 border-[#d71920] p-4 shadow-[4px_4px_0px_0px_#141414] space-y-3">
          <div className="flex items-start gap-3 border-b-2 border-red-200 pb-3">
            <div className="p-2 bg-[#d71920] text-white shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-[#d71920]">
                  Critical Certification Expiry Reminder
                </h3>
                <span className="px-2 py-0.5 bg-[#d71920] text-white text-[10px] font-mono font-bold uppercase rounded-xs">
                  {userCriticalExpiries.length} Expir{userCriticalExpiries.length === 1 ? 'y' : 'ies'} Alert
                </span>
              </div>
              <p className="text-xs font-mono text-gray-700 mt-0.5">
                The following official certificate(s) or documents are within 30 days of expiring or already expired:
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 font-mono text-xs">
            {userCriticalExpiries.map((item) => (
              <div 
                key={item.key}
                className={`p-3 border-2 flex items-center gap-2.5 ${
                  item.days < 0 
                    ? 'bg-red-100 border-[#d71920] text-red-950' 
                    : 'bg-amber-100 border-amber-600 text-amber-950'
                }`}
              >
                <AlertCircle className={`w-4 h-4 shrink-0 ${item.days < 0 ? 'text-[#d71920]' : 'text-amber-700'}`} />
                <div className="flex-1 min-w-0">
                  <span className="font-bold text-[#141414]">{item.message}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : engineerData ? (
        <div className="bg-emerald-50 border-2 border-emerald-600 p-3.5 shadow-[3px_3px_0px_0px_#141414] flex items-center gap-3 font-mono text-xs text-emerald-950">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <span className="font-bold uppercase text-emerald-900">All Expiry Dates Compliant:</span> You have no certification expiries within the next 30 days.
          </div>
        </div>
      ) : null}

      {/* Grid Layout: Engineers Doc & Personnel Doc */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* SECTION 1: Engineer Document Expiries */}
        <div className="bg-white border-2 border-[#141414] p-6 shadow-[4px_4px_0px_0px_#141414] flex flex-col justify-between">
          <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between border-b-2 border-[#141414] pb-3">
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-[#d71920]" />
                <h3 className="text-xs font-black uppercase tracking-wider text-[#141414]">
                  Engineer Certifications & Expiries
                </h3>
              </div>
              <span className="text-[10px] font-mono font-bold bg-[#141414] text-white px-2 py-0.5">
                engineers/{personId}
              </span>
            </div>

            {engineerError && (
              <div className="p-3 bg-red-100 border-2 border-[#d71920] text-xs font-mono text-[#d71920]">
                {engineerError}
              </div>
            )}

            {engineerLoading ? (
              <div className="py-8 text-center font-mono text-xs text-gray-500 space-y-2">
                <div className="w-5 h-5 border-2 border-[#141414] border-t-[#d71920] rounded-full animate-spin mx-auto" />
                <p>Loading engineer record...</p>
              </div>
            ) : !engineerData ? (
              <div className="p-6 bg-amber-50 border-2 border-amber-400 text-amber-900 font-mono text-xs space-y-2">
                <p className="font-bold uppercase">No document found in "engineers/{personId}"</p>
                <p className="text-[11px] text-amber-800">
                  Click "Save Expiries" below to auto-create this engineer document with your custom expiry dates.
                </p>
              </div>
            ) : (
              <div className="p-3 bg-[#f5f5f5] border-2 border-[#141414] grid grid-cols-2 gap-2 text-xs font-mono">
                <div><span className="font-bold text-[#141414]">Name:</span> {engineerData.name || 'N/A'}</div>
                <div><span className="font-bold text-[#141414]">SAP #:</span> {engineerData.sapNumber || 'N/A'}</div>
                <div><span className="font-bold text-[#141414]">Optima #:</span> {engineerData.optimaNumber || 'N/A'}</div>
                <div><span className="font-bold text-[#141414]">Email:</span> {engineerData.email || 'N/A'}</div>
              </div>
            )}

            {/* Editable Expiry Date Fields */}
            <form onSubmit={handleSaveEngineerExpiries} className="space-y-3.5 pt-1">
              <div className="text-[11px] font-mono font-bold text-gray-600 uppercase flex items-center justify-between border-b border-gray-200 pb-1">
                <span>Cert / Document Name</span>
                <span>Expiry Date & Status Badge</span>
              </div>

              {/* 1. Optima Expiry */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 bg-gray-50 border border-gray-300">
                <label className="text-xs font-mono font-bold text-[#141414]">Optima Expiry</label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={expiries.optimaExpiry}
                    onChange={(e) => setExpiries({ ...expiries, optimaExpiry: e.target.value })}
                    className="bg-white border border-[#141414] px-2 py-1 text-xs font-mono text-[#141414] focus:outline-none"
                  />
                  {renderExpiryBadge(expiries.optimaExpiry)}
                </div>
              </div>

              {/* 2. H2S Expiry */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 bg-gray-50 border border-gray-300">
                <label className="text-xs font-mono font-bold text-[#141414]">H2S Safety Expiry</label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={expiries.h2sExpiry}
                    onChange={(e) => setExpiries({ ...expiries, h2sExpiry: e.target.value })}
                    className="bg-white border border-[#141414] px-2 py-1 text-xs font-mono text-[#141414] focus:outline-none"
                  />
                  {renderExpiryBadge(expiries.h2sExpiry)}
                </div>
              </div>

              {/* 3. TBOSIET Expiry */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 bg-gray-50 border border-gray-300">
                <label className="text-xs font-mono font-bold text-[#141414]">TBOSIET Expiry</label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={expiries.tbosietExpiry}
                    onChange={(e) => setExpiries({ ...expiries, tbosietExpiry: e.target.value })}
                    className="bg-white border border-[#141414] px-2 py-1 text-xs font-mono text-[#141414] focus:outline-none"
                  />
                  {renderExpiryBadge(expiries.tbosietExpiry)}
                </div>
              </div>

              {/* 4. Visa Expiry */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 bg-gray-50 border border-gray-300">
                <label className="text-xs font-mono font-bold text-[#141414]">Visa Expiry</label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={expiries.visaExpiry}
                    onChange={(e) => setExpiries({ ...expiries, visaExpiry: e.target.value })}
                    className="bg-white border border-[#141414] px-2 py-1 text-xs font-mono text-[#141414] focus:outline-none"
                  />
                  {renderExpiryBadge(expiries.visaExpiry)}
                </div>
              </div>

              {/* 5. Customer Medical Expiry */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 bg-gray-50 border border-gray-300">
                <label className="text-xs font-mono font-bold text-[#141414]">Customer Medical Expiry</label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={expiries.customerMedicalExpiry}
                    onChange={(e) => setExpiries({ ...expiries, customerMedicalExpiry: e.target.value })}
                    className="bg-white border border-[#141414] px-2 py-1 text-xs font-mono text-[#141414] focus:outline-none"
                  />
                  {renderExpiryBadge(expiries.customerMedicalExpiry)}
                </div>
              </div>

              {/* 6. Passport Expiry */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 bg-gray-50 border border-gray-300">
                <label className="text-xs font-mono font-bold text-[#141414]">Passport Expiry</label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={expiries.passportExpiry}
                    onChange={(e) => setExpiries({ ...expiries, passportExpiry: e.target.value })}
                    className="bg-white border border-[#141414] px-2 py-1 text-xs font-mono text-[#141414] focus:outline-none"
                  />
                  {renderExpiryBadge(expiries.passportExpiry)}
                </div>
              </div>

              {/* 7. EID Expiry */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 bg-gray-50 border border-gray-300">
                <label className="text-xs font-mono font-bold text-[#141414]">Emirates ID (EID) Expiry</label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={expiries.eidExpiry}
                    onChange={(e) => setExpiries({ ...expiries, eidExpiry: e.target.value })}
                    className="bg-white border border-[#141414] px-2 py-1 text-xs font-mono text-[#141414] focus:outline-none"
                  />
                  {renderExpiryBadge(expiries.eidExpiry)}
                </div>
              </div>

              {/* 8. Onshore Security Pass Expiry */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 bg-gray-50 border border-gray-300">
                <label className="text-xs font-mono font-bold text-[#141414]">Onshore Security Pass</label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={expiries.onshoreSecurityPassExpiry}
                    onChange={(e) => setExpiries({ ...expiries, onshoreSecurityPassExpiry: e.target.value })}
                    className="bg-white border border-[#141414] px-2 py-1 text-xs font-mono text-[#141414] focus:outline-none"
                  />
                  {renderExpiryBadge(expiries.onshoreSecurityPassExpiry)}
                </div>
              </div>

              {/* 9. Offshore Security Pass Expiry */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 bg-gray-50 border border-gray-300">
                <label className="text-xs font-mono font-bold text-[#141414]">Offshore Security Pass</label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={expiries.offshoreSecurityPassExpiry}
                    onChange={(e) => setExpiries({ ...expiries, offshoreSecurityPassExpiry: e.target.value })}
                    className="bg-white border border-[#141414] px-2 py-1 text-xs font-mono text-[#141414] focus:outline-none"
                  />
                  {renderExpiryBadge(expiries.offshoreSecurityPassExpiry)}
                </div>
              </div>

              {/* 10. WMS Expiry */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 bg-gray-50 border border-gray-300">
                <label className="text-xs font-mono font-bold text-[#141414]">WMS Expiry</label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={expiries.wmsExpiry}
                    onChange={(e) => setExpiries({ ...expiries, wmsExpiry: e.target.value })}
                    className="bg-white border border-[#141414] px-2 py-1 text-xs font-mono text-[#141414] focus:outline-none"
                  />
                  {renderExpiryBadge(expiries.wmsExpiry)}
                </div>
              </div>

              <div className="pt-3 border-t-2 border-[#141414] flex items-center justify-between">
                {engineerSavedMsg && (
                  <span className="text-[11px] font-mono font-bold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    {engineerSavedMsg}
                  </span>
                )}
                <div className="ml-auto">
                  <button
                    type="submit"
                    disabled={savingEngineer}
                    className="px-4 py-2 bg-[#d71920] hover:bg-[#b01319] text-white font-mono font-bold text-xs uppercase tracking-wider border-2 border-[#141414] transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    {savingEngineer ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    Save Engineer Expiries
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* SECTION 2: Personnel Document Fields */}
        <div className="bg-white border-2 border-[#141414] p-6 shadow-[4px_4px_0px_0px_#141414] flex flex-col justify-between">
          <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between border-b-2 border-[#141414] pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#d71920]" />
                <h3 className="text-xs font-black uppercase tracking-wider text-[#141414]">
                  Field Personnel Rotation & Assignment
                </h3>
              </div>
              <span className="text-[10px] font-mono font-bold bg-[#141414] text-white px-2 py-0.5">
                personnel/{personId}
              </span>
            </div>

            {personnelError && (
              <div className="p-3 bg-red-100 border-2 border-[#d71920] text-xs font-mono text-[#d71920]">
                {personnelError}
              </div>
            )}

            {personnelLoading ? (
              <div className="py-8 text-center font-mono text-xs text-gray-500 space-y-2">
                <div className="w-5 h-5 border-2 border-[#141414] border-t-[#d71920] rounded-full animate-spin mx-auto" />
                <p>Loading personnel record...</p>
              </div>
            ) : !personnelData ? (
              <div className="p-6 bg-amber-50 border-2 border-amber-400 text-amber-900 font-mono text-xs space-y-2">
                <p className="font-bold uppercase">No document found in "personnel/{personId}"</p>
                <p className="text-[11px] text-amber-800">
                  Fill in the fields below and click "Save Personnel Record" to create your personnel document.
                </p>
              </div>
            ) : null}

            {/* Form for Personnel fields */}
            <form onSubmit={handleSavePersonnelFields} className="space-y-4">
              
              {/* Hitch Days & Badge */}
              <div className="p-3 bg-gray-50 border-2 border-[#141414] space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono font-bold text-[#141414] uppercase flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-[#d71920]" />
                    Hitch Days (Rotation Duration)
                  </label>
                  {renderHitchDaysBadge(Number(personnelForm.hitchDays) || 0)}
                </div>
                <input
                  type="number"
                  min="0"
                  value={personnelForm.hitchDays}
                  onChange={(e) => setPersonnelForm({ ...personnelForm, hitchDays: Number(e.target.value) })}
                  className="w-full bg-white border-2 border-[#141414] px-3 py-1.5 text-sm font-mono font-bold text-[#141414] focus:outline-none"
                />
                <p className="text-[10px] font-mono text-gray-500">
                  Color Rules: <span className="text-emerald-700 font-bold">&lt;50d (Green)</span> | <span className="text-amber-700 font-bold">50-80d (Yellow)</span> | <span className="text-[#d71920] font-bold">&gt;80d (Red)</span>
                </p>
              </div>

              {/* Location Type, Rig Name, Category & Auto Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                
                {/* Location Type */}
                <div>
                  <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#141414] mb-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-gray-500" />
                    Location Type
                  </label>
                  <select
                    value={personnelForm.locationType}
                    onChange={(e) => {
                      const newType = e.target.value as LocationType;
                      setPersonnelForm({
                        ...personnelForm,
                        locationType: newType,
                        rigName: newType === 'Rig' ? personnelForm.rigName : '',
                      });
                    }}
                    className="w-full bg-[#f9f9f9] border-2 border-[#141414] px-3 py-1.5 text-xs font-mono font-bold text-[#141414] focus:outline-none focus:bg-white"
                  >
                    {LOCATION_TYPE_OPTIONS.map((loc) => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>

                {/* Rig Name (Only enabled when locationType === 'Rig') */}
                <div>
                  <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#141414] mb-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#d71920]" />
                    Rig Name {personnelForm.locationType !== 'Rig' && <span className="text-gray-400 font-normal">(Disabled)</span>}
                  </label>
                  <input
                    type="text"
                    disabled={personnelForm.locationType !== 'Rig'}
                    value={personnelForm.locationType === 'Rig' ? personnelForm.rigName : ''}
                    onChange={(e) => setPersonnelForm({ ...personnelForm, rigName: e.target.value })}
                    placeholder={personnelForm.locationType === 'Rig' ? "e.g. AD-181, GW-154" : "Disabled unless Location Type is Rig"}
                    className={`w-full border-2 border-[#141414] px-3 py-1.5 text-xs font-mono text-[#141414] focus:outline-none ${
                      personnelForm.locationType === 'Rig'
                        ? 'bg-[#f9f9f9] focus:bg-white'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-300'
                    }`}
                  />
                </div>

                {/* Personnel Category */}
                <div>
                  <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#141414] mb-1 flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-gray-500" />
                    Personnel Category
                  </label>
                  <select
                    value={personnelForm.category}
                    onChange={(e) => setPersonnelForm({ ...personnelForm, category: e.target.value as PersonnelCategory })}
                    className="w-full bg-[#f9f9f9] border-2 border-[#141414] px-3 py-1.5 text-xs font-mono font-bold text-[#141414] focus:outline-none focus:bg-white"
                  >
                    <option value="Consultant">Consultant</option>
                    <option value="Commuter">Commuter</option>
                    <option value="PRL">PRL</option>
                    <option value="Loan">Loan</option>
                  </select>
                </div>

                {/* Computed Status (Read-only badge) */}
                <div>
                  <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#141414] mb-1 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-gray-500" />
                    Auto Status
                  </label>
                  <div className="pt-1">
                    {(() => {
                      const isOnRig = personnelForm.locationType === 'Rig';
                      return (
                        <span className={`px-2.5 py-1.5 text-xs font-mono font-bold uppercase border-2 inline-flex items-center gap-2 ${
                          isOnRig 
                            ? 'bg-emerald-100 text-emerald-900 border-emerald-600' 
                            : 'bg-gray-100 text-gray-700 border-gray-400'
                        }`}>
                          <span className={`w-2 h-2 rounded-full ${isOnRig ? 'bg-emerald-600 animate-pulse' : 'bg-gray-400'}`} />
                          {isOnRig ? 'On Rig' : 'Off Rig'}
                        </span>
                      );
                    })()}
                  </div>
                </div>

              </div>

              {/* Dates: dateArrivedAUH, dateTraveledHome, dateReturn */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-1.5 border-b border-gray-300 pb-1">
                  <Calendar className="w-3.5 h-3.5 text-[#d71920]" />
                  <span className="text-[11px] font-mono font-bold text-gray-600 uppercase">
                    Rotation Arrival & Travel Dates
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#141414] mb-1">
                      Date Arrived AUH
                    </label>
                    <input
                      type="date"
                      value={personnelForm.dateArrivedAUH}
                      onChange={(e) => setPersonnelForm({ ...personnelForm, dateArrivedAUH: e.target.value })}
                      className="w-full bg-[#f9f9f9] border-2 border-[#141414] px-2 py-1.5 text-xs font-mono text-[#141414] focus:outline-none focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#141414] mb-1">
                      Date Traveled Home
                    </label>
                    <input
                      type="date"
                      value={personnelForm.dateTraveledHome}
                      onChange={(e) => setPersonnelForm({ ...personnelForm, dateTraveledHome: e.target.value })}
                      className="w-full bg-[#f9f9f9] border-2 border-[#141414] px-2 py-1.5 text-xs font-mono text-[#141414] focus:outline-none focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#141414] mb-1">
                      Date Return
                    </label>
                    <input
                      type="date"
                      value={personnelForm.dateReturn}
                      onChange={(e) => setPersonnelForm({ ...personnelForm, dateReturn: e.target.value })}
                      className="w-full bg-[#f9f9f9] border-2 border-[#141414] px-2 py-1.5 text-xs font-mono text-[#141414] focus:outline-none focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Comments */}
              <div>
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#141414] mb-1 flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5 text-gray-500" />
                  Comments / Notes
                </label>
                <textarea
                  rows={3}
                  value={personnelForm.comments}
                  onChange={(e) => setPersonnelForm({ ...personnelForm, comments: e.target.value })}
                  placeholder="e.g. Completed onshore safety induction; ready for deployment."
                  className="w-full bg-[#f9f9f9] border-2 border-[#141414] px-3 py-1.5 text-xs font-mono text-[#141414] focus:outline-none focus:bg-white"
                />
              </div>

              <div className="pt-3 border-t-2 border-[#141414] flex items-center justify-between">
                {personnelSavedMsg && (
                  <span className="text-[11px] font-mono font-bold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    {personnelSavedMsg}
                  </span>
                )}
                <div className="ml-auto">
                  <button
                    type="submit"
                    disabled={savingPersonnel}
                    className="px-4 py-2 bg-[#d71920] hover:bg-[#b01319] text-white font-mono font-bold text-xs uppercase tracking-wider border-2 border-[#141414] transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    {savingPersonnel ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    Save Personnel Record
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
};
