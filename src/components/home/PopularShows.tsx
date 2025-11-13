import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../api/supabase/supabaseClient';
import { cache } from '../../utils/cache';
import '../../styles/home/PopularShows.css';

interface PopularShow {
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

export default function PopularShows() {
  const [shows, setShows] = useState<PopularShow[]>([]);
  const [sellers, setSellers] = useState<Record<string, Seller>>({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const hasFetched = useRef(false);

  useEffect(() => {
    async function fetchPopularShows() {
      // Check cache first
      const showsCacheKey = 'popular-shows';
      const sellersCacheKey = 'popular-shows-sellers';
      const cachedShows = cache.get<PopularShow[]>(showsCacheKey);
      const cachedSellers = cache.get<Record<string, Seller>>(sellersCacheKey);

      if (cachedShows && cachedSellers) {
        setShows(cachedShows);
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
        // Fetch popular shows from livestreams table
        const { data: livestreamData, error } = await supabase
          .from('livestreams')
          .select('id, title, description, thumbnail_url, seller_id, is_live, category, current_viewers')
          .eq('is_live', true)
          .order('current_viewers', { ascending: false })
          .limit(6);

        if (error) {
          throw error;
        }

        // If we have data, use it
        if (livestreamData && livestreamData.length > 0) {
          const shows: PopularShow[] = livestreamData.map((stream) => ({
            id: stream.id,
            title: stream.title || 'Untitled',
            description: stream.description,
            thumbnail_url: stream.thumbnail_url || 'https://developers.elementor.com/docs/assets/img/elementor-placeholder-image.png',
            seller_id: stream.seller_id,
            is_live: stream.is_live,
            category: stream.category || 'General',
            current_viewers: stream.current_viewers || 0,
          }));

          // Fetch seller data for each show
          const sellerIds = [...new Set(shows.map(s => s.seller_id))];
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
          cache.set(showsCacheKey, shows, 60 * 1000);
          cache.set(sellersCacheKey, sellersMap, 60 * 1000);

          setShows(shows);
          setSellers(sellersMap);
          setLoading(false);
          return;
        }

        // No live streams available
        setShows([]);
        setSellers({});
        setLoading(false);
      } catch (error) {
        console.error('Error fetching popular shows:', error);
        setShows([]);
        setSellers({});
        setLoading(false);
      }
    }

    fetchPopularShows();
  }, []);

  const handleShowClick = (showId: string) => {
    navigate(`/item/${showId}`);
  };

  if (loading || shows.length === 0) {
    return null;
  }

  return (
    <section className="popular-shows">
      <div className="popular-shows-container">
        <div className="section-header">
          <h2>Popular Shows</h2>
          <button className="show-all-btn" onClick={() => navigate('/browse-popular-lives')}>
            Show All <span className="arrow">›</span>
          </button>
        </div>

        <div className="shows-grid">
          {shows.map((show) => {
            const seller = sellers[show.seller_id];

            return (
              <div key={show.id} className="show-card">
                <div
                  className="show-header"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/seller/${show.seller_id}`);
                  }}
                >
                  <img
                    src={seller?.avatar_url || 'https://www.pikpng.com/pngl/b/80-805068_my-profile-icon-blank-profile-picture-circle-clipart.png'}
                    alt={seller?.username}
                    className="show-avatar"
                  />
                  <span className="show-username">{seller?.username}</span>
                </div>

                <div className="show-image-wrapper" onClick={() => handleShowClick(show.id)}>
                  <div className="live-badge-top">
                    <span className="pulse-dot"></span>
                    Live · {show.current_viewers.toLocaleString()}
                  </div>
                  <img
                    src={show.thumbnail_url || 'https://developers.elementor.com/docs/assets/img/elementor-placeholder-image.png'}
                    alt={show.title}
                    className="show-image"
                  />
                </div>

                <div className="show-content" onClick={() => handleShowClick(show.id)}>
                  <h3 className="show-title">{show.title}</h3>
                  <p className="show-category">{show.category}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
