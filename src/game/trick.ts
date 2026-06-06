import type { Card, GameState, Rank, Suit, TrickCard } from "./types";

export const RANK_ORDER: Record<Rank, number> = {
  "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7,
  "8": 8, "9": 9, "10": 10, J: 11, Q: 12, K: 13, A: 14,
};

function cardStrength(card: Card, leadSuit: Suit, trump: Suit): number {
  if (card.suit === trump) return 100 + RANK_ORDER[card.rank];
  if (card.suit === leadSuit) return RANK_ORDER[card.rank];
  return 0;
}

/**
 * Trump beats non-trump; highest trump wins.
 * Without trump, highest card of lead suit wins.
 */
export function determineTrickWinner(trick: TrickCard[], trump: Suit): number {
  const leadSuit = trick[0].card.suit;
  let winner = trick[0];
  for (const tc of trick.slice(1)) {
    if (cardStrength(tc.card, leadSuit, trump) > cardStrength(winner.card, leadSuit, trump)) {
      winner = tc;
    }
  }
  return winner.playerId;
}

/** Must follow suit if possible; otherwise any card is legal. */
export function getValidCardIndices(hand: Card[], leadSuit: Suit | null): number[] {
  if (!leadSuit) return hand.map((_, i) => i);
  const suitMatch = hand.map((_, i) => i).filter((i) => hand[i].suit === leadSuit);
  return suitMatch.length > 0 ? suitMatch : hand.map((_, i) => i);
}

export function sortHand(hand: Card[]): Card[] {
  const SUIT_ORDER: Record<Suit, number> = { spades: 0, hearts: 1, diamonds: 2, clubs: 3 };
  return [...hand].sort((a, b) => {
    if (a.suit !== b.suit) return SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit];
    return RANK_ORDER[a.rank] - RANK_ORDER[b.rank];
  });
}

export function playCard(state: GameState, playerId: number, cardIndex: number): GameState {
  const card = state.players.find((p) => p.id === playerId)!.hand[cardIndex];
  const players = state.players.map((p) =>
    p.id !== playerId ? p : { ...p, hand: p.hand.filter((_, i) => i !== cardIndex) }
  );
  const currentTrick: TrickCard[] = [...state.currentTrick, { card, playerId }];

  if (currentTrick.length < 4) {
    return { ...state, players, currentTrick, currentTurn: (playerId + 1) % 4 };
  }

  const winnerId = determineTrickWinner(currentTrick, state.trump);
  const tricksWon = { ...state.tricksWon, [winnerId]: (state.tricksWon[winnerId] ?? 0) + 1 };
  const trickNumber = state.trickNumber + 1;
  const phase: GameState["phase"] =
    trickNumber > state.cardsPerPlayer ? "round-complete" : "between-tricks";

  return {
    ...state,
    players,
    currentTrick,
    tricksWon,
    trickNumber,
    phase,
    lastTrickWinner: winnerId,
    currentTurn: winnerId,
    trickLeader: winnerId,
  };
}

export function startNextTrick(state: GameState): GameState {
  return { ...state, currentTrick: [], phase: "playing" };
}
