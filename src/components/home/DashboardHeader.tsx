import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import ProfileDropdown from './ProfileDropdown';
import '../../styles/home/DashboardHeader.css';

export default function DashboardHeader() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle search functionality
    console.log('Search:', searchQuery);
  };

  return (
    <>
      <header className="dashboard-header">
        <div className="dashboard-header-container">
          {/* Logo */}
          <div className="dashboard-logo" onClick={() => navigate('/')}>
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <circle cx="20" cy="20" r="18" fill="#000000"/>
              <path d="M20 10L25 15L20 20L15 15L20 10Z" fill="#0078FF"/>
              <path d="M20 20L25 25L20 30L15 25L20 20Z" fill="#0078FF"/>
            </svg>
            <span className="dashboard-logo-text">inkstash</span>
          </div>

          {/* Navigation Links */}
          <div className="dashboard-nav-links">
            <button className="nav-link-btn active" onClick={() => navigate('/')}>Home</button>
            <button className="nav-link-btn">Browse</button>
          </div>

          {/* Search Bar */}
          <form className="dashboard-search" onSubmit={handleSearch}>
            <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
              <path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <input
              type="text"
              placeholder="Search InkStash"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </form>

          {/* Right Side Actions */}
          <div className="dashboard-actions">
            <button className="nav-link-btn become-seller" onClick={() => navigate('/sell')}>
              Become a Seller
            </button>

            {/* Action Icons */}
            <button className="icon-button" aria-label="Favorites">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            <button className="icon-button" aria-label="Messages">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="notification-badge">2</span>
            </button>

            <button className="icon-button" aria-label="Notifications">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            <button className="icon-button" aria-label="Gifts">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="8" width="18" height="4" rx="1" stroke="currentColor" strokeWidth="2"/>
                <rect x="3" y="12" width="18" height="9" rx="1" stroke="currentColor" strokeWidth="2"/>
                <path d="M12 8V21M12 8H7.5a2.5 2.5 0 1 1 0-5C11 3 12 8 12 8zM12 8h4.5a2.5 2.5 0 0 0 0-5C13 3 12 8 12 8z" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </button>

            {/* Profile Picture */}
            <button
              className="profile-button"
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              aria-label="Profile menu"
            >
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt={user.username} />
              ) : (
                <div className="profile-avatar-placeholder">
                  {user?.username?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Profile Dropdown */}
      <ProfileDropdown
        isOpen={showProfileDropdown}
        onClose={() => setShowProfileDropdown(false)}
      />
    </>
  );
}
