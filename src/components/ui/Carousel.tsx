// Carousel.tsx
import React, { useEffect, useState } from 'react';
import '../../styles/Carousel.css';
import { supabase } from '../../api/supabase/supabaseClient';

interface AuctionRecord {
  id: string;
  image_url: string;
}

interface Spec {
  key: 'featured' | 'live' | 'buyNow' | 'offer';
  filter: Record<string, any>;
}

const specs: Spec[] = [
  { key: 'featured', filter: { is_featured: true } },
  { key: 'live', filter: { is_live: true } },
  { key: 'buyNow', filter: { buy_now: true } },
  { key: 'offer', filter: { make_offer: true } },
];

const titles: Record<Spec['key'], string> = {
  featured: 'Featured Auctions',
  live: 'Live Auctions',
  buyNow: 'Buy It Now!',
  offer: 'Make Me an Offer',
};

export default function Carousel() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [images, setImages] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);

      // parallel fetch for each category
      const results = await Promise.all(
        specs.map(async ({ key, filter }) => {
          const { data, count, error } = await supabase
            .from<AuctionRecord>('auctions')
            .select('id, image_url', { count: 'exact' })
            .match(filter)
            // you can pick ordering logic here (e.g. latest first)
            .order('created_at', { ascending: false })
            .limit(1);

          if (error) {
            console.error(`Failed to fetch ${key}`, error);
            return { key, count: 0, imageUrl: '' };
          }

          return {
            key,
            count: count ?? 0,
            imageUrl: data?.[0]?.image_url ?? '',
          };
        })
      );

      // turn array of results into two lookup maps
      const countMap: Record<string, number> = {};
      const imageMap: Record<string, string> = {};
      results.forEach(({ key, count, imageUrl }) => {
        countMap[key] = count;
        imageMap[key] = imageUrl;
      });

      setCounts(countMap);
      setImages(imageMap);
      setLoading(false);
    })();
  }, []);

  return (
    <section className="carousel">
      <div className="list">
        {loading
          ? specs.map(s => <div className="card placeholder" key={s.key} />)
          : specs.map(({ key }) => (
              <div className="card" key={key}>
                {images[key] ? (
                  <img
                    src={images[key]}
                    alt="https://developers.elementor.com/docs/assets/img/elementor-placeholder-image.png"
                    className="carousel-image"
                  />
                ) : (
                  <div className="image-placeholder" />
                )}
                <div className="title">{titles[key]}</div>
                <div className="badge">{counts[key] ?? 0}</div>
              </div>
            ))}
      </div>
    </section>
  );
}
