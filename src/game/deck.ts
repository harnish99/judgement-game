import type { Card, GameState, Rank, Suit } from "./types";
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
 * Round N deals N cards to each of 4 players.
 */
export function initRound(roundNumber: number, dealer: number): GameState {
  const deck = shuffleDeck(createDeck());
  const cardsPerPlayer = roundNumber;
  const hands = dealCards(deck, 4, cardsPerPlayer);

  // Trump card: top of a separately shuffled deck (simulates flipping after deal)
  const trumpCard = shuffleDeck(createDeck())[0];
  const trump = trumpCard.suit;

  const players = [
    { id: 0, name: "You", isHuman: true, hand: sortHand(hands[0]) },
    { id: 1, name: "Player 2", isHuman: false, hand: hands[1] },
    { id: 2, name: "Player 3", isHuman: false, hand: hands[2] },
    { id: 3, name: "Player 4", isHuman: false, hand: hands[3] },
  ];

  // Bidding starts left of dealer; dealer bids last
  const bidOrder = [1, 2, 3, 0].map((offset) => (dealer + offset) % 4);

  return {
    players,
    trumpCard,
    trump,
    cardsPerPlayer,
    dealer,
    bidOrder,
    biddingTurnIndex: 0,
    bids: { 0: undefined, 1: undefined, 2: undefined, 3: undefined },
    currentTrick: [],
    trickLeader: bidOrder[0],
    currentTurn: bidOrder[0],
    tricksWon: { 0: 0, 1: 0, 2: 0, 3: 0 },
    phase: "bidding",
    trickNumber: 1,
    lastTrickWinner: null,
    roundScored: false,
  };
}
