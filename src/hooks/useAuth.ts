// src/hooks/useAuth.ts - MINIMAL VERSION TO FIX INITIALIZATION

import { useState, useEffect, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../api/supabase/supabaseClient';

interface UserData {
  id: string;
  email: string;
  username: string;
  full_name?: string;
  avatar_url?: string;
  level?: number;
  xp?: number;
  xpToNext?: number;
  preferences?: {
    favoriteCharacters?: string[];
    collectionFocus?: string[];
    priceRange?: { min: number; max: number };
  };
  created_at?: string;
}

interface AuthState {
  user: UserData | null;
  session: Session | null;
  loading: boolean;
  initialized: boolean;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    initialized: false,
  });

  console.log('🔍 useAuth - Current state:', {
    loading: authState.loading,
    initialized: authState.initialized,
    isAuthenticated: !!authState.session,
    hasUser: !!authState.user,
    userId: authState.user?.id,
  });

  const fetchUserData = useCallback(
    async (userId: string): Promise<UserData | null> => {
      console.log('📊 fetchUserData - Starting for:', userId);

      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();

        if (data) {
          console.log('✅ fetchUserData - Success');
          return {
            id: data.id,
            email: data.email,
            username: data.username,
            full_name: data.full_name,
            avatar_url: data.avatar_url,
            level: data.level || 1,
            xp: data.xp || 0,
            xpToNext: data.xp_to_next || 1000,
            preferences: data.preferences || {
              favoriteCharacters: [],
              collectionFocus: [],
              priceRange: { min: 10, max: 500 },
            },
            created_at: data.created_at,
          };
        }

        return null;
      } catch (error) {
        console.error('💥 fetchUserData - Exception:', error);
        // Return basic user object as fallback
        return {
          id: userId,
          email: 'unknown@example.com',
          username: 'user',
          level: 1,
          xp: 0,
          xpToNext: 1000,
        };
      }
    },
    []
  );

  // Simplified auth initialization
  useEffect(() => {
    let mounted = true;
    console.log('🚀 useAuth - Starting initialization');

    const initAuth = async () => {
      try {
        console.log('🔍 Getting session...');
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error('❌ Session error:', error);
          if (mounted) {
            setAuthState({
              user: null,
              session: null,
              loading: false,
              initialized: true,
            });
          }
          return;
        }

        console.log('📝 Session result:', {
          hasSession: !!session,
          userId: session?.user?.id,
        });

        if (session?.user && mounted) {
          console.log('👤 Fetching user data...');
          const userData = await fetchUserData(session.user.id);

          if (mounted) {
            console.log('✅ Setting authenticated state');
            setAuthState({
              user: userData,
              session,
              loading: false,
              initialized: true,
            });
          }
        } else if (mounted) {
          console.log('🚫 No session, setting unauthenticated state');
          setAuthState({
            user: null,
            session: null,
            loading: false,
            initialized: true,
          });
        }
      } catch (error) {
        console.error('💥 Init error:', error);
        if (mounted) {
          setAuthState({
            user: null,
            session: null,
            loading: false,
            initialized: true,
          });
        }
      }
    };

    // Add a small delay to ensure everything is ready
    const timer = setTimeout(initAuth, 100);

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔔 Auth change:', event, { hasSession: !!session });

      if (!mounted) return;

      if (event === 'SIGNED_IN' && session?.user) {
        const userData = await fetchUserData(session.user.id);
        setAuthState({
          user: userData,
          session,
          loading: false,
          initialized: true,
        });
      } else if (event === 'SIGNED_OUT') {
        setAuthState({
          user: null,
          session: null,
          loading: false,
          initialized: true,
        });
      }
    });

    return () => {
      mounted = false;
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, [fetchUserData]);

  // Force initialization after 3 seconds if still loading
  useEffect(() => {
    if (!authState.initialized && authState.loading) {
      const forceInit = setTimeout(() => {
        console.log('⚠️ Force initializing after timeout');
        setAuthState(prev => ({
          ...prev,
          loading: false,
          initialized: true,
        }));
      }, 3000);

      return () => clearTimeout(forceInit);
    }
  }, [authState.initialized, authState.loading]);

  const refreshUser = useCallback(async () => {
    if (!authState.session?.user) return null;

    const userData = await fetchUserData(authState.session.user.id);
    setAuthState(prev => ({ ...prev, user: userData }));
    return userData;
  }, [authState.session, fetchUserData]);

  const signOut = useCallback(async () => {
    console.log('🚪 Signing out...');
    await supabase.auth.signOut();
  }, []);

  // Mock functions for now
  const updateProfile = useCallback(async () => {}, []);
  const updatePreferences = useCallback(async () => {}, []);
  const addFavoriteCharacter = useCallback(async () => {}, []);
  const removeFavoriteCharacter = useCallback(async () => {}, []);
  const addXP = useCallback(async () => {}, []);

  return {
    user: authState.user,
    session: authState.session,
    loading: authState.loading,
    initialized: authState.initialized,
    isAuthenticated: !!authState.session,
    refreshUser,
    updateProfile,
    updatePreferences,
    addFavoriteCharacter,
    removeFavoriteCharacter,
    addXP,
    signOut,
  };
};
