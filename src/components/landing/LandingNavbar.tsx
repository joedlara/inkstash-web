import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthModal from '../auth/AuthModal';
import '../../styles/landing/LandingNavbar.css';

export default function LandingNavbar() {
  const navigate = useNavigate();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'signup' | 'login'>('signup');
  const [navbarTheme, setNavbarTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    // Use Intersection Observer to detect which section is visible
    const observerOptions = {
      root: null,
      rootMargin: '-50% 0px -50% 0px', // Trigger when section is in the center of viewport
      threshold: 0
    };

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const sectionId = entry.target.id;
          console.log('Visible section:', sectionId);

          // Set theme based on which section is visible
          if (sectionId === 'hero-section-two') {
            // Black background section - use light theme (white text)
            setNavbarTheme('light');
          } else {
            // Blue background sections - use dark theme (black text)
            setNavbarTheme('dark');
          }
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    // Observe all hero sections
    const sections = document.querySelectorAll('[id^="hero-section"]');
    sections.forEach((section) => observer.observe(section));

    return () => {
      sections.forEach((section) => observer.unobserve(section));
    };
  }, []);

  const handleOpenLogin = () => {
    setAuthModalTab('login');
    setShowAuthModal(true);
  };

  const handleOpenSignup = () => {
    setAuthModalTab('signup');
    setShowAuthModal(true);
  };

  return (
    <>
      <nav className={`landing-navbar navbar-${navbarTheme}`}>
        <div className="navbar-container">
          <div className="navbar-logo" onClick={() => navigate('/')}>
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <circle cx="20" cy="20" r="18" fill="currentColor" className="logo-circle"/>
              <path d="M20 10L25 15L20 20L15 15L20 10Z" fill="#0078FF" className="logo-accent"/>
              <path d="M20 20L25 25L20 30L15 25L20 20Z" fill="#0078FF" className="logo-accent"/>
            </svg>
            <span className="logo-text">inkstash</span>
          </div>

          <div className="navbar-links">
            <button className="nav-link" onClick={() => navigate('/sell')}>
              Become a Seller
            </button>
            <button className="nav-button login" onClick={handleOpenLogin}>
              Log in
            </button>
            <button className="nav-button signup" onClick={handleOpenSignup}>
              Sign up
            </button>
          </div>

          <button className="mobile-menu-toggle">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M3 12h18M3 6h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </nav>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        defaultTab={authModalTab}
      />
    </>
  );
}
