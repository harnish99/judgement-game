"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStats } from "@/hooks/useStats";

// ─── Small presentational pieces ─────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  accent = false,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-0.5 rounded-2xl p-4 ${
        accent ? "bg-yellow-500/10 border border-yellow-500/30" : "bg-gray-800 border border-gray-700"
      }`}
    >
      <span className="text-xs text-gray-400 uppercase tracking-wide leading-none">
        {label}
      </span>
      <span
        className={`text-2xl font-bold leading-tight ${
          accent ? "text-yellow-400" : "text-white"
        }`}
      >
        {value}
      </span>
      {sub && <span className="text-xs text-gray-500">{sub}</span>}
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mt-2">
      {children}
    </h2>
  );
}

// ─── Reset confirmation modal ─────────────────────────────────────────────────

function ResetModal({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 max-w-xs w-full shadow-2xl flex flex-col gap-4">
        <h3 className="text-lg font-bold text-white">Reset Statistics?</h3>
        <p className="text-sm text-gray-400">
          All your stats — wins, streaks, scores — will be permanently deleted.
          This cannot be undone.
        </p>
        <div className="flex gap-3 mt-1">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl bg-gray-700 hover:bg-gray-600 text-white font-semibold text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-semibold text-sm transition-colors"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StatsPage() {
  const router = useRouter();
  const { stats, resetStats } = useStats();
  const [showConfirm, setShowConfirm] = useState(false);

  function handleReset() {
    resetStats();
    setShowConfirm(false);
  }

  const winRateDisplay =
    stats.gamesPlayed === 0 ? "—" : `${stats.winRate}%`;

  const averageDisplay =
    stats.gamesPlayed === 0 ? "—" : stats.averageScore.toString();

  return (
    <main className="min-h-screen flex flex-col p-4 sm:p-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="w-full flex items-center gap-3 mb-6 flex-shrink-0">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-800 text-gray-300 hover:text-white transition-colors"
          aria-label="Back"
        >
          ‹
        </button>
        <div>
          <h1 className="text-xl font-bold tracking-wide text-yellow-400 leading-none">
            Statistics
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">Your lifetime results</p>
        </div>
      </div>

      {/* Empty state */}
      {stats.gamesPlayed === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center pb-12">
          <span className="text-5xl">🃏</span>
          <p className="text-gray-400 text-sm">
            No games played yet. <br />
            Finish a match to see your stats here.
          </p>
          <button
            onClick={() => router.push("/")}
            className="mt-2 px-5 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold rounded-full text-sm transition-colors"
          >
            Play Now
          </button>
        </div>
      )}

      {/* Stats grid */}
      {stats.gamesPlayed > 0 && (
        <div className="flex flex-col gap-3">
          {/* Overview */}
          <SectionHeading>Overview</SectionHeading>
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Games Played" value={stats.gamesPlayed} />
            <StatCard label="Games Won"    value={stats.gamesWon} accent />
            <StatCard
              label="Win Rate"
              value={winRateDisplay}
              sub={`${stats.gamesWon} of ${stats.gamesPlayed} games`}
              accent
            />
            <StatCard label="Highest Score" value={stats.highestScore} />
            <StatCard
              label="Average Score"
              value={averageDisplay}
              sub="per completed game"
            />
          </div>

          {/* Bidding & tricks */}
          <SectionHeading>Bidding & Tricks</SectionHeading>
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="Perfect Bids"
              value={stats.perfectBids}
              sub="exact bid matches"
              accent
            />
            <StatCard
              label="Total Tricks Won"
              value={stats.totalTricksWon}
            />
          </div>

          {/* Streaks */}
          <SectionHeading>Streaks</SectionHeading>
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="Current Streak"
              value={stats.currentWinStreak === 0 ? "—" : `${stats.currentWinStreak}🔥`}
            />
            <StatCard
              label="Longest Streak"
              value={stats.longestWinStreak === 0 ? "—" : stats.longestWinStreak}
              accent={stats.longestWinStreak > 0}
            />
          </div>
        </div>
      )}

      {/* Reset button — always visible once you've played */}
      {stats.gamesPlayed > 0 && (
        <div className="mt-8 mb-2">
          <button
            onClick={() => setShowConfirm(true)}
            className="w-full py-3 rounded-2xl border border-red-800/60 text-red-500 hover:bg-red-900/20 active:bg-red-900/40 text-sm font-semibold transition-colors"
          >
            Reset Statistics
          </button>
        </div>
      )}

      {showConfirm && (
        <ResetModal
          onConfirm={handleReset}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </main>
  );
}
