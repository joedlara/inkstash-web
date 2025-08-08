import React from 'react';
import '../../../styles/dashboard/shared/StatsCard.css';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  color?: 'blue' | 'green' | 'purple' | 'yellow' | 'red' | 'indigo';
  isLoading?: boolean;
}

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon,
  trend,
  color = 'blue',
  isLoading = false,
}) => {
  const formatValue = (val: string | number): string => {
    if (typeof val === 'number') {
      if (val >= 1000000) {
        return `${(val / 1000000).toFixed(1)}M`;
      } else if (val >= 1000) {
        return `${(val / 1000).toFixed(1)}K`;
      }
      return val.toLocaleString();
    }
    return val;
  };

  const getTrendColor = (trendValue?: string): string => {
    if (!trendValue) return '';
    if (trendValue.startsWith('+')) return 'trend-positive';
    if (trendValue.startsWith('-')) return 'trend-negative';
    return 'trend-neutral';
  };

  if (isLoading) {
    return (
      <div className="stats-card loading">
        <div className="stats-card-content">
          <div className="stats-text">
            <div className="skeleton skeleton-title"></div>
            <div className="skeleton skeleton-value"></div>
            <div className="skeleton skeleton-trend"></div>
          </div>
          <div className="stats-icon-container">
            <div className="skeleton skeleton-icon"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`stats-card ${color}`}>
      <div className="stats-card-content">
        <div className="stats-text">
          <p className="stats-title">{title}</p>
          <p className="stats-value">{formatValue(value)}</p>
          {trend && (
            <p className={`stats-trend ${getTrendColor(trend)}`}>{trend}</p>
          )}
        </div>
        <div className={`stats-icon-container ${color}`}>
          <div className="stats-icon">{icon}</div>
        </div>
      </div>
      <div className="stats-card-glow"></div>
    </div>
  );
};

export default StatsCard;
