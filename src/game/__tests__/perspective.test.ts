import { describe, it, expect } from "vitest";
import { applyPerspective } from "../perspective";
import type { Card, MatchState } from "../types";

const C = (suit: Card["suit"], rank: Card["rank"]): Card => ({ suit, rank });

function makeMatch(): MatchState {
  return {
    matchPhase: "in-round",
    roundNumber: 1,
    dealer: 0,
    difficulty: "medium",
    playerCount: 3,
    scores: { 0: 10, 1: 20, 2: 30 },
    roundHistory: [],
    currentRound: {
      players: [
        { id: 0, name: "Alice", isHuman: true, hand: [C("hearts", "A")] },
        { id: 1, name: "Bob", isHuman: false, hand: [C("spades", "K")] },
        { id: 2, name: "Carol", isHuman: false, hand: [C("clubs", "2")] },
      ],
      trumpCard: C("spades", "A"),
      trump: "spades",
      cardsPerPlayer: 1,
      dealer: 0,
      bidOrder: [1, 2, 0],
      biddingTurnIndex: 0,
      bids: { 0: 1, 1: 0, 2: 0 },
      currentTrick: [{ card: C("spades", "K"), playerId: 1 }],
      trickLeader: 1,
      currentTurn: 2,
      tricksWon: { 0: 0, 1: 0, 2: 0 },
      phase: "playing",
      trickNumber: 1,
      lastTrickWinner: null,
      roundScored: false,
    },
  };
}

describe("applyPerspective", () => {
  it("leaves global ids unchanged for player 0 but still sets isHuman", () => {
    const m = applyPerspective(makeMatch(), 0);
    const me = m.currentRound!.players.find((p) => p.id === 0)!;
    expect(me.isHuman).toBe(true);
    expect(me.name).toBe("Alice");
    expect(m.scores).toEqual({ 0: 10, 1: 20, 2: 30 });
  });

  it("remaps so the viewing player becomes id 0", () => {
    const m = applyPerspective(makeMatch(), 1); // Bob's view
    const me = m.currentRound!.players.find((p) => p.id === 0)!;
    expect(me.name).toBe("Bob");
    expect(me.isHuman).toBe(true);
    // Only one human in any perspective
    expect(m.currentRound!.players.filter((p) => p.isHuman)).toHaveLength(1);
  });

  it("remaps scores so the viewer's score lands on key 0", () => {
    const m = applyPerspective(makeMatch(), 2); // Carol, global score 30
    expect(m.scores[0]).toBe(30);
  });

  it("remaps trick playerIds, currentTurn and bidOrder consistently", () => {
    const m = applyPerspective(makeMatch(), 1); // shift by -1 mod 3
    const r = m.currentRound!;
    // global currentTurn 2 → local (2 - 1) = 1
    expect(r.currentTurn).toBe(1);
    // global trick by player 1 → local 0
    expect(r.currentTrick[0].playerId).toBe(0);
    // global bidOrder [1,2,0] → [0,1,2]
    expect(r.bidOrder).toEqual([0, 1, 2]);
  });

  it("is reversible: applying the inverse restores ids", () => {
    const original = makeMatch();
    const shifted = applyPerspective(original, 1);
    // shifting Bob's view back by his id should restore global scores set
    const restored = applyPerspective(shifted, (3 - 1) % 3); // inverse shift
    expect(restored.scores).toEqual(original.scores);
  });
});
