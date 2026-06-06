"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import BidSummary from "@/components/BidSummary";
import BiddingScreen from "@/components/BiddingScreen";
import MatchSummary from "@/components/MatchSummary";
import PlayerArea from "@/components/PlayerArea";
import RoundResultScreen from "@/components/RoundResultScreen";
import RulesScreen from "@/components/RulesScreen";
import TrickArea from "@/components/TrickArea";
import TrickWinnerToast from "@/components/TrickWinnerToast";
import { aiBidForDifficulty, aiChooseCardForDifficulty } from "@/game/ai";
import { getForbiddenBid, placeBid } from "@/game/bidding";
import { finalizeRound, initMatch, startNextRound, TOTAL_ROUNDS } from "@/game/match";
import { getValidCardIndices, playCard, startNextTrick } from "@/game/trick";
import type { Difficulty, MatchState } from "@/game/types";
import { useSound } from "@/hooks/useSound";
import { useHaptics } from "@/hooks/useHaptics";

const STORAGE_KEY = "judgement-v1";

function loadMatch(): MatchState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MatchState;
    if (!parsed.matchPhase || parsed.roundNumber == null) return null;
    // Back-fill difficulty for saves that predate this field
    if (!parsed.difficulty) parsed.difficulty = "easy";
    return parsed;
  } catch {
    return null;
  }
}

function saveMatch(match: MatchState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(match));
  } catch {
    // Storage unavailable — continue without persistence
  }
}

export default function Home() {
  const [match, setMatch] = useState<MatchState | null>(null);
  const [showRules, setShowRules] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const initialized = useRef(false);
  const { muted, toggleMute, playCardSound, playTrickWonSound, playRoundCompleteSound, playGameWonSound } = useSound();
  const { hapticCard, hapticTrickWon } = useHaptics();

  // Load persisted state once on mount
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const saved = loadMatch();
    if (saved) setMatch(saved);
  }, []);

  // Persist on every change
  useEffect(() => {
    if (match) saveMatch(match);
  }, [match]);

  // Go back to the difficulty-select menu
  const handleReturnToMenu = useCallback(() => setMatch(null), []);

  const handleStartMatch = useCallback((difficulty: Difficulty) => {
    setMatch(initMatch(difficulty));
  }, []);

  // ── Round-complete: pause 1 s to show last trick, then finalize ───────────
  useEffect(() => {
    if (match?.currentRound?.phase !== "round-complete") return;
    const t = setTimeout(() => setMatch((m) => m && finalizeRound(m)), 1000);
    return () => clearTimeout(t);
  }, [match]);

  // ── Match phase sounds ────────────────────────────────────────────────────
  const prevMatchPhaseRef = useRef<string | null>(null);
  useEffect(() => {
    const phase = match?.matchPhase ?? null;
    if (phase !== prevMatchPhaseRef.current) {
      if (phase === "round-result") playRoundCompleteSound();
      if (phase === "match-complete") playGameWonSound();
      prevMatchPhaseRef.current = phase;
    }
  }, [match?.matchPhase, playRoundCompleteSound, playGameWonSound]);

  // ── Bidding ───────────────────────────────────────────────────────────────
  const handleHumanBid = useCallback((bid: number) => {
    setMatch((prev) => {
      const r = prev?.currentRound;
      if (!r || r.phase !== "bidding") return prev;
      if (r.bidOrder[r.biddingTurnIndex] !== 0) return prev;
      return { ...prev!, currentRound: placeBid(r, bid) };
    });
  }, []);

  useEffect(() => {
    const r = match?.currentRound;
    if (!r || r.phase !== "bidding") return;
    const bidderId = r.bidOrder[r.biddingTurnIndex];
    if (r.players.find((p) => p.id === bidderId)!.isHuman) return;

    const bid = aiBidForDifficulty(r, bidderId, match!.difficulty);
    const t = setTimeout(
      () => setMatch((m) => m?.currentRound ? { ...m, currentRound: placeBid(m.currentRound!, bid) } : m),
      800
    );
    return () => clearTimeout(t);
  }, [match]);

  // ── Trick-taking ──────────────────────────────────────────────────────────
  const handlePlayCard = useCallback((cardIndex: number) => {
    setMatch((prev) => {
      const r = prev?.currentRound;
      if (!r || r.phase !== "playing" || r.currentTurn !== 0) return prev;
      return { ...prev!, currentRound: playCard(r, 0, cardIndex) };
    });
    playCardSound();
    hapticCard();
  }, [playCardSound, hapticCard]);

  const handleStartRound = useCallback(() => {
    setMatch((prev) =>
      prev?.currentRound
        ? { ...prev, currentRound: { ...prev.currentRound, phase: "playing" } }
        : prev
    );
  }, []);

  useEffect(() => {
    const r = match?.currentRound;
    if (!r) return;

    if (r.phase === "between-tricks") {
      setShowToast(true);
      playTrickWonSound();
      hapticTrickWon();
      const t = setTimeout(() => {
        setShowToast(false);
        setMatch((m) => m?.currentRound ? { ...m, currentRound: startNextTrick(m.currentRound!) } : m);
      }, 1200);
      return () => clearTimeout(t);
    }

    if (r.phase === "playing" && r.currentTurn !== 0) {
      const playerId = r.currentTurn;
      const player = r.players.find((p) => p.id === playerId)!;
      const leadSuit = r.currentTrick.length > 0 ? r.currentTrick[0].card.suit : null;
      const validIndices = getValidCardIndices(player.hand, leadSuit);
      const bid = r.bids[playerId] ?? 0;
      const tricksNeeded = bid - (r.tricksWon[playerId] ?? 0);
      const chosenIndex = aiChooseCardForDifficulty(
        player.hand,
        validIndices,
        tricksNeeded,
        r.currentTrick,
        r.trump,
        match!.difficulty
      );

      const t = setTimeout(() => {
        playCardSound();
        setMatch((m) => m?.currentRound ? { ...m, currentRound: playCard(m.currentRound!, playerId, chosenIndex) } : m);
      }, 650);
      return () => clearTimeout(t);
    }
  }, [match, playTrickWonSound, hapticTrickWon, playCardSound]);

  // ── Shared header ─────────────────────────────────────────────────────────
  function Header({ sublabel }: { sublabel?: string }) {
    return (
      <div className="w-full flex items-center justify-between mb-2 flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold tracking-wide text-yellow-400">Judgement</h1>
          {sublabel && <p className="text-xs text-gray-400">{sublabel}</p>}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-800 text-gray-300 hover:text-white text-sm transition-colors"
            aria-label={muted ? "Unmute" : "Mute"}
          >
            {muted ? "🔇" : "🔊"}
          </button>
          <button
            onClick={() => setShowRules(true)}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-800 text-gray-300 hover:text-white text-sm font-bold transition-colors"
            aria-label="Rules"
          >
            ?
          </button>
          <button
            onClick={handleReturnToMenu}
            className="px-4 py-1.5 bg-yellow-500 hover:bg-yellow-400 active:bg-yellow-600 text-gray-900 font-bold rounded-full text-sm transition-colors shadow-lg"
          >
            Menu
          </button>
        </div>
      </div>
    );
  }

  // ── Difficulty-select / idle screen ───────────────────────────────────────
  if (!match) {
    return (
      <main className="min-h-screen flex flex-col p-4 sm:p-6">
        <div className="w-full flex items-center justify-between mb-8 flex-shrink-0">
          <h1 className="text-2xl font-bold tracking-wide text-yellow-400">Judgement</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleMute}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-800 text-gray-300 hover:text-white text-sm transition-colors"
              aria-label={muted ? "Unmute" : "Mute"}
            >
              {muted ? "🔇" : "🔊"}
            </button>
            <button
              onClick={() => setShowRules(true)}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-800 text-gray-300 hover:text-white text-sm font-bold transition-colors"
              aria-label="Rules"
            >
              ?
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center gap-6 max-w-sm mx-auto w-full">
          <div className="text-center mb-2">
            <p className="text-gray-300 text-base">Choose your difficulty</p>
          </div>

          <button
            onClick={() => handleStartMatch("easy")}
            className="w-full bg-gray-800 hover:bg-gray-700 active:scale-95 rounded-2xl p-5 text-left transition-all border border-gray-700 hover:border-yellow-500/50"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-lg font-bold text-white">Easy</span>
              <span className="text-2xl">🃏</span>
            </div>
            <p className="text-sm text-gray-400">
              AI bids conservatively and plays the lowest legal card. Good for learning the rules.
            </p>
          </button>

          <button
            onClick={() => handleStartMatch("medium")}
            className="w-full bg-gray-800 hover:bg-gray-700 active:scale-95 rounded-2xl p-5 text-left transition-all border border-gray-700 hover:border-yellow-500/50"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-lg font-bold text-white">Medium</span>
              <span className="text-2xl">🧠</span>
            </div>
            <p className="text-sm text-gray-400">
              AI evaluates hand strength and actively plays to hit its bid — winning when it needs to, ducking when it doesn&apos;t.
            </p>
          </button>
        </div>

        {showRules && <RulesScreen onClose={() => setShowRules(false)} />}
      </main>
    );
  }

  // ── Match complete ────────────────────────────────────────────────────────
  if (match.matchPhase === "match-complete") {
    return (
      <main className="min-h-screen flex flex-col p-2 sm:p-4">
        <Header />
        <MatchSummary match={match} onPlayAgain={handleReturnToMenu} />
        {showRules && <RulesScreen onClose={() => setShowRules(false)} />}
      </main>
    );
  }

  // ── Round result ──────────────────────────────────────────────────────────
  if (match.matchPhase === "round-result") {
    const handleNextRound = () => {
      if (match.roundNumber >= TOTAL_ROUNDS) {
        setMatch((m) => m && { ...m, matchPhase: "match-complete" });
      } else {
        setMatch((m) => m && startNextRound(m));
      }
    };
    return (
      <main className="min-h-screen flex flex-col p-2 sm:p-4">
        <Header sublabel={`Round ${match.roundNumber} of ${TOTAL_ROUNDS} complete`} />
        <RoundResultScreen match={match} onNextRound={handleNextRound} />
        {showRules && <RulesScreen onClose={() => setShowRules(false)} />}
      </main>
    );
  }

  // ── Active round ──────────────────────────────────────────────────────────
  const round = match.currentRound!;

  if (round.phase === "bidding") {
    return (
      <main className="min-h-screen flex flex-col p-2 sm:p-4">
        <Header sublabel={`Round ${match.roundNumber} of ${TOTAL_ROUNDS}`} />
        <BiddingScreen
          game={round}
          roundNumber={match.roundNumber}
          forbiddenBid={getForbiddenBid(round)}
          onBid={handleHumanBid}
        />
        {showRules && <RulesScreen onClose={() => setShowRules(false)} />}
      </main>
    );
  }

  if (round.phase === "bid-summary") {
    return (
      <main className="min-h-screen flex flex-col p-2 sm:p-4">
        <Header sublabel={`Round ${match.roundNumber} of ${TOTAL_ROUNDS}`} />
        <BidSummary game={round} roundNumber={match.roundNumber} onStartRound={handleStartRound} />
        {showRules && <RulesScreen onClose={() => setShowRules(false)} />}
      </main>
    );
  }

  // ── Playing ───────────────────────────────────────────────────────────────
  const { players, currentTurn, tricksWon, currentTrick, trump, phase, trickNumber, lastTrickWinner, bids, cardsPerPlayer } = round;
  const [human, aiTop, aiLeft, aiRight] = players;

  const leadSuit = currentTrick.length > 0 ? currentTrick[0].card.suit : null;
  const humanValidIndices =
    phase === "playing" && currentTurn === 0
      ? getValidCardIndices(human.hand, leadSuit)
      : undefined;

  return (
    <main className="min-h-screen flex flex-col items-center justify-between p-2 sm:p-4 overflow-hidden">
      <div className="w-full flex items-center justify-between mb-1 flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold tracking-wide text-yellow-400">Judgement</h1>
          <p className="text-xs text-gray-400">
            Round {match.roundNumber}/{TOTAL_ROUNDS} · Trick {Math.min(trickNumber, cardsPerPlayer)}/{cardsPerPlayer}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-800 text-gray-300 hover:text-white text-sm transition-colors"
            aria-label={muted ? "Unmute" : "Mute"}
          >
            {muted ? "🔇" : "🔊"}
          </button>
          <button
            onClick={() => setShowRules(true)}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-800 text-gray-300 hover:text-white text-sm font-bold transition-colors"
            aria-label="Rules"
          >
            ?
          </button>
          <button
            onClick={handleReturnToMenu}
            className="px-4 py-1.5 bg-yellow-500 hover:bg-yellow-400 active:bg-yellow-600 text-gray-900 font-bold rounded-full text-sm transition-colors shadow-lg"
          >
            Menu
          </button>
        </div>
      </div>

      <div className="flex-1 w-full flex flex-col items-center justify-between gap-1 max-w-lg mx-auto">
        <PlayerArea
          player={aiTop}
          position="top"
          isCurrentTurn={currentTurn === aiTop.id}
          tricksWon={tricksWon[aiTop.id]}
          bid={bids[aiTop.id]}
          matchScore={match.scores[aiTop.id]}
        />

        <div className="flex flex-row items-center justify-between w-full flex-1">
          <PlayerArea
            player={aiLeft}
            position="left"
            isCurrentTurn={currentTurn === aiLeft.id}
            tricksWon={tricksWon[aiLeft.id]}
            bid={bids[aiLeft.id]}
            matchScore={match.scores[aiLeft.id]}
          />
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
              winner={lastTrickWinner !== null ? players.find((p) => p.id === lastTrickWinner) ?? null : null}
              winningCard={lastTrickWinner !== null ? currentTrick.find((tc) => tc.playerId === lastTrickWinner) ?? null : null}
            />
          </div>
          <PlayerArea
            player={aiRight}
            position="right"
            isCurrentTurn={currentTurn === aiRight.id}
            tricksWon={tricksWon[aiRight.id]}
            bid={bids[aiRight.id]}
            matchScore={match.scores[aiRight.id]}
          />
        </div>

        <PlayerArea
          player={human}
          position="bottom"
          isCurrentTurn={currentTurn === 0}
          tricksWon={tricksWon[0]}
          bid={bids[0]}
          matchScore={match.scores[0]}
          validIndices={humanValidIndices}
          onCardClick={humanValidIndices ? handlePlayCard : undefined}
        />
      </div>

      {showRules && <RulesScreen onClose={() => setShowRules(false)} />}
    </main>
  );
}
