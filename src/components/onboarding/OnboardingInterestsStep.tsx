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
  AutoStories,
  Whatshot,
  Brush,
  Castle,
  Movie,
  Bolt,
  Inventory2,
  Storefront,
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
    id: 'marvel',
    name: 'Marvel',
    icon: <Whatshot fontSize="large" />,
    description: 'Spider-Man, X-Men, Avengers',
    subcategories: ['X-Men', 'Spider-Man', 'Avengers', 'Fantastic Four', 'Other'],
  },
  {
    id: 'dc',
    name: 'DC',
    icon: <Bolt fontSize="large" />,
    description: 'Batman, Superman, Justice League',
    subcategories: ['Batman', 'Superman', 'Justice League', 'Wonder Woman', 'Other'],
  },
  {
    id: 'image',
    name: 'Image',
    icon: <AutoStories fontSize="large" />,
    description: 'Walking Dead, Saga, Spawn, Invincible',
    subcategories: ['Walking Dead', 'Saga', 'Spawn', 'Invincible', 'Other'],
  },
  {
    id: 'dark_horse',
    name: 'Dark Horse',
    icon: <Castle fontSize="large" />,
    description: 'Hellboy, Sin City, Buffy, Star Wars',
    subcategories: ['Hellboy', 'Sin City', 'Buffy', 'Star Wars', 'Other'],
  },
  {
    id: 'idw',
    name: 'IDW',
    icon: <Movie fontSize="large" />,
    description: 'TMNT, Transformers, GI Joe',
    subcategories: ['TMNT', 'Transformers', 'GI Joe', 'Locke & Key', 'Other'],
  },
  {
    id: 'boom',
    name: 'Boom! Studios',
    icon: <Brush fontSize="large" />,
    description: 'Lumberjanes, Power Rangers, Mouse Guard',
    subcategories: ['Lumberjanes', 'Power Rangers', 'Mouse Guard', 'Other'],
  },
  {
    id: 'indie',
    name: 'Indie / Small Press',
    icon: <Storefront fontSize="large" />,
    description: 'Pulpworks, Longshot, Kickstarter',
    subcategories: ['Pulpworks', 'Longshot', 'Self-published', 'Kickstarter', 'Other'],
  },
  {
    id: 'manga',
    name: 'Manga',
    icon: <Inventory2 fontSize="large" />,
    description: 'Shonen, Shojo, Seinen, Vintage',
    subcategories: ['Shonen Jump', 'Shojo', 'Seinen', 'Vintage', 'Other'],
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
      <Typography variant="h4" gutterBottom align="center" sx={{ fontFamily: "Big Shoulders Display, sans-serif", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.005em", color: "#16110E" }}>
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
                  borderColor: selected ? '#A1232C' : 'transparent',
                  bgcolor: selected ? alpha('#0078FF', 0.05) : 'background.paper',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    borderColor: selected ? '#A1232C' : 'divider',
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
                        color: selected ? '#A1232C' : 'text.secondary',
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
