// src/api/auth/authManager.ts - Singleton auth manager

import { supabase } from '../supabase/supabaseClient';
import type { Session, User } from '@supabase/supabase-js';

interface UserData {
  id: string;
  email: string;
  username: string;
  full_name?: string;
  bio?: string;
  avatar_url?: string;
  level?: number;
  xp?: number;
  xpToNext?: number;
  preferences?: {
    favoriteCharacters?: string[];
    collectionFocus?: string[];
    priceRange?: { min: number; max: number };
  };
  onboarding_completed?: boolean;
  onboarding_completed_at?: string;
  created_at?: string;
}

interface AuthState {
  user: UserData | null;
  session: Session | null;
  loading: boolean;
  initialized: boolean;
  isAuthenticated: boolean;
}

type AuthListener = (state: AuthState) => void;

class AuthManager {
  private state: AuthState = {
    user: null,
    session: null,
    loading: true,
    initialized: false,
    isAuthenticated: false,
  };

  private listeners: Set<AuthListener> = new Set();
  private fetchingUser = false;
  private initializePromise: Promise<void> | null = null;

  // Subscribe to auth state changes
  subscribe(listener: AuthListener): () => void {
    this.listeners.add(listener);

    // Immediately call with current state
    listener(this.state);

    // Initialize if not already done
    if (!this.initializePromise) {
      this.initialize();
    }

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  // Get current state
  getState(): AuthState {
    return { ...this.state };
  }

  // Initialize auth (only once)
  async initialize(): Promise<void> {
    if (this.initializePromise) {
      return this.initializePromise;
    }

    this.initializePromise = this.doInitialize();
    return this.initializePromise;
  }

  private async doInitialize(): Promise<void> {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        this.updateState({
          user: null,
          session: null,
          loading: false,
          initialized: true,
          isAuthenticated: false,
        });
        return;
      }

      if (session?.user) {
        await this.loadUserData(session);
      } else {
        this.updateState({
          user: null,
          session: null,
          loading: false,
          initialized: true,
          isAuthenticated: false,
        });
      }

      // Set up auth listener (only once)
      this.setupAuthListener();
    } catch {
      this.updateState({
        user: null,
        session: null,
        loading: false,
        initialized: true,
        isAuthenticated: false,
      });
    }
  }

  private setupAuthListener(): void {
    supabase.auth.onAuthStateChange(async (event, session) => {
      switch (event) {
        case 'SIGNED_IN':
          if (session?.user) {
            await this.loadUserData(session);
          }
          break;
        case 'SIGNED_OUT':
          this.updateState({
            user: null,
            session: null,
            loading: false,
            initialized: true,
            isAuthenticated: false,
          });
          break;
        case 'TOKEN_REFRESHED':
          if (session) {
            this.updateState({
              ...this.state,
              session,
              isAuthenticated: true,
            });
          }
          break;
      }
    });
  }

  private async loadUserData(session: Session): Promise<void> {
    if (this.fetchingUser) {
      return;
    }

    this.fetchingUser = true;

    try {
      const { data, error } = await supabase
        .from('users')
        .select(
          `
          id,
          email,
          username,
          full_name,
          bio,
          avatar_url,
          level,
          xp,
          xp_to_next,
          preferences,
          onboarding_completed,
          onboarding_completed_at,
          created_at
        `
        )
        .eq('id', session.user.id)
        .single();

      let userData: UserData;

      if (error || !data) {
        // User data fetch failed, using fallback
        // Create fallback user data
        userData = {
          id: session.user.id,
          email: session.user.email || 'unknown@example.com',
          username: session.user.user_metadata?.username || 'user',
          full_name: session.user.user_metadata?.full_name,
          level: 1,
          xp: 0,
          xpToNext: 1000,
          preferences: {
            favoriteCharacters: [],
            collectionFocus: [],
            priceRange: { min: 10, max: 500 },
          },
        };
      } else {
        userData = {
          id: data.id,
          email: data.email,
          username: data.username,
          full_name: data.full_name,
          bio: data.bio,
          avatar_url: data.avatar_url,
          level: data.level || 1,
          xp: data.xp || 0,
          xpToNext: data.xp_to_next || 1000,
          preferences: data.preferences || {
            favoriteCharacters: [],
            collectionFocus: [],
            priceRange: { min: 10, max: 500 },
          },
          onboarding_completed: data.onboarding_completed || false,
          onboarding_completed_at: data.onboarding_completed_at,
          created_at: data.created_at,
        };
      }

      this.updateState({
        user: userData,
        session,
        loading: false,
        initialized: true,
        isAuthenticated: true,
      });
    } catch {
      // User data fetch exception
      // Still set as authenticated with basic user data
      const userData: UserData = {
        id: session.user.id,
        email: session.user.email || 'unknown@example.com',
        username: 'user',
        level: 1,
        xp: 0,
        xpToNext: 1000,
      };

      this.updateState({
        user: userData,
        session,
        loading: false,
        initialized: true,
        isAuthenticated: true,
      });
    } finally {
      this.fetchingUser = false;
    }
  }

  private updateState(newState: Partial<AuthState>): void {
    this.state = { ...this.state, ...newState };

    // Notify all listeners
    this.listeners.forEach(listener => {
      try {
        listener(this.state);
      } catch {
        // Listener error
      }
    });
  }

  // Public methods
  async signOut(): Promise<void> {
    await supabase.auth.signOut();
  }

  async refreshUser(): Promise<UserData | null> {
    if (!this.state.session?.user) return null;

    await this.loadUserData(this.state.session);
    return this.state.user;
  }

  getUser(): UserData | null {
    return this.state.user;
  }

  needsOnboarding(): boolean {
    return this.state.isAuthenticated && !this.state.user?.onboarding_completed;
  }

  async updateProfile(updates: Partial<UserData>): Promise<any> {
    if (!this.state.user) {
      throw new Error('No user logged in');
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .update({
          full_name: updates.full_name,
          avatar_url: updates.avatar_url,
        })
        .eq('id', this.state.user.id)
        .select()
        .single();

      if (error) throw error;

      await this.refreshUser();
      return data;
    } catch (error) {
      throw error;
    }
  }

  async updatePreferences(preferences: UserData['preferences']): Promise<any> {
    if (!this.state.user) {
      throw new Error('No user logged in');
    }

    try {
      const { data, error } = await supabase.rpc('update_user_preferences', {
        user_id: this.state.user.id,
        new_preferences: preferences,
      });

      if (error) throw error;

      await this.refreshUser();
      return data;
    } catch (error) {
      throw error;
    }
  }

  async addFavoriteCharacter(characterName: string): Promise<any> {
    if (!this.state.user) {
      throw new Error('No user logged in');
    }

    try {
      const { data, error } = await supabase.rpc('add_favorite_character', {
        user_id: this.state.user.id,
        character_name: characterName,
      });

      if (error) throw error;

      await this.refreshUser();
      return data;
    } catch (error) {
      throw error;
    }
  }

  async removeFavoriteCharacter(characterName: string): Promise<any> {
    if (!this.state.user) {
      throw new Error('No user logged in');
    }

    try {
      const { data, error } = await supabase.rpc('remove_favorite_character', {
        user_id: this.state.user.id,
        character_name: characterName,
      });

      if (error) throw error;

      await this.refreshUser();
      return data;
    } catch (error) {
      throw error;
    }
  }

  async addXP(amount: number): Promise<any> {
    if (!this.state.user) {
      throw new Error('No user logged in');
    }

    try {
      const { data, error } = await supabase.rpc('add_user_xp', {
        user_id: this.state.user.id,
        xp_amount: amount,
      });

      if (error) throw error;

      await this.refreshUser();
      return data;
    } catch (error) {
      throw error;
    }
  }
}

// Create singleton instance
export const authManager = new AuthManager();

export default authManager;
