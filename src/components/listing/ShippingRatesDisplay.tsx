import { Box, Typography, Paper, Stack, Chip, Radio, RadioGroup, FormControlLabel, Alert } from '@mui/material';
import { LocalShipping, Schedule, VerifiedUser } from '@mui/icons-material';
import type { ShippingRate } from '../../types/shipping';

interface ShippingRatesDisplayProps {
  rates: ShippingRate[];
  selectedRateId?: string;
  onSelectRate: (rateId: string) => void;
}

const CARRIER_LOGOS: Record<string, string> = {
  usps: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/USPS_Logo.svg/200px-USPS_Logo.svg.png',
  ups: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/UPS_Logo_Shield_2017.svg/200px-UPS_Logo_Shield_2017.svg.png',
  fedex: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/FedEx_Express.svg/200px-FedEx_Express.svg.png',
};

export default function ShippingRatesDisplay({
  rates,
  selectedRateId,
  onSelectRate,
}: ShippingRatesDisplayProps) {
  if (rates.length === 0) {
    return (
      <Alert severity="info" sx={{ mb: 2 }}>
        Enter package dimensions above and click "Get shipping rates" to see available shipping options.
      </Alert>
    );
  }

  const selectedRate = rates.find(r => r.id === selectedRateId || r.isSelected);
  const displayRate = selectedRate || rates[0]; // Default to cheapest

  return (
    <Box>
      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
        Available shipping services
      </Typography>

      <RadioGroup
        value={selectedRateId || displayRate?.id}
        onChange={(e) => onSelectRate(e.target.value)}
      >
        <Stack spacing={2} sx={{ mb: 3 }}>
          {rates.map((rate) => {
            const isSelected = rate.id === selectedRateId || rate.id === displayRate?.id;
            const carrierLogo = CARRIER_LOGOS[rate.carrierCode.toLowerCase()] || null;

            return (
              <Paper
                key={rate.id}
                sx={{
                  p: 2,
                  border: '2px solid',
                  borderColor: isSelected ? 'primary.main' : 'grey.300',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': {
                    borderColor: isSelected ? 'primary.main' : 'primary.light',
                    bgcolor: 'grey.50',
                  },
                }}
                onClick={() => onSelectRate(rate.id)}
              >
                <FormControlLabel
                  value={rate.id}
                  control={<Radio />}
                  sx={{ width: '100%', m: 0 }}
                  label={
                    <Stack direction="row" alignItems="center" spacing={2} sx={{ width: '100%', ml: 1 }}>
                      {carrierLogo && (
                        <Box
                          component="img"
                          src={carrierLogo}
                          alt={rate.carrierName}
                          sx={{ width: 60, height: 'auto' }}
                        />
                      )}
                      <Box sx={{ flex: 1 }}>
                        {rate.guaranteedService && (
                          <Chip
                            label="GUARANTEED"
                            size="small"
                            color="success"
                            sx={{ mb: 0.5 }}
                          />
                        )}
                        {isSelected && !rate.guaranteedService && (
                          <Chip
                            label="RECOMMENDED"
                            size="small"
                            color="primary"
                            sx={{ mb: 0.5 }}
                          />
                        )}
                        <Typography variant="subtitle2" fontWeight={600}>
                          {rate.serviceName}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 0.5 }}>
                          {rate.deliveryDays && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Schedule fontSize="small" sx={{ color: 'text.secondary' }} />
                              <Typography variant="body2" color="text.secondary">
                                {rate.deliveryDays === 1
                                  ? '1 business day'
                                  : `${rate.deliveryDays} business days`}
                              </Typography>
                            </Box>
                          )}
                          {rate.estimatedDeliveryDate && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <LocalShipping fontSize="small" sx={{ color: 'text.secondary' }} />
                              <Typography variant="body2" color="text.secondary">
                                Est. {new Date(rate.estimatedDeliveryDate).toLocaleDateString()}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="h6" fontWeight={700} color="primary">
                          ${rate.shippingAmount.toFixed(2)}
                        </Typography>
                        {rate.insuranceAmount > 0 && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'flex-end' }}>
                            <VerifiedUser fontSize="small" sx={{ color: 'success.main' }} />
                            <Typography variant="caption" color="text.secondary">
                              +${rate.insuranceAmount.toFixed(2)} insurance
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </Stack>
                  }
                />
              </Paper>
            );
          })}
        </Stack>
      </RadioGroup>

      {/* Shipping cost info */}
      <Paper sx={{ p: 2, bgcolor: 'info.50', border: '1px solid', borderColor: 'info.main', mt: 3 }}>
        <Typography variant="body2" fontWeight={600} gutterBottom>
          Shipping cost at checkout
        </Typography>
        <Typography variant="body2" color="text.secondary">
          The buyer will pay the selected shipping rate (${displayRate?.shippingAmount.toFixed(2)}) at checkout. This will be added to the item price and service fee for the total transaction amount.
        </Typography>
      </Paper>
    </Box>
  );
}
