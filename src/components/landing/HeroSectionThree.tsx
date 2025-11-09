import '../../styles/landing/HeroSectionThree.css';

export default function HeroSectionThree() {
  const scrollToTop = () => {
    const firstSection = document.getElementById('hero-section-one');
    if (firstSection) {
      firstSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <section className="hero-section-three" id="hero-section-three">
      <div className="hero-three-content">
        <div className="hero-three-left">
          <p className="hero-three-text">
            From the brands you love, to hard-to-find specialty products.
            There's a deal on whatever you're looking for.
          </p>

          <div className="download-section-three">
            <p className="download-label">Download InkStash</p>
            <div className="qr-code-three">
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

        <div className="hero-three-right">
          <div className="product-showcase">
            <div className="showcase-item showcase-item-1">
              <div className="item-image"></div>
            </div>
            <div className="showcase-item showcase-item-2">
              <div className="item-image"></div>
            </div>
            <div className="showcase-item showcase-item-3">
              <div className="item-image"></div>
            </div>
          </div>
        </div>
      </div>

      <button className="to-top-button" onClick={scrollToTop}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M18 15l-6-6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        To the Top
      </button>
    </section>
  );
}
