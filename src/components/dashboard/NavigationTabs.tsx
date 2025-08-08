// src/components/dashboard/NavigationTabs.tsx

import React, { memo } from 'react';
import { BarChart3, Package, Star, TrendingUp } from 'lucide-react';
import type { DashboardTab, TabChangeHandler } from '../../types/dashboard';
import '../../styles/dashboard/NavigationTabs.css';

interface TabConfig {
  key: DashboardTab;
  label: string;
  icon: React.ReactNode;
  badge?: string | number;
  disabled?: boolean;
}

interface NavigationTabsProps {
  activeTab: DashboardTab;
  onTabChange: TabChangeHandler;
  className?: string;
  badges?: Partial<Record<DashboardTab, string | number>>;
  disabledTabs?: DashboardTab[];
}

const NavigationTabs: React.FC<NavigationTabsProps> = memo(
  ({
    activeTab,
    onTabChange,
    className = '',
    badges = {},
    disabledTabs = [],
  }) => {
    const tabs: TabConfig[] = [
      {
        key: 'overview',
        label: 'Overview',
        icon: <BarChart3 className="tab-icon" />,
        badge: badges.overview,
      },
      {
        key: 'collection',
        label: 'My Collection',
        icon: <Package className="tab-icon" />,
        badge: badges.collection,
      },
      {
        key: 'recommendations',
        label: 'For You',
        icon: <Star className="tab-icon" />,
        badge: badges.recommendations,
      },
      {
        key: 'insights',
        label: 'AI Insights',
        icon: <TrendingUp className="tab-icon" />,
        badge: badges.insights,
        disabled: disabledTabs.includes('insights'),
      },
    ];

    const handleTabClick = (tab: DashboardTab) => {
      if (!disabledTabs.includes(tab)) {
        onTabChange(tab);
      }
    };

    const handleKeyDown = (event: React.KeyboardEvent, tab: DashboardTab) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleTabClick(tab);
      }
    };

    return (
      <nav className={`navigation-tabs ${className}`} role="tablist">
        <div className="tabs-container">
          {tabs.map(tab => (
            <button
              key={tab.key}
              role="tab"
              aria-selected={activeTab === tab.key}
              aria-controls={`${tab.key}-panel`}
              tabIndex={activeTab === tab.key ? 0 : -1}
              disabled={tab.disabled}
              onClick={() => handleTabClick(tab.key)}
              onKeyDown={e => handleKeyDown(e, tab.key)}
              className={`
              tab-button 
              ${activeTab === tab.key ? 'tab-active' : ''} 
              ${tab.disabled ? 'tab-disabled' : ''}
            `.trim()}
              title={
                tab.disabled
                  ? `${tab.label} is currently unavailable`
                  : tab.label
              }
            >
              <span className="tab-content">
                {tab.icon}
                <span className="tab-label">{tab.label}</span>
                {tab.badge && (
                  <span className="tab-badge" aria-label={`${tab.badge} items`}>
                    {tab.badge}
                  </span>
                )}
              </span>

              {/* Active indicator */}
              {activeTab === tab.key && (
                <span className="tab-indicator" aria-hidden="true" />
              )}
            </button>
          ))}
        </div>

        {/* Mobile dropdown for smaller screens */}
        <div className="tabs-mobile">
          <select
            value={activeTab}
            onChange={e => onTabChange(e.target.value as DashboardTab)}
            className="tabs-select"
            aria-label="Navigate dashboard sections"
          >
            {tabs.map(tab => (
              <option key={tab.key} value={tab.key} disabled={tab.disabled}>
                {tab.label}
                {tab.badge ? ` (${tab.badge})` : ''}
              </option>
            ))}
          </select>
        </div>
      </nav>
    );
  }
);

NavigationTabs.displayName = 'NavigationTabs';

export default NavigationTabs;
