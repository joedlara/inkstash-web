import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import '../../styles/home/ProfileDropdown.css';

interface ProfileDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileDropdown({ isOpen, onClose }: ProfileDropdownProps) {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  if (!isOpen) return null;

  const handleSignOut = async () => {
    await signOut();
    onClose();
    navigate('/');
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <>
      <div className="profile-dropdown-overlay" onClick={onClose} />
      <div className="profile-dropdown">
        {/* User Info Section */}
        <div className="profile-dropdown-header">
          <div className="profile-info">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt={user.username} className="profile-avatar-large" />
            ) : (
              <div className="profile-avatar-large placeholder">
                {user?.username?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
            <div className="profile-details">
              <h3 className="profile-username">{user?.username || 'User'}</h3>
              <div className="profile-stats">
                <span><strong>4</strong> Following</span>
                <span className="stat-divider">|</span>
                <span><strong>5</strong> Followers</span>
              </div>
            </div>
          </div>
          <button className="profile-arrow" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* Action Cards Grid */}
        <div className="profile-actions-grid">
          <button className="action-card" onClick={() => handleNavigation('/refer')}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="8" width="18" height="4" rx="1" stroke="currentColor" strokeWidth="2"/>
              <rect x="3" y="12" width="18" height="9" rx="1" stroke="currentColor" strokeWidth="2"/>
              <path d="M12 8V21M12 8H7.5a2.5 2.5 0 1 1 0-5C11 3 12 8 12 8zM12 8h4.5a2.5 2.5 0 0 0 0-5C13 3 12 8 12 8z" stroke="currentColor" strokeWidth="2"/>
            </svg>
            <span>Refer Friends</span>
          </button>

          <button className="action-card" onClick={() => handleNavigation('/sell')}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="8.5" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
              <path d="M20 8v6M23 11h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Become a Seller</span>
          </button>

          <button className="action-card" onClick={() => handleNavigation('/payments')}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <rect x="1" y="4" width="22" height="16" rx="2" stroke="currentColor" strokeWidth="2"/>
              <path d="M1 10h22" stroke="currentColor" strokeWidth="2"/>
            </svg>
            <span>Payments & Shipping</span>
          </button>

          <button className="action-card" onClick={() => handleNavigation('/saved-items')}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Saved</span>
          </button>

          <button className="action-card" onClick={() => handleNavigation('/my-stash')}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M3 6h18M16 10a4 4 0 0 1-8 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>My Stash</span>
          </button>

          <button className="action-card" onClick={() => handleNavigation('/my-stash?tab=history')}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <rect x="2" y="5" width="20" height="12" rx="1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="12" cy="11" r="3" stroke="currentColor" strokeWidth="2"/>
              <path d="M6 5v12M18 5v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span>Purchases</span>
          </button>

          <button className="action-card" onClick={() => handleNavigation('/cart')}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <circle cx="9" cy="21" r="1" stroke="currentColor" strokeWidth="2"/>
              <circle cx="20" cy="21" r="1" stroke="currentColor" strokeWidth="2"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Shopping Cart</span>
          </button>
        </div>

        {/* Menu Items */}
        <div className="profile-menu-items">
          <button className="menu-item" onClick={() => handleNavigation('/friends')}>
            <div className="menu-item-left">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Friends</span>
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          <button className="menu-item" onClick={() => handleNavigation('/settings')}>
            <div className="menu-item-left">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                <path d="M12 1v6m0 6v6M23 12h-6m-6 0H1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M19.07 4.93l-2.12 2.12m-9.9 9.9l-2.12 2.12M4.93 4.93l2.12 2.12m9.9 9.9l2.12 2.12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <span>Account Settings</span>
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          <button className="menu-item" onClick={() => handleNavigation('/help')}>
            <div className="menu-item-left">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                <path d="M12 16v-4m0-4h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <span>Help & Legal</span>
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* Sign Out Button */}
        <button className="sign-out-button" onClick={handleSignOut}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Sign Out
        </button>
      </div>
    </>
  );
}
