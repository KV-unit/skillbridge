import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { auth, getMyProfile } from '../lib/api.js';
import { isConfigured } from '../lib/supabase.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined while we find out, null when signed out
  const [profile, setProfile] = useState(null);
  const [profileError, setProfileError] = useState('');

  useEffect(() => {
    if (!isConfigured) { setSession(null); return undefined; }
    let alive = true;
    auth.getSession().then((s) => alive && setSession(s)).catch(() => alive && setSession(null));
    const off = auth.onChange((s) => alive && setSession(s));
    return () => { alive = false; off(); };
  }, []);

  const userId = session ? session.user.id : null;
  useEffect(() => {
    if (!userId) { setProfile(null); setProfileError(''); return undefined; }
    let alive = true;
    setProfileError('');
    getMyProfile(userId)
      .then((p) => alive && setProfile(p))
      .catch((e) => alive && setProfileError(e.message));
    return () => { alive = false; };
  }, [userId]);

  const refreshProfile = useCallback(async () => {
    if (!userId) return null;
    const p = await getMyProfile(userId);
    setProfile(p);
    return p;
  }, [userId]);

  const value = useMemo(() => ({
    configured: isConfigured,
    user: session ? session.user : null,
    profile,
    profileError,
    loading: session === undefined || (Boolean(session) && !profile && !profileError),
    isReviewer: Boolean(profile && profile.role === 'reviewer'),
    setProfile,
    refreshProfile,
    signIn: auth.signIn,
    signUp: auth.signUp,
    signOut: auth.signOut,
  }), [session, profile, profileError, refreshProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
