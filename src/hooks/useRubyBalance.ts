import { useRubyBalanceContext } from '../contexts/RubyBalanceContext';

/**
 * Returns the live Ruby balance for the current user. Backed by a single
 * RubyBalanceProvider mounted in AppLayout — all callers share the same
 * subscription and state. Includes a manual refresh() for callers that just
 * mutated the balance and want to force a refetch instead of waiting for
 * the realtime channel.
 */
export function useRubyBalance() {
  return useRubyBalanceContext();
}
