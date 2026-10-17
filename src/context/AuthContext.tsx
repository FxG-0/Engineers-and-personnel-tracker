import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut 
} from 'firebase/auth';
import { doc, getDoc, getDocFromServer, setDoc, collection, getDocs } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { UserRole, UserProfile } from '../types';

// Helper to check if a user's signup email matches an engineer record
async function findMatchingEngineerIdByEmail(email: string): Promise<{ personId: string; autoLinked: boolean }> {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail) {
    return { personId: '', autoLinked: false };
  }

  try {
    const querySnap = await getDocs(collection(db, 'engineers'));
    const matches: string[] = [];

    querySnap.forEach((docSnap) => {
      const data = docSnap.data();
      const engEmail = (data.email || '').toString().trim().toLowerCase();
      if (engEmail === cleanEmail) {
        matches.push(docSnap.id); // doc ID is User ID (personId e.g. "H287330")
      }
    });

    if (matches.length === 1) {
      console.log(`[Auto-Link] Found exactly 1 matching engineer for ${email}: ${matches[0]}`);
      return { personId: matches[0], autoLinked: true };
    } else if (matches.length > 1) {
      console.warn(`[Auto-Link] Multiple engineers found for ${email} (${matches.length}). Leaving personId blank for manual linking.`);
    } else {
      console.log(`[Auto-Link] No engineer found matching email ${email}. Leaving personId blank for manual linking.`);
    }
  } catch (err) {
    console.warn('Error querying engineers collection for email auto-match:', err);
  }

  return { personId: '', autoLinked: false };
}

interface AuthContextType {
  currentUser: User | null;
  userRole: UserRole | null;
  userProfile: UserProfile | null;
  loading: boolean;
  error: string | null;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, requestedRole?: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  setUserRole: (targetUid: string, newRole: UserRole) => Promise<void>;
  updateUserRecord: (targetUid: string, data: { role?: UserRole; personId?: string }) => Promise<void>;
  clearError: () => void;
  refreshRole: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userRole, setUserRoleState] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRoleForUser = async (uid: string, userEmail?: string | null): Promise<UserRole> => {
    const userDocRef = doc(db, 'users', uid);
    try {
      let snap;
      try {
        // Fetch role directly from Firestore server (bypassing local SDK cache)
        snap = await getDocFromServer(userDocRef);
      } catch (serverErr) {
        console.warn(`getDocFromServer failed for ${uid}, falling back to getDoc:`, serverErr);
        snap = await getDoc(userDocRef);
      }

      if (snap.exists()) {
        const data = snap.data();
        const role: UserRole = data.role === 'admin' ? 'admin' : 'user';
        console.log(`[Firestore Auth] Fetched role from Firestore for ${userEmail || uid}:`, role);
        return role;
      } else {
        // If doc doesn't exist in 'users' collection yet, auto-create default 'user' role document
        const defaultRole: UserRole = 'user';
        let matchResult = { personId: '', autoLinked: false };
        if (userEmail) {
          matchResult = await findMatchingEngineerIdByEmail(userEmail);
        }
        try {
          await setDoc(userDocRef, {
            role: defaultRole,
            personId: matchResult.personId,
            autoLinked: matchResult.autoLinked,
            email: userEmail || '',
            createdAt: new Date().toISOString()
          }, { merge: true });
        } catch (writeErr) {
          console.warn('Could not auto-create user document in "users" collection:', writeErr);
        }
        console.log(`[Firestore Auth] Fetched role from Firestore (newly created user doc, personId="${matchResult.personId}"):`, defaultRole);
        return defaultRole;
      }
    } catch (err: any) {
      const fallbackRole: UserRole = 'user';
      console.warn(`Firestore read failed for user ${uid}: ${err?.message || err}. Defaulting to role "${fallbackRole}".`);
      console.log(`[Firestore Auth] Fetched role from Firestore (fallback):`, fallbackRole);
      return fallbackRole;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      setCurrentUser(user);
      if (user) {
        try {
          const role = await fetchRoleForUser(user.uid, user.email);
          setUserRoleState(role);
        } catch (err) {
          console.error('Error fetching user role from "users" collection:', err);
          setUserRoleState('user');
        }
      } else {
        setUserRoleState(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string) => {
    setError(null);
    setLoading(true);
    try {
      const credential = await signInWithEmailAndPassword(auth, email, pass);
      const role = await fetchRoleForUser(credential.user.uid, credential.user.email);
      setUserRoleState(role);
    } catch (err: any) {
      let msg = err.message || 'Login failed';
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        msg = 'Invalid email or password. Please check your credentials or create an account.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'Invalid email address format.';
      } else if (err.code === 'auth/too-many-requests') {
        msg = 'Too many failed login attempts. Please wait a moment and try again.';
      }
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, pass: string, requestedRole: UserRole = 'user') => {
    setError(null);
    setLoading(true);
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, pass);
      const uid = credential.user.uid;
      
      const assignedRole: UserRole = requestedRole || 'user';
      // Auto-match signup email against engineers collection
      const matchResult = await findMatchingEngineerIdByEmail(email);

      const userDocRef = doc(db, 'users', uid);
      try {
        await setDoc(userDocRef, {
          role: assignedRole,
          personId: matchResult.personId,
          autoLinked: matchResult.autoLinked,
          email: email,
          createdAt: new Date().toISOString()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
      }

      setUserRoleState(assignedRole);
    } catch (err: any) {
      let msg = err.message || 'Registration failed';
      if (err.code === 'auth/email-already-in-use') {
        msg = 'This email is already registered. Please sign in instead.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'Password should be at least 6 characters.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'Please enter a valid email address.';
      }
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setError(null);
    try {
      await firebaseSignOut(auth);
      setCurrentUser(null);
      setUserRoleState(null);
    } catch (err: any) {
      setError(err.message || 'Logout failed');
    }
  };

  const setUserRole = async (targetUid: string, newRole: UserRole) => {
    try {
      const userDocRef = doc(db, 'users', targetUid);
      await setDoc(userDocRef, { role: newRole, updatedAt: new Date().toISOString() }, { merge: true });
      if (currentUser && currentUser.uid === targetUid) {
        setUserRoleState(newRole);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${targetUid}`);
    }
  };

  const updateUserRecord = async (targetUid: string, data: { role?: UserRole; personId?: string }) => {
    try {
      const userDocRef = doc(db, 'users', targetUid);
      await setDoc(userDocRef, { ...data, updatedAt: new Date().toISOString() }, { merge: true });
      if (currentUser && currentUser.uid === targetUid && data.role) {
        setUserRoleState(data.role);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${targetUid}`);
    }
  };

  const refreshRole = async () => {
    if (currentUser) {
      const role = await fetchRoleForUser(currentUser.uid, currentUser.email);
      setUserRoleState(role);
    }
  };

  const userProfile: UserProfile | null = currentUser ? {
    uid: currentUser.uid,
    email: currentUser.email,
    role: userRole || 'user',
  } : null;

  return (
    <AuthContext.Provider value={{
      currentUser,
      userRole,
      userProfile,
      loading,
      error,
      login,
      register,
      logout,
      setUserRole,
      updateUserRecord,
      clearError: () => setError(null),
      refreshRole,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
