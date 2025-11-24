import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button, Stack } from '@mui/material';

interface Category {
  id: string;
  name: string;
  viewers: string;
  image_url: string;
  color: string;
}

const categories: Category[] = [
  {
    id: 'sneakers',
    name: 'Sneakers',
    viewers: '3.7K Viewers',
    image_url: 'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=800',
    color: '#8B7355',
  },
  {
    id: 'electronics',
    name: 'Everyday Electronics',
    viewers: '5K Viewers',
    image_url: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=800',
    color: '#4169E1',
  },
  {
    id: 'pokemon-cards',
    name: 'Pokémon Cards',
    viewers: '11K Viewers',
    image_url: 'https://images.unsplash.com/photo-1606503153255-59d8b8b82176?w=800',
    color: '#FFD700',
  },
  {
    id: 'womens-contemporary',
    name: "Women's Contemporary",
    viewers: '6.3K Viewers',
    image_url: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800',
    color: '#C71585',
  },
  {
    id: 'makeup-skincare',
    name: 'Makeup & Skincare',
    viewers: '2.3K Viewers',
    image_url: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800',
    color: '#FF69B4',
  },
  {
    id: 'streetwear',
    name: 'Streetwear',
    viewers: '1.1K Viewers',
    image_url: 'https://images.unsplash.com/photo-1529374255404-311a2a4f1fd9?w=800',
    color: '#2F4F4F',
  },
  {
    id: 'fragrances-perfume',
    name: 'Fragrances & Perfume',
    viewers: '962 Viewers',
    image_url: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=800',
    color: '#9370DB',
  },
  {
    id: 'football-cards',
    name: 'Football Cards',
    viewers: '4.9K Viewers',
    image_url: 'https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=800',
    color: '#006400',
  },
];

export default function Categories() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'forYou' | 'following'>('forYou');

  const handleCategoryClick = (categoryId: string) => {
    navigate(`/browse?category=${categoryId}`);
  };

  const handleTabClick = (tab: 'forYou' | 'following') => {
    setActiveTab(tab);
  };

  return (
    <Box
      component="section"
      sx={{
        width: '100%',
        py: 1,
        bgcolor: '#f8fafc',
        overflow: 'hidden',
        borderTop: '1px solid #e2e8f0',
        mt: 1.5,
      }}
    >
      <Box sx={{ maxWidth: '100%', mx: 'auto', px: 0 }}>
        <Box sx={{ mb: 0.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5" fontWeight={700} color="#1e293b">
            Categories You Might Like
          </Typography>
        </Box>

        {/* Mobile tabs (For You and Following) */}
        <Stack
          direction="row"
          spacing={0.5}
          sx={{
            display: { xs: 'flex', md: 'none' },
            mb: 0.75,
            overflowX: 'auto',
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
          }}
        >
          <Button
            onClick={() => handleTabClick('forYou')}
            sx={{
              minWidth: { xs: 100, sm: 120 },
              px: { xs: 1, sm: 1.25 },
              py: { xs: 0.5, sm: 0.625 },
              bgcolor: activeTab === 'forYou' ? '#000' : 'white',
              color: activeTab === 'forYou' ? 'white' : '#1e293b',
              border: '2px solid',
              borderColor: activeTab === 'forYou' ? '#000' : '#e2e8f0',
              borderRadius: 999,
              fontSize: { xs: '0.875rem', sm: '0.9375rem' },
              fontWeight: 600,
              textTransform: 'none',
              flexShrink: 0,
              transition: 'all 0.2s',
              '&:hover': {
                bgcolor: activeTab === 'forYou' ? '#000' : 'white',
                borderColor: activeTab === 'forYou' ? '#000' : '#cbd5e1',
              },
            }}
          >
            For You
          </Button>
          <Button
            onClick={() => handleTabClick('following')}
            sx={{
              minWidth: { xs: 100, sm: 120 },
              px: { xs: 1, sm: 1.25 },
              py: { xs: 0.5, sm: 0.625 },
              bgcolor: activeTab === 'following' ? '#000' : 'white',
              color: activeTab === 'following' ? 'white' : '#1e293b',
              border: '2px solid',
              borderColor: activeTab === 'following' ? '#000' : '#e2e8f0',
              borderRadius: 999,
              fontSize: { xs: '0.875rem', sm: '0.9375rem' },
              fontWeight: 600,
              textTransform: 'none',
              flexShrink: 0,
              transition: 'all 0.2s',
              '&:hover': {
                bgcolor: activeTab === 'following' ? '#000' : 'white',
                borderColor: activeTab === 'following' ? '#000' : '#cbd5e1',
              },
            }}
          >
            Following
          </Button>
        </Stack>

        <Stack
          direction="row"
          spacing={1}
          sx={{
            py: 1,
            overflowX: 'auto',
            scrollBehavior: 'smooth',
            '&::-webkit-scrollbar': {
              height: '8px',
              display: 'none',
            },
            '&:hover::-webkit-scrollbar': {
              display: 'block',
            },
            '&::-webkit-scrollbar-track': {
              background: 'rgba(0, 0, 0, 0.05)',
              borderRadius: '4px',
            },
            '&::-webkit-scrollbar-thumb': {
              background: 'rgba(0, 0, 0, 0.2)',
              borderRadius: '4px',
              '&:hover': {
                background: 'rgba(0, 0, 0, 0.3)',
              },
            },
            scrollbarWidth: 'none',
            '&:hover': {
              scrollbarWidth: 'thin',
            },
          }}
        >
          {categories.map((category) => (
            <Box
              key={category.id}
              onClick={() => handleCategoryClick(category.id)}
              sx={{
                position: 'relative',
                minWidth: { xs: 180, sm: 200, md: 230, lg: 250, xl: 280 },
                maxWidth: { xs: 180, sm: 200, md: 230, lg: 250, xl: 280 },
                aspectRatio: '16 / 9',
                borderRadius: '12px',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                bgcolor: category.color,
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
                  '& img': {
                    opacity: 0.5,
                    transform: 'scale(1.05)',
                  },
                },
              }}
            >
              <Box
                component="img"
                src={category.image_url}
                alt={category.name}
                sx={{
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  opacity: 0.4,
                  transition: 'opacity 0.3s ease, transform 0.3s ease',
                }}
              />
              <Box
                sx={{
                  position: 'relative',
                  zIndex: 2,
                  textAlign: 'center',
                  px: 1,
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 0.5,
                }}
              >
                <Typography
                  sx={{
                    fontSize: { xs: '0.875rem', sm: '0.9375rem', md: '1rem', lg: '1.125rem' },
                    fontWeight: 700,
                    color: '#ffffff',
                    textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
                    lineHeight: 1.2,
                  }}
                >
                  {category.name}
                </Typography>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.375,
                    fontSize: { xs: '0.75rem', sm: '0.8125rem', md: '0.875rem' },
                    fontWeight: 600,
                    color: '#ffffff',
                    textShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
                  }}
                >
                  <Box
                    sx={{
                      width: { xs: 5, sm: 6 },
                      height: { xs: 5, sm: 6 },
                      borderRadius: '50%',
                      bgcolor: '#ef4444',
                      animation: 'pulse-viewer 2s infinite',
                      '@keyframes pulse-viewer': {
                        '0%, 100%': { opacity: 1 },
                        '50%': { opacity: 0.6 },
                      },
                    }}
                  />
                  {category.viewers}
                </Box>
              </Box>
            </Box>
          ))}
        </Stack>
      </Box>
    </Box>
  );
}
