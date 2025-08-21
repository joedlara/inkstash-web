// src/components/dashboard/CollectionItem.tsx

import React, { memo, useState } from 'react';
import { Eye, Heart, MoreVertical, Calendar, Tag } from 'lucide-react';
import type {
  CollectionItem as CollectionItemType,
  ViewMode,
} from '../../types/dashboard';
import '../../styles/dashboard/collectionItem.css';

interface CollectionItemProps {
  item: CollectionItemType;
  viewMode: ViewMode;
  onView?: (item: CollectionItemType) => void;
  onEdit?: (item: CollectionItemType) => void;
  onDelete?: (item: CollectionItemType) => void;
  onToggleFavorite?: (item: CollectionItemType) => void;
  className?: string;
  showActions?: boolean;
  isFavorite?: boolean;
}

const CollectionItem: React.FC<CollectionItemProps> = memo(
  ({
    item,
    viewMode,
    onView,
    onEdit,
    onDelete,
    onToggleFavorite,
    className = '',
    showActions = true,
    isFavorite = false,
  }) => {
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);

    const getConditionColor = (condition: CollectionItemType['condition']) => {
      switch (condition) {
        case 'Mint':
          return 'condition-mint';
        case 'Near Mint':
          return 'condition-near-mint';
        case 'Very Fine':
          return 'condition-very-fine';
        case 'Fine':
          return 'condition-fine';
        case 'Good':
          return 'condition-good';
        case 'Poor':
          return 'condition-poor';
        default:
          return 'condition-unknown';
      }
    };

    const formatCurrency = (value: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    };

    const formatDate = (dateString: string | undefined | null) => {
      try {
        // Handle the specific format from Supabase: "08/07/2025, 11:10:09 AM"
        let dateToFormat: Date;

        if (
          dateString.includes(',') &&
          (dateString.includes('AM') || dateString.includes('PM'))
        ) {
          // Parse the MM/DD/YYYY, HH:MM:SS AM/PM format
          dateToFormat = new Date(dateString);
        } else {
          // Handle other formats (ISO, etc.)
          dateToFormat = new Date(dateString);
        }

        // Check if the date is valid
        if (isNaN(dateToFormat.getTime())) {
          console.warn('Invalid date string:', dateString);
          return 'Invalid Date';
        }

        return new Intl.DateTimeFormat('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }).format(dateToFormat);
      } catch (error) {
        console.error(
          'Error formatting date:',
          error,
          'for dateString:',
          dateString
        );
        return 'Invalid Date';
      }
    };

    const calculateGainLoss = () => {
      const gain = item.estimated_value - item.purchase_price;
      const percentage = (gain / item.purchase_price) * 100;
      return { gain, percentage };
    };

    const { gain, percentage } = calculateGainLoss();

    const handleImageLoad = () => {
      setImageLoaded(true);
    };

    const handleImageError = () => {
      setImageError(true);
      setImageLoaded(true);
    };

    const handleItemClick = (e: React.MouseEvent) => {
      // Don't trigger if clicking on actions
      if ((e.target as HTMLElement).closest('.item-actions')) {
        return;
      }
      onView?.(item);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onView?.(item);
      }
    };

    const toggleDropdown = (e: React.MouseEvent) => {
      e.stopPropagation();
      setShowDropdown(!showDropdown);
    };

    // Grid View Component
    if (viewMode === 'grid') {
      return (
        <article
          className={`collection-item grid-view ${className}`}
          onClick={handleItemClick}
          onKeyPress={handleKeyPress}
          tabIndex={0}
          role="button"
          aria-label={`View ${item.title}`}
        >
          {/* Image Container */}
          <div className="item-image-container">
            <div className={`image-wrapper ${!imageLoaded ? 'loading' : ''}`}>
              {!imageError ? (
                <img
                  src={item.image_url || '/placeholder-comic.jpg'}
                  alt={item.title}
                  className="item-image"
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                  loading="lazy"
                />
              ) : (
                <div className="image-placeholder">
                  <Tag className="placeholder-icon" />
                  <span className="placeholder-text">No Image</span>
                </div>
              )}
            </div>

            {/* Overlay Actions */}
            {showActions && (
              <div className="item-overlay">
                <button
                  onClick={e => {
                    e.stopPropagation();
                    onToggleFavorite?.(item);
                  }}
                  className={`overlay-action favorite ${isFavorite ? 'active' : ''}`}
                  aria-label={
                    isFavorite ? 'Remove from favorites' : 'Add to favorites'
                  }
                >
                  <Heart className="w-4 h-4" />
                </button>
                <button
                  onClick={e => {
                    e.stopPropagation();
                    onView?.(item);
                  }}
                  className="overlay-action view"
                  aria-label="View details"
                >
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Value Change Indicator */}
            {gain !== 0 && (
              <div
                className={`value-indicator ${gain > 0 ? 'positive' : 'negative'}`}
              >
                {gain > 0 ? '+' : ''}
                {percentage.toFixed(1)}%
              </div>
            )}
          </div>

          {/* Content */}
          <div className="item-content">
            <div className="item-header">
              <h3 className="item-title" title={item.title}>
                {item.title}
              </h3>
              {showActions && (
                <div className="item-actions">
                  <button
                    onClick={toggleDropdown}
                    className="actions-toggle"
                    aria-label="More actions"
                    aria-expanded={showDropdown}
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  {showDropdown && (
                    <div className="actions-dropdown">
                      <button
                        onClick={() => onDelete?.(item)}
                        className="dropdown-item danger"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <p className="item-category">{item.category.replace('-', ' ')}</p>

            <div className="item-details">
              <div className="item-value">
                <span className="current-value">
                  {formatCurrency(item.estimated_value)}
                </span>
                {item.purchase_price !== item.estimated_value && (
                  <span className="purchase-value">
                    (bought for {formatCurrency(item.purchase_price)})
                  </span>
                )}
              </div>

              <div className="item-meta">
                <span
                  className={`condition-badge ${getConditionColor(item.condition)}`}
                >
                  {item.condition}
                </span>
                {item.year && <span className="year-badge">{item.year}</span>}
              </div>
            </div>
          </div>
        </article>
      );
    }

    // List View Component
    return (
      <article
        className={`collection-item list-view ${className}`}
        onClick={handleItemClick}
        onKeyPress={handleKeyPress}
        tabIndex={0}
        role="button"
        aria-label={`View ${item.title}`}
      >
        {/* Image */}
        <div className="item-thumbnail">
          {!imageError ? (
            <img
              src={item.image_url || '/placeholder-comic.jpg'}
              alt={item.title}
              className="thumbnail-image"
              onLoad={handleImageLoad}
              onError={handleImageError}
              loading="lazy"
            />
          ) : (
            <div className="thumbnail-placeholder">
              <Tag className="w-6 h-6" />
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="list-content">
          <div className="list-main">
            <h3 className="item-title">{item.title}</h3>
            <p className="item-category">{item.category.replace('-', ' ')}</p>
            {item.description && (
              <p className="item-description">{item.description}</p>
            )}
          </div>

          <div className="list-meta">
            <div className="meta-row">
              <span
                className={`condition-badge ${getConditionColor(item.condition)}`}
              >
                {item.condition}
              </span>
              {item.year && <span className="year-badge">{item.year}</span>}
              <span className="date-added">
                <Calendar className="w-3 h-3" />
                {formatDate(item.date_added)}
              </span>
            </div>

            <div className="value-row">
              <div className="values">
                <span className="current-value">
                  {formatCurrency(item.estimated_value)}
                </span>
                <span className="purchase-value">
                  Paid: {formatCurrency(item.purchase_price)}
                </span>
              </div>
              {gain !== 0 && (
                <div
                  className={`gain-loss ${gain > 0 ? 'positive' : 'negative'}`}
                >
                  {gain > 0 ? '+' : ''}
                  {formatCurrency(gain)} ({percentage.toFixed(1)}%)
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        {showActions && (
          <div className="list-actions">
            <button
              onClick={e => {
                e.stopPropagation();
                onToggleFavorite?.(item);
              }}
              className={`action-button favorite ${isFavorite ? 'active' : ''}`}
              aria-label={
                isFavorite ? 'Remove from favorites' : 'Add to favorites'
              }
            >
              <Heart className="w-4 h-4" />
            </button>
            <div className="action-dropdown">
              <button
                onClick={toggleDropdown}
                className="action-button more"
                aria-label="More actions"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              {showDropdown && (
                <div className="actions-dropdown">
                  <button
                    onClick={() => onDelete?.(item)}
                    className="dropdown-item danger"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </article>
    );
  }
);

CollectionItem.displayName = 'CollectionItem';

export default CollectionItem;
