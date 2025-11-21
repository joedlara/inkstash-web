import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Typography,
  Button,
  Alert,
  CircularProgress,
  InputAdornment,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import { supabase } from '../../api/supabase/supabaseClient';

interface OnboardingUsernameStepProps {
  onNext: (username: string) => void;
  initialUsername?: string;
}

const OnboardingUsernameStep: React.FC<OnboardingUsernameStepProps> = ({
  onNext,
  initialUsername = '',
}) => {
  const [username, setUsername] = useState(initialUsername);
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState<string>('');
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // Username validation regex: 3-20 characters, alphanumeric and underscores only
  const isValidFormat = (value: string): boolean => {
    const regex = /^[a-zA-Z0-9_]{3,20}$/;
    return regex.test(value);
  };

  // Check username availability with debounce
  useEffect(() => {
    const checkAvailability = async () => {
      if (!username) {
        setAvailable(null);
        setError('');
        setSuggestions([]);
        return;
      }

      if (!isValidFormat(username)) {
        setAvailable(false);
        setError('Username must be 3-20 characters, letters, numbers, and underscores only');
        setSuggestions([]);
        return;
      }

      setChecking(true);
      setError('');

      try {
        const { data, error: dbError } = await supabase
          .from('users')
          .select('username')
          .eq('username', username)
          .maybeSingle();

        if (dbError && dbError.code !== 'PGRST116') {
          throw dbError;
        }

        if (data) {
          // Username taken, generate suggestions
          setAvailable(false);
          setError('Username already taken');

          const baseSuggestions = [
            `${username}_${Math.floor(Math.random() * 100)}`,
            `${username}_collector`,
            `the_${username}`,
            `${username}${new Date().getFullYear().toString().slice(-2)}`,
          ];
          setSuggestions(baseSuggestions.slice(0, 3));
        } else {
          // Username available
          setAvailable(true);
          setError('');
          setSuggestions([]);
        }
      } catch (err) {
        console.error('Error checking username:', err);
        setError('Unable to check username availability');
        setAvailable(null);
      } finally {
        setChecking(false);
      }
    };

    // Debounce the check
    const timeoutId = setTimeout(checkAvailability, 500);
    return () => clearTimeout(timeoutId);
  }, [username]);

  const handleContinue = () => {
    if (available && username) {
      onNext(username);
    }
  };


  const getEndAdornment = () => {
    if (checking) {
      return (
        <InputAdornment position="end">
          <CircularProgress size={20} />
        </InputAdornment>
      );
    }
    if (available === true) {
      return (
        <InputAdornment position="end">
          <CheckCircleIcon color="success" />
        </InputAdornment>
      );
    }
    if (available === false && username) {
      return (
        <InputAdornment position="end">
          <ErrorIcon color="error" />
        </InputAdornment>
      );
    }
    return null;
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
        maxWidth: '500px',
        mx: 'auto',
        px: 3,
      }}
    >
      {/* Logo placeholder - replace with actual logo */}
      <Box
        sx={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          bgcolor: 'primary.main',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 3,
        }}
      >
        <Typography variant="h4" color="white" fontWeight="bold">
          IS
        </Typography>
      </Box>

      <Typography variant="h4" fontWeight="bold" gutterBottom align="center">
        Welcome to Inkstash
      </Typography>

      <Typography variant="body1" color="text.secondary" gutterBottom align="center" sx={{ mb: 4 }}>
        Let's create your username
      </Typography>

      <TextField
        fullWidth
        label="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value.toLowerCase())}
        error={!!error}
        helperText={error || 'Choose a unique username for your profile'}
        InputProps={{
          endAdornment: getEndAdornment(),
        }}
        autoFocus
        sx={{ mb: 2 }}
      />

      {available === true && (
        <Alert severity="success" sx={{ width: '100%', mb: 2 }}>
          Great! This username is available
        </Alert>
      )}

      {suggestions.length > 0 && (
        <Box sx={{ width: '100%', mb: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Try these suggestions:
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {suggestions.map((suggestion) => (
              <Button
                key={suggestion}
                variant="outlined"
                size="small"
                onClick={() => setUsername(suggestion)}
              >
                {suggestion}
              </Button>
            ))}
          </Box>
        </Box>
      )}

      <Button
        fullWidth
        variant="contained"
        size="large"
        onClick={handleContinue}
        disabled={!available || checking}
      >
        Confirm Username
      </Button>
    </Box>
  );
};

export default OnboardingUsernameStep;
