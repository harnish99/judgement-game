import type { ReactNode } from "react";
import type { GameState } from "@/game/types";
import { SUIT_SYMBOLS, SUIT_COLORS_ON_DARK as SUIT_COLORS } from "@/game/suits";
import Card from "./Card";

interface BiddingScreenProps {
  game: GameState;
  roundNumber: number;
  forbiddenBid: number | null;
  onBid: (bid: number) => void;
  /** Optional timer rendered inside the human bid panel (pass <TurnTimer />). */
  timerNode?: ReactNode;
}

export default function BiddingScreen({ game, roundNumber, forbiddenBid, onBid, timerNode }: BiddingScreenProps) {
  const { players, trump, trumpCard, bidOrder, biddingTurnIndex, bids, cardsPerPlayer } = game;
  const currentBidderId = bidOrder[biddingTurnIndex];
  const isHumanTurn = currentBidderId === 0;
  const human = players.find((p) => p.isHuman)!;

  // Bid buttons fit in rows of 7; extra row if more than 7 options
  const bidCount = cardsPerPlayer + 1;

  return (
    <div className="flex-1 w-full flex flex-col items-center gap-3 max-w-lg mx-auto px-2 overflow-y-auto">
      {/* Trump reveal */}
      <div className="w-full bg-gray-800 rounded-2xl p-4 flex items-center gap-4">
        <Card card={trumpCard} />
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">
            Round {roundNumber} · {cardsPerPlayer} card{cardsPerPlayer !== 1 ? "s" : ""} each
          </p>
          <p className="text-xs text-gray-400 mb-1">Trump suit</p>
          <p className={`text-2xl font-bold ${SUIT_COLORS[trump]}`}>
            {SUIT_SYMBOLS[trump]} {trump.charAt(0).toUpperCase() + trump.slice(1)}
          </p>
        </div>
      </div>

      {/* Bid table */}
      <div className="w-full bg-gray-800 rounded-2xl overflow-hidden">
        <div className="px-4 py-2 border-b border-gray-700">
          <p className="text-xs text-gray-400 uppercase tracking-wider">Bids</p>
        </div>
        <div className="divide-y divide-gray-700">
          {bidOrder.map((pid, idx) => {
            const player = players.find((p) => p.id === pid)!;
            const bid = bids[pid];
            const isActive = idx === biddingTurnIndex;
            const isDone = idx < biddingTurnIndex;

            return (
              <div
                key={pid}
                className={`flex items-center justify-between px-4 py-3 transition-colors ${
                  isActive ? "bg-yellow-500/10" : ""
                }`}
              >
                <div className="flex items-center gap-2">
                  {isActive
                    ? <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                    : <span className="w-2 h-2" />}
                  <span className={`font-semibold ${player.isHuman ? "text-yellow-300" : "text-gray-200"}`}>
                    {player.name}
                    {pid === bidOrder[bidOrder.length - 1] && (
                      <span className="ml-1 text-xs text-gray-500">(dealer)</span>
                    )}
                  </span>
                </div>
                <div className="text-right">
                  {isDone || (isActive && !isHumanTurn && bid !== undefined)
                    ? <span className="text-white font-bold text-lg">{bid}</span>
                    : isActive
                    ? <span className="text-yellow-400 text-sm animate-pulse">choosing…</span>
                    : <span className="text-gray-600">—</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Human bid selector */}
      {isHumanTurn && (
        <div className="w-full bg-gray-800 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-300">How many tricks will you win?</p>
            {timerNode}
          </div>
          <div className={`grid gap-2 ${bidCount <= 7 ? "grid-cols-7" : "grid-cols-7"}`}>
            {Array.from({ length: bidCount }, (_, i) => (
              <button
                key={i}
                onClick={() => onBid(i)}
                disabled={i === forbiddenBid}
                className={`py-2 rounded-lg font-bold text-sm transition-colors ${
                  i === forbiddenBid
                    ? "bg-gray-700 text-gray-600 cursor-not-allowed"
                    : "bg-gray-700 hover:bg-yellow-500 hover:text-gray-900 text-white active:scale-95"
                }`}
              >
                {i}
              </button>
            ))}
          </div>
          {forbiddenBid !== null && (
            <p className="text-xs text-red-400 text-center mt-2">
              {forbiddenBid} is not allowed — total bids cannot equal {cardsPerPlayer}
            </p>
          )}
        </div>
      )}

      {/* Your hand (read-only during bidding) */}
      <div className="w-full bg-gray-800 rounded-2xl p-4">
        <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">Your hand</p>
        <div className="flex flex-row justify-center">
          {human.hand.map((card, i) => (
            <div key={i} style={{ marginLeft: i === 0 ? 0 : "-18px" }}>
              <Card card={card} small />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
