import { useNavigate } from 'react-router-dom';
import '../../styles/landing/LandingNavbar.css';

export default function LandingNavbar() {
  const navigate = useNavigate();

  return (
    <nav className="landing-navbar">
      <div className="navbar-container">
        <div className="navbar-logo" onClick={() => navigate('/')}>
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="18" fill="#000000"/>
            <path d="M20 10L25 15L20 20L15 15L20 10Z" fill="#0078FF"/>
            <path d="M20 20L25 25L20 30L15 25L20 20Z" fill="#0078FF"/>
          </svg>
          <span className="logo-text">inkstash</span>
        </div>

        <div className="navbar-links">
          <button className="nav-link" onClick={() => navigate('/sell')}>
            Become a Seller
          </button>
          <button className="nav-button login" onClick={() => navigate('/login')}>
            Log in
          </button>
          <button className="nav-button signup" onClick={() => navigate('/signup')}>
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
  );
}
