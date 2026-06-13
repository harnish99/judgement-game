export type Suit = "hearts" | "diamonds" | "clubs" | "spades";
export type Rank = "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K" | "A";

export interface Card {
  suit: Suit;
  rank: Rank;
}

export interface Player {
  id: number;
  name: string;
  isHuman: boolean;
  hand: Card[];
}

export interface TrickCard {
  card: Card;
  playerId: number;
}

export type GamePhase =
  | "bidding"
  | "bid-summary"
  | "playing"
  | "between-tricks"
  | "round-complete";

export interface GameState {
  players: Player[];
  trumpCard: Card;
  trump: Suit;
  cardsPerPlayer: number;
  dealer: number;
  bidOrder: number[];
  biddingTurnIndex: number;
  bids: Record<number, number | undefined>;
  currentTrick: TrickCard[];
  trickLeader: number;
  currentTurn: number;
  tricksWon: Record<number, number>;
  phase: GamePhase;
  trickNumber: number;
  lastTrickWinner: number | null;
  /** Guards against scoring the same round more than once. */
  roundScored: boolean;
}

export interface RoundResult {
  roundNumber: number;
  cardsPerPlayer: number;
  bids: Record<number, number>;
  tricksWon: Record<number, number>;
  roundScores: Record<number, number>;
}

export type MatchPhase = "idle" | "in-round" | "round-result" | "match-complete";

export type Difficulty = "easy" | "medium";

/** 2–6 inclusive. Enforced at initMatch time. */
export type PlayerCount = 2 | 3 | 4 | 5 | 6;

export interface MatchState {
  matchPhase: MatchPhase;
  roundNumber: number;
  dealer: number;
  difficulty: Difficulty;
  /** Total seats (human + AI for single-player). Defaults to 4 for old saves. */
  playerCount: PlayerCount;
  scores: Record<number, number>;
  roundHistory: RoundResult[];
  currentRound: GameState | null;
}
