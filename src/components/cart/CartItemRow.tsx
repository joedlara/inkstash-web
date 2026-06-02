// src/components/cart/CartItemRow.tsx
//
// Single line item inside the CartDrawer. Cover thumbnail + title link to
// /item/:id (closes the drawer first); a trailing trash icon removes the
// item via CartContext.

import { Box, IconButton, Typography, CircularProgress } from '@mui/material';
import { Close } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useCart, type CartItem } from '../../contexts/CartContext';
import { PLACEHOLDER_IMAGE_URL } from '../../utils/placeholders';
import { inkstashColors, inkstashFonts, inkstashRadii } from '../../theme/inkstashTokens';

interface Props {
  item: CartItem;
}

export default function CartItemRow({ item }: Props) {
  const navigate = useNavigate();
  const { removeItem, setDrawerOpen } = useCart();
  const [removing, setRemoving] = useState(false);

  const handleOpen = () => {
    setDrawerOpen(false);
    navigate(`/item/${item.listing_id}`);
  };

  const handleRemove = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setRemoving(true);
    try {
      await removeItem(item.listing_id);
    } catch (err) {
      console.error('[CartItemRow] remove failed', err);
      setRemoving(false);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 1.5,
        py: 1.5,
        borderBottom: `1px solid ${inkstashColors.border}`,
        '&:last-of-type': { borderBottom: 'none' },
      }}
    >
      <Box
        component="button"
        type="button"
        onClick={handleOpen}
        sx={{
          width: 64,
          height: 96,
          flexShrink: 0,
          p: 0,
          border: `1px solid ${inkstashColors.border}`,
          borderRadius: inkstashRadii.sm,
          overflow: 'hidden',
          bgcolor: inkstashColors.bgSunken,
          cursor: 'pointer',
          backgroundImage: `url(${item.cover_url ?? PLACEHOLDER_IMAGE_URL})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          transition: 'border-color 140ms ease',
          '&:hover': { borderColor: inkstashColors.brand },
        }}
        aria-label={`Open ${item.title}`}
      />

      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <Typography
          onClick={handleOpen}
          sx={{
            fontFamily: inkstashFonts.ui,
            fontSize: 14,
            fontWeight: 700,
            color: inkstashColors.ink,
            lineHeight: 1.3,
            cursor: 'pointer',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            '&:hover': { color: inkstashColors.brand },
          }}
        >
          {item.title}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75, mt: 0.5 }}>
          <Typography
            sx={{
              fontFamily: inkstashFonts.display,
              fontWeight: 800,
              fontSize: 15,
              color: inkstashColors.ink,
            }}
          >
            ${item.price.toFixed(2)}
          </Typography>
          <Typography
            sx={{
              fontFamily: inkstashFonts.mono,
              fontSize: 11,
              color: inkstashColors.muted,
            }}
          >
            + ${item.shipping_cost.toFixed(2)} ship
          </Typography>
        </Box>
      </Box>

      <IconButton
        onClick={handleRemove}
        disabled={removing}
        size="small"
        sx={{
          alignSelf: 'flex-start',
          color: inkstashColors.muted,
          '&:hover': { color: inkstashColors.brand, bgcolor: inkstashColors.brandSoft },
        }}
        aria-label={`Remove ${item.title} from cart`}
      >
        {removing ? <CircularProgress size={16} /> : <Close fontSize="small" />}
      </IconButton>
    </Box>
  );
}
