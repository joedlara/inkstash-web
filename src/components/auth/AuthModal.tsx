import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  Tabs,
  Tab,
  TextField,
  Button,
  IconButton,
  InputAdornment,
  Alert,
  Link,
  Fade,
} from '@mui/material';
import {
  Close,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';
import { supabase } from '../../api/supabase/supabaseClient';
import { authManager } from '../../api/auth/authManager';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'signup' | 'login';
}

export default function AuthModal({ isOpen, onClose, defaultTab = 'signup' }: AuthModalProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'signup' | 'login'>(defaultTab);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Sync activeTab with defaultTab when it changes
  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/onboarding`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google');
      setLoading(false);
    }
  };



  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate password confirmation
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('Starting signup for:', email);

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      console.log('Signup response:', { data, error });

      if (error) throw error;

      if (data.user) {
        console.log('User created:', data.user.id);

        // Check if email confirmation is required
        if (data.session) {
          // User is confirmed and logged in
          console.log('User has session, waiting for authManager to load user data');

          // Wait for authManager to initialize and load user data
          // This gives the database trigger time to create the user profile
          await new Promise(resolve => setTimeout(resolve, 1000));

          // Refresh user data in authManager
          await authManager.refreshUser();
          console.log('AuthManager refreshed, redirecting to onboarding');

          onClose();
          navigate('/onboarding');
        } else {
          // Email confirmation required
          console.log('Email confirmation required');
          setError('Please check your email to confirm your account before signing in.');
        }
      } else {
        console.log('No user returned from signup');
        setError('Failed to create account. Please try again.');
      }
    } catch (err: any) {
      console.error('Signup error:', err);
      setError(err.message || 'Failed to sign up');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;
      alert('Password reset email sent! Check your inbox.');
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      TransitionComponent={Fade}
      PaperProps={{
        sx: {
          borderRadius: 2,
          p: { xs: 3, sm: 5 },
          maxHeight: '90vh',
        },
      }}
    >
      <IconButton
        onClick={onClose}
        sx={{
          position: 'absolute',
          right: 20,
          top: 20,
          color: 'text.primary',
          '&:hover': {
            bgcolor: 'action.hover',
          },
        }}
      >
        <Close />
      </IconButton>

      <DialogContent sx={{ p: 0 }}>
        <Typography variant="h4" fontWeight={700} mb={3}>
          Join InkStash!
        </Typography>

        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            mb: 4,
            '& .MuiTab-root': {
              textTransform: 'none',
              fontSize: '1.125rem',
              fontWeight: 500,
              color: 'text.disabled',
              '&.Mui-selected': {
                color: 'text.primary',
                fontWeight: 600,
              },
            },
          }}
        >
          <Tab label="Sign up" value="signup" />
          <Tab label="Log in" value="login" />
        </Tabs>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* OAuth Buttons */}
        <Button
          fullWidth
          variant="outlined"
          onClick={handleGoogleSignIn}
          disabled={loading}
          startIcon={
            <svg width="24" height="24" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          }
          sx={{
            py: 1.75,
            mb: 1.5,
            borderColor: 'divider',
            color: 'text.primary',
            fontWeight: 600,
            textTransform: 'none',
            fontSize: '1rem',
            '&:hover': {
              borderColor: 'text.secondary',
              bgcolor: 'action.hover',
            },
          }}
        >
          Continue with Google
        </Button>

        {/* Sign Up Form */}
        {activeTab === 'signup' && (
          <Box component="form" onSubmit={handleEmailSignUp} sx={{ mt: 3 }}>
            <TextField
              fullWidth
              type="email"
              label="Email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              sx={{ mb: 2.5 }}
            />

            <TextField
              fullWidth
              type={showPassword ? 'text' : 'password'}
              label="Password"
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 2.5 }}
            />

            <TextField
              fullWidth
              type={showPassword ? 'text' : 'password'}
              label="Confirm password"
              placeholder="********"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 2.5 }}
            />

            <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, lineHeight: 1.5 }}>
              By continuing, you agree to our{' '}
              <Link href="/terms" target="_blank" color="primary">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/privacy" target="_blank" color="primary">
                Privacy Policy
              </Link>
              .
            </Typography>

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              sx={{
                py: 2,
                fontSize: '1rem',
                fontWeight: 700,
                textTransform: 'none',
              }}
            >
              {loading ? 'Signing up...' : 'Sign up'}
            </Button>
          </Box>
        )}

        {/* Login Form */}
        {activeTab === 'login' && (
          <Box component="form" onSubmit={handleEmailSignIn} sx={{ mt: 3 }}>
            <TextField
              fullWidth
              type="email"
              label="Email or username"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              sx={{ mb: 2.5 }}
            />

            <TextField
              fullWidth
              type={showPassword ? 'text' : 'password'}
              label="Password"
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 2.5 }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              sx={{
                py: 2,
                fontSize: '1rem',
                fontWeight: 700,
                textTransform: 'none',
              }}
            >
              {loading ? 'Logging in...' : 'Log in'}
            </Button>

            <Button
              fullWidth
              onClick={handleForgotPassword}
              disabled={loading}
              sx={{
                mt: 2,
                color: 'primary.main',
                textTransform: 'none',
                '&:hover': {
                  bgcolor: 'action.hover',
                },
              }}
            >
              Forgot your password?
            </Button>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
