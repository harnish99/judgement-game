/**
 * Application-level multiplayer types.
 * These are derived from the database Row types but shaped for UI consumption.
 */

import type { RoomStatus, PlayerStatus } from "@/lib/supabase/database.types";

export type { RoomStatus, PlayerStatus };

// ─── Core domain types ────────────────────────────────────────────────────────

export interface Room {
  id: string;
  code: string;
  hostPlayerId: string | null;
  status: RoomStatus;
  maxPlayers: number;
  createdAt: string;
  expiresAt: string;
}

export interface MultiplayerPlayer {
  id: string;
  roomId: string;
  name: string;
  isHost: boolean;
  playerOrder: number;
  status: PlayerStatus;
  joinedAt: string;
  lastSeenAt: string;
}

// ─── Session (stored in localStorage) ────────────────────────────────────────

export interface StoredSession {
  playerId: string;
  roomCode: string;
  playerName: string;
}

// ─── Lobby UI state ───────────────────────────────────────────────────────────

export type ConnectionStatus =
  | "idle"          // no room yet
  | "connecting"    // subscribe in progress
  | "connected"     // realtime channel SUBSCRIBED
  | "reconnecting"  // lost + retrying
  | "disconnected"  // channel closed / error
  | "error";        // unrecoverable

export interface RoomState {
  room: Room | null;
  players: MultiplayerPlayer[];
  currentPlayer: MultiplayerPlayer | null;
  connectionStatus: ConnectionStatus;
  error: string | null;
}

// ─── Service result types ─────────────────────────────────────────────────────

export interface CreateRoomResult {
  room: Room;
  player: MultiplayerPlayer;
}

export interface JoinRoomResult {
  room: Room;
  player: MultiplayerPlayer;
}

export type RoomServiceError =
  | "ROOM_NOT_FOUND"
  | "ROOM_FULL"
  | "ROOM_ALREADY_STARTED"
  | "NAME_TAKEN"
  | "PLAYER_NOT_FOUND"
  | "NOT_HOST"
  | "UNKNOWN";
