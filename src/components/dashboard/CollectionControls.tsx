// src/components/dashboard/CollectionControls.tsx

import React, { memo } from 'react';
import { Search, Grid, List, Filter, SortAsc, SortDesc } from 'lucide-react';
import type {
  ViewMode,
  FilterCategory,
  SearchChangeHandler,
  FilterChangeHandler,
  ViewModeChangeHandler,
} from '../../types/dashboard';
import '../../styles/dashboard/CollectionControls.css';

// Add this constant that was missing
const FILTER_CATEGORIES: FilterCategory[] = [
  'all',
  'comics',
  'manga',
  'trading-card',
  'figure',
  'other',
];

interface CollectionControlsProps {
  searchTerm: string;
  filterCategory: FilterCategory;
  viewMode: ViewMode;
  sortBy?: 'date' | 'value' | 'title' | 'condition';
  sortOrder?: 'asc' | 'desc';
  totalItems: number;
  filteredItems: number;
  onSearchChange: SearchChangeHandler;
  onFilterChange: FilterChangeHandler;
  onViewModeChange: ViewModeChangeHandler;
  onSortByChange?: (sortBy: 'date' | 'value' | 'title' | 'condition') => void;
  onSortOrderChange?: (sortOrder: 'asc' | 'desc') => void;
  className?: string;
}

const CollectionControls: React.FC<CollectionControlsProps> = memo(
  ({
    searchTerm,
    filterCategory,
    viewMode,
    sortBy = 'date',
    sortOrder = 'desc',
    totalItems,
    filteredItems,
    onSearchChange,
    onFilterChange,
    onViewModeChange,
    onSortByChange,
    onSortOrderChange,
    className = '',
  }) => {
    const categoryLabels: Record<FilterCategory, string> = {
      all: 'All Categories',
      comics: 'Comics',
      manga: 'Manga',
      'trading-card': 'Trading Cards',
      figure: 'Figures',
      other: 'Other',
    };

    const sortLabels = {
      date: 'Date Added',
      value: 'Value',
      title: 'Title',
      condition: 'Condition',
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onSearchChange(e.target.value);
    };

    const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      onFilterChange(e.target.value as FilterCategory);
    };

    const handleSortByChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      if (onSortByChange) {
        onSortByChange(
          e.target.value as 'date' | 'value' | 'title' | 'condition'
        );
      }
    };

    const toggleSortOrder = () => {
      if (onSortOrderChange) {
        onSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc');
      }
    };

    const clearFilters = () => {
      onSearchChange('');
      onFilterChange('all');
    };

    const hasActiveFilters = searchTerm || filterCategory !== 'all';

    return (
      <div className={`collection-controls ${className}`}>
        {/* Search and Filter Row */}
        <div className="controls-row">
          <div className="search-controls">
            {/* Search Input */}
            <div className="search-input-wrapper">
              <Search className="search-icon" />
              <input
                type="text"
                placeholder="Search your collection..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="search-input"
                aria-label="Search collection"
              />
              {searchTerm && (
                <button
                  onClick={() => onSearchChange('')}
                  className="search-clear"
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </div>

            {/* Category Filter */}
            <div className="filter-wrapper">
              <Filter className="filter-icon" />
              <select
                value={filterCategory}
                onChange={handleFilterChange}
                className="filter-select"
                aria-label="Filter by category"
              >
                {FILTER_CATEGORIES.map(category => (
                  <option key={category} value={category}>
                    {categoryLabels[category]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* View Mode Controls */}
          <div className="view-controls">
            <div
              className="view-mode-group"
              role="radiogroup"
              aria-label="View mode"
            >
              <button
                onClick={() => onViewModeChange('grid')}
                className={`view-button ${viewMode === 'grid' ? 'active' : ''}`}
                aria-pressed={viewMode === 'grid'}
                aria-label="Grid view"
                title="Grid view"
              >
                <Grid className="view-icon" />
              </button>
              <button
                onClick={() => onViewModeChange('list')}
                className={`view-button ${viewMode === 'list' ? 'active' : ''}`}
                aria-pressed={viewMode === 'list'}
                aria-label="List view"
                title="List view"
              >
                <List className="view-icon" />
              </button>
            </div>
          </div>
        </div>

        {/* Sort and Results Row */}
        <div className="controls-row secondary">
          <div className="sort-controls">
            {onSortByChange && (
              <div className="sort-wrapper">
                <label htmlFor="sort-select" className="sort-label">
                  Sort by:
                </label>
                <select
                  id="sort-select"
                  value={sortBy}
                  onChange={handleSortByChange}
                  className="sort-select"
                >
                  {Object.entries(sortLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>

                {onSortOrderChange && (
                  <button
                    onClick={toggleSortOrder}
                    className="sort-order-button"
                    aria-label={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
                    title={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
                  >
                    {sortOrder === 'asc' ? (
                      <SortAsc className="sort-icon" />
                    ) : (
                      <SortDesc className="sort-icon" />
                    )}
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="results-info">
            <span className="results-count">
              {filteredItems === totalItems
                ? `${totalItems} items`
                : `${filteredItems} of ${totalItems} items`}
            </span>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="clear-filters-button"
                aria-label="Clear all filters"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="active-filters">
            <span className="filters-label">Active filters:</span>
            <div className="filters-list">
              {searchTerm && (
                <span className="filter-tag">
                  Search: "{searchTerm}"
                  <button
                    onClick={() => onSearchChange('')}
                    className="filter-remove"
                    aria-label="Remove search filter"
                  >
                    ×
                  </button>
                </span>
              )}
              {filterCategory !== 'all' && (
                <span className="filter-tag">
                  Category: {categoryLabels[filterCategory]}
                  <button
                    onClick={() => onFilterChange('all')}
                    className="filter-remove"
                    aria-label="Remove category filter"
                  >
                    ×
                  </button>
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }
);

CollectionControls.displayName = 'CollectionControls';

export default CollectionControls;
