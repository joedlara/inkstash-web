import NavBar from "../components/NavBar"

import "../styles/Home.css"

import { useEffect, useState } from "react"
import { supabase } from "../api/supabase/supabaseClient"
import Carousel from "../components/Carousel"
import "../styles/Home.css" // your existing styles

interface Auction {
  id: number
  title: string
  image_url: string
}

export default function Home() {
  const [auctions, setAuctions] = useState<Auction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from("auctions")
        .select("id, title, image_url")

      if (error) console.error(error)
      else setAuctions(data || [])
      setLoading(false)
    })()
  }, [])

  return (
    <div className="home">
      <NavBar />
      <Carousel
        items={auctions}
        loading={loading}
        renderItem={(auction) => (
          <>
            <img
              src={auction.image_url}
              alt={auction.title}
              className="carousel-image"
            />
            <div className="badge">69</div>
            <div className="title">{auction.title}</div>
          </>
        )}
      />

      {/* Hero / CTA */}
      <section className="hero-cta">
        <div className="text">
          <h2>The Trusted Marketplace…</h2>
          <p>Buy, sell, and discover rare original…</p>
          <a href="/profile">Claim your username</a>
        </div>
        <div className="avatars">
          {/* map your creator avatars */}
          <img src="https://picsum.photos/200" alt="" />
          {/* … */}
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
