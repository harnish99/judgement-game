import type { Card, GameState, PlayerCount, Rank, Suit } from "./types";
import { sortHand } from "./trick";

const SUITS: Suit[] = ["hearts", "diamonds", "clubs", "spades"];
const RANKS: Rank[] = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];

export function createDeck(): Card[] {
  return SUITS.flatMap((suit) => RANKS.map((rank) => ({ suit, rank })));
}

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function dealCards(deck: Card[], numPlayers: number, cardsPerPlayer: number): Card[][] {
  const hands: Card[][] = Array.from({ length: numPlayers }, () => []);
  for (let i = 0; i < cardsPerPlayer * numPlayers; i++) {
    hands[i % numPlayers].push(deck[i]);
  }
  return hands;
}

/**
 * Creates a GameState for round `roundNumber` with the given dealer.
 * Round N deals N cards to each of `playerCount` players.
 * Player 0 is always the human; 1..N-1 are AI.
 */
export function initRound(
  roundNumber: number,
  dealer: number,
  playerCount: PlayerCount = 4
): GameState {
  const deck = shuffleDeck(createDeck());
  const cardsPerPlayer = roundNumber;
  const hands = dealCards(deck, playerCount, cardsPerPlayer);

  // Trump card: top of a separately shuffled deck (simulates flipping after deal)
  const trumpCard = shuffleDeck(createDeck())[0];
  const trump = trumpCard.suit;

  const players = Array.from({ length: playerCount }, (_, i) => ({
    id: i,
    name: i === 0 ? "You" : `Player ${i + 1}`,
    isHuman: i === 0,
    hand: i === 0 ? sortHand(hands[i]) : hands[i],
  }));

  // Bidding starts left of dealer; dealer bids last
  const bidOrder = Array.from({ length: playerCount }, (_, offset) =>
    (dealer + offset + 1) % playerCount
  );

  const bids: Record<number, number | undefined> = {};
  const tricksWon: Record<number, number> = {};
  for (let i = 0; i < playerCount; i++) {
    bids[i] = undefined;
    tricksWon[i] = 0;
  }

  return {
    players,
    trumpCard,
    trump,
    cardsPerPlayer,
    dealer,
    bidOrder,
    biddingTurnIndex: 0,
    bids,
    currentTrick: [],
    trickLeader: bidOrder[0],
    currentTurn: bidOrder[0],
    tricksWon,
    phase: "bidding",
    trickNumber: 1,
    lastTrickWinner: null,
    roundScored: false,
  };
}
