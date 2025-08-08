import React, { memo } from 'react';
import { Plus, Search, TrendingUp } from 'lucide-react';
import '../../styles/dashboard/quickActionsPanel.css';

interface QuickActionsPanelProps {
  onAddItem: () => void;
  onBrowseMarket: () => void;
  onGenerateInsights: () => void;
  aiLoading: boolean;
  canMakeAIRequest: boolean;
}

const QuickActionsPanel: React.FC<QuickActionsPanelProps> = memo(
  ({
    onAddItem,
    onBrowseMarket,
    onGenerateInsights,
    aiLoading,
    canMakeAIRequest,
  }) => {
    return (
      <div className="quick-actions-panel">
        <h3 className="quick-actions-title">Quick Actions</h3>
        <div className="quick-actions-grid">
          <button
            className="action-button action-button-primary"
            onClick={onAddItem}
          >
            <Plus className="w-4 h-4" />
            <span>Add Item</span>
          </button>

          <button
            className="action-button action-button-secondary"
            onClick={onBrowseMarket}
          >
            <Search className="w-4 h-4" />
            <span>Browse Market</span>
          </button>

          <button
            className="action-button action-button-secondary"
            onClick={onGenerateInsights}
            disabled={aiLoading || !canMakeAIRequest}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Get AI Insights</span>
          </button>
        </div>
      </div>
    );
  }
);

QuickActionsPanel.displayName = 'QuickActionsPanel';

export default QuickActionsPanel;
