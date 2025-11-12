import { supabase } from '../supabase/supabaseClient';
import { cache } from '../../utils/cache';

/**
 * Check if user has liked an auction
 */
export const checkUserLiked = async (userId: string, auctionId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('auction_likes')
      .select('id')
      .eq('user_id', userId)
      .eq('auction_id', auctionId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      return false;
    }

    return !!data;
  } catch {
    return false;
  }
};

/**
 * Check if user has saved an auction
 */
export const checkUserSaved = async (userId: string, auctionId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('auction_saves')
      .select('id')
      .eq('user_id', userId)
      .eq('auction_id', auctionId)
      .single();

    if (error && error.code !== 'PGRST116') {
      return false;
    }

    return !!data;
  } catch {
    return false;
  }
};

/**
 * Toggle like on an auction
 */
export const toggleLike = async (userId: string, auctionId: string): Promise<boolean> => {
  try {
    // Check if already liked
    const isLiked = await checkUserLiked(userId, auctionId);

    if (isLiked) {
      // Unlike
      const { error } = await supabase
        .from('auction_likes')
        .delete()
        .eq('user_id', userId)
        .eq('auction_id', auctionId);

      if (error) {
        return isLiked;
      }

      return false;
    } else {
      // Like
      const { error } = await supabase
        .from('auction_likes')
        .insert({
          user_id: userId,
          auction_id: auctionId,
        });

      if (error) {
        return isLiked;
      }

      return true;
    }
  } catch {
    return false;
  }
};

/**
 * Toggle save on an auction
 */
export const toggleSave = async (userId: string, auctionId: string): Promise<boolean> => {
  try {
    // Check if already saved
    const isSaved = await checkUserSaved(userId, auctionId);

    if (isSaved) {
      // Unsave
      const { error } = await supabase
        .from('auction_saves')
        .delete()
        .eq('user_id', userId)
        .eq('auction_id', auctionId);

      if (error) {
        return isSaved;
      }

      // Invalidate saved items cache
      cache.remove(`saved-items-${userId}`);

      return false;
    } else {
      // Save
      const { error } = await supabase
        .from('auction_saves')
        .insert({
          user_id: userId,
          auction_id: auctionId,
        });

      if (error) {
        return isSaved;
      }

      // Invalidate saved items cache
      cache.remove(`saved-items-${userId}`);

      return true;
    }
  } catch {
    return false;
  }
};

/**
 * Get counts for an auction
 */
export const getAuctionInteractionCounts = async (auctionId: string) => {
  try {
    const [likesResult, savesResult, viewsResult] = await Promise.all([
      supabase
        .from('auction_likes')
        .select('*', { count: 'exact', head: true })
        .eq('auction_id', auctionId),
      supabase
        .from('auction_saves')
        .select('*', { count: 'exact', head: true })
        .eq('auction_id', auctionId),
      supabase
        .from('auction_views')
        .select('*', { count: 'exact', head: true })
        .eq('auction_id', auctionId),
    ]);

    return {
      likes: likesResult.count || 0,
      saves: savesResult.count || 0,
      views: viewsResult.count || 0,
    };
  } catch {
    return { likes: 0, saves: 0, views: 0 };
  }
};

/**
 * Record a view for an auction
 */
export const recordAuctionView = async (auctionId: string, userId?: string): Promise<void> => {
  try {
    const { error } = await supabase.rpc('record_auction_view', {
      p_auction_id: auctionId,
      p_user_id: userId || null,
    });

    if (error) {
      // Error recording view
    }
  } catch {
    // Error in recordAuctionView
  }
};

/**
 * Get saved auctions for a user
 */
export const getUserSavedAuctions = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('auction_saves')
      .select(`
        auction_id,
        created_at,
        auctions (*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    throw error;
  }
};
