import { supabase } from '../supabase';

export interface UserPreferences {
  id?: string;
  user_id: string;
  favorite_characters: string[];
  favorite_shows: string[];
  favorite_categories: string[];
  min_price: number;
  max_price: number;
  items_per_page: number;
  default_sort: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Get user preferences by user ID
 */
export async function getUserPreferences(userId: string): Promise<UserPreferences | null> {
  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No preferences found, return default
      return null;
    }
    throw error;
  }

  return data;
}

/**
 * Create or update user preferences
 */
export async function upsertUserPreferences(preferences: Partial<UserPreferences> & { user_id: string }): Promise<UserPreferences> {
  const { data, error } = await supabase
    .from('user_preferences')
    .upsert(preferences, { onConflict: 'user_id' })
    .select()
    .single();

  if (error) throw error;

  return data;
}

/**
 * Delete user preferences
 */
export async function deleteUserPreferences(userId: string): Promise<void> {
  const { error } = await supabase
    .from('user_preferences')
    .delete()
    .eq('user_id', userId);

  if (error) throw error;
}

/**
 * Get saved collectibles for a user
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

  if (error) throw error;
  return data;
}

/**
 * Get liked collectibles for a user
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

  if (error) throw error;
  return data;
}

/**
 * Save/bookmark a collectible
 */
export async function saveCollectible(userId: string, auctionId: string) {
  const { data, error } = await supabase
    .from('auction_saves')
    .insert({ user_id: userId, auction_id: auctionId })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Unsave/remove bookmark from a collectible
 */
export async function unsaveCollectible(userId: string, auctionId: string) {
  const { error } = await supabase
    .from('auction_saves')
    .delete()
    .eq('user_id', userId)
    .eq('auction_id', auctionId);

  if (error) throw error;
}

/**
 * Like a collectible
 */
export async function likeCollectible(userId: string, auctionId: string) {
  const { data, error } = await supabase
    .from('auction_likes')
    .insert({ user_id: userId, auction_id: auctionId })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Unlike a collectible
 */
export async function unlikeCollectible(userId: string, auctionId: string) {
  const { error } = await supabase
    .from('auction_likes')
    .delete()
    .eq('user_id', userId)
    .eq('auction_id', auctionId);

  if (error) throw error;
}

/**
 * Check if a collectible is saved by the user
 */
export async function isCollectibleSaved(userId: string, auctionId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('auction_saves')
    .select('id')
    .eq('user_id', userId)
    .eq('auction_id', auctionId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  return !!data;
}

/**
 * Check if a collectible is liked by the user
 */
export async function isCollectibleLiked(userId: string, auctionId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('auction_likes')
    .select('id')
    .eq('user_id', userId)
    .eq('auction_id', auctionId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  return !!data;
}
