// src/components/creatorHub/composer/uploadPhoto.ts
//
// Shared upload helper for the Go Live composer's photos. Converts the
// PhotoEditor's data URL into a Blob and uploads it to the
// `user-uploads` bucket under a per-user path. Returns the public URL
// (or null if there's no photo to upload).
//
// Storage RLS:
//   - `livestream-thumbnails/{user_id}/...` was added in Phase 1
//     migration 20260604050000_livestream_thumbnails_storage.sql
//   - `livestream-items/{user_id}/...` uses the same pattern; if RLS
//     for this path doesn't exist yet, the upload will 403 and this
//     returns null with a console warning rather than throwing (Step 3
//     of the composer is non-blocking — the show still publishes
//     without the photo)

import { supabase } from '../../../api/supabase/supabaseClient';

const BUCKET = 'user-uploads';

function dataUrlToBlob(dataUrl: string): { blob: Blob; ext: string } | null {
  const m = /^data:(image\/[a-zA-Z+]+);base64,(.+)$/.exec(dataUrl);
  if (!m) return null;
  const mime = m[1];
  const ext = (mime.split('/')[1] || 'jpg').replace('+xml', '').toLowerCase();
  const bin = atob(m[2]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return { blob: new Blob([bytes], { type: mime }), ext };
}

export async function uploadComposerPhoto(
  dataUrl: string,
  userId: string,
  pathPrefix: 'livestream-thumbnails' | 'livestream-items',
): Promise<string | null> {
  if (!dataUrl || !dataUrl.startsWith('data:')) {
    // Already a public URL (or empty). Pass through.
    return dataUrl || null;
  }
  const parts = dataUrlToBlob(dataUrl);
  if (!parts) return null;
  const path = `${pathPrefix}/${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${parts.ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, parts.blob, {
    contentType: parts.blob.type,
    cacheControl: '3600',
    upsert: false,
  });
  if (error) {
    console.warn('[uploadComposerPhoto] failed', { path, error });
    return null;
  }
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
