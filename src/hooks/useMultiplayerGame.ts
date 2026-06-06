"use client";

/**
 * useMultiplayerGame — manages the full lifecycle of a live multiplayer game.
 *
 * Responsibilities:
 *   - Load initial game state from DB
 *   - Subscribe to Realtime updates
 *   - Apply perspective transform so the caller's player is always ID 0
 *   - Expose action handlers (bid, play card, start round, next round)
 *   - Host-only: auto-advance between-tricks (1.2 s) and round-complete (1 s)
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  loadGameState,
  saveGameState,
  subscribeToGameState,
} from "@/lib/multiplayer/gameService";
import { applyPerspective } from "@/game/perspective";
import { placeBid, getForbiddenBid } from "@/game/bidding";
import { playCard, startNextTrick, getValidCardIndices } from "@/game/trick";
import { finalizeRound, startNextRound } from "@/game/match";
import type { MatchState } from "@/game/types";

interface Options {
  roomId: string;
  /** playerOrder from the room — maps 1-to-1 to game player IDs (0-based). */
  myPlayerOrder: number;
  isHost: boolean;
}

export function useMultiplayerGame({ roomId, myPlayerOrder, isHost }: Options) {
  const [rawMatch, setRawMatch] = useState<MatchState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Always-current reference so async callbacks never close over stale state
  const rawMatchRef = useRef<MatchState | null>(null);
  rawMatchRef.current = rawMatch;

  // ── Load initial state ─────────────────────────────────────────────────────

  useEffect(() => {
    let active = true;
    loadGameState(roomId)
      .then((state) => {
        if (!active) return;
        setRawMatch(state);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setError("Could not load game state. Please refresh.");
        setLoading(false);
      });
    return () => { active = false; };
  }, [roomId]);

  // ── Realtime subscription ──────────────────────────────────────────────────

  useEffect(() => {
    const unsub = subscribeToGameState(roomId, (state) => {
      setRawMatch(state);
    });
    return unsub;
  }, [roomId]);

  // ── Derived local (perspective-applied) state ──────────────────────────────

  const localMatch = rawMatch
    ? applyPerspective(rawMatch, myPlayerOrder)
    : null;

  // ── Host: auto-advance between-tricks → playing (1.2 s) ───────────────────

  useEffect(() => {
    if (!isHost) return;
    const r = rawMatch?.currentRound;
    if (r?.phase !== "between-tricks") return;

    const t = setTimeout(async () => {
      const current = rawMatchRef.current;
      if (current?.currentRound?.phase !== "between-tricks") return;
      const newMatch: MatchState = {
        ...current,
        currentRound: startNextTrick(current.currentRound!),
      };
      setRawMatch(newMatch);
      await saveGameState(roomId, newMatch).catch(() => {});
    }, 1200);

    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, rawMatch?.currentRound?.trickNumber, rawMatch?.currentRound?.phase, roomId]);

  // ── Host: auto-advance round-complete → finalize (1 s) ────────────────────

  useEffect(() => {
    if (!isHost) return;
    const r = rawMatch?.currentRound;
    if (r?.phase !== "round-complete") return;

    const t = setTimeout(async () => {
      const current = rawMatchRef.current;
      if (current?.currentRound?.phase !== "round-complete") return;
      const newMatch = finalizeRound(current);
      if (newMatch === current) return; // already scored — no-op
      setRawMatch(newMatch);
      await saveGameState(roomId, newMatch).catch(() => {});
    }, 1000);

    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, rawMatch?.currentRound?.phase, roomId]);

  // ── Actions ────────────────────────────────────────────────────────────────

  /** Submit a bid. Only callable when it's this player's bidding turn. */
  const handleBid = useCallback(async (bid: number) => {
    const current = rawMatchRef.current;
    if (!current?.currentRound) return;
    const r = current.currentRound;
    if (r.phase !== "bidding") return;
    if (r.bidOrder[r.biddingTurnIndex] !== myPlayerOrder) return;

    const newRound = placeBid(r, bid);
    const newMatch: MatchState = { ...current, currentRound: newRound };
    setRawMatch(newMatch);
    await saveGameState(roomId, newMatch).catch(() => {
      setRawMatch(rawMatchRef.current); // revert — already updated by realtime
    });
  }, [myPlayerOrder, roomId]);

  /**
   * Play a card from this player's hand.
   * `cardIndex` is the index within the local (perspective-applied) hand —
   * which is identical to the global hand since perspective only remaps IDs.
   */
  const handlePlayCard = useCallback(async (cardIndex: number) => {
    const current = rawMatchRef.current;
    if (!current?.currentRound) return;
    const r = current.currentRound;
    if (r.phase !== "playing") return;
    if (r.currentTurn !== myPlayerOrder) return;

    const newRound = playCard(r, myPlayerOrder, cardIndex);
    const newMatch: MatchState = { ...current, currentRound: newRound };
    setRawMatch(newMatch);
    await saveGameState(roomId, newMatch).catch(() => {
      setRawMatch(rawMatchRef.current);
    });
  }, [myPlayerOrder, roomId]);

  /** Host advances bid-summary → playing. */
  const handleStartRound = useCallback(async () => {
    const current = rawMatchRef.current;
    if (!current?.currentRound) return;
    if (current.currentRound.phase !== "bid-summary") return;

    const newMatch: MatchState = {
      ...current,
      currentRound: { ...current.currentRound, phase: "playing" },
    };
    setRawMatch(newMatch);
    await saveGameState(roomId, newMatch).catch(() => {
      setRawMatch(rawMatchRef.current);
    });
  }, [roomId]);

  /** Host advances round-result → next round (or match-complete). */
  const handleNextRound = useCallback(async () => {
    const current = rawMatchRef.current;
    if (!current) return;
    if (current.matchPhase !== "round-result") return;

    const newMatch = startNextRound(current);
    setRawMatch(newMatch);
    await saveGameState(roomId, newMatch).catch(() => {
      setRawMatch(rawMatchRef.current);
    });
  }, [roomId]);

  // ── Derived helpers ────────────────────────────────────────────────────────

  const round = localMatch?.currentRound ?? null;

  const isMyBidTurn =
    round?.phase === "bidding" &&
    round.bidOrder[round.biddingTurnIndex] === 0;

  const isMyCardTurn =
    round?.phase === "playing" && round.currentTurn === 0;

  const forbiddenBid =
    round?.phase === "bidding" ? getForbiddenBid(round) : null;

  const leadSuit = round?.currentTrick?.[0]?.card.suit ?? null;
  const myPlayer = round?.players.find((p) => p.id === 0) ?? null;
  const validCardIndices =
    isMyCardTurn && myPlayer
      ? getValidCardIndices(myPlayer.hand, leadSuit)
      : undefined;

  return {
    localMatch,
    loading,
    error,
    isMyBidTurn,
    isMyCardTurn,
    forbiddenBid,
    validCardIndices,
    handleBid,
    handlePlayCard,
    handleStartRound,
    handleNextRound,
  };
}
