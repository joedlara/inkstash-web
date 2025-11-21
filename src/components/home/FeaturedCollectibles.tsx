import { useEffect, useState, useRef } from 'react';
import {
  Box,
  Typography,
  Card,
  CardMedia,
  CardContent,
  Button,
  Chip,
  IconButton,
  Tabs,
  Tab,
  Skeleton,
  Stack,
} from '@mui/material';
import {
  ChevronLeft,
  ChevronRight,
  Star,
  Verified,
} from '@mui/icons-material';
import { supabase } from '../../api/supabase/supabaseClient';
import { useNavigate } from 'react-router-dom';

interface FeaturedCollectible {
  id: string;
  title: string;
  image_url: string;
  current_bid: number;
  end_time: string;
  seller_id: string;
  seller_username?: string;
  seller_avatar?: string;
  bid_count?: number;
}

export default function FeaturedCollectibles() {
  const [items, setItems] = useState<FeaturedCollectible[]>([]);
  const [loading, setLoading] = useState(true);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [activeTab, setActiveTab] = useState<'forYou' | 'following'>('forYou');
  const carouselRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchFeaturedCollectibles() {
      try {
        const { data: auctionData, error } = await supabase
          .from('auctions')
          .select('id, title, image_url, current_bid, end_time, seller_id, bid_count')
          .eq('is_featured', true)
          .order('current_bid', { ascending: false })
          .limit(6);

        if (error) {
          throw error;
        }

        // If no data, use dummy data
        if (!auctionData || auctionData.length === 0) {
          throw new Error('No auction data available');
        }

        // Fetch seller info for each item
        const sellerIds = [...new Set(auctionData.map(item => item.seller_id))];
        const { data: sellersData, error: sellersError } = await supabase
          .from('users')
          .select('id, username, avatar_url')
          .in('id', sellerIds);

        if (sellersError) {
          console.error('Error fetching sellers:', sellersError);
          // Continue with auction data even if sellers fail to load
        }

        // Create a map of seller data
        const sellersMap: Record<string, { username: string; avatar_url: string | null }> = {};
        if (sellersData) {
          sellersData.forEach((seller) => {
            sellersMap[seller.id] = {
              username: seller.username || 'Unknown',
              avatar_url: seller.avatar_url || null,
            };
          });
        }

        // Map items with seller info
        const itemsWithDetails = auctionData.map((item) => ({
          ...item,
          seller_username: sellersMap[item.seller_id]?.username || 'Unknown',
          seller_avatar: sellersMap[item.seller_id]?.avatar_url || null,
          bid_count: item.bid_count || 0,
        }));

        setItems(itemsWithDetails);
        setLoading(false);
      } catch {
        setLoading(false);
      }
    }

    fetchFeaturedCollectibles();
  }, []);

  const calculateTimeRemaining = (endTime: string) => {
    const now = new Date().getTime();
    const end = new Date(endTime).getTime();
    const diff = end - now;

    if (diff <= 0) return 'Ended';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days} Day${days > 1 ? 's' : ''} ${hours} Hr${hours !== 1 ? 's' : ''}`;
    if (hours > 0) return `${hours} Hr${hours !== 1 ? 's' : ''} ${minutes} Min${minutes !== 1 ? 's' : ''}`;
    return `${minutes} Min${minutes !== 1 ? 's' : ''}`;
  };

  const handleItemClick = (itemId: string) => {
    navigate(`/item/${itemId}`);
  };

  const checkScrollButtons = () => {
    if (!carouselRef.current) return;

    const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  };

  const scrollCarousel = (direction: 'left' | 'right') => {
    if (!carouselRef.current) return;

    const scrollAmount = 300;
    const newScrollLeft = direction === 'left'
      ? carouselRef.current.scrollLeft - scrollAmount
      : carouselRef.current.scrollLeft + scrollAmount;

    carouselRef.current.scrollTo({
      left: newScrollLeft,
      behavior: 'smooth'
    });
  };

  useEffect(() => {
    checkScrollButtons();
    const carousel = carouselRef.current;
    if (carousel) {
      carousel.addEventListener('scroll', checkScrollButtons);
      window.addEventListener('resize', checkScrollButtons);
    }
    return () => {
      if (carousel) {
        carousel.removeEventListener('scroll', checkScrollButtons);
      }
      window.removeEventListener('resize', checkScrollButtons);
    };
  }, [items]);

  if (loading) {
    return (
      <Box component="section" sx={{ py: 4 }}>
        <Box sx={{ maxWidth: 1600, mx: 'auto', px: { xs: 2, md: 4 } }}>
          <Typography variant="h5" fontWeight={700} mb={2}>
            Featured Collectibles
          </Typography>

          <Stack direction="row" spacing={2} sx={{ overflowX: 'auto' }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} sx={{ width: 240, flexShrink: 0, borderRadius: 1 }}>
                <Skeleton variant="rectangular" height={150} />
                <CardContent sx={{ p: 2 }}>
                  <Skeleton width="80%" height={20} />
                  <Skeleton width="60%" height={16} sx={{ mt: 1 }} />
                  <Skeleton width="40%" height={24} sx={{ mt: 1 }} />
                </CardContent>
              </Card>
            ))}
          </Stack>
        </Box>
      </Box>
    );
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <Box component="section" sx={{ pt: 4 }}>
      <Box sx={{ maxWidth: 1600, mx: 'auto', px: { xs: 2, md: 4 } }}>
        <Typography variant="h5" fontWeight={700} mb={2}>
          Featured Collectibles
        </Typography>

        <Box sx={{ position: 'relative' }}>
          {canScrollLeft && (
            <IconButton
              onClick={() => scrollCarousel('left')}
              sx={{
                position: 'absolute',
                left: -20,
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 2,
                bgcolor: 'background.paper',
                boxShadow: 2,
                '&:hover': {
                  bgcolor: 'background.paper',
                  boxShadow: 4,
                },
              }}
            >
              <ChevronLeft />
            </IconButton>
          )}

          <Box
            ref={carouselRef}
            sx={{
              display: 'flex',
              gap: 2,
              overflowX: 'auto',
              scrollBehavior: 'smooth',
              paddingTop: '16px',
              marginTop: '-16px',
              '&::-webkit-scrollbar': {
                display: 'none',
              },
              msOverflowStyle: 'none',
              scrollbarWidth: 'none',
            }}
          >
            {items.map((item) => {
              const timeRemaining = calculateTimeRemaining(item.end_time);

              return (
                <Box
                  key={item.id}
                  sx={{
                    position: 'relative',
                    width: 240,
                    flexShrink: 0,
                  }}
                >
                  <Chip
                    icon={<Star sx={{ fontSize: 12, color: 'white' }} />}
                    label="Featured"
                    size="small"
                    sx={{
                      position: 'absolute',
                      top: 4,
                      left: 12,
                      zIndex: 2,
                      fontWeight: 600,
                      fontSize: '0.8rem',
                      height: 24,
                      bgcolor: '#0078FF',
                      color: 'white',
                      '& .MuiChip-icon': {
                        color: 'white',
                      },
                    }}
                  />
                  <Chip
                    label={timeRemaining}
                    size="small"
                    sx={{
                      position: 'absolute',
                      top: 4,
                      right: 12,
                      zIndex: 2,
                      bgcolor: '#00C6A9',
                      color: 'white',
                      fontWeight: 600,
                      fontSize: '0.8rem',
                      height: 24,
                    }}
                  />
                  <Card
                    sx={{
                      width: '100%',
                      cursor: 'pointer',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      border: '2px solid #0078FF',
                      borderRadius: 1,
                      marginTop: '16px',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: 2,
                      },
                    }}
                  >

                  <Box sx={{ position: 'relative' }}>

                    <CardMedia
                      component="img"
                      height="150"
                      image={
                        item.image_url ||
                        'https://developers.elementor.com/docs/assets/img/elementor-placeholder-image.png'
                      }
                      alt={item.title}
                      onClick={() => handleItemClick(item.id)}
                      sx={{
                        objectFit: 'cover',
                        bgcolor: 'grey.100',
                        width: '100%',
                      }}
                    />
                  </Box>

                  <CardContent sx={{ p: 2 }}>
                    <Typography
                      variant="subtitle1"
                      fontWeight={600}
                      onClick={() => handleItemClick(item.id)}
                      sx={{
                        mb: 0.5,
                        cursor: 'pointer',
                        fontSize: '0.95rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        '&:hover': {
                          color: 'primary.main',
                        },
                      }}
                    >
                      {item.title}
                    </Typography>

                    <Stack direction="row" alignItems="center">
                      <Typography variant="caption" color="text.secondary">
                        By
                      </Typography>
                      <Typography variant="caption" fontWeight={600}>
                        {item.seller_username}
                      </Typography>
                      <Verified sx={{ fontSize: 12, color: 'success.main' }} />
                    </Stack>

                    <Box borderTop="1px solid rgba(0, 0, 0, 0.1)" paddingTop='10px'>
                      <Typography variant="h6" fontWeight={700} color="primary" sx={{ fontSize: '1.1rem' }}>
                        ${item.current_bid.toFixed(0)}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
                </Box>
              );
            })}
          </Box>

          {canScrollRight && (
            <IconButton
              onClick={() => scrollCarousel('right')}
              sx={{
                position: 'absolute',
                right: -20,
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 2,
                bgcolor: 'background.paper',
                boxShadow: 2,
                '&:hover': {
                  bgcolor: 'background.paper',
                  boxShadow: 4,
                },
              }}
            >
              <ChevronRight />
            </IconButton>
          )}
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
          <Button
            variant="outlined"
            onClick={() => navigate('/browse-featured')}
            sx={{
              px: 2.5,
              py: 1,
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.875rem',
              borderColor: '#0078FF',
              color: '#0078FF',
              '&:hover': {
                borderColor: '#0078FF',
                bgcolor: 'rgba(0, 120, 255, 0.08)',
              },
            }}
          >
            Show All
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
