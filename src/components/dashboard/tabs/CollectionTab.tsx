import React, { memo, useMemo } from 'react';
import { Package } from 'lucide-react';
import type { CollectionTabProps } from '../../../types/dashboard';
import CollectionControls from '../CollectionControls';
import CollectionGrid from '../CollectionGrid';
import '../../../styles/dashboard/tabs/collectionsTab.css';

const CollectionTab: React.FC<CollectionTabProps> = memo(
  ({
    collection,
    searchTerm,
    filterCategory,
    viewMode,
    onSearchChange,
    onFilterChange,
    onViewModeChange,
    isLoading,
  }) => {
    // Filter collection based on search and category
    const filteredCollection = useMemo(() => {
      return collection.filter(item => {
        const matchesSearch =
          item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.description?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesCategory =
          filterCategory === 'all' || item.category === filterCategory;

        return matchesSearch && matchesCategory;
      });
    }, [collection, searchTerm, filterCategory]);

    // Calculate collection statistics
    const collectionStats = useMemo(() => {
      const totalValue = filteredCollection.reduce(
        (sum, item) => sum + (item.estimatedValue || 0),
        0
      );
      const averageValue =
        filteredCollection.length > 0
          ? Math.round(totalValue / filteredCollection.length)
          : 0;
      const categoryCount = new Set(
        filteredCollection.map(item => item.category)
      ).size;

      return {
        totalItems: filteredCollection.length,
        totalValue,
        averageValue,
        categoryCount,
      };
    }, [filteredCollection]);

    // Handle item actions
    const handleViewItem = (item: any) => {
      console.log('View item:', item);
      // In a real app, this would open a modal or navigate to detail page
    };

    const handleEditItem = (item: any) => {
      console.log('Edit item:', item);
      // In a real app, this would open an edit modal
    };

    const handleDeleteItem = (item: any) => {
      console.log('Delete item:', item);
      // In a real app, this would show a confirmation dialog
    };

    const handleToggleFavorite = (item: any) => {
      console.log('Toggle favorite:', item);
      // In a real app, this would update the item's favorite status
    };

    if (isLoading) {
      return (
        <div className="collection-tab">
          <div className="collection-loading">
            <div className="loading-spinner">
              <div className="spinner"></div>
            </div>
            <p>Loading your collection...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="collection-tab">
        {/* Collection Controls */}
        <CollectionControls
          searchTerm={searchTerm}
          filterCategory={filterCategory}
          viewMode={viewMode}
          totalItems={collection.length}
          filteredItems={filteredCollection.length}
          onSearchChange={onSearchChange}
          onFilterChange={onFilterChange}
          onViewModeChange={onViewModeChange}
        />

        {/* Collection Grid/List */}
        {filteredCollection.length > 0 ? (
          <CollectionGrid
            items={filteredCollection}
            viewMode={viewMode}
            isLoading={isLoading}
            onViewItem={handleViewItem}
            onEditItem={handleEditItem}
            onDeleteItem={handleDeleteItem}
            onToggleFavorite={handleToggleFavorite}
          />
        ) : (
          <div className="collection-empty">
            <div className="empty-state">
              <Package className="empty-icon" />
              <h3 className="empty-title">
                {searchTerm || filterCategory !== 'all'
                  ? 'No items found'
                  : 'No items in collection'}
              </h3>
              <p className="empty-description">
                {searchTerm || filterCategory !== 'all'
                  ? 'Try adjusting your search or filter criteria'
                  : 'Start building your collection by adding your first item'}
              </p>
              {!searchTerm && filterCategory === 'all' && (
                <button className="empty-action">Add Your First Item</button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }
);

CollectionTab.displayName = 'CollectionTab';

export default CollectionTab;
