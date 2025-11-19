import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Stack,
  Alert,
  Avatar,
  Card,
  CardContent,
} from '@mui/material';
import {
  Save,
  PhotoCamera,
  Email,
  Verified,
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../api/supabase/supabaseClient';

export default function ProfileTab() {
  const { user, updateUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setUsername(user.username || '');
      setEmail(user.email || '');
      setBio(user.bio || '');
      setAvatarUrl(user.avatar_url || '');
    }
  }, [user]);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    try {
      setUploading(true);
      setError('');

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `avatars/${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('user-uploads')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('user-uploads')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      setSuccess('Avatar updated successfully!');
      setTimeout(() => setSuccess(''), 3000);

      if (updateUser) {
        await updateUser();
      }
    } catch (err: any) {
      console.error('Error uploading avatar:', err);

      // Provide user-friendly error messages
      let errorMessage = 'Failed to upload avatar';
      if (err.message?.includes('row-level security')) {
        errorMessage = 'Upload permission denied. Please contact support if this issue persists.';
      } else if (err.message?.includes('violates row-level security policy')) {
        errorMessage = 'Upload permission denied. Please contact support if this issue persists.';
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const { error: updateError } = await supabase
        .from('users')
        .update({
          username,
          bio,
        })
        .eq('id', user.id);

      if (updateError) {
        // Check if it's a duplicate username error
        if (updateError.code === '23505' && updateError.message.includes('users_username_key')) {
          throw new Error('This username is already taken. Please choose a different username.');
        }
        throw updateError;
      }

      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(''), 3000);

      if (updateUser) {
        await updateUser();
      }
    } catch (err: any) {
      console.error('Error updating profile:', err);
      setError(err.message || 'Failed to update profile');
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
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          Profile
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          Update your profile information and manage your public presence
        </Typography>

        <Stack spacing={4}>
          {/* Avatar Upload */}
          <Box>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              Profile Photo
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mt: 2 }}>
              <Avatar
                src={avatarUrl}
                sx={{
                  width: 80,
                  height: 80,
                  fontSize: 32,
                  bgcolor: 'primary.main',
                }}
              >
                {username?.charAt(0).toUpperCase() || 'U'}
              </Avatar>
              <Box>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
                <Button
                  variant="outlined"
                  startIcon={<PhotoCamera />}
                  onClick={handleAvatarClick}
                  disabled={uploading}
                  size="small"
                >
                  {uploading ? 'Uploading...' : 'Change Photo'}
                </Button>
                <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>
                  JPG, PNG or GIF. Max size 5MB.
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Username */}
          <Box>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              Username
            </Typography>
            <TextField
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              fullWidth
              placeholder="Enter your username"
              size="small"
            />
          </Box>

          {/* Email (Read-only) */}
          <Box>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              Email Address
            </Typography>
            <TextField
              value={email}
              disabled
              fullWidth
              size="small"
              helperText="Contact support to change your email"
              InputProps={{
                startAdornment: <Email sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />,
              }}
            />
          </Box>

          {/* Bio */}
          <Box>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              Bio
            </Typography>
            <TextField
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              multiline
              rows={4}
              fullWidth
              placeholder="Tell us about yourself and your collection interests"
              size="small"
            />
          </Box>

          {/* Seller Verification Status */}
          {user?.seller_verified && (
            <Card variant="outlined" sx={{ bgcolor: 'success.light', borderColor: 'success.main' }}>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Verified color="success" />
                  <Typography variant="body1" fontWeight={600}>
                    Verified Seller
                  </Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Your seller account is verified. You can list items for sale.
                </Typography>
              </CardContent>
            </Card>
          )}

          <Box>
            <Button
              variant="contained"
              startIcon={<Save />}
              onClick={handleSaveProfile}
              disabled={loading}
              size="large"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </Box>
        </Stack>
      </Paper>
    </Box>
  );
}
