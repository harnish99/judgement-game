"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import BidSummary from "@/components/BidSummary";
import BiddingScreen from "@/components/BiddingScreen";
import MatchSummary from "@/components/MatchSummary";
import PlayerArea from "@/components/PlayerArea";
import RoundResultScreen from "@/components/RoundResultScreen";
import RulesScreen from "@/components/RulesScreen";
import TrickArea from "@/components/TrickArea";
import TrickWinnerToast from "@/components/TrickWinnerToast";
import TurnTimer from "@/components/TurnTimer";
import { aiBidForDifficulty, aiChooseCardForDifficulty } from "@/game/ai";
import { getForbiddenBid, placeBid } from "@/game/bidding";
import { finalizeRound, initMatch, startNextRound, totalRounds } from "@/game/match";
import { getValidCardIndices, playCard, startNextTrick, RANK_ORDER } from "@/game/trick";
import type { Difficulty, MatchState, Player, PlayerCount } from "@/game/types";
import { useSound } from "@/hooks/useSound";
import { useTurnTimer } from "@/hooks/useTurnTimer";
import { useHaptics } from "@/hooks/useHaptics";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useStats } from "@/hooks/useStats";
import Link from "next/link";

const STORAGE_KEY = "judgement-v1";

function loadMatch(): MatchState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MatchState;
    if (!parsed.matchPhase || parsed.roundNumber == null) return null;
    // Back-fill fields for saves that predate them
    if (!parsed.difficulty) parsed.difficulty = "easy";
    if (!parsed.playerCount) parsed.playerCount = 4;
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

// ─── Table layout helper ──────────────────────────────────────────────────────

/**
 * Given the full player list, returns which AI players go where on screen.
 * Player 0 (human) always sits at the bottom.
 * IDs are assigned clockwise: 1=N, 2=NW, 3=NE, 4=W/E, 5=E.
 *
 * Layout per count:
 *  3p → top:[1], left:[], right:[2]
 *  4p → top:[1], left:[2], right:[3]
 *  5p → top:[2,1,3], left:[], right:[4]
 *  6p → top:[2,1,3], left:[4], right:[5]
 */
function getTableLayout(players: Player[]) {
  const n = players.length;
  const human = players.find((p) => p.isHuman)!;
  const ai = players.filter((p) => !p.isHuman); // IDs 1..N-1 in order

  switch (n) {
    case 3:
      return { topRow: [ai[0]], leftPlayer: null, rightPlayer: ai[1], human };
    case 5:
      return { topRow: [ai[1], ai[0], ai[2]], leftPlayer: null, rightPlayer: ai[3], human };
    case 6:
      return { topRow: [ai[1], ai[0], ai[2]], leftPlayer: ai[3], rightPlayer: ai[4], human };
    default: // 4 (and fallback)
      return { topRow: [ai[0]], leftPlayer: ai[1] ?? null, rightPlayer: ai[2] ?? null, human };
  }
}

const PLAYER_COUNT_OPTIONS: { count: PlayerCount; label: string; rounds: number }[] = [
  { count: 3, label: "3 Players", rounds: 17 },
  { count: 4, label: "4 Players", rounds: 13 },
  { count: 5, label: "5 Players", rounds: 10 },
  { count: 6, label: "6 Players", rounds: 8 },
];

export default function Home() {
  const [match, setMatch] = useState<MatchState | null>(null);
  const [showRules, setShowRules] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [selectedCount, setSelectedCount] = useState<PlayerCount>(4);
  const [soloFlow, setSoloFlow] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>("easy");
  const initialized = useRef(false);
  const {
    muted,
    toggleMute,
    playCardSound,
    playTrickWonSound,
    playRoundCompleteSound,
    playGameWonSound,
    playTimerWarningSound,
    playTimerExpireSound,
  } = useSound();
  const { hapticCard, hapticTrickWon } = useHaptics();
  const { track } = useAnalytics();
  const { recordGame, recordRound } = useStats();

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

  const handleReturnToMenu = useCallback(() => setMatch(null), []);

  const handleStartMatch = useCallback((difficulty: Difficulty, playerCount: PlayerCount) => {
    setMatch(initMatch(difficulty, playerCount));
    track("game_started", { difficulty, playerCount });
  }, [track]);

  // ── Round-complete: pause 1 s to show last trick, then finalize ───────────
  useEffect(() => {
    if (match?.currentRound?.phase !== "round-complete") return;
    const t = setTimeout(() => setMatch((m) => m && finalizeRound(m)), 1000);
    return () => clearTimeout(t);
  }, [match]);

  // ── Match phase sounds + analytics ───────────────────────────────────────
  const prevMatchPhaseRef = useRef<string | null>(null);
  const prevRoundNumberRef = useRef<number | null>(null);

  useEffect(() => {
    const phase = match?.matchPhase ?? null;
    const roundNumber = match?.roundNumber ?? null;

    if (phase !== prevMatchPhaseRef.current) {
      if (phase === "round-result" && match) {
        playRoundCompleteSound();
        const lastResult = match.roundHistory[match.roundHistory.length - 1];
        if (lastResult) {
          const humanBid = lastResult.bids[0] ?? 0;
          const humanWon = lastResult.tricksWon[0] ?? 0;
          track("round_completed", {
            roundNumber: lastResult.roundNumber,
            humanHitBid: humanBid === humanWon,
            humanBid,
            humanTricksWon: humanWon,
            humanRoundScore: lastResult.roundScores[0] ?? 0,
          });
          recordRound(lastResult);
        }
      }

      if (phase === "match-complete" && match) {
        playGameWonSound();
        const humanScore = match.scores[0] ?? 0;
        const allScores = Object.values(match.scores).sort((a, b) => b - a);
        const rank = allScores.indexOf(humanScore) + 1;

        track("game_finished", { finalScore: humanScore, rank });
        if (rank === 1) {
          track("game_won", { finalScore: humanScore, totalRounds: match.roundNumber });
        } else {
          track("game_lost", { finalScore: humanScore, rank, totalRounds: match.roundNumber });
        }
        recordGame(match);
      }

      prevMatchPhaseRef.current = phase;
    }

    if (
      roundNumber !== null &&
      roundNumber !== prevRoundNumberRef.current &&
      phase === "in-round" &&
      match?.currentRound
    ) {
      const r = match.currentRound;
      track("round_started", {
        roundNumber,
        cardsPerPlayer: r.cardsPerPlayer,
        trump: r.trump,
      });
      prevRoundNumberRef.current = roundNumber;
    }
  }, [match?.matchPhase, match?.roundNumber, match, track, playRoundCompleteSound, playGameWonSound, recordRound, recordGame]);

  // ── Bidding ───────────────────────────────────────────────────────────────
  const handleHumanBid = useCallback((bid: number) => {
    setMatch((prev) => {
      const r = prev?.currentRound;
      if (!r || r.phase !== "bidding") return prev;
      if (r.bidOrder[r.biddingTurnIndex] !== 0) return prev;
      track("bid_submitted", {
        roundNumber: prev!.roundNumber,
        bid,
        cardsPerPlayer: r.cardsPerPlayer,
      });
      return { ...prev!, currentRound: placeBid(r, bid) };
    });
  }, [track]);

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

  // ── Timer: auto-bid on expire ─────────────────────────────────────────────
  const handleBidExpire = useCallback(() => {
    playTimerExpireSound();
    setMatch((prev) => {
      const r = prev?.currentRound;
      if (!r || r.phase !== "bidding" || r.bidOrder[r.biddingTurnIndex] !== 0) return prev;
      const forbidden = getForbiddenBid(r);
      // Bid 0 unless forbidden, then bid 1.
      const autoBid = forbidden === 0 ? 1 : 0;
      return { ...prev!, currentRound: placeBid(r, autoBid) };
    });
  }, [playTimerExpireSound]);

  // ── Timer: auto-play lowest legal card on expire ──────────────────────────
  const handlePlayExpire = useCallback(() => {
    playTimerExpireSound();
    setMatch((prev) => {
      const r = prev?.currentRound;
      if (!r || r.phase !== "playing" || r.currentTurn !== 0) return prev;
      const me = r.players.find((p) => p.isHuman)!;
      const leadSuit = r.currentTrick.length > 0 ? r.currentTrick[0].card.suit : null;
      const validIndices = getValidCardIndices(me.hand, leadSuit);
      if (validIndices.length === 0) return prev;
      const lowestIdx = validIndices.reduce((best, idx) =>
        RANK_ORDER[me.hand[idx].rank] < RANK_ORDER[me.hand[best].rank] ? idx : best,
        validIndices[0]
      );
      return { ...prev!, currentRound: playCard(r, 0, lowestIdx) };
    });
    playCardSound();
  }, [playTimerExpireSound, playCardSound]);

  // ── Derive timer enabled flags ────────────────────────────────────────────
  const round0 = match?.currentRound ?? null;
  const isHumanBidTurn =
    round0?.phase === "bidding" &&
    round0.bidOrder[round0.biddingTurnIndex] === 0 &&
    match?.matchPhase === "in-round";
  const isHumanCardTurn =
    round0?.phase === "playing" &&
    round0.currentTurn === 0 &&
    match?.matchPhase === "in-round";

  const bidTimer = useTurnTimer({
    duration: 30,
    enabled: !!isHumanBidTurn,
    onExpire: handleBidExpire,
    onWarning: playTimerWarningSound,
  });

  const playTimer = useTurnTimer({
    duration: 20,
    enabled: !!isHumanCardTurn,
    onExpire: handlePlayExpire,
    onWarning: playTimerWarningSound,
  });

  useEffect(() => {
    const r = match?.currentRound;
    if (!r) return;

    if (r.phase === "between-tricks") {
      setShowToast(true);
      playTrickWonSound();
      hapticTrickWon();
      if (r.lastTrickWinner !== null) {
        track("trick_won", {
          roundNumber: match!.roundNumber,
          trickNumber: r.trickNumber - 1,
          byHuman: r.lastTrickWinner === 0,
        });
      }
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
  }, [match, playTrickWonSound, hapticTrickWon, playCardSound, track]);

  // ── Shared header ─────────────────────────────────────────────────────────
  function Header({ sublabel }: { sublabel?: string }) {
    return (
      <div className="w-full flex items-center justify-between mb-2 flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold tracking-wide text-yellow-400">Judgement</h1>
          {sublabel && <p className="text-xs text-gray-400">{sublabel}</p>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggleMute} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-800 text-gray-300 hover:text-white text-sm transition-colors" aria-label={muted ? "Unmute" : "Mute"}>
            {muted ? "🔇" : "🔊"}
          </button>
          <button onClick={() => setShowRules(true)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-800 text-gray-300 hover:text-white text-sm font-bold transition-colors" aria-label="Rules">?</button>
          <button onClick={handleReturnToMenu} className="px-4 py-1.5 bg-yellow-500 hover:bg-yellow-400 active:bg-yellow-600 text-gray-900 font-bold rounded-full text-sm transition-colors shadow-lg">Menu</button>
        </div>
      </div>
    );
  }

  // ── Home screen ───────────────────────────────────────────────────────────
  if (!match) {
    return (
      <main className="min-h-screen flex flex-col bg-gray-950 overflow-hidden select-none">

        {/* Utility row — top right, unobtrusive */}
        <div className="flex justify-end gap-2 p-4 flex-shrink-0">
          <button
            onClick={toggleMute}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-800/80 text-gray-400 hover:text-white transition-colors text-sm"
            aria-label={muted ? "Unmute" : "Mute"}
          >
            {muted ? "🔇" : "🔊"}
          </button>
        </div>

        {/* ── Hero ── */}
        <div className="flex-1 flex flex-col items-center justify-center px-8 -mt-8">
          {/* Suit symbols decoration */}
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
            className="flex gap-5 mb-7"
          >
            <span className="text-4xl text-gray-600">♠</span>
            <span className="text-4xl text-red-500/50">♥</span>
            <span className="text-4xl text-red-500/50">♦</span>
            <span className="text-4xl text-gray-600">♣</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.13 }}
            className="text-6xl font-black text-yellow-400 tracking-tight text-center leading-none"
          >
            Judgement
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.26 }}
            className="mt-4 text-gray-400 text-lg tracking-wide text-center font-medium"
          >
            Predict. Play. Outsmart.
          </motion.p>
        </div>

        {/* ── Primary actions ── */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.38 }}
          className="flex flex-col gap-3 px-6 pb-14 max-w-sm w-full mx-auto"
        >
          {/* Play Solo — primary CTA */}
          <button
            onClick={() => setSoloFlow(true)}
            className="w-full py-[18px] bg-yellow-500 hover:bg-yellow-400 active:scale-[0.98] rounded-2xl text-gray-900 font-black text-lg tracking-wide transition-all shadow-xl shadow-yellow-500/20"
          >
            Play Solo
          </button>

          {/* Play With Friends — secondary */}
          <Link
            href="/lobby"
            className="w-full py-[18px] border-2 border-gray-700 hover:border-gray-500 active:scale-[0.98] rounded-2xl text-white font-bold text-lg transition-all text-center block"
          >
            Play With Friends
          </Link>

          {/* Tertiary links */}
          <div className="flex items-center justify-center gap-6 pt-1">
            <Link href="/stats" className="text-gray-500 hover:text-gray-300 text-sm font-medium transition-colors">
              Statistics
            </Link>
            <span className="text-gray-700 text-xs">·</span>
            <button
              onClick={() => setShowRules(true)}
              className="text-gray-500 hover:text-gray-300 text-sm font-medium transition-colors"
            >
              Rules
            </button>
          </div>
        </motion.div>

        {/* ── Play Solo bottom sheet ── */}
        <AnimatePresence>
          {soloFlow && (
            <>
              {/* Backdrop */}
              <motion.div
                key="solo-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 bg-black/70 z-40"
                onClick={() => setSoloFlow(false)}
              />

              {/* Sheet */}
              <motion.div
                key="solo-sheet"
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className="fixed bottom-0 inset-x-0 bg-gray-900 rounded-t-3xl z-50 px-6 pt-4 pb-12"
              >
                {/* Drag handle */}
                <div className="w-10 h-1 bg-gray-700 rounded-full mx-auto mb-6" />

                <div className="max-w-sm mx-auto">
                  <h2 className="text-2xl font-black text-white mb-7">Play Solo</h2>

                  {/* ── Player count ── */}
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
                    Players
                  </p>
                  <div className="grid grid-cols-4 gap-2 mb-7">
                    {PLAYER_COUNT_OPTIONS.map(({ count, rounds }) => (
                      <button
                        key={count}
                        onClick={() => setSelectedCount(count)}
                        className={`flex flex-col items-center py-3 rounded-xl border-2 font-semibold transition-all ${
                          selectedCount === count
                            ? "bg-yellow-500 border-yellow-400 text-gray-900"
                            : "bg-gray-800 border-gray-800 text-gray-300 hover:border-gray-600"
                        }`}
                      >
                        <span className="text-xl font-black">{count}</span>
                        <span className={`text-[11px] mt-0.5 ${selectedCount === count ? "text-yellow-900" : "text-gray-500"}`}>
                          {rounds} rnds
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* ── Difficulty ── */}
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
                    Difficulty
                  </p>
                  <div className="grid grid-cols-2 gap-3 mb-8">
                    {([
                      { value: "easy" as Difficulty, label: "Easy", emoji: "🃏", desc: "Conservative AI" },
                      { value: "medium" as Difficulty, label: "Medium", emoji: "🧠", desc: "Strategic AI" },
                    ]).map(({ value, label, emoji, desc }) => (
                      <button
                        key={value}
                        onClick={() => setSelectedDifficulty(value)}
                        className={`flex flex-col items-center py-4 rounded-xl border-2 transition-all ${
                          selectedDifficulty === value
                            ? "bg-yellow-500 border-yellow-400 text-gray-900"
                            : "bg-gray-800 border-gray-800 text-gray-300 hover:border-gray-600"
                        }`}
                      >
                        <span className="text-2xl mb-1.5">{emoji}</span>
                        <span className="font-bold text-sm">{label}</span>
                        <span className={`text-[11px] mt-0.5 ${selectedDifficulty === value ? "text-yellow-900" : "text-gray-500"}`}>
                          {desc}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* ── Start ── */}
                  <button
                    onClick={() => {
                      setSoloFlow(false);
                      handleStartMatch(selectedDifficulty, selectedCount);
                    }}
                    className="w-full py-[18px] bg-yellow-500 hover:bg-yellow-400 active:scale-[0.98] rounded-2xl text-gray-900 font-black text-lg tracking-wide transition-all shadow-xl shadow-yellow-500/20"
                  >
                    Start Game
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

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
    const numRounds = totalRounds(match.playerCount);
    const handleNextRound = () => {
      if (match.roundNumber >= numRounds) {
        setMatch((m) => m && { ...m, matchPhase: "match-complete" });
      } else {
        setMatch((m) => m && startNextRound(m));
      }
    };
    return (
      <main className="min-h-screen flex flex-col p-2 sm:p-4">
        <Header sublabel={`Round ${match.roundNumber} of ${numRounds} complete`} />
        <RoundResultScreen match={match} onNextRound={handleNextRound} />
        {showRules && <RulesScreen onClose={() => setShowRules(false)} />}
      </main>
    );
  }

  // ── Active round ──────────────────────────────────────────────────────────
  const round = match.currentRound!;
  const numRounds = totalRounds(match.playerCount);

  if (round.phase === "bidding") {
    return (
      <main className="min-h-screen flex flex-col p-2 sm:p-4">
        <Header sublabel={`Round ${match.roundNumber} of ${numRounds}`} />
        <BiddingScreen
          game={round}
          roundNumber={match.roundNumber}
          forbiddenBid={getForbiddenBid(round)}
          onBid={handleHumanBid}
          timerNode={isHumanBidTurn ? <TurnTimer {...bidTimer} /> : undefined}
        />
        {showRules && <RulesScreen onClose={() => setShowRules(false)} />}
      </main>
    );
  }

  if (round.phase === "bid-summary") {
    return (
      <main className="min-h-screen flex flex-col p-2 sm:p-4">
        <Header sublabel={`Round ${match.roundNumber} of ${numRounds}`} />
        <BidSummary game={round} roundNumber={match.roundNumber} onStartRound={handleStartRound} />
        {showRules && <RulesScreen onClose={() => setShowRules(false)} />}
      </main>
    );
  }

  // ── Playing ───────────────────────────────────────────────────────────────
  const { players, currentTurn, tricksWon, currentTrick, trump, phase, trickNumber, lastTrickWinner, bids, cardsPerPlayer } = round;

  const leadSuit = currentTrick.length > 0 ? currentTrick[0].card.suit : null;
  const human = players.find((p) => p.isHuman)!;
  const humanValidIndices =
    phase === "playing" && currentTurn === 0
      ? getValidCardIndices(human.hand, leadSuit)
      : undefined;

  const { topRow, leftPlayer, rightPlayer } = getTableLayout(players);

  return (
    <main className="min-h-screen flex flex-col items-center justify-between p-2 sm:p-4 overflow-hidden">
      {/* Header */}
      <div className="w-full flex items-center justify-between mb-1 flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold tracking-wide text-yellow-400">Judgement</h1>
          <p className="text-xs text-gray-400">
            Round {match.roundNumber}/{numRounds} · Trick {Math.min(trickNumber, cardsPerPlayer)}/{cardsPerPlayer}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggleMute} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-800 text-gray-300 hover:text-white text-sm transition-colors" aria-label={muted ? "Unmute" : "Mute"}>
            {muted ? "🔇" : "🔊"}
          </button>
          <button onClick={() => setShowRules(true)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-800 text-gray-300 hover:text-white text-sm font-bold transition-colors" aria-label="Rules">?</button>
          <button onClick={handleReturnToMenu} className="px-4 py-1.5 bg-yellow-500 hover:bg-yellow-400 active:bg-yellow-600 text-gray-900 font-bold rounded-full text-sm transition-colors shadow-lg">Menu</button>
        </div>
      </div>

      <div className="flex-1 w-full flex flex-col items-center justify-between gap-1 max-w-lg mx-auto">

        {/* ── Top row: 1–3 AI players ── */}
        <div className="flex items-start justify-center gap-2 w-full">
          {topRow.map((p) => (
            <PlayerArea
              key={p.id}
              player={p}
              position="top"
              isCurrentTurn={currentTurn === p.id}
              tricksWon={tricksWon[p.id]}
              bid={bids[p.id]}
              matchScore={match.scores[p.id]}
            />
          ))}
        </div>

        {/* ── Middle row: left AI · trick area · right AI ── */}
        <div className="flex flex-row items-center justify-between w-full flex-1">
          {leftPlayer ? (
            <PlayerArea
              player={leftPlayer}
              position="left"
              isCurrentTurn={currentTurn === leftPlayer.id}
              tricksWon={tricksWon[leftPlayer.id]}
              bid={bids[leftPlayer.id]}
              matchScore={match.scores[leftPlayer.id]}
            />
          ) : (
            <div className="w-10" /> // spacer so trick area stays centered
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
              winner={lastTrickWinner !== null ? players.find((p) => p.id === lastTrickWinner) ?? null : null}
              winningCard={lastTrickWinner !== null ? currentTrick.find((tc) => tc.playerId === lastTrickWinner) ?? null : null}
            />
          </div>

          {rightPlayer ? (
            <PlayerArea
              player={rightPlayer}
              position="right"
              isCurrentTurn={currentTurn === rightPlayer.id}
              tricksWon={tricksWon[rightPlayer.id]}
              bid={bids[rightPlayer.id]}
              matchScore={match.scores[rightPlayer.id]}
            />
          ) : (
            <div className="w-10" />
          )}
        </div>

        {/* ── Human (+ play timer when it's their turn) ── */}
        {isHumanCardTurn && (
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
          matchScore={match.scores[0]}
          validIndices={humanValidIndices}
          onCardClick={humanValidIndices ? handlePlayCard : undefined}
        />
      </div>

      {showRules && <RulesScreen onClose={() => setShowRules(false)} />}
    </main>
  );
}
