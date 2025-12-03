import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../api/supabase/supabaseClient';
import { cache } from '../../utils/cache';
import '../../styles/home/LiveStreams.css';

interface LiveStream {
  id: string;
  title: string;
  description?: string;
  thumbnail_url: string;
  seller_id: string;
  is_live: boolean;
  category: string;
  current_viewers: number;
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
  const hasFetched = useRef(false);

  useEffect(() => {
    async function fetchLiveStreams() {
      // Check cache first
      const streamsCacheKey = 'live-streams';
      const sellersCacheKey = 'live-streams-sellers';
      const cachedStreams = cache.get<LiveStream[]>(streamsCacheKey);
      const cachedSellers = cache.get<Record<string, Seller>>(sellersCacheKey);

      if (cachedStreams && cachedSellers) {
        setStreams(cachedStreams);
        setSellers(cachedSellers);
        setLoading(false);
        return;
      }

      // Prevent multiple fetches
      if (hasFetched.current) {
        return;
      }

      hasFetched.current = true;

      try {
        // Fetch live streams from database
        const { data: livestreamData, error } = await supabase
          .from('livestreams')
          .select('id, title, description, thumbnail_url, seller_id, is_live, category, current_viewers')
          .eq('is_live', true)
          .order('current_viewers', { ascending: false })
          .limit(15);

        if (error) {
          throw error;
        }

        // If we have data, use it
        if (livestreamData && livestreamData.length > 0) {
          const streams: LiveStream[] = livestreamData.map((stream) => ({
            id: stream.id,
            title: stream.title || 'Untitled',
            description: stream.description,
            thumbnail_url: stream.thumbnail_url || 'https://developers.elementor.com/docs/assets/img/elementor-placeholder-image.png',
            seller_id: stream.seller_id,
            is_live: stream.is_live,
            category: stream.category || 'General',
            current_viewers: stream.current_viewers || 0,
          }));

          // Fetch seller data for each stream
          const sellerIds = [...new Set(streams.map(s => s.seller_id))];
          const { data: sellersData } = await supabase
            .from('users')
            .select('*')
            .in('id', sellerIds);

          const sellersMap: Record<string, Seller> = {};
          if (sellersData) {
            sellersData.forEach((seller) => {
              sellersMap[seller.id] = {
                id: seller.id,
                username: seller.username || seller.email?.split('@')[0] || 'Unknown',
                avatar_url: seller.avatar_url || null,
                is_verified: seller.is_verified || seller.verified || false,
              };
            });
          }

          // Cache the data for 1 minute (live streams change frequently)
          cache.set(streamsCacheKey, streams, 60 * 1000);
          cache.set(sellersCacheKey, sellersMap, 60 * 1000);

          setStreams(streams);
          setSellers(sellersMap);
        }

        setLoading(false);
      } catch (error) {
        console.error('Error fetching live streams:', error);
        setStreams([]);
        setSellers({});
        setLoading(false);
      }
    }

    fetchLiveStreams();
  }, []);

  const handleStreamClick = (streamId: string) => {
    navigate(`/item/${streamId}`);
  };

  if (loading) {
    return (
      <section className="livestreams-section">
        <h2 className="livestreams-title">Live Streams</h2>
        <div className="livestreams-grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <div className="livestreams-skeleton-avatar" />
                <div className="livestreams-skeleton-username" />
              </div>
              <div className="livestreams-skeleton-thumbnail" />
              <div style={{ paddingTop: '12px' }}>
                <div className="livestreams-skeleton-title" />
                <div className="livestreams-skeleton-description" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (streams.length === 0) {
    return (
      <section className="livestreams-section">
        <h2 className="livestreams-title">Live Streams</h2>
        <div className="livestreams-empty">
          <div className="livestreams-empty-icon">📡</div>
          <h3 className="livestreams-empty-title">No live streams right now</h3>
          <p className="livestreams-empty-text">Check back later for live auctions</p>
        </div>
      </section>
    );
  }

  return (
    <section className="livestreams-section">
      <h2 className="livestreams-title">Live Streams</h2>

      <div className="livestreams-grid">
        {streams.map((stream) => {
          const seller = sellers[stream.seller_id];

          return (
            <div key={stream.id} className="livestreams-card">
              {/* Seller Info */}
              <div
                className="livestreams-seller"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/@${seller?.username}`);
                }}
              >
                <img
                  src={seller?.avatar_url || 'https://www.pikpng.com/pngl/b/80-805068_my-profile-icon-blank-profile-picture-circle-clipart.png'}
                  alt={seller?.username}
                  className="livestreams-seller-avatar"
                />
                <span className="livestreams-seller-username">
                  {seller?.username}
                </span>
              </div>

              {/* Thumbnail */}
              <div
                className="livestreams-thumbnail"
                onClick={() => handleStreamClick(stream.id)}
              >
                {/* Live Badge */}
                <div className="livestreams-live-badge">
                  <span className="livestreams-live-dot" />
                  Live · {stream.current_viewers.toLocaleString()}
                </div>

                {/* Thumbnail Image */}
                <img
                  src={stream.thumbnail_url || 'https://developers.elementor.com/docs/assets/img/elementor-placeholder-image.png'}
                  alt={stream.title}
                  className="livestreams-thumbnail-image"
                />
              </div>

              {/* Stream Info */}
              <div
                className="livestreams-info"
                onClick={() => handleStreamClick(stream.id)}
              >
                <h3 className="livestreams-title-text">
                  {stream.title}
                </h3>
                <div className="livestreams-meta">
                  <span
                    className="livestreams-category"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/browse?category=${stream.category}`);
                    }}
                  >
                    {stream.category}
                  </span>
                  {stream.description && (
                    <span className="livestreams-description">
                      {stream.description}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
