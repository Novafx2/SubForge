import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import { doc, getDoc, getDocFromServer, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';
import { UserProfile, UserRoleType } from '../types/auth';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  isAdmin: boolean;
  adminUsername: string | null;
  isSuspended: boolean;
  loading: boolean;
  signInWithGoogle: () => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  adminLogin: (username: string, password: string) => Promise<{ error?: string }>;
  adminLogout: () => Promise<void>;
  claimAdminBootstrap: (secretKey: string) => Promise<{ error?: string; message?: string }>;
  changeAdminPassword: (
    currentPassword: string,
    newPassword: string
  ) => Promise<{ error?: string; message?: string }>;
  rotateAdminPassword: (
    bootstrapSecretKey: string,
    newPassword: string
  ) => Promise<{ error?: string; message?: string }>;
  refreshAdminSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  isAdmin: false,
  adminUsername: null,
  isSuspended: false,
  loading: true,
  signInWithGoogle: async () => ({}),
  signOut: async () => {},
  adminLogin: async () => ({}),
  adminLogout: async () => {},
  claimAdminBootstrap: async () => ({}),
  changeAdminPassword: async () => ({}),
  rotateAdminPassword: async () => ({}),
  refreshAdminSession: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminUsername, setAdminUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshAdminSession = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/session', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated) {
          setIsAdmin(true);
          setAdminUsername(data.username || 'admin');
          return;
        }
      }
    } catch {
      // ignore
    }
    setIsAdmin(false);
    setAdminUsername(null);
  }, []);

  const syncUserToFirestore = useCallback(async (fbUser: User) => {
    const userPath = `users/${fbUser.uid}`;
    try {
      const userRef = doc(db, 'users', fbUser.uid);
      const snap = await getDoc(userRef);

      const providerId = 'Google';

      const fullName =
        fbUser.displayName ||
        (fbUser.email ? fbUser.email.split('@')[0] : 'SubForge User');

      const initialRole: UserRoleType = 'user';

      if (!snap.exists()) {
        const newProfile: UserProfile = {
          id: fbUser.uid,
          email: fbUser.email || '',
          username: fullName,
          fullName,
          avatarUrl: fbUser.photoURL || null,
          provider: providerId,
          status: 'active',
          role: initialRole,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_login_at: new Date().toISOString(),
        };
        try {
          await setDoc(userRef, {
            ...newProfile,
            createdAtServer: serverTimestamp(),
            lastLoginAtServer: serverTimestamp(),
          });
        } catch (writeErr) {
          handleFirestoreError(writeErr, OperationType.CREATE, userPath);
        }
        setProfile(newProfile);
      } else {
        const existing = snap.data() as UserProfile;
        const updatedProfile: UserProfile = {
          ...existing,
          email: fbUser.email || existing.email,
          username: fullName,
          fullName,
          avatarUrl: fbUser.photoURL || existing.avatarUrl || null,
          provider: providerId,
          updated_at: new Date().toISOString(),
          last_login_at: new Date().toISOString(),
        };
        try {
          await setDoc(
            userRef,
            {
              email: updatedProfile.email,
              username: updatedProfile.username,
              fullName: updatedProfile.fullName,
              avatarUrl: updatedProfile.avatarUrl,
              provider: updatedProfile.provider,
              updated_at: updatedProfile.updated_at,
              last_login_at: updatedProfile.last_login_at,
              lastLoginAtServer: serverTimestamp(),
            },
            { merge: true }
          );
        } catch (updateErr) {
          handleFirestoreError(updateErr, OperationType.UPDATE, userPath);
        }
        setProfile(updatedProfile);
      }
    } catch (err) {
      // Fallback profile if Firestore rules/network pending while still preserving session
      console.warn('Firestore profile sync fallback:', err);
      setProfile({
        id: fbUser.uid,
        email: fbUser.email || '',
        username: fbUser.displayName || 'User',
        fullName: fbUser.displayName || 'User',
        avatarUrl: fbUser.photoURL || null,
        provider: 'Google',
        status: 'active',
        role: 'user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  }, []);

  useEffect(() => {
    refreshAdminSession();
    testFirestoreConnection();
    setPersistence(auth, browserLocalPersistence).catch(() => {
      // Fallback gracefully if third-party storage is restricted
    });

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        setUser(fbUser);
        await syncUserToFirestore(fbUser);
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [refreshAdminSession, syncUserToFirestore]);

  const signInWithGoogle = async () => {
    try {
      await setPersistence(auth, browserLocalPersistence).catch(() => {});
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        await syncUserToFirestore(result.user);
      }
      return {};
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/popup-closed-by-user') {
        return { error: 'Google sign-in was cancelled.' };
      }
      if (code === 'auth/popup-blocked') {
        return { error: 'Pop-up was blocked by your browser. Please allow pop-ups and try again.' };
      }
      if (code === 'auth/unauthorized-domain') {
        const host = typeof window !== 'undefined' ? window.location.hostname : 'this domain';
        return {
          error: `Domain "${host}" is not authorized in Firebase Authentication. Add "${host}" under Firebase Console → Authentication → Settings → Authorized domains.`,
        };
      }
      if (code === 'auth/operation-not-allowed') {
        return {
          error:
            'Google Sign-In is not enabled yet in Firebase Console. Please enable Google under Authentication → Sign-in method.',
        };
      }
      return { error: err?.message || 'Google sign-in failed.' };
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUser(null);
    setProfile(null);
  };

  const adminLogin = async (username: string, password: string) => {
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { error: data.error || 'Invalid administrator credentials.' };
      }
      setIsAdmin(true);
      setAdminUsername(data.username || username);
      return {};
    } catch (err: any) {
      return { error: err?.message || 'Failed to connect to admin authentication server.' };
    }
  };

  const adminLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST', credentials: 'include' });
    } catch {
      // ignore
    }
    setIsAdmin(false);
    setAdminUsername(null);
  };

  const changeAdminPassword = async (currentPassword: string, newPassword: string) => {
    try {
      const res = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { error: data.error || 'Failed to update password.' };
      }
      return { message: data.message || 'Administrator password updated.' };
    } catch (err: any) {
      return { error: err?.message || 'Network error while updating password.' };
    }
  };

  const claimAdminBootstrap = async (secretKey: string) => {
    try {
      const res = await fetch('/api/admin/bootstrap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ secretKey }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { error: data.error || 'Failed to claim bootstrap administrator access.' };
      }
      setIsAdmin(true);
      setAdminUsername(data.username || 'SubForgeAdmin');
      return { message: data.message || 'Bootstrap claimed successfully.' };
    } catch (err: any) {
      return { error: err?.message || 'Network error claiming bootstrap.' };
    }
  };

  const rotateAdminPassword = async (bootstrapSecretKey: string, newPassword: string) => {
    try {
      const res = await fetch('/api/admin/rotate-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ bootstrapSecretKey, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { error: data.error || 'Failed to rotate administrator password.' };
      }
      return { message: data.message || 'Administrator credentials rotated successfully!' };
    } catch (err: any) {
      return { error: err?.message || 'Network error while rotating password.' };
    }
  };

  const isSuspended = profile?.status === 'suspended';

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isAdmin,
        adminUsername,
        isSuspended,
        loading,
        signInWithGoogle,
        signOut,
        adminLogin,
        adminLogout,
        claimAdminBootstrap,
        changeAdminPassword,
        rotateAdminPassword,
        refreshAdminSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
