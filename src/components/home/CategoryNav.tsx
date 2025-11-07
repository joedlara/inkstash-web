import { useState } from 'react';
import '../../styles/home/CategoryNav.css';

export type CategoryType = 'all' | 'comics' | 'manga' | 'trading-cards' | 'figures' | 'original-art' | 'graded' | 'prints';

interface CategoryNavProps {
  activeCategory: CategoryType;
  onCategoryChange: (category: CategoryType) => void;
}

interface Category {
  id: CategoryType;
  label: string;
  icon: string;
}

const categories: Category[] = [
  { id: 'all', label: 'All Items', icon: '🏠' },
  { id: 'comics', label: 'Comics', icon: '📖' },
  { id: 'manga', label: 'Manga', icon: '🎌' },
  { id: 'trading-cards', label: 'Trading Cards', icon: '🃏' },
  { id: 'figures', label: 'Figures', icon: '🎭' },
  { id: 'original-art', label: 'Original Art', icon: '🎨' },
  { id: 'graded', label: 'Graded Items', icon: '⭐' },
  { id: 'prints', label: 'Prints', icon: '🖼️' },
];

export default function CategoryNav({ activeCategory, onCategoryChange }: CategoryNavProps) {
  return (
    <section className="category-nav">
      <div className="category-nav-container">
        <div className="category-scroll">
          {categories.map((category) => (
            <button
              key={category.id}
              className={`category-pill ${activeCategory === category.id ? 'active' : ''}`}
              onClick={() => onCategoryChange(category.id)}
            >
              <span className="category-icon">{category.icon}</span>
              <span className="category-label">{category.label}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
