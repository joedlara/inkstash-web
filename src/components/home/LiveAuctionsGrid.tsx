import { useEffect, useState } from 'react';
import { supabase } from '../../api/supabase/supabaseClient';
import { useNavigate } from 'react-router-dom';
import type { CategoryType } from './CategoryNav';
import '../../styles/home/LiveAuctionsGrid.css';

interface Auction {
  id: string;
  title: string;
  image_url: string;
  current_bid: number;
  buy_now_price: number | null;
  end_time: string;
  seller_id: string;
  is_live: boolean;
  category: string;
  condition: string;
}

interface Seller {
  id: string;
  username: string;
  avatar_url: string | null;
  is_verified?: boolean;
}

interface LiveAuctionsGridProps {
  category: CategoryType;
}

export default function LiveAuctionsGrid({ category }: LiveAuctionsGridProps) {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [sellers, setSellers] = useState<Record<string, Seller>>({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchAuctions() {
      setLoading(true);

      let query = supabase
        .from('auctions')
        .select('*')
        .order('is_live', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(24);

      // Filter by category if not 'all'
      if (category !== 'all') {
        const categoryMap: Record<string, string> = {
          'comics': 'Comic',
          'manga': 'Manga',
          'trading-cards': 'Trading Card',
          'figures': 'Figure',
          'original-art': 'Original Art',
          'graded': 'Graded',
          'prints': 'Print',
        };

        const dbCategory = categoryMap[category];
        if (dbCategory) {
          query = query.eq('category', dbCategory);
        }
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching auctions:', error);
        setLoading(false);
        return;
      }

      setAuctions(data || []);

      // Fetch seller info
      const sellerIds = [...new Set(data?.map(a => a.seller_id))];
      if (sellerIds.length > 0) {
        const { data: sellersData } = await supabase
          .from('users')
          .select('id, username, avatar_url')
          .in('id', sellerIds);

        if (sellersData) {
          const sellersMap = sellersData.reduce((acc, seller) => {
            acc[seller.id] = { ...seller, is_verified: true }; // You can add actual verification logic
            return acc;
          }, {} as Record<string, Seller>);
          setSellers(sellersMap);
        }
      }

      setLoading(false);
    }

    fetchAuctions();
  }, [category]);

  const calculateTimeRemaining = (endTime: string) => {
    const now = new Date().getTime();
    const end = new Date(endTime).getTime();
    const diff = end - now;

    if (diff <= 0) return { text: 'Ended', urgency: 'ended' };

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (diff < 60 * 60 * 1000) {
      return { text: `${minutes}m`, urgency: 'critical' };
    }
    if (diff < 24 * 60 * 60 * 1000) {
      return { text: `${hours}h ${minutes}m`, urgency: 'high' };
    }
    return { text: `${days}d ${hours}h`, urgency: 'normal' };
  };

  const handleBidClick = (auctionId: string) => {
    navigate(`/auctions/${auctionId}`);
  };

  if (loading) {
    return (
      <section className="live-auctions-grid">
        <div className="grid-container">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="auction-card loading">
              <div className="card-image loading-shimmer"></div>
              <div className="card-content">
                <div className="loading-line"></div>
                <div className="loading-line short"></div>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (auctions.length === 0) {
    return (
      <section className="live-auctions-grid">
        <div className="empty-state">
          <div className="empty-icon">📦</div>
          <h3>No auctions found</h3>
          <p>Check back later or try a different category</p>
        </div>
      </section>
    );
  }

  return (
    <section className="live-auctions-grid">
      <div className="section-header">
        <h2>Live Auctions</h2>
        <p>{auctions.length} active listings</p>
      </div>

      <div className="grid-container">
        {auctions.map((auction) => {
          const timeInfo = calculateTimeRemaining(auction.end_time);
          const seller = sellers[auction.seller_id];

          return (
            <div key={auction.id} className="auction-card">
              <div className="card-image-wrapper">
                {auction.is_live && (
                  <div className="live-badge">
                    <span className="pulse-dot"></span>
                    LIVE
                  </div>
                )}
                <img
                  src={auction.image_url || 'https://developers.elementor.com/docs/assets/img/elementor-placeholder-image.png'}
                  alt={auction.title}
                  className="card-image"
                  onClick={() => handleBidClick(auction.id)}
                />
                <div className={`time-badge ${timeInfo.urgency}`}>
                  {timeInfo.text}
                </div>
              </div>

              <div className="card-content">
                <h3 className="card-title" onClick={() => handleBidClick(auction.id)}>
                  {auction.title}
                </h3>

                <div className="card-meta">
                  <span className="condition-badge">{auction.condition}</span>
                  <span className="category-tag">{auction.category}</span>
                </div>

                {seller && (
                  <div className="seller-info">
                    <img
                      src={seller.avatar_url || 'https://www.pikpng.com/pngl/b/80-805068_my-profile-icon-blank-profile-picture-circle-clipart.png'}
                      alt={seller.username}
                      className="seller-avatar"
                    />
                    <span className="seller-name">{seller.username}</span>
                    {seller.is_verified && (
                      <svg className="verified-icon" width="16" height="16" viewBox="0 0 24 24" fill="none">
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
                )}

                <div className="card-footer">
                  <div className="bid-info">
                    <span className="bid-label">Current Bid</span>
                    <span className="bid-amount">${auction.current_bid.toLocaleString()}</span>
                  </div>
                  <button
                    className="bid-button"
                    onClick={() => handleBidClick(auction.id)}
                  >
                    Bid
                  </button>
                </div>

                {auction.buy_now_price && (
                  <button
                    className="buy-now-button"
                    onClick={() => handleBidClick(auction.id)}
                  >
                    Buy Now - ${auction.buy_now_price.toLocaleString()}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
