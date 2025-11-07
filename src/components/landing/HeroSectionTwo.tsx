import '../../styles/landing/HeroSectionTwo.css';

export default function HeroSectionTwo() {
  return (
    <section className="hero-section-two">
      <div className="hero-two-content">
        <div className="hero-two-left">
          <h2 className="hero-two-title">Join In the Fun</h2>
          <p className="hero-two-description">
            Take part in fast-paced auctions, incredible flash sales, live show
            giveaways, and so much more.
          </p>

          <div className="download-section-two">
            <p className="download-label">Download InkStash</p>
            <div className="qr-code-two">
              <svg viewBox="0 0 200 200" fill="none">
                <rect width="200" height="200" fill="white" rx="8"/>
                <rect x="20" y="20" width="50" height="50" fill="black"/>
                <rect x="130" y="20" width="50" height="50" fill="black"/>
                <rect x="20" y="130" width="50" height="50" fill="black"/>
                <rect x="75" y="75" width="50" height="50" fill="black"/>
                <rect x="140" y="140" width="40" height="40" fill="black"/>
                <rect x="30" y="30" width="30" height="30" fill="white"/>
                <rect x="140" y="30" width="30" height="30" fill="white"/>
                <rect x="30" y="140" width="30" height="30" fill="white"/>
              </svg>
            </div>
          </div>
        </div>

        <div className="hero-two-right">
          <div className="phone-mockup-two">
            <div className="phone-frame-two">
              <div className="phone-screen-two">
                <div className="mock-app-two">
                  {/* Live stream interface */}
                  <div className="mock-video-area">
                    <div className="mock-streamer-badge">
                      <div className="mock-streamer-avatar"></div>
                      <span>chasingthegrandmore</span>
                      <span className="mock-viewer-count">34</span>
                    </div>

                    <div className="mock-live-indicator">
                      <span className="pulse-dot-two"></span>
                      LIVE
                    </div>
                  </div>

                  {/* Bottom info section */}
                  <div className="mock-bottom-section">
                    <div className="mock-username-section">
                      <div className="mock-small-avatar"></div>
                      <span>@fashionista</span>
                    </div>

                    <div className="mock-item-details">
                      <div className="mock-item-name">Mom brown long zippy wallet</div>
                      <div className="mock-price-section">
                        <span className="mock-retail">Retail $450</span>
                        <span className="mock-current-price">$225</span>
                      </div>
                      <div className="mock-shipping">
                        <span>Shipping & Tax</span>
                        <span>1 Available</span>
                      </div>
                    </div>

                    <button className="mock-buy-now-btn">Buy It Now</button>
                  </div>

                  {/* Say something input */}
                  <div className="mock-input">
                    <span>Say something...</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="navigation-buttons">
        <button className="nav-arrow" aria-label="Previous section">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M18 15l-6-6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <button className="more-button">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          More
        </button>
      </div>
    </section>
  );
}
