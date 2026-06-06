import type { Card, Difficulty, GameState, Rank, Suit, TrickCard } from "./types";
import { RANK_ORDER } from "./trick";
import { getForbiddenBid } from "./bidding";

// ── Internal helpers ──────────────────────────────────────────────────────

function cardStrength(card: Card, leadSuit: Suit, trump: Suit): number {
  if (card.suit === trump) return 100 + RANK_ORDER[card.rank];
  if (card.suit === leadSuit) return RANK_ORDER[card.rank];
  return 0;
}

/** Returns the strength of the card currently winning a trick. */
function currentWinnerStrength(trick: TrickCard[], trump: Suit): number {
  if (trick.length === 0) return -1;
  const leadSuit = trick[0].card.suit;
  return trick.reduce(
    (best, tc) => Math.max(best, cardStrength(tc.card, leadSuit, trump)),
    0
  );
}

/** Pick the index of the highest (ascending=false) or lowest (ascending=true) card. */
function pickByRank(hand: Card[], indices: number[], ascending: boolean): number {
  return indices.reduce((best, i) => {
    const better = ascending
      ? RANK_ORDER[hand[i].rank] < RANK_ORDER[hand[best].rank]
      : RANK_ORDER[hand[i].rank] > RANK_ORDER[hand[best].rank];
    return better ? i : best;
  }, indices[0]);
}

function suitCounts(hand: Card[]): Record<Suit, number> {
  const counts: Record<Suit, number> = { hearts: 0, diamonds: 0, clubs: 0, spades: 0 };
  for (const card of hand) counts[card.suit]++;
  return counts;
}

// ── Bidding ───────────────────────────────────────────────────────────────

/**
 * Easy: count trump J+ and aces only.
 * Simple and slightly pessimistic — beginners tend to over-bid.
 */
function estimateBidEasy(hand: Card[], trump: Suit, cardsPerPlayer: number): number {
  let count = 0;
  for (const card of hand) {
    const v = RANK_ORDER[card.rank];
    if (card.suit === trump && v >= 11) count++;   // trump J/Q/K/A
    else if (card.suit !== trump && v >= 14) count++; // bare ace
  }
  return Math.min(count, cardsPerPlayer);
}

/**
 * Medium: weighted scoring that accounts for aces, kings with suit length,
 * trump depth, and long-suit potential.
 */
function estimateBidMedium(hand: Card[], trump: Suit, cardsPerPlayer: number): number {
  const lens = suitCounts(hand);
  let score = 0;

  for (const card of hand) {
    const v = RANK_ORDER[card.rank];
    const isTrump = card.suit === trump;
    const suitLen = lens[card.suit];

    if (isTrump) {
      if (v >= 14) score += 1.0;              // trump A
      else if (v >= 13) score += 0.85;        // trump K
      else if (v >= 12) score += 0.7;         // trump Q
      else if (v >= 11) score += 0.55;        // trump J
      else if (suitLen >= 4) score += 0.3;    // small trump in a long trump suit
    } else {
      if (v >= 14) score += 0.85;             // off-suit A
      else if (v >= 13 && suitLen >= 2) score += 0.6;  // K with suit length
      else if (v >= 13 && suitLen === 1) score += 0.25; // singleton K — risky
    }
  }

  // Long non-trump suits generate winners in the late tricks of the suit
  for (const [suit, len] of Object.entries(lens) as [Suit, number][]) {
    if (suit !== trump && len >= 4) score += (len - 3) * 0.3;
  }

  return Math.min(Math.round(score), cardsPerPlayer);
}

// ── Card play ─────────────────────────────────────────────────────────────

/** Easy: always play the lowest legal card regardless of context. */
function chooseCardEasy(hand: Card[], validIndices: number[]): number {
  return pickByRank(hand, validIndices, true);
}

/**
 * Medium: play toward the bid.
 *  - tricksNeeded > 0  → try to WIN the trick
 *  - tricksNeeded <= 0 → try to LOSE the trick
 *
 * When leading:
 *   Win mode  — lead highest non-trump (preserve trump); fall back to highest trump.
 *   Lose mode — lead lowest non-trump; fall back to lowest trump.
 *
 * When following:
 *   Win mode  — play the lowest card that beats the current winner;
 *               if none exists, discard the lowest card.
 *   Lose mode — play the highest card that still loses to the current winner
 *               (dumps dangerous high cards safely); if every card wins, play lowest.
 */
function chooseCardMedium(
  hand: Card[],
  validIndices: number[],
  tricksNeeded: number,
  currentTrick: TrickCard[],
  trump: Suit
): number {
  const isLeading = currentTrick.length === 0;
  const leadSuit = isLeading ? null : currentTrick[0].card.suit;
  const winnerStrength = currentWinnerStrength(currentTrick, trump);
  const needToWin = tricksNeeded > 0;

  if (isLeading) {
    const nonTrump = validIndices.filter((i) => hand[i].suit !== trump);
    const pool = nonTrump.length > 0 ? nonTrump : validIndices;
    // Win: lead highest; Lose: lead lowest
    return pickByRank(hand, pool, !needToWin);
  }

  // Following — compute strength of each valid card
  const strengths = validIndices.map((i) =>
    cardStrength(hand[i], leadSuit!, trump)
  );

  if (needToWin) {
    // Find the lowest card that beats the current winner
    const winning = validIndices.filter((_, pos) => strengths[pos] > winnerStrength);
    if (winning.length > 0) return pickByRank(hand, winning, true);
    // Can't win this trick — discard lowest
    return pickByRank(hand, validIndices, true);
  } else {
    // Find the highest card that still loses (dumps risky high cards)
    const losing = validIndices.filter((_, pos) => strengths[pos] < winnerStrength);
    if (losing.length > 0) return pickByRank(hand, losing, false);
    // Every card wins — can't avoid it; play lowest to minimise future risk
    return pickByRank(hand, validIndices, true);
  }
}

// ── Public API ────────────────────────────────────────────────────────────

export function aiBidForDifficulty(
  state: GameState,
  playerId: number,
  difficulty: Difficulty
): number {
  const player = state.players.find((p) => p.id === playerId)!;
  const estimateFn = difficulty === "medium" ? estimateBidMedium : estimateBidEasy;
  const estimate = estimateFn(player.hand, state.trump, state.cardsPerPlayer);

  const forbidden = getForbiddenBid(state);
  if (forbidden !== null && estimate === forbidden) {
    return estimate < state.cardsPerPlayer ? estimate + 1 : Math.max(0, estimate - 1);
  }
  return estimate;
}

export function aiChooseCardForDifficulty(
  hand: Card[],
  validIndices: number[],
  tricksNeeded: number,
  currentTrick: TrickCard[],
  trump: Suit,
  difficulty: Difficulty
): number {
  if (difficulty === "easy") return chooseCardEasy(hand, validIndices);
  return chooseCardMedium(hand, validIndices, tricksNeeded, currentTrick, trump);
}
