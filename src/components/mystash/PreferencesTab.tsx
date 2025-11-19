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
  Slider,
  Divider,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
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
  min_price: number;
  max_price: number;
  items_per_page: number;
  default_sort: string;
}

const popularCharacters = [
  'Spider-Man',
  'Batman',
  'Superman',
  'Wonder Woman',
  'Iron Man',
  'Captain America',
  'Wolverine',
  'Deadpool',
  'Hulk',
  'Thor',
  'Black Widow',
  'Flash',
  'Green Lantern',
  'Aquaman',
  'Joker',
  'Harley Quinn',
  'Venom',
  'Doctor Strange',
  'Black Panther',
  'Scarlet Witch',
];

const popularShows = [
  'The Walking Dead',
  'Stranger Things',
  'Game of Thrones',
  'Star Wars',
  'Marvel Cinematic Universe',
  'DC Universe',
  'The Boys',
  'Breaking Bad',
  'Naruto',
  'Dragon Ball',
  'One Piece',
  'Attack on Titan',
  'Pokemon',
  'Yu-Gi-Oh!',
  'My Hero Academia',
  'Demon Slayer',
  'Jujutsu Kaisen',
  'Rick and Morty',
  'The Simpsons',
  'Adventure Time',
];

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
    min_price: 0,
    max_price: 10000,
    items_per_page: 24,
    default_sort: 'newest',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [priceRange, setPriceRange] = useState<number[]>([0, 10000]);

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
          min_price: Number(data.min_price) || 0,
          max_price: Number(data.max_price) || 10000,
          items_per_page: data.items_per_page || 24,
          default_sort: data.default_sort || 'newest',
        });
        setPriceRange([Number(data.min_price) || 0, Number(data.max_price) || 10000]);
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
          min_price: priceRange[0],
          max_price: priceRange[1],
          items_per_page: preferences.items_per_page,
          default_sort: preferences.default_sort,
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

  const handlePriceChange = (event: Event, newValue: number | number[]) => {
    setPriceRange(newValue as number[]);
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
              options={popularCharacters}
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
                  placeholder="Add characters..."
                  helperText="Select or type your favorite characters"
                />
              )}
            />

            {/* Favorite Shows */}
            <Autocomplete
              multiple
              options={popularShows}
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
                  placeholder="Add shows..."
                  helperText="Select or type your favorite shows and franchises"
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

        {/* Price Range Preferences */}
        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            Price Range
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <Box sx={{ px: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Show items within this price range by default
            </Typography>
            <Slider
              value={priceRange}
              onChange={handlePriceChange}
              valueLabelDisplay="on"
              min={0}
              max={10000}
              step={50}
              valueLabelFormat={(value) => `$${value}`}
              sx={{ mt: 4, mb: 2 }}
            />
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2" color="text.secondary">
                ${priceRange[0]}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                ${priceRange[1]}
              </Typography>
            </Stack>
          </Box>
        </Paper>

        {/* Display Preferences */}
        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            Display Preferences
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Items Per Page</InputLabel>
                <Select
                  value={preferences.items_per_page}
                  label="Items Per Page"
                  onChange={(e) =>
                    setPreferences({ ...preferences, items_per_page: Number(e.target.value) })
                  }
                >
                  <MenuItem value={12}>12 items</MenuItem>
                  <MenuItem value={24}>24 items</MenuItem>
                  <MenuItem value={48}>48 items</MenuItem>
                  <MenuItem value={96}>96 items</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Default Sort</InputLabel>
                <Select
                  value={preferences.default_sort}
                  label="Default Sort"
                  onChange={(e) =>
                    setPreferences({ ...preferences, default_sort: e.target.value })
                  }
                >
                  <MenuItem value="newest">Newest First</MenuItem>
                  <MenuItem value="ending_soon">Ending Soon</MenuItem>
                  <MenuItem value="price_low">Price: Low to High</MenuItem>
                  <MenuItem value="price_high">Price: High to Low</MenuItem>
                  <MenuItem value="most_bids">Most Bids</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
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
