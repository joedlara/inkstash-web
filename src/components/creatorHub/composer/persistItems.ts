// src/components/creatorHub/composer/persistItems.ts
//
// Persist composer items to the database AFTER the livestream row
// exists. For each ComposerItem:
//   1. Upload the photo (if set) to user-uploads/livestream-items/{uid}/
//   2. Insert a row into `listings` as status='draft' (so the lot doesn't
//      show in /marketplace — RLS in 20260604070000 lets viewers see
//      draft listings that are featured in a live/preparing stream)
//   3. Insert a row into `livestream_items` tying that listing to the
//      stream at the composer's position
//
// Resilient on photo upload failure — the listing still gets created
// without photos (better than dropping the whole publish). Resilient on
// per-row insert failure — logs the failure and keeps going; the
// remaining rows still land.

import { supabase } from '../../../api/supabase/supabaseClient';
import type { ComposerItem } from './types';
import { uploadComposerPhoto } from './uploadPhoto';

export async function persistComposerItems({
  items, livestreamId, userId,
}: {
  items: ComposerItem[];
  livestreamId: string;
  userId: string;
}): Promise<{ created: number; failed: number }> {
  let created = 0;
  let failed = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    // 1. Upload photo (best-effort)
    let photoUrl: string | null = null;
    if (item.photo.src) {
      photoUrl = await uploadComposerPhoto(item.photo.src, userId, 'livestream-items');
    }

    // 2. Insert listing
    const { data: listing, error: listingErr } = await supabase
      .from('listings')
      .insert({
        user_id: userId,
        title: item.name,
        buy_now_price: item.start || null,
        // Listings.photos is jsonb. Mirror the existing shape used by
        // the marketplace ({ url } per entry).
        photos: photoUrl ? [{ url: photoUrl }] : [],
        status: 'draft',
      })
      .select('id')
      .single();

    if (listingErr || !listing) {
      console.warn('[persistComposerItems] listing insert failed', { item, listingErr });
      failed++;
      continue;
    }

    // 3. Insert livestream_items row at the composer's position
    const { error: liErr } = await supabase
      .from('livestream_items')
      .insert({
        livestream_id: livestreamId,
        listing_id: (listing as { id: string }).id,
        position: i,
        status: 'queued',
      });

    if (liErr) {
      console.warn('[persistComposerItems] livestream_items insert failed', { item, liErr });
      failed++;
      continue;
    }
    created++;
  }

  return { created, failed };
}
