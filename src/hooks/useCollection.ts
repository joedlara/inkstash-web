// src/hooks/useCollection.ts
import { useState, useEffect } from 'react';
import { supabase } from '../api/supabase/supabaseClient';
import { useAuth } from './useAuth';

interface CollectionItem {
  id: string;
  title: string;
  category: string;
  condition: string;
  estimatedValue?: number;
  purchasePrice?: number;
  year?: number;
  imageUrl?: string;
  description?: string;
  tags?: string[];
  dateAdded: string;
  userId: string;
}

export const useCollection = () => {
  const { user } = useAuth();
  const [collection, setCollection] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      loadCollection();
    }
  }, [user?.id]);

  const loadCollection = async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('user_collections')
        .select('*')
        .eq('user_id', user.id)
        .order('date_added', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      // Transform database format to our interface
      const transformedItems: CollectionItem[] = (data || []).map(item => ({
        id: item.id,
        title: item.title,
        category: item.category,
        condition: item.condition,
        estimatedValue: item.estimated_value,
        purchasePrice: item.purchase_price,
        year: item.year,
        imageUrl: item.image_url,
        description: item.description,
        tags: item.tags || [],
        dateAdded: item.date_added,
        userId: item.user_id,
      }));

      setCollection(transformedItems);
    } catch (err) {
      console.error('Error loading collection:', err);
      setError('Failed to load collection');

      // For demo purposes, set some mock data if real data fails
      setCollection([
        {
          id: '1',
          title: 'Amazing Spider-Man #1 (1963)',
          category: 'Comics',
          condition: 'Very Fine',
          estimatedValue: 2500,
          purchasePrice: 1800,
          year: 1963,
          imageUrl: '/placeholder-comic.jpg',
          dateAdded: new Date().toISOString(),
          userId: user?.id || '',
        },
        {
          id: '2',
          title: 'Batman #1 (1940)',
          category: 'Comics',
          condition: 'Good',
          estimatedValue: 1200,
          purchasePrice: 900,
          year: 1940,
          imageUrl: '/placeholder-comic.jpg',
          dateAdded: new Date().toISOString(),
          userId: user?.id || '',
        },
        {
          id: '3',
          title: 'One Piece Vol. 1',
          category: 'Manga',
          condition: 'Near Mint',
          estimatedValue: 45,
          purchasePrice: 25,
          year: 1997,
          imageUrl: '/placeholder-manga.jpg',
          dateAdded: new Date().toISOString(),
          userId: user?.id || '',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const addItem = async (
    item: Omit<CollectionItem, 'id' | 'userId' | 'dateAdded'>
  ) => {
    if (!user?.id) return { success: false, error: 'Not authenticated' };

    try {
      const { data, error: insertError } = await supabase
        .from('user_collections')
        .insert({
          user_id: user.id,
          title: item.title,
          category: item.category,
          condition: item.condition,
          estimated_value: item.estimatedValue,
          purchase_price: item.purchasePrice,
          year: item.year,
          image_url: item.imageUrl,
          description: item.description,
          tags: item.tags,
          date_added: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      // Refresh collection
      await loadCollection();

      return { success: true, data };
    } catch (err) {
      console.error('Error adding item:', err);
      return { success: false, error: 'Failed to add item' };
    }
  };

  const updateItem = async (id: string, updates: Partial<CollectionItem>) => {
    if (!user?.id) return { success: false, error: 'Not authenticated' };

    try {
      const { error: updateError } = await supabase
        .from('user_collections')
        .update({
          title: updates.title,
          category: updates.category,
          condition: updates.condition,
          estimated_value: updates.estimatedValue,
          purchase_price: updates.purchasePrice,
          year: updates.year,
          image_url: updates.imageUrl,
          description: updates.description,
          tags: updates.tags,
        })
        .eq('id', id)
        .eq('user_id', user.id);

      if (updateError) {
        throw updateError;
      }

      // Refresh collection
      await loadCollection();

      return { success: true };
    } catch (err) {
      console.error('Error updating item:', err);
      return { success: false, error: 'Failed to update item' };
    }
  };

  const removeItem = async (id: string) => {
    if (!user?.id) return { success: false, error: 'Not authenticated' };

    try {
      const { error: deleteError } = await supabase
        .from('user_collections')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (deleteError) {
        throw deleteError;
      }

      // Remove from local state
      setCollection(prev => prev.filter(item => item.id !== id));

      return { success: true };
    } catch (err) {
      console.error('Error removing item:', err);
      return { success: false, error: 'Failed to remove item' };
    }
  };

  const getCollectionStats = () => {
    const totalItems = collection.length;
    const totalValue = collection.reduce(
      (sum, item) => sum + (item.estimatedValue || 0),
      0
    );
    const totalInvestment = collection.reduce(
      (sum, item) => sum + (item.purchasePrice || 0),
      0
    );
    const categories = [...new Set(collection.map(item => item.category))];

    return {
      totalItems,
      totalValue,
      totalInvestment,
      profitLoss: totalValue - totalInvestment,
      categories: categories.length,
      categoriesBreakdown: categories.map(category => ({
        category,
        count: collection.filter(item => item.category === category).length,
        value: collection
          .filter(item => item.category === category)
          .reduce((sum, item) => sum + (item.estimatedValue || 0), 0),
      })),
    };
  };

  return {
    collection,
    loading,
    error,
    addItem,
    updateItem,
    removeItem,
    loadCollection,
    stats: getCollectionStats(),
  };
};
