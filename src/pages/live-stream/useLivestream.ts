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
      const { data, error } = await supabase
        .from('livestreams')
        .select('id, title, status, scheduled_start_at, cover_image_url, host:profiles!host_user_id(id, username, display_name, avatar_url)')
        .eq('id', livestreamId)
        .maybeSingle();

      if (cancelled) return;

      if (error || !data) {
        // Row not found — surface as ended so the page doesn't render a
        // broken live state. PreShow won't fire because status !== scheduled.
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

      // Supabase types the FK-join as an array even when the relation is 1-1;
      // normalize to a single host or null.
      const raw = data as unknown as {
        id: string;
        title: string;
        status: string;
        scheduled_start_at: string | null;
        cover_image_url: string | null;
        host:
          | { id: string; username: string | null; display_name: string | null; avatar_url: string | null }
          | Array<{ id: string; username: string | null; display_name: string | null; avatar_url: string | null }>
          | null;
      };
      const hostObj = Array.isArray(raw.host) ? raw.host[0] ?? null : raw.host;
      const r = { ...raw, host: hostObj };

      setRow({
        id: r.id,
        title: r.title,
        status: validOverride ?? normalizeStatus(r.status),
        scheduledFor: r.scheduled_start_at,
        posterUrl: r.cover_image_url,
        host: {
          id: r.host?.id ?? '',
          username: r.host?.username ?? 'unknown',
          displayName: r.host?.display_name ?? r.host?.username ?? 'Unknown',
          avatarUrl: r.host?.avatar_url ?? null,
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
