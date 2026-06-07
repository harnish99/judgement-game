"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { Player, TrickCard } from "@/game/types";
import { SUIT_SYMBOLS, SUIT_COLORS_ON_DARK as SUIT_COLORS } from "@/game/suits";

interface TrickWinnerToastProps {
  visible: boolean;
  winner: Player | null;
  winningCard: TrickCard | null;
}

export default function TrickWinnerToast({ visible, winner, winningCard }: TrickWinnerToastProps) {
  const isHuman = winner?.isHuman ?? false;
  const cardStr = winningCard
    ? `${winningCard.card.rank}${SUIT_SYMBOLS[winningCard.card.suit]}`
    : "";
  const cardColor = winningCard ? SUIT_COLORS[winningCard.card.suit] : "text-white";

  const message = isHuman
    ? "🏆 You won the trick!"
    : `🏆 ${winner?.name} won with `;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="trick-toast"
          initial={{ opacity: 0, y: -12, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.95 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none"
        >
          <div className="bg-gray-900/90 border border-yellow-500/60 rounded-xl px-4 py-2 shadow-xl text-sm font-semibold text-white whitespace-nowrap">
            {message}
            {!isHuman && winningCard && (
              <span className={`font-bold ${cardColor}`}>{cardStr}</span>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
