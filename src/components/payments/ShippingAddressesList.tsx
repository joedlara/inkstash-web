import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  Chip,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import HomeIcon from '@mui/icons-material/Home';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import { type ShippingAddress } from '../../api/payments';
import EditShippingAddressForm from './EditShippingAddressForm';

interface ShippingAddressesListProps {
  addresses: ShippingAddress[];
  onSetDefault: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, updates: Partial<ShippingAddress>) => void;
}

export default function ShippingAddressesList({
  addresses,
  onSetDefault,
  onDelete,
  onEdit,
}: ShippingAddressesListProps) {
  const [editingAddress, setEditingAddress] = useState<ShippingAddress | null>(null);

  if (addresses.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <HomeIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" color="text.secondary">
          No shipping addresses added yet
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Add a shipping address for easier checkout
        </Typography>
      </Box>
    );
  }

  const handleEdit = (address: ShippingAddress) => {
    setEditingAddress(address);
  };

  const handleSaveEdit = (updates: Partial<ShippingAddress>) => {
    if (editingAddress) {
      onEdit(editingAddress.id, updates);
      setEditingAddress(null);
    }
  };

  return (
    <>
      <Stack spacing={2}>
        {addresses.map((address) => (
          <Card
            key={address.id}
            variant="outlined"
            sx={{
              position: 'relative',
              borderColor: address.is_default ? 'primary.main' : 'divider',
              borderWidth: address.is_default ? 2 : 1,
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', gap: 2, flex: 1 }}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 1,
                      bgcolor: 'grey.100',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <HomeIcon sx={{ color: 'text.secondary' }} />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Typography variant="body1" fontWeight={500}>
                        {address.full_name}
                      </Typography>
                      {address.is_default && (
                        <Chip label="Default" size="small" color="primary" />
                      )}
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {address.address_line1}
                    </Typography>
                    {address.address_line2 && (
                      <Typography variant="body2" color="text.secondary">
                        {address.address_line2}
                      </Typography>
                    )}
                    <Typography variant="body2" color="text.secondary">
                      {address.city}, {address.state} {address.postal_code}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {address.country}
                    </Typography>
                    {address.phone && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {address.phone}
                      </Typography>
                    )}
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <IconButton
                    size="small"
                    onClick={() => onSetDefault(address.id)}
                    disabled={address.is_default}
                    sx={{
                      color: address.is_default ? 'primary.main' : 'text.secondary',
                    }}
                  >
                    {address.is_default ? <StarIcon /> : <StarBorderIcon />}
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleEdit(address)}
                    sx={{ color: 'text.secondary' }}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => onDelete(address.id)}
                    disabled={address.is_default && addresses.length > 1}
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

      <Dialog
        open={editingAddress !== null}
        onClose={() => setEditingAddress(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit Shipping Address</DialogTitle>
        <DialogContent>
          {editingAddress && (
            <EditShippingAddressForm
              address={editingAddress}
              onSave={handleSaveEdit}
              onCancel={() => setEditingAddress(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
