import { supabase } from '../supabase/supabaseClient';

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
      console.error('Error checking like status:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('Error in checkUserLiked:', error);
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
      console.error('Error checking save status:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('Error in checkUserSaved:', error);
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
        console.error('Error removing like:', error);
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
        console.error('Error adding like:', error);
        return isLiked;
      }

      return true;
    }
  } catch (error) {
    console.error('Error in toggleLike:', error);
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
        console.error('Error removing save:', error);
        return isSaved;
      }

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
        console.error('Error adding save:', error);
        return isSaved;
      }

      return true;
    }
  } catch (error) {
    console.error('Error in toggleSave:', error);
    return false;
  }
};

/**
 * Get counts for an auction
 */
export const getAuctionInteractionCounts = async (auctionId: string) => {
  try {
    const [likesResult, savesResult] = await Promise.all([
      supabase
        .from('auction_likes')
        .select('id', { count: 'exact', head: true })
        .eq('auction_id', auctionId),
      supabase
        .from('auction_saves')
        .select('id', { count: 'exact', head: true })
        .eq('auction_id', auctionId),
    ]);

    return {
      likes: likesResult.count || 0,
      saves: savesResult.count || 0,
    };
  } catch (error) {
    console.error('Error getting interaction counts:', error);
    return { likes: 0, saves: 0 };
  }
};
