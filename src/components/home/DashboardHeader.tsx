import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Box,
  Button,
  IconButton,
  InputBase,
  Badge,
  Avatar,
  Stack,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Search,
  Bookmark,
  Message,
  Notifications,
  CardGiftcard,
  KeyboardArrowDown,
  AutoAwesome,
  Palette,
  TrendingUp,
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import { useCart } from '../../contexts/CartContext';
import ProfileDropdown from './ProfileDropdown';

export default function DashboardHeader() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getItemCount } = useCart();
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [browseAnchorEl, setBrowseAnchorEl] = useState<null | HTMLElement>(null);

  const cartItemCount = getItemCount();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle search functionality
  };

  const handleBrowseClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setBrowseAnchorEl(event.currentTarget);
  };

  const handleBrowseClose = () => {
    setBrowseAnchorEl(null);
  };

  const handleBrowseNavigation = (path: string) => {
    navigate(path);
    handleBrowseClose();
  };

  return (
    <>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          bgcolor: 'background.paper',
          borderBottom: 1,
          borderColor: 'divider',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
        }}
      >
        <Toolbar
          sx={{
            maxWidth: '1600px',
            width: '100%',
            mx: 'auto',
            px: { xs: 2, md: 4 },
            gap: { xs: 1, md: 2 },
          }}
        >
          {/* Logo */}
          <Box
            onClick={() => navigate('/')}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              cursor: 'pointer',
              transition: 'opacity 0.2s',
              flexShrink: 0,
              '&:hover': {
                opacity: 0.8,
              },
            }}
          >
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <circle cx="20" cy="20" r="18" fill="#000000"/>
              <path d="M20 10L25 15L20 20L15 15L20 10Z" fill="#0078FF"/>
              <path d="M20 20L25 25L20 30L15 25L20 20Z" fill="#0078FF"/>
            </svg>
            <Box
              component="span"
              sx={{
                fontSize: '1.5rem',
                fontWeight: 700,
                color: 'text.primary',
                display: { xs: 'none', sm: 'block' },
              }}
            >
              inkstash
            </Box>
          </Box>

          {/* Navigation Links */}
          <Stack
            direction="row"
            spacing={0.5}
            sx={{
              flexShrink: 0,
              display: { xs: 'none', md: 'flex' },
            }}
          >
            <Button
              onClick={() => navigate('/')}
              sx={{
                px: 2.5,
                py: 1,
                borderRadius: 999,
                fontWeight: 600,
                color: 'white',
                bgcolor: 'primary.main',
                '&:hover': {
                  bgcolor: 'primary.dark',
                },
              }}
            >
              Home
            </Button>
            <Button
              onClick={handleBrowseClick}
              endIcon={<KeyboardArrowDown />}
              sx={{
                px: 2.5,
                py: 1,
                borderRadius: 999,
                fontWeight: 600,
                color: 'text.secondary',
                '&:hover': {
                  bgcolor: 'action.hover',
                  color: 'text.primary',
                },
              }}
            >
              Browse
            </Button>
          </Stack>

          {/* Search Bar */}
          <Box
            component="form"
            onSubmit={handleSearch}
            sx={{
              flex: 1,
              maxWidth: 500,
              position: 'relative',
              display: { xs: 'none', sm: 'flex' },
              alignItems: 'center',
            }}
          >
            <Search
              sx={{
                position: 'absolute',
                left: 16,
                color: 'text.disabled',
                pointerEvents: 'none',
              }}
            />
            <InputBase
              placeholder="Search InkStash"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              size='small'
              sx={{
                width: '100%',
                pl: 3,
                pr: 2,
                py: 1,
                border: 1,
                borderColor: 'divider',
                borderRadius: 999,
                fontSize: '0.9375rem',
                bgcolor: 'grey.50',
                transition: 'all 0.2s',
                '&:focus-within': {
                  borderColor: 'text.primary',
                  bgcolor: 'background.paper',
                },
                '& input::placeholder': {
                  color: 'text.disabled',
                  opacity: 1,
                },
              }}
            />
          </Box>

          {/* Right Side Actions */}
          <Stack
            direction="row"
            spacing={{ xs: 0.5, md: 1 }}
            alignItems="center"
            sx={{ flexShrink: 0 }}
          >
            <Button
              onClick={() => navigate('/sell')}
              sx={{
                px: 2.5,
                py: 1,
                borderRadius: 999,
                fontWeight: 600,
                bgcolor: 'grey.200',
                color: 'text.primary',
                display: { xs: 'none', md: 'inline-flex' },
                '&:hover': {
                  bgcolor: 'grey.300',
                },
              }}
            >
              Become a Seller
            </Button>

            {/* Action Icons */}
            <IconButton
              aria-label="Saved Items"
              onClick={() => navigate('/saved-items')}
              sx={{
                color: 'text.primary',
                '&:hover': {
                  bgcolor: 'action.hover',
                },
              }}
            >
              <Bookmark />
            </IconButton>

            <IconButton
              aria-label="Messages"
              sx={{
                color: 'text.primary',
                '&:hover': {
                  bgcolor: 'action.hover',
                },
              }}
            >
              <Badge badgeContent={2} color="error">
                <Message />
              </Badge>
            </IconButton>

            <IconButton
              aria-label="Notifications"
              sx={{
                color: 'text.primary',
                '&:hover': {
                  bgcolor: 'action.hover',
                },
              }}
            >
              <Notifications />
            </IconButton>

            <IconButton
              aria-label="Gifts"
              sx={{
                color: 'text.primary',
                '&:hover': {
                  bgcolor: 'action.hover',
                },
              }}
            >
              <CardGiftcard />
            </IconButton>

            {/* Profile Picture with Cart Badge */}
            <Badge
              badgeContent={cartItemCount > 0 ? cartItemCount : null}
              color="primary"
              sx={{
                '& .MuiBadge-badge': {
                  top: 4,
                  right: 4,
                  border: '2px solid',
                  borderColor: 'background.paper',
                },
              }}
            >
              <IconButton
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                aria-label="Profile menu"
                sx={{
                  p: 0,
                  border: 2,
                  borderColor: 'divider',
                  transition: 'all 0.2s',
                  '&:hover': {
                    borderColor: 'text.primary',
                    transform: 'scale(1.05)',
                  },
                }}
              >
                {user?.avatar_url ? (
                  <Avatar
                    src={user.avatar_url}
                    alt={user.username}
                    sx={{ width: 44, height: 44 }}
                  />
                ) : (
                  <Avatar
                    sx={{
                      width: 44,
                      height: 44,
                      background: 'linear-gradient(135deg, #0078FF, #00BFFF)',
                      fontWeight: 700,
                      fontSize: '1.125rem',
                    }}
                  >
                    {user?.username?.charAt(0).toUpperCase() || 'U'}
                  </Avatar>
                )}
              </IconButton>
            </Badge>
          </Stack>
        </Toolbar>
      </AppBar>

      {/* Browse Dropdown Menu */}
      <Menu
        anchorEl={browseAnchorEl}
        open={Boolean(browseAnchorEl)}
        onClose={handleBrowseClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        sx={{
          mt: 1,
          '& .MuiPaper-root': {
            borderRadius: 2,
            minWidth: 220,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          },
        }}
      >
        <MenuItem onClick={() => handleBrowseNavigation('/browse-featured')}>
          <ListItemIcon>
            <AutoAwesome fontSize="small" />
          </ListItemIcon>
          <ListItemText>Featured Collectibles</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleBrowseNavigation('/featured-artists')}>
          <ListItemIcon>
            <Palette fontSize="small" />
          </ListItemIcon>
          <ListItemText>Featured Artists</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleBrowseNavigation('/popular-shows')}>
          <ListItemIcon>
            <TrendingUp fontSize="small" />
          </ListItemIcon>
          <ListItemText>Popular Shows</ListItemText>
        </MenuItem>
      </Menu>

      {/* Profile Dropdown */}
      <ProfileDropdown
        isOpen={showProfileDropdown}
        onClose={() => setShowProfileDropdown(false)}
      />
    </>
  );
}
