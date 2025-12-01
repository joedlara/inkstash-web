import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  FormControlLabel,
  Switch,
  Paper,
  Divider,
  Stack,
} from '@mui/material';
import {
  Email,
  Notifications,
  TrendingUp,
  Gavel,
  MonetizationOn,
  Message,
  Celebration,
} from '@mui/icons-material';

interface NotificationPreferences {
  email: {
    newItems: boolean;
    priceDrops: boolean;
    auctionEnding: boolean;
    outbid: boolean;
    won: boolean;
    messages: boolean;
    weeklyHighlights: boolean;
  };
  push: {
    newItems: boolean;
    priceDrops: boolean;
    auctionEnding: boolean;
    outbid: boolean;
    won: boolean;
    messages: boolean;
  };
}

interface OnboardingNotificationsStepProps {
  onNext: (notifications: NotificationPreferences) => void;
  onBack?: () => void;
  onSkip?: () => void;
  initialPreferences?: Partial<NotificationPreferences>;
}

const OnboardingNotificationsStep: React.FC<OnboardingNotificationsStepProps> = ({
  onNext,
  onBack,
  onSkip,
  initialPreferences,
}) => {
  const [notifications, setNotifications] = useState<NotificationPreferences>({
    email: {
      newItems: initialPreferences?.email?.newItems ?? true,
      priceDrops: initialPreferences?.email?.priceDrops ?? true,
      auctionEnding: initialPreferences?.email?.auctionEnding ?? true,
      outbid: initialPreferences?.email?.outbid ?? true,
      won: initialPreferences?.email?.won ?? true,
      messages: initialPreferences?.email?.messages ?? true,
      weeklyHighlights: initialPreferences?.email?.weeklyHighlights ?? false,
    },
    push: {
      newItems: initialPreferences?.push?.newItems ?? true,
      priceDrops: initialPreferences?.push?.priceDrops ?? true,
      auctionEnding: initialPreferences?.push?.auctionEnding ?? true,
      outbid: initialPreferences?.push?.outbid ?? true,
      won: initialPreferences?.push?.won ?? true,
      messages: initialPreferences?.push?.messages ?? true,
    },
  });

  const handleEmailToggle = (key: keyof NotificationPreferences['email']) => {
    setNotifications((prev) => ({
      ...prev,
      email: {
        ...prev.email,
        [key]: !prev.email[key],
      },
    }));
  };

  const handlePushToggle = (key: keyof NotificationPreferences['push']) => {
    setNotifications((prev) => ({
      ...prev,
      push: {
        ...prev.push,
        [key]: !prev.push[key],
      },
    }));
  };

  const handleContinue = () => {
    onNext(notifications);
  };

  const notificationItems = [
    {
      key: 'newItems',
      label: 'New items in your interests',
      description: 'Get notified when items matching your preferences are listed',
      icon: <TrendingUp />,
    },
    {
      key: 'priceDrops',
      label: 'Price drops on watched items',
      description: `Alerts when items you're watching decrease in price`,
      icon: <MonetizationOn />,
    },
    {
      key: 'auctionEnding',
      label: 'Auction endings',
      description: `Reminders before auctions you're interested in end`,
      icon: <Gavel />,
    },
    {
      key: 'outbid',
      label: 'Outbid alerts',
      description: 'Know immediately when someone outbids you',
      icon: <TrendingUp sx={{ transform: 'rotate(180deg)' }} />,
    },
    {
      key: 'won',
      label: 'Auction won',
      description: 'Celebrate when you win an auction',
      icon: <Celebration />,
    },
    {
      key: 'messages',
      label: 'Messages from sellers/buyers',
      description: 'Direct messages about your items and purchases',
      icon: <Message />,
    },
  ];

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '500px',
        maxWidth: '700px',
        mx: 'auto',
        px: 3,
        py: 2,
      }}
    >
      <Typography variant="h4" fontWeight="bold" gutterBottom align="center">
        Stay in the loop
      </Typography>

      <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 4 }}>
        Choose how you want to be notified about important updates
      </Typography>

      <Paper elevation={0} sx={{ p: 3, bgcolor: 'background.default', flex: 1, overflow: 'auto' }}>
        {/* Email Notifications */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Email sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6" fontWeight="medium">
              Email Notifications
            </Typography>
          </Box>

          <Stack spacing={2}>
            {notificationItems.map((item) => (
              <Box key={item.key}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={notifications.email[item.key as keyof typeof notifications.email]}
                      onChange={() =>
                        handleEmailToggle(item.key as keyof NotificationPreferences['email'])
                      }
                      color="primary"
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Box sx={{ mr: 1.5, display: 'flex', color: 'text.secondary' }}>
                        {item.icon}
                      </Box>
                      <Box>
                        <Typography variant="body1">{item.label}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.description}
                        </Typography>
                      </Box>
                    </Box>
                  }
                  sx={{ width: '100%', mx: 0, alignItems: 'flex-start' }}
                />
              </Box>
            ))}

            {/* Weekly Highlights (Email only) */}
            <Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={notifications.email.weeklyHighlights}
                    onChange={() => handleEmailToggle('weeklyHighlights')}
                    color="primary"
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box sx={{ mr: 1.5, display: 'flex', color: 'text.secondary' }}>
                      <Email />
                    </Box>
                    <Box>
                      <Typography variant="body1">Weekly collection highlights</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Curated roundup of top items each week
                      </Typography>
                    </Box>
                  </Box>
                }
                sx={{ width: '100%', mx: 0, alignItems: 'flex-start' }}
              />
            </Box>
          </Stack>
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Push Notifications */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Notifications sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6" fontWeight="medium">
              Push Notifications
            </Typography>
          </Box>

          <Stack spacing={2}>
            {notificationItems.map((item) => (
              <Box key={item.key}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={notifications.push[item.key as keyof typeof notifications.push]}
                      onChange={() =>
                        handlePushToggle(item.key as keyof NotificationPreferences['push'])
                      }
                      color="primary"
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Box sx={{ mr: 1.5, display: 'flex', color: 'text.secondary' }}>
                        {item.icon}
                      </Box>
                      <Box>
                        <Typography variant="body1">{item.label}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.description}
                        </Typography>
                      </Box>
                    </Box>
                  }
                  sx={{ width: '100%', mx: 0, alignItems: 'flex-start' }}
                />
              </Box>
            ))}
          </Stack>
        </Box>
      </Paper>

      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 3 }}>
        {onBack && (
          <Button variant="outlined" size="large" onClick={onBack} sx={{ minWidth: 120 }}>
            Back
          </Button>
        )}
        <Button variant="contained" size="large" onClick={handleContinue} sx={{ minWidth: 120 }}>
          Continue
        </Button>
        {onSkip && (
          <Button variant="text" size="large" onClick={onSkip} sx={{ minWidth: 120 }}>
            Finish Later
          </Button>
        )}
      </Box>

      <Typography variant="caption" color="text.secondary" align="center" sx={{ mt: 2 }}>
        Step 3 of 4 • You can change these anytime in settings
      </Typography>
    </Box>
  );
};

export default OnboardingNotificationsStep;
export type { NotificationPreferences };
