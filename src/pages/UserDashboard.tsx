import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  Package,
  Eye,
  DollarSign,
  Star,
  BarChart3,
  Award,
  Target,
  AlertCircle,
  Plus,
  Search,
  MessageSquareText,
  Grid,
  List,
  RefreshCw,
  Zap,
  Clock,
} from 'lucide-react';
import {
  useAI,
  type CollectionInsights,
  type PersonalizedRecommendation,
} from '../api/ai/aiService';
import { useAuth } from '../hooks/useAuth';
import { useCollection } from '../hooks/useCollection';

import '../styles/userDashboard.css';

import StatsCard from '../components/dashboard/shared/StatsCard';
import InsightsPanel from '../components/dashboard/shared/InsightsPanel';
import ActivityFeed from '../components/dashboard/shared/ActivityFeed';

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
    console.log(stats);
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

  const filteredCollection = collection.filter(item => {
    const matchesSearch = item.category
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesCategory =
      filterCategory === 'all' || item.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  // Format time remaining for rate limit
  const formatTimeRemaining = (ms: number): string => {
    const seconds = Math.ceil(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.ceil(seconds / 60);
    return `${minutes}m`;
  };

  const CollectionItem: React.FC<{ item: any }> = ({ item }) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="aspect-w-16 aspect-h-9">
        <img
          src={item.imageUrl || '/placeholder-comic.jpg'}
          alt={item.title}
          className="w-full h-48 object-cover"
        />
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 truncate">{item.title}</h3>
        <p className="text-sm text-gray-600">{item.category}</p>
        <div className="mt-2 flex justify-between items-center">
          <span className="text-lg font-bold text-green-600">
            ${item.estimatedValue || 'N/A'}
          </span>
          <span
            className={`px-2 py-1 rounded text-xs font-medium ${
              item.condition === 'Mint'
                ? 'bg-green-100 text-green-800'
                : item.condition === 'Near Mint'
                  ? 'bg-blue-100 text-blue-800'
                  : item.condition === 'Very Fine'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-gray-100 text-gray-800'
            }`}
          >
            {item.condition}
          </span>
        </div>
      </div>
    </div>
  );

  // AI Status Component
  const AIStatusBanner: React.FC = () => {
    if (!rateLimitInfo.canMakeRequest && rateLimitInfo.timeUntilReset > 0) {
      return (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <Clock className="w-5 h-5 text-yellow-600 mr-2" />
            <div>
              <h4 className="text-sm font-medium text-yellow-800">
                AI Features Rate Limited
              </h4>
              <p className="text-sm text-yellow-700 mt-1">
                Please wait {formatTimeRemaining(rateLimitInfo.timeUntilReset)}{' '}
                before using AI features again.
              </p>
            </div>
          </div>
        </div>
      );
    }

    if (aiError) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-red-800">AI Error</h4>
              <p className="text-sm text-red-700 mt-1">{aiError}</p>
            </div>
            <button
              onClick={() => clearCache()}
              className="ml-4 px-3 py-1 bg-red-100 text-red-800 rounded text-sm hover:bg-red-200"
            >
              Clear Cache
            </button>
          </div>
        </div>
      );
    }

    return null;
  };

  if (collectionLoading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="dashboard-header">
        <h1 className="dashboard-title">
          Welcome back, {user?.name || 'Collector'}!
        </h1>
        <p className="dashboard-subtitle">
          Manage your collection and discover new treasures
        </p>
      </div>

      {/* AI Status Banner */}
      <AIStatusBanner />

      {/* Navigation Tabs */}
      <div className="nav-tabs">
        {[
          {
            key: 'overview',
            label: 'Overview',
            icon: <BarChart3 className="w-4 h-4" />,
          },
          {
            key: 'collection',
            label: 'My Collection',
            icon: <Package className="w-4 h-4" />,
          },
          {
            key: 'recommendations',
            label: 'For You',
            icon: <Star className="w-4 h-4" />,
          },
          {
            key: 'insights',
            label: 'AI Insights',
            icon: <TrendingUp className="w-4 h-4" />,
          },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`tab-button ${activeTab === tab.key ? 'active' : ''}`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content Container */}
      <div className="content-container">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Stats Grid */}
            <div className="stats-grid">
              <StatsCard
                title="Collection"
                value={userStats.collection}
                icon={<Package className="w-6 h-6" />}
                trend="+12% this month"
                color="blue"
                isLoading={collectionLoading}
              />
              <StatsCard
                title="Total Value"
                value={`$${userStats.totalValue.toLocaleString()}`}
                icon={<DollarSign className="w-6 h-6" />}
                trend="+2 this month"
                color="green"
                isLoading={collectionLoading}
              />
              <StatsCard
                title="Forum Posts"
                value={userStats.forumPosts}
                icon={<MessageSquareText className="w-6 h-6" />}
                trend="Community engagement"
                color="purple"
                isLoading={collectionLoading}
              />
              <StatsCard
                title="Seller Rating"
                value={userStats.averageRating.toFixed(1)}
                icon={<Star className="w-6 h-6" />}
                color="yellow"
                isLoading={collectionLoading}
              />
            </div>

            {/* Main Content Grid */}
            <div className="main-content-grid">
              {/* Activity Feed */}
              <ActivityFeed
                activities={recentActivity}
                isLoading={collectionLoading}
                onViewAll={() => console.log('View all activities')}
              />

              {/* Quick Insights Panel */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Zap className="w-5 h-5 mr-2 text-blue-600" />
                  AI Insights
                </h3>
                {collectionInsights ? (
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600">Collection Value</p>
                      <p className="text-lg font-semibold text-green-600">
                        ${collectionInsights.totalValue.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">
                        Diversification Score
                      </p>
                      <div className="flex items-center">
                        <div className="w-full bg-gray-200 rounded-full h-2 mr-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{
                              width: `${collectionInsights.diversificationScore * 10}%`,
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium">
                          {collectionInsights.diversificationScore}/10
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveTab('insights')}
                      className="w-full mt-3 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                    >
                      View Full Analysis
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <TrendingUp className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 mb-3">
                      Generate AI insights for your collection
                    </p>
                    <button
                      onClick={loadCollectionInsights}
                      disabled={
                        aiLoading ||
                        insightsRequested ||
                        !rateLimitInfo.canMakeRequest
                      }
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      {aiLoading || insightsRequested ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin inline mr-2" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4 inline mr-2" />
                          Analyze Collection
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Quick Actions
              </h3>
              <div className="quick-actions">
                <button className="action-button primary">
                  <Plus className="w-4 h-4" />
                  <span>Add Item</span>
                </button>
                <button className="action-button secondary">
                  <Search className="w-4 h-4" />
                  <span>Browse Market</span>
                </button>
                <button
                  className="action-button secondary"
                  onClick={loadCollectionInsights}
                  disabled={
                    aiLoading ||
                    insightsRequested ||
                    !rateLimitInfo.canMakeRequest
                  }
                >
                  <TrendingUp className="w-4 h-4" />
                  <span>Get AI Insights</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Collection Tab */}
        {activeTab === 'collection' && (
          <div className="space-y-6">
            {/* Collection Controls */}
            <div className="collection-controls">
              <div className="search-controls">
                <div className="search-input">
                  <Search className="search-icon w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search your collection..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
                <select
                  value={filterCategory}
                  onChange={e => setFilterCategory(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">All Categories</option>
                  <option value="comics">Comics</option>
                  <option value="manga">Manga</option>
                  <option value="trading-card">Trading Cards</option>
                  <option value="figure">Figures</option>
                </select>
              </div>
              <div className="view-controls">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`view-button ${viewMode === 'grid' ? 'active' : ''}`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`view-button ${viewMode === 'list' ? 'active' : ''}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Collection Grid */}
            <div className={`collection-grid ${viewMode}-view`}>
              {filteredCollection.map(item => (
                <CollectionItem key={item.id} item={item} />
              ))}
            </div>

            {filteredCollection.length === 0 && (
              <div className="empty-state">
                <Package className="empty-state-icon" />
                <h3>No items found</h3>
                <p>Try adjusting your search or filter criteria</p>
              </div>
            )}
          </div>
        )}

        {/* Recommendations Tab */}
        {activeTab === 'recommendations' && (
          <div className="space-y-6">
            <div className="recommendations-header">
              <h2 className="recommendations-title">Personalized for You</h2>
              <p className="recommendations-subtitle">
                Based on your collection and preferences
              </p>
            </div>

            {recommendations.length > 0 ? (
              <div className="recommendations-grid">
                {recommendations.map(rec => (
                  <div key={rec.itemId} className="recommendation-card">
                    <h3 className="font-semibold text-gray-900 mb-2">
                      {rec.title}
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">{rec.reason}</p>
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-green-600">
                        ${rec.priceRange.min}-${rec.priceRange.max}
                      </span>
                      <div className="flex items-center space-x-1">
                        <Star className="w-4 h-4 text-yellow-400 fill-current" />
                        <span className="text-sm text-gray-600">
                          {rec.confidence}/10
                        </span>
                      </div>
                    </div>
                    <button className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                      View Details
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div className="text-center py-12">
                  <Star className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No recommendations yet
                  </h3>
                  <p className="text-gray-500 mb-6">
                    Generate personalized recommendations based on your
                    collection
                  </p>
                  <button
                    onClick={loadRecommendations}
                    disabled={
                      aiLoading ||
                      recommendationsRequested ||
                      !rateLimitInfo.canMakeRequest
                    }
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {aiLoading || recommendationsRequested ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin inline mr-2" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 inline mr-2" />
                        Get Recommendations
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* AI Insights Tab */}
        {activeTab === 'insights' && (
          <div className="space-y-6">
            {collectionInsights ? (
              <>
                <InsightsPanel
                  insights={collectionInsights}
                  isLoading={aiLoading}
                  onGenerateInsights={loadCollectionInsights}
                />

                {/* Investment Recommendations */}
                <div className="insights-section">
                  <h2 className="insights-header">
                    <TrendingUp className="w-5 h-5" />
                    Investment Recommendations
                  </h2>
                  <div className="insights-list">
                    {collectionInsights.investmentRecommendations.map(
                      (rec, index) => (
                        <div key={index} className="insights-item">
                          <Award className="insights-icon w-5 h-5 text-blue-600" />
                          <p className="text-gray-700">{rec}</p>
                        </div>
                      )
                    )}
                  </div>
                </div>

                {/* Missing Key Issues */}
                <div className="insights-section">
                  <h2 className="insights-header">
                    <AlertCircle className="w-5 h-5" />
                    Gaps in Your Collection
                  </h2>
                  <div className="insights-list">
                    {collectionInsights.missingKeyIssues.map((item, index) => (
                      <div key={index} className="insights-item">
                        <Target className="insights-icon w-5 h-5 text-orange-600" />
                        <p className="text-gray-700">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Collection Analytics */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Collection Analytics
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        ${collectionInsights.totalValue.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-600">Total Value</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {collectionInsights.diversificationScore}/10
                      </div>
                      <div className="text-sm text-gray-600">
                        Diversification
                      </div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600 capitalize">
                        {collectionInsights.riskProfile}
                      </div>
                      <div className="text-sm text-gray-600">Risk Profile</div>
                    </div>
                  </div>

                  {collectionInsights.topItems.length > 0 && (
                    <div className="mt-6">
                      <h4 className="font-medium text-gray-900 mb-3">
                        Top Valuable Items
                      </h4>
                      <div className="space-y-2">
                        {collectionInsights.topItems
                          .slice(0, 5)
                          .map((item, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded"
                            >
                              <span className="text-sm text-gray-700">
                                #{index + 1} {item}
                              </span>
                              <Award className="w-4 h-4 text-yellow-500" />
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Refresh Analysis Button */}
                <div className="text-center">
                  <button
                    onClick={loadCollectionInsights}
                    disabled={
                      aiLoading ||
                      insightsRequested ||
                      !rateLimitInfo.canMakeRequest
                    }
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {aiLoading || insightsRequested ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin inline mr-2" />
                        Refreshing Analysis...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-5 h-5 inline mr-2" />
                        Refresh Analysis
                      </>
                    )}
                  </button>
                  {lastAnalysisTime && (
                    <p className="text-sm text-gray-500 mt-2">
                      Last updated:{' '}
                      {new Date(lastAnalysisTime).toLocaleString()}
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div className="empty-state">
                <div className="text-center py-12">
                  <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No insights generated yet
                  </h3>
                  <p className="text-gray-500 mb-6">
                    Analyze your collection to get AI-powered insights and
                    recommendations
                  </p>
                  <button
                    onClick={loadCollectionInsights}
                    disabled={
                      aiLoading ||
                      insightsRequested ||
                      !rateLimitInfo.canMakeRequest ||
                      collection.length === 0
                    }
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {aiLoading || insightsRequested ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin inline mr-2" />
                        Analyzing Collection...
                      </>
                    ) : (
                      <>
                        <Zap className="w-5 h-5 inline mr-2" />
                        Analyze My Collection
                      </>
                    )}
                  </button>
                  {collection.length === 0 && (
                    <p className="text-sm text-gray-400 mt-4">
                      Add items to your collection first
                    </p>
                  )}
                  {!rateLimitInfo.canMakeRequest && (
                    <p className="text-sm text-yellow-600 mt-4">
                      Rate limit reached. Try again in{' '}
                      {formatTimeRemaining(rateLimitInfo.timeUntilReset)}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer with AI Status */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <div
                className={`w-2 h-2 rounded-full mr-2 ${rateLimitInfo.canMakeRequest ? 'bg-green-500' : 'bg-red-500'}`}
              />
              <span>
                AI Status:{' '}
                {rateLimitInfo.canMakeRequest ? 'Available' : 'Rate Limited'}
              </span>
            </div>
            {!rateLimitInfo.canMakeRequest &&
              rateLimitInfo.timeUntilReset > 0 && (
                <span>
                  Reset in: {formatTimeRemaining(rateLimitInfo.timeUntilReset)}
                </span>
              )}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => clearCache()}
              className="text-blue-600 hover:text-blue-800"
            >
              Clear AI Cache
            </button>
            <span>•</span>
            <span>Collection: {collection.length} items</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
