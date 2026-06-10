// useLivestream — top-level livestream state hook.
// Reads the real `livestreams` row + host join from Supabase. Falls back
// to a mock for the demo id 'mock-stream' so the local Phase 2 demo still
// runs without a DB row. URL-param `?state=<status>` overrides whatever
// the DB says, useful for testing pre-show / ended UI against any id.
//
// Consumers read `status` to choose which top-level view to render,
// `scheduledFor` to drive pre-show countdown copy, `posterUrl` for the
// pre-show background, and `host` for the chrome (HostPill etc.).
// Phase 3 will add realtime subscription on the row so the page
// auto-flips to live the moment the host starts the show.

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../../api/supabase/supabaseClient';

export type LivestreamStatus = 'scheduled' | 'preparing' | 'live' | 'ended';

export type LivestreamHost = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
};

export type Livestream = {
  id: string;
  title: string;
  status: LivestreamStatus;
  scheduledFor: string | null;
  posterUrl: string | null;
  host: LivestreamHost;
  /** True until the initial DB fetch resolves. Mock id resolves synchronously. */
  loading: boolean;
};

const MOCK_LIVESTREAM_ID = 'mock-stream';

function mockLivestream(id: string, overrideStatus: LivestreamStatus | null): Livestream {
  const status = overrideStatus ?? 'live';
  return {
    id,
    title: 'Test Pack 1',
    status,
    scheduledFor: status === 'scheduled' ? new Date(Date.now() + 60 * 60 * 1000).toISOString() : null,
    posterUrl: null,
    host: {
      id: 'host-1',
      username: 'dynamixjl',
      displayName: 'Dynamix JL',
      avatarUrl: null,
    },
    loading: false,
  };
}

function normalizeStatus(raw: string | null): LivestreamStatus {
  // DB enum has 'scheduled' | 'preparing' | 'live' | 'ended' | 'aborted'.
  // We collapse 'aborted' → 'ended' for viewer-side purposes.
  if (raw === 'aborted') return 'ended';
  if (raw === 'scheduled' || raw === 'preparing' || raw === 'live' || raw === 'ended') return raw;
  return 'ended';
}

export function useLivestream(livestreamId: string): Livestream {
  const [params] = useSearchParams();
  const stateOverride = params.get('state') as LivestreamStatus | null;
  const validOverride =
    stateOverride === 'scheduled' || stateOverride === 'preparing' ||
    stateOverride === 'live' || stateOverride === 'ended'
      ? stateOverride
      : null;

  // Synchronous mock branch — keeps the local demo flow zero-network.
  const mock = useMemo(
    () => (livestreamId === MOCK_LIVESTREAM_ID ? mockLivestream(livestreamId, validOverride) : null),
    [livestreamId, validOverride],
  );

  const [row, setRow] = useState<Livestream | null>(mock);
  const [loading, setLoading] = useState<boolean>(mock === null);

  useEffect(() => {
    if (mock !== null) {
      setRow(mock);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      // Two queries: the livestream row + the host user. The codebase uses
      // public.users (not profiles), and avoids relational embeds in this
      // table (see hydrateHosts in src/api/livestreams.ts). Two round-trips
      // are fine — this hook runs once per page load.
      const { data: row, error } = await supabase
        .from('livestreams')
        .select('id, title, status, scheduled_start_at, cover_image_url, host_user_id')
        .eq('id', livestreamId)
        .maybeSingle();

      if (cancelled) return;

      if (error || !row) {
        // Row not found OR RLS blocked the SELECT — surface as ended so the
        // page doesn't crash. PreShow won't fire because status !== scheduled.
        if (error) console.warn('[useLivestream] livestream fetch failed', error);
        setRow({
          id: livestreamId,
          title: 'Stream not found',
          status: 'ended',
          scheduledFor: null,
          posterUrl: null,
          host: { id: '', username: 'unknown', displayName: 'Unknown', avatarUrl: null },
          loading: false,
        });
        setLoading(false);
        return;
      }

      const r = row as {
        id: string;
        title: string;
        status: string;
        scheduled_start_at: string | null;
        cover_image_url: string | null;
        host_user_id: string;
      };

      const { data: hostUser } = await supabase
        .from('users')
        .select('id, username, avatar_url')
        .eq('id', r.host_user_id)
        .maybeSingle();

      if (cancelled) return;

      const host = hostUser as {
        id: string;
        username: string | null;
        avatar_url: string | null;
      } | null;

      setRow({
        id: r.id,
        title: r.title,
        status: validOverride ?? normalizeStatus(r.status),
        scheduledFor: r.scheduled_start_at,
        posterUrl: r.cover_image_url,
        host: {
          id: host?.id ?? r.host_user_id,
          username: host?.username ?? 'unknown',
          displayName: host?.username ?? 'Unknown',
          avatarUrl: host?.avatar_url ?? null,
        },
        loading: false,
      });
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [livestreamId, mock, validOverride]);

  // While we wait for the initial fetch, return a loading-flagged stub so
  // LiveStreamView can render a brief blank instead of mounting live hooks
  // against the wrong id.
  if (row === null) {
    return {
      id: livestreamId,
      title: '',
      status: 'preparing',
      scheduledFor: null,
      posterUrl: null,
      host: { id: '', username: '', displayName: '', avatarUrl: null },
      loading: true,
    };
  }

  return { ...row, loading };
}
