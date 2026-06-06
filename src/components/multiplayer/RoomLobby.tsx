"use client";

import { useState } from "react";
import type { MultiplayerPlayer, Room, ConnectionStatus } from "@/lib/multiplayer/types";
import ConnectionStatusBadge from "./ConnectionStatus";
import PlayerSlot from "./PlayerSlot";

interface RoomLobbyProps {
  room: Room;
  players: MultiplayerPlayer[];
  currentPlayer: MultiplayerPlayer;
  connectionStatus: ConnectionStatus;
  onStart: () => Promise<void>;
  onLeave: () => Promise<void>;
}

export default function RoomLobby({
  room,
  players,
  currentPlayer,
  connectionStatus,
  onStart,
  onLeave,
}: RoomLobbyProps) {
  const [starting, setStarting] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const connectedPlayers = players.filter((p) => p.status === "connected");
  const isHost = currentPlayer.isHost;
  const canStart = isHost && connectedPlayers.length === room.maxPlayers;
  const playersNeeded = room.maxPlayers - connectedPlayers.length;

  async function handleStart() {
    setStarting(true);
    setStartError(null);
    try {
      await onStart();
    } catch (err) {
      setStartError(err instanceof Error ? err.message : "Could not start game. Please try again.");
    } finally {
      setStarting(false);
    }
  }

  async function handleLeave() {
    setLeaving(true);
    await onLeave();
    setLeaving(false);
  }

  function copyCode() {
    navigator.clipboard.writeText(room.code)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {
        // Fallback for browsers that deny clipboard-write permission
        try {
          const el = document.createElement("textarea");
          el.value = room.code;
          el.style.cssText = "position:fixed;opacity:0;pointer-events:none";
          document.body.appendChild(el);
          el.select();
          document.execCommand("copy");
          document.body.removeChild(el);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          // Both methods failed — silently ignore
        }
      });
  }

  // Build a stable 4-slot array keyed by seat index
  const seats = Array.from({ length: room.maxPlayers }, (_, i) =>
    players.find((p) => p.playerOrder === i && p.status !== "disconnected") ??
    players.find((p) => p.playerOrder === i) ?? undefined
  );

  return (
    <div className="flex flex-col gap-5 w-full max-w-sm mx-auto">
      {/* Room code card */}
      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5 flex flex-col items-center gap-3">
        <p className="text-xs text-gray-500 uppercase tracking-widest">Room Code</p>
        <button
          onClick={copyCode}
          className="group flex items-center gap-3"
          aria-label="Copy room code"
        >
          <span className="font-mono text-4xl font-bold tracking-[0.25em] text-yellow-400 group-hover:text-yellow-300 transition-colors">
            {room.code}
          </span>
          <span className="text-gray-600 group-hover:text-gray-400 transition-colors text-sm">
            {copied ? "✓" : "⎘"}
          </span>
        </button>
        {copied && (
          <p className="text-xs text-green-400 -mt-1">Copied to clipboard!</p>
        )}
        <p className="text-xs text-gray-500 text-center">
          Share this code with friends — they can join from the lobby
        </p>
      </div>

      {/* Connection status + player count */}
      <div className="flex items-center justify-between px-1">
        <ConnectionStatusBadge status={connectionStatus} />
        <span className="text-xs text-gray-500">
          {connectedPlayers.length} / {room.maxPlayers} players
        </span>
      </div>

      {/* Player list */}
      <div className="flex flex-col gap-2">
        {seats.map((player, i) => (
          <PlayerSlot
            key={player?.id ?? `empty-${i}`}
            player={player}
            seatIndex={i}
            isCurrentPlayer={player?.id === currentPlayer.id}
          />
        ))}
      </div>

      {/* Host controls */}
      {isHost && (
        <div className="flex flex-col gap-2">
          <button
            onClick={handleStart}
            disabled={!canStart || starting}
            className={`w-full py-3.5 rounded-2xl font-bold text-sm transition-all ${
              canStart && !starting
                ? "bg-yellow-500 hover:bg-yellow-400 active:bg-yellow-600 text-gray-900 shadow-lg shadow-yellow-500/20"
                : "bg-gray-700 text-gray-500 cursor-not-allowed"
            }`}
          >
            {starting ? "Starting…" : "Start Game"}
          </button>
          {!canStart && (
            <p className="text-xs text-gray-500 text-center">
              Waiting for {playersNeeded} more player{playersNeeded !== 1 ? "s" : ""} to join
            </p>
          )}
          {startError && (
            <p className="text-xs text-red-400 text-center bg-red-900/20 border border-red-900/40 rounded-xl px-3 py-2">
              {startError}
            </p>
          )}
        </div>
      )}

      {!isHost && (
        <div className="flex items-center justify-center gap-2 py-2 text-sm text-gray-500">
          <span className="animate-pulse">⏳</span>
          Waiting for the host to start the game…
        </div>
      )}

      {/* Leave button */}
      <button
        onClick={handleLeave}
        disabled={leaving}
        className="w-full py-2.5 rounded-xl border border-red-900/40 text-red-500 hover:bg-red-900/20 text-sm font-medium transition-colors"
      >
        {leaving ? "Leaving…" : "Leave Room"}
      </button>
    </div>
  );
}
