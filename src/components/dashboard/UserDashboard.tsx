import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Package,
  Heart,
  Eye,
  DollarSign,
  Star,
  BarChart3,
  ShoppingBag,
  Activity,
  Award,
  Target,
  AlertCircle,
  Plus,
  Search,
  Grid,
  List,
} from 'lucide-react';
import {
  useAI,
  type CollectionInsights,
  type PersonalizedRecommendation,
} from '../../api/ai/aiService';
import { useAuth } from '../../hooks/useAuth';
import { useCollection } from '../../hooks/useCollection';

import '../../styles/userDashboard.css';

import StatsCard from './StatsCard';
import InsightsPanel from './InsightsPanel';
import ActivityFeed from './ActivityFeed';

interface UserStats {
  totalItems: number;
  totalValue: number;
  recentViews: number;
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
  const { analyzeCollection, getRecommendations, loading: aiLoading } = useAI();

  const [activeTab, setActiveTab] = useState<
    'overview' | 'collection' | 'recommendations' | 'insights'
  >('overview');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  // Dashboard data state
  const [userStats, setUserStats] = useState<UserStats>({
    totalItems: 0,
    totalValue: 0,
    recentViews: 0,
    watchlistItems: 0,
    completedSales: 0,
    averageRating: 0,
  });

  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [collectionInsights, setCollectionInsights] =
    useState<CollectionInsights | null>(null);
  const [recommendations, setRecommendations] = useState<
    PersonalizedRecommendation[]
  >([]);

  // Load dashboard data
  useEffect(() => {
    if (collection.length > 0) {
      loadCollectionInsights();
      loadRecommendations();
      calculateUserStats();
    }
  }, [collection]);

  const loadCollectionInsights = async () => {
    try {
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
    } catch (error) {
      console.error('Failed to load collection insights:', error);
    }
  };

  const loadRecommendations = async () => {
    try {
      const userProfile = {
        favoriteCharacters: user?.preferences?.favoriteCharacters || [],
        collectionFocus: user?.preferences?.collectionFocus || [],
        recentPurchases: collection.slice(0, 5).map(item => item.title),
        priceRange: user?.preferences?.priceRange || { min: 10, max: 500 },
      };

      // Mock available items - in real app, this would come from your inventory API
      const availableItems = [];

      const recs = await getRecommendations(userProfile, availableItems);
      setRecommendations(recs);
    } catch (error) {
      console.error('Failed to load recommendations:', error);
    }
  };

  const calculateUserStats = () => {
    const stats: UserStats = {
      totalItems: collection.length,
      totalValue: collection.reduce(
        (sum, item) => sum + (item.estimatedValue || 0),
        0
      ),
      recentViews: Math.floor(Math.random() * 100), // Mock data
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

  const filteredCollection = collection.filter(item => {
    const matchesSearch = item.title
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesCategory =
      filterCategory === 'all' || item.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

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
                title="Total Items"
                value={userStats.totalItems}
                icon={<Package className="w-6 h-6" />}
                trend="+2 this month"
                color="blue"
                isLoading={collectionLoading}
              />
              <StatsCard
                title="Collection Value"
                value={`$${userStats.totalValue.toLocaleString()}`}
                icon={<DollarSign className="w-6 h-6" />}
                trend="+12% this month"
                color="green"
                isLoading={collectionLoading}
              />
              <StatsCard
                title="Profile Views"
                value={userStats.recentViews}
                icon={<Eye className="w-6 h-6" />}
                trend="+8 this week"
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

              {/* Insights Panel */}
              <InsightsPanel
                insights={collectionInsights}
                isLoading={aiLoading}
                onGenerateInsights={loadCollectionInsights}
                onViewDetails={() => setActiveTab('insights')}
              />
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
                <button className="action-button secondary">
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
                  <option value="comic">Comics</option>
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

            {aiLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-500 mt-4">Loading recommendations...</p>
              </div>
            ) : recommendations.length > 0 ? (
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
                <Star className="empty-state-icon" />
                <h3>No recommendations yet</h3>
                <p>
                  Add more items to your collection to get personalized
                  suggestions
                </p>
              </div>
            )}
          </div>
        )}

        {/* AI Insights Tab */}
        {activeTab === 'insights' && (
          <div className="space-y-6">
            <InsightsPanel
              insights={collectionInsights}
              isLoading={aiLoading}
              onGenerateInsights={loadCollectionInsights}
            />

            {/* Additional Insights Sections */}
            {collectionInsights && (
              <>
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
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDashboard;
