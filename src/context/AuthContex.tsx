// src/contexts/AuthContext.tsx

import React, { createContext, useContext } from 'react';
import { useAuth } from '../hooks/useAuth';
import type { Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: any;
  session: Session | null;
  isAuthenticated: boolean;
  loading: boolean;
  initialized: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const auth = useAuth();

  const contextValue: AuthContextType = {
    ...auth,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuthContext = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
