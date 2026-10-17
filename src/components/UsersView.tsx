import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, setDoc, doc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { UserRecord, UserRole } from '../types';
import { useAuth } from '../context/AuthContext';
import { Shield, Lock, RefreshCw, Key, Users, Edit3, Check, X, IdCard, Search, Trash2 } from 'lucide-react';

export const UsersView: React.FC = () => {
  const { currentUser, userRole } = useAuth();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [linkFilter, setLinkFilter] = useState<string>('all');
  const [updatingUid, setUpdatingUid] = useState<string | null>(null);

  // Editing state for an individual user row
  const [editingUid, setEditingUid] = useState<string | null>(null);
  const [editPersonId, setEditPersonId] = useState<string>('');
  const [editRole, setEditRole] = useState<UserRole>('user');

  useEffect(() => {
    const path = 'users';
    setLoading(true);
    setError(null);

    const unsubscribe = onSnapshot(
      collection(db, path),
      (snapshot) => {
        const list: UserRecord[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          list.push({
            uid: docSnap.id, // Doc ID is Auth UID
            email: data.email || '',
            role: (data.role as UserRole) || 'user',
            personId: data.personId || '',
            autoLinked: data.autoLinked === true,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          });
        });
        setUsers(list);
        setLoading(false);
      },
      (err) => {
        setLoading(false);
        const errMsg = err?.message || String(err);
        if (errMsg.toLowerCase().includes('offline') || errMsg.toLowerCase().includes('unavailable')) {
          console.warn('Firestore snapshot listener is offline for users collection:', errMsg);
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

  const startEditing = (u: UserRecord) => {
    setEditingUid(u.uid);
    setEditPersonId(u.personId || '');
    setEditRole(u.role);
  };

  const cancelEditing = () => {
    setEditingUid(null);
    setEditPersonId('');
    setEditRole('user');
  };

  const handleSaveUser = async (targetUid: string) => {
    if (userRole !== 'admin') {
      alert('Only Admin users can modify user documents in the "users" collection.');
      return;
    }

    setUpdatingUid(targetUid);
    const docPath = `users/${targetUid}`;
    try {
      await setDoc(
        doc(db, 'users', targetUid),
        {
          personId: editPersonId.trim(),
          autoLinked: false, // Explicitly set manually by admin
          role: editRole,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      setEditingUid(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, docPath);
    } finally {
      setUpdatingUid(null);
    }
  };

  const handleDeleteUserDoc = async (targetUid: string, targetEmail: string) => {
    if (userRole !== 'admin') {
      alert('Only Admin users can delete documents from "users".');
      return;
    }

    if (!window.confirm(`Delete Firestore role document for "${targetEmail}" (UID: ${targetUid})?`)) {
      return;
    }

    setUpdatingUid(targetUid);
    const docPath = `users/${targetUid}`;
    try {
      await deleteDoc(doc(db, 'users', targetUid));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, docPath);
    } finally {
      setUpdatingUid(null);
    }
  };

  const filteredUsers = users.filter((u) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      u.uid.toLowerCase().includes(query) ||
      u.email.toLowerCase().includes(query) ||
      u.personId.toLowerCase().includes(query);
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;

    let matchesLink = true;
    if (linkFilter === 'auto') {
      matchesLink = !!u.personId && u.autoLinked === true;
    } else if (linkFilter === 'manual') {
      matchesLink = !!u.personId && u.autoLinked !== true;
    } else if (linkFilter === 'unlinked') {
      matchesLink = !u.personId || u.personId.trim() === '';
    }

    return matchesSearch && matchesRole && matchesLink;
  });

  const autoLinkedCount = users.filter((u) => u.personId && u.autoLinked === true).length;
  const manualLinkedCount = users.filter((u) => u.personId && u.autoLinked !== true).length;
  const unassignedPersonIdCount = users.filter((u) => !u.personId || u.personId.trim() === '').length;

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border-2 border-[#141414] p-4 flex flex-col justify-between h-24 shadow-[2px_2px_0px_0px_#141414]">
          <span className="text-[10px] uppercase font-bold text-[#141414] opacity-70">Total Users</span>
          <span className="text-3xl font-mono font-bold tracking-tighter text-[#141414]">
            {users.length.toString().padStart(2, '0')}
          </span>
        </div>

        <div className="bg-white border-2 border-[#141414] p-4 flex flex-col justify-between h-24 shadow-[2px_2px_0px_0px_#141414]">
          <span className="text-[10px] uppercase font-bold text-[#141414] opacity-70">Auto-Linked</span>
          <span className="text-3xl font-mono font-bold tracking-tighter text-emerald-600">
            {autoLinkedCount.toString().padStart(2, '0')}
          </span>
        </div>

        <div className="bg-white border-2 border-[#141414] p-4 flex flex-col justify-between h-24 shadow-[2px_2px_0px_0px_#141414]">
          <span className="text-[10px] uppercase font-bold text-[#141414] opacity-70">Manually Linked</span>
          <span className="text-3xl font-mono font-bold tracking-tighter text-blue-600">
            {manualLinkedCount.toString().padStart(2, '0')}
          </span>
        </div>

        <div className="bg-white border-2 border-[#141414] p-4 flex flex-col justify-between h-24 shadow-[2px_2px_0px_0px_#141414]">
          <span className="text-[10px] uppercase font-bold text-[#141414] opacity-70">Needs Manual Link</span>
          <span className="text-3xl font-mono font-bold tracking-tighter text-amber-600">
            {unassignedPersonIdCount.toString().padStart(2, '0')}
          </span>
        </div>
      </div>

      {/* Control Banner */}
      <div className="bg-white border-2 border-[#141414] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-[2px_2px_0px_0px_#141414]">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#d71920]" />
            <h2 className="text-sm font-black uppercase tracking-wider text-[#141414]">
              Users & Roles Firestore Collection
            </h2>
          </div>
          <p className="text-[11px] font-mono text-gray-600 mt-0.5">
            Admin interface to configure <code className="text-[#d71920] font-bold">personId</code> and <code className="text-[#d71920] font-bold">role</code> fields stored at <code className="text-[#d71920] font-bold">users/{'{AuthUID}'}</code>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold bg-[#f5f5f5] border border-[#141414] px-3 py-1.5 flex items-center gap-1.5 text-[#141414]">
            <Lock className="w-3.5 h-3.5 text-[#d71920]" />
            YOUR PERMISSION: <span className="uppercase text-[#d71920]">{userRole}</span>
          </span>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-100 border-2 border-[#d71920] text-xs text-[#d71920] font-mono">
          <p className="font-bold">Firestore Diagnostics:</p>
          <pre className="mt-1 text-[11px]">{error}</pre>
        </div>
      )}

      {/* Search Toolbar */}
      <div className="bg-white border-2 border-[#141414] p-3 grid grid-cols-1 md:grid-cols-12 gap-3 shadow-[2px_2px_0px_0px_#141414]">
        <div className="md:col-span-6 relative">
          <Search className="w-4 h-4 text-[#141414] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Auth UID, Email, or Person ID..."
            className="w-full bg-[#f9f9f9] border-2 border-[#141414] pl-9 pr-3 py-1.5 text-xs font-mono text-[#141414] focus:outline-none focus:bg-white"
          />
        </div>

        <div className="md:col-span-3">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full bg-[#f9f9f9] border-2 border-[#141414] px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[#141414] focus:outline-none focus:bg-white"
          >
            <option value="all">ALL ROLES</option>
            <option value="admin">ADMIN</option>
            <option value="user">USER</option>
          </select>
        </div>

        <div className="md:col-span-3">
          <select
            value={linkFilter}
            onChange={(e) => setLinkFilter(e.target.value)}
            className="w-full bg-[#f9f9f9] border-2 border-[#141414] px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[#141414] focus:outline-none focus:bg-white"
          >
            <option value="all">ALL LINK STATUS</option>
            <option value="auto">AUTO-LINKED</option>
            <option value="manual">MANUAL LINK</option>
            <option value="unlinked">NEEDS MANUAL LINK</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="bg-white border-2 border-[#141414] p-12 text-center text-[#141414] font-mono text-xs space-y-2">
          <div className="w-6 h-6 border-2 border-[#141414] border-t-[#d71920] rounded-full animate-spin mx-auto" />
          <p className="font-bold uppercase tracking-wider">Loading user records from Firestore...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="bg-white border-2 border-[#141414] p-12 text-center text-[#141414]">
          <Users className="w-8 h-8 text-[#d71920] mx-auto mb-2" />
          <div className="text-sm font-bold uppercase tracking-wider">No User Documents Match Query</div>
          <p className="text-xs font-mono text-gray-600 mt-1">
            {searchQuery || roleFilter !== 'all' || linkFilter !== 'all'
              ? 'Try clearing search filters.'
              : 'No documents exist in the "users" collection.'}
          </p>
        </div>
      ) : (
        <div className="bg-white border-2 border-[#141414] overflow-hidden shadow-[3px_3px_0px_0px_#141414]">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs font-mono">
              <thead>
                <tr className="bg-[#f5f5f5] border-b-2 border-[#141414] text-[10px] uppercase font-bold text-[#141414]">
                  <th className="px-4 py-3 border-r border-[#141414]">Auth UID (Document Key)</th>
                  <th className="px-4 py-3 border-r border-[#141414]">Email Address</th>
                  <th className="px-4 py-3 border-r border-[#141414] w-40">Person ID (personId)</th>
                  <th className="px-4 py-3 border-r border-[#141414] w-40">Link Status</th>
                  <th className="px-4 py-3 border-r border-[#141414] w-28">Role</th>
                  <th className="px-4 py-3 border-r border-[#141414]">Last Updated</th>
                  <th className="px-4 py-3 text-right w-44">Manage User</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredUsers.map((u) => {
                  const isCurrent = u.uid === currentUser?.uid;
                  const isEditing = editingUid === u.uid;

                  return (
                    <tr
                      key={u.uid}
                      className={`hover:bg-[#f9f9f9] transition-colors ${
                        isCurrent ? 'bg-amber-50/50' : isEditing ? 'bg-blue-50/50' : ''
                      }`}
                    >
                      {/* Auth UID */}
                      <td className="px-4 py-3 border-r border-gray-200 font-bold text-[#141414]">
                        <div className="flex items-center gap-2">
                          <Key className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                          <span className="truncate max-w-[140px]" title={u.uid}>{u.uid}</span>
                          {isCurrent && (
                            <span className="bg-[#141414] text-white text-[8px] font-bold px-1.5 py-0.2 uppercase">
                              YOU
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Email */}
                      <td className="px-4 py-3 border-r border-gray-200 font-bold text-[#141414]">
                        {u.email}
                      </td>

                      {/* Person ID (personId) */}
                      <td className="px-4 py-3 border-r border-gray-200 font-bold">
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <IdCard className="w-3.5 h-3.5 text-[#d71920] shrink-0" />
                            <input
                              type="text"
                              value={editPersonId}
                              onChange={(e) => setEditPersonId(e.target.value)}
                              placeholder="e.g. H287330"
                              className="w-full bg-white border-2 border-[#141414] px-2 py-1 text-xs font-mono font-bold text-[#141414] focus:outline-none"
                              autoFocus
                            />
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <IdCard className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            {u.personId ? (
                              <span className="bg-[#141414] text-white px-2 py-0.5 text-[11px] font-bold rounded-xs font-mono">
                                {u.personId}
                              </span>
                            ) : (
                              <span className="text-amber-800 font-semibold italic text-[11px] bg-amber-50 border border-amber-200 px-2 py-0.5">
                                [Unassigned]
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Link Status Indicator */}
                      <td className="px-4 py-3 border-r border-gray-200">
                        {u.personId ? (
                          u.autoLinked ? (
                            <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-900 border border-emerald-400 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider" title="Matched signup email with engineers record automatically">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                              Auto-linked
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 bg-blue-100 text-blue-900 border border-blue-400 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider" title="Set manually by admin">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                              Manual link
                            </span>
                          )
                        ) : (
                          <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-900 border border-amber-400 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider" title="Unassigned personId - needs manual link by hand">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                            Needs manual link
                          </span>
                        )}
                      </td>

                      {/* Role */}
                      <td className="px-4 py-3 border-r border-gray-200">
                        {isEditing ? (
                          <select
                            value={editRole}
                            onChange={(e) => setEditRole(e.target.value as UserRole)}
                            className="bg-white border-2 border-[#141414] px-2 py-1 text-xs font-bold uppercase font-mono text-[#141414] focus:outline-none"
                          >
                            <option value="user">USER</option>
                            <option value="admin">ADMIN</option>
                          </select>
                        ) : (
                          <span
                            className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${
                              u.role === 'admin'
                                ? 'bg-[#d71920] text-white border-[#d71920]'
                                : 'bg-emerald-100 text-emerald-900 border-emerald-500'
                            }`}
                          >
                            {u.role}
                          </span>
                        )}
                      </td>

                      {/* Last Updated */}
                      <td className="px-4 py-3 border-r border-gray-200 text-gray-600 text-[11px]">
                        {u.updatedAt ? new Date(u.updatedAt).toLocaleString() : 'Registered'}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        {updatingUid === u.uid ? (
                          <div className="flex items-center justify-end gap-1 text-[10px] text-gray-500 font-bold">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#d71920]" />
                            Saving...
                          </div>
                        ) : isEditing ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleSaveUser(u.uid)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold uppercase transition-colors flex items-center gap-1"
                              title="Save Changes"
                            >
                              <Check className="w-3 h-3" />
                              Save
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="px-2 py-1 bg-gray-200 hover:bg-gray-300 text-[#141414] text-[10px] font-bold uppercase transition-colors flex items-center gap-1"
                              title="Cancel"
                            >
                              <X className="w-3 h-3" />
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => startEditing(u)}
                              disabled={userRole !== 'admin'}
                              className="px-2.5 py-1 bg-[#141414] hover:bg-[#d71920] text-white text-[10px] font-bold uppercase transition-colors disabled:opacity-30 flex items-center gap-1"
                              title="Edit Person ID and Role"
                            >
                              <Edit3 className="w-3 h-3" />
                              Edit
                            </button>

                            <button
                              onClick={() => handleDeleteUserDoc(u.uid, u.email)}
                              disabled={userRole !== 'admin' || isCurrent}
                              className="px-2 py-1 bg-red-100 border border-red-400 text-red-900 hover:bg-red-200 text-[10px] font-bold uppercase transition-colors disabled:opacity-30 flex items-center gap-1"
                              title="Delete Role Document"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
