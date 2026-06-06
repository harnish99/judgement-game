/**
 * useAnalytics
 *
 * Thin React hook that re-exports `track` from the analytics service.
 * Using a hook keeps the door open for context-injected overrides in
 * tests (swap the provider to a mock) without changing call-sites.
 *
 * Usage:
 *   const { track } = useAnalytics();
 *   track("bid_submitted", { roundNumber: 3, bid: 2, cardsPerPlayer: 3 });
 */

import { useCallback } from "react";
import { track as _track, type AnalyticsEvent, type EventMap } from "@/lib/analytics";

export function useAnalytics() {
  // Stable reference — wrapping in useCallback so callers can safely list
  // this in dependency arrays without triggering infinite loops.
  const track = useCallback(
    <E extends AnalyticsEvent>(event: E, properties: EventMap[E]) => {
      _track(event, properties);
    },
    []
  );

  return { track };
}
