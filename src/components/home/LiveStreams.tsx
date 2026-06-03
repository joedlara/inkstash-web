import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../api/supabase/supabaseClient';
import { cache } from '../../utils/cache';
import '../../styles/home/LiveStreams.css';

// Home-page Live Streams widget. Refactored onto the Livestreams L1 schema
// (livestreams.host_user_id + status='live'). The old prototype's category
// and current_viewers columns are gone — those return in L3 (categories)
// and L5 (live viewer counts via LiveKit presence).

interface LiveStream {
  id: string;
  title: string;
  cover_image_url: string | null;
  host_user_id: string;
}

interface Host {
  id: string;
  username: string;
  avatar_url: string | null;
}

export default function LiveStreams() {
  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [hosts, setHosts] = useState<Record<string, Host>>({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const hasFetched = useRef(false);

  useEffect(() => {
    async function fetchLiveStreams() {
      const streamsCacheKey = 'live-streams';
      const hostsCacheKey = 'live-streams-hosts';
      const cachedStreams = cache.get<LiveStream[]>(streamsCacheKey);
      const cachedHosts = cache.get<Record<string, Host>>(hostsCacheKey);

      if (cachedStreams && cachedHosts) {
        setStreams(cachedStreams);
        setHosts(cachedHosts);
        setLoading(false);
        return;
      }

      if (hasFetched.current) return;
      hasFetched.current = true;

      try {
        const { data: livestreamData, error } = await supabase
          .from('livestreams')
          .select('id, title, cover_image_url, host_user_id')
          .eq('status', 'live')
          .order('started_at', { ascending: false })
          .limit(15);

        if (error) throw error;

        if (livestreamData && livestreamData.length > 0) {
          const rows: LiveStream[] = livestreamData.map((s: { id: string; title: string; cover_image_url: string | null; host_user_id: string }) => ({
            id: s.id,
            title: s.title || 'Untitled',
            cover_image_url: s.cover_image_url,
            host_user_id: s.host_user_id,
          }));

          const hostIds = [...new Set(rows.map((s) => s.host_user_id))];
          const { data: hostsData } = await supabase
            .from('users')
            .select('id, username, avatar_url, email')
            .in('id', hostIds);

          const hostsMap: Record<string, Host> = {};
          (hostsData ?? []).forEach((u: { id: string; username: string | null; avatar_url: string | null; email: string | null }) => {
            hostsMap[u.id] = {
              id: u.id,
              username: u.username || u.email?.split('@')[0] || 'Unknown',
              avatar_url: u.avatar_url,
            };
          });

          cache.set(streamsCacheKey, rows, 60 * 1000);
          cache.set(hostsCacheKey, hostsMap, 60 * 1000);
          setStreams(rows);
          setHosts(hostsMap);
        }
        setLoading(false);
      } catch (err) {
        console.error('Error fetching live streams:', err);
        setStreams([]);
        setHosts({});
        setLoading(false);
      }
    }

    fetchLiveStreams();
  }, []);

  const handleStreamClick = (streamId: string) => {
    navigate(`/live/${streamId}`);
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
          const host = hosts[stream.host_user_id];

          return (
            <div key={stream.id} className="livestreams-card">
              {/* Host info */}
              <div
                className="livestreams-seller"
                onClick={(e) => {
                  e.stopPropagation();
                  if (host?.username) navigate(`/@${host.username}`);
                }}
              >
                <img
                  src={host?.avatar_url || 'https://www.pikpng.com/pngl/b/80-805068_my-profile-icon-blank-profile-picture-circle-clipart.png'}
                  alt={host?.username}
                  className="livestreams-seller-avatar"
                />
                <span className="livestreams-seller-username">
                  {host?.username ?? 'host'}
                </span>
              </div>

              {/* Thumbnail */}
              <div
                className="livestreams-thumbnail"
                onClick={() => handleStreamClick(stream.id)}
              >
                <div className="livestreams-live-badge">
                  <span className="livestreams-live-dot" />
                  Live
                </div>
                <img
                  src={stream.cover_image_url || 'https://developers.elementor.com/docs/assets/img/elementor-placeholder-image.png'}
                  alt={stream.title}
                  className="livestreams-thumbnail-image"
                />
              </div>

              {/* Stream info */}
              <div
                className="livestreams-info"
                onClick={() => handleStreamClick(stream.id)}
              >
                <h3 className="livestreams-title-text">{stream.title}</h3>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
