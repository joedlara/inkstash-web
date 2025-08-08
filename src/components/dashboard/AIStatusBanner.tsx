// src/components/dashboard/AIStatusBanner.tsx

import React, { memo } from 'react';
import { Clock, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import '../../styles/dashboard/aiStatusBanner.css';
import type { RateLimitInfo } from '../../types/dashboard';

interface AIStatusBannerProps {
  rateLimitInfo: RateLimitInfo;
  aiError: string | null;
  onClearCache: () => void;
  className?: string;
}

const AIStatusBanner: React.FC<AIStatusBannerProps> = memo(
  ({ rateLimitInfo, aiError, onClearCache, className = '' }) => {
    const formatTimeRemaining = (ms: number): string => {
      const seconds = Math.ceil(ms / 1000);
      if (seconds < 60) return `${seconds}s`;
      const minutes = Math.ceil(seconds / 60);
      return `${minutes}m`;
    };

    // Rate limited state
    if (!rateLimitInfo.canMakeRequest && rateLimitInfo.timeUntilReset > 0) {
      return (
        <div className={`ai-status-banner ai-status-warning ${className}`}>
          <div className="status-content">
            <div className="status-icon">
              <Clock className="w-5 h-5" />
            </div>
            <div className="status-text">
              <h4 className="status-title">AI Features Rate Limited</h4>
              <p className="status-message">
                Please wait {formatTimeRemaining(rateLimitInfo.timeUntilReset)}{' '}
                before using AI features again.
                {rateLimitInfo.requestsRemaining > 0 && (
                  <span className="requests-remaining">
                    {' '}
                    ({rateLimitInfo.requestsRemaining} requests remaining)
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="status-progress">
            <div
              className="progress-bar"
              style={{
                width: `${100 - (rateLimitInfo.timeUntilReset / 3600000) * 100}%`,
              }}
            />
          </div>
        </div>
      );
    }

    // Error state
    if (aiError) {
      return (
        <div className={`ai-status-banner ai-status-error ${className}`}>
          <div className="status-content">
            <div className="status-icon">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="status-text">
              <h4 className="status-title">AI Service Error</h4>
              <p className="status-message">{aiError}</p>
            </div>
            <div className="status-actions">
              <button
                onClick={onClearCache}
                className="clear-cache-btn"
                title="Clear AI cache and retry"
              >
                <RefreshCw className="w-4 h-4" />
                Clear Cache
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Success state - only show when AI is explicitly available and working well
    if (
      rateLimitInfo.canMakeRequest &&
      rateLimitInfo.requestsRemaining < rateLimitInfo.maxRequests
    ) {
      return (
        <div className={`ai-status-banner ai-status-success ${className}`}>
          <div className="status-content">
            <div className="status-icon">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div className="status-text">
              <h4 className="status-title">AI Features Available</h4>
              <p className="status-message">
                {rateLimitInfo.requestsRemaining} of {rateLimitInfo.maxRequests}{' '}
                AI requests remaining this hour.
              </p>
            </div>
          </div>
        </div>
      );
    }

    // No banner needed if everything is normal and unused
    return null;
  }
);

AIStatusBanner.displayName = 'AIStatusBanner';

export default AIStatusBanner;
