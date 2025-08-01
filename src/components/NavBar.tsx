import React from "react"
import { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { Search, Menu, X } from "lucide-react"
import "../styles/NavBar.css"

import logoUrl from "../assets/logo.png"

export default function NavBar() {
  const { pathname } = useLocation()
  const [isOpen, setIsOpen] = useState(false)

  const bottomLinks = [
    { label: "Livestreams", to: "/livestreams" },
    { label: "Auctions", to: "/auctions" },
    { label: "Browse Pieces", to: "/pieces" },
    { label: "Browse Artists", to: "/artists" },
  ]

  return (
    <header className="navbar">
      {/* ────── Top Row ────── */}
      <div className="navbar-top">
        {/* Hamburger on mobile */}
        <button className="hamburger-btn" onClick={() => setIsOpen((v) => !v)}>
          {isOpen ? (
            <X size={24} color="#e31b23" />
          ) : (
            <Menu size={24} color="#e31b23" />
          )}
        </button>

        {/* Logo */}
        <Link to="/" className="logo">
          <img src={logoUrl} alt="InkStash" className="logo-img" />
        </Link>

        {/* Search */}
        <div className="top-center">
          <input
            className="search-input"
            type="text"
            placeholder="Search comics…"
          />
          <button className="search-btn">
            <Search size={18} />
          </button>
        </div>

        {/* Auth buttons */}
        <div className="top-actions">
          <Link to="/login" className="login">
            Login
          </Link>
          <Link to="/signup" className="signup">
            Sign up
          </Link>
        </div>
      </div>

      {/* Full-screen mobile modal */}
      {isOpen && (
        <div className="mobile-modal">
          <nav className="mobile-nav">
            {bottomLinks.map(({ label, to }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setIsOpen(false)}
                className={pathname.startsWith(to) ? "active" : ""}
              >
                {label}
              </Link>
            ))}
            <Link to="/sell" className="sell" onClick={() => setIsOpen(false)}>
              Sell on InkStash
            </Link>
          </nav>
          <div className="mobile-auth">
            <Link to="/login" onClick={() => setIsOpen(false)}>
              Login
            </Link>
            <Link to="/signup" onClick={() => setIsOpen(false)}>
              Sign up
            </Link>
          </div>
        </div>
      )}

      {/* ────── Bottom Row (desktop only) ────── */}
      <div className="navbar-bottom">
        <nav className="bottom-links">
          {bottomLinks.map(({ label, to }) => (
            <Link
              key={to}
              to={to}
              className={pathname.startsWith(to) ? "active" : ""}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="bottom-actions">
          <Link to="/sell" className="sell">
            Sell on InkStash
          </Link>
          <div className="more-dropdown">More ▾</div>
        </div>
      </div>
    </header>
  )
}
