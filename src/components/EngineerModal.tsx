import React, { useState, useEffect } from 'react';
import { Engineer } from '../types';
import { formatDateForInput, toFirestoreTimestamp } from '../lib/dateUtils';
import { X, Wrench, IdCard, AlertCircle, Calendar, Hash, Mail, Phone, User } from 'lucide-react';

interface EngineerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (engineerData: Engineer, isEdit: boolean) => Promise<void>;
  initialData?: Engineer | null;
  existingIds: string[];
}

export const EngineerModal: React.FC<EngineerModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  existingIds,
}) => {
  const [personId, setPersonId] = useState('');
  const [name, setName] = useState('');
  const [sapNumber, setSapNumber] = useState('');
  const [optimaNumber, setOptimaNumber] = useState('');
  const [email, setEmail] = useState('');
  const [uaeHomeContact, setUaeHomeContact] = useState('');

  // Date expiry fields (stored as YYYY-MM-DD in local state for <input type="date">)
  const [optimaExpiry, setOptimaExpiry] = useState('');
  const [h2sExpiry, setH2sExpiry] = useState('');
  const [tbosietExpiry, setTbosietExpiry] = useState('');
  const [visaExpiry, setVisaExpiry] = useState('');
  const [customerMedicalExpiry, setCustomerMedicalExpiry] = useState('');
  const [passportExpiry, setPassportExpiry] = useState('');
  const [eidExpiry, setEidExpiry] = useState('');
  const [onshoreSecurityPassExpiry, setOnshoreSecurityPassExpiry] = useState('');
  const [offshoreSecurityPassExpiry, setOffshoreSecurityPassExpiry] = useState('');
  const [wmsExpiry, setWmsExpiry] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!initialData;

  useEffect(() => {
    if (initialData) {
      setPersonId(initialData.id);
      setName(initialData.name || '');
      setSapNumber(initialData.sapNumber || '');
      setOptimaNumber(initialData.optimaNumber || '');
      setEmail(initialData.email || '');
      setUaeHomeContact(initialData.uaeHomeContact || '');

      setOptimaExpiry(formatDateForInput(initialData.optimaExpiry));
      setH2sExpiry(formatDateForInput(initialData.h2sExpiry));
      setTbosietExpiry(formatDateForInput(initialData.tbosietExpiry));
      setVisaExpiry(formatDateForInput(initialData.visaExpiry));
      setCustomerMedicalExpiry(formatDateForInput(initialData.customerMedicalExpiry));
      setPassportExpiry(formatDateForInput(initialData.passportExpiry));
      setEidExpiry(formatDateForInput(initialData.eidExpiry));
      setOnshoreSecurityPassExpiry(formatDateForInput(initialData.onshoreSecurityPassExpiry));
      setOffshoreSecurityPassExpiry(formatDateForInput(initialData.offshoreSecurityPassExpiry));
      setWmsExpiry(formatDateForInput(initialData.wmsExpiry));
    } else {
      const randomId = `H${Math.floor(100000 + Math.random() * 900000)}`;
      setPersonId(randomId);
      setName('');
      setSapNumber('');
      setOptimaNumber('');
      setEmail('');
      setUaeHomeContact('');

      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 1);
      const defaultDateStr = nextYear.toISOString().split('T')[0];

      setOptimaExpiry(defaultDateStr);
      setH2sExpiry(defaultDateStr);
      setTbosietExpiry(defaultDateStr);
      setVisaExpiry(defaultDateStr);
      setCustomerMedicalExpiry(defaultDateStr);
      setPassportExpiry(defaultDateStr);
      setEidExpiry(defaultDateStr);
      setOnshoreSecurityPassExpiry(defaultDateStr);
      setOffshoreSecurityPassExpiry(defaultDateStr);
      setWmsExpiry(defaultDateStr);
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
      setError(`An engineer document with ID "${cleanId}" already exists in the "engineers" collection.`);
      return;
    }

    if (!name.trim()) {
      setError('Name is required.');
      return;
    }

    setSaving(true);
    try {
      const engineerData: Engineer = {
        id: cleanId,
        name: name.trim(),
        sapNumber: sapNumber.trim(),
        optimaNumber: optimaNumber.trim(),
        optimaExpiry: toFirestoreTimestamp(optimaExpiry),
        h2sExpiry: toFirestoreTimestamp(h2sExpiry),
        tbosietExpiry: toFirestoreTimestamp(tbosietExpiry),
        visaExpiry: toFirestoreTimestamp(visaExpiry),
        customerMedicalExpiry: toFirestoreTimestamp(customerMedicalExpiry),
        passportExpiry: toFirestoreTimestamp(passportExpiry),
        eidExpiry: toFirestoreTimestamp(eidExpiry),
        onshoreSecurityPassExpiry: toFirestoreTimestamp(onshoreSecurityPassExpiry),
        offshoreSecurityPassExpiry: toFirestoreTimestamp(offshoreSecurityPassExpiry),
        wmsExpiry: toFirestoreTimestamp(wmsExpiry),
        uaeHomeContact: uaeHomeContact.trim(),
        email: email.trim(),
        updatedAt: new Date().toISOString(),
        createdAt: initialData?.createdAt || new Date().toISOString(),
      };

      await onSave(engineerData, isEdit);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save engineer document.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#141414]/75 flex items-center justify-center p-4 overflow-y-auto font-sans">
      <div className="bg-white border-2 border-[#141414] w-full max-w-2xl shadow-[6px_6px_0px_0px_#141414] overflow-hidden my-8">
        {/* Header */}
        <div className="bg-[#1a1a1a] px-6 py-4 border-b-2 border-[#141414] flex items-center justify-between text-white">
          <div className="flex items-center gap-2 font-black uppercase text-xs tracking-wider">
            <Wrench className="w-4 h-4 text-[#d71920]" />
            {isEdit ? `Edit Engineer Doc: ${personId}` : '+ Add Engineer Doc'}
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white hover:bg-[#333] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
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
              Keyed directly in <code className="text-[#d71920] font-bold">engineers</code> collection.
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

          {/* Section 1: Basic Information */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-[#141414] border-b-2 border-[#141414] pb-1 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#d71920]" />
              General Information
            </h4>

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
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. madams@halliburton.com"
                    className="w-full bg-[#f9f9f9] border-2 border-[#141414] pl-8 pr-3 py-1.5 text-xs font-mono text-[#141414] focus:outline-none focus:bg-white"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#141414] mb-1">
                  SAP Number
                </label>
                <div className="relative">
                  <Hash className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={sapNumber}
                    onChange={(e) => setSapNumber(e.target.value)}
                    placeholder="e.g. 8049102"
                    className="w-full bg-[#f9f9f9] border-2 border-[#141414] pl-8 pr-3 py-1.5 text-xs font-mono text-[#141414] focus:outline-none focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#141414] mb-1">
                  Optima Number
                </label>
                <div className="relative">
                  <Hash className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={optimaNumber}
                    onChange={(e) => setOptimaNumber(e.target.value)}
                    placeholder="e.g. OPT-99201"
                    className="w-full bg-[#f9f9f9] border-2 border-[#141414] pl-8 pr-3 py-1.5 text-xs font-mono text-[#141414] focus:outline-none focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#141414] mb-1">
                  UAE Home Contact
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={uaeHomeContact}
                    onChange={(e) => setUaeHomeContact(e.target.value)}
                    placeholder="e.g. +971 50 123 4567"
                    className="w-full bg-[#f9f9f9] border-2 border-[#141414] pl-8 pr-3 py-1.5 text-xs font-mono text-[#141414] focus:outline-none focus:bg-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Expiry Dates (Firestore Timestamps) */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-b-2 border-[#141414] pb-1">
              <h4 className="text-xs font-black uppercase tracking-wider text-[#141414] flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#d71920]" />
                Certifications & Document Expiries (Firestore Timestamps)
              </h4>
              <span className="text-[10px] font-mono text-gray-500 font-bold uppercase">10 Expiry Dates</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#141414] mb-1">
                  Optima Expiry
                </label>
                <input
                  type="date"
                  value={optimaExpiry}
                  onChange={(e) => setOptimaExpiry(e.target.value)}
                  className="w-full bg-[#f9f9f9] border-2 border-[#141414] px-3 py-1.5 text-xs font-mono text-[#141414] focus:outline-none focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#141414] mb-1">
                  H2S Expiry
                </label>
                <input
                  type="date"
                  value={h2sExpiry}
                  onChange={(e) => setH2sExpiry(e.target.value)}
                  className="w-full bg-[#f9f9f9] border-2 border-[#141414] px-3 py-1.5 text-xs font-mono text-[#141414] focus:outline-none focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#141414] mb-1">
                  TBOSIET Expiry
                </label>
                <input
                  type="date"
                  value={tbosietExpiry}
                  onChange={(e) => setTbosietExpiry(e.target.value)}
                  className="w-full bg-[#f9f9f9] border-2 border-[#141414] px-3 py-1.5 text-xs font-mono text-[#141414] focus:outline-none focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#141414] mb-1">
                  Visa Expiry
                </label>
                <input
                  type="date"
                  value={visaExpiry}
                  onChange={(e) => setVisaExpiry(e.target.value)}
                  className="w-full bg-[#f9f9f9] border-2 border-[#141414] px-3 py-1.5 text-xs font-mono text-[#141414] focus:outline-none focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#141414] mb-1">
                  Customer Medical Expiry
                </label>
                <input
                  type="date"
                  value={customerMedicalExpiry}
                  onChange={(e) => setCustomerMedicalExpiry(e.target.value)}
                  className="w-full bg-[#f9f9f9] border-2 border-[#141414] px-3 py-1.5 text-xs font-mono text-[#141414] focus:outline-none focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#141414] mb-1">
                  Passport Expiry
                </label>
                <input
                  type="date"
                  value={passportExpiry}
                  onChange={(e) => setPassportExpiry(e.target.value)}
                  className="w-full bg-[#f9f9f9] border-2 border-[#141414] px-3 py-1.5 text-xs font-mono text-[#141414] focus:outline-none focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#141414] mb-1">
                  Emirates ID (EID) Expiry
                </label>
                <input
                  type="date"
                  value={eidExpiry}
                  onChange={(e) => setEidExpiry(e.target.value)}
                  className="w-full bg-[#f9f9f9] border-2 border-[#141414] px-3 py-1.5 text-xs font-mono text-[#141414] focus:outline-none focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#141414] mb-1">
                  Onshore Security Pass Expiry
                </label>
                <input
                  type="date"
                  value={onshoreSecurityPassExpiry}
                  onChange={(e) => setOnshoreSecurityPassExpiry(e.target.value)}
                  className="w-full bg-[#f9f9f9] border-2 border-[#141414] px-3 py-1.5 text-xs font-mono text-[#141414] focus:outline-none focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#141414] mb-1">
                  Offshore Security Pass Expiry
                </label>
                <input
                  type="date"
                  value={offshoreSecurityPassExpiry}
                  onChange={(e) => setOffshoreSecurityPassExpiry(e.target.value)}
                  className="w-full bg-[#f9f9f9] border-2 border-[#141414] px-3 py-1.5 text-xs font-mono text-[#141414] focus:outline-none focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#141414] mb-1">
                  WMS Expiry
                </label>
                <input
                  type="date"
                  value={wmsExpiry}
                  onChange={(e) => setWmsExpiry(e.target.value)}
                  className="w-full bg-[#f9f9f9] border-2 border-[#141414] px-3 py-1.5 text-xs font-mono text-[#141414] focus:outline-none focus:bg-white"
                />
              </div>
            </div>
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
              {isEdit ? 'Update Document' : 'Save Engineer Document'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
