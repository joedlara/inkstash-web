import { Box, Typography, TextField, MenuItem, Grid, Paper, Button, CircularProgress, Alert } from '@mui/material';
import { Scale, Straighten } from '@mui/icons-material';

interface PackageDimensionsInputProps {
  weightValue: string;
  weightUnit: 'ounce' | 'pound';
  length: string;
  width: string;
  height: string;
  dimensionUnit: 'inch' | 'centimeter';
  onWeightValueChange: (value: string) => void;
  onWeightUnitChange: (unit: 'ounce' | 'pound') => void;
  onLengthChange: (value: string) => void;
  onWidthChange: (value: string) => void;
  onHeightChange: (value: string) => void;
  onDimensionUnitChange: (unit: 'inch' | 'centimeter') => void;
  onGetRates?: () => void;
  isLoading?: boolean;
  error?: string | null;
}

export default function PackageDimensionsInput({
  weightValue,
  weightUnit,
  length,
  width,
  height,
  dimensionUnit,
  onWeightValueChange,
  onWeightUnitChange,
  onLengthChange,
  onWidthChange,
  onHeightChange,
  onDimensionUnitChange,
  onGetRates,
  isLoading,
  error,
}: PackageDimensionsInputProps) {
  const handleNumberInput = (value: string, onChange: (val: string) => void) => {
    // Allow only numbers and single decimal point
    const numericValue = value.replace(/[^0-9.]/g, '');
    const parts = numericValue.split('.');
    const sanitized = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : numericValue;
    onChange(sanitized);
  };

  const isFormValid = () => {
    return (
      parseFloat(weightValue) > 0 &&
      parseFloat(length) > 0 &&
      parseFloat(width) > 0 &&
      parseFloat(height) > 0
    );
  };

  return (
    <Paper sx={{ p: 3, mb: 2, bgcolor: 'grey.50' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Scale />
        <Typography variant="subtitle1" fontWeight={600}>
          Package dimensions
        </Typography>
      </Box>

      <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 2 }}>
        Enter the weight and dimensions of your package to get accurate shipping rates.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2}>
        {/* Weight */}
        <Grid item xs={12} sm={6} md={4}>
          <Typography variant="caption" color="text.secondary" gutterBottom display="block">
            Weight
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              fullWidth
              size="small"
              value={weightValue}
              onChange={(e) => handleNumberInput(e.target.value, onWeightValueChange)}
              placeholder="8"
              type="text"
              inputProps={{ inputMode: 'decimal' }}
            />
            <TextField
              select
              size="small"
              value={weightUnit}
              onChange={(e) => onWeightUnitChange(e.target.value as 'ounce' | 'pound')}
              sx={{ minWidth: 100 }}
            >
              <MenuItem value="ounce">oz</MenuItem>
              <MenuItem value="pound">lb</MenuItem>
              <MenuItem value="gram">g</MenuItem>
              <MenuItem value="kilogram">kg</MenuItem>
            </TextField>
          </Box>
        </Grid>

        {/* Length */}
        <Grid item xs={12} sm={6} md={2.5}>
          <Typography variant="caption" color="text.secondary" gutterBottom display="block">
            Length
          </Typography>
          <TextField
            fullWidth
            size="small"
            value={length}
            onChange={(e) => handleNumberInput(e.target.value, onLengthChange)}
            placeholder="6"
            type="text"
            inputProps={{ inputMode: 'decimal' }}
          />
        </Grid>

        {/* Width */}
        <Grid item xs={12} sm={6} md={2.5}>
          <Typography variant="caption" color="text.secondary" gutterBottom display="block">
            Width
          </Typography>
          <TextField
            fullWidth
            size="small"
            value={width}
            onChange={(e) => handleNumberInput(e.target.value, onWidthChange)}
            placeholder="4"
            type="text"
            inputProps={{ inputMode: 'decimal' }}
          />
        </Grid>

        {/* Height */}
        <Grid item xs={12} sm={6} md={2.5}>
          <Typography variant="caption" color="text.secondary" gutterBottom display="block">
            Height
          </Typography>
          <TextField
            fullWidth
            size="small"
            value={height}
            onChange={(e) => handleNumberInput(e.target.value, onHeightChange)}
            placeholder="1"
            type="text"
            inputProps={{ inputMode: 'decimal' }}
          />
        </Grid>

        {/* Unit */}
        <Grid item xs={12} sm={6} md={2}>
          <Typography variant="caption" color="text.secondary" gutterBottom display="block">
            Unit
          </Typography>
          <TextField
            select
            fullWidth
            size="small"
            value={dimensionUnit}
            onChange={(e) => onDimensionUnitChange(e.target.value as 'inch' | 'centimeter')}
          >
            <MenuItem value="inch">in</MenuItem>
            <MenuItem value="centimeter">cm</MenuItem>
          </TextField>
        </Grid>
      </Grid>

      {onGetRates && (
        <Box sx={{ mt: 2 }}>
          <Button
            variant="contained"
            onClick={onGetRates}
            disabled={!isFormValid() || isLoading}
            startIcon={isLoading ? <CircularProgress size={16} /> : <Straighten />}
            sx={{ textTransform: 'none' }}
          >
            {isLoading ? 'Getting rates...' : 'Get shipping rates'}
          </Button>
        </Box>
      )}

      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 2 }}>
        Accurate package dimensions help provide better shipping rates to buyers.
      </Typography>
    </Paper>
  );
}
