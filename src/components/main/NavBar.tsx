import React, { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, Menu, X } from 'lucide-react';
import { supabase } from '../../api/supabase/supabaseClient';
import '../../styles/ui/NavBar.css';
import ThemeToggle from '../ui/ThemeToggle';

// Explicit URL imports to force consistent processing
import logoUrlDark from '../../assets/full-logo-dark.png?url';
import logoUrlLight from '../../assets/full-logo-light.png?url';

interface NavigationLink {
  label: string;
  to: string;
}

// Custom hook for theme detection
const useTheme = (): boolean => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Initialize with current theme state to avoid flash
    const htmlElement = document.documentElement;
    const dataTheme = htmlElement.getAttribute('data-theme');

    // If data-theme is already set, use it
    if (dataTheme) {
      return dataTheme === 'dark';
    }

    // Fallback: check localStorage or system preference
    try {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme) {
        return savedTheme === 'dark';
      }
    } catch (error) {
      // localStorage might not be available
    }

    // Final fallback: system preference
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

    // Initial check after component mounts (in case theme was set after initialization)
    checkTheme();

    // Listen for data-theme attribute changes
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
  const isDarkMode = useTheme();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );
    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = useCallback(async (): Promise<void> => {
    await supabase.auth.signOut();
    navigate('/');
    setSession(null);
  }, [navigate]);

  const toggleMobileMenu = useCallback((): void => {
    setIsOpen(prevState => !prevState);
  }, []);

  const closeMobileMenu = useCallback((): void => {
    setIsOpen(false);
  }, []);

  const bottomLinks: NavigationLink[] = [
    { label: 'Livestreams', to: '/livestreams' },
    { label: 'Auctions', to: '/auctions' },
    { label: 'Browse Pieces', to: '/pieces' },
    { label: 'Browse Artists', to: '/artists' },
  ];

  // Light logo for dark mode, dark logo for light mode
  const currentLogo: string = isDarkMode ? logoUrlDark : logoUrlLight;

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
          {session ? (
            <button className="signout" onClick={handleSignOut}>
              Sign Out
            </button>
          ) : (
            <>
              <Link to="/login" className="login">
                Login
              </Link>
              <Link to="/signup" className="signup">
                Sign up
              </Link>
            </>
          )}
          <ThemeToggle />
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
            {session ? (
              <button
                className="signout"
                onClick={() => {
                  handleSignOut();
                  closeMobileMenu();
                }}
              >
                Sign Out
              </button>
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
