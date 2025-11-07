import { useNavigate } from 'react-router-dom';
import '../../styles/home/CTASection.css';

export default function CTASection() {
  const navigate = useNavigate();

  return (
    <section className="cta-section">
      <div className="cta-container">
        <div className="cta-content">
          <h2 className="cta-title">Start Your Collection Today</h2>
          <p className="cta-description">
            Join thousands of collectors and creators. Buy, sell, and discover rare comics,
            collectibles, and original art from verified sellers worldwide.
          </p>

          <div className="cta-features">
            <div className="cta-feature">
              <svg className="feature-icon" width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="22 4 12 14.01 9 11.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Verified Sellers</span>
            </div>
            <div className="cta-feature">
              <svg className="feature-icon" width="24" height="24" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Secure Transactions</span>
            </div>
            <div className="cta-feature">
              <svg className="feature-icon" width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Worldwide Shipping</span>
            </div>
          </div>

          <div className="cta-actions">
            <button className="cta-button primary" onClick={() => navigate('/signup')}>
              Get Started Free
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <button className="cta-button secondary" onClick={() => navigate('/auctions')}>
              Browse Auctions
            </button>
          </div>

          <p className="cta-footnote">
            No credit card required • Free to join • Cancel anytime
          </p>
        </div>

        <div className="cta-visual">
          <div className="visual-grid">
            <div className="visual-card card-1">
              <div className="card-shimmer"></div>
              <span className="card-label">Live Auctions</span>
            </div>
            <div className="visual-card card-2">
              <div className="card-shimmer"></div>
              <span className="card-label">AI Insights</span>
            </div>
            <div className="visual-card card-3">
              <div className="card-shimmer"></div>
              <span className="card-label">Collections</span>
            </div>
            <div className="visual-card card-4">
              <div className="card-shimmer"></div>
              <span className="card-label">Gamification</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
