// src/pages/Login.tsx - Updated with better validation and Google Auth

import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';

import { supabase } from '../../api/supabase/supabaseClient';
import { useAuth } from '../../hooks/useAuth';

import { FcGoogle } from 'react-icons/fc';
import { IoEye, IoEyeOff } from 'react-icons/io5';
import '../../styles/auth/login.css';

interface LoginError {
  message: string;
  field?: 'emailOrUsername' | 'password' | 'general';
}

const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, initialized } = useAuth();

  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<LoginError | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Get the intended destination from location state
  const from = (location.state as any)?.from?.pathname || '/dashboard';

  // Check if user is already logged in
  useEffect(() => {
    if (initialized && isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [initialized, isAuthenticated, navigate, from]);

  // Check for success messages from signup or email confirmation
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const message = urlParams.get('message');
    if (message === 'registration_success') {
      setSuccess('Account created successfully! Please sign in.');
    } else if (message === 'email_confirmed') {
      setSuccess('Email confirmed! You can now sign in.');
    }
  }, [location.search]);

  const validateInput = (): boolean => {
    if (!emailOrUsername.trim()) {
      setError({
        message: 'Email or username is required',
        field: 'emailOrUsername',
      });
      return false;
    }
    if (!password) {
      setError({ message: 'Password is required', field: 'password' });
      return false;
    }
    setError(null);
    return true;
  };

  const getReadableErrorMessage = (errorMessage: string): string => {
    const errorMap: Record<string, string> = {
      'Invalid login credentials':
        'Invalid email/username or password. Please try again.',
      'Email not confirmed':
        'Please confirm your email address before signing in.',
      'Too many requests': 'Too many login attempts. Please try again later.',
      'User already registered': 'An account with this email already exists.',
      'Username not found':
        'Username not found. Please check your username or try using your email.',
    };

    return errorMap[errorMessage] || errorMessage;
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateInput()) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Check if input is email or username
      const isEmail = emailOrUsername.includes('@');
      let email = emailOrUsername.trim().toLowerCase();

      // If it's a username, we need to get the email from the users table
      if (!isEmail) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('email')
          .eq('username', emailOrUsername.toLowerCase())
          .single();

        if (userError || !userData) {
          setError({
            message:
              'Username not found. Please check your username or try using your email.',
            field: 'emailOrUsername',
          });
          return;
        }
        email = userData.email;
      }

      // Sign in with email
      const { data, error: signInError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (signInError) {
        setError({
          message: getReadableErrorMessage(signInError.message),
          field: signInError.message.includes('credentials')
            ? 'general'
            : 'emailOrUsername',
        });
        return;
      }

      // Success - the useAuth hook will handle the redirect
      if (data.session) {
        console.log('Login successful:', data.user?.id);
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError({
        message: 'An unexpected error occurred. Please try again.',
        field: 'general',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) {
        setError({
          message: getReadableErrorMessage(error.message),
          field: 'general',
        });
      }
    } catch (err: any) {
      console.error('Google login error:', err);
      setError({
        message: 'Failed to sign in with Google. Please try again.',
        field: 'general',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!emailOrUsername.trim()) {
      setError({
        message: 'Please enter your email address or username first',
        field: 'emailOrUsername',
      });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let email = emailOrUsername.trim().toLowerCase();

      // If it's a username, get the email
      if (!emailOrUsername.includes('@')) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('email')
          .eq('username', emailOrUsername.toLowerCase())
          .single();

        if (userError || !userData) {
          setError({
            message:
              'Username not found. Please use your email address for password reset.',
            field: 'emailOrUsername',
          });
          return;
        }
        email = userData.email;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        setError({
          message: getReadableErrorMessage(error.message),
          field: 'general',
        });
      } else {
        setSuccess('Password reset link sent to your email!');
      }
    } catch (err: any) {
      console.error('Password reset error:', err);
      setError({
        message: 'Failed to send reset email. Please try again.',
        field: 'general',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    field: 'emailOrUsername' | 'password',
    value: string
  ) => {
    if (field === 'emailOrUsername') {
      setEmailOrUsername(value);
    } else {
      setPassword(value);
    }

    // Clear field-specific errors when user starts typing
    if (error?.field === field) {
      setError(null);
    }
  };

  // Don't render if already authenticated (prevents flash)
  if (initialized && isAuthenticated) {
    return null;
  }

  return (
    <div className="login-page">
      <div className="login-top-bar" />

      <div className="login-container">
        <div className="login-card">
          <h1>Welcome back</h1>
          <p>Sign in to your InkStash account</p>

          {/* Success Message */}
          {success && <div className="success-message">{success}</div>}

          {/* Google Login Button */}
          <button
            className="google-button"
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            <FcGoogle size={20} style={{ marginRight: 8 }} />
            Sign in with Google
          </button>

          <div className="divider">
            <span>Or</span>
          </div>

          {/* Email/Username Login Form */}
          <form className="login-form" onSubmit={handleEmailLogin}>
            <div className="field-group">
              <input
                type="text"
                placeholder="Email address or username"
                value={emailOrUsername}
                onChange={e =>
                  handleInputChange('emailOrUsername', e.target.value)
                }
                className={`input-field ${error?.field === 'emailOrUsername' ? 'invalid' : ''}`}
                autoComplete="username"
                disabled={loading}
              />
            </div>

            <div className="field-group password-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={e => handleInputChange('password', e.target.value)}
                className={`input-field ${error?.field === 'password' ? 'invalid' : ''}`}
                autoComplete="current-password"
                disabled={loading}
              />
              <button
                type="button"
                className="toggle-button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                disabled={loading}
              >
                {showPassword ? <IoEye size={20} /> : <IoEyeOff size={20} />}
              </button>
            </div>

            {/* Error Message */}
            {error && <div className="form-error">{error.message}</div>}

            <button
              type="submit"
              className="submit-button"
              disabled={loading || !emailOrUsername || !password}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="login-footer">
            <button
              type="button"
              onClick={handleForgotPassword}
              className="forgot-link"
              disabled={loading}
            >
              Forgot your password?
            </button>

            <p className="signup-prompt">
              Don't have an account? <Link to="/signup">Sign up</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
