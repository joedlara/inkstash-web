import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActionArea,
  Grid,
  Chip,
  alpha,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import {
  SportsEsports,
  MenuBook,
  Toys,
  Stars,
  SportsBaseball,
  Palette,
  LocalOffer,
  Category,
} from '@mui/icons-material';

interface CollectionCategory {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  subcategories?: string[];
}

const COLLECTION_CATEGORIES: CollectionCategory[] = [
  {
    id: 'trading_cards',
    name: 'Trading Cards',
    icon: <LocalOffer fontSize="large" />,
    description: 'Pokémon, Magic, Yu-Gi-Oh, Sports',
    subcategories: ['Pokemon', 'Magic The Gathering', 'Yu-Gi-Oh', 'Sports Cards', 'Other TCG'],
  },
  {
    id: 'comics',
    name: 'Comics',
    icon: <MenuBook fontSize="large" />,
    description: 'Marvel, DC, Independent',
    subcategories: ['Marvel', 'DC Comics', 'Independent', 'Manga', 'Graphic Novels'],
  },
  {
    id: 'action_figures',
    name: 'Action Figures',
    icon: <Toys fontSize="large" />,
    description: 'Vintage and Modern',
    subcategories: ['Star Wars', 'Marvel Legends', 'NECA', 'Funko', 'Hot Toys'],
  },
  {
    id: 'vintage_toys',
    name: 'Vintage Toys',
    icon: <Stars fontSize="large" />,
    description: 'Classic collectibles',
    subcategories: ['G.I. Joe', 'Transformers', 'He-Man', 'TMNT', 'Other Vintage'],
  },
  {
    id: 'sports_memorabilia',
    name: 'Sports Memorabilia',
    icon: <SportsBaseball fontSize="large" />,
    description: 'Autographs, jerseys, cards',
    subcategories: ['Basketball', 'Football', 'Baseball', 'Soccer', 'Hockey'],
  },
  {
    id: 'art_prints',
    name: 'Art & Prints',
    icon: <Palette fontSize="large" />,
    description: 'Limited editions, posters',
    subcategories: ['Movie Posters', 'Concert Posters', 'Fine Art', 'Photography'],
  },
  {
    id: 'gaming',
    name: 'Video Games',
    icon: <SportsEsports fontSize="large" />,
    description: 'Retro and modern games',
    subcategories: ['Nintendo', 'PlayStation', 'Xbox', 'Retro Games', 'PC Games'],
  },
  {
    id: 'other',
    name: 'Other Collectibles',
    icon: <Category fontSize="large" />,
    description: 'Coins, stamps, and more',
    subcategories: ['Coins', 'Stamps', 'Vinyl Records', 'Sneakers', 'Watches'],
  },
];

interface OnboardingInterestsStepProps {
  onNext: (interests: string[]) => void;
  onBack?: () => void;
  onSkip?: () => void;
  initialInterests?: string[];
}

const OnboardingInterestsStep: React.FC<OnboardingInterestsStepProps> = ({
  onNext,
  onBack,
  onSkip,
  initialInterests = [],
}) => {
  const [selectedCategories, setSelectedCategories] = useState<string[]>(initialInterests);

  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleContinue = () => {
    if (selectedCategories.length > 0) {
      onNext(selectedCategories);
    }
  };

  const isSelected = (categoryId: string) => selectedCategories.includes(categoryId);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '500px',
        maxWidth: '900px',
        mx: 'auto',
        px: 3,
        py: 2,
      }}
    >
      <Typography variant="h4" fontWeight="bold" gutterBottom align="center">
        What do you collect?
      </Typography>

      <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 4 }}>
        Select all that apply to personalize your experience
      </Typography>

      {selectedCategories.length > 0 && (
        <Box sx={{ mb: 3, display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}>
          {selectedCategories.map((categoryId) => {
            const category = COLLECTION_CATEGORIES.find((cat) => cat.id === categoryId);
            return (
              <Chip
                key={categoryId}
                label={category?.name}
                onDelete={() => handleCategoryToggle(categoryId)}
                color="primary"
              />
            );
          })}
        </Box>
      )}

      <Grid container spacing={2} sx={{ flex: 1, mb: 3 }}>
        {COLLECTION_CATEGORIES.map((category) => {
          const selected = isSelected(category.id);
          return (
            <Grid item xs={12} sm={6} md={3} key={category.id}>
              <Card
                sx={{
                  height: '100%',
                  position: 'relative',
                  border: 2,
                  borderColor: selected ? 'primary.main' : 'transparent',
                  bgcolor: selected ? alpha('#0078FF', 0.05) : 'background.paper',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    borderColor: selected ? 'primary.main' : 'divider',
                    transform: 'translateY(-4px)',
                    boxShadow: 3,
                  },
                }}
              >
                <CardActionArea
                  onClick={() => handleCategoryToggle(category.id)}
                  sx={{ height: '100%' }}
                >
                  <CardContent
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center',
                      py: 3,
                    }}
                  >
                    {selected && (
                      <CheckCircleIcon
                        color="primary"
                        sx={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                        }}
                      />
                    )}

                    <Box
                      sx={{
                        color: selected ? 'primary.main' : 'text.secondary',
                        mb: 1.5,
                      }}
                    >
                      {category.icon}
                    </Box>

                    <Typography
                      variant="subtitle1"
                      fontWeight={selected ? 'bold' : 'medium'}
                      gutterBottom
                    >
                      {category.name}
                    </Typography>

                    <Typography variant="caption" color="text.secondary">
                      {category.description}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
        {onBack && (
          <Button variant="outlined" size="large" onClick={onBack} sx={{ minWidth: 120 }}>
            Back
          </Button>
        )}
        <Button
          variant="contained"
          size="large"
          onClick={handleContinue}
          disabled={selectedCategories.length === 0}
          sx={{ minWidth: 120 }}
        >
          Continue
        </Button>
        {onSkip && (
          <Button variant="text" size="large" onClick={onSkip} sx={{ minWidth: 120 }}>
            Finish Later
          </Button>
        )}
      </Box>

      <Typography variant="caption" color="text.secondary" align="center" sx={{ mt: 2 }}>
        Step 2 of 4 • You can update this later in settings
      </Typography>
    </Box>
  );
};

export default OnboardingInterestsStep;
export { COLLECTION_CATEGORIES };
export type { CollectionCategory };
