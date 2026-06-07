import { describe, it, expect } from "vitest";
import {
  maxCardsPerRound,
  totalRounds,
  initMatch,
  finalizeRound,
  startNextRound,
} from "../match";
import type { MatchState, PlayerCount } from "../types";

describe("round count helpers", () => {
  it("computes max cards / total rounds from the deck size", () => {
    const cases: [PlayerCount, number][] = [[3, 17], [4, 13], [5, 10], [6, 8]];
    for (const [players, rounds] of cases) {
      expect(maxCardsPerRound(players)).toBe(rounds);
      expect(totalRounds(players)).toBe(rounds);
    }
  });
});

describe("initMatch", () => {
  it("creates an in-round match with zeroed scores for every seat", () => {
    const m = initMatch("medium", 4);
    expect(m.matchPhase).toBe("in-round");
    expect(m.roundNumber).toBe(1);
    expect(m.playerCount).toBe(4);
    expect(Object.keys(m.scores)).toHaveLength(4);
    expect(Object.values(m.scores).every((s) => s === 0)).toBe(true);
    expect(m.currentRound?.players).toHaveLength(4);
    expect(m.currentRound?.cardsPerPlayer).toBe(1);
  });
});

describe("finalizeRound", () => {
  function inRoundMatch(): MatchState {
    const m = initMatch("medium", 3);
    // Force a deterministic finished round: everyone bid 0, nobody won a trick.
    m.currentRound = {
      ...m.currentRound!,
      phase: "round-complete",
      bids: { 0: 0, 1: 0, 2: 0 },
      tricksWon: { 0: 0, 1: 0, 2: 0 },
      roundScored: false,
    };
    return m;
  }

  it("scores the round once and moves to round-result", () => {
    const done = finalizeRound(inRoundMatch());
    expect(done.matchPhase).toBe("round-result");
    // Everyone hit bid 0 → +10 each
    expect(done.scores).toEqual({ 0: 10, 1: 10, 2: 10 });
    expect(done.roundHistory).toHaveLength(1);
    expect(done.currentRound?.roundScored).toBe(true);
  });

  it("is idempotent — a second call returns the same reference", () => {
    const done = finalizeRound(inRoundMatch());
    const again = finalizeRound(done);
    expect(again).toBe(done);
  });

  it("marks the match complete on the final round", () => {
    const m = inRoundMatch();
    m.roundNumber = totalRounds(3); // last round
    const done = finalizeRound(m);
    expect(done.matchPhase).toBe("match-complete");
  });
});

describe("startNextRound", () => {
  it("advances round number, rotates dealer, and deals more cards", () => {
    const m = initMatch("easy", 4);
    const next = startNextRound(m);
    expect(next.roundNumber).toBe(2);
    expect(next.dealer).toBe((m.dealer + 1) % 4);
    expect(next.currentRound?.cardsPerPlayer).toBe(2);
    expect(next.matchPhase).toBe("in-round");
  });
});
