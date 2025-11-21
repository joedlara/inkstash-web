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

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface OnboardingData {
  username: string;
  interests: string[];
  notifications: NotificationPreferences;
}

const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [onboardingData, setOnboardingData] = useState<Partial<OnboardingData>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>('');

  const totalSteps = 4;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  // Step 1: Username (Mandatory - no skip)
  const handleUsernameNext = (username: string) => {
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

  // Save onboarding data to database
  const saveOnboardingData = async (isPartialComplete: boolean) => {
    setSaving(true);
    setError('');

    try {
      const user = authManager.getUser();
      if (!user) {
        throw new Error('No authenticated user found');
      }

      const { username, interests, notifications } = onboardingData;

      // 1. Update user profile with username
      const { error: userError } = await supabase
        .from('users')
        .update({
          username: username,
          onboarding_completed: true,
          onboarding_completed_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (userError) throw userError;

      // 2. Create or update user preferences with default values
      const preferencesData = {
        user_id: user.id,
        favorite_categories: interests || [],
        favorite_shows: [],
        min_price: 0,
        max_price: 10000,
        items_per_page: 24,
        default_sort: 'newest',
      };

      const { error: prefsError } = await supabase
        .from('user_preferences')
        .upsert(preferencesData, { onConflict: 'user_id' });

      if (prefsError) throw prefsError;

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

      const { error: notifError } = await supabase
        .from('users')
        .update({ notification_preferences: notificationPrefs })
        .eq('id', user.id);

      if (notifError) throw notifError;

      // Refresh user data in authManager
      await authManager.refreshUser();

      // Close modal
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
          borderRadius: 2,
          maxHeight: '90vh',
          position: 'relative',
        },
      }}
      // Prevent closing by clicking outside or pressing escape on username step
      onClose={currentStep === 0 ? undefined : onClose}
      disableEscapeKeyDown={currentStep === 0}
    >
      {/* Close button - only show after username step */}
      {currentStep > 0 && (
        <IconButton
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 16,
            top: 16,
            color: 'text.secondary',
            zIndex: 1,
            '&:hover': {
              bgcolor: 'action.hover',
            },
          }}
        >
          <Close />
        </IconButton>
      )}

      {/* Progress Bar */}
      <LinearProgress
        variant="determinate"
        value={progress}
        sx={{
          height: 6,
          bgcolor: 'divider',
          '& .MuiLinearProgress-bar': {
            bgcolor: 'primary.main',
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

      {/* Loading overlay */}
      {saving && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            borderRadius: 2,
          }}
        >
          <Box sx={{ textAlign: 'center', color: 'white' }}>
            <LinearProgress sx={{ width: 200, mb: 2 }} />
            <Typography>Setting up your profile...</Typography>
          </Box>
        </Box>
      )}
    </Dialog>
  );
};

export default OnboardingModal;
