import { useState } from 'react';
import {
  Container,
  Box,
  Typography,
  LinearProgress,
  Paper,
  Button,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { CheckCircle } from '@mui/icons-material';

const steps = [
  'Guidelines',
  'Personal Information',
  'Business Details',
  'Payment Setup',
  'Verification',
];

export default function SellerOnboarding() {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const progress = ((activeStep + 1) / steps.length) * 100;

  const handleNext = () => {
    if (activeStep < steps.length - 1) {
      setActiveStep((prev) => prev + 1);
    } else {
      // Complete onboarding
      navigate('/settings'); // or wherever you want to redirect after completion
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pt: { xs: 10, sm: 12 } }}>
      <Container maxWidth="md">
        {/* Header with Progress */}
        <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h4" fontWeight={700} gutterBottom>
              Become a Seller
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Complete these steps to start selling on InkStash
            </Typography>
          </Box>

          {/* Progress Bar */}
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" fontWeight={600}>
                Step {activeStep + 1} of {steps.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {Math.round(progress)}% Complete
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                height: 8,
                borderRadius: 4,
                bgcolor: 'grey.200',
                '& .MuiLinearProgress-bar': {
                  bgcolor: '#0078FF',
                  borderRadius: 4,
                },
              }}
            />
          </Box>

          {/* Stepper */}
          <Stepper activeStep={activeStep} sx={{ mt: 4, display: { xs: 'none', md: 'flex' } }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Paper>

        {/* Content Area */}
        <Paper elevation={0} sx={{ p: 4, borderRadius: 2, minHeight: 400 }}>
          {activeStep === 0 && (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    bgcolor: '#0078FF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <img
                    src="https://cdn-icons-png.flaticon.com/512/2917/2917995.png"
                    alt="Whatnot"
                    style={{ width: 32, height: 32 }}
                  />
                </Box>
                <Typography variant="h5" fontWeight={700}>
                  Let's get started!
                </Typography>
              </Box>

              <Typography variant="body1" sx={{ mb: 3 }}>
                Before you kick off your selling journey, please agree to these guidelines.
              </Typography>

              {/* Guidelines List */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {[
                  {
                    title: 'Honor purchases and giveaways',
                    desc: "Don't cancel auctions for going below a desired amount.",
                  },
                  {
                    title: 'Do not sell counterfeits',
                    desc: "Don't sell fake items on InkStash. If you're unsure about an item, just don't sell it.",
                  },
                  {
                    title: 'Do not lie about an item',
                    desc: "Don't mislead buyers about an item's condition, value, or anything else.",
                  },
                  {
                    title: 'Ship quickly and safely',
                    desc: 'Ship items within 2 business days after a show has ended or when an item is sold.',
                  },
                  {
                    title: 'Pre-approval required for ages 13-17',
                    desc: 'Tap here to learn more.',
                  },
                ].map((guideline, index) => (
                  <Box key={index} sx={{ display: 'flex', gap: 2 }}>
                    <CheckCircle sx={{ color: 'success.main', mt: 0.5, flexShrink: 0 }} />
                    <Box>
                      <Typography variant="body1" fontWeight={600} gutterBottom>
                        {guideline.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {guideline.desc}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          {activeStep === 1 && (
            <Box>
              <Typography variant="h5" fontWeight={700} gutterBottom>
                Personal Information
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Coming soon - This step will collect your personal details
              </Typography>
            </Box>
          )}

          {activeStep === 2 && (
            <Box>
              <Typography variant="h5" fontWeight={700} gutterBottom>
                Business Details
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Coming soon - This step will collect your business information
              </Typography>
            </Box>
          )}

          {activeStep === 3 && (
            <Box>
              <Typography variant="h5" fontWeight={700} gutterBottom>
                Payment Setup
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Coming soon - This step will set up your payment methods
              </Typography>
            </Box>
          )}

          {activeStep === 4 && (
            <Box>
              <Typography variant="h5" fontWeight={700} gutterBottom>
                Verification
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Coming soon - This step will verify your account
              </Typography>
            </Box>
          )}

          {/* Navigation Buttons */}
          <Box sx={{ display: 'flex', gap: 2, mt: 4 }}>
            <Button
              variant="outlined"
              onClick={handleBack}
              disabled={activeStep === 0}
              sx={{ flex: 1, borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
            >
              Back
            </Button>
            <Button
              variant="contained"
              onClick={handleNext}
              sx={{
                flex: 1,
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
                bgcolor: '#0078FF',
                color: 'white',
                '&:hover': { bgcolor: '#0056CC' },
              }}
            >
              {activeStep === steps.length - 1 ? 'Complete' : 'Continue'}
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
