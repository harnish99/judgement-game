import type { GameState } from "./types";

/**
 * The last bidder cannot bid the value that would make total bids equal cardsPerPlayer.
 * Returns that forbidden number, or null for all other bidders.
 */
export function getForbiddenBid(state: GameState): number | null {
  const { bidOrder, biddingTurnIndex, bids, cardsPerPlayer } = state;
  if (biddingTurnIndex !== bidOrder.length - 1) return null;

  const placedTotal = bidOrder
    .slice(0, biddingTurnIndex)
    .reduce((sum, id) => sum + (bids[id] ?? 0), 0);

  const forbidden = cardsPerPlayer - placedTotal;
  return forbidden >= 0 && forbidden <= cardsPerPlayer ? forbidden : null;
}

export function placeBid(state: GameState, bid: number): GameState {
  const { bidOrder, biddingTurnIndex } = state;
  const playerId = bidOrder[biddingTurnIndex];
  const bids = { ...state.bids, [playerId]: bid };
  const nextIndex = biddingTurnIndex + 1;
  const biddingDone = nextIndex >= bidOrder.length;

  return {
    ...state,
    bids,
    biddingTurnIndex: nextIndex,
    phase: biddingDone ? "bid-summary" : "bidding",
  };
}
