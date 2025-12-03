import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../api/supabase/supabaseClient';
import { cache } from '../../utils/cache';
import { Box, Typography, Button, Skeleton, Stack } from '@mui/material';

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

  if (loading) {
    return (
      <Box
        component="section"
        sx={{
          width: '100%',
          py: 1.5,
          bgcolor: '#1a1a1a',
          mt: 1.5,
          borderRadius: { xs: 0, sm: '1.5rem' },
          ml: { xs: '-1.5rem', sm: 0 },
          mr: { xs: '-1.5rem', sm: 0 },
          width: { xs: 'calc(100% + 3rem)', sm: '100%' },
        }}
      >
        <Box sx={{ maxWidth: '100%', mx: 'auto', px: { xs: 0, sm: 1.5 } }}>
          <Box sx={{ px: { xs: 1.5, sm: 0 }, mb: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h5" fontWeight={700} color="#ffffff">
              Popular Shows
            </Typography>
          </Box>
          <Stack
            direction="row"
            spacing={1.25}
            sx={{
              px: { xs: 1.5, sm: 0 },
              overflowX: 'auto',
              pb: 1,
              '&::-webkit-scrollbar': { display: 'none' },
              scrollbarWidth: 'none',
            }}
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <Box key={i} sx={{ minWidth: 200, maxWidth: 200, flexShrink: 0 }}>
                <Skeleton variant="circular" width={28} height={28} sx={{ bgcolor: 'rgba(255,255,255,0.1)', mb: 0.5 }} />
                <Skeleton variant="rectangular" height={267} sx={{ bgcolor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                <Skeleton width="80%" height={20} sx={{ bgcolor: 'rgba(255,255,255,0.1)', mt: 0.75 }} />
                <Skeleton width="60%" height={16} sx={{ bgcolor: 'rgba(255,255,255,0.1)', mt: 0.25 }} />
              </Box>
            ))}
          </Stack>
        </Box>
      </Box>
    );
  }

  if (shows.length === 0) {
    return null;
  }

  return (
    <Box
      component="section"
      sx={{
        width: '100%',
        py: 1.5,
        bgcolor: '#1a1a1a',
        overflow: 'hidden',
        mt: 1.5,
        borderRadius: { xs: 0, sm: '1.5rem' },
        ml: { xs: '-1.5rem', sm: 0 },
        mr: { xs: '-1.5rem', sm: 0 },
        width: { xs: 'calc(100% + 3rem)', sm: '100%' },
      }}
    >
      <Box sx={{ maxWidth: '100%', mx: 'auto', px: { xs: 0, sm: 1.5 } }}>
        <Box sx={{ px: { xs: 1.5, sm: 0 }, mb: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5" fontWeight={700} color="#ffffff">
            Popular Shows
          </Typography>
          <Button
            onClick={() => navigate('/browse-popular-lives')}
            sx={{
              color: '#ffffff',
              fontSize: '0.9375rem',
              fontWeight: 600,
              textTransform: 'none',
              px: 1,
              py: 0.5,
              borderRadius: '6px',
              transition: 'background 0.2s ease',
              '&:hover': {
                bgcolor: 'rgba(255, 255, 255, 0.1)',
              },
            }}
          >
            Show All <Box component="span" sx={{ fontSize: '1.5rem', fontWeight: 300, ml: 0.25 }}>›</Box>
          </Button>
        </Box>

        <Stack
          direction="row"
          spacing={1.25}
          sx={{
            px: { xs: 1.5, sm: 0 },
            overflowX: 'auto',
            pb: 1,
            '&::-webkit-scrollbar': {
              height: '8px',
              display: 'none',
            },
            '&:hover::-webkit-scrollbar': {
              display: 'block',
            },
            '&::-webkit-scrollbar-track': {
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '4px',
            },
            '&::-webkit-scrollbar-thumb': {
              background: 'rgba(255, 255, 255, 0.3)',
              borderRadius: '4px',
              '&:hover': {
                background: 'rgba(255, 255, 255, 0.5)',
              },
            },
            scrollbarWidth: 'none',
            '&:hover': {
              scrollbarWidth: 'thin',
            },
          }}
        >
          {shows.map((show) => {
            const seller = sellers[show.seller_id];

            return (
              <Box
                key={show.id}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  minWidth: { xs: 130, sm: 140, md: 160, lg: 180, xl: 200 },
                  maxWidth: { xs: 130, sm: 140, md: 160, lg: 180, xl: 200 },
                  flexShrink: 0,
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    pb: 0.5,
                    cursor: 'pointer',
                    transition: 'opacity 0.2s ease',
                    '&:hover': { opacity: 0.8 },
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/@${seller?.username}`);
                  }}
                >
                  <Box
                    component="img"
                    src={seller?.avatar_url || 'https://www.pikpng.com/pngl/b/80-805068_my-profile-icon-blank-profile-picture-circle-clipart.png'}
                    alt={seller?.username}
                    sx={{
                      width: { xs: 24, sm: 28 },
                      height: { xs: 24, sm: 28 },
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '2px solid rgba(255, 255, 255, 0.2)',
                    }}
                  />
                  <Typography
                    sx={{
                      fontSize: { xs: '0.8125rem', sm: '0.875rem' },
                      fontWeight: 600,
                      color: '#ffffff',
                    }}
                  >
                    {seller?.username}
                  </Typography>
                </Box>

                <Box
                  sx={{
                    position: 'relative',
                    width: '100%',
                    aspectRatio: '3 / 4',
                    overflow: 'hidden',
                    bgcolor: '#000000',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    flexShrink: 0,
                    '&:hover img': {
                      transform: 'scale(1.05)',
                    },
                  }}
                  onClick={() => handleShowClick(show.id)}
                >
                  <Box
                    sx={{
                      position: 'absolute',
                      top: '0.625rem',
                      left: '0.625rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.25,
                      px: 0.5,
                      py: 0.25,
                      bgcolor: 'rgba(239, 68, 68, 0.95)',
                      color: 'white',
                      borderRadius: '4px',
                      fontSize: { xs: '0.5625rem', sm: '0.6875rem' },
                      fontWeight: 700,
                      zIndex: 2,
                    }}
                  >
                    <Box
                      sx={{
                        width: { xs: 4, sm: 5 },
                        height: { xs: 4, sm: 5 },
                        borderRadius: '50%',
                        bgcolor: 'white',
                        animation: 'pulse-dot 1.5s infinite',
                        '@keyframes pulse-dot': {
                          '0%, 100%': { opacity: 1 },
                          '50%': { opacity: 0.5 },
                        },
                      }}
                    />
                    Live · {show.current_viewers.toLocaleString()}
                  </Box>
                  <Box
                    component="img"
                    src={show.thumbnail_url || 'https://developers.elementor.com/docs/assets/img/elementor-placeholder-image.png'}
                    alt={show.title}
                    sx={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      transition: 'transform 0.3s ease',
                      display: 'block',
                    }}
                  />
                </Box>

                <Box
                  sx={{
                    pt: 0.75,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0.25,
                    cursor: 'pointer',
                    flex: 1,
                  }}
                  onClick={() => handleShowClick(show.id)}
                >
                  <Typography
                    sx={{
                      fontSize: { xs: '0.75rem', sm: '0.8125rem', md: '0.875rem', lg: '0.9375rem' },
                      fontWeight: 600,
                      color: '#ffffff',
                      lineHeight: 1.3,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      wordBreak: 'break-word',
                      minHeight: '2.438rem',
                    }}
                  >
                    {show.title}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: { xs: '0.6875rem', sm: '0.75rem', md: '0.8125rem' },
                      color: 'rgba(255, 255, 255, 0.6)',
                    }}
                  >
                    {show.category}
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Stack>
      </Box>
    </Box>
  );
}
