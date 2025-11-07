import { useEffect, useState } from 'react';
import { supabase } from '../../api/supabase/supabaseClient';
import { useNavigate } from 'react-router-dom';
import '../../styles/home/FeaturedCollectibles.css';

interface FeaturedCollectible {
  id: string;
  title: string;
  image_url: string;
  current_bid: number;
  end_time: string;
  seller_id: string;
  seller_username?: string;
  seller_avatar?: string;
  bid_count?: number;
}

export default function FeaturedCollectibles() {
  const [items, setItems] = useState<FeaturedCollectible[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchFeaturedCollectibles() {
      const { data: auctionData, error } = await supabase
        .from('auctions')
        .select('id, title, image_url, current_bid, end_time, seller_id')
        .order('current_bid', { ascending: false })
        .limit(6);

      if (error) {
        console.error('Error loading featured collectibles:', error);
        setLoading(false);
        return;
      }

      // If no data, use dummy data
      if (!auctionData || auctionData.length === 0) {
        const dummyData: FeaturedCollectible[] = [
          {
            id: 'dummy-1',
            title: 'Marvel Rivals Psylocke #1',
            image_url: 'https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=400',
            current_bid: 500,
            end_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
            seller_id: 'dummy',
            seller_username: 'jlara18',
            seller_avatar: null,
            bid_count: 16,
          },
          {
            id: 'dummy-2',
            title: 'Ultimate X-Men',
            image_url: 'https://images.unsplash.com/photo-1601645191163-3fc0d5d64e35?w=400',
            current_bid: 100,
            end_time: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
            seller_id: 'dummy',
            seller_username: 'falcon',
            seller_avatar: null,
            bid_count: 8,
          },
          {
            id: 'dummy-3',
            title: 'Galactus Marvel Rivals',
            image_url: 'https://images.unsplash.com/photo-1531259683007-016a7b628fc3?w=400',
            current_bid: 32,
            end_time: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(),
            seller_id: 'dummy',
            seller_username: 'dynamixjl',
            seller_avatar: null,
            bid_count: 3,
          },
          {
            id: 'dummy-4',
            title: 'Spider-Man Graded Comic',
            image_url: 'https://images.unsplash.com/photo-1588497859490-85d1c17db96d?w=400',
            current_bid: 750,
            end_time: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
            seller_id: 'dummy',
            seller_username: 'collectibles_pro',
            seller_avatar: null,
            bid_count: 24,
          },
          {
            id: 'dummy-5',
            title: 'Rare Pokemon Card Set',
            image_url: 'https://images.unsplash.com/photo-1606503153255-59d8b8b82176?w=400',
            current_bid: 1200,
            end_time: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
            seller_id: 'dummy',
            seller_username: 'pokemon_master',
            seller_avatar: null,
            bid_count: 45,
          },
          {
            id: 'dummy-6',
            title: 'Vintage Action Figure',
            image_url: 'https://images.unsplash.com/photo-1530032623160-77f431a91ff8?w=400',
            current_bid: 350,
            end_time: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
            seller_id: 'dummy',
            seller_username: 'vintage_toys',
            seller_avatar: null,
            bid_count: 12,
          },
        ];
        setItems(dummyData);
        setLoading(false);
        return;
      }

      // Fetch seller info and bid count for each item
      const itemsWithDetails = await Promise.all(
        (auctionData || []).map(async (item) => {
          const { data: userData } = await supabase
            .from('users')
            .select('username, avatar_url')
            .eq('id', item.seller_id)
            .single();

          // Get bid count (mock for now - you can add actual bid counting later)
          const bid_count = Math.floor(Math.random() * 50) + 1;

          return {
            ...item,
            seller_username: userData?.username || 'Unknown',
            seller_avatar: userData?.avatar_url || null,
            bid_count,
          };
        })
      );

      setItems(itemsWithDetails);
      setLoading(false);
    }

    fetchFeaturedCollectibles();
  }, []);

  const calculateTimeRemaining = (endTime: string) => {
    const now = new Date().getTime();
    const end = new Date(endTime).getTime();
    const diff = end - now;

    if (diff <= 0) return 'Ended';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days} Day${days > 1 ? 's' : ''} ${hours} Hr${hours !== 1 ? 's' : ''}`;
    if (hours > 0) return `${hours} Hr${hours !== 1 ? 's' : ''} ${minutes} Min${minutes !== 1 ? 's' : ''}`;
    return `${minutes} Min${minutes !== 1 ? 's' : ''}`;
  };

  const handleItemClick = (itemId: string) => {
    navigate(`/auction/${itemId}`);
  };

  if (loading) {
    return (
      <section className="featured-collectibles">
        <div className="featured-container">
          <div className="section-header">
            <h2>Featured Collectibles</h2>
          </div>
          <div className="collectibles-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="collectible-card loading">
                <div className="card-image-area loading-shimmer"></div>
                <div className="card-details">
                  <div className="loading-line"></div>
                  <div className="loading-line"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <section className="featured-collectibles">
      <div className="featured-container">
        <div className="section-header">
          <h2>Featured Collectibles</h2>
        </div>

        <div className="collectibles-grid">
          {items.map((item) => {
            const timeRemaining = calculateTimeRemaining(item.end_time);

            return (
              <div
                key={item.id}
                className="collectible-card"
                onClick={() => handleItemClick(item.id)}
              >
                <div className="card-image-area">
                  <div className="featured-badge">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" fill="currentColor"/>
                      <path d="M12 7v5l3 3" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    Featured
                  </div>
                  <div className="time-badge">{timeRemaining}</div>
                  <img
                    src={
                      item.image_url ||
                      'https://developers.elementor.com/docs/assets/img/elementor-placeholder-image.png'
                    }
                    alt={item.title}
                    className="card-image"
                  />
                </div>

                <div className="card-details">
                  <h3 className="card-title">{item.title}</h3>
                  <div className="seller-row">
                    <span className="seller-label">By</span>
                    <img
                      src={
                        item.seller_avatar ||
                        'https://www.pikpng.com/pngl/b/80-805068_my-profile-icon-blank-profile-picture-circle-clipart.png'
                      }
                      alt={item.seller_username}
                      className="seller-avatar"
                    />
                    <span className="seller-name">{item.seller_username}</span>
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
                  </div>
                  <div className="bid-row">
                    <span className="bid-price">${item.current_bid.toFixed(0)}</span>
                    <span className="bid-divider">|</span>
                    <span className="bid-count">{item.bid_count} bid{item.bid_count !== 1 ? 's' : ''}</span>
                    <span className="auction-label">Auction</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
