import { useState, useEffect } from 'react';
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

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'signup' | 'login';
}

export default function AuthModal({ isOpen, onClose, defaultTab = 'signup' }: AuthModalProps) {
  const [activeTab, setActiveTab] = useState<'signup' | 'login'>(defaultTab);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

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
          redirectTo: `${window.location.origin}/`,
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
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        // Create user profile in users table
        const { error: profileError } = await supabase
          .from('users')
          .insert([
            {
              id: data.user.id,
              email: email,
              username: email.split('@')[0],
              full_name: fullName,
              level: 1,
              xp: 0,
              xp_to_next: 1000,
            },
          ]);

        if (profileError) {
          // Profile creation error
        }

        onClose();
      }
    } catch (err: any) {
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
          borderRadius: 4,
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
              label="Full name"
              placeholder="First and last name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              sx={{ mb: 2.5 }}
            />

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
