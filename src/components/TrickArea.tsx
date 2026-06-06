"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { Player, Suit, TrickCard } from "@/game/types";
import Card from "./Card";

interface TrickAreaProps {
  trick: TrickCard[];
  trump: Suit;
  phase: string;
  lastTrickWinner: number | null;
  players: Player[];
  trickNumber: number;
}

const SUIT_SYMBOLS: Record<Suit, string> = {
  hearts: "♥", diamonds: "♦", clubs: "♣", spades: "♠",
};
const SUIT_COLORS: Record<Suit, string> = {
  hearts: "text-red-500", diamonds: "text-red-500",
  clubs: "text-gray-300", spades: "text-gray-300",
};

// Grid placement for each player (compass positions)
const PLAYER_SLOT: Record<number, { gridCol: string; gridRow: string }> = {
  1: { gridCol: "col-start-2", gridRow: "row-start-1" }, // north
  2: { gridCol: "col-start-1", gridRow: "row-start-2" }, // west
  0: { gridCol: "col-start-2", gridRow: "row-start-3" }, // south (human)
  3: { gridCol: "col-start-3", gridRow: "row-start-2" }, // east
};

// Each player's card enters FROM their direction
const ENTER_FROM: Record<number, { x?: number; y?: number }> = {
  0: { y: 48 },    // south → slide up
  1: { y: -48 },   // north → slide down
  2: { x: -48 },   // west → slide right
  3: { x: 48 },    // east → slide left
};

// Cards exit TOWARD the winner's position
const EXIT_TOWARD: Record<number, { x?: number; y?: number; opacity: number }> = {
  0: { y: 64,  opacity: 0 },
  1: { y: -64, opacity: 0 },
  2: { x: -64, opacity: 0 },
  3: { x: 64,  opacity: 0 },
};

export default function TrickArea({
  trick, trump, phase, lastTrickWinner, players, trickNumber,
}: TrickAreaProps) {
  const trickMap = new Map(trick.map((tc) => [tc.playerId, tc]));
  const winnerName = lastTrickWinner !== null
    ? (players.find((p) => p.id === lastTrickWinner)?.name ?? "")
    : null;

  const isBetweenTricks = phase === "between-tricks";
  const exitOffset: { x?: number; y?: number; opacity: number } =
    lastTrickWinner !== null ? EXIT_TOWARD[lastTrickWinner] : { opacity: 0 };

  return (
    <div className="flex flex-col items-center gap-1">
      {/* Trump indicator */}
      <div className="flex items-center gap-1 text-xs">
        <span className="text-gray-400">Trump:</span>
        <span className={`font-bold text-sm ${SUIT_COLORS[trump]}`}>
          {SUIT_SYMBOLS[trump]} {trump}
        </span>
      </div>

      {/* 3×3 grid — N/S/E/W cards, center for winner label */}
      <div className="grid grid-cols-3 grid-rows-3 gap-1 w-36 h-36">
        {[0, 1, 2, 3].map((pid) => {
          const slot = PLAYER_SLOT[pid];
          const tc = trickMap.get(pid);

          return (
            <div
              key={pid}
              className={`${slot.gridCol} ${slot.gridRow} flex items-center justify-center`}
            >
              {/* Placeholder when no card played yet */}
              {!tc && (
                <div className="w-8 h-12 rounded border border-dashed border-gray-600 opacity-30" />
              )}

              <AnimatePresence mode="sync">
                {tc && (
                  <motion.div
                    // Unique key across all tricks so each card gets its own animation
                    key={`${trickNumber}-${tc.card.suit}-${tc.card.rank}`}
                    initial={{ ...ENTER_FROM[pid], opacity: 0, scale: 0.85 }}
                    animate={{
                      x: 0,
                      y: 0,
                      opacity: 1,
                      scale: isBetweenTricks && pid === lastTrickWinner ? 1.15 : 1,
                      filter:
                        isBetweenTricks && pid === lastTrickWinner
                          ? [
                              "drop-shadow(0 0 0px rgba(234,179,8,0))",
                              "drop-shadow(0 0 10px rgba(234,179,8,0.95))",
                              "drop-shadow(0 0 6px rgba(234,179,8,0.7))",
                            ]
                          : "drop-shadow(0 0 0px rgba(0,0,0,0))",
                    }}
                    exit={exitOffset}
                    transition={{
                      duration: 0.32,
                      ease: "easeOut",
                      filter: { duration: 0.5, repeat: Infinity, repeatType: "mirror" },
                      scale: { duration: 0.3 },
                    }}
                  >
                    <Card card={tc.card} small />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {/* Center: winner label */}
        <div className="col-start-2 row-start-2 flex items-center justify-center">
          <AnimatePresence mode="wait">
            {isBetweenTricks && winnerName !== null && (
              <motion.div
                key="winner-label"
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                transition={{ duration: 0.25 }}
                className="text-yellow-400 text-xs font-bold text-center leading-tight"
              >
                {winnerName}
                <br />wins
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
