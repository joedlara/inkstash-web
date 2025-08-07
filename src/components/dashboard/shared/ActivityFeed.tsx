import React from 'react';
import {
  ShoppingBag,
  DollarSign,
  Heart,
  Target,
  Activity,
  TrendingUp,
  Clock,
  Eye,
} from 'lucide-react';
import '../../../styles/ActivityFeed.css';

interface RecentActivity {
  id: string;
  type: 'purchase' | 'sale' | 'watchlist' | 'bid' | 'view' | 'milestone';
  item: string;
  amount?: number;
  date: string;
  description?: string;
  isNew?: boolean;
}

interface ActivityFeedProps {
  activities: RecentActivity[];
  isLoading?: boolean;
  showViewAll?: boolean;
  onViewAll?: () => void;
}

const ActivityFeed: React.FC<ActivityFeedProps> = ({
  activities,
  isLoading = false,
  showViewAll = true,
  onViewAll,
}) => {
  const getActivityIcon = (type: RecentActivity['type']) => {
    const iconProps = { className: 'activity-icon' };

    switch (type) {
      case 'purchase':
        return <ShoppingBag {...iconProps} data-type="purchase" />;
      case 'sale':
        return <DollarSign {...iconProps} data-type="sale" />;
      case 'watchlist':
        return <Heart {...iconProps} data-type="watchlist" />;
      case 'bid':
        return <Target {...iconProps} data-type="bid" />;
      case 'view':
        return <Eye {...iconProps} data-type="view" />;
      case 'milestone':
        return <TrendingUp {...iconProps} data-type="milestone" />;
      default:
        return <Activity {...iconProps} data-type="default" />;
    }
  };

  const getActivityTypeLabel = (type: RecentActivity['type']): string => {
    switch (type) {
      case 'purchase':
        return 'Purchased';
      case 'sale':
        return 'Sold';
      case 'watchlist':
        return 'Added to Watchlist';
      case 'bid':
        return 'Placed Bid';
      case 'view':
        return 'Viewed';
      case 'milestone':
        return 'Milestone';
      default:
        return 'Activity';
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours =
      Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60);
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInHours < 168) {
      // 7 days
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const ActivitySkeleton = () => (
    <div className="activity-item skeleton">
      <div className="activity-icon-container">
        <div className="skeleton-icon"></div>
      </div>
      <div className="activity-content">
        <div className="skeleton-line skeleton-title"></div>
        <div className="skeleton-line skeleton-subtitle"></div>
      </div>
      <div className="activity-meta">
        <div className="skeleton-line skeleton-amount"></div>
        <div className="skeleton-line skeleton-date"></div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="activity-feed">
        <div className="activity-feed-header">
          <h2 className="activity-feed-title">Recent Activity</h2>
        </div>
        <div className="activity-list">
          {Array.from({ length: 5 }).map((_, index) => (
            <ActivitySkeleton key={index} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="activity-feed">
      <div className="activity-feed-header">
        <h2 className="activity-feed-title">
          <Activity className="title-icon" />
          Recent Activity
        </h2>
        {showViewAll && activities.length > 0 && (
          <button className="view-all-button" onClick={onViewAll}>
            View All
          </button>
        )}
      </div>

      {activities.length === 0 ? (
        <div className="empty-activity">
          <Activity className="empty-icon" />
          <h3>No Recent Activity</h3>
          <p>Your recent collection activities will appear here</p>
        </div>
      ) : (
        <div className="activity-list">
          {activities.map(activity => (
            <div
              key={activity.id}
              className={`activity-item ${activity.isNew ? 'new' : ''}`}
            >
              {activity.isNew && <div className="new-badge"></div>}

              <div className="activity-icon-container">
                {getActivityIcon(activity.type)}
              </div>

              <div className="activity-content">
                <h4 className="activity-title">{activity.item}</h4>
                <p className="activity-description">
                  {activity.description || getActivityTypeLabel(activity.type)}
                </p>
              </div>

              <div className="activity-meta">
                {activity.amount && (
                  <span className="activity-amount">
                    ${activity.amount.toLocaleString()}
                  </span>
                )}
                <span className="activity-date">
                  <Clock className="date-icon" />
                  {formatDate(activity.date)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {activities.length > 5 && (
        <div className="activity-footer">
          <button className="load-more-button" onClick={onViewAll}>
            Load More Activities
          </button>
        </div>
      )}
    </div>
  );
};

export default ActivityFeed;
