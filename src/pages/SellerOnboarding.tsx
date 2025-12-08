import { useState, useCallback, useEffect } from 'react';
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
  CircularProgress,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import TermsAndConditions from '../components/seller/SellerOnboarding/TermsAndConditions';
import BankConnection from '../components/seller/SellerOnboarding/BankConnection';
import IdentityVerification from '../components/seller/SellerOnboarding/IdentityVerification';
import { sellerApi } from '../api/seller';

const steps = [
  'Terms & Conditions',
  'Bank Connection',
  'Identity Verification',
  'Review & Submit',
];

export default function SellerOnboarding() {
  const navigate = useNavigate();
  const [isLoadingProgress, setIsLoadingProgress] = useState(true);
  const [activeStep, setActiveStep] = useState(0);
  const [agreedToGuidelines, setAgreedToGuidelines] = useState(false);
  const [bankLinkToken, setBankLinkToken] = useState<string | null>(null);
  const [bankToken, setBankToken] = useState<string | null>(null);
  const [identityLinkToken, setIdentityLinkToken] = useState<string | null>(null);
  const [identityToken, setIdentityToken] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // Calculate progress based on actual steps
  const progress = ((activeStep + 1) / steps.length) * 100;

  // Load saved progress on mount
  useEffect(() => {
    const loadProgress = async () => {
      try {
        const { supabase } = await import('../api/supabase/supabaseClient');
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          setAuthError('Please log in to access seller onboarding');
          setIsLoadingProgress(false);
          setTimeout(() => navigate('/auth?redirect=/seller-onboarding'), 2000);
          return;
        }

        const savedProgress = await sellerApi.getCurrentOnboardingProgress();

        if (savedProgress) {
          if (savedProgress.currentStep !== undefined) {
            setActiveStep(savedProgress.currentStep);
          }

          if (savedProgress.agreedToTerms) {
            setAgreedToGuidelines(true);
          }

          if (savedProgress.bankConnected) {
            setBankToken('restored');
          }

          if (savedProgress.identityVerified) {
            setIdentityToken('restored');
          }
        }
      } catch (error) {
        // Error loading progress - continue with fresh start
      } finally {
        setIsLoadingProgress(false);
      }
    };

    loadProgress();
  }, [navigate]);

  const handleBankLinkTokenCreated = useCallback((linkToken: string) => {
    setBankLinkToken(linkToken);
  }, []);

  const handleIdentityLinkTokenCreated = useCallback((linkToken: string) => {
    setIdentityLinkToken(linkToken);
  }, []);

  const handleNext = async () => {
    if (activeStep < steps.length - 1) {
      const nextStep = activeStep + 1;
      setActiveStep(nextStep);

      // Save progress after moving to next step
      try {
        await sellerApi.saveOnboardingProgress({
          currentStep: nextStep,
          agreedToTerms: agreedToGuidelines,
          bankConnected: bankToken !== null,
          identityVerified: identityToken !== null,
        });
      } catch (error) {
        // Continue anyway - don't block the user
      }
    } else {
      // Complete onboarding
      handleSubmit();
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleBankSuccess = useCallback(async (publicToken: string, metadata: any) => {
    try {
      setBankToken(publicToken);

      await sellerApi.saveOnboardingProgress({
        currentStep: 1,
        agreedToTerms: true,
        bankConnected: true,
        identityVerified: false,
      });

      await sellerApi.exchangePlaidBankToken(publicToken);
    } catch (error) {
      // Even if exchange fails, we still have the public token
    }
  }, []);

  const handleIdentitySuccess = useCallback(async (publicToken: string, metadata: any) => {
    try {
      setIdentityToken(publicToken);

      await sellerApi.saveOnboardingProgress({
        currentStep: 2,
        agreedToTerms: true,
        bankConnected: true,
        identityVerified: true,
      });

      await sellerApi.exchangePlaidIdentityToken(publicToken);
    } catch (error) {
      // Even if exchange fails, we still have the public token
    }
  }, []);

  const handleSubmit = async () => {
    try {
      await sellerApi.submitOnboarding({
        agreedToTerms: agreedToGuidelines,
        plaidBankToken: bankToken || undefined,
        plaidIdentityToken: identityToken || undefined,
        status: 'in_progress',
      });

      navigate('/settings');
    } catch (error) {
      // Error submitting - handle gracefully
    }
  };

  // Determine if user can proceed to next step
  const canProceed = () => {
    switch (activeStep) {
      case 0:
        return agreedToGuidelines;
      case 1:
        return bankToken !== null;
      case 2:
        return identityToken !== null;
      case 3:
        return true;
      default:
        return false;
    }
  };

  // Show loading screen while fetching saved progress
  if (isLoadingProgress) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: 'background.default',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          {authError ? (
            <>
              <Typography variant="h6" color="error" sx={{ mb: 2 }}>
                {authError}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Redirecting to login...
              </Typography>
            </>
          ) : (
            <>
              <CircularProgress size={48} sx={{ color: '#0078FF', mb: 2 }} />
              <Typography variant="body1" color="text.secondary">
                Loading your progress...
              </Typography>
            </>
          )}
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pt: { xs: 10, sm: 12 } }}>
      <Container maxWidth="md">
        {/* Header with Logo and Progress Bar */}
        <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
          {/* Logo and Name */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 3 }}>
            <svg
              width="100%"
              height="100%"
              viewBox="0 0 40 40"
              fill="none"
              style={{
                width: 'clamp(48px, 8vw, 64px)',
                height: 'clamp(48px, 8vw, 64px)',
              }}
            >
              <circle cx="20" cy="20" r="18" fill="#000000"/>
              <path d="M20 10L25 15L20 20L15 15L20 10Z" fill="#0078FF"/>
              <path d="M20 20L25 25L20 30L15 25L20 20Z" fill="#0078FF"/>
            </svg>
            <Box
              component="span"
              sx={{
                fontSize: { xs: '1.75rem', sm: '2rem', md: '2.25rem' },
                fontWeight: 700,
                color: 'text.primary',
                ml: { xs: 1.5, sm: 2 },
              }}
            >
              inkstash
            </Box>
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
          {/* Only render the active step to prevent Plaid Link from initializing multiple times */}
          {activeStep === 0 ? (
            <TermsAndConditions
              agreed={agreedToGuidelines}
              onAgreedChange={setAgreedToGuidelines}
            />
          ) : activeStep === 1 ? (
            <BankConnection
              onSuccess={handleBankSuccess}
              onError={(error) => console.error('Bank connection error:', error)}
              onLinkTokenCreated={handleBankLinkTokenCreated}
            />
          ) : activeStep === 2 ? (
            <IdentityVerification
              onSuccess={handleIdentitySuccess}
              onError={(error) => console.error('Identity verification error:', error)}
              onLinkTokenCreated={handleIdentityLinkTokenCreated}
            />
          ) : activeStep === 3 ? (
            <Box>
              <Typography variant="h5" fontWeight={700} gutterBottom>
                Review & Submit
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                You're almost done! Review your information and submit your application.
              </Typography>

              <Box sx={{ bgcolor: 'grey.50', borderRadius: 2, p: 3, mb: 3 }}>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                  Application Summary:
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      Terms Accepted:
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {agreedToGuidelines ? '✓ Yes' : '✗ No'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      Bank Connected:
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {bankToken ? '✓ Connected' : '✗ Not Connected'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      Identity Verified:
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {identityToken ? '✓ Verified' : '✗ Not Verified'}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              <Typography variant="body2" color="text.secondary">
                By submitting this application, you confirm that all information provided is
                accurate and you agree to InkStash's seller terms and conditions.
              </Typography>
            </Box>
          ) : null}

          {/* Navigation Buttons */}
          <Box sx={{ display: 'flex', gap: 2, mt: 4 }}>
            {activeStep > 0 && (
              <Button
                variant="outlined"
                onClick={handleBack}
                sx={{ flex: 1, borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
              >
                Back
              </Button>
            )}
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={!canProceed()}
              sx={{
                flex: 1,
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
                bgcolor: '#0078FF',
                color: 'white',
                opacity: !canProceed() ? 0.4 : 1,
                '&:hover': {
                  bgcolor: '#0056CC',
                },
                '&.Mui-disabled': {
                  bgcolor: '#0078FF',
                  color: 'white',
                  opacity: 0.4,
                },
              }}
            >
              {activeStep === steps.length - 1 ? 'Submit Application' : 'Continue'}
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
