import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../api/supabase/supabaseClient';
import '../../styles/home/PopularShows.css';

interface PopularShow {
  id: string;
  title: string;
  description?: string;
  image_url: string;
  seller_id: string;
  is_live: boolean;
  category: string;
  viewer_count: number;
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

  useEffect(() => {
    async function fetchPopularShows() {
      try {
        // Fetch from database
        const { data: auctionData, error } = await supabase
          .from('auctions')
          .select('id, title, description, image_url, seller_id, category, viewer_count')
          .order('current_bid', { ascending: false })
          .limit(6);

        if (error) {
          console.error('Error loading popular shows:', error);
          throw error;
        }

        // If we have data, use it
        if (auctionData && auctionData.length > 0) {
          const shows: PopularShow[] = auctionData.map((auction) => ({
            id: auction.id,
            title: auction.title || 'Untitled',
            description: auction.description,
            image_url: auction.image_url || 'https://developers.elementor.com/docs/assets/img/elementor-placeholder-image.png',
            seller_id: auction.seller_id,
            is_live: true,
            category: auction.category || 'General',
            viewer_count: auction.viewer_count || 0,
          }));

          setShows(shows);

          // Fetch seller data for each show
          const sellerIds = [...new Set(shows.map(s => s.seller_id))];
          const { data: sellersData } = await supabase
            .from('users')
            .select('id, username, avatar_url, verified')
            .in('id', sellerIds);

          if (sellersData) {
            const sellersMap: Record<string, Seller> = {};
            sellersData.forEach((seller) => {
              sellersMap[seller.id] = {
                id: seller.id,
                username: seller.username || 'Unknown',
                avatar_url: seller.avatar_url,
                is_verified: seller.verified || false,
              };
            });
            setSellers(sellersMap);
          }

          setLoading(false);
          return;
        } else {
          // No data from database, use dummy data
          throw new Error('No data returned from database');
        }
      } catch (error) {
        console.error('Using dummy data for popular shows:', error);
        // Use dummy data as fallback
        const dummyShows: PopularShow[] = [
          {
            id: 'show-1',
            title: '150K LEGEND CELEBRATION',
            description: 'Nonstop Amazon Giveaways',
            image_url: 'https://images.unsplash.com/photo-1606503153255-59d8b8b82176?w=800',
            seller_id: 'seller-1',
            is_live: true,
            category: 'Electronics',
            viewer_count: 13000,
          },
          {
            id: 'show-2',
            title: 'ONE MOMENT OUR TIME',
            description: 'Slabs, Graded Cards',
            image_url: 'https://images.unsplash.com/photo-1587019158091-1a103c5dd17f?w=800',
            seller_id: 'seller-2',
            is_live: true,
            category: 'Cards',
            viewer_count: 536,
          },
          {
            id: 'show-3',
            title: 'SUNDAY MORNING SPECIAL',
            description: '$1 STARTS - FAN FAVORITES',
            image_url: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=800',
            seller_id: 'seller-3',
            is_live: true,
            category: 'Watches',
            viewer_count: 720,
          },
          {
            id: 'show-4',
            title: '$1 START NIKE CARHARTT & MORE!',
            description: 'Streetwear deals',
            image_url: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800',
            seller_id: 'seller-4',
            is_live: true,
            category: 'Streetwear',
            viewer_count: 437,
          },
          {
            id: 'show-5',
            title: 'FREE DAE EVERY 5 MIN! BLACK FRIDAY MONTH!!!',
            description: 'Luxury items and deals',
            image_url: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800',
            seller_id: 'seller-5',
            is_live: true,
            category: 'Makeup & Skincare',
            viewer_count: 262,
          },
          {
            id: 'show-6',
            title: 'FASHIONICA FEST! | GIVVY',
            description: '$1 DESIGNER BAG AUCTION',
            image_url: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800',
            seller_id: 'seller-6',
            is_live: true,
            category: 'Fashion',
            viewer_count: 347,
          },
        ];

        const dummySellers: Record<string, Seller> = {
          'seller-1': { id: 'seller-1', username: 'liquidationlegend', avatar_url: null, is_verified: true },
          'seller-2': { id: 'seller-2', username: 'constant_cardz', avatar_url: null, is_verified: true },
          'seller-3': { id: 'seller-3', username: 'invictastores', avatar_url: null, is_verified: true },
          'seller-4': { id: 'seller-4', username: 'halftimedeals', avatar_url: null, is_verified: true },
          'seller-5': { id: 'seller-5', username: 'beautyblitzwholesale', avatar_url: null, is_verified: true },
          'seller-6': { id: 'seller-6', username: 'fashionica', avatar_url: null, is_verified: true },
        };

        setShows(dummyShows);
        setSellers(dummySellers);
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
          <button className="show-all-btn" onClick={() => navigate('/browse?sort=popular')}>
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
                    Live · {show.viewer_count.toLocaleString()}
                  </div>
                  <img
                    src={show.image_url || 'https://developers.elementor.com/docs/assets/img/elementor-placeholder-image.png'}
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
