import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../../utils/supabaseClient';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const setData = async (session) => {
      if (session) {
        const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching profile:', error);
          setUser(session.user); // Fallback to user without profile
        } else if (profile) {
          if (profile.avatar_url) {
            const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(profile.avatar_url);
            profile.avatar_url = urlData.publicUrl;
          }
          setUser({ ...session.user, profile });
        } else {
          setUser({ ...session.user, profile: null });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    };

    // Run once on startup
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setData(session);
    });

    // Run on auth state change
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setData(session);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  // Login with email and password
  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    // The onAuthStateChange listener will handle setting user and profile
    return data;
  };

  // Register with email and password
  const register = async (email, password, options = {}) => {
    const { data, error } = await supabase.auth.signUp({ email, password, options });
    if (error) throw error;
    // The onAuthStateChange listener will handle setting user and profile
    return data;
  };

  // Logout
  const logout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
  };

  // Reset password (send email)
  const resetPassword = async (email) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
    return data;
  };

  const value = {
    user,
    session,
    loading,
    login,
    register,
    logout,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
