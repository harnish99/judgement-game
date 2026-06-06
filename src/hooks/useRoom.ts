"use client";

/**
 * useRoom — main multiplayer hook.
 *
 * Manages the full lifecycle of a multiplayer room:
 *   - Create / join / reconnect
 *   - Realtime subscription for player list and room status changes
 *   - Heartbeat (30 s interval)
 *   - Visibility-change and beforeunload disconnect signalling
 *   - Connection status tracking
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createRoom,
  joinRoom,
  leaveRoom,
  reconnectPlayer,
  sendHeartbeat,
  startGame,
  loadSession,
  clearSession,
  fetchPlayersByRoomId,
  fetchRoomById,
} from "@/lib/multiplayer/roomService";
import { subscribeToRoom } from "@/lib/multiplayer/realtimeService";
import type {
  ConnectionStatus,
  MultiplayerPlayer,
  Room,
  RoomState,
} from "@/lib/multiplayer/types";
import type { PlayerCount } from "@/game/types";

const HEARTBEAT_INTERVAL_MS = 30_000;

const INITIAL_STATE: RoomState = {
  room: null,
  players: [],
  currentPlayer: null,
  connectionStatus: "idle",
  error: null,
};

export function useRoom() {
  // Start in "reconnecting" immediately if a session is stored, so the room
  // page never flashes the error screen during the brief window before the
  // reconnect useEffect fires.
  const [state, setState] = useState<RoomState>(() => {
    const session = typeof window !== "undefined" ? loadSession() : null;
    return session
      ? { ...INITIAL_STATE, connectionStatus: "reconnecting" }
      : INITIAL_STATE;
  });
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function setError(msg: string) {
    setState((s) => ({ ...s, error: msg, connectionStatus: "error" }));
  }

  function setStatus(connectionStatus: ConnectionStatus) {
    setState((s) => ({ ...s, connectionStatus }));
  }

  // ── Subscribe to realtime once we have a room ────────────────────────────────

  const subscribe = useCallback((roomId: string) => {
    // Clean up any previous subscription
    unsubscribeRef.current?.();

    setStatus("connecting");

    const unsub = subscribeToRoom(
      roomId,
      // Player change handler
      (event, changedPlayer) => {
        setState((s) => {
          if (event === "INSERT") {
            const exists = s.players.some((p) => p.id === changedPlayer.id);
            const updated = exists
              ? s.players.map((p) => (p.id === changedPlayer.id ? changedPlayer : p))
              : [...s.players, changedPlayer].sort(
                  (a, b) => a.playerOrder - b.playerOrder
                );
            return { ...s, players: updated };
          }
          if (event === "UPDATE") {
            const updatedPlayers = s.players.map((p) =>
              p.id === changedPlayer.id ? changedPlayer : p
            );
            // Keep currentPlayer in sync
            const updatedCurrent =
              s.currentPlayer?.id === changedPlayer.id
                ? changedPlayer
                : s.currentPlayer;
            return { ...s, players: updatedPlayers, currentPlayer: updatedCurrent };
          }
          if (event === "DELETE") {
            return {
              ...s,
              players: s.players.filter((p) => p.id !== changedPlayer.id),
            };
          }
          return s;
        });
      },
      // Room change handler
      (partial) => {
        setState((s) => ({
          ...s,
          room: s.room ? { ...s.room, ...partial } : s.room,
        }));
      },
      // Connection status handler
      setStatus
    );

    unsubscribeRef.current = unsub;
  }, []);

  // ── Heartbeat ────────────────────────────────────────────────────────────────

  const startHeartbeat = useCallback((playerId: string) => {
    stopHeartbeat();
    heartbeatRef.current = setInterval(() => {
      sendHeartbeat(playerId).catch(() => {});
    }, HEARTBEAT_INTERVAL_MS);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function stopHeartbeat() {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }

  // ── Session helpers ──────────────────────────────────────────────────────────

  function applySession(
    room: Room,
    player: MultiplayerPlayer,
    players: MultiplayerPlayer[]
  ) {
    setState({
      room,
      players,
      currentPlayer: player,
      connectionStatus: "connecting", // will flip to 'connected' once realtime subscribes
      error: null,
    });
    subscribe(room.id);
    startHeartbeat(player.id);
  }

  // ── Auto-reconnect on mount ──────────────────────────────────────────────────

  useEffect(() => {
    const session = loadSession();
    if (!session) return;

    setState((s) => ({ ...s, connectionStatus: "reconnecting" }));

    reconnectPlayer(session)
      .then((result) => {
        if (!result) {
          clearSession();
          setState(INITIAL_STATE);
          return;
        }
        applySession(result.room, result.player, result.players);
      })
      .catch(() => {
        clearSession();
        setState(INITIAL_STATE);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Disconnect on tab hide / close ──────────────────────────────────────────

  useEffect(() => {
    const player = state.currentPlayer;
    const room = state.room;
    if (!player || !room) return;

    function handleVisibility() {
      if (!player || !room) return;
      if (document.hidden) {
        sendHeartbeat(player.id).catch(() => {});
      }
    }

    function handleUnload() {
      if (!player || !room) return;
      // Synchronous — use sendBeacon so it fires even as the page unloads
      const url = `/api/disconnect?playerId=${player.id}&roomId=${room.id}`;
      if (navigator.sendBeacon) {
        navigator.sendBeacon(url);
      }
    }

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("beforeunload", handleUnload);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, [state.currentPlayer, state.room]);

  // ── Cleanup on unmount ───────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      unsubscribeRef.current?.();
      stopHeartbeat();
    };
  }, []);

  // ── Polling fallback: refresh player list every 4 s ──────────────────────────
  // Supabase Realtime events can occasionally be missed. This ensures the lobby
  // always shows the current connected players without relying solely on events.

  useEffect(() => {
    const roomId = state.room?.id;
    if (!roomId) return;

    let active = true;

    async function refresh() {
      if (!active) return;
      try {
        const [players, room] = await Promise.all([
          fetchPlayersByRoomId(roomId!),
          fetchRoomById(roomId!),
        ]);
        setState((s) => {
          if (s.room?.id !== roomId) return s;
          return {
            ...s,
            players,
            // Only update room if we got a valid row back
            ...(room ? { room } : {}),
          };
        });
      } catch {
        // silent — realtime is the primary path
      }
    }

    refresh(); // immediate initial seed
    const id = setInterval(refresh, 4000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [state.room?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Public API ───────────────────────────────────────────────────────────────

  // create and join throw a user-friendly Error on failure so callers can
  // catch it directly — avoids stale-closure reads of the `error` state field.
  const create = useCallback(async (hostName: string, maxPlayers: PlayerCount = 4): Promise<string> => {
    setState((s) => ({ ...s, connectionStatus: "connecting", error: null }));
    try {
      const { room, player } = await createRoom(hostName, maxPlayers);
      applySession(room, player, [player]);
      return room.code;
    } catch (err) {
      const msg = getErrorMessage(err);
      setError(msg);
      throw new Error(msg);
    }
  }, [subscribe, startHeartbeat]); // eslint-disable-line react-hooks/exhaustive-deps

  const join = useCallback(async (code: string, playerName: string): Promise<string> => {
    setState((s) => ({ ...s, connectionStatus: "connecting", error: null }));
    try {
      const { room, player } = await joinRoom(code, playerName);
      applySession(room, player, [player]);
      return room.code;
    } catch (err) {
      const msg = getErrorMessage(err);
      setError(msg);
      throw new Error(msg);
    }
  }, [subscribe, startHeartbeat]); // eslint-disable-line react-hooks/exhaustive-deps

  const leave = useCallback(async () => {
    const { currentPlayer, room } = state;
    if (!currentPlayer || !room) return;
    stopHeartbeat();
    unsubscribeRef.current?.();
    await leaveRoom(currentPlayer.id, room.id).catch(() => {});
    clearSession();
    setState(INITIAL_STATE);
  }, [state]);

  const start = useCallback(async () => {
    const { currentPlayer, room } = state;
    if (!currentPlayer || !room) return;
    try {
      await startGame(room.id, currentPlayer.id);
      // Optimistically reflect the status change so the host doesn't see a
      // stale "waiting" screen while waiting for the Realtime event.
      setState((s) =>
        s.room ? { ...s, room: { ...s.room, status: "playing" } } : s
      );
    } catch (err) {
      // Re-throw a user-friendly message so RoomLobby can show it inline
      // WITHOUT overwriting connectionStatus (this is not a connection error).
      throw new Error(getErrorMessage(err));
    }
  }, [state]);

  return {
    ...state,
    create,
    join,
    leave,
    start,
  };
}

// ─── Error message helper ─────────────────────────────────────────────────────

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    switch (err.message) {
      case "ROOM_NOT_FOUND":       return "Room not found. Check the code and try again.";
      case "ROOM_FULL":            return "This room is full.";
      case "ROOM_ALREADY_STARTED": return "This game has already started.";
      case "NAME_TAKEN":           return "That name is already taken in this room.";
      case "NOT_HOST":             return "Only the host can start the game.";
      case "UNKNOWN":              return "Something went wrong. Please try again.";
      default:                     return "Something went wrong. Please try again.";
    }
  }
  return "Something went wrong. Please try again.";
}
