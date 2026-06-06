/**
 * Perspective transform — remaps all player IDs in a MatchState so that
 * `myGlobalId` becomes player 0 in the returned state.
 *
 * Transform: localId = (globalId - myGlobalId + n) % n
 *
 * After the transform the caller's existing single-player components work
 * unchanged: player 0 has isHuman:true, "You" is always at the bottom of the
 * table, etc.
 */

import type { GameState, MatchState, RoundResult } from "./types";

function remapId(id: number, myGlobalId: number, n: number): number {
  return (id - myGlobalId + n) % n;
}

function remapRecord<T>(
  record: Record<number, T>,
  myGlobalId: number,
  n: number
): Record<number, T> {
  const result: Record<number, T> = {};
  for (const [key, value] of Object.entries(record)) {
    const globalId = parseInt(key, 10);
    const localId = remapId(globalId, myGlobalId, n);
    result[localId] = value;
  }
  return result;
}

function remapGameState(game: GameState, myGlobalId: number): GameState {
  const n = game.players.length;
  return {
    ...game,
    players: game.players
      .map((p) => ({
        ...p,
        id: remapId(p.id, myGlobalId, n),
        isHuman: p.id === myGlobalId,
      }))
      .sort((a, b) => a.id - b.id),
    dealer: remapId(game.dealer, myGlobalId, n),
    bidOrder: game.bidOrder.map((id) => remapId(id, myGlobalId, n)),
    bids: remapRecord(game.bids, myGlobalId, n),
    currentTrick: game.currentTrick.map((tc) => ({
      ...tc,
      playerId: remapId(tc.playerId, myGlobalId, n),
    })),
    trickLeader: remapId(game.trickLeader, myGlobalId, n),
    currentTurn: remapId(game.currentTurn, myGlobalId, n),
    tricksWon: remapRecord(game.tricksWon, myGlobalId, n),
    lastTrickWinner:
      game.lastTrickWinner !== null
        ? remapId(game.lastTrickWinner, myGlobalId, n)
        : null,
  };
}

function remapRoundResult(
  result: RoundResult,
  myGlobalId: number,
  n: number
): RoundResult {
  return {
    ...result,
    bids: remapRecord(result.bids, myGlobalId, n),
    tricksWon: remapRecord(result.tricksWon, myGlobalId, n),
    roundScores: remapRecord(result.roundScores, myGlobalId, n),
  };
}

/**
 * Returns a new MatchState from the perspective of `myGlobalId`.
 * Always runs the full transform so isHuman is set correctly for every client,
 * including player 0 (the host). When myGlobalId === 0 all IDs are unchanged
 * but isHuman is still reassigned based on the remapped identity.
 */
export function applyPerspective(
  match: MatchState,
  myGlobalId: number
): MatchState {
  const n = match.playerCount;

  return {
    ...match,
    scores: remapRecord(match.scores, myGlobalId, n),
    roundHistory: match.roundHistory.map((r) =>
      remapRoundResult(r, myGlobalId, n)
    ),
    currentRound: match.currentRound
      ? remapGameState(match.currentRound, myGlobalId)
      : null,
  };
}
