// src/components/dashboard/tabs/OverviewTab.tsx

import React, { memo } from 'react';
import {
  TrendingUp,
  Plus,
  Search,
  Zap,
  RefreshCw,
  Package,
  DollarSign,
  MessageSquareText,
  Star,
} from 'lucide-react';
import type { OverviewTabProps } from '../../../types/dashboard';
import StatsCard from '../shared/StatsCard';
import ActivityFeed from '../shared/ActivityFeed';
import QuickActionsPanel from '../QuickActionsPanel';
import '../../../styles/dashboard/tabs/OverviewTab.css';

// Memoized Quick Insights Panel Component
const QuickInsightsPanel = memo<{
  collectionInsights: OverviewTabProps['collectionInsights'];
  onGenerateInsights: OverviewTabProps['onGenerateInsights'];
  canMakeAIRequest: boolean;
  aiLoading: boolean;
  insightsRequested: boolean;
}>(
  ({
    collectionInsights,
    onGenerateInsights,
    canMakeAIRequest,
    aiLoading,
    insightsRequested,
  }) => (
    <div className="quick-insights-panel">
      <h3 className="insights-panel-title">
        <Zap className="w-5 h-5 mr-2 text-blue-600" />
        AI Insights
      </h3>
      {collectionInsights ? (
        <div className="insights-content">
          <div className="insight-item">
            <p className="insight-label">Collection Value</p>
            <p className="insight-value text-green-600">
              ${collectionInsights.totalValue.toLocaleString()}
            </p>
          </div>
          <div className="insight-item">
            <p className="insight-label">Diversification Score</p>
            <div className="insight-progress">
              <div className="progress-bar-container">
                <div
                  className="progress-bar bg-blue-600"
                  style={{
                    width: `${collectionInsights.diversificationScore * 10}%`,
                  }}
                />
              </div>
              <span className="progress-text">
                {collectionInsights.diversificationScore}/10
              </span>
            </div>
          </div>
          <div className="insight-item">
            <p className="insight-label">Risk Profile</p>
            <p
              className={`insight-badge risk-${collectionInsights.riskProfile.toLowerCase()}`}
            >
              {collectionInsights.riskProfile}
            </p>
          </div>
          <button
            onClick={() => {
              // This would typically navigate to insights tab
              console.log('Navigate to insights tab');
            }}
            className="view-full-analysis-btn"
          >
            View Full Analysis
          </button>
        </div>
      ) : (
        <div className="empty-insights">
          <TrendingUp className="empty-icon" />
          <p className="empty-text">Generate AI insights for your collection</p>
          <button
            onClick={onGenerateInsights}
            disabled={aiLoading || insightsRequested || !canMakeAIRequest}
            className="generate-insights-btn"
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
  )
);

QuickInsightsPanel.displayName = 'QuickInsightsPanel';

// Memoized Stats Grid Component
const StatsGrid = memo<{
  userStats: OverviewTabProps['userStats'];
  isLoading: boolean;
}>(({ userStats, isLoading }) => (
  <div className="stats-grid">
    <StatsCard
      title="Collection"
      value={userStats.collection}
      icon={<Package className="w-6 h-6" />}
      trend="+12% this month"
      color="blue"
      isLoading={isLoading}
    />
    <StatsCard
      title="Total Value"
      value={`$${userStats.totalValue.toLocaleString()}`}
      icon={<DollarSign className="w-6 h-6" />}
      trend="+2 this month"
      color="green"
      isLoading={isLoading}
    />
    <StatsCard
      title="Forum Posts"
      value={userStats.forumPosts}
      icon={<MessageSquareText className="w-6 h-6" />}
      trend="Community engagement"
      color="purple"
      isLoading={isLoading}
    />
    <StatsCard
      title="Seller Rating"
      value={userStats.averageRating.toFixed(1)}
      icon={<Star className="w-6 h-6" />}
      color="yellow"
      isLoading={isLoading}
    />
  </div>
));

StatsGrid.displayName = 'StatsGrid';

// Memoized Performance Summary Component
const PerformanceSummary = memo<{
  userStats: OverviewTabProps['userStats'];
  isLoading: boolean;
}>(({ userStats, isLoading }) => {
  const totalPurchases = userStats.totalPurchases || 0;
  const totalSales = userStats.completedSales;
  const successRate =
    totalPurchases > 0 ? (totalSales / totalPurchases) * 100 : 0;

  return (
    <div className="performance-summary">
      <h3 className="performance-title">Performance Summary</h3>
      <div className="performance-metrics">
        <div className="metric">
          <span className="metric-label">Success Rate</span>
          <span className="metric-value">{successRate.toFixed(1)}%</span>
        </div>
        <div className="metric">
          <span className="metric-label">Avg Rating</span>
          <span className="metric-value">
            {userStats.averageRating.toFixed(1)}/5
          </span>
        </div>
        <div className="metric">
          <span className="metric-label">Watchlist</span>
          <span className="metric-value">{userStats.watchlistItems}</span>
        </div>
      </div>
    </div>
  );
});

PerformanceSummary.displayName = 'PerformanceSummary';

// Main OverviewTab Component
const OverviewTab: React.FC<OverviewTabProps> = memo(
  ({
    userStats,
    recentActivity,
    collectionInsights,
    isLoading,
    onGenerateInsights,
    canMakeAIRequest,
    aiLoading,
    insightsRequested,
  }) => {
    return (
      <div className="overview-tab">
        {/* Stats Grid */}
        <StatsGrid userStats={userStats} isLoading={isLoading} />

        {/* Main Content Grid */}
        <div className="main-content-grid">
          {/* Activity Feed */}

          <ActivityFeed
            activities={recentActivity}
            isLoading={isLoading}
            onViewAll={() => console.log('View all activities')}
          />

          {/* Quick Insights Panel */}

          <QuickInsightsPanel
            collectionInsights={collectionInsights}
            onGenerateInsights={onGenerateInsights}
            canMakeAIRequest={canMakeAIRequest}
            aiLoading={aiLoading}
            insightsRequested={insightsRequested}
          />
        </div>

        {/* Secondary Content Grid */}
        <div className="secondary-content-grid">
          {/* Performance Summary */}

          <PerformanceSummary userStats={userStats} isLoading={isLoading} />

          {/* Quick Actions */}

          <QuickActionsPanel
            onAddItem={() => console.log('Add item')}
            onBrowseMarket={() => console.log('Browse market')}
            onGenerateInsights={onGenerateInsights}
            aiLoading={aiLoading || insightsRequested}
            canMakeAIRequest={canMakeAIRequest}
          />
        </div>

        {/* Collection Highlights */}
        {userStats.collection > 0 && (
          <div className="collection-highlights">
            <h3 className="highlights-title">Collection Highlights</h3>
            <div className="highlights-grid">
              <div className="highlight-card">
                <div className="highlight-header">
                  <Package className="highlight-icon" />
                  <h4>Total Items</h4>
                </div>
                <div className="highlight-value">{userStats.collection}</div>
                <div className="highlight-description">Items in collection</div>
              </div>

              <div className="highlight-card">
                <div className="highlight-header">
                  <DollarSign className="highlight-icon" />
                  <h4>Portfolio Value</h4>
                </div>
                <div className="highlight-value">
                  ${userStats.totalValue.toLocaleString()}
                </div>
                <div className="highlight-description">
                  Current estimated value
                </div>
              </div>

              <div className="highlight-card">
                <div className="highlight-header">
                  <TrendingUp className="highlight-icon" />
                  <h4>Recent Growth</h4>
                </div>
                <div className="highlight-value text-green-600">+12%</div>
                <div className="highlight-description">This month</div>
              </div>
            </div>
          </div>
        )}

        {/* Welcome Message for New Users */}
        {userStats.collection === 0 && (
          <div className="welcome-section">
            <div className="welcome-content">
              <h3 className="welcome-title">
                Welcome to Your Collection Dashboard!
              </h3>
              <p className="welcome-description">
                Start building your collection by adding your first item. Once
                you have items, you'll see insights, analytics, and personalized
                recommendations here.
              </p>
              <div className="welcome-actions">
                <button className="welcome-button primary">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Item
                </button>
                <button className="welcome-button secondary">
                  <Search className="w-4 h-4 mr-2" />
                  Browse Marketplace
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
);

OverviewTab.displayName = 'OverviewTab';

export default OverviewTab;
