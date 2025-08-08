// src/components/dashboard/DashboardFooter.tsx

import React, { memo } from 'react';
import { RefreshCw, Database, Zap, Clock, AlertTriangle } from 'lucide-react';
import type { RateLimitInfo } from '../../types/dashboard';
import '../../styles/dashboard/dashboardFooter.css';

interface DashboardFooterProps {
  rateLimitInfo: RateLimitInfo;
  collectionCount: number;
  onClearCache: () => void;
  lastSyncTime?: Date;
  className?: string;
  showDetailedStatus?: boolean;
}

const DashboardFooter: React.FC<DashboardFooterProps> = memo(
  ({
    rateLimitInfo,
    collectionCount,
    onClearCache,
    lastSyncTime,
    className = '',
    showDetailedStatus = true,
  }) => {
    const formatTimeRemaining = (ms: number): string => {
      const seconds = Math.ceil(ms / 1000);
      if (seconds < 60) return `${seconds}s`;
      const minutes = Math.ceil(seconds / 60);
      if (minutes < 60) return `${minutes}m`;
      const hours = Math.ceil(minutes / 60);
      return `${hours}h`;
    };

    const formatLastSync = (date: Date): string => {
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const minutes = Math.floor(diff / 60000);

      if (minutes < 1) return 'Just now';
      if (minutes < 60) return `${minutes}m ago`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours}h ago`;
      const days = Math.floor(hours / 24);
      return `${days}d ago`;
    };

    const getAIStatusInfo = () => {
      if (!rateLimitInfo.canMakeRequest) {
        return {
          status: 'Rate Limited',
          color: 'status-warning',
          icon: <Clock className="w-3 h-3" />,
          detail:
            rateLimitInfo.timeUntilReset > 0
              ? `Reset in: ${formatTimeRemaining(rateLimitInfo.timeUntilReset)}`
              : 'Checking availability...',
        };
      }

      const usagePercentage =
        ((rateLimitInfo.maxRequests - rateLimitInfo.requestsRemaining) /
          rateLimitInfo.maxRequests) *
        100;

      if (usagePercentage > 80) {
        return {
          status: 'Limited',
          color: 'status-warning',
          icon: <AlertTriangle className="w-3 h-3" />,
          detail: `${rateLimitInfo.requestsRemaining} requests left`,
        };
      }

      return {
        status: 'Available',
        color: 'status-success',
        icon: <Zap className="w-3 h-3" />,
        detail: `${rateLimitInfo.requestsRemaining}/${rateLimitInfo.maxRequests} requests`,
      };
    };

    const aiStatus = getAIStatusInfo();

    return (
      <footer className={`dashboard-footer ${className}`}>
        <div className="footer-content">
          {/* Left Side - Collection Info */}
          <div className="footer-section">
            <div className="status-group">
              <div className="status-item">
                <Database className="w-4 h-4 text-gray-500" />
                <span className="status-text">
                  <span className="status-value">{collectionCount}</span>
                  <span className="status-label">items</span>
                </span>
              </div>

              {lastSyncTime && (
                <div className="status-item">
                  <RefreshCw className="w-4 h-4 text-gray-500" />
                  <span className="status-text">
                    <span className="status-label">Last sync:</span>
                    <span className="status-value">
                      {formatLastSync(lastSyncTime)}
                    </span>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Center - AI Status */}
          <div className="footer-section center">
            <div className="ai-status">
              <div className={`status-indicator ${aiStatus.color}`}>
                {aiStatus.icon}
                <span className="status-dot" />
              </div>
              <div className="ai-status-text">
                <span className="ai-status-label">AI Status:</span>
                <span className="ai-status-value">{aiStatus.status}</span>
                {showDetailedStatus && (
                  <span className="ai-status-detail">{aiStatus.detail}</span>
                )}
              </div>
            </div>
          </div>

          {/* Right Side - Actions */}
          <div className="footer-section">
            <div className="footer-actions">
              <button
                onClick={onClearCache}
                className="footer-action-button"
                title="Clear AI cache to reset rate limits and refresh data"
                aria-label="Clear AI cache"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Clear Cache</span>
              </button>

              {/* Additional status info on hover */}
              <div className="status-tooltip">
                <div className="tooltip-content">
                  <div className="tooltip-section">
                    <h4>AI Service Status</h4>
                    <p>
                      {rateLimitInfo.canMakeRequest
                        ? `${rateLimitInfo.requestsRemaining} of ${rateLimitInfo.maxRequests} requests remaining this hour`
                        : 'Rate limit exceeded. Please wait before making more AI requests.'}
                    </p>
                  </div>

                  {collectionCount > 0 && (
                    <div className="tooltip-section">
                      <h4>Collection</h4>
                      <p>{collectionCount} items in your collection</p>
                      {lastSyncTime && (
                        <p>
                          Last synchronized: {lastSyncTime.toLocaleString()}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="tooltip-section">
                    <h4>Cache</h4>
                    <p>
                      Clear cache to reset AI rate limits and refresh all data
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Progress bar for rate limit recovery */}
        {!rateLimitInfo.canMakeRequest && rateLimitInfo.timeUntilReset > 0 && (
          <div className="rate-limit-progress">
            <div
              className="progress-fill"
              style={{
                width: `${Math.max(0, 100 - (rateLimitInfo.timeUntilReset / 3600000) * 100)}%`,
              }}
            />
          </div>
        )}
      </footer>
    );
  }
);

DashboardFooter.displayName = 'DashboardFooter';

export default DashboardFooter;
