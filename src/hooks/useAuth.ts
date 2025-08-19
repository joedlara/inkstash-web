// src/hooks/useAuth.ts - Updated for new database structure
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

  const fetchUserData = useCallback(
    async (userId: string): Promise<UserData | null> => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select(
            `
          id,
          email,
          username,
          full_name,
          avatar_url,
          level,
          xp,
          xp_to_next,
          preferences,
          created_at
        `
          )
          .eq('id', userId)
          .single();

        if (error) {
          console.error('Error fetching user data:', error);
          return null;
        }

        if (data) {
          // Transform the data to match our interface
          const userData: UserData = {
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

          return userData;
        }

        return null;
      } catch (error) {
        console.error('Error in fetchUserData:', error);
        return null;
      }
    },
    []
  );

  const updateAuthState = useCallback(
    async (session: Session | null) => {
      if (session?.user) {
        const userData = await fetchUserData(session.user.id);
        setAuthState({
          user: userData,
          session,
          loading: false,
          initialized: true,
        });
      } else {
        setAuthState({
          user: null,
          session: null,
          loading: false,
          initialized: true,
        });
      }
    },
    [fetchUserData]
  );

  const refreshUser = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user) {
      const userData = await fetchUserData(session.user.id);
      setAuthState(prev => ({
        ...prev,
        user: userData,
      }));
      return userData;
    }
    return null;
  }, [fetchUserData]);

  const updateProfile = useCallback(
    async (updates: Partial<UserData>) => {
      if (!authState.user) {
        throw new Error('No user logged in');
      }

      try {
        const { data, error } = await supabase
          .from('users')
          .update({
            full_name: updates.full_name,
            avatar_url: updates.avatar_url,
            // Don't allow direct updates to level, xp, xp_to_next via this function
          })
          .eq('id', authState.user.id)
          .select()
          .single();

        if (error) throw error;

        // Refresh user data
        await refreshUser();
        return data;
      } catch (error) {
        console.error('Error updating profile:', error);
        throw error;
      }
    },
    [authState.user, refreshUser]
  );

  const updatePreferences = useCallback(
    async (preferences: UserData['preferences']) => {
      if (!authState.user) {
        throw new Error('No user logged in');
      }

      try {
        const { data, error } = await supabase.rpc('update_user_preferences', {
          user_id: authState.user.id,
          new_preferences: preferences,
        });

        if (error) throw error;

        // Refresh user data
        await refreshUser();
        return data;
      } catch (error) {
        console.error('Error updating preferences:', error);
        throw error;
      }
    },
    [authState.user, refreshUser]
  );

  const addFavoriteCharacter = useCallback(
    async (characterName: string) => {
      if (!authState.user) {
        throw new Error('No user logged in');
      }

      try {
        const { data, error } = await supabase.rpc('add_favorite_character', {
          user_id: authState.user.id,
          character_name: characterName,
        });

        if (error) throw error;

        // Refresh user data
        await refreshUser();
        return data;
      } catch (error) {
        console.error('Error adding favorite character:', error);
        throw error;
      }
    },
    [authState.user, refreshUser]
  );

  const removeFavoriteCharacter = useCallback(
    async (characterName: string) => {
      if (!authState.user) {
        throw new Error('No user logged in');
      }

      try {
        const { data, error } = await supabase.rpc(
          'remove_favorite_character',
          {
            user_id: authState.user.id,
            character_name: characterName,
          }
        );

        if (error) throw error;

        // Refresh user data
        await refreshUser();
        return data;
      } catch (error) {
        console.error('Error removing favorite character:', error);
        throw error;
      }
    },
    [authState.user, refreshUser]
  );

  const addXP = useCallback(
    async (amount: number) => {
      if (!authState.user) {
        throw new Error('No user logged in');
      }

      try {
        const { data, error } = await supabase.rpc('add_user_xp', {
          user_id: authState.user.id,
          xp_amount: amount,
        });

        if (error) throw error;

        // Refresh user data to get updated level/xp
        await refreshUser();

        // Return true if user leveled up
        return data;
      } catch (error) {
        console.error('Error adding XP:', error);
        throw error;
      }
    },
    [authState.user, refreshUser]
  );

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Get initial session
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error('Error getting session:', error);
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

        if (mounted) {
          await updateAuthState(session);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
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

    initializeAuth();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.id);

      if (mounted) {
        // Add a small delay to ensure database operations complete
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setTimeout(() => {
            if (mounted) {
              updateAuthState(session);
            }
          }, 100);
        } else {
          await updateAuthState(session);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [updateAuthState]);

  return {
    user: authState.user,
    session: authState.session,
    loading: authState.loading,
    initialized: authState.initialized,
    refreshUser,
    updateProfile,
    updatePreferences,
    addFavoriteCharacter,
    removeFavoriteCharacter,
    addXP,
    signOut,
    isAuthenticated: !!authState.session,
  };
};
