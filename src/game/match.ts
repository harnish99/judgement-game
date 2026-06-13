import { initRound } from "./deck";
import { calculateRoundScores } from "./scoring";
import type { Difficulty, MatchState, PlayerCount, RoundResult } from "./types";

// ─── Round / match constants ──────────────────────────────────────────────────

/**
 * Hard ceiling on how many rounds any match (solo or multiplayer) will play,
 * regardless of player count. Without this, low player counts deal a card per
 * round all the way up to `floor(52/playerCount)` — e.g. 26 rounds for 2
 * players, 17 for 3, or 13 for 4 — which runs far longer than a typical
 * session (especially live multiplayer). Higher player counts are naturally
 * shorter (10 rounds for 5 players, 8 for 6) and stay unaffected by this cap.
 */
const MAX_ROUNDS = 12;

/** Maximum cards dealt per player in a game with `playerCount` players. */
export function maxCardsPerRound(playerCount: PlayerCount): number {
  return Math.min(Math.floor(52 / playerCount), MAX_ROUNDS);
}

/**
 * Total number of rounds in a match.
 * Rounds go 1 card → 2 cards → … → maxCardsPerRound cards, capped at
 * `MAX_ROUNDS` (12) so low player counts don't produce marathon matches.
 */
export function totalRounds(playerCount: PlayerCount): number {
  return Math.min(Math.floor(52 / playerCount), MAX_ROUNDS);
}

// ─── Match lifecycle ──────────────────────────────────────────────────────────

export function initMatch(
  difficulty: Difficulty,
  playerCount: PlayerCount = 4
): MatchState {
  const dealer = Math.floor(Math.random() * playerCount);
  const scores: Record<number, number> = {};
  for (let i = 0; i < playerCount; i++) scores[i] = 0;

  return {
    matchPhase: "in-round",
    roundNumber: 1,
    dealer,
    difficulty,
    playerCount,
    scores,
    roundHistory: [],
    currentRound: initRound(1, dealer, playerCount),
  };
}

/**
 * Scores the completed round exactly once and advances matchPhase.
 *
 * The `roundScored` flag on GameState is the single source of truth that
 * prevents duplicate execution. If the flag is already set we return the
 * *exact same object reference* so React bails out of setMatch without a
 * re-render, which stops the useEffect([match]) loop from re-firing.
 */
export function finalizeRound(match: MatchState): MatchState {
  const round = match.currentRound;

  // Guard: return the unchanged reference so React does not re-render.
  if (!round || round.roundScored) return match;

  console.log("Round finalized");

  const roundScores = calculateRoundScores(round.bids, round.tricksWon);
  const playerIds = round.players.map((p) => p.id);

  const newScores: Record<number, number> = { ...match.scores };
  for (const id of playerIds) {
    const earned = roundScores[id] ?? 0;
    if (earned > 0) {
      const player = round.players.find((p) => p.id === id)!;
      console.log("Awarding score to:", player.name, "(+" + earned + ")");
    }
    newScores[id] = (match.scores[id] ?? 0) + earned;
  }

  const result: RoundResult = {
    roundNumber: match.roundNumber,
    cardsPerPlayer: round.cardsPerPlayer,
    bids: round.bids as Record<number, number>,
    tricksWon: round.tricksWon,
    roundScores,
  };

  const isMatchComplete = match.roundNumber >= totalRounds(match.playerCount);

  return {
    ...match,
    matchPhase: isMatchComplete ? "match-complete" : "round-result",
    scores: newScores,
    roundHistory: [...match.roundHistory, result],
    // Mark the round as scored so any subsequent calls are no-ops.
    currentRound: { ...round, roundScored: true },
  };
}

/** Advances dealer, increments roundNumber, deals the next round. */
export function startNextRound(match: MatchState): MatchState {
  const nextRound = match.roundNumber + 1;
  const nextDealer = (match.dealer + 1) % match.playerCount;
  return {
    ...match,
    matchPhase: "in-round",
    roundNumber: nextRound,
    dealer: nextDealer,
    currentRound: initRound(nextRound, nextDealer, match.playerCount),
  };
}
