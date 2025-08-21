// src/utils/auth.ts

import { supabase } from '../api/supabase/supabaseClient';
import type { Session } from '@supabase/supabase-js';

export interface AuthError {
  message: string;
  status?: number;
  details?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignUpData {
  email: string;
  password: string;
  username: string;
  fullName?: string;
}

export interface PasswordResetData {
  email: string;
}

export interface UpdatePasswordData {
  password: string;
  confirmPassword: string;
}

/**
 * Authentication utility functions
 */
export class AuthUtils {
  /**
   * Validate email format
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate password strength
   */
  static validatePassword(password: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate username format
   */
  static isValidUsername(username: string): {
    isValid: boolean;
    error?: string;
  } {
    if (username.length < 3) {
      return {
        isValid: false,
        error: 'Username must be at least 3 characters long',
      };
    }

    if (username.length > 20) {
      return {
        isValid: false,
        error: 'Username must be no more than 20 characters long',
      };
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      return {
        isValid: false,
        error:
          'Username can only contain letters, numbers, hyphens, and underscores',
      };
    }

    if (/^[_-]/.test(username) || /[_-]$/.test(username)) {
      return {
        isValid: false,
        error: 'Username cannot start or end with hyphens or underscores',
      };
    }

    return { isValid: true };
  }

  /**
   * Sign in with email and password
   */
  static async signIn(
    credentials: LoginCredentials
  ): Promise<{ data: any; error: AuthError | null }> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email.trim().toLowerCase(),
        password: credentials.password,
      });

      if (error) {
        return {
          data: null,
          error: {
            message: AuthUtils.getReadableErrorMessage(error.message),
            status: error.status,
            details: error.message,
          },
        };
      }

      return { data, error: null };
    } catch (err) {
      return {
        data: null,
        error: {
          message: 'An unexpected error occurred during sign in',
          details: err instanceof Error ? err.message : 'Unknown error',
        },
      };
    }
  }

  /**
   * Sign up with email, password, and additional data
   */
  static async signUp(
    signUpData: SignUpData
  ): Promise<{ data: any; error: AuthError | null }> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: signUpData.email.trim().toLowerCase(),
        password: signUpData.password,
        options: {
          data: {
            username: signUpData.username,
            full_name: signUpData.fullName,
          },
        },
      });

      if (error) {
        return {
          data: null,
          error: {
            message: AuthUtils.getReadableErrorMessage(error.message),
            status: error.status,
            details: error.message,
          },
        };
      }

      return { data, error: null };
    } catch (err) {
      return {
        data: null,
        error: {
          message: 'An unexpected error occurred during sign up',
          details: err instanceof Error ? err.message : 'Unknown error',
        },
      };
    }
  }

  /**
   * Sign out current user
   */
  static async signOut(): Promise<{ error: AuthError | null }> {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        return {
          error: {
            message: 'Failed to sign out',
            details: error.message,
          },
        };
      }

      return { error: null };
    } catch (err) {
      return {
        error: {
          message: 'An unexpected error occurred during sign out',
          details: err instanceof Error ? err.message : 'Unknown error',
        },
      };
    }
  }

  /**
   * Send password reset email
   */
  static async resetPassword(
    resetData: PasswordResetData
  ): Promise<{ error: AuthError | null }> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        resetData.email.trim().toLowerCase(),
        {
          redirectTo: `${window.location.origin}/reset-password`,
        }
      );

      if (error) {
        return {
          error: {
            message: AuthUtils.getReadableErrorMessage(error.message),
            details: error.message,
          },
        };
      }

      return { error: null };
    } catch (err) {
      return {
        error: {
          message: 'Failed to send password reset email',
          details: err instanceof Error ? err.message : 'Unknown error',
        },
      };
    }
  }

  /**
   * Update user password
   */
  static async updatePassword(
    passwordData: UpdatePasswordData
  ): Promise<{ error: AuthError | null }> {
    if (passwordData.password !== passwordData.confirmPassword) {
      return {
        error: {
          message: 'Passwords do not match',
        },
      };
    }

    const validation = AuthUtils.validatePassword(passwordData.password);
    if (!validation.isValid) {
      return {
        error: {
          message: validation.errors.join(', '),
        },
      };
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.password,
      });

      if (error) {
        return {
          error: {
            message: AuthUtils.getReadableErrorMessage(error.message),
            details: error.message,
          },
        };
      }

      return { error: null };
    } catch (err) {
      return {
        error: {
          message: 'Failed to update password',
          details: err instanceof Error ? err.message : 'Unknown error',
        },
      };
    }
  }

  /**
   * Check if username is available
   */
  static async isUsernameAvailable(username: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('username')
        .eq('username', username.toLowerCase())
        .maybeSingle();

      if (error) {
        console.error('Error checking username availability:', error);
        return false;
      }

      return !data; // Available if no user found
    } catch (err) {
      console.error('Username availability check failed:', err);
      return false;
    }
  }

  /**
   * Get current session
   */
  static async getCurrentSession(): Promise<Session | null> {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.error('Error getting session:', error);
        return null;
      }

      return session;
    } catch (err) {
      console.error('Session retrieval failed:', err);
      return null;
    }
  }

  /**
   * Refresh current session
   */
  static async refreshSession(): Promise<{
    session: Session | null;
    error: AuthError | null;
  }> {
    try {
      const { data, error } = await supabase.auth.refreshSession();

      if (error) {
        return {
          session: null,
          error: {
            message: 'Failed to refresh session',
            details: error.message,
          },
        };
      }

      return { session: data.session, error: null };
    } catch (err) {
      return {
        session: null,
        error: {
          message: 'Session refresh failed',
          details: err instanceof Error ? err.message : 'Unknown error',
        },
      };
    }
  }

  /**
   * Convert Supabase error messages to user-friendly messages
   */
  static getReadableErrorMessage(errorMessage: string): string {
    const errorMap: Record<string, string> = {
      'Invalid login credentials':
        'Invalid email or password. Please try again.',
      'Email not confirmed':
        'Please confirm your email address before signing in.',
      'Too many requests': 'Too many attempts. Please try again later.',
      'User already registered': 'An account with this email already exists.',
      'Password should be at least 6 characters':
        'Password must be at least 6 characters long.',
      'Signup requires a valid password': 'Please enter a valid password.',
      'Unable to validate email address: invalid format':
        'Please enter a valid email address.',
      'Email address not authorized':
        'This email address is not authorized to sign up.',
      'Token has expired or is invalid':
        'This link has expired. Please request a new one.',
    };

    // Check for exact matches first
    if (errorMap[errorMessage]) {
      return errorMap[errorMessage];
    }

    // Check for partial matches
    for (const [key, value] of Object.entries(errorMap)) {
      if (errorMessage.includes(key)) {
        return value;
      }
    }

    // Return the original message if no match found
    return errorMessage;
  }

  /**
   * Format validation errors for display
   */
  static formatValidationErrors(errors: string[]): string {
    if (errors.length === 0) return '';
    if (errors.length === 1) return errors[0];

    const lastError = errors.pop();
    return `${errors.join(', ')} and ${lastError}`;
  }

  /**
   * Check if user has completed onboarding
   */
  static async hasCompletedOnboarding(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('onboarding_completed')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error checking onboarding status:', error);
        return false;
      }

      return data?.onboarding_completed || false;
    } catch (err) {
      console.error('Onboarding check failed:', err);
      return false;
    }
  }

  /**
   * Generate secure random password
   */
  static generateSecurePassword(length: number = 12): string {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';

    const allChars = lowercase + uppercase + numbers + symbols;
    let password = '';

    // Ensure at least one character from each category
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];

    // Fill the rest randomly
    for (let i = 4; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Shuffle the password
    return password
      .split('')
      .sort(() => Math.random() - 0.5)
      .join('');
  }
}

export default AuthUtils;
