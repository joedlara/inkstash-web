import { supabase } from '../supabase/supabaseClient';

export interface Bid {
  id: string;
  auction_id: string;
  user_id: string;
  username?: string;
  amount: number;
  created_at: string;
}

export interface BidResult {
  success: boolean;
  error?: string;
  bid_id?: string;
  amount?: number;
}

/**
 * Place a bid on an auction
 */
export async function placeBid(
  auctionId: string,
  userId: string,
  amount: number
): Promise<BidResult> {
  try {
    const { data, error } = await supabase.rpc('place_bid', {
      p_auction_id: auctionId,
      p_user_id: userId,
      p_amount: amount,
    });

    if (error) {
      console.error('Error placing bid:', error);
      return { success: false, error: error.message };
    }

    return data as BidResult;
  } catch (error) {
    console.error('Error placing bid:', error);
    return { success: false, error: 'Failed to place bid' };
  }
}

/**
 * Get the highest bid for an auction
 */
export async function getHighestBid(auctionId: string): Promise<Bid | null> {
  try {
    const { data, error } = await supabase.rpc('get_highest_bid', {
      p_auction_id: auctionId,
    });

    if (error) {
      console.error('Error getting highest bid:', error);
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    return data[0] as Bid;
  } catch (error) {
    console.error('Error getting highest bid:', error);
    return null;
  }
}

/**
 * Get bid history for an auction
 */
export async function getBidHistory(
  auctionId: string,
  limit: number = 10
): Promise<Bid[]> {
  try {
    const { data, error } = await supabase.rpc('get_bid_history', {
      p_auction_id: auctionId,
      p_limit: limit,
    });

    if (error) {
      console.error('Error getting bid history:', error);
      return [];
    }

    return (data as Bid[]) || [];
  } catch (error) {
    console.error('Error getting bid history:', error);
    return [];
  }
}

/**
 * Calculate the recommended bid increment based on current price
 * This mirrors the database function for client-side use
 */
export function calculateBidIncrement(currentPrice: number): number {
  if (currentPrice < 1) return 0.05;
  if (currentPrice < 5) return 0.25;
  if (currentPrice < 15) return 0.5;
  if (currentPrice < 60) return 1.0;
  if (currentPrice < 150) return 2.5;
  if (currentPrice < 300) return 5.0;
  if (currentPrice < 600) return 10.0;
  if (currentPrice < 1500) return 25.0;
  if (currentPrice < 3000) return 50.0;
  return 100.0;
}

/**
 * Generate suggested bid amounts based on current price
 */
export function generateBidOptions(currentPrice: number): number[] {
  const increment = calculateBidIncrement(currentPrice);

  return [
    currentPrice + increment,
    currentPrice + increment * 2,
    currentPrice + increment * 3,
    currentPrice + increment * 5,
  ].map(price => Math.round(price * 100) / 100); // Round to 2 decimal places
}
