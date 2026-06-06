/**
 * Statistics service — pure functions for loading, saving, and updating
 * lifetime player stats stored in localStorage.
 *
 * Intentionally framework-free: no React imports, no side-effects on import.
 * All mutation goes through `applyGameResult`, `applyRoundResult`, and
 * `applyPerfectBid` — call these from the UI layer and persist the result.
 */

import type { MatchState, RoundResult } from "@/game/types";

// ─── Interface ────────────────────────────────────────────────────────────────

export interface GameStats {
  /** Total number of completed matches. */
  gamesPlayed: number;
  /** Matches where the human player finished 1st. */
  gamesWon: number;
  /** gamesWon / gamesPlayed × 100, or 0 when no games played. */
  winRate: number;
  /** Highest cumulative score achieved across all matches. */
  highestScore: number;
  /** Mean cumulative score across all completed matches. */
  averageScore: number;
  /** Number of rounds where the human exactly matched their bid. */
  perfectBids: number;
  /** Total tricks won by the human across all rounds of all matches. */
  totalTricksWon: number;
  /** Number of consecutive wins ending with the most recent match. */
  currentWinStreak: number;
  /** Longest win streak ever recorded. */
  longestWinStreak: number;
  // Internal — used to recalculate averageScore without storing all scores.
  _totalScore: number;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

export const EMPTY_STATS: GameStats = {
  gamesPlayed: 0,
  gamesWon: 0,
  winRate: 0,
  highestScore: 0,
  averageScore: 0,
  perfectBids: 0,
  totalTricksWon: 0,
  currentWinStreak: 0,
  longestWinStreak: 0,
  _totalScore: 0,
};

// ─── Persistence ──────────────────────────────────────────────────────────────

const STATS_KEY = "judgement-stats-v1";

export function loadStats(): GameStats {
  if (typeof window === "undefined") return { ...EMPTY_STATS };
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return { ...EMPTY_STATS };
    const parsed = JSON.parse(raw) as Partial<GameStats>;
    // Merge with defaults so old saves missing new fields still work.
    return { ...EMPTY_STATS, ...parsed };
  } catch {
    return { ...EMPTY_STATS };
  }
}

export function saveStats(stats: GameStats): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {
    // Storage unavailable — continue silently.
  }
}

export function clearStats(): GameStats {
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(STATS_KEY);
    } catch {}
  }
  return { ...EMPTY_STATS };
}

// ─── Updaters (pure — return a new stats object) ──────────────────────────────

/**
 * Called once when a match reaches "match-complete".
 * Updates gamesPlayed, gamesWon, winRate, highestScore, averageScore,
 * currentWinStreak, longestWinStreak.
 */
export function applyGameResult(
  stats: GameStats,
  match: MatchState
): GameStats {
  const humanScore = match.scores[0] ?? 0;
  const allScores = Object.values(match.scores);
  const maxScore = Math.max(...allScores);
  const humanWon = humanScore === maxScore;

  const gamesPlayed = stats.gamesPlayed + 1;
  const gamesWon = stats.gamesWon + (humanWon ? 1 : 0);
  const winRate = Math.round((gamesWon / gamesPlayed) * 100);
  const _totalScore = stats._totalScore + humanScore;
  const averageScore = Math.round(_totalScore / gamesPlayed);
  const highestScore = Math.max(stats.highestScore, humanScore);
  const currentWinStreak = humanWon ? stats.currentWinStreak + 1 : 0;
  const longestWinStreak = Math.max(stats.longestWinStreak, currentWinStreak);

  return {
    ...stats,
    gamesPlayed,
    gamesWon,
    winRate,
    highestScore,
    averageScore,
    _totalScore,
    currentWinStreak,
    longestWinStreak,
  };
}

/**
 * Called once per round when it completes (phase → "round-result").
 * Updates totalTricksWon and perfectBids.
 */
export function applyRoundResult(
  stats: GameStats,
  result: RoundResult
): GameStats {
  const humanBid = result.bids[0] ?? 0;
  const humanTricks = result.tricksWon[0] ?? 0;
  const isPerfect = humanBid === humanTricks;

  return {
    ...stats,
    totalTricksWon: stats.totalTricksWon + humanTricks,
    perfectBids: stats.perfectBids + (isPerfect ? 1 : 0),
  };
}
