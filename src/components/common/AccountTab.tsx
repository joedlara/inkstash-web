import { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Stack,
  Alert,
  TextField,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Card,
  CardContent,
} from '@mui/material';
import {
  ChevronRight,
  Email,
  Lock,
  DeleteOutline,
  VerifiedUser,
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../api/supabase/supabaseClient';

export default function AccountTab() {
  const { user } = useAuth();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleChangePassword = async () => {
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      setLoading(true);

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      setSuccess('Password changed successfully!');
      setNewPassword('');
      setConfirmPassword('');
      setShowChangePassword(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Error changing password:', err);
      setError(err.message || 'Failed to change password');
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
          Account
        </Typography>

        {/* Buyer Settings Section */}
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            Buyer Settings
          </Typography>

          <Stack spacing={2} sx={{ mt: 3 }}>
            <Card variant="outlined">
              <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 2,
                      bgcolor: 'action.hover',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <VerifiedUser color="primary" />
                  </Box>
                  <Box>
                    <Typography variant="body1" fontWeight={600}>
                      Verified Buyer Status
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Once verified you will be able to bid in any stream.
                    </Typography>
                  </Box>
                </Stack>
                <Button
                  variant="contained"
                  size="small"
                  sx={{
                    bgcolor: 'black',
                    '&:hover': { bgcolor: 'grey.900' },
                  }}
                >
                  Verify With Photo ID
                </Button>
              </CardContent>
            </Card>
          </Stack>
        </Box>

        <Divider sx={{ my: 4 }} />

        {/* Account Management Section */}
        <Box>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            Account Management
          </Typography>

          <Stack spacing={1} sx={{ mt: 3 }}>
            {/* Change Email */}
            <Button
              fullWidth
              sx={{
                justifyContent: 'space-between',
                py: 2,
                px: 2,
                textTransform: 'none',
                color: 'text.primary',
                bgcolor: 'transparent',
                '&:hover': { bgcolor: 'action.hover' },
              }}
              endIcon={<ChevronRight />}
            >
              <Stack direction="row" spacing={2} alignItems="center">
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 2,
                    bgcolor: 'action.hover',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Email fontSize="small" />
                </Box>
                <Typography variant="body1" fontWeight={500}>
                  Change Email
                </Typography>
              </Stack>
            </Button>

            <Divider />

            {/* Change Password */}
            <Button
              fullWidth
              sx={{
                justifyContent: 'space-between',
                py: 2,
                px: 2,
                textTransform: 'none',
                color: 'text.primary',
                bgcolor: 'transparent',
                '&:hover': { bgcolor: 'action.hover' },
              }}
              endIcon={<ChevronRight />}
              onClick={() => setShowChangePassword(true)}
            >
              <Stack direction="row" spacing={2} alignItems="center">
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 2,
                    bgcolor: 'action.hover',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Lock fontSize="small" />
                </Box>
                <Typography variant="body1" fontWeight={500}>
                  Change Password
                </Typography>
              </Stack>
            </Button>

            <Divider />

            {/* Delete Account */}
            <Button
              fullWidth
              sx={{
                justifyContent: 'space-between',
                py: 2,
                px: 2,
                textTransform: 'none',
                color: 'error.main',
                bgcolor: 'transparent',
                '&:hover': { bgcolor: 'error.lighter' },
              }}
              endIcon={<ChevronRight />}
              onClick={() => setShowDeleteDialog(true)}
            >
              <Stack direction="row" spacing={2} alignItems="center">
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 2,
                    bgcolor: 'error.lighter',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <DeleteOutline fontSize="small" />
                </Box>
                <Typography variant="body1" fontWeight={500}>
                  Delete Account
                </Typography>
              </Stack>
            </Button>
          </Stack>
        </Box>
      </Paper>

      {/* Change Password Dialog */}
      <Dialog
        open={showChangePassword}
        onClose={() => setShowChangePassword(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Change Password</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <TextField
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              fullWidth
            />
            <TextField
              label="Confirm New Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowChangePassword(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleChangePassword}
            disabled={loading || !newPassword || !confirmPassword}
          >
            Change Password
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Account Dialog */}
      <Dialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        maxWidth="sm"
      >
        <DialogTitle>Delete Account</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete your account? This action cannot be undone.
            All your data, including bids, purchases, and saved items will be permanently removed.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={() => setShowDeleteDialog(false)}>
            Delete Account
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
