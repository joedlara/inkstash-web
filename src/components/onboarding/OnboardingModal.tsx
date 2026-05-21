import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  Box,
  LinearProgress,
  Alert,
  Snackbar,
  IconButton,
  Typography
} from '@mui/material';
import { Close } from '@mui/icons-material';
import OnboardingUsernameStep from './OnboardingUsernameStep';
import OnboardingInterestsStep from './OnboardingInterestsStep';
import OnboardingNotificationsStep from './OnboardingNotificationsStep';
import OnboardingFeedPreviewStep from './OnboardingFeedPreviewStep';
import type { NotificationPreferences } from './OnboardingNotificationsStep';
import { authManager } from '../../api/auth/authManager';
import { supabase } from '../../api/supabase/supabaseClient';
import { inkstashColors, inkstashFonts, inkstashRadii } from '../../theme/inkstashTokens';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface OnboardingData {
  username: string;
  interests: string[];
  notifications: NotificationPreferences;
}

const ONBOARDING_USERNAME_KEY = 'onboarding_username';

const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [onboardingData, setOnboardingData] = useState<Partial<OnboardingData>>(() => ({
    username: localStorage.getItem(ONBOARDING_USERNAME_KEY) || undefined,
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>('');

  const totalSteps = 4;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  // Step 1: Username (Mandatory - no skip)
  const handleUsernameNext = (username: string) => {
    localStorage.setItem(ONBOARDING_USERNAME_KEY, username);
    setOnboardingData((prev) => ({ ...prev, username }));
    setCurrentStep(1);
  };

  // Step 2: Interests (Can be skipped with "Finish Later")
  const handleInterestsNext = (interests: string[]) => {
    setOnboardingData((prev) => ({ ...prev, interests }));
    setCurrentStep(2);
  };

  const handleInterestsFinishLater = async () => {
    // Save username only and mark onboarding as complete
    await saveOnboardingData(true);
  };

  const handleInterestsBack = () => {
    setCurrentStep(0);
  };

  // Step 3: Notifications (Can be skipped with "Finish Later")
  const handleNotificationsNext = (notifications: NotificationPreferences) => {
    setOnboardingData((prev) => ({ ...prev, notifications }));
    setCurrentStep(3);
  };

  const handleNotificationsFinishLater = async () => {
    // Save username and interests (if selected), mark onboarding as complete
    await saveOnboardingData(true);
  };

  const handleNotificationsBack = () => {
    setCurrentStep(1);
  };

  // Step 4: Feed Preview / Complete (Can be skipped with "Finish Later")
  const handleComplete = async () => {
    await saveOnboardingData(false);
  };

  const handleFeedPreviewFinishLater = async () => {
    await saveOnboardingData(true);
  };

  const handleFeedPreviewBack = () => {
    setCurrentStep(2);
  };

  // Wrap any promise in a timeout race so the modal can't hang forever on a stuck Supabase call.
  const withTimeout = <T,>(p: Promise<T> | PromiseLike<T>, ms: number, label: string): Promise<T> =>
    Promise.race([
      Promise.resolve(p),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms),
      ),
    ]);

  // Save onboarding data to database
  const saveOnboardingData = async (_isPartialComplete: boolean) => {
    setSaving(true);
    setError('');

    try {
      const user = authManager.getUser();
      if (!user) {
        throw new Error('No authenticated user found');
      }

      const { username, interests, notifications } = onboardingData;

      // The user-row poll was here previously to wait for the on_auth_user_created
      // trigger to insert the public.users row. Now that authManager.signUp polls
      // for that row immediately after signup (see authManager.signUp), the row
      // already exists by the time the user reaches step 4. If it somehow doesn't,
      // the UPDATE below will return a clear "no rows updated" result rather than
      // hanging on a separate read.

      // 1. Update user profile with username
      const { error: userError } = await withTimeout(
        supabase
          .from('users')
          .update({
            username: username,
            onboarding_completed: true,
            onboarding_completed_at: new Date().toISOString(),
          })
          .eq('id', user.id),
        10000,
        'Saving username',
      );
      if (userError) throw userError;

      // 2. Create or update user preferences
      const preferencesData = {
        user_id: user.id,
        favorite_categories: interests || [],
        favorite_shows: [],
        items_per_page: 24,
        default_sort: 'newest',
      };

      const { error: prefsError } = await withTimeout(
        supabase.from('user_preferences').upsert(preferencesData, { onConflict: 'user_id' }),
        10000,
        'Saving preferences',
      );
      if (prefsError && prefsError.code !== '23503') throw prefsError;

      // 3. Update notification preferences in users table
      const notificationPrefs = {
        email_new_items: notifications?.email?.newItems ?? true,
        email_price_drops: notifications?.email?.priceDrops ?? true,
        email_auction_ending: notifications?.email?.auctionEnding ?? true,
        email_outbid: notifications?.email?.outbid ?? true,
        email_won: notifications?.email?.won ?? true,
        email_messages: notifications?.email?.messages ?? true,
        email_weekly_highlights: notifications?.email?.weeklyHighlights ?? false,
        push_new_items: notifications?.push?.newItems ?? true,
        push_price_drops: notifications?.push?.priceDrops ?? true,
        push_auction_ending: notifications?.push?.auctionEnding ?? true,
        push_outbid: notifications?.push?.outbid ?? true,
        push_won: notifications?.push?.won ?? true,
        push_messages: notifications?.push?.messages ?? true,
      };

      const { error: notifError } = await withTimeout(
        supabase.from('users').update({ notification_preferences: notificationPrefs }).eq('id', user.id),
        10000,
        'Saving notification settings',
      );
      if (notifError) throw notifError;

      await withTimeout(authManager.refreshUser(), 5000, 'Refreshing user');

      localStorage.removeItem(ONBOARDING_USERNAME_KEY);
      setSaving(false);
      onClose();
    } catch (err: any) {
      console.error('Error completing onboarding:', err);
      setError(err.message || 'Failed to save your preferences. Please try again.');
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: inkstashRadii.lg,
          maxHeight: '90vh',
          position: 'relative',
          bgcolor: inkstashColors.bgElev,
          fontFamily: inkstashFonts.ui,
        },
      }}
      onClose={currentStep === 0 ? undefined : onClose}
      disableEscapeKeyDown={currentStep === 0}
    >
      {currentStep > 0 && (
        <IconButton
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 16,
            top: 16,
            color: inkstashColors.muted,
            zIndex: 1,
            '&:hover': {
              bgcolor: inkstashColors.bgSunken,
              color: inkstashColors.ink,
            },
          }}
        >
          <Close />
        </IconButton>
      )}

      <LinearProgress
        variant="determinate"
        value={progress}
        sx={{
          height: 4,
          bgcolor: inkstashColors.bgSunken,
          '& .MuiLinearProgress-bar': {
            bgcolor: inkstashColors.brand,
          },
        }}
      />

      <Box sx={{ p: { xs: 3, sm: 4 } }}>
        {/* Step 1: Username - MANDATORY */}
        {currentStep === 0 && (
          <OnboardingUsernameStep
            onNext={handleUsernameNext}
            initialUsername={onboardingData.username}
          />
        )}

        {/* Step 2: Interests - OPTIONAL */}
        {currentStep === 1 && (
          <OnboardingInterestsStep
            onNext={handleInterestsNext}
            onSkip={handleInterestsFinishLater}
            onBack={handleInterestsBack}
            initialInterests={onboardingData.interests}
          />
        )}

        {/* Step 3: Notifications - OPTIONAL */}
        {currentStep === 2 && (
          <OnboardingNotificationsStep
            onNext={handleNotificationsNext}
            onSkip={handleNotificationsFinishLater}
            onBack={handleNotificationsBack}
            initialPreferences={onboardingData.notifications}
          />
        )}

        {/* Step 4: Feed Preview / Complete - OPTIONAL */}
        {currentStep === 3 && (
          <OnboardingFeedPreviewStep
            onComplete={handleComplete}
            onSkip={handleFeedPreviewFinishLater}
            onBack={handleFeedPreviewBack}
            selectedInterests={onboardingData.interests || []}
            username={onboardingData.username || 'there'}
          />
        )}
      </Box>

      {/* Error Snackbar */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setError('')}>
          {error}
        </Alert>
      </Snackbar>

      {saving && (
        <Box
          sx={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            bgcolor: 'rgba(22,17,14,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            borderRadius: inkstashRadii.lg,
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
          }}
        >
          <Box sx={{ textAlign: 'center', color: '#fff', maxWidth: 280 }}>
            <LinearProgress
              sx={{
                width: 220,
                mb: 2.5,
                height: 4,
                borderRadius: 2,
                bgcolor: 'rgba(255,255,255,0.15)',
                '& .MuiLinearProgress-bar': { bgcolor: inkstashColors.brand },
              }}
            />
            <Typography sx={{
              fontFamily: inkstashFonts.display,
              fontWeight: 800,
              fontSize: 22,
              textTransform: 'uppercase',
              letterSpacing: '0.005em',
              lineHeight: 1.1,
              mb: 0.75,
            }}>
              Setting up your profile
            </Typography>
            <Typography sx={{
              fontFamily: inkstashFonts.mono,
              fontSize: 11.5,
              color: 'rgba(255,255,255,0.7)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}>
              This usually takes a second
            </Typography>
          </Box>
        </Box>
      )}
    </Dialog>
  );
};

export default OnboardingModal;
