import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/home/LiveStreams.css';

interface LiveStream {
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

export default function LiveStreams() {
  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [sellers, setSellers] = useState<Record<string, Seller>>({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Use dummy data only
    const dummyStreams: LiveStream[] = [
      {
        id: 'stream-1',
        title: 'BASE SET BREAKS! CHARIZARD SLAB GIVVY!!',
        description: 'Opening vintage Pokemon packs and graded slabs',
        image_url: 'https://images.unsplash.com/photo-1606503153255-59d8b8b82176?w=800',
        seller_id: 'seller-1',
        is_live: true,
        category: 'Cards',
        viewer_count: 69,
      },
      {
        id: 'stream-2',
        title: 'Milwaukee Flash Sale! Bids Start at a $1, some Sudden Death',
        description: 'Power tools auction starting at $1',
        image_url: 'https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=800',
        seller_id: 'seller-2',
        is_live: true,
        category: 'Tools',
        viewer_count: 103,
      },
      {
        id: 'stream-3',
        title: '$1 RTYH',
        description: 'Random card breaks and auctions',
        image_url: 'https://images.unsplash.com/photo-1606503153255-59d8b8b82176?w=800',
        seller_id: 'seller-3',
        is_live: true,
        category: 'Cards',
        viewer_count: 375,
      },
      {
        id: 'stream-4',
        title: '$1 Auction WOTC Holos ALL',
        description: 'Wizards of the Coast holographic cards',
        image_url: 'https://i.ebayimg.com/images/g/yMUAAOSwnTdaRUQg/s-l1200.jpg',
        seller_id: 'seller-4',
        is_live: true,
        category: 'Cards',
        viewer_count: 86,
      },
      {
        id: 'stream-5',
        title: '💎FREE SLABS & BOOSTER BOXES',
        description: 'Giveaways and premium card openings',
        image_url: 'https://images.unsplash.com/photo-1606503153255-59d8b8b82176?w=800',
        seller_id: 'seller-5',
        is_live: true,
        category: 'Cards',
        viewer_count: 202,
      },
      {
        id: 'stream-6',
        title: 'Fridays fun 😁🎄',
        description: 'Weekly special collectibles showcase',
        image_url: 'https://images.unsplash.com/photo-1542779283-429940ce8336?w=800',
        seller_id: 'seller-6',
        is_live: true,
        category: 'Collectibles',
        viewer_count: 151,
      },
      {
        id: 'stream-7',
        title: '💎FREE SLABS & BOOSTER BOXES',
        description: 'Giveaways and premium card openings',
        image_url: 'https://images.unsplash.com/photo-1606503153255-59d8b8b82176?w=800',
        seller_id: 'seller-7',
        is_live: true,
        category: 'Cards',
        viewer_count: 202,
      },
      {
        id: 'stream-8',
        title: '💎FREE SLABS & BOOSTER BOXES',
        description: 'Giveaways and premium card openings',
        image_url: 'https://images.unsplash.com/photo-1606503153255-59d8b8b82176?w=800',
        seller_id: 'seller-8',
        is_live: true,
        category: 'Cards',
        viewer_count: 202,
      },
      {
        id: 'stream-9',
        title: '💎FREE SLABS & BOOSTER BOXES',
        description: 'Giveaways and premium card openings',
        image_url: 'https://images.unsplash.com/photo-1606503153255-59d8b8b82176?w=800',
        seller_id: 'seller-9',
        is_live: true,
        category: 'Cards',
        viewer_count: 202,
      },
      {
        id: 'stream-10',
        title: '💎FREE SLABS & BOOSTER BOXES',
        description: 'Giveaways and premium card openings',
        image_url: 'https://images.unsplash.com/photo-1606503153255-59d8b8b82176?w=800',
        seller_id: 'seller-10',
        is_live: true,
        category: 'Cards',
        viewer_count: 202,
      },

    ];

    const dummySellers: Record<string, Seller> = {
      'seller-1': { id: 'seller-1', username: 'hitmarketlive', avatar_url: null, is_verified: true },
      'seller-2': { id: 'seller-2', username: 'carrillopowertools', avatar_url: null, is_verified: true },
      'seller-3': { id: 'seller-3', username: 'adventurers_guild', avatar_url: null, is_verified: true },
      'seller-4': { id: 'seller-4', username: 'wincondition', avatar_url: null, is_verified: true },
      'seller-5': { id: 'seller-5', username: 'idistrocollectibles', avatar_url: null, is_verified: true },
      'seller-6': { id: 'seller-6', username: 'eaglereserve', avatar_url: null, is_verified: true },
      'seller-7': { id: 'seller-6', username: 'asrock', avatar_url: null, is_verified: true },
      'seller-9': { id: 'seller-6', username: 'danyells', avatar_url: null, is_verified: true },
      'seller-8': { id: 'seller-6', username: 'mike_hunt', avatar_url: null, is_verified: true },
      'seller-10': { id: 'seller-6', username: 'pumpkinPie', avatar_url: null, is_verified: true },
    };

    setStreams(dummyStreams);
    setSellers(dummySellers);
    setLoading(false);
  }, []);

  const handleStreamClick = (streamId: string) => {
    navigate(`/auctions/${streamId}`);
  };

  if (loading) {
    return (
      <div className="live-streams">
        <div className="section-header">
          <h2>Live Streams</h2>
        </div>
        <div className="py-4">
          <div className="grid-container">
            {Array.from({ length: 8 }).map((_, i) => (
              <section key={i} className="stream-card loading">
                <div className="stream-header">
                  <div className="loading-avatar"></div>
                  <div className="loading-username"></div>
                </div>
                <div className="card-image-wrapper">
                  <div className="loading-shimmer"></div>
                </div>
                <div className="card-content">
                  <div className="loading-line"></div>
                  <div className="loading-line short"></div>
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (streams.length === 0) {
    return (
      <div className="live-streams">
        <div className="section-header">
          <h2>Live Streams</h2>
        </div>
        <div className="py-4">
          <div className="empty-state">
            <div className="empty-icon">📡</div>
            <h3>No live streams right now</h3>
            <p>Check back later for live auctions</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="live-streams">
      <div className="section-header">
        <h2>Live Streams</h2>
      </div>

      <div className="py-4">
        <div className="grid-container">
          {streams.map((stream) => {
            const seller = sellers[stream.seller_id];

            return (
              <section key={stream.id} className="stream-card">
                <div
                  className="stream-header"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/seller/${stream.seller_id}`);
                  }}
                >
                  <img
                    src={seller?.avatar_url || 'https://www.pikpng.com/pngl/b/80-805068_my-profile-icon-blank-profile-picture-circle-clipart.png'}
                    alt={seller?.username}
                    className="stream-avatar"
                  />
                  <span className="stream-username">{seller?.username}</span>
                </div>

                <div className="card-image-wrapper" onClick={() => handleStreamClick(stream.id)}>
                  <div className="live-badge-container">
                    <div className="live-badge">
                      <span className="pulse-dot"></span>
                      Live
                    </div>
                    {stream.description && (
                      <span className="stream-description">{stream.description}</span>
                    )}
                  </div>
                  <img
                    src={stream.image_url || 'https://developers.elementor.com/docs/assets/img/elementor-placeholder-image.png'}
                    alt={stream.title}
                    className="card-image"
                  />
                </div>

                <div className="card-content" onClick={() => handleStreamClick(stream.id)}>
                  <h3 className="card-title">{stream.title}</h3>
                  <div className="card-meta">
                    <span
                      className="category-tag"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/browse?category=${stream.category}`);
                      }}
                    >
                      {stream.category}
                    </span>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
