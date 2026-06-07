import { describe, it, expect } from "vitest";
import { getForbiddenBid, placeBid } from "../bidding";
import type { GameState } from "../types";

// Minimal GameState factory focused on the bidding fields.
function makeState(over: Partial<GameState> = {}): GameState {
  return {
    players: [],
    trumpCard: { suit: "spades", rank: "A" },
    trump: "spades",
    cardsPerPlayer: 3,
    dealer: 0,
    bidOrder: [1, 2, 3, 0],
    biddingTurnIndex: 0,
    bids: { 0: undefined, 1: undefined, 2: undefined, 3: undefined },
    currentTrick: [],
    trickLeader: 1,
    currentTurn: 1,
    tricksWon: { 0: 0, 1: 0, 2: 0, 3: 0 },
    phase: "bidding",
    trickNumber: 1,
    lastTrickWinner: null,
    roundScored: false,
    ...over,
  };
}

describe("getForbiddenBid", () => {
  it("returns null for non-final bidders", () => {
    expect(getForbiddenBid(makeState({ biddingTurnIndex: 0 }))).toBeNull();
    expect(getForbiddenBid(makeState({ biddingTurnIndex: 2 }))).toBeNull();
  });

  it("forbids the value that makes total bids equal cardsPerPlayer", () => {
    // 3 cards, prior bids 1 + 1 + 0 = 2 → forbidden is 1 (would total 3)
    const state = makeState({
      cardsPerPlayer: 3,
      biddingTurnIndex: 3, // last bidder (dealer, id 0)
      bids: { 1: 1, 2: 1, 3: 0, 0: undefined },
    });
    expect(getForbiddenBid(state)).toBe(1);
  });

  it("returns null when the forbidden bid would be out of range", () => {
    // prior bids already exceed cardsPerPlayer → forbidden negative → null
    const state = makeState({
      cardsPerPlayer: 3,
      biddingTurnIndex: 3,
      bids: { 1: 2, 2: 2, 3: 0, 0: undefined },
    });
    expect(getForbiddenBid(state)).toBeNull();
  });
});

describe("placeBid", () => {
  it("records the bid for the current bidder and advances the turn", () => {
    const next = placeBid(makeState(), 2);
    expect(next.bids[1]).toBe(2); // bidOrder[0] === 1
    expect(next.biddingTurnIndex).toBe(1);
    expect(next.phase).toBe("bidding");
  });

  it("transitions to bid-summary once the last bid is placed", () => {
    const state = makeState({
      biddingTurnIndex: 3,
      bids: { 1: 1, 2: 1, 3: 0, 0: undefined },
    });
    const next = placeBid(state, 0);
    expect(next.bids[0]).toBe(0);
    expect(next.biddingTurnIndex).toBe(4);
    expect(next.phase).toBe("bid-summary");
  });

  it("does not mutate the input state", () => {
    const state = makeState();
    const before = JSON.stringify(state);
    placeBid(state, 1);
    expect(JSON.stringify(state)).toBe(before);
  });
});
