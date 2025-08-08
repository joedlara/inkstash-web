// src/components/dashboard/CollectionGrid.tsx

import React, { memo, useState, useMemo } from 'react';
import type {
  CollectionItem as CollectionItemType,
  ViewMode,
} from '../../types/dashboard';
import CollectionItem from './CollectionItem';
import '../../styles/dashboard/collectionsGrid.css';

interface CollectionGridProps {
  items: CollectionItemType[];
  viewMode: ViewMode;
  isLoading: boolean;
  onViewItem?: (item: CollectionItemType) => void;
  onEditItem?: (item: CollectionItemType) => void;
  onDeleteItem?: (item: CollectionItemType) => void;
  onToggleFavorite?: (item: CollectionItemType) => void;
  className?: string;
  showActions?: boolean;
  selectable?: boolean;
  onSelectionChange?: (selectedItems: CollectionItemType[]) => void;
}

const CollectionGrid: React.FC<CollectionGridProps> = memo(
  ({
    items,
    viewMode,
    isLoading,
    onViewItem,
    onEditItem,
    onDeleteItem,
    onToggleFavorite,
    className = '',
    showActions = true,
    selectable = false,
    onSelectionChange,
  }) => {
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [favoriteItems, setFavoriteItems] = useState<Set<string>>(new Set());

    // Handle item selection
    const handleItemSelection = (
      item: CollectionItemType,
      selected: boolean
    ) => {
      if (!selectable) return;

      const newSelectedItems = new Set(selectedItems);
      if (selected) {
        newSelectedItems.add(item.id);
      } else {
        newSelectedItems.delete(item.id);
      }

      setSelectedItems(newSelectedItems);

      if (onSelectionChange) {
        const selectedItemObjects = items.filter(item =>
          newSelectedItems.has(item.id)
        );
        onSelectionChange(selectedItemObjects);
      }
    };

    // Handle favorite toggle
    const handleToggleFavorite = (item: CollectionItemType) => {
      const newFavorites = new Set(favoriteItems);
      if (favoriteItems.has(item.id)) {
        newFavorites.delete(item.id);
      } else {
        newFavorites.add(item.id);
      }
      setFavoriteItems(newFavorites);
      onToggleFavorite?.(item);
    };

    // Memoize grid classes
    const gridClasses = useMemo(() => {
      const classes = ['collection-grid'];
      classes.push(`${viewMode}-view`);
      if (selectable) classes.push('selectable');
      if (isLoading) classes.push('loading');
      if (className) classes.push(className);
      return classes.join(' ');
    }, [viewMode, selectable, isLoading, className]);

    // Loading skeleton
    const LoadingSkeleton = memo(() => (
      <div className="loading-skeleton">
        {Array.from({ length: viewMode === 'grid' ? 12 : 6 }).map(
          (_, index) => (
            <div key={index} className={`skeleton-item ${viewMode}-skeleton`}>
              <div className="skeleton-image" />
              <div className="skeleton-content">
                <div className="skeleton-line skeleton-title" />
                <div className="skeleton-line skeleton-category" />
                <div className="skeleton-line skeleton-price" />
              </div>
            </div>
          )
        )}
      </div>
    ));

    if (isLoading && items.length === 0) {
      return (
        <div className={gridClasses}>
          <LoadingSkeleton />
        </div>
      );
    }

    return (
      <div className={gridClasses}>
        {/* Selection Controls */}
        {selectable && selectedItems.size > 0 && (
          <div className="selection-controls">
            <div className="selection-info">
              <span className="selection-count">
                {selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''}{' '}
                selected
              </span>
              <button
                onClick={() => {
                  setSelectedItems(new Set());
                  onSelectionChange?.([]);
                }}
                className="clear-selection"
              >
                Clear selection
              </button>
            </div>

            <div className="bulk-actions">
              <button className="bulk-action-button">Export Selected</button>
              <button className="bulk-action-button">Add to Watchlist</button>
              <button className="bulk-action-button danger">
                Delete Selected
              </button>
            </div>
          </div>
        )}

        {/* Grid Content */}
        <div className="grid-content">
          {items.map((item, index) => (
            <CollectionItem
              key={item.id}
              item={item}
              viewMode={viewMode}
              onView={onViewItem}
              onEdit={onEditItem}
              onDelete={onDeleteItem}
              onToggleFavorite={handleToggleFavorite}
              showActions={showActions}
              isFavorite={favoriteItems.has(item.id)}
              className={`
              ${selectedItems.has(item.id) ? 'selected' : ''}
              ${index < 3 ? 'priority-load' : ''}
            `.trim()}
            />
          ))}
        </div>

        {/* Load More / Pagination could go here */}
        {items.length > 50 && (
          <div className="grid-pagination">
            <button className="load-more-button">Load More Items</button>
          </div>
        )}

        {/* Loading overlay for additional items */}
        {isLoading && items.length > 0 && (
          <div className="loading-overlay">
            <div className="loading-spinner">
              <div className="spinner"></div>
            </div>
            <span className="loading-text">Loading more items...</span>
          </div>
        )}
      </div>
    );
  }
);

CollectionGrid.displayName = 'CollectionGrid';

export default CollectionGrid;
