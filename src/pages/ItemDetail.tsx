import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../api/supabase/supabaseClient';
import DashboardHeader from '../components/home/DashboardHeader';
import '../styles/pages/ItemDetail.css';

interface ItemDetails {
  id: string;
  title: string;
  description: string;
  image_url: string;
  current_bid: number;
  buy_now_price?: number;
  seller_id: string;
  seller_name: string;
  seller_avatar?: string;
  seller_verified: boolean;
  category: string;
  end_date: string;
  total_views: number;
  total_bids: number;
  watchers: number;
  artist?: string;
  seller_location: string;
  us_shipping: number;
  international_shipping: number;
}

export default function ItemDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [item, setItem] = useState<ItemDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    async function fetchItemDetails() {
      if (!id) {
        setError('No item ID provided');
        setLoading(false);
        return;
      }

      try {
        // Fetch auction data
        const { data: auctionData, error: auctionError } = await supabase
          .from('auctions')
          .select('*')
          .eq('id', id)
          .single();

        if (auctionError) {
          console.error('Error fetching auction:', auctionError);
          setError('Auction not found');
          setLoading(false);
          return;
        }

        if (!auctionData) {
          setError('Auction not found');
          setLoading(false);
          return;
        }

        console.log('Auction data:', auctionData); // Debug log

        // Fetch seller data separately
        let sellerData = null;
        if (auctionData.seller_id) {
          const { data: seller, error: sellerError } = await supabase
            .from('users')
            .select('id, username, avatar_url, verified')
            .eq('id', auctionData.seller_id)
            .single();

          if (sellerError) {
            console.error('Error fetching seller:', sellerError);
          } else {
            sellerData = seller;
          }
        }

        console.log('Seller data:', sellerData); // Debug log

        // Map the data to ItemDetails interface
        const itemDetails: ItemDetails = {
          id: auctionData.id,
          title: auctionData.title || 'Untitled Item',
          description: auctionData.description || 'No description available',
          image_url: auctionData.image_url || 'https://developers.elementor.com/docs/assets/img/elementor-placeholder-image.png',
          current_bid: auctionData.current_bid || 0,
          buy_now_price: auctionData.buy_now_price,
          seller_id: auctionData.seller_id,
          seller_name: sellerData?.username || 'Unknown Seller',
          seller_avatar: sellerData?.avatar_url,
          seller_verified: sellerData?.verified || false,
          category: auctionData.category || 'General',
          end_date: auctionData.end_time || new Date().toISOString(),
          total_views: auctionData.views || 0,
          total_bids: auctionData.bid_count || 0,
          watchers: auctionData.watchers || 0,
          artist: auctionData.artist,
          seller_location: 'United States', // Default location since column doesn't exist
          us_shipping: auctionData.us_shipping || 0,
          international_shipping: auctionData.international_shipping || 0,
        };

        console.log('Item details:', itemDetails); // Debug log
        setItem(itemDetails);
      } catch (err) {
        console.error('Error fetching item details:', err);
        setError('Failed to load item details');
      } finally {
        setLoading(false);
      }
    }

    fetchItemDetails();
  }, [id]);

  useEffect(() => {
    if (!item) return;

    const calculateTimeRemaining = () => {
      const now = new Date().getTime();
      const end = new Date(item.end_date).getTime();
      const distance = end - now;

      if (distance < 0) {
        setTimeRemaining({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      setTimeRemaining({ days, hours, minutes, seconds });
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [item]);

  if (loading) {
    return (
      <div className="home authenticated">
        <DashboardHeader />
        <div className="detail-content">
          <div className="item-detail-loading">
            <div className="loading-spinner"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="home authenticated">
        <DashboardHeader />
        <div className="detail-content">
          <div className="item-detail-error">
            <h2>{error || 'Item not found'}</h2>
            <p>The auction item you're looking for doesn't exist or has been removed.</p>
            <button onClick={() => navigate('/')} className="back-home-btn">
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="home authenticated">
      <DashboardHeader />
      <div className="detail-content">
        <div className="item-detail-container">
        {/* Left Side - Image */}
        <div className="item-image-section">
          <div className="viewer-count">0 viewers now</div>
          <div className="item-image-wrapper">
            <img src={item.image_url} alt={item.title} className="item-image" />
            <div className="image-actions">
              <button className="action-btn favorite-btn" aria-label="Add to favorites">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <button className="action-btn play-btn" aria-label="Play video">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.02-4.11A2.99 2.99 0 0018 7.92 3 3 0 1015 5c0 .24.04.47.09.7L7.99 9.81A3.01 3.01 0 004 12c0 1.66 1.34 3 3 3 .76 0 1.47-.31 1.99-.81l7.13 4.17c-.05.21-.1.43-.1.64 0 1.66 1.34 3 3 3s3-1.34 3-3-1.34-3-3-3z"/>
                </svg>
              </button>
              <button className="action-btn bookmark-btn" aria-label="Bookmark">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Stats and Calendar */}
          <div className="stats-calendar-container">
            {/* Stats */}
            <div className="item-stats">
              <div className="stat-item">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="12" cy="12" r="3" strokeWidth="2"/>
                </svg>
                <div className="stat-content">
                  <div className="stat-value">{item.total_views}</div>
                  <div className="stat-label">Total Views</div>
                </div>
              </div>
              <div className="stat-item">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M9 11l3 3L22 4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <div className="stat-content">
                  <div className="stat-value">{item.total_bids}</div>
                  <div className="stat-label">Bids</div>
                </div>
              </div>
              <div className="stat-item">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <div className="stat-content">
                  <div className="stat-value">{item.watchers}</div>
                  <div className="stat-label">Watchers</div>
                </div>
              </div>
            </div>

            {/* Add to Calendar */}
            <div className="add-to-calendar-section">
              <div className="add-to-calendar-title">Add to Calendar</div>
              <div className="calendar-options">
                <a
                  href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(item.title)}&dates=${new Date(item.end_date).toISOString().replace(/[-:]/g, '').split('.')[0]}Z/${new Date(item.end_date).toISOString().replace(/[-:]/g, '').split('.')[0]}Z&details=${encodeURIComponent(`Auction ending: ${item.description}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="calendar-option"
                  title="Add to Google Calendar"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10z"/>
                  </svg>
                </a>
                <a
                  href={`data:text/calendar;charset=utf8,BEGIN:VCALENDAR%0AVERSION:2.0%0ABEGIN:VEVENT%0ADTSTART:${new Date(item.end_date).toISOString().replace(/[-:]/g, '').split('.')[0]}Z%0ADTEND:${new Date(item.end_date).toISOString().replace(/[-:]/g, '').split('.')[0]}Z%0ASUMMARY:${encodeURIComponent(item.title)}%0ADESCRIPTION:${encodeURIComponent(item.description)}%0AEND:VEVENT%0AEND:VCALENDAR`}
                  download={`${item.title.replace(/\s+/g, '_')}.ics`}
                  className="calendar-option"
                  title="Download for Apple Calendar"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17 2c.55 0 1 .45 1 1v1h1c1.1 0 2 .9 2 2v14c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2h1V3c0-.55.45-1 1-1s1 .45 1 1v1h8V3c0-.55.45-1 1-1zm2 18V10H5v10h14zm-8-8h4v4h-4v-4z"/>
                  </svg>
                </a>
                <a
                  href={`https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(item.title)}&startdt=${new Date(item.end_date).toISOString()}&enddt=${new Date(item.end_date).toISOString()}&body=${encodeURIComponent(item.description)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="calendar-option"
                  title="Add to Outlook Calendar"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Details */}
        <div className="item-details-section">
          <h1 className="item-title">{item.title}</h1>

          {/* Seller Info */}
          <div className="seller-info" onClick={() => navigate(`/seller/${item.seller_id}`)}>
            <img
              src={item.seller_avatar || 'https://www.pikpng.com/pngl/b/80-805068_my-profile-icon-blank-profile-picture-circle-clipart.png'}
              alt={item.seller_name}
              className="seller-avatar"
            />
            <span className="seller-name">{item.seller_name}</span>
            {item.seller_verified && (
              <svg className="verified-badge" width="16" height="16" viewBox="0 0 24 24" fill="#3395FF">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            )}
          </div>

          {/* Bid Section */}
          <div className="bid-section">
            <div className="current-bid">
              <span className="bid-label">Current Bid:</span>
              <span className="bid-amount">${item.current_bid}</span>
            </div>

            {/* Countdown Timer */}
            <div className="countdown-section">
              <div className="countdown-label">Auction ends in</div>
              <div className="countdown-timer">
                <div className="time-unit">
                  <div className="time-value">{timeRemaining.days}</div>
                  <div className="time-label">Days</div>
                </div>
                <div className="time-unit">
                  <div className="time-value">{timeRemaining.hours}</div>
                  <div className="time-label">Hours</div>
                </div>
                <div className="time-unit">
                  <div className="time-value">{timeRemaining.minutes}</div>
                  <div className="time-label">Minutes</div>
                </div>
                <div className="time-unit">
                  <div className="time-value">{timeRemaining.seconds}</div>
                  <div className="time-label">Seconds</div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="action-buttons">
              <button className="bid-btn">Place Bid</button>
              {item.buy_now_price && (
                <button className="buy-now-btn">Buy Now - ${item.buy_now_price}</button>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="description-section">
            <h2 className="section-title">Description</h2>
            <p className="description-text">{item.description}</p>
          </div>

          {/* Item Details */}
          <div className="details-grid">
            <div className="detail-row">
              <span className="detail-label">End Date:</span>
              <span className="detail-value">{new Date(item.end_date).toLocaleString()}</span>
            </div>
            {item.artist && (
              <div className="detail-row">
                <span className="detail-label">Artist:</span>
                <span className="detail-value detail-link">{item.artist}</span>
              </div>
            )}
            <div className="detail-row">
              <span className="detail-label">Category:</span>
              <span className="detail-value detail-link">{item.category}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Seller Location:</span>
              <span className="detail-value">{item.seller_location}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">US Shipping:</span>
              <span className="detail-value">${item.us_shipping.toFixed(2)}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">International Shipping:</span>
              <span className="detail-value">${item.international_shipping.toFixed(2)}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Payment:</span>
              <span className="detail-value">Buyer picks a payment method to deposit funds in Escrow. Bidders must have a default payment method and shipping address on file to bid. Local tax and fees will be charged if applicable. <span className="learn-more">Learn more</span></span>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="payment-methods">
            <img src="https://upload.wikimedia.org/wikipedia/commons/0/04/Visa.svg" alt="Visa" />
            <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" />
            <img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" alt="PayPal" />
            <img src="https://upload.wikimedia.org/wikipedia/commons/f/fa/American_Express_logo_%282018%29.svg" alt="American Express" />
          </div>
        </div>
      </div>
    </div>
</div>
  );
}
