import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Stack,
  Alert,
  Switch,
  FormControlLabel,
  Divider,
} from '@mui/material';
import { Notifications as NotificationsIcon } from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../api/supabase/supabaseClient';

interface NotificationPreferences {
  email_bids: boolean;
  email_outbid: boolean;
  email_won: boolean;
  email_new_items: boolean;
  email_promotions: boolean;
  push_bids: boolean;
  push_outbid: boolean;
  push_won: boolean;
}

export default function NotificationsTab() {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>({
    email_bids: true,
    email_outbid: true,
    email_won: true,
    email_new_items: false,
    email_promotions: false,
    push_bids: true,
    push_outbid: true,
    push_won: true,
  });

  useEffect(() => {
    if (user?.notification_preferences) {
      setNotificationPrefs(user.notification_preferences as NotificationPreferences);
    }
  }, [user]);

  const updatePreference = async (key: keyof NotificationPreferences, value: boolean) => {
    if (!user) return;

    const newPrefs = { ...notificationPrefs, [key]: value };
    setNotificationPrefs(newPrefs);

    try {
      setLoading(true);
      setError('');

      const { error: updateError } = await supabase
        .from('users')
        .update({ notification_preferences: newPrefs })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setSuccess('Notification preferences updated!');
      setTimeout(() => setSuccess(''), 2000);

      if (updateUser) {
        await updateUser();
      }
    } catch (err: any) {
      console.error('Error updating preferences:', err);
      setError(err.message || 'Failed to update preferences');
      // Revert on error
      setNotificationPrefs(notificationPrefs);
    } finally {
      setLoading(false);
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
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1 }}>
          <NotificationsIcon color="primary" />
          <Typography variant="h5" fontWeight="bold">
            Notifications
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          Manage how you receive notifications about your account activity
        </Typography>

        <Stack spacing={4}>
          {/* Email Notifications */}
          <Box>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Email Notifications
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Receive email updates for important activities
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Stack spacing={1.5}>
              <FormControlLabel
                control={
                  <Switch
                    checked={notificationPrefs.email_bids}
                    onChange={(e) => updatePreference('email_bids', e.target.checked)}
                    disabled={loading}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body1" fontWeight={500}>New bids on my items</Typography>
                    <Typography variant="body2" color="text.secondary">Get notified when someone bids on your auctions</Typography>
                  </Box>
                }
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={notificationPrefs.email_outbid}
                    onChange={(e) => updatePreference('email_outbid', e.target.checked)}
                    disabled={loading}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body1" fontWeight={500}>When I'm outbid</Typography>
                    <Typography variant="body2" color="text.secondary">Stay informed when someone outbids you</Typography>
                  </Box>
                }
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={notificationPrefs.email_won}
                    onChange={(e) => updatePreference('email_won', e.target.checked)}
                    disabled={loading}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body1" fontWeight={500}>Auction wins</Typography>
                    <Typography variant="body2" color="text.secondary">Celebrate your winning bids</Typography>
                  </Box>
                }
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={notificationPrefs.email_new_items}
                    onChange={(e) => updatePreference('email_new_items', e.target.checked)}
                    disabled={loading}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body1" fontWeight={500}>New items matching my interests</Typography>
                    <Typography variant="body2" color="text.secondary">Discover collectibles you'll love</Typography>
                  </Box>
                }
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={notificationPrefs.email_promotions}
                    onChange={(e) => updatePreference('email_promotions', e.target.checked)}
                    disabled={loading}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body1" fontWeight={500}>Promotions and updates</Typography>
                    <Typography variant="body2" color="text.secondary">Get the latest news and special offers</Typography>
                  </Box>
                }
              />
            </Stack>
          </Box>

          {/* Push Notifications */}
          <Box>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Push Notifications
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Real-time alerts for time-sensitive activities
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Stack spacing={1.5}>
              <FormControlLabel
                control={
                  <Switch
                    checked={notificationPrefs.push_bids}
                    onChange={(e) => updatePreference('push_bids', e.target.checked)}
                    disabled={loading}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body1" fontWeight={500}>Bid activity</Typography>
                    <Typography variant="body2" color="text.secondary">Instant alerts for bids on your items</Typography>
                  </Box>
                }
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={notificationPrefs.push_outbid}
                    onChange={(e) => updatePreference('push_outbid', e.target.checked)}
                    disabled={loading}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body1" fontWeight={500}>Outbid alerts</Typography>
                    <Typography variant="body2" color="text.secondary">Know immediately when you've been outbid</Typography>
                  </Box>
                }
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={notificationPrefs.push_won}
                    onChange={(e) => updatePreference('push_won', e.target.checked)}
                    disabled={loading}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body1" fontWeight={500}>Auction wins</Typography>
                    <Typography variant="body2" color="text.secondary">Get notified the moment you win</Typography>
                  </Box>
                }
              />
            </Stack>
          </Box>
        </Stack>
      </Paper>
    </Box>
  );
}
