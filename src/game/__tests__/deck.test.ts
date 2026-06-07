import { describe, it, expect } from "vitest";
import { createDeck, shuffleDeck, initRound } from "../deck";
import type { PlayerCount } from "../types";

describe("createDeck", () => {
  it("produces 52 unique cards", () => {
    const deck = createDeck();
    expect(deck).toHaveLength(52);
    const keys = new Set(deck.map((c) => `${c.suit}-${c.rank}`));
    expect(keys.size).toBe(52);
  });
});

describe("shuffleDeck", () => {
  it("preserves all cards (no loss or duplication)", () => {
    const deck = createDeck();
    const shuffled = shuffleDeck(deck);
    expect(shuffled).toHaveLength(52);
    expect(new Set(shuffled.map((c) => `${c.suit}-${c.rank}`)).size).toBe(52);
  });

  it("does not mutate the input deck", () => {
    const deck = createDeck();
    const copy = JSON.stringify(deck);
    shuffleDeck(deck);
    expect(JSON.stringify(deck)).toBe(copy);
  });
});

describe("initRound", () => {
  it.each([3, 4, 5, 6] as PlayerCount[])(
    "deals N cards to each of %i players in round N",
    (playerCount) => {
      const round = initRound(3, 0, playerCount);
      expect(round.players).toHaveLength(playerCount);
      for (const p of round.players) {
        expect(p.hand).toHaveLength(3);
      }
      expect(round.cardsPerPlayer).toBe(3);
    }
  );

  it("marks only player 0 as human and starts in the bidding phase", () => {
    const round = initRound(1, 0, 4);
    expect(round.players[0].isHuman).toBe(true);
    expect(round.players.slice(1).every((p) => !p.isHuman)).toBe(true);
    expect(round.phase).toBe("bidding");
  });

  it("orders bidding left of the dealer with the dealer last", () => {
    const round = initRound(2, 1, 4); // dealer = 1
    expect(round.bidOrder).toEqual([2, 3, 0, 1]);
    expect(round.bidOrder[round.bidOrder.length - 1]).toBe(1);
  });

  it("initialises bids as undefined and tricksWon as 0 for every seat", () => {
    const round = initRound(1, 0, 3);
    expect(round.bids).toEqual({ 0: undefined, 1: undefined, 2: undefined });
    expect(round.tricksWon).toEqual({ 0: 0, 1: 0, 2: 0 });
  });
});
