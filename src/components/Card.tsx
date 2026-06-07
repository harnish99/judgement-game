import type { KeyboardEvent } from "react";
import type { Card as CardType } from "@/game/types";

interface CardProps {
  card?: CardType;
  faceDown?: boolean;
  small?: boolean;
  onClick?: () => void;
  highlighted?: boolean;
  dimmed?: boolean;
}

const SUIT_SYMBOLS: Record<string, string> = {
  hearts: "♥",
  diamonds: "♦",
  clubs: "♣",
  spades: "♠",
};

const SUIT_NAMES: Record<string, string> = {
  hearts: "hearts",
  diamonds: "diamonds",
  clubs: "clubs",
  spades: "spades",
};

// Shared interactive a11y props so clickable cards are keyboard-operable.
function interactiveProps(onClick: () => void, label: string) {
  return {
    role: "button" as const,
    tabIndex: 0,
    "aria-label": label,
    onClick,
    onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onClick();
      }
    },
  };
}

const SUIT_COLORS: Record<string, string> = {
  hearts: "text-red-600",
  diamonds: "text-red-600",
  clubs: "text-gray-900",
  spades: "text-gray-900",
};

export default function Card({ card, faceDown = false, small = false, onClick, highlighted, dimmed }: CardProps) {
  const interactive = !!onClick;
  const base = small
    ? "relative w-8 h-12 rounded shadow-md border flex-shrink-0 select-none"
    : "relative w-14 h-20 sm:w-16 sm:h-24 rounded-lg shadow-md border flex-shrink-0 select-none";

  const interactiveClasses = interactive
    ? "cursor-pointer transition-transform duration-100 hover:-translate-y-2 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 focus-visible:-translate-y-2"
    : "";

  const highlightClass = highlighted ? "ring-2 ring-yellow-400 -translate-y-2" : "";
  const dimClass = dimmed ? "opacity-40" : "";
  const borderClass = faceDown || !card ? "border-blue-600" : "border-gray-300";

  if (faceDown || !card) {
    // Face-down cards are never interactive (opponents' hands / placeholders).
    return (
      <div
        className={`${base} ${borderClass} ${dimClass} bg-blue-700 flex items-center justify-center`}
        aria-hidden="true"
      >
        <div className="w-full h-full rounded-lg bg-blue-800 m-0.5 border border-blue-600" />
      </div>
    );
  }

  const symbol = SUIT_SYMBOLS[card.suit];
  const color = SUIT_COLORS[card.suit];
  const a11y = interactive
    ? interactiveProps(onClick!, `Play ${card.rank} of ${SUIT_NAMES[card.suit]}`)
    : { "aria-label": `${card.rank} of ${SUIT_NAMES[card.suit]}` };

  return (
    <div
      className={`${base} ${borderClass} ${interactiveClasses} ${highlightClass} ${dimClass} bg-white flex flex-col`}
      {...a11y}
    >
      <div className={`absolute top-0.5 left-1 leading-none ${color} ${small ? "text-xs" : "text-sm"}`}>
        <div className="font-bold">{card.rank}</div>
        <div>{symbol}</div>
      </div>
      <div className={`absolute bottom-0.5 right-1 leading-none rotate-180 ${color} ${small ? "text-xs" : "text-sm"}`}>
        <div className="font-bold">{card.rank}</div>
        <div>{symbol}</div>
      </div>
      <div className={`m-auto ${color} ${small ? "text-lg" : "text-2xl"} font-bold`}>{symbol}</div>
    </div>
  );
}
