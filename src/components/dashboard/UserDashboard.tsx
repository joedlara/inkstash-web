import React, { useState, useEffect } from 'react';
import {
  User,
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
  Filter,
  Search,
  Grid,
  List,
} from 'lucide-react';
import {
  useAI,
  CollectionInsights,
  PersonalizedRecommendation,
} from '../../api/ai/aiService';
import { useAuth } from '../../hooks/useAuth';
import { useCollection } from '../../hooks/useCollection';

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
  type: 'purchase' | 'sale' | 'watchlist' | 'bid';
  item: string;
  amount?: number;
  date: string;
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

    // Mock recent activity
    setRecentActivity([
      {
        id: '1',
        type: 'purchase',
        item: 'Amazing Spider-Man #1',
        amount: 250,
        date: '2024-01-15',
      },
      {
        id: '2',
        type: 'watchlist',
        item: 'Batman #1 (1940)',
        date: '2024-01-14',
      },
      {
        id: '3',
        type: 'bid',
        item: 'Superman #1',
        amount: 180,
        date: '2024-01-13',
      },
      {
        id: '4',
        type: 'sale',
        item: 'X-Men #94',
        amount: 95,
        date: '2024-01-12',
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

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ReactNode;
    trend?: string;
    color?: string;
  }> = ({ title, value, icon, trend, color = 'blue' }) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
          {trend && (
            <p
              className={`text-sm mt-1 ${trend.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}
            >
              {trend}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-full bg-${color}-100`}>
          <div className={`text-${color}-600`}>{icon}</div>
        </div>
      </div>
    </div>
  );

  const ActivityItem: React.FC<{ activity: RecentActivity }> = ({
    activity,
  }) => {
    const getActivityIcon = () => {
      switch (activity.type) {
        case 'purchase':
          return <ShoppingBag className="w-4 h-4 text-green-600" />;
        case 'sale':
          return <DollarSign className="w-4 h-4 text-blue-600" />;
        case 'watchlist':
          return <Heart className="w-4 h-4 text-red-600" />;
        case 'bid':
          return <Target className="w-4 h-4 text-orange-600" />;
        default:
          return <Activity className="w-4 h-4 text-gray-600" />;
      }
    };

    return (
      <div className="flex items-center space-x-3 py-3">
        {getActivityIcon()}
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900">{activity.item}</p>
          <p className="text-xs text-gray-500 capitalize">{activity.type}</p>
        </div>
        <div className="text-right">
          {activity.amount && (
            <p className="text-sm font-medium text-gray-900">
              ${activity.amount}
            </p>
          )}
          <p className="text-xs text-gray-500">{activity.date}</p>
        </div>
      </div>
    );
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

  if (collectionLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {user?.name || 'Collector'}!
        </h1>
        <p className="text-gray-600 mt-1">
          Manage your collection and discover new treasures
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="mb-8">
        <nav className="flex space-x-8">
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
              className={`flex items-center space-x-2 px-3 py-2 font-medium text-sm rounded-md ${
                activeTab === tab.key
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Total Items"
              value={userStats.totalItems}
              icon={<Package className="w-6 h-6" />}
              trend="+2 this month"
              color="blue"
            />
            <StatCard
              title="Collection Value"
              value={`$${userStats.totalValue.toLocaleString()}`}
              icon={<DollarSign className="w-6 h-6" />}
              trend="+12% this month"
              color="green"
            />
            <StatCard
              title="Profile Views"
              value={userStats.recentViews}
              icon={<Eye className="w-6 h-6" />}
              trend="+8 this week"
              color="purple"
            />
            <StatCard
              title="Seller Rating"
              value={userStats.averageRating.toFixed(1)}
              icon={<Star className="w-6 h-6" />}
              color="yellow"
            />
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Recent Activity */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Recent Activity
                </h2>
                <div className="space-y-1">
                  {recentActivity.map(activity => (
                    <ActivityItem key={activity.id} activity={activity} />
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="space-y-6">
              {/* Collection Highlights */}
              {collectionInsights && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Collection Highlights
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">
                        Diversification Score
                      </span>
                      <span className="text-sm font-medium">
                        {collectionInsights.diversificationScore}/10
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">
                        Risk Profile
                      </span>
                      <span
                        className={`text-sm font-medium capitalize ${
                          collectionInsights.riskProfile === 'conservative'
                            ? 'text-green-600'
                            : collectionInsights.riskProfile === 'moderate'
                              ? 'text-yellow-600'
                              : 'text-red-600'
                        }`}
                      >
                        {collectionInsights.riskProfile}
                      </span>
                    </div>
                    <div className="pt-3 border-t">
                      <p className="text-sm font-medium text-gray-900 mb-2">
                        Top Items:
                      </p>
                      {collectionInsights.topItems
                        .slice(0, 3)
                        .map((item, index) => (
                          <p key={index} className="text-xs text-gray-600">
                            • {item}
                          </p>
                        ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Quick Actions
                </h3>
                <div className="space-y-3">
                  <button className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                    <Plus className="w-4 h-4" />
                    <span>Add Item</span>
                  </button>
                  <button className="w-full flex items-center justify-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">
                    <Search className="w-4 h-4" />
                    <span>Browse Market</span>
                  </button>
                  <button className="w-full flex items-center justify-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">
                    <TrendingUp className="w-4 h-4" />
                    <span>Get AI Insights</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Collection Tab */}
      {activeTab === 'collection' && (
        <div className="space-y-6">
          {/* Collection Controls */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search your collection..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <select
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Categories</option>
                <option value="comic">Comics</option>
                <option value="manga">Manga</option>
                <option value="trading-card">Trading Cards</option>
                <option value="figure">Figures</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-400'}`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-400'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Collection Grid */}
          <div
            className={`grid gap-6 ${
              viewMode === 'grid'
                ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                : 'grid-cols-1'
            }`}
          >
            {filteredCollection.map(item => (
              <CollectionItem key={item.id} item={item} />
            ))}
          </div>

          {filteredCollection.length === 0 && (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No items found
              </h3>
              <p className="text-gray-500">
                Try adjusting your search or filter criteria
              </p>
            </div>
          )}
        </div>
      )}

      {/* Recommendations Tab */}
      {activeTab === 'recommendations' && (
        <div className="space-y-6">
          <div className="bg-blue-50 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Personalized for You
            </h2>
            <p className="text-gray-600">
              Based on your collection and preferences
            </p>
          </div>

          {aiLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-4">Loading recommendations...</p>
            </div>
          ) : recommendations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recommendations.map(rec => (
                <div
                  key={rec.itemId}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
                >
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
            <div className="text-center py-12">
              <Star className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No recommendations yet
              </h3>
              <p className="text-gray-500">
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
          {collectionInsights ? (
            <div className="space-y-6">
              {/* Investment Recommendations */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2" />
                  Investment Recommendations
                </h2>
                <div className="space-y-3">
                  {collectionInsights.investmentRecommendations.map(
                    (rec, index) => (
                      <div key={index} className="flex items-start space-x-3">
                        <Award className="w-5 h-5 text-blue-600 mt-0.5" />
                        <p className="text-gray-700">{rec}</p>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Missing Key Issues */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <AlertCircle className="w-5 h-5 mr-2" />
                  Gaps in Your Collection
                </h2>
                <div className="space-y-3">
                  {collectionInsights.missingKeyIssues.map((item, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <Target className="w-5 h-5 text-orange-600 mt-0.5" />
                      <p className="text-gray-700">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              {aiLoading ? (
                <>
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-500 mt-4">
                    Analyzing your collection...
                  </p>
                </>
              ) : (
                <>
                  <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No insights available
                  </h3>
                  <p className="text-gray-500">
                    Add items to your collection to get AI-powered insights
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UserDashboard;
