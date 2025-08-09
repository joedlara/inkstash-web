import type {
  CollectionInsights,
  PersonalizedRecommendation,
} from '../api/ai/aiService';

import { LucideIcon } from 'lucide-react';

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  // level?: number;
  // xp?: number;
  // xpToNext?: number;
  // avatarUrl?: string;
  // isOnline?: boolean;
  preferences?: UserPreferences;
}
export interface UserProfileData {
  name: string;
  username: string;
  level: number;
  xp: number;
  xpToNext: number;
  avatarUrl?: string;
  badges: Badge[];
  isOnline?: boolean;
}

export interface UserPreferences {
  favoriteCharacters: string[];
  collectionFocus: string[];
  priceRange: {
    min: number;
    max: number;
  };
}

export interface Badge {
  id: string;
  name: string;
  icon: LucideIcon;
  color: 'blue' | 'purple' | 'green' | 'orange' | 'yellow' | 'gray';
  isNew?: boolean;
  earnedAt: string;
  description?: string;
}

export interface CollectionItem {
  id: string;
  title: string;
  category: 'comics' | 'manga' | 'trading-card' | 'figure' | 'other';
  purchasePrice: number;
  estimatedValue: number;
  currentValue?: number;
  condition: 'Mint' | 'Near Mint' | 'Very Fine' | 'Fine' | 'Good' | 'Poor';
  year?: number;
  imageUrl?: string;
  description?: string;
  dateAdded: string;
  tags?: string[];
}

export interface UserStats {
  collection: number;
  totalValue: number;
  forumPosts: number;
  watchlistItems: number;
  completedSales: number;
  averageRating: number;
  totalPurchases?: number;
  recentGains?: number;
  recentLosses?: number;
}

export interface RecentActivity {
  id: string;
  type: ActivityType;
  item: string;
  amount?: number;
  date: string;
  description?: string;
  isNew?: boolean;
  metadata?: {
    fromUser?: string;
    toUser?: string;
    rating?: number;
    bidAmount?: number;
  };
}

// ⭐ IMPORTANT: Make sure this is exported
export interface RateLimitInfo {
  canMakeRequest: boolean;
  timeUntilReset: number;
  requestsRemaining: number;
  maxRequests: number;
}

export interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  color: 'blue' | 'green' | 'purple' | 'yellow' | 'red' | 'gray';
  isLoading: boolean;
  onClick?: () => void;
  subtitle?: string;
}

export interface ActivityFeedProps {
  activities: RecentActivity[];
  isLoading: boolean;
  onViewAll: () => void;
  maxItems?: number;
}

export interface InsightsPanelProps {
  insights: CollectionInsights | null;
  isLoading: boolean;
  onGenerateInsights: () => void;
  canGenerateInsights: boolean;
}

export interface OverviewTabProps {
  userStats: UserStats;
  recentActivity: RecentActivity[];
  collectionInsights: CollectionInsights | null;
  isLoading: boolean;
  onGenerateInsights: () => void;
  canMakeAIRequest: boolean;
  aiLoading: boolean;
  insightsRequested: boolean;
}

export interface CollectionTabProps {
  collection: CollectionItem[];
  searchTerm: string;
  filterCategory: FilterCategory;
  viewMode: ViewMode;
  onSearchChange: (term: string) => void;
  onFilterChange: (category: FilterCategory) => void;
  onViewModeChange: (mode: ViewMode) => void;
  isLoading: boolean;
}

export interface RecommendationsTabProps {
  recommendations: PersonalizedRecommendation[];
  isLoading: boolean;
  onLoadRecommendations: () => void;
  canMakeAIRequest: boolean;
  user: User | null;
}

export interface InsightsTabProps {
  insights: CollectionInsights | null;
  isLoading: boolean;
  onGenerateInsights: () => void;
  canMakeAIRequest: boolean;
  lastAnalysisTime: number | null;
  collectionCount: number;
  aiLoading: boolean;
  insightsRequested: boolean;
}

export interface ErrorInfo {
  componentStack: string;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export interface BaseComponentProps {
  className?: string;
  'data-testid'?: string;
}

export interface LoadingStates {
  collection: boolean;
  ai: boolean;
  insights: boolean;
  recommendations: boolean;
  stats: boolean;
}

export interface SearchFilters {
  searchTerm: string;
  category: FilterCategory;
  sortBy: 'date' | 'value' | 'title' | 'condition';
  sortOrder: 'asc' | 'desc';
  priceRange: {
    min: number;
    max: number;
  };
}

export interface APIResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface AddItemFormData {
  title: string;
  category: CollectionItem['category'];
  purchasePrice: number;
  estimatedValue: number;
  condition: CollectionItem['condition'];
  year?: number;
  imageUrl?: string;
  description?: string;
  tags: string[];
}

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  success: string;
  warning: string;
  error: string;
  info: string;
}

// Types (make sure these are exported)
export type ActivityType =
  | 'purchase'
  | 'sale'
  | 'watchlist'
  | 'bid'
  | 'view'
  | 'milestone'
  | 'trade'
  | 'rating';

export type DashboardTab =
  | 'overview'
  | 'collection'
  | 'recommendations'
  | 'insights';

export type ViewMode = 'grid' | 'list';

export type FilterCategory =
  | 'all'
  | 'comics'
  | 'manga'
  | 'trading-card'
  | 'figure'
  | 'other';

// Event handler types
export type TabChangeHandler = (tab: DashboardTab) => void;
export type SearchChangeHandler = (searchTerm: string) => void;
export type FilterChangeHandler = (category: FilterCategory) => void;
export type ViewModeChangeHandler = (mode: ViewMode) => void;
export type AIActionHandler = () => Promise<void>;

// Utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = Pick<
  T,
  Exclude<keyof T, Keys>
> &
  {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>;
  }[Keys];

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
