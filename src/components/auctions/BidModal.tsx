import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  Typography,
  Box,
  Alert,
  Chip,
  InputAdornment,
} from '@mui/material';
import { Gavel } from '@mui/icons-material';
import { generateBidOptions } from '../../api/auctions/bids';

interface BidModalProps {
  open: boolean;
  onClose: () => void;
  currentBid: number;
  itemTitle: string;
  onPlaceBid: (amount: number) => Promise<{ success: boolean; error?: string }>;
}

export default function BidModal({
  open,
  onClose,
  currentBid,
  itemTitle,
  onPlaceBid,
}: BidModalProps) {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [isCustom, setIsCustom] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const bidOptions = generateBidOptions(currentBid);

  const handleOptionClick = (amount: number) => {
    setSelectedAmount(amount);
    setIsCustom(false);
    setCustomAmount('');
    setError(null);
  };

  const handleCustomClick = () => {
    setIsCustom(true);
    setSelectedAmount(null);
    setError(null);
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow valid decimal numbers
    if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
      setCustomAmount(value);
      setError(null);
    }
  };

  const handlePlaceBid = async () => {
    let bidAmount: number;

    if (isCustom) {
      bidAmount = parseFloat(customAmount);
      if (isNaN(bidAmount) || bidAmount <= 0) {
        setError('Please enter a valid bid amount');
        return;
      }
      if (bidAmount <= currentBid) {
        setError(`Bid must be higher than current bid of $${currentBid.toFixed(2)}`);
        return;
      }
    } else if (selectedAmount) {
      bidAmount = selectedAmount;
    } else {
      setError('Please select or enter a bid amount');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await onPlaceBid(bidAmount);

      if (result.success) {
        // Reset form and close modal
        setSelectedAmount(null);
        setCustomAmount('');
        setIsCustom(false);
        onClose();
      } else {
        setError(result.error || 'Failed to place bid');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setSelectedAmount(null);
      setCustomAmount('');
      setIsCustom(false);
      setError(null);
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
        },
      }}
    >
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Gavel color="primary" />
          <Typography variant="h6" fontWeight="bold">
            Place Your Bid
          </Typography>
        </Stack>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={3}>
          {/* Item Info */}
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Item
            </Typography>
            <Typography variant="body1" fontWeight={600}>
              {itemTitle}
            </Typography>
          </Box>

          {/* Current Bid */}
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Current Bid
            </Typography>
            <Typography variant="h5" color="primary" fontWeight="bold">
              ${currentBid.toFixed(2)}
            </Typography>
          </Box>

          {/* Quick Bid Options */}
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Quick Bid Options
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {bidOptions.map((amount) => (
                <Chip
                  key={amount}
                  label={`$${amount.toFixed(2)}`}
                  onClick={() => handleOptionClick(amount)}
                  color={selectedAmount === amount ? 'primary' : 'default'}
                  variant={selectedAmount === amount ? 'filled' : 'outlined'}
                  sx={{
                    fontSize: '1rem',
                    fontWeight: selectedAmount === amount ? 'bold' : 'normal',
                    cursor: 'pointer',
                    mb: 1,
                  }}
                />
              ))}
            </Stack>
          </Box>

          {/* Custom Bid */}
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Or Enter Custom Bid
            </Typography>
            <TextField
              fullWidth
              placeholder={`Enter amount higher than $${currentBid.toFixed(2)}`}
              value={customAmount}
              onChange={handleCustomAmountChange}
              onClick={handleCustomClick}
              type="text"
              inputMode="decimal"
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderColor: isCustom ? 'primary.main' : 'divider',
                  borderWidth: isCustom ? 2 : 1,
                },
              }}
            />
          </Box>

          {/* Error Message */}
          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Bid Summary */}
          {(selectedAmount || (isCustom && parseFloat(customAmount) > 0)) && (
            <Box
              sx={{
                p: 2,
                bgcolor: 'primary.50',
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'primary.main',
              }}
            >
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Your Bid
              </Typography>
              <Typography variant="h4" color="primary" fontWeight="bold">
                ${isCustom ? (parseFloat(customAmount) || 0).toFixed(2) : selectedAmount?.toFixed(2)}
              </Typography>
            </Box>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button
          onClick={handleClose}
          variant="outlined"
          disabled={isSubmitting}
          size="large"
        >
          Cancel
        </Button>
        <Button
          onClick={handlePlaceBid}
          variant="contained"
          disabled={isSubmitting || (!selectedAmount && !isCustom)}
          size="large"
          startIcon={<Gavel />}
        >
          {isSubmitting ? 'Placing Bid...' : 'Place Bid'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
