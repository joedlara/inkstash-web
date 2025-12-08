import { useState, useEffect, useRef } from 'react';
import { Box, Typography, Button, Alert, CircularProgress, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import { Verified, CheckCircle, CameraAlt, Badge } from '@mui/icons-material';
import { sellerApi } from '../../../api/seller';

interface IdentityVerificationProps {
  onSuccess: (publicToken: string, metadata: any) => void;
  onError?: (error: any) => void;
  onLinkTokenCreated?: (linkToken: string) => void;
}

export default function IdentityVerification({ onSuccess, onError, onLinkTokenCreated }: IdentityVerificationProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const plaidHandlerRef = useRef<any>(null);

  // Fetch identity verification link token from your backend
  useEffect(() => {
    const createLinkToken = async () => {
      try {
        setIsLoading(true);
        const data = await sellerApi.createPlaidIdentityVerificationToken();

        setLinkToken(data.link_token);
        if (onLinkTokenCreated) {
          onLinkTokenCreated(data.link_token);
        }
        setError(null);
      } catch (err: any) {
        // Check if we're using mock API
        const isMockMode = (import.meta as any).env.VITE_USE_MOCK_SELLER_API === 'true';
        if (!isMockMode) {
          const errorMessage = err.response?.data?.error || err.message || 'Unknown error';
          setError(`Failed to initialize identity verification: ${errorMessage}`);
        }
      } finally {
        setIsLoading(false);
      }
    };

    createLinkToken();
  }, [onLinkTokenCreated]);

  // Initialize Plaid Link when we have a link token
  useEffect(() => {
    if (!linkToken || isVerified) {
      return;
    }

    // Check if Plaid script is loaded
    if (!window.Plaid) {
      setError('Plaid Link script not loaded. Please refresh the page.');
      return;
    }

    // Create Plaid Link handler using Plaid.create() as per documentation
    const handler = window.Plaid.create({
      token: linkToken,
      onSuccess: (publicToken: string | null, metadata: any) => {
        setIsVerified(true);

        // Extract the verification ID from metadata
        const identityData = metadata?.identity_verification;
        if (identityData) {
          onSuccess(identityData.id, metadata);
        } else if (publicToken) {
          onSuccess(publicToken, metadata);
        } else {
          onSuccess('identity-verified-' + Date.now(), metadata);
        }
      },
      onExit: (err: any, metadata: any) => {
        if (err) {
          setError('Identity verification was cancelled or failed. Please try again.');
          if (onError) {
            onError(err);
          }
        }
      },
      onEvent: (eventName: string, metadata: any) => {
        // Event tracking can be added here if needed
      },
    });

    plaidHandlerRef.current = handler;

    return () => {
      if (plaidHandlerRef.current) {
        plaidHandlerRef.current.destroy();
        plaidHandlerRef.current = null;
      }
    };
  }, [linkToken, isVerified, onSuccess, onError]);

  // Check if we're in mock mode
  const isMockMode = (import.meta as any).env.VITE_USE_MOCK_SELLER_API === 'true';

  const startVerification = () => {
    if (plaidHandlerRef.current) {
      plaidHandlerRef.current.open();
    } else {
      setError('Plaid Link not initialized. Please refresh the page.');
    }
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Verify Your Identity
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        To comply with regulations and ensure marketplace safety, we need to verify your identity.
        This process takes just a few minutes.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {isVerified && (
        <Alert
          severity="success"
          icon={<CheckCircle />}
          sx={{ mb: 3 }}
        >
          Identity successfully verified!
        </Alert>
      )}

      <Box
        sx={{
          border: '2px dashed',
          borderColor: 'divider',
          borderRadius: 2,
          p: 4,
          mb: 3,
        }}
      >
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Verified sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />

          <Typography variant="h6" gutterBottom>
            Secure Identity Verification
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            We use Plaid's industry-leading identity verification, compliant with 2025 regulations.
          </Typography>
        </Box>

        <Typography variant="subtitle2" fontWeight={600} gutterBottom sx={{ mb: 2 }}>
          What you'll need:
        </Typography>

        <List dense>
          <ListItem>
            <ListItemIcon>
              <Badge sx={{ color: 'primary.main' }} />
            </ListItemIcon>
            <ListItemText
              primary="Government-issued ID"
              secondary="Driver's license, passport, or state ID"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <CameraAlt sx={{ color: 'primary.main' }} />
            </ListItemIcon>
            <ListItemText
              primary="Selfie photo"
              secondary="A live photo of yourself for face verification"
            />
          </ListItem>
        </List>

        <Box sx={{ textAlign: 'center', mt: 3 }}>
          {isLoading ? (
            <Box>
              <CircularProgress />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Initializing identity verification...
              </Typography>
            </Box>
          ) : isMockMode ? (
            <Button
              variant="contained"
              size="large"
              onClick={() => {
                // Simulate successful verification in mock mode
                setIsVerified(true);
                onSuccess('mock-identity-token-' + Date.now(), {
                  status: 'success',
                  verification_id: 'mock_ver_' + Date.now(),
                });
              }}
              disabled={isVerified}
              sx={{
                bgcolor: '#0078FF',
                color: 'white',
                textTransform: 'none',
                fontWeight: 600,
                '&:hover': {
                  bgcolor: '#0056CC',
                },
              }}
            >
              {isVerified ? '✓ Verified (Mock)' : 'Complete Mock Verification'}
            </Button>
          ) : (
            <Box>
              <Button
                variant="contained"
                size="large"
                onClick={startVerification}
                disabled={!linkToken || isVerified || isLoading}
                sx={{
                  bgcolor: '#0078FF',
                  color: 'white',
                  textTransform: 'none',
                  fontWeight: 600,
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
                {isVerified ? '✓ Verified' : 'Start Verification'}
              </Button>
              {linkToken && !isVerified && !plaidHandlerRef.current && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  Initializing Plaid Link...
                </Typography>
              )}
              {!linkToken && !isLoading && (
                <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>
                  Failed to create verification session. Check console for details.
                </Typography>
              )}
            </Box>
          )}
        </Box>
      </Box>

      <Box sx={{ bgcolor: 'grey.50', borderRadius: 1, p: 2 }}>
        <Typography variant="caption" color="text.secondary">
          <strong>Your privacy is protected:</strong> We use Plaid's secure verification system.
          Your ID and photo are encrypted and processed securely. This verification helps prevent
          fraud and keeps the InkStash marketplace safe for everyone.
        </Typography>
      </Box>
    </Box>
  );
}
