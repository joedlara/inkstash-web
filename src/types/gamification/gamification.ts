import { supabase } from '../../api/supabase/supabaseClient';
import { useState, useMemo } from 'react';

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

export class GamificationService {
  private supabase: any;

  constructor(supabaseClient: any) {
    this.supabase = supabaseClient;
  }

  async checkAndAwardBadges(
    userId: string,
    action: string,
    metadata?: any
  ): Promise<Badge[]> {
    const userProgress = await this.getUserProgress(userId);
    const newBadges: Badge[] = [];

    for (const badge of BADGE_DEFINITIONS) {
      if (userProgress.badges.includes(badge.id)) continue;

      if (
        await this.checkBadgeCriteria(badge, userProgress, action, metadata)
      ) {
        await this.awardBadge(userId, badge);
        newBadges.push(badge);
      }
    }

    return newBadges;
  }

  private async checkBadgeCriteria(
    badge: Badge,
    userProgress: UserProgress,
    action: string,
    metadata?: any
  ): Promise<boolean> {
    const { criteria } = badge;

    switch (criteria.type) {
      case 'sales':
        return userProgress.stats.totalSales >= (criteria.threshold || 0);
      case 'purchases':
        return userProgress.stats.totalPurchases >= (criteria.threshold || 0);
      case 'collection':
        if (criteria.specific) {
          const categoryCount = await this.getCategoryCollectionCount(
            userProgress.userId,
            criteria.specific[0]
          );
          return categoryCount >= (criteria.threshold || 0);
        }
        return userProgress.stats.itemsPurchased >= (criteria.threshold || 0);
      case 'community':
        if (criteria.metadata?.activity === 'livestream') {
          return (
            userProgress.stats.livestreamAttendance >= (criteria.threshold || 0)
          );
        }
        return userProgress.stats.forumPosts >= (criteria.threshold || 0);
      case 'time':
        if (criteria.metadata?.streak === 'daily_login') {
          return userProgress.streaks.dailyLogin >= (criteria.threshold || 0);
        }
        return userProgress.stats.daysActive >= (criteria.threshold || 0);
      case 'special':
        return criteria.specific?.includes(metadata?.type) || false;
    }
    return false;
  }

  async awardBadge(userId: string, badge: Badge): Promise<void> {
    await this.supabase.from('user_badges').insert({
      user_id: userId,
      badge_id: badge.id,
      awarded_at: new Date().toISOString(),
    });

    await this.supabase.rpc('add_user_points', {
      user_id: userId,
      points: badge.points,
    });

    await this.sendBadgeNotification(userId, badge);
  }

  async getUserProgress(userId: string): Promise<UserProgress> {
    const { data: progress, error } = await this.supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !progress) {
      return this.createDefaultProgress(userId);
    }

    return progress;
  }

  private createDefaultProgress(userId: string): UserProgress {
    return {
      userId,
      level: 1,
      totalPoints: 0,
      badges: [],
      achievements: [],
      stats: {
        totalSales: 0,
        totalPurchases: 0,
        itemsSold: 0,
        itemsPurchased: 0,
        collectionsCreated: 0,
        forumPosts: 0,
        livestreamAttendance: 0,
        referralCount: 0,
        daysActive: 0,
      },
      streaks: {
        dailyLogin: 0,
        bidding: 0,
        selling: 0,
        forumActivity: 0,
      },
    };
  }

  async updateUserStats(
    userId: string,
    action: string,
    value: number = 1
  ): Promise<void> {
    await this.supabase.rpc('update_user_stat', {
      user_id: userId,
      stat_name: action,
      increment_value: value,
    });
  }

  calculateLevel(points: number): number {
    const levels = [0, 100, 300, 600, 1000, 1500, 2200, 3000, 4000, 5200, 6600];

    for (let i = levels.length - 1; i >= 0; i--) {
      if (points >= levels[i]) {
        return i + 1;
      }
    }
    return 1;
  }

  private async getCategoryCollectionCount(
    userId: string,
    category: string
  ): Promise<number> {
    const { count } = await this.supabase
      .from('user_collections')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('category', category);

    return count || 0;
  }

  private async sendBadgeNotification(
    userId: string,
    badge: Badge
  ): Promise<void> {
    await this.supabase.from('notifications').insert({
      user_id: userId,
      type: 'badge_awarded',
      title: `New Badge Unlocked: ${badge.name}`,
      message: badge.description,
      metadata: { badge_id: badge.id, points: badge.points },
      created_at: new Date().toISOString(),
    });
  }
}

export const useGamification = () => {
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);
  const [loading, setLoading] = useState(true);

  const gamificationService = useMemo(
    () => new GamificationService(supabase),
    []
  );

  const checkForBadges = async (action: string, metadata?: any) => {
    if (!userProgress) return;

    const newBadges = await gamificationService.checkAndAwardBadges(
      userProgress.userId,
      action,
      metadata
    );

    if (newBadges.length > 0) {
      newBadges.forEach(badge => {
        console.log(`🎉 New badge: ${badge.name}`);
      });

      const updated = await gamificationService.getUserProgress(
        userProgress.userId
      );
      setUserProgress(updated);
    }
  };

  return {
    userProgress,
    checkForBadges,
    loading,
    badges: BADGE_DEFINITIONS,
  };
};
