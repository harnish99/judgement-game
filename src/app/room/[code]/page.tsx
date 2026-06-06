"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useRoom } from "@/hooks/useRoom";
import RoomLobby from "@/components/multiplayer/RoomLobby";
import ConnectionStatusBadge from "@/components/multiplayer/ConnectionStatus";
import { loadSession } from "@/lib/multiplayer/roomService";

export default function RoomPage() {
  const params = useParams<{ code: string }>();
  const code = params.code?.toUpperCase() ?? "";
  const router = useRouter();

  const {
    room,
    players,
    currentPlayer,
    connectionStatus,
    error,
    join,
    leave,
    start,
  } = useRoom();

  // ── Guard: redirect if room code doesn't match the stored session ────────────
  useEffect(() => {
    if (connectionStatus === "idle") {
      // No active session — check localStorage; if mismatch, go to lobby
      const session = loadSession();
      if (!session || session.roomCode.toUpperCase() !== code) {
        router.replace(`/lobby?code=${code}`);
      }
    }
  }, [connectionStatus, code, router]);

  // ── When room status moves to 'playing', navigate to the game ───────────────
  useEffect(() => {
    if (room?.status === "playing") {
      // Phase 2: router.push(`/game/${code}`)
      // For now, show a banner — gameplay sync not implemented yet
    }
  }, [room?.status, code, router]);

  // ── Loading / reconnecting ────────────────────────────────────────────────────
  if (connectionStatus === "reconnecting" || (connectionStatus === "connecting" && !room)) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
        <div className="w-10 h-10 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400 text-sm">
          {connectionStatus === "reconnecting" ? "Reconnecting to room…" : "Joining room…"}
        </p>
      </main>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────────
  if (connectionStatus === "error" || (!room && connectionStatus !== "connecting")) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-5 p-6 max-w-sm mx-auto text-center">
        <span className="text-4xl">⚠️</span>
        <h2 className="text-lg font-bold text-white">Couldn&apos;t connect to room</h2>
        <p className="text-sm text-gray-400">{error ?? "The room may have expired or doesn't exist."}</p>
        <button
          onClick={() => router.push("/lobby")}
          className="px-6 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold rounded-full text-sm transition-colors"
        >
          Back to Lobby
        </button>
      </main>
    );
  }

  // ── Game started banner ───────────────────────────────────────────────────────
  if (room?.status === "playing") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-5 p-6 max-w-sm mx-auto text-center">
        <span className="text-5xl">🃏</span>
        <h2 className="text-lg font-bold text-yellow-400">Game Starting…</h2>
        <p className="text-sm text-gray-400">
          Gameplay sync is coming in Phase 2. The room is ready with{" "}
          {players.filter((p) => p.status === "connected").length} players.
        </p>
        <ConnectionStatusBadge status={connectionStatus} />
      </main>
    );
  }

  // ── Waiting room ──────────────────────────────────────────────────────────────
  if (!room || !currentPlayer) return null;

  return (
    <main className="min-h-screen flex flex-col p-4 sm:p-6">
      {/* Header */}
      <div className="w-full flex items-center justify-between mb-6 flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-yellow-400 leading-none">Waiting Room</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Invite friends to join with your room code
          </p>
        </div>
        <ConnectionStatusBadge status={connectionStatus} />
      </div>

      <RoomLobby
        room={room}
        players={players}
        currentPlayer={currentPlayer}
        connectionStatus={connectionStatus}
        onStart={start}
        onLeave={async () => {
          await leave();
          router.push("/");
        }}
      />
    </main>
  );
}
