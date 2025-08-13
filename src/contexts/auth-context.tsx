'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { authService, Profile } from '@/lib/auth';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isSpotifyPlaying: boolean;
  profileSpotifyPlaying: { isPlaying: boolean; spotifyId: string | null };
  userPlusSubscription: boolean;
  eventPlusSubscription: boolean;
  gymEventPlusSubscription: boolean;
  signUp: (email: string, password: string, userData: Omit<import('@/lib/auth').RegistrationData, 'email' | 'password'>) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  uploadAvatar: (file: File) => Promise<string>;
  refreshProfile: () => Promise<void>;
  toggleSpotifyPlayer: () => void;
  closeSpotifyPlayer: () => void;
  toggleProfileSpotifyPlayer: (spotifyId: string) => void;
  closeProfileSpotifyPlayer: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSpotifyPlaying, setIsSpotifyPlaying] = useState(false);
  const [profileSpotifyPlaying, setProfileSpotifyPlaying] = useState<{ isPlaying: boolean; spotifyId: string | null }>({
    isPlaying: false,
    spotifyId: null,
  });
  const [userPlusSubscription, setUserPlusSubscription] = useState(false);
  const [eventPlusSubscription, setEventPlusSubscription] = useState(false);
  const [gymEventPlusSubscription, setGymEventPlusSubscription] = useState(false);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        const userProfile = await authService.getUserProfile(session.user.id);
        setProfile(userProfile);
      }

      setLoading(false);
    };

    getInitialSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        const userProfile = await authService.getUserProfile(session.user.id);
        setProfile(userProfile);
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Check for user+ and event+ and gym event+ subscriptions
  useEffect(() => {
    const checkSubscriptions = async () => {
      if (!user) {
        setUserPlusSubscription(false);
        setEventPlusSubscription(false);
        setGymEventPlusSubscription(false);
        return;
      }
      try {
        // OPTIMIZED: Single query to get all active subscriptions
        const { data: subscriptions, error } = await supabase.from('subscriptions').select('tier').eq('user_id', user.id).eq('status', 'active');

        if (error) {
          console.error('Error checking subscriptions:', error);
          setUserPlusSubscription(false);
          setEventPlusSubscription(false);
          setGymEventPlusSubscription(false);
          return;
        }

        const tiers = subscriptions?.map((sub) => sub.tier) || [];

        // User+ features: any active subscription (user+ or events+)
        setUserPlusSubscription(tiers.includes('user+') || tiers.includes('events+'));

        // Event+ features: events+ subscription
        setEventPlusSubscription(tiers.includes('events+'));

        // Gym+ features: events+ subscription (same as event+ for now)
        setGymEventPlusSubscription(tiers.includes('events+'));

        // Log subscription status for debugging
        console.log('Subscription check results (optimized):', {
          tiers,
          userPlus: tiers.includes('user+') || tiers.includes('events+'),
          eventPlus: tiers.includes('events+'),
          gymEventPlus: tiers.includes('events+'),
          userId: user.id,
        });
      } catch (error) {
        console.error('Error checking subscriptions:', error);
        // Set all to false on error to prevent access issues
        setUserPlusSubscription(false);
        setEventPlusSubscription(false);
        setGymEventPlusSubscription(false);
      }
    };
    checkSubscriptions();
  }, [user]);

  const signUp = async (email: string, password: string, userData: Omit<import('@/lib/auth').RegistrationData, 'email' | 'password'>) => {
    const { user } = await authService.register({
      email,
      password,
      ...userData,
    });

    if (user) {
      const userProfile = await authService.getUserProfile(user.id);
      setProfile(userProfile);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { user } = await authService.login({ email, password });

    if (user) {
      const userProfile = await authService.getUserProfile(user.id);
      setProfile(userProfile);
    }
  };

  const signOut = async () => {
    await authService.logout();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) throw new Error('No user logged in');

    const updatedProfile = await authService.updateProfile(user.id, updates);
    setProfile(updatedProfile);
  };

  const uploadAvatar = async (file: File): Promise<string> => {
    if (!user) throw new Error('No user logged in');

    const publicUrl = await authService.uploadAvatar(user.id, file);

    // Refresh the profile to get the updated avatar_url (file path)
    const updatedProfile = await authService.getUserProfile(user.id);
    if (updatedProfile) {
      setProfile(updatedProfile);
    }

    return publicUrl;
  };

  const refreshProfile = async () => {
    if (!user) return;

    const updatedProfile = await authService.getUserProfile(user.id);
    if (updatedProfile) {
      setProfile(updatedProfile);
    }
  };

  const toggleSpotifyPlayer = () => {
    if (!profile?.spotify_id) return;
    // Close profile player if it's open
    if (profileSpotifyPlaying.isPlaying) {
      setProfileSpotifyPlaying({ isPlaying: false, spotifyId: null });
    }
    setIsSpotifyPlaying(!isSpotifyPlaying);
  };

  const closeSpotifyPlayer = () => {
    setIsSpotifyPlaying(false);
  };

  const toggleProfileSpotifyPlayer = (spotifyId: string) => {
    // Close sidebar player if it's open
    if (isSpotifyPlaying) {
      setIsSpotifyPlaying(false);
    }

    // Toggle profile player
    if (profileSpotifyPlaying.isPlaying && profileSpotifyPlaying.spotifyId === spotifyId) {
      setProfileSpotifyPlaying({ isPlaying: false, spotifyId: null });
    } else {
      setProfileSpotifyPlaying({ isPlaying: true, spotifyId });
    }
  };

  const closeProfileSpotifyPlayer = () => {
    setProfileSpotifyPlaying({ isPlaying: false, spotifyId: null });
  };

  const value: AuthContextType = {
    user,
    session,
    profile,
    loading,
    isSpotifyPlaying,
    profileSpotifyPlaying,
    userPlusSubscription,
    eventPlusSubscription,
    gymEventPlusSubscription,
    signUp,
    signIn,
    signOut,
    updateProfile,
    uploadAvatar,
    refreshProfile,
    toggleSpotifyPlayer,
    closeSpotifyPlayer,
    toggleProfileSpotifyPlayer,
    closeProfileSpotifyPlayer,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
