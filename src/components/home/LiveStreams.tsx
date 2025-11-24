import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../api/supabase/supabaseClient';
import { cache } from '../../utils/cache';
import { Box, Typography, Chip, Skeleton, Grid } from '@mui/material';

interface LiveStream {
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

export default function LiveStreams() {
  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [sellers, setSellers] = useState<Record<string, Seller>>({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const hasFetched = useRef(false);

  useEffect(() => {
    async function fetchLiveStreams() {
      // Check cache first
      const streamsCacheKey = 'live-streams';
      const sellersCacheKey = 'live-streams-sellers';
      const cachedStreams = cache.get<LiveStream[]>(streamsCacheKey);
      const cachedSellers = cache.get<Record<string, Seller>>(sellersCacheKey);

      if (cachedStreams && cachedSellers) {
        setStreams(cachedStreams);
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
        // Fetch live streams from database
        const { data: livestreamData, error } = await supabase
          .from('livestreams')
          .select('id, title, description, thumbnail_url, seller_id, is_live, category, current_viewers')
          .eq('is_live', true)
          .order('current_viewers', { ascending: false })
          .limit(15);

        if (error) {
          throw error;
        }

        // If we have data, use it
        if (livestreamData && livestreamData.length > 0) {
          const streams: LiveStream[] = livestreamData.map((stream) => ({
            id: stream.id,
            title: stream.title || 'Untitled',
            description: stream.description,
            thumbnail_url: stream.thumbnail_url || 'https://developers.elementor.com/docs/assets/img/elementor-placeholder-image.png',
            seller_id: stream.seller_id,
            is_live: stream.is_live,
            category: stream.category || 'General',
            current_viewers: stream.current_viewers || 0,
          }));

          // Fetch seller data for each stream
          const sellerIds = [...new Set(streams.map(s => s.seller_id))];
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
          cache.set(streamsCacheKey, streams, 60 * 1000);
          cache.set(sellersCacheKey, sellersMap, 60 * 1000);

          setStreams(streams);
          setSellers(sellersMap);
        }

        setLoading(false);
      } catch (error) {
        console.error('Error fetching live streams:', error);
        setStreams([]);
        setSellers({});
        setLoading(false);
      }
    }

    fetchLiveStreams();
  }, []);

  const handleStreamClick = (streamId: string) => {
    navigate(`/item/${streamId}`);
  };

  if (loading) {
    return (
      <Box
        sx={{
          width: '100%',
          pt: 2,
          pb: 0,
          bgcolor: '#f8fafc',
          overflow: 'hidden',
          borderTop: '1px solid #e2e8f0',
          mt: 1.5,
        }}
      >
        <Box sx={{ mb: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5" fontWeight={700} color="#1e293b">
            Live Streams
          </Typography>
        </Box>
        <Box sx={{ pt: 1, pb: 1 }}>
          <Grid container spacing={1.25}>
            {Array.from({ length: 8 }).map((_, i) => (
              <Grid item xs={6} sm={6} md={4} lg={2.4} xl={2} key={i}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, pb: 0.5 }}>
                  <Skeleton variant="circular" width={28} height={28} />
                  <Skeleton width={100} height={14} />
                </Box>
                <Skeleton variant="rectangular" height={320} sx={{ borderRadius: '12px' }} />
                <Box sx={{ pt: 0.75 }}>
                  <Skeleton width="80%" height={20} sx={{ mb: 0.5 }} />
                  <Skeleton width="60%" height={16} />
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Box>
    );
  }

  if (streams.length === 0) {
    return (
      <Box
        sx={{
          width: '100%',
          pt: 2,
          pb: 0,
          bgcolor: '#f8fafc',
          overflow: 'hidden',
          borderTop: '1px solid #e2e8f0',
          mt: 1.5,
        }}
      >
        <Box sx={{ mb: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5" fontWeight={700} color="#1e293b">
            Live Streams
          </Typography>
        </Box>
        <Box sx={{ pt: 1, pb: 1 }}>
          <Box sx={{ maxWidth: 400, mx: 'auto', my: 8, textAlign: 'center' }}>
            <Box sx={{ fontSize: '4rem', mb: 2 }}>📡</Box>
            <Typography variant="h6" fontWeight={600} color="text.primary" sx={{ mb: 1 }}>
              No live streams right now
            </Typography>
            <Typography color="text.secondary">
              Check back later for live auctions
            </Typography>
          </Box>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: '100%',
        pt: 2,
        pb: 0,
        bgcolor: '#f8fafc',
        overflow: 'hidden',
        borderTop: '1px solid #e2e8f0',
        mt: 1.5,
      }}
    >
      <Box sx={{ mb: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" fontWeight={700} color="#1e293b">
          Live Streams
        </Typography>
      </Box>

      <Box sx={{ pt: 1, pb: 1 }}>
        <Grid
          container
          spacing={{ xs: 0.625, sm: 0.75, md: 1, lg: 1.25 }}
          sx={{
            gridTemplateColumns: {
              xs: 'repeat(2, 1fr)',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(3, 1fr)',
              lg: 'repeat(3, 1fr)',
              xl: 'repeat(5, 1fr)',
            },
          }}
        >
          {streams.map((stream) => {
            const seller = sellers[stream.seller_id];

            return (
              <Grid item xs={6} sm={6} md={4} lg={2.4} xl={2} key={stream.id}>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateRows: '2.25rem max-content auto',
                    width: '100%',
                    minWidth: 0,
                    height: '100%',
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
                      navigate(`/seller/${stream.seller_id}`);
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
                        border: '2px solid #e5e7eb',
                      }}
                    />
                    <Typography
                      sx={{
                        fontSize: { xs: '0.8125rem', sm: '0.875rem' },
                        fontWeight: 600,
                        color: '#1e293b',
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
                      height: { xs: 230, sm: 320 },
                      overflow: 'hidden',
                      bgcolor: '#000000',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      flexShrink: 0,
                      '&:hover img': {
                        transform: 'scale(1.05)',
                      },
                    }}
                    onClick={() => handleStreamClick(stream.id)}
                  >
                    <Box
                      sx={{
                        position: 'absolute',
                        top: '0.625rem',
                        left: '0.625rem',
                        right: '0.625rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        zIndex: 2,
                      }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.25,
                          px: 0.5,
                          py: 0.25,
                          bgcolor: 'rgba(239, 68, 68, 0.95)',
                          color: 'white',
                          borderRadius: '4px',
                          fontSize: { xs: '0.5625rem', sm: '0.625rem', md: '0.6875rem' },
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
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
                        Live · {stream.current_viewers.toLocaleString()}
                      </Box>
                    </Box>
                    <Box
                      component="img"
                      src={stream.thumbnail_url || 'https://developers.elementor.com/docs/assets/img/elementor-placeholder-image.png'}
                      alt={stream.title}
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
                      pt: { xs: 0.5, sm: 0.625, md: 0.75 },
                      display: 'flex',
                      flexDirection: 'column',
                      cursor: 'pointer',
                      minWidth: 0,
                      flex: 1,
                    }}
                    onClick={() => handleStreamClick(stream.id)}
                  >
                    <Typography
                      sx={{
                        fontSize: { xs: '0.75rem', sm: '0.8125rem', md: '0.875rem', lg: '0.9375rem' },
                        fontWeight: 600,
                        color: '#1e293b',
                        mb: 0.5,
                        lineHeight: 1.4,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        wordBreak: 'break-word',
                      }}
                    >
                      {stream.title}
                    </Typography>
                    <Box
                      sx={{
                        display: 'flex',
                        gap: 0.5,
                        alignItems: 'center',
                        flexWrap: 'nowrap',
                        overflow: 'hidden',
                      }}
                    >
                      <Chip
                        label={stream.category}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/browse?category=${stream.category}`);
                        }}
                        sx={{
                          px: { xs: 0.5, sm: 0.75 },
                          height: { xs: 24, sm: 28 },
                          fontSize: { xs: '0.625rem', sm: '0.6875rem', md: '0.75rem' },
                          fontWeight: 600,
                          bgcolor: '#3395FF',
                          color: '#ffffff',
                          cursor: 'pointer',
                          flexShrink: 0,
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            bgcolor: '#2678CC',
                            transform: 'translateY(-1px)',
                          },
                          '& .MuiChip-label': {
                            px: { xs: 0.5, sm: 0.75 },
                          },
                        }}
                      />
                      {stream.description && (
                        <Typography
                          sx={{
                            fontSize: { xs: '0.5625rem', sm: '0.625rem', md: '0.6875rem', lg: '0.75rem' },
                            fontWeight: 400,
                            color: '#64748b',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            flex: 1,
                            minWidth: 0,
                          }}
                        >
                          {stream.description}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </Box>
              </Grid>
            );
          })}
        </Grid>
      </Box>
    </Box>
  );
}
