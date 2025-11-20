import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Container, LinearProgress, Alert, Snackbar } from '@mui/material';
import OnboardingUsernameStep from '../components/onboarding/OnboardingUsernameStep';
import OnboardingInterestsStep from '../components/onboarding/OnboardingInterestsStep';
import OnboardingNotificationsStep from '../components/onboarding/OnboardingNotificationsStep';
import OnboardingFeedPreviewStep from '../components/onboarding/OnboardingFeedPreviewStep';
import type { NotificationPreferences } from '../components/onboarding/OnboardingNotificationsStep';
import { authManager } from '../api/auth/authManager';
import { supabase } from '../api/supabase/supabaseClient';

interface OnboardingData {
  username: string;
  interests: string[];
  notifications: NotificationPreferences;
}

const Onboarding: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [onboardingData, setOnboardingData] = useState<Partial<OnboardingData>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>('');

  const totalSteps = 4;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  // Step 1: Username
  const handleUsernameNext = (username: string) => {
    setOnboardingData((prev) => ({ ...prev, username }));
    setCurrentStep(1);
  };

  const handleUsernameSkip = () => {
    // Generate temporary username
    const tempUsername = `user_${Date.now().toString().slice(-8)}`;
    setOnboardingData((prev) => ({ ...prev, username: tempUsername }));
    setCurrentStep(1);
  };

  // Step 2: Interests
  const handleInterestsNext = (interests: string[]) => {
    setOnboardingData((prev) => ({ ...prev, interests }));
    setCurrentStep(2);
  };

  const handleInterestsSkip = () => {
    // Skip interests selection, move to next step with empty array
    setOnboardingData((prev) => ({ ...prev, interests: [] }));
    setCurrentStep(2);
  };

  const handleInterestsBack = () => {
    setCurrentStep(0);
  };

  // Step 3: Notifications (was Step 4)
  const handleNotificationsNext = (notifications: NotificationPreferences) => {
    setOnboardingData((prev) => ({ ...prev, notifications }));
    setCurrentStep(3);
  };

  const handleNotificationsSkip = () => {
    // Skip notifications setup, move to next step with default values
    setCurrentStep(3);
  };

  const handleNotificationsBack = () => {
    setCurrentStep(1);
  };

  // Step 4: Complete (was Step 5)
  const handleComplete = async () => {
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

      // Navigate to home page
      navigate('/');
    } catch (err: any) {
      console.error('Error completing onboarding:', err);
      setError(err.message || 'Failed to save your preferences. Please try again.');
      setSaving(false);
    }
  };

  const handleFeedPreviewBack = () => {
    setCurrentStep(2);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        pt: 2,
      }}
    >
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

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Step 1: Username */}
        {currentStep === 0 && (
          <OnboardingUsernameStep
            onNext={handleUsernameNext}
            onSkip={handleUsernameSkip}
            initialUsername={onboardingData.username}
          />
        )}

        {/* Step 2: Interests */}
        {currentStep === 1 && (
          <OnboardingInterestsStep
            onNext={handleInterestsNext}
            onSkip={handleInterestsSkip}
            onBack={handleInterestsBack}
            initialInterests={onboardingData.interests}
          />
        )}

        {/* Step 3: Notifications (was Step 4) */}
        {currentStep === 2 && (
          <OnboardingNotificationsStep
            onNext={handleNotificationsNext}
            onSkip={handleNotificationsSkip}
            onBack={handleNotificationsBack}
            initialPreferences={onboardingData.notifications}
          />
        )}

        {/* Step 4: Feed Preview (was Step 5) */}
        {currentStep === 3 && (
          <OnboardingFeedPreviewStep
            onComplete={handleComplete}
            onBack={handleFeedPreviewBack}
            selectedInterests={onboardingData.interests || []}
            username={onboardingData.username || 'there'}
          />
        )}
      </Container>

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
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <Box sx={{ textAlign: 'center', color: 'white' }}>
            <LinearProgress sx={{ width: 200, mb: 2 }} />
            <Box>Setting up your profile...</Box>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default Onboarding;
