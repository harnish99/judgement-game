import { describe, it, expect } from "vitest";
import { totalRounds, maxCardsPerRound, initMatch, finalizeRound, startNextRound } from "@/game/match";
import type { PlayerCount } from "@/game/types";

// The single source of truth the whole app derives round counts from:
//   maxRounds = min(12, floor(52 / playerCount))
// Spec: 2p→12, 3p→12, 4p→12, 5p→10, 6p→8.
const EXPECTED_ROUNDS: Record<PlayerCount, number> = {
  2: 12,
  3: 12,
  4: 12,
  5: 10,
  6: 8,
};

const ALL_COUNTS = [2, 3, 4, 5, 6] as const;

describe("round-count formula", () => {
  it.each(ALL_COUNTS)("totalRounds(%i) matches the spec table", (count) => {
    expect(totalRounds(count)).toBe(EXPECTED_ROUNDS[count]);
  });

  it.each(ALL_COUNTS)("totalRounds(%i) === min(12, floor(52/count))", (count) => {
    expect(totalRounds(count)).toBe(Math.min(12, Math.floor(52 / count)));
  });

  it.each(ALL_COUNTS)("never exceeds the 12-round ceiling for %i players", (count) => {
    expect(totalRounds(count)).toBeLessThanOrEqual(12);
  });

  it.each(ALL_COUNTS)("maxCardsPerRound(%i) equals totalRounds(%i)", (count) => {
    // Rounds escalate 1 card → … → maxCardsPerRound cards, so the two must agree.
    expect(maxCardsPerRound(count)).toBe(totalRounds(count));
  });

  it.each(ALL_COUNTS)("final round deals a hand that fits in a 52-card deck (%i players)", (count) => {
    // Last round deals `totalRounds` cards to each of `count` players.
    expect(totalRounds(count) * count).toBeLessThanOrEqual(52);
  });
});

/**
 * Drives a match from round 1 to completion (scoring each round and dealing the
 * next) to prove the *progression* — not just the formula — produces exactly the
 * expected number of rounds for every supported player count.
 */
function playToCompletion(playerCount: PlayerCount) {
  let match = initMatch("easy", playerCount);
  let roundsPlayed = 0;

  for (let guard = 0; guard < 200; guard++) {
    match = finalizeRound(match);
    roundsPlayed++;
    if (match.matchPhase === "match-complete") break;
    match = startNextRound(match);
  }

  return {
    roundsPlayed,
    finalRoundNumber: match.roundNumber,
    finalCardsPerPlayer: match.currentRound!.cardsPerPlayer,
    matchPhase: match.matchPhase,
  };
}

describe("match progression", () => {
  it.each(ALL_COUNTS)("plays exactly totalRounds rounds for %i players", (count) => {
    const result = playToCompletion(count);
    const expected = EXPECTED_ROUNDS[count];

    expect(result.matchPhase).toBe("match-complete");
    expect(result.roundsPlayed).toBe(expected);
    expect(result.finalRoundNumber).toBe(expected);
    // The last round deals `expected` cards to each player.
    expect(result.finalCardsPerPlayer).toBe(expected);
  });

  it.each(ALL_COUNTS)("seats exactly %i players via initMatch", (count) => {
    const match = initMatch("easy", count);
    expect(match.playerCount).toBe(count);
    expect(match.currentRound!.players).toHaveLength(count);
    expect(Object.keys(match.scores)).toHaveLength(count);
  });
});
