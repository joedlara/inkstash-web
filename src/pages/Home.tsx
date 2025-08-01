import NavBar from "../components/NavBar"
import Carousel from "../components/Carousel"
import "../styles/Home.css" // your existing styles

export default function Home() {
  return (
    <div className="home">
      <NavBar />
      <Carousel />

      {/* Hero / CTA */}
      <section className="hero-cta">
        <div className="text">
          <h2>The Trusted Marketplace…</h2>
          <p>Buy, sell, and discover rare original…</p>
          <a href="/profile">Claim your username</a>
        </div>
        <div className="avatars">
          <img src="https://picsum.photos/200" alt="" />
        </div>

        {/* Trust */}
        <section className="trust-stats">
          <div className="stars">
            {/* inline-SVG stars or <span>★</span> */}
            <span>★</span>
            <span>★</span>
            <span>★</span>
            <span>★</span>
            <span>★</span>
          </div>
          <div className="text">
            Trusted by 10,000+ creators, reps, and collectors
          </div>
        </section>
      </section>

      {/* Footer */}
      <footer className="footer">
        &copy; {new Date().getFullYear()} InkStash — Secure, SSL-encrypted
        marketplace.
      </footer>
    </div>
  )
}
