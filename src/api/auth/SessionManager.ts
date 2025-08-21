// src/api/auth/SessionManager.ts

import React from 'react';
import { supabase } from '../supabase/supabaseClient';
import type { Session } from '@supabase/supabase-js';

interface SessionConfig {
  refreshThreshold: number; // minutes before expiry to refresh
  warningThreshold: number; // minutes before expiry to show warning
  autoRefresh: boolean;
  persistSession: boolean;
  onSessionExpiry?: () => void;
  onSessionWarning?: (timeRemaining: number) => void;
  onSessionRefresh?: (session: Session) => void;
}

interface SessionState {
  isActive: boolean;
  timeUntilExpiry: number | null;
  warningShown: boolean;
  refreshing: boolean;
}

export class SessionManager {
  private config: SessionConfig;
  private state: SessionState;
  private refreshTimer: NodeJS.Timeout | null = null;
  private warningTimer: NodeJS.Timeout | null = null;
  private expiryTimer: NodeJS.Timeout | null = null;
  private currentSession: Session | null = null;

  constructor(config: Partial<SessionConfig> = {}) {
    this.config = {
      refreshThreshold: 15, // 15 minutes
      warningThreshold: 5, // 5 minutes
      autoRefresh: true,
      persistSession: true,
      ...config,
    };

    this.state = {
      isActive: false,
      timeUntilExpiry: null,
      warningShown: false,
      refreshing: false,
    };

    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      // Get initial session
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.error('Session initialization error:', error);
        return;
      }

      if (session) {
        this.setSession(session);
      }

      // Listen for auth state changes
      supabase.auth.onAuthStateChange((event, session) => {
        switch (event) {
          case 'SIGNED_IN':
          case 'TOKEN_REFRESHED':
            if (session) {
              this.setSession(session);
            }
            break;
          case 'SIGNED_OUT':
            this.clearSession();
            break;
          case 'USER_UPDATED':
            if (session) {
              this.setSession(session);
            }
            break;
        }
      });
    } catch (error) {
      console.error('SessionManager initialization failed:', error);
    }
  }

  private setSession(session: Session): void {
    this.currentSession = session;
    this.state.isActive = true;
    this.state.warningShown = false;
    this.state.refreshing = false;

    if (this.config.persistSession) {
      this.persistSessionData(session);
    }

    this.scheduleRefresh(session);
  }

  private clearSession(): void {
    this.currentSession = null;
    this.state.isActive = false;
    this.state.timeUntilExpiry = null;
    this.state.warningShown = false;
    this.state.refreshing = false;

    this.clearTimers();
    this.clearPersistedData();
  }

  private scheduleRefresh(session: Session): void {
    this.clearTimers();

    const expiresAt = session.expires_at;
    if (!expiresAt) return;

    const now = Math.floor(Date.now() / 1000);
    const expiryTime = expiresAt;
    const timeUntilExpiry = expiryTime - now;

    this.state.timeUntilExpiry = timeUntilExpiry;

    // Schedule refresh
    if (this.config.autoRefresh) {
      const refreshTime = Math.max(
        0,
        (timeUntilExpiry - this.config.refreshThreshold * 60) * 1000
      );

      this.refreshTimer = setTimeout(() => {
        this.refreshSession();
      }, refreshTime);
    }

    // Schedule warning
    const warningTime = Math.max(
      0,
      (timeUntilExpiry - this.config.warningThreshold * 60) * 1000
    );

    this.warningTimer = setTimeout(() => {
      this.showExpiryWarning();
    }, warningTime);

    // Schedule expiry
    this.expiryTimer = setTimeout(() => {
      this.handleSessionExpiry();
    }, timeUntilExpiry * 1000);
  }

  private async refreshSession(): Promise<boolean> {
    if (this.state.refreshing) return false;

    try {
      this.state.refreshing = true;

      const { data, error } = await supabase.auth.refreshSession();

      if (error) {
        console.error('Session refresh failed:', error);
        this.handleSessionExpiry();
        return false;
      }

      if (data.session) {
        this.config.onSessionRefresh?.(data.session);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Session refresh error:', error);
      this.handleSessionExpiry();
      return false;
    } finally {
      this.state.refreshing = false;
    }
  }

  private showExpiryWarning(): void {
    if (this.state.warningShown) return;

    this.state.warningShown = true;
    const timeRemaining = this.config.warningThreshold;
    this.config.onSessionWarning?.(timeRemaining);
  }

  private handleSessionExpiry(): void {
    this.clearSession();
    this.config.onSessionExpiry?.();
  }

  private clearTimers(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
    if (this.warningTimer) {
      clearTimeout(this.warningTimer);
      this.warningTimer = null;
    }
    if (this.expiryTimer) {
      clearTimeout(this.expiryTimer);
      this.expiryTimer = null;
    }
  }

  private persistSessionData(session: Session): void {
    try {
      const sessionData = {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at,
        user: session.user,
        timestamp: Date.now(),
      };

      localStorage.setItem('inkstash_session', JSON.stringify(sessionData));
    } catch (error) {
      console.warn('Failed to persist session data:', error);
    }
  }

  private clearPersistedData(): void {
    try {
      localStorage.removeItem('inkstash_session');
    } catch (error) {
      console.warn('Failed to clear persisted session data:', error);
    }
  }

  // Public methods
  public getCurrentSession(): Session | null {
    return this.currentSession;
  }

  public getSessionState(): SessionState {
    return { ...this.state };
  }

  public async extendSession(): Promise<boolean> {
    return await this.refreshSession();
  }

  public async signOut(): Promise<void> {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
      // Force clear local session even if server signout fails
      this.clearSession();
    }
  }

  public isSessionValid(): boolean {
    if (!this.currentSession || !this.state.isActive) return false;

    const now = Math.floor(Date.now() / 1000);
    const expiresAt = this.currentSession.expires_at;

    return expiresAt ? now < expiresAt : false;
  }

  public getTimeUntilExpiry(): number | null {
    if (!this.currentSession || !this.state.isActive) return null;

    const now = Math.floor(Date.now() / 1000);
    const expiresAt = this.currentSession.expires_at;

    return expiresAt ? Math.max(0, expiresAt - now) : null;
  }

  public updateConfig(newConfig: Partial<SessionConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // Reschedule timers if session is active
    if (this.currentSession && this.state.isActive) {
      this.scheduleRefresh(this.currentSession);
    }
  }

  public destroy(): void {
    this.clearTimers();
    this.clearPersistedData();
    this.currentSession = null;
    this.state.isActive = false;
  }
}

// Hook for using SessionManager in React components
export const useSessionManager = (config?: Partial<SessionConfig>) => {
  const [sessionManager] = React.useState(() => new SessionManager(config));
  const [sessionState, setSessionState] = React.useState(
    sessionManager.getSessionState()
  );

  React.useEffect(() => {
    const interval = setInterval(() => {
      setSessionState(sessionManager.getSessionState());
    }, 1000);

    return () => {
      clearInterval(interval);
      sessionManager.destroy();
    };
  }, [sessionManager]);

  return {
    sessionManager,
    sessionState,
    isValid: sessionManager.isSessionValid(),
    timeUntilExpiry: sessionManager.getTimeUntilExpiry(),
    extendSession: () => sessionManager.extendSession(),
    signOut: () => sessionManager.signOut(),
  };
};

// Default instance for global use
export const globalSessionManager = new SessionManager({
  onSessionExpiry: () => {
    // Redirect to login or show modal
    window.location.href = '/login?reason=expired';
  },
  onSessionWarning: timeRemaining => {
    // Show warning toast/modal
    console.warn(`Session expires in ${timeRemaining} minutes`);
  },
  onSessionRefresh: session => {
    console.log('Session refreshed successfully');
  },
});

export default SessionManager;
