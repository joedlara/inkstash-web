import { supabase } from './supabase/supabaseClient';
import type { Order } from './orders';

export interface OrderConfirmationEmailData {
  orderId: string;
  orderNumber: string;
  buyerEmail: string;
  buyerName: string;
  itemTitle: string;
  itemPrice: number;
  shippingCost: number;
  tax: number;
  total: number;
  shippingAddress: {
    fullName: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
}

/**
 * Send order confirmation email via Supabase Edge Function
 *
 * Prerequisites:
 * 1. Deploy the edge function: `supabase functions deploy send-order-confirmation`
 * 2. Set RESEND_API_KEY secret: `supabase secrets set RESEND_API_KEY=your_key_here`
 * 3. Sign up for Resend at https://resend.com and verify your domain
 */
export async function sendOrderConfirmationEmail(
  order: Order,
  buyerEmail: string,
  buyerName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const auction = Array.isArray(order.auctions) ? order.auctions[0] : order.auctions;

    const emailData: OrderConfirmationEmailData = {
      orderId: order.id,
      orderNumber: order.order_number,
      buyerEmail,
      buyerName,
      itemTitle: auction?.title || 'Your Purchase',
      itemPrice: order.item_price,
      shippingCost: order.shipping_cost,
      tax: order.tax,
      total: order.total,
      shippingAddress: {
        fullName: order.shipping_full_name,
        addressLine1: order.shipping_address_line1,
        addressLine2: order.shipping_address_line2,
        city: order.shipping_city,
        state: order.shipping_state,
        postalCode: order.shipping_postal_code,
        country: order.shipping_country,
      },
    };

    const { data, error } = await supabase.functions.invoke('send-order-confirmation', {
      body: emailData,
    });

    if (error) {
      console.error('Error sending order confirmation email:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to send order confirmation email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export interface BidNotificationData {
  userEmail: string;
  userName: string;
  itemTitle: string;
  itemImageUrl: string;
  itemId: string;
  previousBidAmount: number;
  newBidAmount: number;
  timeRemaining: string;
}

export interface AuctionWinData {
  userEmail: string;
  userName: string;
  itemTitle: string;
  itemImageUrl: string;
  itemId: string;
  winningBidAmount: number;
  auctionEndTime: string;
}

export interface ShippingNotificationData {
  userEmail: string;
  userName: string;
  orderNumber: string;
  itemTitle: string;
  itemImageUrl: string;
  trackingNumber: string;
  carrier: string;
  estimatedDelivery?: string;
  shippingAddress: {
    fullName: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
}

/**
 * Send bid notification email when user is outbid
 */
export async function sendBidNotificationEmail(
  data: BidNotificationData
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: result, error } = await supabase.functions.invoke('send-bid-notification', {
      body: data,
    });

    if (error) {
      console.error('Error sending bid notification email:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to send bid notification email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send auction win notification email
 */
export async function sendAuctionWinEmail(
  data: AuctionWinData
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: result, error } = await supabase.functions.invoke('send-auction-win', {
      body: data,
    });

    if (error) {
      console.error('Error sending auction win email:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to send auction win email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send shipping notification email
 */
export async function sendShippingNotificationEmail(
  data: ShippingNotificationData
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: result, error } = await supabase.functions.invoke('send-shipping-notification', {
      body: data,
    });

    if (error) {
      console.error('Error sending shipping notification email:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to send shipping notification email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
