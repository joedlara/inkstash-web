import { useState, useCallback, useEffect } from 'react';
import { Box, Typography, Button, Alert, CircularProgress } from '@mui/material';
import { usePlaidLink } from 'react-plaid-link';
import { AccountBalance, CheckCircle } from '@mui/icons-material';
import { sellerApi } from '../../../api/seller';

interface BankConnectionProps {
  onSuccess: (publicToken: string, metadata: any) => void;
  onError?: (error: any) => void;
  onLinkTokenCreated?: (linkToken: string) => void;
}

export default function BankConnection({ onSuccess, onError, onLinkTokenCreated }: BankConnectionProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Fetch link token from your backend
  useEffect(() => {
    const createLinkToken = async () => {
      try {
        setIsLoading(true);
        const data = await sellerApi.createPlaidBankLinkToken();
        setLinkToken(data.link_token);
        if (onLinkTokenCreated) {
          onLinkTokenCreated(data.link_token);
        }
        setError(null);
      } catch (err: any) {
        // Check if we're using mock API
        const isMockMode = import.meta.env.VITE_USE_MOCK_SELLER_API === 'true';
        if (!isMockMode) {
          setError('Failed to initialize bank connection. Please check your backend API.');
        }
        // In mock mode, don't show error - just let the mock button show
      } finally {
        setIsLoading(false);
      }
    };

    createLinkToken();
  }, []);

  const handleOnSuccess = useCallback(
    (publicToken: string, metadata: any) => {
      setIsConnected(true);
      onSuccess(publicToken, metadata);
    },
    [onSuccess]
  );

  const handleOnExit = useCallback((err: any, metadata: any) => {
    if (err) {
      setError('Bank connection was cancelled or failed. Please try again.');
      if (onError) {
        onError(err);
      }
    }
  }, [onError]);

  // Check if we're in mock mode
  const isMockMode = import.meta.env.VITE_USE_MOCK_SELLER_API === 'true';

  const config = {
    token: linkToken,
    onSuccess: handleOnSuccess,
    onExit: handleOnExit,
  };

  // Only use Plaid Link if we have a real token (not in mock mode)
  const { open, ready } = usePlaidLink(isMockMode ? { token: null, onSuccess: () => {}, onExit: () => {} } : config);

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Connect Your Bank Account
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Connect your bank account securely using Plaid. This is required to receive your seller
        payouts.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {isConnected && (
        <Alert
          severity="success"
          icon={<CheckCircle />}
          sx={{ mb: 3 }}
        >
          Bank account successfully connected!
        </Alert>
      )}

      <Box
        sx={{
          border: '2px dashed',
          borderColor: 'divider',
          borderRadius: 2,
          p: 4,
          textAlign: 'center',
          mb: 3,
        }}
      >
        <AccountBalance sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />

        <Typography variant="h6" gutterBottom>
          Secure Bank Connection
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          We use Plaid to securely connect your bank account. Your credentials are encrypted and
          never stored on our servers.
        </Typography>

        {isLoading ? (
          <CircularProgress />
        ) : isMockMode ? (
          <Button
            variant="contained"
            size="large"
            onClick={() => {
              // Simulate successful connection in mock mode
              setIsConnected(true);
              onSuccess('mock-public-token-' + Date.now(), {
                institution: { name: 'Mock Bank', institution_id: 'mock_ins' },
                accounts: [{ id: 'mock_acc', name: 'Checking', mask: '0000' }],
              });
            }}
            disabled={isConnected}
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
            {isConnected ? '✓ Connected (Mock)' : 'Connect Mock Bank Account'}
          </Button>
        ) : (
          <Button
            variant="contained"
            size="large"
            onClick={() => open()}
            disabled={!ready || isConnected}
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
            {isConnected ? '✓ Connected' : 'Connect Bank Account'}
          </Button>
        )}
      </Box>

      <Box sx={{ bgcolor: 'grey.50', borderRadius: 1, p: 2 }}>
        <Typography variant="caption" color="text.secondary">
          <strong>Why do we need this?</strong> Connecting your bank account allows us to
          securely transfer your earnings directly to you. We use industry-leading security
          practices to protect your information.
        </Typography>
      </Box>
    </Box>
  );
}
