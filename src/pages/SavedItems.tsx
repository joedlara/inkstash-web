import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getUserSavedAuctions } from '../api/auctions/auctionInteractions';
import DashboardHeader from '../components/home/DashboardHeader';
import { cache } from '../utils/cache';
import '../styles/pages/SavedItems.css';

interface Auction {
  id: string;
  title: string;
  description: string;
  image_url: string;
  current_bid: number;
  buy_now_price?: number;
  end_time: string;
  category: string;
  artist?: string;
  seller_id: string;
  us_shipping: number;
  international_shipping: number;
}

interface SavedAuction {
  auction_id: string;
  created_at: string;
  auctions: Auction | Auction[];
}

export default function SavedItems() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [savedItems, setSavedItems] = useState<SavedAuction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetched = useRef(false);

  useEffect(() => {
    async function fetchSavedItems() {
      if (!user) {
        setError('Please log in to view your saved items');
        setLoading(false);
        return;
      }

      // Check cache first
      const cacheKey = `saved-items-${user.id}`;
      const cachedData = cache.get<SavedAuction[]>(cacheKey);

      if (cachedData) {
        setSavedItems(cachedData);
        setLoading(false);
        return;
      }

      // Prevent multiple fetches
      if (hasFetched.current) {
        return;
      }

      hasFetched.current = true;

      try {
        const data = await getUserSavedAuctions(user.id);

        // Store in cache for 5 minutes
        cache.set(cacheKey, data, 5 * 60 * 1000);
        setSavedItems(data);
      } catch (err) {
        setError('Failed to load saved items. Please try again.');
        hasFetched.current = false; // Allow retry on error
      } finally {
        setLoading(false);
      }
    }

    fetchSavedItems();
  }, [user]);

  const calculateTimeRemaining = (endTime: string) => {
    const now = new Date().getTime();
    const end = new Date(endTime).getTime();
    const distance = end - now;

    if (distance < 0) {
      return 'Ended';
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
      return `${days}d ${hours}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  if (!user) {
    return (
      <div className="home authenticated">
        <DashboardHeader />
        <div className="saved-items-container">
          <div className="saved-items-empty">
            <h2>Please Log In</h2>
            <p>You need to be logged in to view your saved items.</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="home authenticated">
        <DashboardHeader />
        <div className="saved-items-container">
          <div className="saved-items-loading">
            <div className="loading-spinner"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="home authenticated">
        <DashboardHeader />
        <div className="saved-items-container">
          <div className="saved-items-error">
            <h2>Error</h2>
            <p>{error}</p>
            <button onClick={() => navigate('/')} className="back-home-btn">
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="home authenticated">
      <DashboardHeader />
      <div className="saved-items-container">
        <div className="saved-items-header">
          <h1>Saved Items</h1>
          <p className="saved-items-count">
            {savedItems.length} {savedItems.length === 1 ? 'item' : 'items'}
          </p>
        </div>

        {savedItems.length === 0 ? (
          <div className="saved-items-empty">
            <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <h2>No Saved Items Yet</h2>
            <p>Start saving items you're interested in by clicking the bookmark icon on any auction.</p>
            <button onClick={() => navigate('/')} className="browse-btn">
              Browse Auctions
            </button>
          </div>
        ) : (
          <div className="saved-items-grid">
            {savedItems.map((item) => {
              const auction = Array.isArray(item.auctions) ? item.auctions[0] : item.auctions;
              if (!auction) return null;

              return (
                <div
                  key={item.auction_id}
                  className="saved-item-card"
                  onClick={() => navigate(`/item/${item.auction_id}`)}
                >
                  <div className="saved-item-image-wrapper">
                    <img
                      src={auction.image_url || 'https://developers.elementor.com/docs/assets/img/elementor-placeholder-image.png'}
                      alt={auction.title}
                      className="saved-item-image"
                    />
                    <div className="saved-item-time-remaining">
                      {calculateTimeRemaining(auction.end_time)}
                    </div>
                  </div>

                  <div className="saved-item-details">
                    <h3 className="saved-item-title">{auction.title}</h3>

                    {auction.artist && (
                      <p className="saved-item-artist">{auction.artist}</p>
                    )}

                    <div className="saved-item-pricing">
                      <div className="saved-item-current-bid">
                        <span className="bid-label">Current Bid</span>
                        <span className="bid-amount">${auction.current_bid}</span>
                      </div>

                      {auction.buy_now_price && (
                        <div className="saved-item-buy-now">
                          <span className="buy-now-label">Buy Now</span>
                          <span className="buy-now-amount">${auction.buy_now_price}</span>
                        </div>
                      )}
                    </div>

                    <div className="saved-item-meta">
                      <span className="saved-item-category">{auction.category}</span>
                      <span className="saved-item-date">
                        Saved {new Date(item.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
