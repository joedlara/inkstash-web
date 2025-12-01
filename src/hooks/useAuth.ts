// src/hooks/useAuth.ts - Singleton version with full compatibility for your dashboard

import { useState, useEffect } from 'react';
import { authManager } from '../api/auth/authManager';

export const useAuth = () => {
  const [authState, setAuthState] = useState(() => authManager.getState());

  useEffect(() => {
    // Subscribe to auth manager
    const unsubscribe = authManager.subscribe(newState => {
      setAuthState(newState);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Return auth state and methods - EXACTLY matching your current dashboard's expectations
  return {
    user: authState.user,
    session: authState.session,
    loading: authState.loading,
    initialized: authState.initialized,
    isAuthenticated: authState.isAuthenticated,
    signOut: async () => {
      await authManager.signOut();
      // Force state update after sign out
      setAuthState(authManager.getState());
    },
    refreshUser: () => authManager.refreshUser(),
    updateProfile: (updates: any) => authManager.updateProfile(updates),
    updatePreferences: (preferences: any) =>
      authManager.updatePreferences(preferences),
    addFavoriteCharacter: (characterName: string) =>
      authManager.addFavoriteCharacter(characterName),
    removeFavoriteCharacter: (characterName: string) =>
      authManager.removeFavoriteCharacter(characterName),
    addXP: (amount: number) => authManager.addXP(amount),
  };
};
