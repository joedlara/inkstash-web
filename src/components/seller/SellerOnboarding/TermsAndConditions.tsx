import { Box, Typography, Checkbox, FormControlLabel } from '@mui/material';
import { CheckCircle } from '@mui/icons-material';

interface TermsAndConditionsProps {
  agreed: boolean;
  onAgreedChange: (agreed: boolean) => void;
}

const SELLER_GUIDELINES = [
  {
    title: 'Honor purchases and giveaways',
    desc: "Don't cancel auctions for going below a desired amount.",
  },
  {
    title: 'Do not sell counterfeits',
    desc: "Don't sell fake items on InkStash. If you're unsure about an item, just don't sell it.",
  },
  {
    title: 'Do not lie about an item',
    desc: "Don't mislead buyers about an item's condition, value, or anything else.",
  },
  {
    title: 'Ship quickly and safely',
    desc: 'Ship items within 2 business days after a show has ended or when an item is sold.',
  },
  {
    title: 'Pre-approval required for ages 13-17',
    desc: 'Tap here to learn more.',
  },
];

export default function TermsAndConditions({
  agreed,
  onAgreedChange,
}: TermsAndConditionsProps) {
  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom sx={{ mb: 2 }}>
        Let's get started!
      </Typography>

      <Typography variant="body1" sx={{ mb: 4 }}>
        Before you kick off your selling journey, please agree to these guidelines.
      </Typography>

      {/* Guidelines List */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mb: 4 }}>
        {SELLER_GUIDELINES.map((guideline, index) => (
          <Box key={index} sx={{ display: 'flex', gap: 2 }}>
            <CheckCircle sx={{ color: 'success.main', mt: 0.5, flexShrink: 0 }} />
            <Box>
              <Typography variant="body1" fontWeight={600} gutterBottom>
                {guideline.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {guideline.desc}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>

      {/* Agreement Checkbox */}
      <FormControlLabel
        control={
          <Checkbox
            checked={agreed}
            onChange={(e) => onAgreedChange(e.target.checked)}
            sx={{
              '&.Mui-checked': {
                color: '#0078FF',
              },
            }}
          />
        }
        label={
          <Typography variant="body2">
            By agreeing to the rules and providing my phone number to InkStash, I agree
            and acknowledge that InkStash may text my number to confirm submission
            of my responses and notify me based on my progress
          </Typography>
        }
        sx={{ alignItems: 'flex-start', mb: 2 }}
      />
    </Box>
  );
}
