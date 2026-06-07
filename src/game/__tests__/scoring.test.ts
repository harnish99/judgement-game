import { describe, it, expect } from "vitest";
import { calculateScore, calculateRoundScores } from "../scoring";

describe("calculateScore", () => {
  it("awards 10 + bid when the bid is met exactly", () => {
    expect(calculateScore(0, 0)).toBe(10);
    expect(calculateScore(3, 3)).toBe(13);
    expect(calculateScore(7, 7)).toBe(17);
  });

  it("awards 0 when tricks won does not equal bid", () => {
    expect(calculateScore(2, 1)).toBe(0);
    expect(calculateScore(2, 3)).toBe(0);
    expect(calculateScore(0, 1)).toBe(0);
  });
});

describe("calculateRoundScores", () => {
  it("scores every player keyed by id", () => {
    const bids = { 0: 1, 1: 2, 2: 0 };
    const tricksWon = { 0: 1, 1: 0, 2: 0 };
    expect(calculateRoundScores(bids, tricksWon)).toEqual({
      0: 11, // hit bid 1
      1: 0, // missed
      2: 10, // hit bid 0
    });
  });

  it("treats a missing bid as 0", () => {
    const bids: Record<number, number | undefined> = { 0: undefined };
    const tricksWon = { 0: 0 };
    expect(calculateRoundScores(bids, tricksWon)).toEqual({ 0: 10 });
  });

  it("only scores players present in tricksWon", () => {
    const scores = calculateRoundScores({ 0: 1, 1: 1 }, { 0: 1 });
    expect(Object.keys(scores)).toEqual(["0"]);
  });
});
