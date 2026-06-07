"use client";

import type { MatchState } from "@/game/types";
import { totalRounds } from "@/game/match";

/** Human-friendly "time ago" string for the last-played timestamp. */
export function formatLastPlayed(ts: number | null): string {
  if (!ts) return "Unknown";
  const diff = Date.now() - ts;
  const MIN = 60_000;
  const HOUR = 3_600_000;
  const DAY = 86_400_000;

  if (diff < 0) return "Just now";
  if (diff < MIN) return "Just now";
  if (diff < HOUR) {
    const m = Math.floor(diff / MIN);
    return `${m} minute${m !== 1 ? "s" : ""} ago`;
  }
  if (diff < DAY) {
    const h = Math.floor(diff / HOUR);
    return `${h} hour${h !== 1 ? "s" : ""} ago`;
  }
  if (diff < 2 * DAY) return "Yesterday";
  if (diff < 7 * DAY) {
    const d = Math.floor(diff / DAY);
    return `${d} days ago`;
  }
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

interface ContinueGameCardProps {
  match: MatchState;
  lastPlayed: number | null;
  onContinue: () => void;
  onNewGame: () => void;
}

/**
 * Landing-screen card offering to resume an unfinished saved game.
 * Renders inside the home screen's action column (no outer wrapper).
 */
export default function ContinueGameCard({
  match,
  lastPlayed,
  onContinue,
  onNewGame,
}: ContinueGameCardProps) {
  const numRounds = totalRounds(match.playerCount);

  return (
    <>
      {/* Saved-game summary */}
      <div className="bg-gray-800/80 border border-gray-700 rounded-2xl p-5">
        <p className="text-xs uppercase tracking-widest text-yellow-500/80 mb-3">
          Continue Previous Game
        </p>
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="text-white font-bold text-lg leading-none">
              Round {match.roundNumber}
              <span className="text-gray-500 font-medium text-sm"> of {numRounds}</span>
            </span>
            <span className="text-gray-400 text-sm mt-1">{match.playerCount} players</span>
          </div>
          <div className="text-right">
            <span className="text-gray-500 text-[11px] uppercase tracking-wide">Last played</span>
            <p className="text-gray-300 text-sm mt-0.5">{formatLastPlayed(lastPlayed)}</p>
          </div>
        </div>
      </div>

      {/* Continue — primary CTA */}
      <button
        onClick={onContinue}
        className="w-full py-[18px] bg-yellow-500 hover:bg-yellow-400 active:scale-[0.98] rounded-2xl text-gray-900 font-black text-lg tracking-wide transition-all shadow-xl shadow-yellow-500/20"
      >
        Continue
      </button>

      {/* New Game — secondary */}
      <button
        onClick={onNewGame}
        className="w-full py-[18px] border-2 border-gray-700 hover:border-gray-500 active:scale-[0.98] rounded-2xl text-white font-bold text-lg transition-all"
      >
        New Game
      </button>
    </>
  );
}
