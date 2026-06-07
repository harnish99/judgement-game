import type { GameState } from "@/game/types";
import { SUIT_SYMBOLS, SUIT_COLORS_ON_DARK as SUIT_COLORS } from "@/game/suits";

interface RoundSummaryProps {
  game: GameState;
  onPlayAgain: () => void;
}

export default function RoundSummary({ game, onPlayAgain }: RoundSummaryProps) {
  const { players, bids, tricksWon, trump } = game;

  // Sort: hits first, then by tricks won descending
  const sorted = [...players].sort((a, b) => {
    const aHit = tricksWon[a.id] === bids[a.id] ? 1 : 0;
    const bHit = tricksWon[b.id] === bids[b.id] ? 1 : 0;
    if (aHit !== bHit) return bHit - aHit;
    return (tricksWon[b.id] ?? 0) - (tricksWon[a.id] ?? 0);
  });

  const humanHit = tricksWon[0] === bids[0];

  return (
    <div className="flex-1 w-full flex flex-col items-center gap-4 max-w-lg mx-auto px-2">
      {/* Outcome banner */}
      <div
        className={`w-full rounded-2xl p-4 text-center ${
          humanHit ? "bg-green-900/60 border border-green-700" : "bg-red-900/40 border border-red-800"
        }`}
      >
        <p className="text-2xl font-bold mb-1">
          {humanHit ? "Bid made! 🎉" : "Bid missed"}
        </p>
        <p className="text-sm text-gray-300">
          You bid <span className="font-bold text-white">{bids[0] ?? 0}</span> and won{" "}
          <span className="font-bold text-white">{tricksWon[0]}</span> trick
          {tricksWon[0] !== 1 ? "s" : ""}
        </p>
        <p className={`text-xs mt-1 font-semibold ${SUIT_COLORS[trump]}`}>
          Trump was {SUIT_SYMBOLS[trump]} {trump.charAt(0).toUpperCase() + trump.slice(1)}
        </p>
      </div>

      {/* Results table */}
      <div className="w-full bg-gray-800 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-4 text-xs text-gray-400 uppercase tracking-wider px-4 py-2 border-b border-gray-700">
          <span className="col-span-2">Player</span>
          <span className="text-center">Bid</span>
          <span className="text-center">Won</span>
        </div>

        <div className="divide-y divide-gray-700">
          {sorted.map((player) => {
            const bid = bids[player.id] ?? 0;
            const won = tricksWon[player.id] ?? 0;
            const hit = won === bid;

            return (
              <div
                key={player.id}
                className={`grid grid-cols-4 items-center px-4 py-3 ${
                  player.isHuman ? "bg-gray-700/40" : ""
                }`}
              >
                <div className="col-span-2 flex items-center gap-2">
                  <span
                    className={`text-base ${hit ? "text-green-400" : "text-red-400"}`}
                    aria-hidden
                  >
                    {hit ? "✓" : "✗"}
                  </span>
                  <span
                    className={`font-semibold ${player.isHuman ? "text-yellow-300" : "text-gray-200"}`}
                  >
                    {player.name}
                  </span>
                </div>
                <span className="text-center text-gray-300 font-medium">{bid}</span>
                <span
                  className={`text-center font-bold ${
                    hit ? "text-green-400" : won > bid ? "text-orange-400" : "text-red-400"
                  }`}
                >
                  {won}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <button
        onClick={onPlayAgain}
        className="w-full max-w-lg py-3 bg-yellow-500 hover:bg-yellow-400 active:bg-yellow-600 text-gray-900 font-bold rounded-full text-base transition-colors shadow-lg"
      >
        Play Again
      </button>
    </div>
  );
}
