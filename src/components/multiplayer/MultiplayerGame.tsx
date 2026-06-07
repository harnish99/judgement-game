"use client";

/**
 * MultiplayerGame — renders the live card game for all players in a room.
 *
 * Reuses all existing single-player components (BiddingScreen, TrickArea,
 * PlayerArea, etc.) because the perspective transform already makes the
 * local player appear as player 0, matching what those components expect.
 */

import { useCallback, useEffect, useState } from "react";
import { useMultiplayerGame } from "@/hooks/useMultiplayerGame";
import { useTurnTimer } from "@/hooks/useTurnTimer";
import { useSound } from "@/hooks/useSound";
import BidSummary from "@/components/BidSummary";
import BiddingScreen from "@/components/BiddingScreen";
import MatchSummary from "@/components/MatchSummary";
import PlayerArea from "@/components/PlayerArea";
import RoundResultScreen from "@/components/RoundResultScreen";
import TrickArea from "@/components/TrickArea";
import TrickWinnerToast from "@/components/TrickWinnerToast";
import TurnTimer from "@/components/TurnTimer";
import { getValidCardIndices, RANK_ORDER } from "@/game/trick";
import { getForbiddenBid } from "@/game/bidding";
import { totalRounds } from "@/game/match";
import type { Player } from "@/game/types";

// ─── Table layout (same logic as solo page.tsx) ───────────────────────────────

function getTableLayout(players: Player[]) {
  const n = players.length;
  const human = players.find((p) => p.isHuman)!;
  const others = players.filter((p) => !p.isHuman); // local IDs 1..N-1 clockwise

  switch (n) {
    case 3:
      return { topRow: [others[0]], leftPlayer: null, rightPlayer: others[1] ?? null, human };
    case 5:
      return { topRow: [others[1], others[0], others[2]], leftPlayer: null, rightPlayer: others[3] ?? null, human };
    case 6:
      return { topRow: [others[1], others[0], others[2]], leftPlayer: others[3] ?? null, rightPlayer: others[4] ?? null, human };
    default: // 4
      return { topRow: [others[0]], leftPlayer: others[1] ?? null, rightPlayer: others[2] ?? null, human };
  }
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface MultiplayerGameProps {
  roomId: string;
  myPlayerOrder: number;
  isHost: boolean;
  onLeave: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MultiplayerGame({
  roomId,
  myPlayerOrder,
  isHost,
  onLeave,
}: MultiplayerGameProps) {
  const {
    localMatch,
    loading,
    error,
    isMyBidTurn,
    forbiddenBid,
    validCardIndices,
    handleBid,
    handlePlayCard,
    handleStartRound,
    handleNextRound,
  } = useMultiplayerGame({ roomId, myPlayerOrder, isHost });

  const { playCardSound, playTimerWarningSound, playTimerExpireSound } = useSound();

  // ── Timer: auto-bid lowest legal bid on expire ─────────────────────────────
  const handleBidExpire = useCallback(() => {
    playTimerExpireSound();
    const r = localMatch?.currentRound;
    if (!r || r.phase !== "bidding" || r.bidOrder[r.biddingTurnIndex] !== 0) return;
    const forbidden = getForbiddenBid(r);
    handleBid(forbidden === 0 ? 1 : 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localMatch?.currentRound, playTimerExpireSound, handleBid]);

  // ── Timer: auto-play lowest legal card on expire ──────────────────────────
  const handlePlayExpire = useCallback(() => {
    playTimerExpireSound();
    const r = localMatch?.currentRound;
    if (!r || r.phase !== "playing" || r.currentTurn !== 0) return;
    const me = r.players.find((p) => p.isHuman)!;
    const leadSuit = r.currentTrick.length > 0 ? r.currentTrick[0].card.suit : null;
    const valid = getValidCardIndices(me.hand, leadSuit);
    if (valid.length === 0) return;
    const lowestIdx = valid.reduce((best, idx) =>
      RANK_ORDER[me.hand[idx].rank] < RANK_ORDER[me.hand[best].rank] ? idx : best,
      valid[0]
    );
    playCardSound();
    handlePlayCard(lowestIdx);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localMatch?.currentRound, playTimerExpireSound, playCardSound, handlePlayCard]);

  const mpRound = localMatch?.currentRound ?? null;
  const mpIsMyBidTurn =
    mpRound?.phase === "bidding" &&
    mpRound.bidOrder[mpRound.biddingTurnIndex] === 0 &&
    localMatch?.matchPhase === "in-round";
  const mpIsMyCardTurn =
    mpRound?.phase === "playing" &&
    mpRound.currentTurn === 0 &&
    localMatch?.matchPhase === "in-round";

  const bidTimer = useTurnTimer({
    duration: 30,
    enabled: !!mpIsMyBidTurn,
    onExpire: handleBidExpire,
    onWarning: playTimerWarningSound,
  });

  const playTimer = useTurnTimer({
    duration: 20,
    enabled: !!mpIsMyCardTurn,
    onExpire: handlePlayExpire,
    onWarning: playTimerWarningSound,
  });

  // Trick winner toast (shown during between-tricks phase)
  const [showToast, setShowToast] = useState(false);
  useEffect(() => {
    const phase = localMatch?.currentRound?.phase;
    const trickNumber = localMatch?.currentRound?.trickNumber;
    if (phase !== "between-tricks") return;
    void trickNumber; // include in dep below
    setShowToast(true);
    const t = setTimeout(() => setShowToast(false), 1200);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localMatch?.currentRound?.trickNumber, localMatch?.currentRound?.phase]);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400 text-sm">Loading game…</p>
      </div>
    );
  }

  if (error || !localMatch) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-6">
        <span className="text-4xl">⚠️</span>
        <p className="text-white font-semibold">{error ?? "Game state not found."}</p>
        <button
          onClick={onLeave}
          className="px-6 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold rounded-full text-sm"
        >
          Leave Room
        </button>
      </div>
    );
  }

  const numRounds = totalRounds(localMatch.playerCount);

  // Shared header
  function Header({ sublabel }: { sublabel?: string }) {
    return (
      <div className="w-full flex items-center justify-between mb-2 flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold tracking-wide text-yellow-400">Judgement</h1>
          {sublabel && <p className="text-xs text-gray-400">{sublabel}</p>}
        </div>
        <button
          onClick={onLeave}
          className="px-4 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white font-bold rounded-full text-sm transition-colors"
        >
          Leave
        </button>
      </div>
    );
  }

  // ── Match complete ─────────────────────────────────────────────────────────
  if (localMatch.matchPhase === "match-complete") {
    return (
      <main className="min-h-screen flex flex-col p-2 sm:p-4">
        <Header />
        <MatchSummary match={localMatch} onPlayAgain={onLeave} />
      </main>
    );
  }

  // ── Round result ───────────────────────────────────────────────────────────
  if (localMatch.matchPhase === "round-result") {
    return (
      <main className="min-h-screen flex flex-col p-2 sm:p-4">
        <Header sublabel={`Round ${localMatch.roundNumber} of ${numRounds} complete`} />
        <RoundResultScreen
          match={localMatch}
          onNextRound={handleNextRound}
          canAdvance={isHost}
        />
      </main>
    );
  }

  // ── Active round ───────────────────────────────────────────────────────────
  const round = localMatch.currentRound!;

  if (round.phase === "bidding") {
    return (
      <main className="min-h-screen flex flex-col p-2 sm:p-4">
        <Header sublabel={`Round ${localMatch.roundNumber} of ${numRounds}`} />
        <BiddingScreen
          game={round}
          roundNumber={localMatch.roundNumber}
          forbiddenBid={isMyBidTurn ? forbiddenBid : null}
          onBid={handleBid}
          timerNode={mpIsMyBidTurn ? <TurnTimer {...bidTimer} /> : undefined}
        />
      </main>
    );
  }

  if (round.phase === "bid-summary") {
    return (
      <main className="min-h-screen flex flex-col p-2 sm:p-4">
        <Header sublabel={`Round ${localMatch.roundNumber} of ${numRounds}`} />
        <BidSummary
          game={round}
          roundNumber={localMatch.roundNumber}
          onStartRound={handleStartRound}
          canStart={isHost}
        />
      </main>
    );
  }

  // ── Playing / between-tricks / round-complete ──────────────────────────────

  const {
    players,
    currentTurn,
    tricksWon,
    currentTrick,
    trump,
    phase,
    trickNumber,
    lastTrickWinner,
    bids,
    cardsPerPlayer,
  } = round;

  const leadSuit = currentTrick.length > 0 ? currentTrick[0].card.suit : null;
  const human = players.find((p) => p.isHuman)!;

  // Only show playable highlights when it's my turn
  const humanValidIndices =
    phase === "playing" && currentTurn === 0
      ? validCardIndices ?? getValidCardIndices(human.hand, leadSuit)
      : undefined;

  const { topRow, leftPlayer, rightPlayer } = getTableLayout(players);

  return (
    <main className="min-h-screen flex flex-col items-center justify-between p-2 sm:p-4 overflow-hidden">
      {/* Header */}
      <div className="w-full flex items-center justify-between mb-1 flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold tracking-wide text-yellow-400">Judgement</h1>
          <p className="text-xs text-gray-400">
            Round {localMatch.roundNumber}/{numRounds} · Trick {Math.min(trickNumber, cardsPerPlayer)}/{cardsPerPlayer}
          </p>
        </div>
        <button
          onClick={onLeave}
          className="px-4 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white font-bold rounded-full text-sm transition-colors"
        >
          Leave
        </button>
      </div>

      <div className="flex-1 w-full flex flex-col items-center justify-between gap-1 max-w-lg mx-auto">

        {/* ── Top row: opponents ── */}
        <div className="flex items-start justify-center gap-2 w-full">
          {topRow.map((p) => (
            <PlayerArea
              key={p.id}
              player={p}
              position="top"
              isCurrentTurn={currentTurn === p.id}
              tricksWon={tricksWon[p.id]}
              bid={bids[p.id]}
              matchScore={localMatch.scores[p.id]}
            />
          ))}
        </div>

        {/* ── Middle: left · trick area · right ── */}
        <div className="flex flex-row items-center justify-between w-full flex-1">
          {leftPlayer ? (
            <PlayerArea
              player={leftPlayer}
              position="left"
              isCurrentTurn={currentTurn === leftPlayer.id}
              tricksWon={tricksWon[leftPlayer.id]}
              bid={bids[leftPlayer.id]}
              matchScore={localMatch.scores[leftPlayer.id]}
            />
          ) : (
            <div className="w-10" />
          )}

          <div className="relative flex items-center justify-center">
            <TrickArea
              trick={currentTrick}
              trump={trump}
              phase={phase}
              lastTrickWinner={lastTrickWinner}
              players={players}
              trickNumber={trickNumber}
            />
            <TrickWinnerToast
              visible={showToast}
              winner={
                lastTrickWinner !== null
                  ? players.find((p) => p.id === lastTrickWinner) ?? null
                  : null
              }
              winningCard={
                lastTrickWinner !== null
                  ? currentTrick.find((tc) => tc.playerId === lastTrickWinner) ?? null
                  : null
              }
            />
          </div>

          {rightPlayer ? (
            <PlayerArea
              player={rightPlayer}
              position="right"
              isCurrentTurn={currentTurn === rightPlayer.id}
              tricksWon={tricksWon[rightPlayer.id]}
              bid={bids[rightPlayer.id]}
              matchScore={localMatch.scores[rightPlayer.id]}
            />
          ) : (
            <div className="w-10" />
          )}
        </div>

        {/* ── Bottom: current player (you) + play timer ── */}
        {mpIsMyCardTurn && (
          <div className="flex justify-center mb-0.5">
            <TurnTimer {...playTimer} />
          </div>
        )}
        <PlayerArea
          player={human}
          position="bottom"
          isCurrentTurn={currentTurn === 0}
          tricksWon={tricksWon[0]}
          bid={bids[0]}
          matchScore={localMatch.scores[0]}
          validIndices={humanValidIndices}
          onCardClick={handlePlayCard}
        />
      </div>

      {/* Waiting indicator when it's not your turn */}
      {phase === "playing" && currentTurn !== 0 && (
        <p className="text-xs text-gray-600 mt-1 text-center flex-shrink-0">
          Waiting for {players.find((p) => p.id === currentTurn)?.name ?? "opponent"}…
        </p>
      )}
    </main>
  );
}
