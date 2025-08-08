// src/components/dashboard/tabs/InsightsTab.tsx

import React, { memo } from 'react';
import {
  TrendingUp,
  RefreshCw,
  Zap,
  Award,
  Target,
  AlertCircle,
  BarChart3,
  DollarSign,
  PieChart,
  Activity,
} from 'lucide-react';
import type { InsightsTabProps } from '../../../types/dashboard';
import InsightsPanel from '../shared/InsightsPanel';
import '../../../styles/dashboard/tabs/insightsTab.css';

const InsightsTab: React.FC<InsightsTabProps> = memo(
  ({
    insights,
    isLoading,
    onGenerateInsights,
    canMakeAIRequest,
    lastAnalysisTime,
    collectionCount,
    aiLoading,
    insightsRequested,
  }) => {
    const formatLastAnalysis = (timestamp: number) => {
      const date = new Date(timestamp);
      const now = new Date();
      const diffInMinutes = Math.floor(
        (now.getTime() - date.getTime()) / 60000
      );

      if (diffInMinutes < 1) return 'Just now';
      if (diffInMinutes < 60)
        return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;

      const diffInHours = Math.floor(diffInMinutes / 60);
      if (diffInHours < 24)
        return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;

      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
    };

    // Empty state when no insights
    const EmptyInsights = memo(() => (
      <div className="insights-empty">
        <div className="empty-state">
          <TrendingUp className="empty-icon" />
          <h3 className="empty-title">No insights generated yet</h3>
          <p className="empty-description">
            Analyze your collection to get AI-powered insights and
            recommendations
          </p>
          <button
            onClick={onGenerateInsights}
            disabled={
              aiLoading ||
              insightsRequested ||
              !canMakeAIRequest ||
              collectionCount === 0
            }
            className="generate-insights-button"
          >
            {aiLoading || insightsRequested ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                Analyzing Collection...
              </>
            ) : (
              <>
                <Zap className="w-5 h-5 mr-2" />
                Analyze My Collection
              </>
            )}
          </button>

          {collectionCount === 0 && (
            <p className="empty-notice">Add items to your collection first</p>
          )}

          {!canMakeAIRequest && (
            <p className="rate-limit-notice">
              Rate limit reached. Try again later.
            </p>
          )}
        </div>
      </div>
    ));

    // Loading state
    const LoadingInsights = memo(() => (
      <div className="insights-loading">
        <div className="loading-content">
          <div className="loading-spinner">
            <div className="spinner"></div>
          </div>
          <h3>Analyzing your collection...</h3>
          <p>This may take a moment while we crunch the numbers</p>
          <div className="loading-steps">
            <div className="loading-step active">
              <BarChart3 className="step-icon" />
              <span>Calculating values</span>
            </div>
            <div className="loading-step">
              <PieChart className="step-icon" />
              <span>Analyzing diversity</span>
            </div>
            <div className="loading-step">
              <Activity className="step-icon" />
              <span>Identifying trends</span>
            </div>
          </div>
        </div>
      </div>
    ));

    return (
      <div className="insights-tab">
        {/* Header */}
        <div className="insights-header">
          <div className="header-content">
            <h2 className="insights-title">
              <TrendingUp className="title-icon" />
              AI Collection Insights
            </h2>
            <p className="insights-subtitle">
              Deep analysis of your collection's value, diversity, and
              investment potential
            </p>
          </div>

          {/* Analysis Info & Actions */}
          <div className="header-actions">
            {lastAnalysisTime && (
              <div className="analysis-info">
                <span className="analysis-time">
                  Last analysis: {formatLastAnalysis(lastAnalysisTime)}
                </span>
              </div>
            )}

            {insights && (
              <button
                onClick={onGenerateInsights}
                disabled={aiLoading || insightsRequested || !canMakeAIRequest}
                className="refresh-analysis-button"
                title="Generate fresh insights"
              >
                <RefreshCw
                  className={`w-4 h-4 ${aiLoading || insightsRequested ? 'animate-spin' : ''}`}
                />
                Refresh Analysis
              </button>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="insights-content">
          {aiLoading || insightsRequested ? (
            <LoadingInsights />
          ) : insights ? (
            <>
              {/* Main Insights Panel */}

              <InsightsPanel
                insights={insights}
                isLoading={aiLoading || insightsRequested}
                onGenerateInsights={onGenerateInsights}
                canGenerateInsights={canMakeAIRequest}
              />

              {/* Collection Analytics Overview */}

              <div className="analytics-overview">
                <h3 className="section-title">
                  <BarChart3 className="section-icon" />
                  Collection Analytics
                </h3>
                <div className="analytics-grid">
                  <div className="analytics-card">
                    <div className="card-header">
                      <DollarSign className="card-icon" />
                      <h4>Total Value</h4>
                    </div>
                    <div className="card-content">
                      <div className="primary-metric">
                        ${insights.totalValue.toLocaleString()}
                      </div>
                      <div className="metric-description">
                        Current estimated collection value
                      </div>
                    </div>
                  </div>

                  <div className="analytics-card">
                    <div className="card-header">
                      <PieChart className="card-icon" />
                      <h4>Diversification</h4>
                    </div>
                    <div className="card-content">
                      <div className="primary-metric">
                        {insights.diversificationScore}/10
                      </div>
                      <div className="diversification-bar">
                        <div
                          className="diversification-fill"
                          style={{
                            width: `${insights.diversificationScore * 10}%`,
                          }}
                        />
                      </div>
                      <div className="metric-description">
                        Portfolio spread across categories
                      </div>
                    </div>
                  </div>

                  <div className="analytics-card">
                    <div className="card-header">
                      <Activity className="card-icon" />
                      <h4>Risk Profile</h4>
                    </div>
                    <div className="card-content">
                      <div
                        className={`primary-metric risk-${insights.riskProfile.toLowerCase()}`}
                      >
                        {insights.riskProfile}
                      </div>
                      <div className="metric-description">
                        Investment risk assessment
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Investment Recommendations */}

              <div className="insights-section">
                <h3 className="section-title">
                  <Award className="section-icon" />
                  Investment Recommendations
                </h3>
                <div className="recommendations-list">
                  {insights.investmentRecommendations.map(
                    (recommendation, index) => (
                      <div key={index} className="recommendation-item">
                        <div className="recommendation-icon">
                          <TrendingUp className="w-5 h-5" />
                        </div>
                        <div className="recommendation-content">
                          <p className="recommendation-text">
                            {recommendation}
                          </p>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Collection Gaps */}

              <div className="insights-section">
                <h3 className="section-title">
                  <Target className="section-icon" />
                  Gaps in Your Collection
                </h3>
                <div className="gaps-list">
                  {insights.missingKeyIssues.map((item, index) => (
                    <div key={index} className="gap-item">
                      <div className="gap-icon">
                        <AlertCircle className="w-5 h-5" />
                      </div>
                      <div className="gap-content">
                        <p className="gap-text">{item}</p>
                        <button className="gap-action">
                          Find on Marketplace
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Valuable Items */}
              {insights.topItems.length > 0 && (
                <div className="insights-section">
                  <h3 className="section-title">
                    <Award className="section-icon" />
                    Most Valuable Items
                  </h3>
                  <div className="top-items-list">
                    {insights.topItems.slice(0, 5).map((item, index) => (
                      <div key={index} className="top-item">
                        <div className="item-rank">#{index + 1}</div>
                        <div className="item-name">{item}</div>
                        <div className="item-badge">
                          <Award className="w-4 h-4" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Center */}
              <div className="insights-actions">
                <div className="action-group">
                  <h4>Take Action</h4>
                  <div className="action-buttons">
                    <button className="action-button primary">
                      Export Analysis Report
                    </button>
                    <button className="action-button secondary">
                      Schedule Regular Analysis
                    </button>
                    <button className="action-button secondary">
                      Share with Friends
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <EmptyInsights />
          )}
        </div>
      </div>
    );
  }
);

InsightsTab.displayName = 'InsightsTab';

export default InsightsTab;
