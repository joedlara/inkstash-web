import { Box, Button, Paper, Typography, Alert } from '@mui/material';

interface AddPaymentMethodFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

/**
 * Legacy add-card form, kept as a placeholder so the older auction /
 * single-item checkout flows (CheckoutNew, PaymentShippingSetupModal,
 * ItemDetail) still compile.
 *
 * Under the Rubies-only pack model, cards are saved automatically by
 * the stripe-webhook the first time the user purchases a Ruby bundle.
 * Until the legacy auction flow migrates to the same Stripe Customer
 * pattern (separate spike), this form simply informs the user.
 */
export default function AddPaymentMethodForm({ onCancel }: AddPaymentMethodFormProps) {
  return (
    <Paper elevation={0} sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Add a card
      </Typography>
      <Alert severity="info" sx={{ mb: 3 }}>
        Cards are saved automatically the first time you buy Rubies. Visit any
        pack, click <strong>Buy Rubies to Open</strong>, and complete a bundle
        purchase — your card will be saved here for one-tap checkout.
      </Alert>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button onClick={onCancel}>Close</Button>
      </Box>
    </Paper>
  );
}
