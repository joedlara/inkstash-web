import { useEffect, useState } from 'react';
import { supabase } from '../../api/supabase/supabaseClient';
import { useNavigate } from 'react-router-dom';
import '../../styles/home/FeaturedCreators.css';

interface Creator {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  featured_artwork?: string | null;
}

export default function FeaturedCreators() {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchCreators() {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, avatar_url, bio')
        .limit(12);

      if (error) {
        console.error('Error loading creators:', error);
        setLoading(false);
        return;
      }

      // For each creator, try to get their latest auction item as featured artwork
      const creatorsWithArtwork = await Promise.all(
        (data || []).map(async (creator) => {
          const { data: auctionData } = await supabase
            .from('auctions')
            .select('image_url')
            .eq('seller_id', creator.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          return {
            ...creator,
            featured_artwork: auctionData?.image_url || null,
          };
        })
      );

      setCreators(creatorsWithArtwork);
      setLoading(false);
    }

    fetchCreators();
  }, []);

  const handleCreatorClick = (creatorId: string) => {
    navigate(`/profile/${creatorId}`);
  };

  if (loading) {
    return (
      <section className="featured-creators">
        <div className="section-header">
          <h2>Featured Creators</h2>
          <p>Discover talented artists and sellers</p>
        </div>
        <div className="creators-scroll">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="creator-card loading">
              <div className="creator-artwork loading-shimmer"></div>
              <div className="creator-info">
                <div className="loading-line"></div>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (creators.length === 0) {
    return null;
  }

  return (
    <section className="featured-creators">
      <div className="section-header">
        <h2>Featured Creators</h2>
        <p>Discover talented artists and sellers in our community</p>
      </div>

      <div className="creators-scroll">
        {creators.map((creator) => (
          <div
            key={creator.id}
            className="creator-card"
            onClick={() => handleCreatorClick(creator.id)}
          >
            <div className="creator-artwork">
              <img
                src={
                  creator.featured_artwork ||
                  'https://developers.elementor.com/docs/assets/img/elementor-placeholder-image.png'
                }
                alt={`${creator.username}'s artwork`}
                className="artwork-image"
              />
              <div className="artwork-overlay"></div>
            </div>

            <div className="creator-info">
              <div className="creator-header">
                <img
                  src={
                    creator.avatar_url ||
                    'https://www.pikpng.com/pngl/b/80-805068_my-profile-icon-blank-profile-picture-circle-clipart.png'
                  }
                  alt={creator.username}
                  className="creator-avatar"
                />
                <div className="creator-details">
                  <div className="creator-name-wrapper">
                    <span className="creator-name">{creator.username}</span>
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
                  {creator.bio && (
                    <p className="creator-bio">{creator.bio}</p>
                  )}
                </div>
              </div>

              <button className="follow-button">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="8.5" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="20" y1="8" x2="20" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="23" y1="11" x2="17" y2="11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Follow
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
