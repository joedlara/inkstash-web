import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  Button,
  Stepper,
  Step,
  StepLabel,
  Alert,
  CircularProgress,
  Paper,
  Stack,
  IconButton,
} from '@mui/material';
import { Close, Payment, LocalShipping, CheckCircle } from '@mui/icons-material';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { paymentMethodsAPI, shippingAddressesAPI } from '../../api/payments';
import AddPaymentMethodForm from './AddPaymentMethodForm';
import AddShippingAddressForm from './AddShippingAddressForm';

interface PaymentShippingSetupModalProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
  requiredSetup: 'both' | 'payment' | 'shipping';
}

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

export default function PaymentShippingSetupModal({
  open,
  onClose,
  onComplete,
  requiredSetup,
}: PaymentShippingSetupModalProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPayment, setHasPayment] = useState(false);
  const [hasShipping, setHasShipping] = useState(false);

  const steps = requiredSetup === 'both'
    ? ['Add Payment Method', 'Add Shipping Address']
    : requiredSetup === 'payment'
    ? ['Add Payment Method']
    : ['Add Shipping Address'];

  useEffect(() => {
    if (open) {
      checkExistingMethods();
    }
  }, [open]);

  const checkExistingMethods = async () => {
    setLoading(true);
    try {
      const [payments, addresses] = await Promise.all([
        paymentMethodsAPI.getAll(),
        shippingAddressesAPI.getAll(),
      ]);

      const hasValidPayment = payments.length > 0;
      const hasValidShipping = addresses.length > 0;

      setHasPayment(hasValidPayment);
      setHasShipping(hasValidShipping);

      // If they already have what they need, complete immediately
      if (requiredSetup === 'both' && hasValidPayment && hasValidShipping) {
        onComplete();
        return;
      }
      if (requiredSetup === 'payment' && hasValidPayment) {
        onComplete();
        return;
      }
      if (requiredSetup === 'shipping' && hasValidShipping) {
        onComplete();
        return;
      }

      // Set the initial step based on what's needed
      if (requiredSetup === 'both') {
        setActiveStep(hasValidPayment ? 1 : 0);
      } else if (requiredSetup === 'payment') {
        setActiveStep(0);
      } else {
        setActiveStep(0);
      }
    } catch (err) {
      console.error('Error checking existing methods:', err);
      setError('Failed to load payment and shipping information');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async () => {
    setHasPayment(true);

    if (requiredSetup === 'payment') {
      // If we only needed payment, we're done
      onComplete();
    } else if (requiredSetup === 'both') {
      // Move to shipping step
      setActiveStep(1);
    }
  };

  const handleShippingSuccess = async () => {
    setHasShipping(true);

    if (requiredSetup === 'shipping') {
      // If we only needed shipping, we're done
      onComplete();
    } else if (requiredSetup === 'both') {
      // We're done with both
      onComplete();
    }
  };

  const handleCancel = () => {
    setActiveStep(0);
    setError(null);
    onClose();
  };

  const getCurrentStepContent = () => {
    if (requiredSetup === 'both') {
      if (activeStep === 0) {
        return (
          <Elements stripe={stripePromise}>
            <AddPaymentMethodForm
              onSuccess={handlePaymentSuccess}
              onCancel={handleCancel}
            />
          </Elements>
        );
      } else {
        return (
          <AddShippingAddressForm
            onSuccess={handleShippingSuccess}
            onCancel={handleCancel}
          />
        );
      }
    } else if (requiredSetup === 'payment') {
      return (
        <Elements stripe={stripePromise}>
          <AddPaymentMethodForm
            onSuccess={handlePaymentSuccess}
            onCancel={handleCancel}
          />
        </Elements>
      );
    } else {
      return (
        <AddShippingAddressForm
          onSuccess={handleShippingSuccess}
          onCancel={handleCancel}
        />
      );
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
        },
      }}
    >
      <DialogTitle>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="h6" fontWeight="bold">
              Setup Required
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {requiredSetup === 'both'
                ? 'Add payment and shipping information to continue'
                : requiredSetup === 'payment'
                ? 'Add a payment method to continue'
                : 'Add a shipping address to continue'}
            </Typography>
          </Box>
          <IconButton onClick={handleCancel} size="small">
            <Close />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {steps.length > 1 && (
              <Paper elevation={0} sx={{ p: 2, mb: 3, bgcolor: 'background.default' }}>
                <Stepper activeStep={activeStep}>
                  {steps.map((label, index) => (
                    <Step key={label} completed={index === 0 ? hasPayment : hasShipping}>
                      <StepLabel
                        StepIconComponent={() => {
                          if (index === 0) {
                            return hasPayment ? (
                              <CheckCircle color="success" />
                            ) : (
                              <Payment color={activeStep === 0 ? 'primary' : 'disabled'} />
                            );
                          } else {
                            return hasShipping ? (
                              <CheckCircle color="success" />
                            ) : (
                              <LocalShipping color={activeStep === 1 ? 'primary' : 'disabled'} />
                            );
                          }
                        }}
                      >
                        {label}
                      </StepLabel>
                    </Step>
                  ))}
                </Stepper>
              </Paper>
            )}

            {error && (
              <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            <Alert severity="info" sx={{ mb: 3 }}>
              To bid or purchase items, you need to have valid payment and shipping information on file.
            </Alert>

            {getCurrentStepContent()}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
