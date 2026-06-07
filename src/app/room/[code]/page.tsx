"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useRoom } from "@/hooks/useRoom";
import RoomLobby from "@/components/multiplayer/RoomLobby";
import ConnectionStatusBadge from "@/components/multiplayer/ConnectionStatus";
import MultiplayerGame from "@/components/multiplayer/MultiplayerGame";
import { loadSession } from "@/lib/multiplayer/roomService";
import { initGameState } from "@/lib/multiplayer/gameService";
import type { PlayerCount } from "@/game/types";

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
    leave,
    start,
  } = useRoom();

  // Defer all session-dependent rendering until after hydration.
  // SSR sees connectionStatus:"idle" (no localStorage); client may start as
  // "reconnecting". Without this guard the two renders differ → hydration error.
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Set while an intentional leave is in flight, so the redirect guard below
  // doesn't race router.push("/") with its own router.replace("/lobby?…") —
  // leave() clears the session and flips connectionStatus to "idle", which
  // would otherwise make the guard think the session is just stale/missing
  // and fire a competing navigation (visible as a flicker, sometimes leaving
  // the user stranded on /lobby instead of the home page).
  const leavingRef = useRef(false);

  // ── Guard: redirect if room code doesn't match the stored session ────────────
  useEffect(() => {
    if (leavingRef.current) return;
    if (connectionStatus === "idle") {
      const session = loadSession();
      if (!session || session.roomCode.toUpperCase() !== code) {
        router.replace(`/lobby?code=${code}`);
      }
    }
  }, [connectionStatus, code, router]);

  // ── Host start handler: transition room + seed game state ───────────────────
  const handleStart = useCallback(async () => {
    if (!currentPlayer || !room) return;

    // 1. Mark room as playing in DB
    await start();

    // 2. Build player name list in seat order and initialize game state
    const sortedPlayers = [...players].sort((a, b) => a.playerOrder - b.playerOrder);
    const playerNames = sortedPlayers.map((p) => p.name);
    await initGameState(room.id, playerNames, room.maxPlayers as PlayerCount);
  }, [start, players, currentPlayer, room]);

  // ── Leave handler ────────────────────────────────────────────────────────────
  const handleLeave = useCallback(async () => {
    leavingRef.current = true;
    await leave();
    router.push("/");
  }, [leave, router]);

  // ── Pre-mount: purely static spinner so SSR and first client render match ────
  // SSR sees connectionStatus:"idle"; the client lazy-init may see "reconnecting".
  // Any dynamic content here would cause a hydration mismatch, so render nothing
  // but the spinner until useEffect has fired and we know the true state.
  if (!mounted) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
        <div className="w-10 h-10 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

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

  // ── Leaving ───────────────────────────────────────────────────────────────────
  // leave() clears the session and resets state to idle/null *before* the
  // router.push("/") in handleLeave resolves, which would otherwise make this
  // render fall into the error branch below for a frame ("Couldn't connect to
  // room" flashing right before navigating home). Show a neutral state instead.
  if (leavingRef.current) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
        <div className="w-10 h-10 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400 text-sm">Leaving room…</p>
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

  // ── Game in progress ──────────────────────────────────────────────────────────
  if (room?.status === "playing" && currentPlayer) {
    return (
      <MultiplayerGame
        roomId={room.id}
        myPlayerOrder={currentPlayer.playerOrder}
        isHost={currentPlayer.isHost}
        onLeave={handleLeave}
      />
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
        onStart={handleStart}
        onLeave={handleLeave}
      />
    </main>
  );
}
