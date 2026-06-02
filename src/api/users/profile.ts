import { supabase } from '../supabase/supabaseClient';

export interface PublicUserProfile {
  id: string;
  username: string;
  full_name?: string;
  avatar_url?: string;
  bio?: string;
  website_url?: string;
  social_links?: SocialLinks;
  level?: number;
  xp?: number;
  xp_to_next?: number;
  seller_verified?: boolean;
  verified?: boolean;
  seller_rating?: number;
  created_at?: string;
}

export interface SocialLinks {
  twitter?: string;
  instagram?: string;
  tiktok?: string;
  youtube?: string;
  twitch?: string;
  discord?: string;
  website?: string;
}

export interface UserBadge {
  id: string;
  badge_id: string;
  awarded_at: string;
}

export interface StreamerProfile {
  total_streams: number;
  total_stream_hours: number;
  average_viewers: number;
  total_followers: number;
  is_new_streamer: boolean;
  tier: string;
  average_engagement_rate?: number;
  stream_completion_rate?: number;
  viewer_retention_rate?: number;
  first_stream_date?: string;
}

export interface UserProfileStats {
  total_auctions: number;
  total_sales: number;
  total_purchases: number;
  items_sold: number;
  saved_count: number;
  liked_count: number;
  following_count: number;
  followers_count: number;
}

/**
 * Get public user profile by user ID
 */
export async function getUserProfile(userId: string): Promise<PublicUserProfile | null> {
  const { data, error } = await supabase
    .from('users')
    .select(`
      id,
      username,
      full_name,
      avatar_url,
      bio,
      website_url,
      social_links,
      level,
      xp,
      xp_to_next,
      seller_verified,
      verified,
      seller_rating,
      created_at
    `)
    .eq('id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw error;
  }

  return data;
}

/**
 * Get user profile by username
 */
export async function getUserProfileByUsername(username: string): Promise<PublicUserProfile | null> {
  const { data, error } = await supabase
    .from('users')
    .select(`
      id,
      username,
      full_name,
      avatar_url,
      bio,
      website_url,
      social_links,
      level,
      xp,
      xp_to_next,
      seller_verified,
      verified,
      seller_rating,
      created_at
    `)
    .eq('username', username)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw error;
  }

  return data;
}

/**
 * Get user badges
 */
export async function getUserBadges(userId: string): Promise<UserBadge[]> {
  const { data, error } = await supabase
    .from('user_badges')
    .select('*')
    .eq('user_id', userId)
    .order('awarded_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Get streamer profile data
 */
export async function getStreamerProfile(userId: string): Promise<StreamerProfile | null> {
  try {
    const { data, error } = await supabase
      .from('streamer_profiles')
      .select(`
        total_streams,
        total_stream_hours,
        average_viewers,
        total_followers,
        is_new_streamer,
        tier,
        average_engagement_rate,
        stream_completion_rate,
        viewer_retention_rate,
        first_stream_date
      `)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found - user is not a streamer
        return null;
      }
      // Log error but don't throw - let profile load without streamer data
      console.error('Error fetching streamer profile:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Error in getStreamerProfile:', err);
    return null;
  }
}

/**
 * Get user profile statistics
 */
export async function getUserProfileStats(userId: string): Promise<UserProfileStats> {
  try {
    // Get saved count
    const { count: savedCount } = await supabase
      .from('auction_saves')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Get liked count
    const { count: likedCount } = await supabase
      .from('auction_likes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Get following count - with error handling
    let followingCount = 0;
    try {
      const result = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', userId);
      followingCount = result.count || 0;
    } catch (err) {
      console.error('Error fetching following count:', err);
    }

    // Get followers count - with error handling
    let followersCount = 0;
    try {
      const result = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', userId);
      followersCount = result.count || 0;
    } catch (err) {
      console.error('Error fetching followers count:', err);
    }

    // Get total listings (active items for sale)
    const { count: totalListings } = await supabase
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'active');

    // Get total sales (completed/sold listings)
    const { count: totalSales } = await supabase
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'sold');

    // Get items sold count (same as total sales for now)
    const itemsSold = totalSales || 0;

    // Get total purchases (orders as buyer — covers both auction wins
    // and marketplace listing buys). bids.is_winner never existed in this
    // schema so the old query was returning 400.
    let totalPurchases = 0;
    try {
      const result = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('buyer_id', userId);
      totalPurchases = result.count || 0;
    } catch (err) {
      console.error('Error fetching purchases count:', err);
    }

    return {
      total_auctions: totalListings || 0,
      total_sales: totalSales || 0,
      total_purchases: totalPurchases,
      items_sold: itemsSold,
      saved_count: savedCount || 0,
      liked_count: likedCount || 0,
      following_count: followingCount,
      followers_count: followersCount,
    };
  } catch (err) {
    console.error('Error in getUserProfileStats:', err);
    // Return default stats if there's an error
    return {
      total_auctions: 0,
      total_sales: 0,
      total_purchases: 0,
      items_sold: 0,
      saved_count: 0,
      liked_count: 0,
      following_count: 0,
      followers_count: 0,
    };
  }
}

/**
 * Update user social links
 */
export async function updateSocialLinks(userId: string, socialLinks: SocialLinks): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({ social_links: socialLinks })
    .eq('id', userId);

  if (error) throw error;
}

/**
 * Check if current user is following target user
 */
export async function isFollowing(currentUserId: string, targetUserId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', currentUserId)
      .eq('following_id', targetUserId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking follow status:', error);
      return false;
    }

    return !!data;
  } catch (err) {
    console.error('Error in isFollowing:', err);
    return false;
  }
}

/**
 * Follow a user
 */
export async function followUser(currentUserId: string, targetUserId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('follows')
      .insert({
        follower_id: currentUserId,
        following_id: targetUserId,
      });

    if (error) {
      console.error('Error following user:', error);
      throw error;
    }
  } catch (err) {
    console.error('Error in followUser:', err);
    throw err;
  }
}

/**
 * Unfollow a user
 */
export async function unfollowUser(currentUserId: string, targetUserId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', currentUserId)
      .eq('following_id', targetUserId);

    if (error) {
      console.error('Error unfollowing user:', error);
      throw error;
    }
  } catch (err) {
    console.error('Error in unfollowUser:', err);
    throw err;
  }
}

export interface FollowUser {
  id: string;
  username: string;
  full_name?: string;
  avatar_url?: string;
  verified?: boolean;
  bio?: string;
}

/**
 * Get followers with pagination
 */
export async function getFollowers(
  userId: string,
  limit: number = 25,
  offset: number = 0
): Promise<FollowUser[]> {
  try {
    const { data, error } = await supabase
      .from('follows')
      .select(`
        follower_id,
        users!follows_follower_id_fkey (
          id,
          username,
          full_name,
          avatar_url,
          verified,
          bio
        )
      `)
      .eq('following_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching followers:', error);
      throw error;
    }

    return (data || []).map((follow: any) => follow.users);
  } catch (err) {
    console.error('Error in getFollowers:', err);
    throw err;
  }
}

/**
 * Get following with pagination
 */
export async function getFollowing(
  userId: string,
  limit: number = 25,
  offset: number = 0
): Promise<FollowUser[]> {
  try {
    const { data, error } = await supabase
      .from('follows')
      .select(`
        following_id,
        users!follows_following_id_fkey (
          id,
          username,
          full_name,
          avatar_url,
          verified,
          bio
        )
      `)
      .eq('follower_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching following:', error);
      throw error;
    }

    return (data || []).map((follow: any) => follow.users);
  } catch (err) {
    console.error('Error in getFollowing:', err);
    throw err;
  }
}
