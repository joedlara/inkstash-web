import { Session } from '@supabase/supabase-js';

export interface NavigationLink {
  label: string;
  to: string;
}

export interface NavBarProps {
  className?: string;
}

export interface NavBarState {
  isOpen: boolean;
  session: Session | null;
  isDarkMode: boolean;
}

export interface ThemeDetectionOptions {
  fallbackToDarkMode?: boolean;
  watchSystemPreference?: boolean;
}
