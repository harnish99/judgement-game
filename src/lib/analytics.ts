/**
 * Analytics service — thin wrapper around PostHog.
 *
 * All public functions are safe to call server-side or during SSR:
 * they are no-ops when `window` is not available or when the SDK has
 * not been initialised yet.
 *
 * Usage:
 *   import { track } from "@/lib/analytics";
 *   track("game_started", { difficulty: "medium", playerCount: 4 });
 */

import posthog from "posthog-js";
import type { Difficulty } from "@/game/types";

// ─── Event catalogue ─────────────────────────────────────────────────────────

export interface EventMap {
  game_started: {
    difficulty: Difficulty;
    playerCount: number;
  };
  game_finished: {
    /** Human player's final cumulative score */
    finalScore: number;
    /** 1-based rank of the human player among all players */
    rank: number;
  };
  round_started: {
    roundNumber: number;
    /** Number of cards dealt to each player this round */
    cardsPerPlayer: number;
    trump: string;
  };
  round_completed: {
    roundNumber: number;
    /** Whether the human player hit their bid exactly */
    humanHitBid: boolean;
    humanBid: number;
    humanTricksWon: number;
    humanRoundScore: number;
  };
  bid_submitted: {
    roundNumber: number;
    bid: number;
    cardsPerPlayer: number;
  };
  trick_won: {
    roundNumber: number;
    trickNumber: number;
    /** true when the human (player 0) won the trick */
    byHuman: boolean;
  };
  game_won: {
    finalScore: number;
    totalRounds: number;
  };
  game_lost: {
    finalScore: number;
    rank: number;
    totalRounds: number;
  };
  game_resumed: {
    roundNumber: number;
    playerCount: number;
  };
  saved_game_discarded: {
    /** Round the discarded game was on when the user chose New Game. */
    fromRound: number;
  };
}

export type AnalyticsEvent = keyof EventMap;

// ─── Initialisation ──────────────────────────────────────────────────────────

let _initialised = false;

/**
 * Initialise PostHog exactly once in the browser.
 * Called from PostHogProvider on mount.
 */
export function initAnalytics(): void {
  if (typeof window === "undefined") return;
  if (_initialised) return;

  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

  if (!apiKey) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[analytics] NEXT_PUBLIC_POSTHOG_KEY is not set — tracking disabled.");
    }
    return;
  }

  posthog.init(apiKey, {
    api_host: host,
    // Capture pageviews automatically on route change
    capture_pageview: true,
    // Don't capture clicks / form inputs automatically — be explicit
    autocapture: false,
    // Respect DNT and cookie consent by disabling persistence until opted-in
    persistence: "localStorage+cookie",
    // Disable session recording unless you enable it in the PostHog UI
    disable_session_recording: true,
    // Don't send feature-flag requests on every page (game has none)
    advanced_disable_decide: true,
  });

  _initialised = true;
}

// ─── Core track function ──────────────────────────────────────────────────────

/**
 * Track a named event with strongly-typed properties.
 *
 *   track("game_started", { difficulty: "easy", playerCount: 4 })
 *
 * Safe to call during SSR — silently no-ops.
 */
export function track<E extends AnalyticsEvent>(
  event: E,
  properties: EventMap[E]
): void {
  if (typeof window === "undefined") return;
  if (!_initialised) return;

  posthog.capture(event, properties);
}
