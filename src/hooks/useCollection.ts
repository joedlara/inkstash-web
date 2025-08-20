// src/hooks/useCollection.ts
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import type { CollectionItem } from '../types/dashboard';
import { supabase } from '../api/supabase/supabaseClient';

// Mock data for development - replace with actual Supabase calls
const mockCollectionData: CollectionItem[] = [
  {
    id: '1',
    title: 'Amazing Spider-Man #1 (1963)',
    category: 'comics',
    condition: 'Near Mint',
    estimated_value: 2500,
    purchase_price: 1800,
    image_url: 'https://example.com/spiderman1.jpg',
    dateAdded: '2024-01-15',
    year: 1963,
    description: 'First appearance of Spider-Man in his own series',
  },
  {
    id: '2',
    title: 'Batman #1 (1940)',
    category: 'comics',
    condition: 'Very Fine',
    estimated_value: 15000,
    purchase_price: 12000,
    image_url: 'https://example.com/batman1.jpg',
    date_added: '2024-01-10',
    year: 1940,
    description: 'First appearance of the Joker and Catwoman',
  },
  {
    id: '3',
    title: 'X-Men #1 (1963)',
    category: 'comics',
    condition: 'Fine',
    estimated_value: 3200,
    purchase_price: 2800,
    image_url: 'https://example.com/xmen1.jpg',
    date_added: '2024-01-05',
    year: 1963,
    description: 'First appearance of the X-Men',
  },
  {
    id: '4',
    title: 'Naruto Volume 1',
    category: 'manga',
    condition: 'Mint',
    estimated_value: 45,
    purchase_price: 35,
    image_url: 'https://example.com/naruto1.jpg',
    date_added: '2024-01-20',
    year: 1999,
    description: 'First volume of the beloved ninja series',
  },
  {
    id: '5',
    title: 'Pokemon Base Set Charizard',
    category: 'trading-card',
    condition: 'Near Mint',
    estimated_value: 350,
    purchase_price: 280,
    image_url: 'https://example.com/charizard.jpg',
    date_added: '2024-01-18',
    year: 1998,
    description: 'Holographic Charizard from the original Pokemon set',
  },
  {
    id: '6',
    title: 'One Piece Luffy Figure',
    category: 'figure',
    condition: 'Mint',
    estimated_value: 120,
    purchase_price: 95,
    image_url: 'https://example.com/luffy.jpg',
    date_added: '2024-01-12',
    year: 2020,
    description: 'Premium figure of Monkey D. Luffy',
  },
];

interface CollectionState {
  items: CollectionItem[];
  loading: boolean;
  error: string | null;
  initialized: boolean;
}

export const useCollection = () => {
  const { user, isAuthenticated, initialized: authInitialized } = useAuth();
  const [collectionState, setCollectionState] = useState<CollectionState>({
    items: [],
    loading: true,
    error: null,
    initialized: false,
  });
  const fetchCollection = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setCollectionState({
        items: [],
        loading: false,
        error: null,
        initialized: true,
      });
      return;
    }

    try {
      setCollectionState(prev => ({ ...prev, loading: true, error: null }));

      // TODO: Replace with actual Supabase query
      const { data, error } = await supabase
        .from('user_collections')
        .select('*')
        .eq('user_id', user.id)
        .order('date_added', { ascending: false });

      console.log(data);
      if (error) throw error;

      // For now, simulate API delay and return mock data
      await new Promise(resolve => setTimeout(resolve, 500));

      setCollectionState({
        items: data || mockCollectionData,
        loading: false,
        error: null,
        initialized: true,
      });
    } catch (error: any) {
      console.error('Error fetching collection:', error);
      setCollectionState({
        items: [],
        loading: false,
        error: error.message || 'Failed to load collection',
        initialized: true,
      });
    }
  }, [isAuthenticated, user]);

  const addItem = useCallback(
    async (item: Omit<CollectionItem, 'id' | 'dateAdded'>) => {
      if (!isAuthenticated || !user) {
        throw new Error('Must be authenticated to add items');
      }

      try {
        // TODO: Replace with actual Supabase insert
        const { data, error } = await supabase
          .from('user_collection')
          .insert([
            {
              ...item,
              user_id: user.id,
              date_added: new Date().toISOString(),
            },
          ])
          .select()
          .single();

        if (error) throw error;

        // For now, simulate adding to local state
        const newItem: CollectionItem = {
          ...item,
          id: Date.now().toString(),
          dateAdded: new Date().toISOString(),
        };

        setCollectionState(prev => ({
          ...prev,
          items: [newItem, ...prev.items],
        }));

        return newItem;
      } catch (error: any) {
        console.error('Error adding item:', error);
        throw new Error(error.message || 'Failed to add item');
      }
    },
    [isAuthenticated, user]
  );

  const updateItem = useCallback(
    async (id: string, updates: Partial<CollectionItem>) => {
      if (!isAuthenticated || !user) {
        throw new Error('Must be authenticated to update items');
      }

      try {
        // TODO: Replace with actual Supabase update
        // const { data, error } = await supabase
        //   .from('collection_items')
        //   .update(updates)
        //   .eq('id', id)
        //   .eq('user_id', user.id)
        //   .select()
        //   .single();

        // if (error) throw error;

        // For now, simulate updating local state
        setCollectionState(prev => ({
          ...prev,
          items: prev.items.map(item =>
            item.id === id ? { ...item, ...updates } : item
          ),
        }));

        return updates;
      } catch (error: any) {
        console.error('Error updating item:', error);
        throw new Error(error.message || 'Failed to update item');
      }
    },
    [isAuthenticated, user]
  );

  const deleteItem = useCallback(
    async (id: string) => {
      if (!isAuthenticated || !user) {
        throw new Error('Must be authenticated to delete items');
      }

      try {
        // TODO: Replace with actual Supabase delete
        // const { error } = await supabase
        //   .from('collection_items')
        //   .delete()
        //   .eq('id', id)
        //   .eq('user_id', user.id);

        // if (error) throw error;

        // For now, simulate deleting from local state
        setCollectionState(prev => ({
          ...prev,
          items: prev.items.filter(item => item.id !== id),
        }));
      } catch (error: any) {
        console.error('Error deleting item:', error);
        throw new Error(error.message || 'Failed to delete item');
      }
    },
    [isAuthenticated, user]
  );

  const refreshCollection = useCallback(async () => {
    await fetchCollection();
  }, [fetchCollection]);

  // Initialize collection when auth is ready
  useEffect(() => {
    if (authInitialized && !collectionState.initialized) {
      fetchCollection();
    }
  }, [authInitialized, collectionState.initialized, fetchCollection]);

  // Refetch collection when user changes
  useEffect(() => {
    if (authInitialized && collectionState.initialized) {
      fetchCollection();
    }
  }, [user?.id, authInitialized, fetchCollection]);

  return {
    collection: collectionState.items,
    loading: collectionState.loading,
    error: collectionState.error,
    initialized: collectionState.initialized,
    addItem,
    updateItem,
    deleteItem,
    refreshCollection,

    // Computed values
    totalItems: collectionState.items.length,
    totalValue: collectionState.items.reduce(
      (sum, item) => sum + item.estimated_value,
      0
    ),
    totalInvestment: collectionState.items.reduce(
      (sum, item) => sum + item.purchase_price,
      0
    ),
  };
};
