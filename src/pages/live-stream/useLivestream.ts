// useLivestream — top-level livestream state hook.
// Phase 2: pure mock with URL-param opt-in for pre-show testing.
// Phase 3: rewrite against `livestreams` table from Supabase.
//
// Usage:
//   /live/<id>                  → mocked live state (existing Phase 2 demo)
//   /live/<id>?state=scheduled  → pre-show state (today + 1 hour from now)
//   /live/<id>?state=ended      → ended state (Phase 2 reuses live; ended UI is Phase 3+)
//
// The shape is intentionally minimal (Phase-3 contract): consumers read
// `status` to choose which top-level view to render, `scheduledFor` to drive
// pre-show countdown copy, `posterUrl` for the pre-show background, and
// `host` for the chrome (HostPill etc.). Phase 3 swaps the body of this
// hook to a Supabase query + realtime subscription on the `livestreams` row.

import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

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
  scheduledFor: string | null;  // ISO; null when not scheduled
  posterUrl: string | null;     // thumbnail/branded artwork
  host: LivestreamHost;
};

export function useLivestream(livestreamId: string): Livestream {
  const [params] = useSearchParams();
  const stateOverride = params.get('state') as LivestreamStatus | null;

  return useMemo(() => {
    const status: LivestreamStatus = stateOverride ?? 'live';
    const scheduledFor =
      status === 'scheduled'
        ? new Date(Date.now() + 60 * 60 * 1000).toISOString()  // 1 hour from now
        : null;
    return {
      id: livestreamId,
      title: 'Test Pack 1',
      status,
      scheduledFor,
      posterUrl: null,  // Phase 3 reads livestreams.thumbnail_url
      host: {
        id: 'host-1',
        username: 'dynamixjl',
        displayName: 'Dynamix JL',
        avatarUrl: null,
      },
    };
  }, [livestreamId, stateOverride]);
}
