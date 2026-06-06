import { initRound } from "./deck";
import { calculateRoundScores } from "./scoring";
import type { Difficulty, MatchState, RoundResult } from "./types";

export const TOTAL_ROUNDS = 13;

export function initMatch(difficulty: Difficulty): MatchState {
  const dealer = Math.floor(Math.random() * 4);
  return {
    matchPhase: "in-round",
    roundNumber: 1,
    dealer,
    difficulty,
    scores: { 0: 0, 1: 0, 2: 0, 3: 0 },
    roundHistory: [],
    currentRound: initRound(1, dealer),
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

  const newScores: Record<number, number> = { ...match.scores };
  for (const id of [0, 1, 2, 3]) {
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

  const isMatchComplete = match.roundNumber >= TOTAL_ROUNDS;

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
  const nextDealer = (match.dealer + 1) % 4;
  return {
    ...match,
    matchPhase: "in-round",
    roundNumber: nextRound,
    dealer: nextDealer,
    currentRound: initRound(nextRound, nextDealer),
  };
}
