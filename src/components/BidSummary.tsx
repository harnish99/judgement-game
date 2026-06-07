import type { GameState } from "@/game/types";
import { SUIT_SYMBOLS, SUIT_COLORS_ON_DARK as SUIT_COLORS } from "@/game/suits";

interface BidSummaryProps {
  game: GameState;
  roundNumber: number;
  onStartRound: () => void;
  /** When false, hides the Start Round button and shows a waiting message. Defaults to true. */
  canStart?: boolean;
}

export default function BidSummary({ game, roundNumber, onStartRound, canStart = true }: BidSummaryProps) {
  const { players, bids, trump, bidOrder, cardsPerPlayer } = game;
  const totalBids = Object.values(bids).reduce<number>((s, b) => s + (b ?? 0), 0);
  const diff = totalBids - cardsPerPlayer;

  return (
    <div className="flex-1 w-full flex flex-col items-center gap-4 max-w-lg mx-auto px-2">
      <div className="w-full bg-gray-800 rounded-2xl p-5">
        <h2 className="text-lg font-bold text-white text-center mb-0.5">Bids placed</h2>
        <p className="text-xs text-center text-gray-400 mb-1">
          Round {roundNumber} · {cardsPerPlayer} card{cardsPerPlayer !== 1 ? "s" : ""} each
        </p>
        <p className={`text-xs text-center mb-4 font-semibold ${SUIT_COLORS[trump]}`}>
          Trump: {SUIT_SYMBOLS[trump]} {trump.charAt(0).toUpperCase() + trump.slice(1)}
        </p>

        <div className="space-y-2 mb-5">
          {bidOrder.map((pid) => {
            const player = players.find((p) => p.id === pid)!;
            const bid = bids[pid] ?? 0;
            return (
              <div key={pid} className="flex items-center justify-between bg-gray-700/60 rounded-xl px-4 py-2">
                <span className={`font-semibold ${player.isHuman ? "text-yellow-300" : "text-gray-200"}`}>
                  {player.name}
                </span>
                <span className="text-white font-bold text-lg">{bid}</span>
              </div>
            );
          })}
        </div>

        <div className="border-t border-gray-700 pt-3 mb-5">
          <div className="flex items-center justify-between px-1">
            <span className="text-gray-400 text-sm">Total bids</span>
            <span className="text-white font-bold">{totalBids} / {cardsPerPlayer}</span>
          </div>
          <p className={`text-xs text-center mt-1 ${
            diff === 0 ? "text-red-400" : diff > 0 ? "text-orange-400" : "text-green-400"
          }`}>
            {diff === 0
              ? "Exactly covered — some bids will fail!"
              : diff > 0
              ? `Over by ${diff} — competition for tricks`
              : `Under by ${Math.abs(diff)} — ${Math.abs(diff)} trick${Math.abs(diff) !== 1 ? "s" : ""} will go unwon`}
          </p>
        </div>

        {canStart ? (
          <button
            onClick={onStartRound}
            className="w-full py-3 bg-yellow-500 hover:bg-yellow-400 active:bg-yellow-600 text-gray-900 font-bold rounded-full text-base transition-colors shadow-lg"
          >
            Start Round
          </button>
        ) : (
          <p className="text-center text-sm text-gray-500 py-2 flex items-center justify-center gap-2">
            <span className="animate-pulse">⏳</span> Waiting for host to start round…
          </p>
        )}
      </div>
    </div>
  );
}
