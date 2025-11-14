import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  Chip,
  Stack,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import { type PaymentMethod } from '../../api/payments';

interface PaymentMethodsListProps {
  paymentMethods: PaymentMethod[];
  onSetDefault: (id: string) => void;
  onDelete: (id: string) => void;
}

const cardBrandColors: Record<string, string> = {
  visa: '#1A1F71',
  mastercard: '#EB001B',
  amex: '#006FCF',
  discover: '#FF6000',
};

export default function PaymentMethodsList({
  paymentMethods,
  onSetDefault,
  onDelete,
}: PaymentMethodsListProps) {
  if (paymentMethods.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <CreditCardIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" color="text.secondary">
          No payment methods added yet
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Add a payment method to make purchases easier
        </Typography>
      </Box>
    );
  }

  return (
    <Stack spacing={2}>
      {paymentMethods.map((method) => (
        <Card
          key={method.id}
          variant="outlined"
          sx={{
            position: 'relative',
            borderColor: method.is_default ? 'primary.main' : 'divider',
            borderWidth: method.is_default ? 2 : 1,
          }}
        >
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                <Box
                  sx={{
                    width: 56,
                    height: 36,
                    borderRadius: 1,
                    bgcolor: cardBrandColors[method.card_brand.toLowerCase()] || 'grey.300',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                  }}
                >
                  <CreditCardIcon />
                </Box>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body1" fontWeight={500}>
                      {method.card_brand.charAt(0).toUpperCase() + method.card_brand.slice(1)} ••••{' '}
                      {method.card_last4}
                    </Typography>
                    {method.is_default && (
                      <Chip label="Default" size="small" color="primary" />
                    )}
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Expires {String(method.card_exp_month).padStart(2, '0')}/{method.card_exp_year}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <IconButton
                  size="small"
                  onClick={() => onSetDefault(method.id)}
                  disabled={method.is_default}
                  sx={{
                    color: method.is_default ? 'primary.main' : 'text.secondary',
                  }}
                >
                  {method.is_default ? <StarIcon /> : <StarBorderIcon />}
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => onDelete(method.id)}
                  disabled={method.is_default && paymentMethods.length > 1}
                  sx={{ color: 'error.main' }}
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            </Box>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
}
