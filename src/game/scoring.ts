/** Correct bid: 10 + bid points. Incorrect bid: 0 points. */
export function calculateScore(bid: number, tricksWon: number): number {
  return tricksWon === bid ? 10 + bid : 0;
}

export function calculateRoundScores(
  bids: Record<number, number | undefined>,
  tricksWon: Record<number, number>
): Record<number, number> {
  const scores: Record<number, number> = {};
  for (const idStr of Object.keys(tricksWon)) {
    const id = Number(idStr);
    scores[id] = calculateScore(bids[id] ?? 0, tricksWon[id] ?? 0);
  }
  return scores;
}
