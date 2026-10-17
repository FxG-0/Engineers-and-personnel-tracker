import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, enableIndexedDbPersistence } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: "AIzaSyCurxhvxLE42nkdCPzOaDTG4WBbO7ZCYmg",
  authDomain: "personnel-tracker-halliburton.firebaseapp.com",
  projectId: "personnel-tracker-halliburton",
  storageBucket: "personnel-tracker-halliburton.firebasestorage.app",
  messagingSenderId: "1096368488859",
  appId: "1:1096368488859:web:67b6254e3e99987f0e213e"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app, 'default');

// Enable offline cache persistence
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('Firestore offline persistence skipped: Multiple tabs open');
  } else if (err.code === 'unimplemented') {
    console.warn('Firestore offline persistence skipped: Browser unsupported');
  }
});

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errMsg = error instanceof Error ? error.message : String(error);
  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };

  if (errMsg.toLowerCase().includes('offline') || errMsg.toLowerCase().includes('unavailable')) {
    console.warn(`Firestore network offline warning (${operationType} ${path}):`, errMsg);
  } else {
    console.error('Firestore Error: ', JSON.stringify(errInfo));
  }
  throw new Error(JSON.stringify(errInfo));
}

export async function testFirebaseConnection() {
  try {
    await getDocFromServer(doc(db, 'system', 'ping'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('offline')) {
      console.warn('Firebase client appears to be offline or network restricted.');
    }
  }
}
