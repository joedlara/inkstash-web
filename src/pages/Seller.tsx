import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthModal from '../components/auth/AuthModal';
import '../styles/pages/Seller.css';

export default function Seller() {
  const navigate = useNavigate();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleGetStarted = () => {
    setShowAuthModal(true);
  };

  return (
    <div className="seller-page">
      {/* Navigation */}
      <nav className="seller-navbar">
        <div className="seller-navbar-container">
          <div className="seller-logo" onClick={() => navigate('/')}>
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <circle cx="20" cy="20" r="18" fill="#000000"/>
              <path d="M20 10L25 15L20 20L15 15L20 10Z" fill="#0078FF"/>
              <path d="M20 20L25 25L20 30L15 25L20 20Z" fill="#0078FF"/>
            </svg>
            <span className="seller-logo-text">inkstash</span>
          </div>
          <button className="seller-nav-button" onClick={handleGetStarted}>
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="seller-hero">
        <div className="seller-hero-content">
          <h1 className="seller-hero-title">Turn Your Passion Into Profit</h1>
          <p className="seller-hero-subtitle">
            Join thousands of sellers who are building their business through live auctions.
            Share your collection, connect with enthusiasts, and grow your income.
          </p>
          <button className="seller-cta-button" onClick={handleGetStarted}>
            Start Selling Today
          </button>

          <div className="seller-stats">
            <div className="stat-item">
              <div className="stat-number">$50M+</div>
              <div className="stat-label">Paid to Sellers</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">10K+</div>
              <div className="stat-label">Active Sellers</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">1M+</div>
              <div className="stat-label">Items Sold</div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="seller-benefits">
        <h2 className="section-title">Why Sell on InkStash?</h2>
        <div className="benefits-grid">
          <div className="benefit-card">
            <div className="benefit-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="#0078FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 17L12 22L22 17" stroke="#0078FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="#0078FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3 className="benefit-title">Live Engagement</h3>
            <p className="benefit-description">
              Connect with buyers in real-time through live streaming auctions. Build relationships
              and create excitement around your items.
            </p>
          </div>

          <div className="benefit-card">
            <div className="benefit-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" stroke="#0078FF" strokeWidth="2"/>
                <path d="M12 6v6l4 2" stroke="#0078FF" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <h3 className="benefit-title">Quick Payouts</h3>
            <p className="benefit-description">
              Get paid fast with our streamlined payment system. Funds are transferred to your
              account within 2-3 business days.
            </p>
          </div>

          <div className="benefit-card">
            <div className="benefit-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="#0078FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="9" cy="7" r="4" stroke="#0078FF" strokeWidth="2"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="#0078FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="#0078FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3 className="benefit-title">Built-in Audience</h3>
            <p className="benefit-description">
              Access thousands of active collectors and enthusiasts looking for unique items.
              No need to build an audience from scratch.
            </p>
          </div>

          <div className="benefit-card">
            <div className="benefit-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="11" width="18" height="11" rx="2" stroke="#0078FF" strokeWidth="2"/>
                <path d="M7 11V7a5 5 0 0110 0v4" stroke="#0078FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3 className="benefit-title">Safe & Secure</h3>
            <p className="benefit-description">
              Protected payments and verified buyers. We handle the transactions so you can
              focus on selling.
            </p>
          </div>

          <div className="benefit-card">
            <div className="benefit-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" stroke="#0078FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" stroke="#0078FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="12" y1="22.08" x2="12" y2="12" stroke="#0078FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3 className="benefit-title">Easy Shipping</h3>
            <p className="benefit-description">
              Integrated shipping solutions and prepaid labels make fulfillment simple.
              Ship directly from our dashboard.
            </p>
          </div>

          <div className="benefit-card">
            <div className="benefit-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76z" stroke="#0078FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 8v4l2 2" stroke="#0078FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3 className="benefit-title">Flexible Schedule</h3>
            <p className="benefit-description">
              Go live whenever works for you. Sell on your own schedule and build your business
              at your own pace.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="seller-how-it-works">
        <h2 className="section-title">How It Works</h2>
        <div className="steps-container">
          <div className="step-card">
            <div className="step-number">1</div>
            <h3 className="step-title">Sign Up & Set Up</h3>
            <p className="step-description">
              Create your seller account in minutes. Complete verification and set up your payment information.
            </p>
          </div>

          <div className="step-card">
            <div className="step-number">2</div>
            <h3 className="step-title">List Your Items</h3>
            <p className="step-description">
              Upload photos and descriptions of items you want to sell. Set starting bids and reserve prices.
            </p>
          </div>

          <div className="step-card">
            <div className="step-number">3</div>
            <h3 className="step-title">Go Live</h3>
            <p className="step-description">
              Start your live auction stream. Showcase items, engage with bidders, and watch the excitement build.
            </p>
          </div>

          <div className="step-card">
            <div className="step-number">4</div>
            <h3 className="step-title">Ship & Get Paid</h3>
            <p className="step-description">
              Pack and ship sold items using our integrated shipping tools. Receive payment within 2-3 days.
            </p>
          </div>
        </div>
      </section>

      {/* Success Stories */}
      <section className="seller-testimonials">
        <h2 className="section-title">Success Stories</h2>
        <div className="testimonials-grid">
          <div className="testimonial-card">
            <div className="testimonial-stars">★★★★★</div>
            <p className="testimonial-text">
              "I've been selling collectibles for years, but InkStash completely changed my business.
              The live format creates so much excitement, and I'm making 3x what I did on other platforms!"
            </p>
            <div className="testimonial-author">
              <div className="author-avatar"></div>
              <div className="author-info">
                <div className="author-name">Sarah M.</div>
                <div className="author-title">Trading Card Seller</div>
              </div>
            </div>
          </div>

          <div className="testimonial-card">
            <div className="testimonial-stars">★★★★★</div>
            <p className="testimonial-text">
              "The community on InkStash is incredible. I've built a loyal following who tune in
              every week. It's not just about selling—it's about connecting with fellow enthusiasts."
            </p>
            <div className="testimonial-author">
              <div className="author-avatar"></div>
              <div className="author-info">
                <div className="author-name">Marcus R.</div>
                <div className="author-title">Vintage Toy Collector</div>
              </div>
            </div>
          </div>

          <div className="testimonial-card">
            <div className="testimonial-stars">★★★★★</div>
            <p className="testimonial-text">
              "From setup to first sale took less than a day. The platform is so easy to use,
              and the support team is always there when I need help. Highly recommend!"
            </p>
            <div className="testimonial-author">
              <div className="author-avatar"></div>
              <div className="author-info">
                <div className="author-name">Jennifer L.</div>
                <div className="author-title">Comic Book Seller</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="seller-final-cta">
        <h2 className="final-cta-title">Ready to Start Selling?</h2>
        <p className="final-cta-subtitle">
          Join thousands of successful sellers and turn your passion into profit today.
        </p>
        <button className="seller-cta-button large" onClick={handleGetStarted}>
          Get Started Now
        </button>
      </section>

      {/* Footer */}
      <footer className="seller-footer">
        <div className="seller-footer-content">
          <div className="footer-links">
            <a href="/">Home</a>
            <a href="/about">About</a>
            <a href="/help">Help Center</a>
            <a href="/terms">Terms</a>
            <a href="/privacy">Privacy</a>
          </div>
          <p className="footer-copyright">© 2025 InkStash. All rights reserved.</p>
        </div>
      </footer>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        defaultTab="signup"
      />
    </div>
  );
}
