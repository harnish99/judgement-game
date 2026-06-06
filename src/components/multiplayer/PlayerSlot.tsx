"use client";

import type { MultiplayerPlayer } from "@/lib/multiplayer/types";

interface PlayerSlotProps {
  player?: MultiplayerPlayer;
  seatIndex: number;
  isCurrentPlayer?: boolean;
}

const SEAT_LABELS = ["You", "Player 2", "Player 3", "Player 4"];

export default function PlayerSlot({
  player,
  seatIndex,
  isCurrentPlayer = false,
}: PlayerSlotProps) {
  // ── Empty seat ──────────────────────────────────────────────────────────────
  if (!player) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-gray-700 opacity-50">
        <div className="w-9 h-9 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-gray-600 text-sm font-bold flex-shrink-0">
          {seatIndex + 1}
        </div>
        <span className="text-sm text-gray-600 italic">Waiting for player…</span>
      </div>
    );
  }

  const isDisconnected = player.status === "disconnected";

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
        isCurrentPlayer
          ? "border-yellow-500/50 bg-yellow-500/5"
          : "border-gray-700 bg-gray-800/50"
      } ${isDisconnected ? "opacity-60" : ""}`}
    >
      {/* Avatar */}
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
          isCurrentPlayer
            ? "bg-yellow-500 text-gray-900"
            : "bg-gray-700 text-gray-300"
        }`}
      >
        {player.name.charAt(0).toUpperCase()}
      </div>

      {/* Name + badges */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className={`text-sm font-semibold truncate ${
              isCurrentPlayer ? "text-yellow-400" : "text-white"
            }`}
          >
            {player.name}
          </span>
          {isCurrentPlayer && (
            <span className="text-[10px] font-bold bg-yellow-500/20 text-yellow-400 rounded-full px-1.5 py-0.5 leading-none">
              YOU
            </span>
          )}
          {player.isHost && (
            <span className="text-[10px] font-bold bg-purple-500/20 text-purple-400 rounded-full px-1.5 py-0.5 leading-none">
              HOST
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 mt-0.5">
          <span
            className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
              isDisconnected ? "bg-red-500" : "bg-green-400"
            }`}
          />
          <span className="text-[11px] text-gray-500">
            {isDisconnected ? "Reconnecting…" : "Connected"}
          </span>
        </div>
      </div>

      {/* Seat number */}
      <span className="text-xs text-gray-600 flex-shrink-0">
        Seat {player.playerOrder + 1}
      </span>
    </div>
  );
}
