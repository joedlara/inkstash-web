import React from 'react';
import {
  TrendingUp,
  Award,
  Target,
  BarChart3,
  PieChart,
  DollarSign,
  Shield,
  Star,
  ArrowRight,
  Plus,
  Search,
  Brain,
} from 'lucide-react';
import '../../../styles/dashboard/shared/insightsPanel.css';

interface CollectionInsights {
  diversificationScore: number;
  riskProfile: 'conservative' | 'moderate' | 'aggressive';
  topItems: string[];
  investmentRecommendations: string[];
  missingKeyIssues: string[];
  marketTrends?: string[];
  portfolioStrength?: number;
  growthPotential?: number;
}

interface InsightsPanelProps {
  insights: CollectionInsights | null;
  isLoading?: boolean;
  onGenerateInsights?: () => void;
  onViewDetails?: () => void;
}

const InsightsPanel: React.FC<InsightsPanelProps> = ({
  insights,
  isLoading = false,
  onGenerateInsights,
  onViewDetails,
}) => {
  const getRiskColor = (riskProfile: string): string => {
    switch (riskProfile) {
      case 'conservative':
        return 'text-green-600';
      case 'moderate':
        return 'text-yellow-600';
      case 'aggressive':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getRiskIcon = (riskProfile: string) => {
    switch (riskProfile) {
      case 'conservative':
        return <Shield className="w-4 h-4" />;
      case 'moderate':
        return <BarChart3 className="w-4 h-4" />;
      case 'aggressive':
        return <TrendingUp className="w-4 h-4" />;
      default:
        return <PieChart className="w-4 h-4" />;
    }
  };

  const getScoreColor = (score: number): string => {
    if (score >= 8) return 'excellent';
    if (score >= 6) return 'good';
    if (score >= 4) return 'average';
    return 'poor';
  };

  if (isLoading) {
    return (
      <div className="insights-panel loading">
        <div className="insights-header">
          <div className="skeleton skeleton-title"></div>
          <div className="skeleton skeleton-button"></div>
        </div>
        <div className="insights-content">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="insight-section skeleton">
              <div className="skeleton skeleton-section-title"></div>
              <div className="skeleton-list">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="skeleton skeleton-item"></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!insights) {
    return (
      <div className="insights-panel empty">
        <div className="empty-state">
          <Brain className="empty-icon" />
          <h3>AI Insights Ready</h3>
          <p>
            Get personalized insights about your collection's performance and
            growth opportunities
          </p>
          <button
            className="generate-insights-button"
            onClick={onGenerateInsights}
          >
            <TrendingUp className="w-4 h-4" />
            Generate AI Insights
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="insights-panel">
      <div className="insights-header">
        <h2 className="insights-title">
          <Brain className="title-icon" />
          AI Insights
        </h2>
        {onViewDetails && (
          <button className="view-details-button" onClick={onViewDetails}>
            View Details
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="insights-content">
        {/* Collection Overview */}
        <div className="insight-section overview">
          <h3 className="section-title">
            <BarChart3 className="section-icon" />
            Collection Overview
          </h3>
          <div className="overview-grid">
            <div className="metric-card">
              <div className="metric-header">
                <span className="metric-label">Diversification</span>
                <PieChart className="metric-icon" />
              </div>
              <div
                className={`metric-value ${getScoreColor(insights.diversificationScore)}`}
              >
                {insights.diversificationScore}/10
              </div>
              <div className="metric-bar">
                <div
                  className={`metric-progress ${getScoreColor(insights.diversificationScore)}`}
                  style={{
                    width: `${(insights.diversificationScore / 10) * 100}%`,
                  }}
                ></div>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-header">
                <span className="metric-label">Risk Profile</span>
                {getRiskIcon(insights.riskProfile)}
              </div>
              <div
                className={`metric-value ${getRiskColor(insights.riskProfile).replace('text-', '')}`}
              >
                {insights.riskProfile}
              </div>
              <div className="risk-indicator">
                <div className={`risk-badge ${insights.riskProfile}`}>
                  {insights.riskProfile.charAt(0).toUpperCase() +
                    insights.riskProfile.slice(1)}
                </div>
              </div>
            </div>

            {insights.portfolioStrength && (
              <div className="metric-card">
                <div className="metric-header">
                  <span className="metric-label">Portfolio Strength</span>
                  <Star className="metric-icon" />
                </div>
                <div
                  className={`metric-value ${getScoreColor(insights.portfolioStrength)}`}
                >
                  {insights.portfolioStrength}/10
                </div>
                <div className="metric-bar">
                  <div
                    className={`metric-progress ${getScoreColor(insights.portfolioStrength)}`}
                    style={{
                      width: `${(insights.portfolioStrength / 10) * 100}%`,
                    }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Top Performers */}
        {insights.topItems && insights.topItems.length > 0 && (
          <div className="insight-section top-items">
            <h3 className="section-title">
              <Award className="section-icon" />
              Top Performers
            </h3>
            <div className="top-items-list">
              {insights.topItems.slice(0, 3).map((item, index) => (
                <div key={index} className="top-item">
                  <div className="item-rank">#{index + 1}</div>
                  <div className="item-name">{item}</div>
                  <div className="item-badge">
                    <TrendingUp className="w-3 h-3" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Investment Recommendations */}
        {insights.investmentRecommendations &&
          insights.investmentRecommendations.length > 0 && (
            <div className="insight-section recommendations">
              <h3 className="section-title">
                <DollarSign className="section-icon" />
                Investment Recommendations
              </h3>
              <div className="recommendations-list">
                {insights.investmentRecommendations
                  .slice(0, 3)
                  .map((rec, index) => (
                    <div key={index} className="recommendation-item">
                      <div className="recommendation-icon">
                        <Award className="w-4 h-4" />
                      </div>
                      <p className="recommendation-text">{rec}</p>
                    </div>
                  ))}
              </div>
            </div>
          )}

        {/* Missing Opportunities */}
        {insights.missingKeyIssues && insights.missingKeyIssues.length > 0 && (
          <div className="insight-section opportunities">
            <h3 className="section-title">
              <Target className="section-icon" />
              Growth Opportunities
            </h3>
            <div className="opportunities-list">
              {insights.missingKeyIssues.slice(0, 3).map((issue, index) => (
                <div key={index} className="opportunity-item">
                  <div className="opportunity-icon">
                    <Plus className="w-4 h-4" />
                  </div>
                  <p className="opportunity-text">{issue}</p>
                  <button className="explore-button">
                    <Search className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Market Trends */}
        {insights.marketTrends && insights.marketTrends.length > 0 && (
          <div className="insight-section trends">
            <h3 className="section-title">
              <TrendingUp className="section-icon" />
              Market Trends
            </h3>
            <div className="trends-list">
              {insights.marketTrends.slice(0, 2).map((trend, index) => (
                <div key={index} className="trend-item">
                  <div className="trend-indicator">
                    <div className="trend-pulse"></div>
                  </div>
                  <p className="trend-text">{trend}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="insights-footer">
        <button
          className="refresh-insights-button"
          onClick={onGenerateInsights}
        >
          <Brain className="w-4 h-4" />
          Refresh Insights
        </button>
      </div>
    </div>
  );
};

export default InsightsPanel;
