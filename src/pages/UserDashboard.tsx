import React, { useState, useEffect, useCallback } from 'react';
import {
  useAI,
  type CollectionInsights,
  type PersonalizedRecommendation,
} from '../api/ai/aiService';
import { useAuth } from '../hooks/useAuth';
import { useCollection } from '../hooks/useCollection';

import '../styles/dashboard/userDashboard.css';
import UserProfileHeader from '../components/dashboard/UserProfileHeader';
import AIStatusBanner from '../components/dashboard/AIStatusBanner';
import NavigationTabs from '../components/dashboard/NavigationTabs';
import DashboardFooter from '../components/dashboard/DashboardFooter';
import CollectionTab from '../components/dashboard/tabs/CollectionTab';
import RecommendationsTab from '../components/dashboard/tabs/RecommendationsTab';
import InsightsTab from '../components/dashboard/tabs/InsightsTab';
import OverviewTab from '../components/dashboard/tabs/OverviewTab';

interface UserStats {
  collection: number;
  totalValue: number;
  forumPosts: number;
  watchlistItems: number;
  completedSales: number;
  averageRating: number;
}

interface RecentActivity {
  id: string;
  type: 'purchase' | 'sale' | 'watchlist' | 'bid' | 'view' | 'milestone';
  item: string;
  amount?: number;
  date: string;
  description?: string;
  isNew?: boolean;
}

const UserDashboard: React.FC = () => {
  const { user } = useAuth();
  const { collection, loading: collectionLoading } = useCollection();
  const {
    analyzeCollection,
    getRecommendations,
    loading: aiLoading,
    error: aiError,
    rateLimitInfo,
    clearCache,
  } = useAI();

  const [activeTab, setActiveTab] = useState<
    'overview' | 'collection' | 'recommendations' | 'insights'
  >('overview');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  // Dashboard data state
  const [userStats, setUserStats] = useState<UserStats>({
    collection: 0,
    totalValue: 0,
    forumPosts: 249,
    watchlistItems: 0,
    completedSales: 0,
    averageRating: 4.9,
  });

  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [collectionInsights, setCollectionInsights] =
    useState<CollectionInsights | null>(null);
  const [recommendations, setRecommendations] = useState<
    PersonalizedRecommendation[]
  >([]);

  // AI control states
  const [insightsRequested, setInsightsRequested] = useState(false);
  const [recommendationsRequested, setRecommendationsRequested] =
    useState(false);
  const [lastAnalysisTime, setLastAnalysisTime] = useState<number | null>(null);

  // Load basic dashboard data on mount
  useEffect(() => {
    if (collection.length > 0) {
      calculateUserStats();
    }
  }, [collection]);

  // Manual function to load collection insights
  const loadCollectionInsights = useCallback(async () => {
    if (!collection.length || aiLoading) return;

    // Don't auto-reload if insights were generated recently (within 10 minutes)
    const now = Date.now();
    if (lastAnalysisTime && now - lastAnalysisTime < 600000) {
      console.log('Insights recently generated, skipping auto-reload');
      return;
    }

    try {
      setInsightsRequested(true);
      const insights = await analyzeCollection(
        collection.map(item => ({
          title: item.title,
          category: item.category,
          purchasePrice: item.purchasePrice,
          currentValue: item.estimatedValue,
          condition: item.condition,
          year: item.year,
        }))
      );
      setCollectionInsights(insights);
      setLastAnalysisTime(now);
    } catch (error) {
      console.error('Failed to load collection insights:', error);
    } finally {
      setInsightsRequested(false);
    }
  }, [collection, analyzeCollection, aiLoading, lastAnalysisTime]);

  // Manual function to load recommendations
  const loadRecommendations = useCallback(async () => {
    if (!collection.length || aiLoading) return;

    try {
      setRecommendationsRequested(true);
      const userProfile = {
        favoriteCharacters: user?.preferences?.favoriteCharacters || [],
        collectionFocus: user?.preferences?.collectionFocus || [],
        recentPurchases: collection.slice(0, 5).map(item => item.title),
        priceRange: user?.preferences?.priceRange || { min: 10, max: 500 },
      };

      // Mock available items - in real app, this would come from your inventory API
      const availableItems = []; // Empty for now to avoid rate limiting

      const recs = await getRecommendations(userProfile, availableItems);
      setRecommendations(recs);
    } catch (error) {
      console.error('Failed to load recommendations:', error);
    } finally {
      setRecommendationsRequested(false);
    }
  }, [collection, user, getRecommendations, aiLoading]);

  const calculateUserStats = () => {
    const stats: UserStats = {
      collection: collection.length,
      totalValue: collection.reduce(
        (sum, item) => sum + (item.estimatedValue || 0),
        0
      ),
      forumPosts: userStats.forumPosts,
      watchlistItems: Math.floor(Math.random() * 20),
      completedSales: Math.floor(Math.random() * 10),
      averageRating: 4.5 + Math.random() * 0.5,
    };
    setUserStats(stats);

    // Mock recent activity with enhanced data
    setRecentActivity([
      {
        id: '1',
        type: 'purchase',
        item: 'Amazing Spider-Man #1',
        amount: 250,
        date: '2024-01-15',
        description: 'Added to collection',
        isNew: true,
      },
      {
        id: '2',
        type: 'watchlist',
        item: 'Batman #1 (1940)',
        date: '2024-01-14',
        description: 'Added to watchlist',
      },
      {
        id: '3',
        type: 'bid',
        item: 'Superman #1',
        amount: 180,
        date: '2024-01-13',
        description: 'Bid placed on auction',
      },
      {
        id: '4',
        type: 'sale',
        item: 'X-Men #94',
        amount: 95,
        date: '2024-01-12',
        description: 'Successfully sold',
      },
      {
        id: '5',
        type: 'milestone',
        item: 'Collection reached 100 items',
        date: '2024-01-11',
        description: 'Achievement unlocked',
        isNew: true,
      },
    ]);
  };

  const userProfileData = {
    name: user?.name || 'Collector',
    username: user?.username || 'comic_collector_pro',
    level: user?.level || 8,
    xp: user?.xp || 3240,
    xpToNext: user?.xpToNext || 4000,
    avatarUrl: user?.avatar,
    badges: [
      { id: '1', name: 'Power Seller', icon: 'power-seller', color: 'blue' },
      { id: '2', name: 'Manga Master', icon: 'manga-master', color: 'purple' },
      { id: '3', name: 'Forum Regular', icon: 'forum-regular', color: 'green' },
      {
        id: '4',
        name: 'Daily Devotee',
        icon: 'daily-devotee',
        color: 'orange',
      },
    ],
  };

  return (
    <div className="dashboard-container">
      <UserProfileHeader user={userProfileData} />
      <AIStatusBanner
        rateLimitInfo={rateLimitInfo}
        aiError={aiError}
        onClearCache={clearCache}
      />
      <NavigationTabs activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="content-container">
        {activeTab === 'overview' && (
          <OverviewTab
            userStats={userStats}
            recentActivity={recentActivity}
            collectionInsights={collectionInsights}
            isLoading={collectionLoading}
            onGenerateInsights={loadCollectionInsights}
            canMakeAIRequest={rateLimitInfo.canMakeRequest}
            aiLoading={false}
            insightsRequested={false}
          />
        )}

        {activeTab === 'collection' && (
          <CollectionTab
            collection={collection}
            searchTerm={searchTerm}
            filterCategory={filterCategory}
            viewMode={viewMode}
            onSearchChange={setSearchTerm}
            onFilterChange={setFilterCategory}
            onViewModeChange={setViewMode}
          />
        )}

        {activeTab === 'recommendations' && (
          <RecommendationsTab
            recommendations={recommendations}
            isLoading={aiLoading || recommendationsRequested}
            onLoadRecommendations={loadRecommendations}
            canMakeAIRequest={rateLimitInfo.canMakeRequest}
            user={null}
          />
        )}

        {activeTab === 'insights' && (
          <InsightsTab
            insights={collectionInsights}
            isLoading={aiLoading || insightsRequested}
            onGenerateInsights={loadCollectionInsights}
            canMakeAIRequest={rateLimitInfo.canMakeRequest}
            lastAnalysisTime={lastAnalysisTime}
            collectionCount={collection.length}
            aiLoading={false}
            insightsRequested={false}
          />
        )}
      </div>

      <DashboardFooter
        rateLimitInfo={rateLimitInfo}
        collectionCount={collection.length}
        onClearCache={clearCache}
      />
    </div>
  );
};

export default UserDashboard;
