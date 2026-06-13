"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { Player, PlayerCount, Suit, TrickCard } from "@/game/types";
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

// ─── Per-player-count grid positions (col, row — 1-indexed in a 3×3 grid) ────

type GridPos = { col: number; row: number };

const GRID_POS: Record<PlayerCount, Record<number, GridPos>> = {
  2: {
    1: { col: 2, row: 1 }, // north (opponent)
    0: { col: 2, row: 3 }, // south (human)
  },
  3: {
    1: { col: 2, row: 1 }, // north
    2: { col: 3, row: 2 }, // east
    0: { col: 2, row: 3 }, // south (human)
  },
  4: {
    1: { col: 2, row: 1 }, // north
    2: { col: 1, row: 2 }, // west
    3: { col: 3, row: 2 }, // east
    0: { col: 2, row: 3 }, // south (human)
  },
  5: {
    2: { col: 1, row: 1 }, // north-west
    1: { col: 2, row: 1 }, // north
    3: { col: 3, row: 1 }, // north-east
    4: { col: 3, row: 2 }, // east
    0: { col: 2, row: 3 }, // south (human)
  },
  6: {
    2: { col: 1, row: 1 }, // north-west
    1: { col: 2, row: 1 }, // north
    3: { col: 3, row: 1 }, // north-east
    4: { col: 1, row: 2 }, // west
    5: { col: 3, row: 2 }, // east
    0: { col: 2, row: 3 }, // south (human)
  },
};

// ─── Card entry directions ────────────────────────────────────────────────────

type Delta = { x?: number; y?: number };

const ENTER_FROM: Record<PlayerCount, Record<number, Delta>> = {
  2: { 1: { y: -48 }, 0: { y: 48 } },
  3: { 1: { y: -48 }, 2: { x: 48 },  0: { y: 48 } },
  4: { 1: { y: -48 }, 2: { x: -48 }, 3: { x: 48 },  0: { y: 48 } },
  5: {
    2: { x: -48, y: -48 }, 1: { y: -48 }, 3: { x: 48, y: -48 },
    4: { x: 48 },           0: { y: 48 },
  },
  6: {
    2: { x: -48, y: -48 }, 1: { y: -48 }, 3: { x: 48, y: -48 },
    4: { x: -48 },         5: { x: 48 },  0: { y: 48 },
  },
};

// ─── Exit directions (cards fly toward winner's position) ─────────────────────

type ExitDelta = { x?: number; y?: number; opacity: number };

const EXIT_TOWARD: Record<PlayerCount, Record<number, ExitDelta>> = {
  2: { 1: { y: -64, opacity: 0 }, 0: { y: 64, opacity: 0 } },
  3: { 1: { y: -64, opacity: 0 }, 2: { x: 64, opacity: 0 },  0: { y: 64, opacity: 0 } },
  4: { 1: { y: -64, opacity: 0 }, 2: { x: -64, opacity: 0 }, 3: { x: 64, opacity: 0 }, 0: { y: 64, opacity: 0 } },
  5: {
    2: { x: -64, y: -64, opacity: 0 }, 1: { y: -64, opacity: 0 }, 3: { x: 64, y: -64, opacity: 0 },
    4: { x: 64, opacity: 0 },          0: { y: 64, opacity: 0 },
  },
  6: {
    2: { x: -64, y: -64, opacity: 0 }, 1: { y: -64, opacity: 0 }, 3: { x: 64, y: -64, opacity: 0 },
    4: { x: -64, opacity: 0 },        5: { x: 64, opacity: 0 },   0: { y: 64, opacity: 0 },
  },
};

const COL_CLASS = ["", "col-start-1", "col-start-2", "col-start-3"] as const;
const ROW_CLASS = ["", "row-start-1", "row-start-2", "row-start-3"] as const;

export default function TrickArea({
  trick, trump, phase, lastTrickWinner, players, trickNumber,
}: TrickAreaProps) {
  const playerCount = (players.length as PlayerCount) in GRID_POS
    ? (players.length as PlayerCount)
    : 4;

  const trickMap = new Map(trick.map((tc) => [tc.playerId, tc]));
  const winnerName = lastTrickWinner !== null
    ? (players.find((p) => p.id === lastTrickWinner)?.name ?? "")
    : null;

  const isBetweenTricks = phase === "between-tricks";
  const gridPositions = GRID_POS[playerCount];
  const enterFrom = ENTER_FROM[playerCount];
  const exitToward = EXIT_TOWARD[playerCount];

  const exitOffset: ExitDelta =
    lastTrickWinner !== null && exitToward[lastTrickWinner]
      ? exitToward[lastTrickWinner]
      : { opacity: 0 };

  return (
    <div className="flex flex-col items-center gap-1">
      {/* Trump indicator */}
      <div className="flex items-center gap-1 text-xs">
        <span className="text-gray-400">Trump:</span>
        <span className={`font-bold text-sm ${SUIT_COLORS[trump]}`}>
          {SUIT_SYMBOLS[trump]} {trump}
        </span>
      </div>

      {/* 3×3 grid — player cards at compass positions, center = winner label */}
      <div className="grid grid-cols-3 grid-rows-3 gap-1 w-36 h-36">
        {players.map((p) => {
          const pos = gridPositions[p.id];
          if (!pos) return null;
          const tc = trickMap.get(p.id);
          const enter = enterFrom[p.id] ?? {};

          return (
            <div
              key={p.id}
              className={`${COL_CLASS[pos.col]} ${ROW_CLASS[pos.row]} flex items-center justify-center`}
            >
              {/* Placeholder when no card played yet */}
              {!tc && (
                <div className="w-8 h-12 rounded border border-dashed border-gray-600 opacity-30" />
              )}

              <AnimatePresence mode="sync">
                {tc && (
                  <motion.div
                    key={`${trickNumber}-${tc.card.suit}-${tc.card.rank}`}
                    initial={{ ...enter, opacity: 0, scale: 0.85 }}
                    animate={{
                      x: 0,
                      y: 0,
                      opacity: 1,
                      scale: isBetweenTricks && p.id === lastTrickWinner ? 1.15 : 1,
                      filter:
                        isBetweenTricks && p.id === lastTrickWinner
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
