// scripts/end-stale-livestreams.mjs
//
// Marks livestream rows status='aborted' when they've been 'live' for >2h
// without any chat activity in the last 30min. Run on a schedule (e.g. every
// 15min in production). Manually for now: `node scripts/end-stale-livestreams.mjs`
//
// Hosts can crash, close tabs, or lose network — leaving status='live' rows
// that aren't actually live. This cron sweeps them so /live doesn't show
// ghosts.

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
);

async function main() {
  // Find live streams started >2h ago
  const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  const { data: candidates } = await supabase
    .from('livestreams')
    .select('id, host_user_id, started_at')
    .eq('status', 'live')
    .lt('started_at', cutoff);

  if (!candidates || candidates.length === 0) {
    console.log('No stale streams.');
    return;
  }

  for (const s of candidates) {
    // Check last chat activity
    const { data: recent } = await supabase
      .from('livestream_chat')
      .select('created_at')
      .eq('livestream_id', s.id)
      .order('created_at', { ascending: false })
      .limit(1);
    const lastChat = recent?.[0]?.created_at;
    const stillActive = lastChat && Date.now() - new Date(lastChat).getTime() < 30 * 60 * 1000;
    if (stillActive) continue;

    await supabase
      .from('livestreams')
      .update({ status: 'aborted', ended_at: new Date().toISOString() })
      .eq('id', s.id);
    console.log(`Aborted stale stream ${s.id} (host ${s.host_user_id})`);
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
