"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { Card as CardType } from "@/game/types";
import Card from "./Card";

interface HandProps {
  cards: CardType[];
  faceDown?: boolean;
  vertical?: boolean;
  small?: boolean;
  validIndices?: number[];
  onCardClick?: (index: number) => void;
  /** Direction a played card exits toward (toward the table). */
  cardExitOffset?: { x?: number; y?: number; opacity?: number };
}

export default function Hand({
  cards,
  faceDown = false,
  vertical = false,
  small = false,
  validIndices,
  onCardClick,
  cardExitOffset = { y: -36, opacity: 0 },
}: HandProps) {
  const isPlayable = !!onCardClick;

  if (vertical) {
    // AI side hands — face-down stacked, simple fade on removal
    return (
      <div className="flex flex-col items-center">
        <AnimatePresence initial={false}>
          {cards.map((card, i) => (
            <motion.div
              key={`${card.suit}-${card.rank}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.2 } }}
              style={{ marginTop: i === 0 ? 0 : "-32px" }}
            >
              <Card card={card} faceDown={faceDown} small />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    );
  }

  // Horizontal hand — layout animation closes the gap; played card exits toward table
  return (
    <div className="flex flex-row items-end justify-center">
      <AnimatePresence mode="popLayout" initial={false}>
        {cards.map((card, i) => {
          const valid = !validIndices || validIndices.includes(i);
          return (
            <motion.div
              key={`${card.suit}-${card.rank}`}
              layout
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } }}
              exit={{
                ...cardExitOffset,
                transition: { duration: 0.3, ease: "easeIn" },
              }}
              style={{ marginLeft: i === 0 ? 0 : "-20px" }}
            >
              <Card
                card={card}
                faceDown={faceDown}
                small={small}
                onClick={isPlayable && valid ? () => onCardClick(i) : undefined}
                dimmed={isPlayable && !valid}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
