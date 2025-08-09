// src/components/dashboard/tabs/RecommendationsTab.tsx

import React, { memo } from 'react';
import { Star, RefreshCw, Zap } from 'lucide-react';
import type { RecommendationsTabProps } from '../../../types/dashboard';
import '../../../styles/dashboard/tabs/recommendationsTab.css';
import RecommendationsGrid from '../RecommendationsGrid';

const RecommendationsTab: React.FC<RecommendationsTabProps> = memo(
  ({
    recommendations,
    isLoading,
    onLoadRecommendations,
    canMakeAIRequest,
    user,
  }) => {
    const handleViewRecommendation = (recommendation: any) => {
      console.log('View recommendation:', recommendation);
      // In a real app, this would navigate to the item details or marketplace
    };

    const handleAddToWatchlist = (recommendation: any) => {
      console.log('Add to watchlist:', recommendation);
      // In a real app, this would add the item to the user's watchlist
    };

    const handleBuyNow = (recommendation: any) => {
      console.log('Buy now:', recommendation);
      // In a real app, this would navigate to purchase flow
    };

    // Empty state when no recommendations
    const EmptyRecommendations = memo(() => (
      <div className="recommendations-empty">
        <div className="empty-state">
          <Star className="empty-icon" />
          <h3 className="empty-title">No recommendations yet</h3>
          <p className="empty-description">
            Generate personalized recommendations based on your collection and
            preferences
          </p>
          <button
            onClick={onLoadRecommendations}
            disabled={isLoading || !canMakeAIRequest}
            className="generate-recommendations-button"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                Generating...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Get Recommendations
              </>
            )}
          </button>
          {!canMakeAIRequest && (
            <p className="rate-limit-notice">
              AI features are currently rate limited. Please try again later.
            </p>
          )}
        </div>
      </div>
    ));

    // Loading state
    const LoadingRecommendations = memo(() => (
      <div className="recommendations-loading">
        <div className="loading-content">
          <div className="loading-spinner">
            <div className="spinner"></div>
          </div>
          <h3>Analyzing your collection...</h3>
          <p>Finding the perfect items for you</p>
        </div>
      </div>
    ));

    return (
      <div className="recommendations-tab">
        {/* Header */}
        <div className="recommendations-header">
          <div className="header-content">
            <h2 className="recommendations-title">
              <Star className="title-icon" />
              Personalized for You
            </h2>
            <p className="recommendations-subtitle">
              Based on your collection, preferences, and market trends
            </p>
          </div>

          {/* Refresh Button */}
          {recommendations.length > 0 && (
            <button
              onClick={onLoadRecommendations}
              disabled={isLoading || !canMakeAIRequest}
              className="refresh-button"
              title="Generate new recommendations"
            >
              <RefreshCw
                className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
              />
              Refresh
            </button>
          )}
        </div>

        {/* User Preferences Summary */}
        {user?.preferences && (
          <div className="preferences-summary">
            <h4 className="preferences-title">Your Preferences</h4>
            <div className="preferences-content">
              {user.preferences.favoriteCharacters?.length > 0 && (
                <div className="preference-group">
                  <span className="preference-label">Favorite Characters:</span>
                  <div className="preference-tags">
                    {user.preferences.favoriteCharacters
                      .slice(0, 3)
                      .map(character => (
                        <span key={character} className="preference-tag">
                          {character}
                        </span>
                      ))}
                    {user.preferences.favoriteCharacters.length > 3 && (
                      <span className="preference-tag more">
                        +{user.preferences.favoriteCharacters.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              {user.preferences.collectionFocus?.length > 0 && (
                <div className="preference-group">
                  <span className="preference-label">Collection Focus:</span>
                  <div className="preference-tags">
                    {user.preferences.collectionFocus.map(focus => (
                      <span key={focus} className="preference-tag">
                        {focus}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {user.preferences.priceRange && (
                <div className="preference-group">
                  <span className="preference-label">Price Range:</span>
                  <span className="preference-value">
                    ${user.preferences.priceRange.min} - $
                    {user.preferences.priceRange.max}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="recommendations-content">
          {isLoading ? (
            <LoadingRecommendations />
          ) : recommendations.length > 0 ? (
            <RecommendationsGrid
              recommendations={recommendations}
              isLoading={isLoading}
              onViewRecommendation={handleViewRecommendation}
              onAddToWatchlist={handleAddToWatchlist}
              onBuyNow={handleBuyNow}
            />
          ) : (
            <EmptyRecommendations />
          )}
        </div>

        {/* Explanation Footer */}
        {recommendations.length > 0 && (
          <div className="recommendations-footer">
            <div className="explanation">
              <h4 className="explanation-title">
                How we choose recommendations
              </h4>
              <p className="explanation-text">
                Our AI analyzes your collection patterns, favorite characters,
                price preferences, and current market trends to suggest items
                that would be perfect additions to your collection.
              </p>
            </div>

            <div className="recommendation-actions">
              <button className="secondary-action">Adjust Preferences</button>
              <button className="primary-action">Browse Marketplace</button>
            </div>
          </div>
        )}
      </div>
    );
  }
);

RecommendationsTab.displayName = 'RecommendationsTab';

export default RecommendationsTab;
