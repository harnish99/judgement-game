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

// Inline colors — never affected by Tailwind purging.
// Traditional two-color deck: red for hearts/diamonds, near-black for clubs/spades.
const SUIT_COLOR_VALUES: Record<string, string> = {
  hearts: "#dc2626",   // red-600
  diamonds: "#dc2626", // red-600
  clubs: "#1e293b",    // slate-800
  spades: "#1e293b",   // slate-800
};

export default function Card({ card, faceDown = false, small = false, onClick, highlighted, dimmed }: CardProps) {
  const interactive = !!onClick;
  const base = small
    ? "relative w-8 h-12 rounded shadow-md border flex-shrink-0 select-none"
    : "relative w-14 h-20 sm:w-16 sm:h-24 rounded-lg shadow-md border flex-shrink-0 select-none";

  const interactiveClasses = interactive
    ? "cursor-pointer transition-transform duration-100 hover:-translate-y-2 active:scale-95"
    : "";

  const highlightClass = highlighted ? "ring-2 ring-yellow-400 -translate-y-2" : "";
  const dimClass = dimmed ? "opacity-40" : "";
  const borderClass = faceDown || !card ? "border-blue-600" : "border-gray-200";

  if (faceDown || !card) {
    return (
      <div className={`${base} ${borderClass} ${interactiveClasses} ${dimClass} bg-blue-700 flex items-center justify-center`} onClick={onClick}>
        <div className="w-full h-full rounded-lg bg-blue-800 m-0.5 border border-blue-600" />
      </div>
    );
  }

  const symbol = SUIT_SYMBOLS[card.suit];
  const suitColor = SUIT_COLOR_VALUES[card.suit];

  return (
    <div
      className={`${base} ${borderClass} ${interactiveClasses} ${highlightClass} ${dimClass} bg-white flex flex-col`}
      onClick={onClick}
    >
      {/* Top-left corner: rank + suit */}
      <div
        className={`absolute top-0.5 left-1 leading-none ${small ? "text-[9px]" : "text-xs"}`}
        style={{ color: suitColor }}
      >
        <div className="font-bold leading-tight">{card.rank}</div>
        <div className="leading-tight">{symbol}</div>
      </div>

      {/* Bottom-right corner: rank + suit (rotated) */}
      <div
        className={`absolute bottom-0.5 right-1 leading-none rotate-180 ${small ? "text-[9px]" : "text-xs"}`}
        style={{ color: suitColor }}
      >
        <div className="font-bold leading-tight">{card.rank}</div>
        <div className="leading-tight">{symbol}</div>
      </div>

      {/* Large center suit — main legibility cue */}
      <div
        className={`m-auto leading-none select-none ${small ? "text-2xl" : "text-4xl"}`}
        style={{ color: suitColor }}
      >
        {symbol}
      </div>
    </div>
  );
}
