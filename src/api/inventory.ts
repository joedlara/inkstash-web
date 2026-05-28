import { supabase } from './supabase/supabaseClient';
import type { PackItem } from './packs';

export type InventoryStatus = 'vaulted' | 'sold_back' | 'shipping_pending' | 'shipped';

export interface InventoryItem {
  id: string;
  user_id: string;
  pack_purchase_id: string;
  pack_item_id: string;
  status: InventoryStatus;
  sold_back_rubies: number | null;
  sold_back_at: string | null;
  shipping_requested_at: string | null;
  shipped_at: string | null;
  shipping_address_id: string | null;
  created_at: string;
}

/** Inventory item joined with the underlying pack_item details. Used by My Stash. */
export interface InventoryItemWithDetails extends InventoryItem {
  pack_item: Pick<
    PackItem,
    'id' | 'comic_title' | 'issue_number' | 'grade' | 'condition' | 'rarity' | 'estimated_value' | 'image_url' | 'quantity'
  >;
}

export interface SellBackResult {
  payout_rubies: number;
  new_balance: number | null;
}

async function authedInvoke<T>(fn: string, body: Record<string, unknown>): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('You must be logged in');

  const { data, error } = await supabase.functions.invoke(fn, {
    body,
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data as T;
}

export const inventoryAPI = {
  async sellBack(inventoryId: string): Promise<SellBackResult> {
    return authedInvoke<SellBackResult>('sell-back-item', { inventory_id: inventoryId });
  },

  async requestShip(inventoryId: string, addressId: string): Promise<{ ok: true }> {
    return authedInvoke<{ ok: true }>('request-ship-item', {
      inventory_id: inventoryId,
      address_id: addressId,
    });
  },

  /** Pull all inventory rows for a single pack purchase. Used by PackDetail
   *  after a reveal to know which inventory_id maps to which drawn item. */
  async forPurchase(packPurchaseId: string): Promise<InventoryItem[]> {
    const { data, error } = await supabase
      .from('user_inventory')
      .select('*')
      .eq('pack_purchase_id', packPurchaseId)
      .order('created_at', { ascending: true });

    if (error || !data) return [];
    return data as InventoryItem[];
  },

  /** Every inventory row for the current user, joined with the comic details. */
  async listMineWithDetails(): Promise<InventoryItemWithDetails[]> {
    const { data, error } = await supabase
      .from('user_inventory')
      .select(`
        *,
        pack_item:pack_items (
          id, comic_title, issue_number, grade, condition, rarity, estimated_value, image_url, quantity
        )
      `)
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data as InventoryItemWithDetails[];
  },
};
