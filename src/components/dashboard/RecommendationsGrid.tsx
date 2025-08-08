// src/components/dashboard/RecommendationsGrid.tsx

import React, { memo, useState } from 'react';
import {
  Star,
  Heart,
  ShoppingCart,
  ExternalLink,
  TrendingUp,
  Clock,
  DollarSign,
  Eye,
} from 'lucide-react';
import { PersonalizedRecommendation } from '../../api/ai/aiService';
import '../../styles/dashboard//RecommendationsGrid.css';

interface RecommendationsGridProps {
  recommendations: PersonalizedRecommendation[];
  isLoading: boolean;
  onViewRecommendation?: (recommendation: PersonalizedRecommendation) => void;
  onAddToWatchlist?: (recommendation: PersonalizedRecommendation) => void;
  onBuyNow?: (recommendation: PersonalizedRecommendation) => void;
  className?: string;
}

const RecommendationsGrid: React.FC<RecommendationsGridProps> = memo(
  ({
    recommendations,
    isLoading,
    onViewRecommendation,
    onAddToWatchlist,
    onBuyNow,
    className = '',
  }) => {
    const [watchlistedItems, setWatchlistedItems] = useState<Set<string>>(
      new Set()
    );

    const handleToggleWatchlist = (
      recommendation: PersonalizedRecommendation
    ) => {
      const newWatchlisted = new Set(watchlistedItems);
      if (watchlistedItems.has(recommendation.itemId)) {
        newWatchlisted.delete(recommendation.itemId);
      } else {
        newWatchlisted.add(recommendation.itemId);
      }
      setWatchlistedItems(newWatchlisted);
      onAddToWatchlist?.(recommendation);
    };

    const getConfidenceColor = (confidence: number) => {
      if (confidence >= 8) return 'confidence-high';
      if (confidence >= 6) return 'confidence-medium';
      return 'confidence-low';
    };

    const getConfidenceText = (confidence: number) => {
      if (confidence >= 8) return 'Excellent match';
      if (confidence >= 6) return 'Good match';
      return 'Fair match';
    };

    const formatPriceRange = (priceRange: { min: number; max: number }) => {
      if (priceRange.min === priceRange.max) {
        return `$${priceRange.min}`;
      }
      return `$${priceRange.min} - $${priceRange.max}`;
    };

    return (
      <div className={`recommendations-grid ${className}`}>
        {recommendations.map(recommendation => (
          <article key={recommendation.itemId} className="recommendation-card">
            {/* Image Section */}
            <div className="recommendation-image-container">
              <img
                src={recommendation.imageUrl || '/placeholder-comic.jpg'}
                alt={recommendation.title}
                className="recommendation-image"
                loading="lazy"
              />

              {/* Confidence Badge */}
              <div
                className={`confidence-badge ${getConfidenceColor(recommendation.confidence)}`}
              >
                <Star className="confidence-icon" />
                <span className="confidence-value">
                  {recommendation.confidence}/10
                </span>
              </div>

              {/* Quick Actions Overlay */}
              <div className="recommendation-overlay">
                <button
                  onClick={() => handleToggleWatchlist(recommendation)}
                  className={`overlay-action watchlist ${watchlistedItems.has(recommendation.itemId) ? 'active' : ''}`}
                  title={
                    watchlistedItems.has(recommendation.itemId)
                      ? 'Remove from watchlist'
                      : 'Add to watchlist'
                  }
                >
                  <Heart className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onViewRecommendation?.(recommendation)}
                  className="overlay-action view"
                  title="View details"
                >
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content Section */}
            <div className="recommendation-content">
              <div className="recommendation-header">
                <h3
                  className="recommendation-title"
                  title={recommendation.title}
                >
                  {recommendation.title}
                </h3>

                {/* Match Quality */}
                <div
                  className={`match-indicator ${getConfidenceColor(recommendation.confidence)}`}
                >
                  <span className="match-text">
                    {getConfidenceText(recommendation.confidence)}
                  </span>
                  <div className="match-stars">
                    {[...Array(5)].map((_, index) => (
                      <Star
                        key={index}
                        className={`match-star ${index < Math.round(recommendation.confidence / 2) ? 'filled' : ''}`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Reason */}
              <p className="recommendation-reason">{recommendation.reason}</p>

              {/* Price and Trending Info */}
              <div className="recommendation-details">
                <div className="price-section">
                  <DollarSign className="price-icon" />
                  <span className="price-range">
                    {formatPriceRange(recommendation.priceRange)}
                  </span>
                  {recommendation.trending && (
                    <div className="trending-indicator">
                      <TrendingUp className="trending-icon" />
                      <span className="trending-text">Trending</span>
                    </div>
                  )}
                </div>

                {recommendation.marketData && (
                  <div className="market-info">
                    {recommendation.marketData.recentSales && (
                      <span className="market-stat">
                        <Clock className="w-3 h-3" />
                        {recommendation.marketData.recentSales} recent sales
                      </span>
                    )}
                    {recommendation.marketData.avgPrice && (
                      <span className="market-stat">
                        Avg: ${recommendation.marketData.avgPrice}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Tags */}
              {recommendation.tags && recommendation.tags.length > 0 && (
                <div className="recommendation-tags">
                  {recommendation.tags.slice(0, 3).map(tag => (
                    <span key={tag} className="recommendation-tag">
                      {tag}
                    </span>
                  ))}
                  {recommendation.tags.length > 3 && (
                    <span className="recommendation-tag more">
                      +{recommendation.tags.length - 3}
                    </span>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="recommendation-actions">
                <button
                  onClick={() => onViewRecommendation?.(recommendation)}
                  className="action-button secondary"
                >
                  <ExternalLink className="w-4 h-4" />
                  View Details
                </button>

                <button
                  onClick={() => onBuyNow?.(recommendation)}
                  className="action-button primary"
                >
                  <ShoppingCart className="w-4 h-4" />
                  Find to Buy
                </button>
              </div>
            </div>

            {/* Priority Indicator */}
            {recommendation.priority === 'high' && (
              <div className="priority-indicator">
                <span className="priority-text">Top Pick</span>
              </div>
            )}
          </article>
        ))}
      </div>
    );
  }
);

RecommendationsGrid.displayName = 'RecommendationsGrid';

export default RecommendationsGrid;
