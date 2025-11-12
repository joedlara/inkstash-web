import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../api/supabase/supabaseClient';
import { cache } from '../utils/cache';
import DashboardHeader from '../components/home/DashboardHeader';
import '../styles/pages/BrowseFeatured.css';

interface FeaturedItem {
  id: string;
  title: string;
  image_url: string;
  current_bid: number;
  buy_now_price?: number;
  end_time: string;
  seller_id: string;
  seller_username?: string;
  seller_avatar?: string;
  seller_verified?: boolean;
  bid_count?: number;
  category: string;
}

export default function BrowseFeatured() {
  const navigate = useNavigate();
  const [items, setItems] = useState<FeaturedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'price' | 'ending' | 'bids'>('price');
  const hasFetched = useRef(false);

  useEffect(() => {
    async function fetchFeaturedItems() {
      // Check cache first
      const cacheKey = `browse-featured-${sortBy}`;
      const cachedData = cache.get<FeaturedItem[]>(cacheKey);

      if (cachedData) {
        setItems(cachedData);
        setLoading(false);
        return;
      }

      // Prevent multiple fetches
      if (hasFetched.current) {
        return;
      }

      hasFetched.current = true;

      try {
        // Determine sort column based on sortBy
        let orderColumn = 'current_bid';
        if (sortBy === 'ending') orderColumn = 'end_time';
        if (sortBy === 'bids') orderColumn = 'bid_count';

        // Fetch auctions
        const { data: auctionData, error } = await supabase
          .from('auctions')
          .select('id, title, image_url, current_bid, buy_now_price, end_time, seller_id, bid_count, category')
          .eq('is_featured', true)
          .order(orderColumn, { ascending: sortBy === 'ending' })
          .limit(50);

        if (error) {
          throw error;
        }

        if (!auctionData || auctionData.length === 0) {
          setItems([]);
          setLoading(false);
          return;
        }

        // Fetch seller info
        const sellerIds = [...new Set(auctionData.map(item => item.seller_id))];
        const { data: sellersData } = await supabase
          .from('users')
          .select('*')
          .in('id', sellerIds);

        // Create seller map
        const sellersMap: Record<string, { username: string; avatar_url: string | null; verified: boolean }> = {};
        if (sellersData) {
          sellersData.forEach((seller: any) => {
            sellersMap[seller.id] = {
              username: seller.username || seller.email?.split('@')[0] || 'Unknown',
              avatar_url: seller.avatar_url || null,
              verified: seller.is_verified || seller.verified || false,
            };
          });
        }

        // Map items with seller info
        const itemsWithDetails: FeaturedItem[] = auctionData.map((item) => ({
          ...item,
          seller_username: sellersMap[item.seller_id]?.username || 'Unknown',
          seller_avatar: sellersMap[item.seller_id]?.avatar_url || null,
          seller_verified: sellersMap[item.seller_id]?.verified || false,
          bid_count: item.bid_count || 0,
        }));

        // Cache the data for 5 minutes
        cache.set(cacheKey, itemsWithDetails, 5 * 60 * 1000);

        setItems(itemsWithDetails);
        setLoading(false);
      } catch (error) {
        setItems([]);
        setLoading(false);
        hasFetched.current = false;
      }
    }

    // Reset hasFetched when sortBy changes
    hasFetched.current = false;
    fetchFeaturedItems();
  }, [sortBy]);

  const calculateTimeRemaining = (endTime: string) => {
    const now = new Date().getTime();
    const end = new Date(endTime).getTime();
    const diff = end - now;

    if (diff <= 0) return 'Ended';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <div className="home authenticated">
      <DashboardHeader />
      <div className="browse-featured-container">
        <div className="browse-header">
          <h1>Featured Collectibles</h1>
          <p className="browse-subtitle">Discover handpicked items from verified sellers</p>
        </div>

        <div className="browse-controls">
          <div className="sort-buttons">
            <button
              className={`sort-button ${sortBy === 'price' ? 'active' : ''}`}
              onClick={() => setSortBy('price')}
            >
              Highest Price
            </button>
            <button
              className={`sort-button ${sortBy === 'ending' ? 'active' : ''}`}
              onClick={() => setSortBy('ending')}
            >
              Ending Soon
            </button>
            <button
              className={`sort-button ${sortBy === 'bids' ? 'active' : ''}`}
              onClick={() => setSortBy('bids')}
            >
              Most Bids
            </button>
          </div>

          <div className="items-count">
            {loading ? 'Loading...' : `${items.length} items`}
          </div>
        </div>

        {loading ? (
          <div className="browse-grid">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="featured-card loading">
                <div className="card-image-skeleton">
                  <div className="loading-shimmer"></div>
                </div>
                <div className="card-details-skeleton">
                  <div className="loading-line title"></div>
                  <div className="loading-line seller"></div>
                  <div className="loading-line price"></div>
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="browse-empty">
            <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <h2>No Featured Items</h2>
            <p>Check back later for featured collectibles</p>
            <button onClick={() => navigate('/')} className="back-home-btn">
              Back to Home
            </button>
          </div>
        ) : (
          <div className="browse-grid">
            {items.map((item) => (
              <div
                key={item.id}
                className="featured-card"
                onClick={() => navigate(`/item/${item.id}`)}
              >
                <div className="card-image-wrapper">
                  <img
                    src={item.image_url || 'https://developers.elementor.com/docs/assets/img/elementor-placeholder-image.png'}
                    alt={item.title}
                    className="card-image"
                  />
                  <div className="featured-badge">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="currentColor"/>
                    </svg>
                  </div>
                  <div className="time-badge">{calculateTimeRemaining(item.end_time)}</div>
                </div>

                <div className="card-details">
                  <h3 className="card-title">{item.title}</h3>
                  <div className="seller-row">
                    <span className="seller-label">By</span>
                    <span className="seller-name">{item.seller_username}</span>
                    {item.seller_verified && (
                      <svg className="verified-icon" width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M22 11.08V12a10 10 0 1 1-5.93-9.14"
                          stroke="#10b981"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <polyline points="22 4 12 14.01 9 11.01" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                  <div className="bid-row">
                    <span className="bid-price">${item.current_bid.toFixed(0)}</span>
                    <span className="bid-divider">|</span>
                    <span className="bid-count">{item.bid_count} bid{item.bid_count !== 1 ? 's' : ''}</span>
                    <button className="auction-button">Bid</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
