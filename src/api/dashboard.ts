// src/api/dashboard.ts - Dashboard API using axios
import { api } from './axiosClient';
import { supabase } from './supabase/supabaseClient';

export interface DashboardStats {
  savedCount: number;
  likedCount: number;
  activeBidsCount: number;
  wonAuctionsCount: number;
  totalSpent: number;
  activeWatching: number;
}

/**
 * Get dashboard statistics for the current user
 * Uses axios for consistent async behavior
 */
export async function getDashboardStats(userId: string): Promise<DashboardStats> {
  try {
    // Run all queries in parallel using Promise.all for better performance
    const [
      savedResult,
      likedResult,
      bidsResult,
      ordersResult,
      wonCountResult,
    ] = await Promise.all([
      // Get saved collectibles count
      supabase
        .from('auction_saves')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId),

      // Get liked collectibles count
      supabase
        .from('auction_likes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId),

      // Get active bids
      supabase
        .from('bids')
        .select('*, auctions!inner(*)')
        .eq('user_id', userId)
        .gte('auctions.end_time', new Date().toISOString())
        .neq('auctions.status', 'sold'),

      // Get orders for total spent
      supabase
        .from('orders')
        .select('total')
        .eq('buyer_id', userId)
        .in('status', ['processing', 'shipped', 'delivered']),

      // Get won auctions count
      supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('buyer_id', userId)
        .in('status', ['processing', 'shipped', 'delivered']),
    ]);

    // Check for errors in each result
    if (savedResult.error) {
      console.error('Error fetching saved collectibles:', savedResult.error);
    }
    if (likedResult.error) {
      console.error('Error fetching liked collectibles:', likedResult.error);
    }
    if (bidsResult.error) {
      console.error('Error fetching active bids:', bidsResult.error);
    }
    if (ordersResult.error) {
      console.error('Error fetching orders:', ordersResult.error);
    }
    if (wonCountResult.error) {
      console.error('Error fetching won auctions count:', wonCountResult.error);
    }

    // Calculate total spent
    const totalSpent = ordersResult.data?.reduce(
      (sum, order) => sum + Number(order.total),
      0
    ) || 0;

    // Return stats with fallback to 0 for any errors
    return {
      savedCount: savedResult.count || 0,
      likedCount: likedResult.count || 0,
      activeBidsCount: bidsResult.data?.length || 0,
      wonAuctionsCount: wonCountResult.count || 0,
      totalSpent,
      activeWatching: (savedResult.count || 0) + (likedResult.count || 0),
    };
  } catch (error) {
    console.error('Error loading dashboard stats:', error);

    // Return default stats on error
    return {
      savedCount: 0,
      likedCount: 0,
      activeBidsCount: 0,
      wonAuctionsCount: 0,
      totalSpent: 0,
      activeWatching: 0,
    };
  }
}

/**
 * Get saved collectibles for the current user
 */
export async function getSavedCollectibles(userId: string) {
  const { data, error } = await supabase
    .from('auction_saves')
    .select(`
      id,
      created_at,
      auctions (
        id,
        title,
        image_url,
        current_bid,
        buy_now_price,
        end_time,
        status
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching saved collectibles:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get liked collectibles for the current user
 */
export async function getLikedCollectibles(userId: string) {
  const { data, error } = await supabase
    .from('auction_likes')
    .select(`
      id,
      created_at,
      auctions (
        id,
        title,
        image_url,
        current_bid,
        buy_now_price,
        end_time,
        status
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching liked collectibles:', error);
    throw error;
  }

  return data || [];
}

/**
 * Remove a saved collectible
 */
export async function removeSavedCollectible(saveId: string): Promise<void> {
  const { error } = await supabase
    .from('auction_saves')
    .delete()
    .eq('id', saveId);

  if (error) {
    console.error('Error removing saved collectible:', error);
    throw error;
  }
}

/**
 * Remove a liked collectible
 */
export async function removeLikedCollectible(likeId: string): Promise<void> {
  const { error } = await supabase
    .from('auction_likes')
    .delete()
    .eq('id', likeId);

  if (error) {
    console.error('Error removing liked collectible:', error);
    throw error;
  }
}
