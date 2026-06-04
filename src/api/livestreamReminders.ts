// src/api/livestreamReminders.ts
//
// Persistence layer for the "Remind me" toggle on scheduled livestream
// cards (Coming Up section). UI here, delivery later: a separate
// edge fn will read the table on a cron and email/push the viewer when
// their reminded stream is about to go live.

import { supabase } from './supabase/supabaseClient';

export interface LivestreamReminder {
  id: string;
  user_id: string;
  livestream_id: string;
  created_at: string;
  notified_at: string | null;
}

export const livestreamRemindersAPI = {
  /** Returns the auth user's full set of reminders (used to hydrate the
   *  toggle state of every visible Coming Up card in one round-trip). */
  async listMine(): Promise<LivestreamReminder[]> {
    const { data, error } = await supabase
      .from('livestream_reminders')
      .select('*');
    if (error || !data) return [];
    return data as LivestreamReminder[];
  },

  /** Idempotent: re-inserting a (user, stream) pair is a no-op because of
   *  the UNIQUE constraint. Caller can optimistically flip UI then call. */
  async setReminder(livestreamId: string): Promise<{ ok: true } | { ok: false; reason: string }> {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) return { ok: false, reason: 'not_signed_in' };
    const { error } = await supabase
      .from('livestream_reminders')
      .upsert(
        { user_id: authData.user.id, livestream_id: livestreamId },
        { onConflict: 'user_id,livestream_id', ignoreDuplicates: true },
      );
    if (error) return { ok: false, reason: error.message };
    return { ok: true };
  },

  /** Idempotent: deleting a row that doesn't exist is a no-op. */
  async clearReminder(livestreamId: string): Promise<{ ok: true } | { ok: false; reason: string }> {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) return { ok: false, reason: 'not_signed_in' };
    const { error } = await supabase
      .from('livestream_reminders')
      .delete()
      .eq('user_id', authData.user.id)
      .eq('livestream_id', livestreamId);
    if (error) return { ok: false, reason: error.message };
    return { ok: true };
  },
};
