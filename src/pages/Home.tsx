import Carousel from "../components/Carousel"
import MembersCarousel from "../components/MembersCarousel"

import "../styles/Home.css"

export default function Home() {
  const heroAvatars = Array.from({ length: 12 }).map(
    () =>
      "https://www.pikpng.com/pngl/b/80-805068_my-profile-icon-blank-profile-picture-circle-clipart.png"
  )

  return (
    <div className="home">
      <Carousel />

      <section className="hero-cta">
        <div className="hero-left text"></div>
        <div className="hero-left text">
          <h2>The Most Trusted Spot for Rare Comics, Collectibles & Art</h2>
          <p>
            Discover, buy, and sell original comic art, one-of-a-kind
            collectibles, signed issues, and more directly from our community of
            verified artists, reps, and sellers.
          </p>
          <a className="hero-btn" href="/signup">
            Sign Up
          </a>
        </div>
        <div className="hero-right">
          <div className="avatars">
            {heroAvatars.map((src, i) => (
              <img key={i} src={src} alt={`Trusted member ${i + 1}`} />
            ))}
          </div>
          <div className="trust-stats">
            <div className="stars">
              <span>★</span>
              <span>★</span>
              <span>★</span>
              <span>★</span>
              <span>★</span>
            </div>
            <div className="text">
              Trusted by 10,000 creators, reps, and collectors
            </div>
          </div>
        </div>
      </section>

      <MembersCarousel />
    </div>
  )
}
