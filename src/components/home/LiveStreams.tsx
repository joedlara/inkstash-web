import { useEffect, useState } from 'react';
import { supabase } from '../../api/supabase/supabaseClient';
import { useNavigate } from 'react-router-dom';
import '../../styles/home/LiveStreams.css';

interface LiveStream {
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

export default function LiveStreams() {
  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [sellers, setSellers] = useState<Record<string, Seller>>({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchLiveStreams() {
      setLoading(true);

      // Only fetch live streams
      const { data, error } = await supabase
        .from('auctions')
        .select('*')
        .eq('is_live', true)
        .order('created_at', { ascending: false })
        .limit(24);

      if (error) {
        console.error('Error fetching live streams:', error);
        setLoading(false);
        return;
      }

      // If no data, use dummy data
      if (!data || data.length === 0) {
        const dummyStreams: LiveStream[] = [
          {
            id: 'stream-1',
            title: 'Marvel Rivals Psylocke #1',
            image_url: 'https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=400',
            current_bid: 500,
            buy_now_price: 800,
            end_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
            seller_id: 'seller-1',
            is_live: true,
            category: 'Comic',
            condition: 'Brand New',
          },
          {
            id: 'stream-2',
            title: 'Ultimate X-Men',
            image_url: 'https://images.unsplash.com/photo-1601645191163-3fc0d5d64e35?w=400',
            current_bid: 100,
            buy_now_price: 325,
            end_time: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
            seller_id: 'seller-2',
            is_live: true,
            category: 'Comic',
            condition: 'Like New',
          },
          {
            id: 'stream-3',
            title: 'Galactus Marvel Rivals',
            image_url: 'https://images.unsplash.com/photo-1531259683007-016a7b628fc3?w=400',
            current_bid: 32,
            buy_now_price: 69,
            end_time: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(),
            seller_id: 'seller-3',
            is_live: true,
            category: 'Comics',
            condition: 'Brand New',
          },
        ];

        const dummySellers: Record<string, Seller> = {
          'seller-1': { id: 'seller-1', username: 'jlara18', avatar_url: null, is_verified: true },
          'seller-2': { id: 'seller-2', username: 'falcon', avatar_url: null, is_verified: true },
          'seller-3': { id: 'seller-3', username: 'dynamixjl', avatar_url: null, is_verified: true },
        };

        setStreams(dummyStreams);
        setSellers(dummySellers);
        setLoading(false);
        return;
      }

      setStreams(data || []);

      // Fetch seller info
      const sellerIds = [...new Set(data?.map(a => a.seller_id))];
      if (sellerIds.length > 0) {
        const { data: sellersData } = await supabase
          .from('users')
          .select('id, username, avatar_url')
          .in('id', sellerIds);

        if (sellersData) {
          const sellersMap = sellersData.reduce((acc, seller) => {
            acc[seller.id] = { ...seller, is_verified: true };
            return acc;
          }, {} as Record<string, Seller>);
          setSellers(sellersMap);
        }
      }

      setLoading(false);
    }

    fetchLiveStreams();
  }, []);

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

  const handleStreamClick = (streamId: string) => {
    navigate(`/auctions/${streamId}`);
  };

  if (loading) {
    return (
      <section className="live-streams">
        <div className="streams-container">
          <div className="section-header">
            <h2>Live Streams</h2>
          </div>
          <div className="grid-container">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="stream-card loading">
                <div className="card-image loading-shimmer"></div>
                <div className="card-content">
                  <div className="loading-line"></div>
                  <div className="loading-line short"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (streams.length === 0) {
    return (
      <section className="live-streams">
        <div className="streams-container">
          <div className="section-header">
            <h2>Live Streams</h2>
          </div>
          <div className="empty-state">
            <div className="empty-icon">📡</div>
            <h3>No live streams right now</h3>
            <p>Check back later for live auctions</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="live-streams">
      <div className="streams-container">
        <div className="section-header">
          <h2>Live Streams</h2>
        </div>

        <div className="grid-container">
          {streams.map((stream) => {
            const timeInfo = calculateTimeRemaining(stream.end_time);
            const seller = sellers[stream.seller_id];

            return (
              <div key={stream.id} className="stream-card">
                <div className="card-image-wrapper">
                  <div className="live-badge">
                    <span className="pulse-dot"></span>
                    LIVE
                  </div>
                  <img
                    src={stream.image_url || 'https://developers.elementor.com/docs/assets/img/elementor-placeholder-image.png'}
                    alt={stream.title}
                    className="card-image"
                    onClick={() => handleStreamClick(stream.id)}
                  />
                  <div className={`time-badge ${timeInfo.urgency}`}>
                    {timeInfo.text}
                  </div>
                </div>

                <div className="card-content">
                  <h3 className="card-title" onClick={() => handleStreamClick(stream.id)}>
                    {stream.title}
                  </h3>

                  <div className="card-meta">
                    <span className="condition-badge">{stream.condition}</span>
                    <span className="category-tag">{stream.category}</span>
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
                      <span className="bid-amount">${stream.current_bid.toLocaleString()}</span>
                    </div>
                    <button
                      className="bid-button"
                      onClick={() => handleStreamClick(stream.id)}
                    >
                      Bid
                    </button>
                  </div>

                  {stream.buy_now_price && (
                    <button
                      className="buy-now-button"
                      onClick={() => handleStreamClick(stream.id)}
                    >
                      Buy Now - ${stream.buy_now_price.toLocaleString()}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
