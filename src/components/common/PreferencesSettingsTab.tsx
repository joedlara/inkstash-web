import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Stack,
  Alert,
  Switch,
  Divider,
} from '@mui/material';
import {
  ChatBubbleOutline,
  CardGiftcard,
  Visibility,
  Group,
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../api/supabase/supabaseClient';

interface PrivacyPreferences {
  direct_messages: boolean;
  receive_gifts: boolean;
  activity_status: boolean;
  suggest_account: boolean;
}

interface SettingItemProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function SettingItem({ icon, title, description, checked, onChange }: SettingItemProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        py: 2.5,
      }}
    >
      <Stack direction="row" spacing={2} alignItems="center" sx={{ flex: 1 }}>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 2,
            bgcolor: 'action.hover',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'text.secondary',
          }}
        >
          {icon}
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="body1" fontWeight={600}>
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {description}
          </Typography>
        </Box>
      </Stack>
      <Switch
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        color="success"
      />
    </Box>
  );
}

export default function PreferencesSettingsTab() {
  const { user, updateUser } = useAuth();
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [preferences, setPreferences] = useState<PrivacyPreferences>({
    direct_messages: true,
    receive_gifts: false,
    activity_status: true,
    suggest_account: true,
  });

  useEffect(() => {
    loadPreferences();
  }, [user]);

  const loadPreferences = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('privacy_settings')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data?.privacy_settings) {
        setPreferences(data.privacy_settings as PrivacyPreferences);
      }
    } catch (err: any) {
      console.error('Error loading preferences:', err);
    }
  };

  const updatePreference = async (key: keyof PrivacyPreferences, value: boolean) => {
    if (!user) return;

    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);

    try {
      // Check if preferences exist
      const { data: existing } = await supabase
        .from('user_preferences')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('user_preferences')
          .update({ privacy_settings: newPreferences })
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('user_preferences')
          .insert({
            user_id: user.id,
            privacy_settings: newPreferences,
          });

        if (error) throw error;
      }

      setSuccess('Privacy settings updated!');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err: any) {
      console.error('Error updating preferences:', err);
      setError(err.message || 'Failed to update preferences');
      // Revert on error
      setPreferences(preferences);
    }
  };

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}

      <Paper elevation={0} sx={{ p: 4, bgcolor: 'background.paper' }}>
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          Preferences
        </Typography>

        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            Privacy
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Select how you can interact with and be viewed by others.
          </Typography>

          <Divider sx={{ my: 2 }} />

          <Stack divider={<Divider />}>
            <SettingItem
              icon={<ChatBubbleOutline />}
              title="Direct Messages"
              description="Turn this on if you'd like to receive direct messages from Inkstash users."
              checked={preferences.direct_messages}
              onChange={(checked) => updatePreference('direct_messages', checked)}
            />
            <SettingItem
              icon={<CardGiftcard />}
              title="Receive gifts"
              description="Turn this on to be discoverable to receive gift purchases from other Inkstash users."
              checked={preferences.receive_gifts}
              onChange={(checked) => updatePreference('receive_gifts', checked)}
            />
            <SettingItem
              icon={<Group />}
              title="Activity Status"
              description="Turn this on if you'd like to share your activities with your friends."
              checked={preferences.activity_status}
              onChange={(checked) => updatePreference('activity_status', checked)}
            />
            <SettingItem
              icon={<Visibility />}
              title="Suggest account to others"
              description="Inkstash will suggest your account to your contacts."
              checked={preferences.suggest_account}
              onChange={(checked) => updatePreference('suggest_account', checked)}
            />
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
}
