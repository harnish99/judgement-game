import { describe, it, expect } from "vitest";
import {
  determineTrickWinner,
  getValidCardIndices,
  sortHand,
  playCard,
  startNextTrick,
  RANK_ORDER,
} from "../trick";
import type { Card, GameState, TrickCard } from "../types";

const C = (suit: Card["suit"], rank: Card["rank"]): Card => ({ suit, rank });

describe("determineTrickWinner", () => {
  it("highest card of the lead suit wins when no trump played", () => {
    const trick: TrickCard[] = [
      { card: C("hearts", "5"), playerId: 0 },
      { card: C("hearts", "K"), playerId: 1 },
      { card: C("hearts", "9"), playerId: 2 },
    ];
    expect(determineTrickWinner(trick, "spades")).toBe(1);
  });

  it("trump beats any non-trump regardless of rank", () => {
    const trick: TrickCard[] = [
      { card: C("hearts", "A"), playerId: 0 },
      { card: C("spades", "2"), playerId: 1 }, // low trump
    ];
    expect(determineTrickWinner(trick, "spades")).toBe(1);
  });

  it("highest trump wins when several are played", () => {
    const trick: TrickCard[] = [
      { card: C("spades", "Q"), playerId: 0 },
      { card: C("spades", "A"), playerId: 1 },
      { card: C("spades", "J"), playerId: 2 },
    ];
    expect(determineTrickWinner(trick, "spades")).toBe(1);
  });

  it("off-suit non-trump cards cannot win", () => {
    const trick: TrickCard[] = [
      { card: C("hearts", "3"), playerId: 0 }, // lead
      { card: C("diamonds", "A"), playerId: 1 }, // off-suit, not trump
    ];
    expect(determineTrickWinner(trick, "spades")).toBe(0);
  });
});

describe("getValidCardIndices", () => {
  const hand = [C("hearts", "5"), C("spades", "K"), C("hearts", "9")];

  it("returns all indices when leading (no lead suit)", () => {
    expect(getValidCardIndices(hand, null)).toEqual([0, 1, 2]);
  });

  it("forces following suit when the player holds it", () => {
    expect(getValidCardIndices(hand, "hearts")).toEqual([0, 2]);
  });

  it("allows any card when the player cannot follow suit", () => {
    expect(getValidCardIndices(hand, "diamonds")).toEqual([0, 1, 2]);
  });
});

describe("sortHand", () => {
  it("groups by suit then orders by rank ascending", () => {
    const sorted = sortHand([C("clubs", "2"), C("spades", "A"), C("spades", "3")]);
    expect(sorted[0]).toEqual(C("spades", "3"));
    expect(sorted[1]).toEqual(C("spades", "A"));
    expect(sorted[2]).toEqual(C("clubs", "2"));
  });
});

describe("RANK_ORDER", () => {
  it("orders 2 lowest and Ace highest", () => {
    expect(RANK_ORDER["2"]).toBeLessThan(RANK_ORDER["A"]);
    expect(RANK_ORDER["K"]).toBeLessThan(RANK_ORDER["A"]);
    expect(RANK_ORDER["10"]).toBeLessThan(RANK_ORDER["J"]);
  });
});

describe("playCard", () => {
  function baseState(): GameState {
    return {
      players: [
        { id: 0, name: "You", isHuman: true, hand: [C("hearts", "A")] },
        { id: 1, name: "P1", isHuman: false, hand: [C("hearts", "5")] },
      ],
      trumpCard: C("spades", "A"),
      trump: "spades",
      cardsPerPlayer: 1,
      dealer: 0,
      bidOrder: [1, 0],
      biddingTurnIndex: 2,
      bids: { 0: 1, 1: 0 },
      currentTrick: [],
      trickLeader: 0,
      currentTurn: 0,
      tricksWon: { 0: 0, 1: 0 },
      phase: "playing",
      trickNumber: 1,
      lastTrickWinner: null,
      roundScored: false,
    };
  }

  it("advances turn to next player when the trick is incomplete", () => {
    const next = playCard(baseState(), 0, 0);
    expect(next.currentTrick).toHaveLength(1);
    expect(next.currentTurn).toBe(1);
    expect(next.players[0].hand).toHaveLength(0);
    expect(next.phase).toBe("playing");
  });

  it("resolves the trick and credits the winner when complete", () => {
    let s = baseState();
    s = playCard(s, 0, 0); // You play A♥
    s = playCard(s, 1, 0); // P1 plays 5♥
    expect(s.tricksWon[0]).toBe(1);
    expect(s.lastTrickWinner).toBe(0);
    // 1-card round → trick exhausts the round
    expect(s.phase).toBe("round-complete");
  });
});

describe("startNextTrick", () => {
  it("clears the current trick and returns to playing", () => {
    const next = startNextTrick({
      currentTrick: [{ card: C("hearts", "2"), playerId: 0 }],
      phase: "between-tricks",
    } as unknown as GameState);
    expect(next.currentTrick).toEqual([]);
    expect(next.phase).toBe("playing");
  });
});
