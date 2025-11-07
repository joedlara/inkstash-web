import { useState } from 'react';
import '../../styles/landing/HeroSectionOne.css';

export default function HeroSectionOne() {
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  return (
    <section className="hero-section-one">
      <div className="hero-content">
        <div className="hero-left">
          <div className="phone-mockup">
            <div className="phone-frame">
              <div className="phone-screen">
                <div className="mock-app">
                  <div className="mock-header">
                    <div className="mock-live-badge">
                      <span className="pulse-dot"></span>
                      LIVE
                    </div>
                    <div className="mock-viewers">2.3k</div>
                  </div>
                  <div className="mock-seller">
                    <div className="mock-avatar"></div>
                    <span>ToyCollector1</span>
                  </div>
                  <div className="mock-item-card">
                    <div className="mock-item-image"></div>
                    <div className="mock-item-info">
                      <div className="mock-title">Graded Black Lotus</div>
                      <div className="mock-bid">$4,500</div>
                    </div>
                  </div>
                  <div className="mock-actions">
                    <button className="mock-bid-btn">Place Bid</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Floating product images */}
          <div className="floating-products">
            <div className="product-float product-1">
              <div className="product-card"></div>
            </div>
            <div className="product-float product-2">
              <div className="product-card"></div>
            </div>
          </div>
        </div>

        <div className="hero-right">
          <h1 className="hero-title">
            The Live Auction
            <br />
            Marketplace
          </h1>
          <p className="hero-subtitle">
            Shop, sell, and connect around the things you love.
          </p>

          <div className="download-section">
            <p className="download-label">Download InkStash</p>
            <div className="qr-code">
              <svg viewBox="0 0 200 200" fill="none">
                {/* Simple QR code pattern */}
                <rect width="200" height="200" fill="white" rx="8"/>
                <rect x="20" y="20" width="50" height="50" fill="black"/>
                <rect x="130" y="20" width="50" height="50" fill="black"/>
                <rect x="20" y="130" width="50" height="50" fill="black"/>
                <rect x="75" y="75" width="50" height="50" fill="black"/>
                <rect x="140" y="140" width="40" height="40" fill="black"/>
                {/* Add more QR pattern rectangles for realism */}
                <rect x="30" y="30" width="30" height="30" fill="white"/>
                <rect x="140" y="30" width="30" height="30" fill="white"/>
                <rect x="30" y="140" width="30" height="30" fill="white"/>
              </svg>
            </div>
          </div>
        </div>
      </div>

      <button
        className={`how-it-works-toggle ${showHowItWorks ? 'active' : ''}`}
        onClick={() => setShowHowItWorks(!showHowItWorks)}
      >
        <svg
          className={`chevron ${showHowItWorks ? 'rotated' : ''}`}
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
        >
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        How it works
      </button>

      {showHowItWorks && (
        <div className="how-it-works-content">
          <div className="steps-container">
            <div className="step">
              <div className="step-number">1</div>
              <h3>Browse Live Auctions</h3>
              <p>Watch sellers showcase rare collectibles in real-time</p>
            </div>
            <div className="step">
              <div className="step-number">2</div>
              <h3>Place Your Bid</h3>
              <p>Compete with other collectors for the items you want</p>
            </div>
            <div className="step">
              <div className="step-number">3</div>
              <h3>Win & Collect</h3>
              <p>Secure your purchase and add to your collection</p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
