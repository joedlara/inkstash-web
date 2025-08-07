export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  criteria: BadgeCriteria;
  points: number;
}

export interface BadgeCriteria {
  type: 'sales' | 'purchases' | 'collection' | 'community' | 'time' | 'special';
  threshold?: number;
  specific?: string[];
  metadata?: Record<string, any>;
}

export interface UserProgress {
  userId: string;
  level: number;
  totalPoints: number;
  badges: string[];
  achievements: Achievement[];
  stats: UserStats;
  streaks: UserStreaks;
}

export interface Achievement {
  id: string;
  badgeId: string;
  unlockedAt: Date;
  progress?: number;
  maxProgress?: number;
}

export interface UserStats {
  totalSales: number;
  totalPurchases: number;
  itemsSold: number;
  itemsPurchased: number;
  collectionsCreated: number;
  forumPosts: number;
  livestreamAttendance: number;
  referralCount: number;
  daysActive: number;
}

export interface UserStreaks {
  dailyLogin: number;
  bidding: number;
  selling: number;
  forumActivity: number;
}

export const BADGE_DEFINITIONS: Badge[] = [
  // Seller Badges
  {
    id: 'first_sale',
    name: 'First Sale',
    description: 'Made your first sale on InkStash!',
    icon: '🎉',
    rarity: 'common',
    criteria: { type: 'sales', threshold: 1 },
    points: 50,
  },
  {
    id: 'power_seller',
    name: 'Power Seller',
    description: 'Sold 50+ items',
    icon: '⚡',
    rarity: 'rare',
    criteria: { type: 'sales', threshold: 50 },
    points: 500,
  },
  {
    id: 'comic_dealer',
    name: 'Comic Dealer',
    description: 'Specialized in selling comics',
    icon: '📚',
    rarity: 'uncommon',
    criteria: { type: 'sales', threshold: 25, specific: ['comics'] },
    points: 250,
  },

  // Buyer/Collector Badges
  {
    id: 'first_purchase',
    name: 'Welcome Collector',
    description: 'Made your first purchase!',
    icon: '🛒',
    rarity: 'common',
    criteria: { type: 'purchases', threshold: 1 },
    points: 25,
  },
  {
    id: 'manga_master',
    name: 'Manga Master',
    description: 'Collected 100+ manga items',
    icon: '🗾',
    rarity: 'rare',
    criteria: { type: 'collection', threshold: 100, specific: ['manga'] },
    points: 400,
  },
  {
    id: 'whale_collector',
    name: 'Whale Collector',
    description: 'Spent over $10,000',
    icon: '🐋',
    rarity: 'legendary',
    criteria: { type: 'purchases', threshold: 10000 },
    points: 1000,
  },

  // Community Badges
  {
    id: 'forum_regular',
    name: 'Forum Regular',
    description: 'Made 100+ forum posts',
    icon: '💬',
    rarity: 'uncommon',
    criteria: { type: 'community', threshold: 100 },
    points: 200,
  },
  {
    id: 'livestream_fan',
    name: 'Livestream Fan',
    description: 'Attended 20+ livestreams',
    icon: '📺',
    rarity: 'uncommon',
    criteria: {
      type: 'community',
      threshold: 20,
      metadata: { activity: 'livestream' },
    },
    points: 150,
  },

  // Special/Time-based Badges
  {
    id: 'founding_member',
    name: 'Founding Member',
    description: 'One of the first 1000 users!',
    icon: '👑',
    rarity: 'legendary',
    criteria: { type: 'special', specific: ['early_adopter'] },
    points: 2000,
  },
  {
    id: 'daily_devotee',
    name: 'Daily Devotee',
    description: 'Logged in 30 days in a row',
    icon: '🔥',
    rarity: 'rare',
    criteria: {
      type: 'time',
      threshold: 30,
      metadata: { streak: 'daily_login' },
    },
    points: 300,
  },
];
