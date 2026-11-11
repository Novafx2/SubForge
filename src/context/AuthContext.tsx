import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider, facebookProvider } from '../lib/firebase';
import { UserProfile, UserRoleType } from '../types/auth';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  isAdmin: boolean;
  adminUsername: string | null;
  isSuspended: boolean;
  loading: boolean;
  signInWithGoogle: () => Promise<{ error?: string }>;
  signInWithFacebook: () => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  adminLogin: (username: string, password: string) => Promise<{ error?: string }>;
  adminLogout: () => Promise<void>;
  claimAdminBootstrap: (secretKey: string) => Promise<{ error?: string; message?: string }>;
  changeAdminPassword: (
    currentPassword: string,
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
  signInWithFacebook: async () => ({}),
  signOut: async () => {},
  adminLogin: async () => ({}),
  adminLogout: async () => {},
  claimAdminBootstrap: async () => ({}),
  changeAdminPassword: async () => ({}),
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
    try {
      const userRef = doc(db, 'users', fbUser.uid);
      const snap = await getDoc(userRef);

      const providerId =
        fbUser.providerData?.[0]?.providerId === 'facebook.com'
          ? 'Facebook'
          : 'Google';

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
        await setDoc(userRef, {
          ...newProfile,
          createdAtServer: serverTimestamp(),
          lastLoginAtServer: serverTimestamp(),
        });
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
        setProfile(updatedProfile);
      }
    } catch {
      // Fallback profile if Firestore rules/network pending
      setProfile({
        id: fbUser.uid,
        email: fbUser.email || '',
        username: fbUser.displayName || 'User',
        fullName: fbUser.displayName || 'User',
        avatarUrl: fbUser.photoURL || null,
        provider:
          fbUser.providerData?.[0]?.providerId === 'facebook.com'
            ? 'Facebook'
            : 'Google',
        status: 'active',
        role: 'user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  }, []);

  useEffect(() => {
    refreshAdminSession();

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
      if (code === 'auth/operation-not-allowed') {
        return {
          error:
            'Google Sign-In is not enabled yet in Firebase Console. Please enable Google under Authentication → Sign-in method.',
        };
      }
      return { error: err?.message || 'Google sign-in failed.' };
    }
  };

  const signInWithFacebook = async () => {
    try {
      const result = await signInWithPopup(auth, facebookProvider);
      if (result.user) {
        await syncUserToFirestore(result.user);
      }
      return {};
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/popup-closed-by-user') {
        return { error: 'Facebook sign-in was cancelled.' };
      }
      if (code === 'auth/operation-not-allowed') {
        return {
          error:
            'Facebook Sign-In is not enabled yet in Firebase Console. Please enable Facebook under Authentication → Sign-in method with your Facebook App ID and App Secret.',
        };
      }
      return { error: err?.message || 'Facebook sign-in failed.' };
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
        signInWithFacebook,
        signOut,
        adminLogin,
        adminLogout,
        claimAdminBootstrap,
        changeAdminPassword,
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
