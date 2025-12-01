import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Stack,
  Alert,
  Chip,
  Autocomplete,
  Divider,
} from '@mui/material';
import {
  Save,
  Settings,
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../api/supabase/supabaseClient'

interface UserPreferences {
  favorite_characters: string[];
  favorite_shows: string[];
  favorite_categories: string[];
}

const categories = [
  'Comics',
  'Trading Cards',
  'Action Figures',
  'Statues',
  'Funko Pops',
  'Vintage Toys',
  'Autographed Items',
  'Original Art',
  'Posters',
  'Props & Replicas',
];

export default function PreferencesTab() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences>({
    favorite_characters: [],
    favorite_shows: [],
    favorite_categories: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPreferences();
  }, [user]);

  const loadPreferences = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const { data, error: fetchError } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (data) {
        setPreferences({
          favorite_characters: data.favorite_characters || [],
          favorite_shows: data.favorite_shows || [],
          favorite_categories: data.favorite_categories || [],
        });
      }
    } catch (err) {
      console.error('Error loading preferences:', err);
      setError('Failed to load preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      const { error: upsertError } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          favorite_characters: preferences.favorite_characters,
          favorite_shows: preferences.favorite_shows,
          favorite_categories: preferences.favorite_categories,
        });

      if (upsertError) throw upsertError;

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving preferences:', err);
      setError('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Preferences
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Customize your InkStash experience
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Preferences saved successfully!
        </Alert>
      )}

      <Stack spacing={3}>
        {/* Collection Preferences */}
        <Paper elevation={2} sx={{ p: 3 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
            <Settings color="primary" />
            <Typography variant="h6" fontWeight="bold">
              Collection Preferences
            </Typography>
          </Stack>
          <Divider sx={{ mb: 3 }} />

          <Stack spacing={3}>
            {/* Favorite Characters */}
            <Autocomplete
              multiple
              options={[]}
              value={preferences.favorite_characters}
              onChange={(_, newValue) =>
                setPreferences({ ...preferences, favorite_characters: newValue })
              }
              freeSolo
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip label={option} {...getTagProps({ index })} color="primary" />
                ))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Favorite Characters"
                  placeholder="Type and press Enter to add..."
                  helperText="Type your favorite characters and press Enter to add"
                />
              )}
            />

            {/* Favorite Shows */}
            <Autocomplete
              multiple
              options={[]}
              value={preferences.favorite_shows}
              onChange={(_, newValue) =>
                setPreferences({ ...preferences, favorite_shows: newValue })
              }
              freeSolo
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip label={option} {...getTagProps({ index })} color="secondary" />
                ))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Favorite Shows/Franchises"
                  placeholder="Type and press Enter to add..."
                  helperText="Type your favorite shows and franchises, press Enter to add"
                />
              )}
            />

            {/* Favorite Categories */}
            <Autocomplete
              multiple
              options={categories}
              value={preferences.favorite_categories}
              onChange={(_, newValue) =>
                setPreferences({ ...preferences, favorite_categories: newValue })
              }
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip label={option} {...getTagProps({ index })} color="success" />
                ))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Favorite Categories"
                  placeholder="Add categories..."
                  helperText="Select categories you're interested in"
                />
              )}
            />
          </Stack>
        </Paper>

        {/* Save Button */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            size="large"
            startIcon={<Save />}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Preferences'}
          </Button>
        </Box>
      </Stack>
    </Box>
  );
}
