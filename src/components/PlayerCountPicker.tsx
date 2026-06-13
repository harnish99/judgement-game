"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { PlayerCount } from "@/game/types";
import { totalRounds } from "@/game/match";

/**
 * PlayerCountPicker
 *
 * A −/+ stepper for choosing how many players are at the table (2–6), paired
 * with a live schematic of seats appearing/disappearing around a mini card
 * table. "You" is always pinned to the bottom seat; opponents fill the
 * remaining seats evenly around the table. Replaces the old 5-button grid
 * with something more tactile and on-theme for a card game.
 *
 * Geometry (table size + seat coordinates) is set with inline styles rather
 * than Tailwind utilities so the layout can't break on arbitrary/one-off
 * classes, and each seat's centering transform lives on an outer wrapper so
 * framer-motion's animated `transform` (scale) can't clobber it.
 *
 * The round count is derived from totalRounds() so it can never drift from the
 * real match length.
 */

const MIN: PlayerCount = 2;
const MAX: PlayerCount = 6;

const TABLE_W = 184;
const TABLE_H = 120;

interface PlayerCountPickerProps {
  value: PlayerCount;
  onChange: (value: PlayerCount) => void;
  className?: string;
}

/** Seat centers (px) within the table box, evenly spaced, "you" at the bottom. */
function seatPositions(count: number) {
  return Array.from({ length: count }, (_, i) => {
    // 90° points down (screen y grows downward) so seat 0 (you) sits at the
    // bottom; remaining seats spread evenly clockwise around the ellipse.
    const angle = ((90 + (i * 360) / count) * Math.PI) / 180;
    return {
      id: i,
      x: TABLE_W / 2 + (TABLE_W / 2 - 16) * Math.cos(angle),
      y: TABLE_H / 2 + (TABLE_H / 2 - 14) * Math.sin(angle),
      isHuman: i === 0,
    };
  });
}

export default function PlayerCountPicker({ value, onChange, className = "" }: PlayerCountPickerProps) {
  const rounds = totalRounds(value);
  const canDec = value > MIN;
  const canInc = value < MAX;
  const dec = () => canDec && onChange((value - 1) as PlayerCount);
  const inc = () => canInc && onChange((value + 1) as PlayerCount);
  const seats = seatPositions(value);

  return (
    <div className={className}>
      {/* Stepper */}
      <div className="flex items-center justify-center gap-5">
        <StepButton symbol="−" ariaLabel="Remove a player" onClick={dec} disabled={!canDec} />
        <div className="w-20 text-center">
          <div className="text-4xl font-black text-white tabular-nums leading-none">{value}</div>
          <div className="text-xs text-gray-400 mt-1">
            {rounds} round{rounds !== 1 ? "s" : ""}
          </div>
        </div>
        <StepButton symbol="+" ariaLabel="Add a player" onClick={inc} disabled={!canInc} />
      </div>

      {/* Live table */}
      <div className="relative mx-auto mt-4" style={{ width: TABLE_W, height: TABLE_H }}>
        {/* Felt */}
        <div
          className="absolute"
          style={{
            inset: "14px 18px",
            borderRadius: "50%",
            background: "rgba(6, 78, 59, 0.35)",
            border: "1px solid rgba(4, 120, 87, 0.4)",
          }}
        />
        {/* Seats */}
        <AnimatePresence>
          {seats.map((s) => (
            <div
              key={s.id}
              className="absolute flex flex-col items-center"
              style={{ left: s.x, top: s.y, transform: "translate(-50%, -50%)" }}
            >
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 520, damping: 28 }}
                className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold shadow ${
                  s.isHuman
                    ? "bg-yellow-500 text-gray-900 ring-2 ring-yellow-300"
                    : "bg-gray-600 text-gray-200"
                }`}
              >
                {s.isHuman ? "♟" : s.id + 1}
              </motion.div>
              {s.isHuman && (
                <span className="mt-0.5 text-[9px] font-semibold text-yellow-400">You</span>
              )}
            </div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function StepButton({
  symbol,
  ariaLabel,
  onClick,
  disabled,
}: {
  symbol: string;
  ariaLabel: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      disabled={disabled}
      className={`flex h-12 w-12 items-center justify-center rounded-full text-2xl font-bold leading-none transition-all ${
        disabled
          ? "cursor-not-allowed bg-gray-800 text-gray-600"
          : "bg-gray-700 text-white hover:bg-yellow-500 hover:text-gray-900 active:scale-90"
      }`}
    >
      {symbol}
    </button>
  );
}
