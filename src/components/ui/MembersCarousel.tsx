import { useEffect, useState } from 'react';
import { supabase } from '../../api/supabase/supabaseClient';
import '../../styles/MembersCarousel.css';

interface Member {
  id: string;
  username: string;
  avatar_url: string | null;
}

export default function MembersCarousel() {
  const [members, setMembers] = useState<Member[]>([]);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from<Member>('users')
        .select('id, username, avatar_url');
      console.log(data);
      if (error) console.error('Error loading members:', error);
      else setMembers(data);
    }
    load();
  }, []);

  return (
    <section className="members-carousel">
      <h3>Explore Our Top Art Creators</h3>
      <p>
        Join thousands of collectors, fans, and artists in the InkStash
        community your premier marketplace for rare comic art, one-of-a-kind
        collectibles, and original pieces. Follow your favorite creators, engage
        with their work, and purchase directly from verified artists and
        sellers.
      </p>
      <div className="carousel">
        {members.map(m => (
          <div className="member-card" key={m.id}>
            <img
              src={
                m.avatar_url ||
                'https://www.pikpng.com/pngl/b/80-805068_my-profile-icon-blank-profile-picture-circle-clipart.png'
              }
              alt={m.username}
            />
            <div className="username">{m.username}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
