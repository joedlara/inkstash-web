import React, { useCallback, useEffect, useState, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Search,
  Menu,
  X,
  User,
  Settings,
  LogOut,
  ChevronDown,
} from 'lucide-react';
import { supabase } from '../../api/supabase/supabaseClient';
import ThemeToggle from '../ui/ThemeToggle';
import '../../styles/ui/NavBar.css';

// Explicit URL imports to force consistent processing
import logoUrlDark from '../../assets/full-logo-dark.png?url';
import logoUrlLight from '../../assets/full-logo-light.png?url';

interface NavigationLink {
  label: string;
  to: string;
}

interface UserData {
  id: string;
  email: string;
  username: string;
  full_name?: string;
  avatar_url?: string;
}

// Custom hook for theme detection
const useTheme = (): boolean => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const htmlElement = document.documentElement;
    const dataTheme = htmlElement.getAttribute('data-theme');

    if (dataTheme) {
      return dataTheme === 'dark';
    }

    try {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme) {
        return savedTheme === 'dark';
      }
    } catch (error) {
      // localStorage might not be available
    }

    return (
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
    );
  });

  useEffect(() => {
    const checkTheme = (): void => {
      const htmlElement = document.documentElement;
      const dataTheme = htmlElement.getAttribute('data-theme');

      if (dataTheme) {
        const isDark = dataTheme === 'dark';
        setIsDarkMode(prevIsDark => {
          if (prevIsDark !== isDark) {
            return isDark;
          }
          return prevIsDark;
        });
      }
    };

    checkTheme();

    const observer = new MutationObserver(mutations => {
      const themeChanged = mutations.some(
        mutation =>
          mutation.type === 'attributes' &&
          mutation.attributeName === 'data-theme'
      );

      if (themeChanged) {
        checkTheme();
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  return isDarkMode;
};

export default function NavBar(): JSX.Element {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [session, setSession] = useState<any>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [showUserDropdown, setShowUserDropdown] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const isDarkMode = useTheme();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowUserDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Initialize session and user data
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Get initial session
        const {
          data: { session: initialSession },
        } = await supabase.auth.getSession();

        if (initialSession) {
          setSession(initialSession);
          await fetchUserData(initialSession.user.id);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.id);

      setSession(session);

      if (session?.user) {
        await fetchUserData(session.user.id);
      } else {
        setUserData(null);
      }

      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserData = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, username, full_name, avatar_url')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user data:', error);
        return;
      }

      if (data) {
        setUserData(data);
      }
    } catch (error) {
      console.error('Error in fetchUserData:', error);
    }
  };

  const handleSignOut = useCallback(async (): Promise<void> => {
    try {
      setShowUserDropdown(false);
      await supabase.auth.signOut();
      setSession(null);
      setUserData(null);
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }, [navigate]);

  const toggleMobileMenu = useCallback((): void => {
    setIsOpen(prevState => !prevState);
  }, []);

  const closeMobileMenu = useCallback((): void => {
    setIsOpen(false);
  }, []);

  const toggleUserDropdown = useCallback((): void => {
    setShowUserDropdown(prev => !prev);
  }, []);

  const handleAccountSettings = useCallback((): void => {
    setShowUserDropdown(false);
    navigate('/settings');
  }, [navigate]);

  const handleDashboard = useCallback((): void => {
    setShowUserDropdown(false);
    navigate('/dashboard');
  }, [navigate]);

  const bottomLinks: NavigationLink[] = [
    { label: 'Livestreams', to: '/livestreams' },
    { label: 'Auctions', to: '/auctions' },
    { label: 'Browse Pieces', to: '/pieces' },
    { label: 'Browse Artists', to: '/artists' },
  ];

  // Light logo for dark mode, dark logo for light mode
  const currentLogo: string = isDarkMode ? logoUrlDark : logoUrlLight;

  // User avatar with fallback
  const getAvatarUrl = () => {
    if (userData?.avatar_url) {
      return userData.avatar_url;
    }
    return 'https://www.pikpng.com/pngl/b/80-805068_my-profile-icon-blank-profile-picture-circle-clipart.png';
  };

  const getDisplayName = () => {
    return userData?.full_name || userData?.username || 'User';
  };

  const getUsernameDisplay = () => {
    return userData?.username ? `@${userData.username}` : '';
  };

  return (
    <header className="navbar">
      <div className="navbar-top">
        <button
          className="hamburger-btn"
          onClick={toggleMobileMenu}
          aria-label={isOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isOpen}
        >
          {isOpen ? (
            <X size={24} color="#e31b23" />
          ) : (
            <Menu size={24} color="#e31b23" />
          )}
        </button>

        <Link to="/" className="logo" aria-label="InkStash home">
          <img
            src={currentLogo}
            alt="InkStash"
            className="logo-img"
            key={`logo-${isDarkMode ? 'light' : 'dark'}`}
          />
        </Link>

        <div className="top-center">
          <input
            className="search-input"
            type="text"
            placeholder="Search comics…"
            aria-label="Search comics"
          />
          <button className="search-btn" aria-label="Search">
            <Search size={18} />
          </button>
        </div>

        <div className="top-actions">
          {loading ? (
            <div className="auth-loading">
              <div className="loading-spinner"></div>
            </div>
          ) : session && userData ? (
            <div className="user-menu" ref={dropdownRef}>
              <button
                className="user-avatar-button"
                onClick={toggleUserDropdown}
                aria-label="User menu"
                aria-expanded={showUserDropdown}
              >
                <img
                  src={getAvatarUrl()}
                  alt={getDisplayName()}
                  className="user-avatar"
                />
                <ChevronDown
                  size={16}
                  className={`dropdown-chevron ${showUserDropdown ? 'open' : ''}`}
                />
              </button>

              {showUserDropdown && (
                <div className="user-dropdown">
                  <div className="user-info">
                    <img
                      src={getAvatarUrl()}
                      alt={getDisplayName()}
                      className="dropdown-avatar"
                    />
                    <div className="user-details">
                      <div className="user-name">{getDisplayName()}</div>
                      <div className="user-username">
                        {getUsernameDisplay()}
                      </div>
                    </div>
                  </div>

                  <div className="dropdown-divider"></div>

                  <button
                    className="dropdown-item"
                    onClick={handleAccountSettings}
                  >
                    <Settings size={16} />
                    <span>Account Settings</span>
                  </button>

                  <button className="dropdown-item" onClick={handleDashboard}>
                    <User size={16} />
                    <span>Dashboard</span>
                  </button>

                  <div className="dropdown-item theme-toggle-item">
                    <ThemeToggle />
                  </div>

                  <div className="dropdown-divider"></div>

                  <button
                    className="dropdown-item logout-item"
                    onClick={handleSignOut}
                  >
                    <LogOut size={16} />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/login" className="login">
                Login
              </Link>
              <Link to="/signup" className="signup">
                Sign up
              </Link>
              <ThemeToggle />
            </>
          )}
        </div>
      </div>

      {isOpen && (
        <div className="mobile-modal">
          <nav className="mobile-nav">
            {bottomLinks.map(({ label, to }) => (
              <Link
                key={to}
                to={to}
                onClick={closeMobileMenu}
                className={pathname.startsWith(to) ? 'active' : ''}
              >
                {label}
              </Link>
            ))}
            <Link to="/sell" className="sell" onClick={closeMobileMenu}>
              Sell on InkStash
            </Link>
          </nav>
          <div className="mobile-auth">
            {session && userData ? (
              <div className="mobile-user-section">
                <div className="mobile-user-info">
                  <img
                    src={getAvatarUrl()}
                    alt={getDisplayName()}
                    className="mobile-avatar"
                  />
                  <div>
                    <div className="mobile-user-name">{getDisplayName()}</div>
                    <div className="mobile-username">
                      {getUsernameDisplay()}
                    </div>
                  </div>
                </div>
                <button
                  className="mobile-settings"
                  onClick={() => {
                    handleAccountSettings();
                    closeMobileMenu();
                  }}
                >
                  <Settings size={16} />
                  Settings
                </button>
                <button
                  className="mobile-logout"
                  onClick={() => {
                    handleSignOut();
                    closeMobileMenu();
                  }}
                >
                  <LogOut size={16} />
                  Sign Out
                </button>
              </div>
            ) : (
              <>
                <Link to="/login" onClick={closeMobileMenu}>
                  Login
                </Link>
                <Link to="/signup" onClick={closeMobileMenu}>
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      )}

      <div className="navbar-bottom">
        <nav className="bottom-links">
          {bottomLinks.map(({ label, to }) => (
            <Link
              key={to}
              to={to}
              className={pathname.startsWith(to) ? 'active' : ''}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="bottom-actions">
          <Link to="/sell" className="sell">
            Sell on InkStash
          </Link>
          <div className="more-dropdown">More ▾</div>
        </div>
      </div>
      <div className="signup-top-bar" />
    </header>
  );
}
