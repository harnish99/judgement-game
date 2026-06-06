import type { Player } from "@/game/types";
import Hand from "./Hand";

interface PlayerAreaProps {
  player: Player;
  position: "top" | "left" | "right" | "bottom";
  isCurrentTurn?: boolean;
  tricksWon?: number;
  bid?: number;
  matchScore?: number;
  validIndices?: number[];
  onCardClick?: (index: number) => void;
}

// Direction a played card exits toward the center table
const EXIT_OFFSETS: Record<string, { x?: number; y?: number; opacity: number }> = {
  top:    { y: 40,  opacity: 0 },
  bottom: { y: -40, opacity: 0 },
  left:   { x: 40,  opacity: 0 },
  right:  { x: -40, opacity: 0 },
};

export default function PlayerArea({
  player,
  position,
  isCurrentTurn,
  tricksWon,
  bid,
  matchScore,
  validIndices,
  onCardClick,
}: PlayerAreaProps) {
  const faceDown = !player.isHuman;

  const label = (
    <div
      className={`flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap transition-colors ${
        isCurrentTurn ? "bg-yellow-500 text-gray-900" : "bg-gray-700 text-gray-300"
      }`}
    >
      <span>{player.name}</span>
      {tricksWon !== undefined && (
        <span className={`font-bold ${isCurrentTurn ? "text-gray-900" : "text-white"}`}>
          {tricksWon}{bid !== undefined ? `/${bid}` : ""}
        </span>
      )}
      {matchScore !== undefined && (
        <span className={`text-xs ${isCurrentTurn ? "text-gray-700" : "text-gray-500"}`}>
          ({matchScore})
        </span>
      )}
    </div>
  );

  if (position === "top") {
    return (
      <div className="flex flex-col items-center gap-1 w-full px-2">
        {label}
        <Hand cards={player.hand} faceDown={faceDown} small cardExitOffset={EXIT_OFFSETS.top} />
      </div>
    );
  }

  if (position === "bottom") {
    return (
      <div className="flex flex-col items-center gap-2 w-full px-2">
        <Hand
          cards={player.hand}
          faceDown={faceDown}
          validIndices={validIndices}
          onCardClick={onCardClick}
          cardExitOffset={EXIT_OFFSETS.bottom}
        />
        {label}
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center gap-1 ${position === "left" ? "mr-1" : "ml-1"}`}>
      {position === "right" && label}
      <Hand
        cards={player.hand}
        faceDown={faceDown}
        vertical
        cardExitOffset={EXIT_OFFSETS[position]}
      />
      {position === "left" && label}
    </div>
  );
}
