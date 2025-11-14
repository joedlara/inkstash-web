import { supabase } from './supabase/supabaseClient';

export interface Order {
  id: string;
  order_number: string;
  auction_id: string;
  buyer_id: string;
  seller_id: string;
  payment_method_id?: string;
  stripe_payment_intent_id?: string;
  shipping_address_id?: string;
  shipping_full_name: string;
  shipping_address_line1: string;
  shipping_address_line2?: string;
  shipping_city: string;
  shipping_state: string;
  shipping_postal_code: string;
  shipping_country: string;
  shipping_phone?: string;
  item_price: number;
  shipping_cost: number;
  tax: number;
  total: number;
  purchase_type: 'buy_now' | 'bid_won';
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  tracking_number?: string;
  carrier?: string;
  shipped_at?: string;
  delivered_at?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  auctions?: {
    id: string;
    title: string;
    image_url: string;
    description?: string;
  };
}

export interface CreateOrderParams {
  auctionId: string;
  paymentMethodId: string;
  shippingAddressId: string;
  itemPrice: number;
  shippingCost: number;
  tax: number;
  purchaseType: 'buy_now' | 'bid_won';
  stripePaymentIntentId?: string;
}

export interface CreateOrderResult {
  success: boolean;
  order_id?: string;
  order_number?: string;
  total?: number;
  error?: string;
}

// Orders API
export const ordersAPI = {
  // Create a new order
  async create(params: CreateOrderParams): Promise<CreateOrderResult> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase.rpc('create_order', {
      p_auction_id: params.auctionId,
      p_buyer_id: user.id,
      p_payment_method_id: params.paymentMethodId,
      p_shipping_address_id: params.shippingAddressId,
      p_item_price: params.itemPrice,
      p_shipping_cost: params.shippingCost,
      p_tax: params.tax,
      p_purchase_type: params.purchaseType,
      p_stripe_payment_intent_id: params.stripePaymentIntentId || null,
    });

    if (error) {
      console.error('Error creating order:', error);
      throw error;
    }

    return data as CreateOrderResult;
  },

  // Get order by ID
  async getById(orderId: string): Promise<Order | null> {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        auctions (
          id,
          title,
          image_url,
          description
        )
      `)
      .eq('id', orderId)
      .single();

    if (error) {
      console.error('Error fetching order:', error);
      throw error;
    }

    return data as Order;
  },

  // Get order by order number
  async getByOrderNumber(orderNumber: string): Promise<Order | null> {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        auctions (
          id,
          title,
          image_url,
          description
        )
      `)
      .eq('order_number', orderNumber)
      .single();

    if (error) {
      console.error('Error fetching order:', error);
      throw error;
    }

    return data as Order;
  },

  // Get all orders for current user (as buyer)
  async getMyPurchases(): Promise<Order[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        auctions (
          id,
          title,
          image_url,
          description
        )
      `)
      .eq('buyer_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching purchases:', error);
      throw error;
    }

    return data as Order[];
  },

  // Get all orders for current user (as seller)
  async getMySales(): Promise<Order[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        auctions (
          id,
          title,
          image_url,
          description
        )
      `)
      .eq('seller_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching sales:', error);
      throw error;
    }

    return data as Order[];
  },

  // Update order status
  async updateStatus(
    orderId: string,
    status: Order['status'],
    trackingInfo?: { trackingNumber: string; carrier: string }
  ): Promise<Order> {
    const updateData: any = { status };

    if (status === 'shipped' && trackingInfo) {
      updateData.tracking_number = trackingInfo.trackingNumber;
      updateData.carrier = trackingInfo.carrier;
      updateData.shipped_at = new Date().toISOString();
    }

    if (status === 'delivered') {
      updateData.delivered_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .select()
      .single();

    if (error) {
      console.error('Error updating order status:', error);
      throw error;
    }

    return data as Order;
  },

  // Cancel order
  async cancel(orderId: string): Promise<Order> {
    return this.updateStatus(orderId, 'cancelled');
  },
};
