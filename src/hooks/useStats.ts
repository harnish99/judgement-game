"use client";

/**
 * useStats
 *
 * Loads stats from localStorage on mount, exposes helpers to record
 * game/round outcomes, and re-renders subscribers when stats change.
 *
 * Usage:
 *   const { stats, recordGame, recordRound, resetStats } = useStats();
 */

import { useCallback, useEffect, useState } from "react";
import {
  applyGameResult,
  applyRoundResult,
  clearStats,
  EMPTY_STATS,
  loadStats,
  saveStats,
  type GameStats,
} from "@/lib/stats";
import type { MatchState, RoundResult } from "@/game/types";

export function useStats() {
  const [stats, setStats] = useState<GameStats>(EMPTY_STATS);

  // Hydrate from localStorage after mount (avoids SSR mismatch).
  useEffect(() => {
    setStats(loadStats());
  }, []);

  const persist = useCallback((updated: GameStats) => {
    saveStats(updated);
    setStats(updated);
  }, []);

  /** Call once when matchPhase transitions to "match-complete". */
  const recordGame = useCallback(
    (match: MatchState) => {
      setStats((prev) => {
        const updated = applyGameResult(prev, match);
        saveStats(updated);
        return updated;
      });
    },
    []
  );

  /** Call once per round when it completes. */
  const recordRound = useCallback(
    (result: RoundResult) => {
      setStats((prev) => {
        const updated = applyRoundResult(prev, result);
        saveStats(updated);
        return updated;
      });
    },
    []
  );

  /** Wipe all stats and reset to zero. */
  const resetStats = useCallback(() => {
    persist(clearStats());
  }, [persist]);

  return { stats, recordGame, recordRound, resetStats };
}
