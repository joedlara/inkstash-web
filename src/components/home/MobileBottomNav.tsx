import { useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { Badge, Avatar } from '@mui/material';
import { useAuth } from '../../hooks/useAuth';
import { useCart } from '../../contexts/CartContext';
import ProfileDropdown from './ProfileDropdown';
import '../../styles/home/MobileBottomNav.css';

export default function MobileBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { getItemCount } = useCart();
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  const cartItemCount = getItemCount();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <>
      <nav className="mobile-bottom-nav">
        {/* Home */}
        <button
          className={`nav-item ${isActive('/') ? 'active' : ''}`}
          onClick={() => navigate('/')}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <polyline
              points="9 22 9 12 15 12 15 22"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>Home</span>
        </button>

        {/* Categories */}
        <button
          className={`nav-item ${isActive('/browse') ? 'active' : ''}`}
          onClick={() => navigate('/browse')}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
            <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
            <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
            <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
          </svg>
          <span>Categories</span>
        </button>

        {/* Sell (Plus Icon) */}
        <button
          className={`nav-item sell-button ${isActive('/sell') ? 'active' : ''}`}
          onClick={() => navigate('/sell')}
        >
          <div className="sell-icon-wrapper">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 5v14M5 12h14"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span>Sell</span>
        </button>

        {/* My Stash */}
        <button
          className={`nav-item ${isActive('/my-stash') ? 'active' : ''}`}
          onClick={() => navigate('/my-stash')}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M3 6h18M16 10a4 4 0 0 1-8 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>My Stash</span>
        </button>

        {/* Account */}
        <button
          className="nav-item profile-nav-item"
          onClick={() => setShowProfileDropdown(true)}
        >
          <Badge
            badgeContent={cartItemCount > 0 ? cartItemCount : null}
            color="primary"
            sx={{
              '& .MuiBadge-badge': {
                top: -4,
                right: -4,
                fontSize: '0.625rem',
                height: 18,
                minWidth: 18,
                border: '2px solid white',
              },
            }}
          >
            {user?.avatar_url ? (
              <Avatar
                src={user.avatar_url}
                alt={user.username}
                sx={{ width: 28, height: 28 }}
              />
            ) : (
              <Avatar
                sx={{
                  width: 28,
                  height: 28,
                  background: 'linear-gradient(135deg, #0078FF, #00BFFF)',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                }}
              >
                {user?.username?.charAt(0).toUpperCase() || 'U'}
              </Avatar>
            )}
          </Badge>
          <span>Account</span>
        </button>
      </nav>

      {/* Profile Dropdown */}
      <ProfileDropdown
        isOpen={showProfileDropdown}
        onClose={() => setShowProfileDropdown(false)}
      />
    </>
  );
}