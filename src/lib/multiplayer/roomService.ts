/**
 * Room service — all Supabase CRUD for rooms and players.
 * Pure async functions; no React, no side-effects on import.
 *
 * Every public function either resolves with data or rejects with
 * an Error whose message is a RoomServiceError string.
 */

import { supabase } from "@/lib/supabase/client";
import type {
  CreateRoomResult,
  JoinRoomResult,
  MultiplayerPlayer,
  Room,
  RoomServiceError,
  StoredSession,
} from "./types";
import type { PlayerCount } from "@/game/types";

// ─── localStorage key ─────────────────────────────────────────────────────────

const SESSION_KEY = "judgement-mp-session";

export function loadSession(): StoredSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
}

export function saveSession(session: StoredSession): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  if (typeof window !== "undefined") localStorage.removeItem(SESSION_KEY);
}

// ─── Room code generation ─────────────────────────────────────────────────────

// Omits confusable characters: 0/O, 1/I/L
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function generateCode(): string {
  return Array.from({ length: 6 }, () =>
    CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]
  ).join("");
}

// ─── Row mappers ──────────────────────────────────────────────────────────────

function mapRoom(row: {
  id: string;
  code: string;
  host_player_id: string | null;
  status: string;
  max_players: number;
  created_at: string;
  expires_at: string;
}): Room {
  return {
    id: row.id,
    code: row.code,
    hostPlayerId: row.host_player_id,
    status: row.status as Room["status"],
    maxPlayers: row.max_players,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  };
}

function mapPlayer(row: {
  id: string;
  room_id: string;
  name: string;
  is_host: boolean;
  player_order: number;
  status: string;
  joined_at: string;
  last_seen_at: string;
}): MultiplayerPlayer {
  return {
    id: row.id,
    roomId: row.room_id,
    name: row.name,
    isHost: row.is_host,
    playerOrder: row.player_order,
    status: row.status as MultiplayerPlayer["status"],
    joinedAt: row.joined_at,
    lastSeenAt: row.last_seen_at,
  };
}

function serviceError(code: RoomServiceError): Error {
  return Object.assign(new Error(code), { code });
}

// ─── createRoom ──────────────────────────────────────────────────────────────

/**
 * Create a new room and seat the host as player 0.
 * Retries up to 5 times if the random code collides.
 */
export async function createRoom(hostName: string, maxPlayers: PlayerCount = 4): Promise<CreateRoomResult> {
  const trimmed = hostName.trim().slice(0, 20);
  if (!trimmed) throw serviceError("UNKNOWN");

  let roomRow = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode();
    const { data, error } = await supabase
      .from("rooms")
      .insert({ code, status: "waiting", max_players: maxPlayers })
      .select()
      .single();

    if (!error && data) {
      roomRow = data;
      break;
    }
    // code conflict → retry
    if (error?.code !== "23505") throw serviceError("UNKNOWN");
  }
  if (!roomRow) throw serviceError("UNKNOWN");

  // Insert host player
  const { data: playerRow, error: playerError } = await supabase
    .from("players")
    .insert({
      room_id: roomRow.id,
      name: trimmed,
      is_host: true,
      player_order: 0,
      status: "connected",
    })
    .select()
    .single();

  if (playerError || !playerRow) throw serviceError("UNKNOWN");

  // Back-fill host_player_id now that the player row exists
  await supabase
    .from("rooms")
    .update({ host_player_id: playerRow.id })
    .eq("id", roomRow.id);

  const room = mapRoom({ ...roomRow, host_player_id: playerRow.id });
  const player = mapPlayer(playerRow);

  saveSession({ playerId: player.id, roomCode: room.code, playerName: trimmed });
  return { room, player };
}

// ─── joinRoom ────────────────────────────────────────────────────────────────

/**
 * Join an existing waiting room by its 6-character code.
 */
export async function joinRoom(
  code: string,
  playerName: string
): Promise<JoinRoomResult> {
  const trimmedName = playerName.trim().slice(0, 20);
  const upperCode = code.trim().toUpperCase();
  if (!trimmedName || upperCode.length !== 6) throw serviceError("UNKNOWN");

  // Fetch the room
  const { data: roomRow, error: roomError } = await supabase
    .from("rooms")
    .select("*")
    .eq("code", upperCode)
    .gt("expires_at", new Date().toISOString())
    .single();

  if (roomError || !roomRow) throw serviceError("ROOM_NOT_FOUND");
  if (roomRow.status !== "waiting") throw serviceError("ROOM_ALREADY_STARTED");

  // Count current connected players
  const { data: existingPlayers, error: playersError } = await supabase
    .from("players")
    .select("id, name, player_order, status")
    .eq("room_id", roomRow.id);

  if (playersError) throw serviceError("UNKNOWN");

  const activePlayers = (existingPlayers ?? []).filter(
    (p) => p.status === "connected"
  );
  if (activePlayers.length >= roomRow.max_players) throw serviceError("ROOM_FULL");

  // Check name uniqueness
  const nameTaken = activePlayers.some(
    (p) => p.name.toLowerCase() === trimmedName.toLowerCase()
  );
  if (nameTaken) throw serviceError("NAME_TAKEN");

  // Find the lowest unused player_order slot
  const usedOrders = new Set((existingPlayers ?? []).map((p) => p.player_order));
  let order = 0;
  while (usedOrders.has(order)) order++;

  const { data: playerRow, error: playerError } = await supabase
    .from("players")
    .insert({
      room_id: roomRow.id,
      name: trimmedName,
      is_host: false,
      player_order: order,
      status: "connected",
    })
    .select()
    .single();

  if (playerError || !playerRow) throw serviceError("UNKNOWN");

  saveSession({
    playerId: playerRow.id,
    roomCode: roomRow.code,
    playerName: trimmedName,
  });

  return { room: mapRoom(roomRow), player: mapPlayer(playerRow) };
}

// ─── reconnectPlayer ─────────────────────────────────────────────────────────

/**
 * Attempt to reclaim a disconnected seat using a stored playerId.
 * Returns null if the session is no longer valid (room gone, etc.).
 */
export async function reconnectPlayer(
  session: StoredSession
): Promise<{ room: Room; player: MultiplayerPlayer; players: MultiplayerPlayer[] } | null> {
  const { data: playerRow, error: playerError } = await supabase
    .from("players")
    .select("*")
    .eq("id", session.playerId)
    .single();

  if (playerError || !playerRow) return null;

  const { data: roomRow, error: roomError } = await supabase
    .from("rooms")
    .select("*")
    .eq("id", playerRow.room_id)
    .eq("code", session.roomCode.toUpperCase())
    .single();

  if (roomError || !roomRow) return null;
  // Don't reconnect to a room that has already expired or been deleted
  if (roomRow.expires_at && new Date(roomRow.expires_at) < new Date()) return null;

  // Mark as connected again
  const { data: updatedPlayer } = await supabase
    .from("players")
    .update({ status: "connected", last_seen_at: new Date().toISOString() })
    .eq("id", session.playerId)
    .select()
    .single();

  // Fetch all players in the room
  const { data: allPlayers } = await supabase
    .from("players")
    .select("*")
    .eq("room_id", roomRow.id)
    .order("player_order");

  return {
    room: mapRoom(roomRow),
    player: mapPlayer(updatedPlayer ?? playerRow),
    players: (allPlayers ?? []).map(mapPlayer),
  };
}

// ─── leaveRoom ───────────────────────────────────────────────────────────────

/**
 * Mark a player as disconnected.  If they were the host and the room is
 * still waiting, transfer host to the next connected player or delete the
 * room if empty.
 */
export async function leaveRoom(
  playerId: string,
  roomId: string
): Promise<void> {
  await supabase
    .from("players")
    .update({ status: "disconnected", last_seen_at: new Date().toISOString() })
    .eq("id", playerId);

  // Check remaining connected players
  const { data: remaining } = await supabase
    .from("players")
    .select("id, is_host, player_order")
    .eq("room_id", roomId)
    .eq("status", "connected")
    .order("player_order");

  if (!remaining || remaining.length === 0) {
    // Room is empty — delete it (cascades to players + game_state)
    await supabase.from("rooms").delete().eq("id", roomId);
    return;
  }

  // If the leaver was the host, promote the next connected player
  const { data: leavingPlayer } = await supabase
    .from("players")
    .select("is_host")
    .eq("id", playerId)
    .single();

  if (leavingPlayer?.is_host) {
    const newHost = remaining[0];
    // Demote the old host first, then promote the new one
    await supabase.from("players").update({ is_host: false }).eq("id", playerId);
    await supabase.from("players").update({ is_host: true }).eq("id", newHost.id);
    await supabase
      .from("rooms")
      .update({ host_player_id: newHost.id })
      .eq("id", roomId);
  }

  clearSession();
}

// ─── startGame ───────────────────────────────────────────────────────────────

/**
 * Host transitions the room from 'waiting' → 'playing'.
 * Requires at least 2 connected players.
 */
export async function startGame(
  roomId: string,
  hostPlayerId: string
): Promise<void> {
  // Verify caller is marked as host in the players table
  const { data: caller } = await supabase
    .from("players")
    .select("is_host")
    .eq("id", hostPlayerId)
    .single();

  if (!caller?.is_host) throw serviceError("NOT_HOST");

  // Verify room still exists and hasn't already started
  const { data: room } = await supabase
    .from("rooms")
    .select("status")
    .eq("id", roomId)
    .single();

  if (!room) throw serviceError("ROOM_NOT_FOUND");
  if (room.status !== "waiting") throw serviceError("ROOM_ALREADY_STARTED");

  await supabase.from("rooms").update({ status: "playing" }).eq("id", roomId);
}

// ─── heartbeat ───────────────────────────────────────────────────────────────

/** Update last_seen_at — call every 30 s to signal the player is still alive. */
export async function sendHeartbeat(playerId: string): Promise<void> {
  await supabase
    .from("players")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", playerId);
}

// ─── fetchRoomWithPlayers ─────────────────────────────────────────────────────

export async function fetchRoomWithPlayers(code: string): Promise<{
  room: Room;
  players: MultiplayerPlayer[];
} | null> {
  const { data: roomRow, error } = await supabase
    .from("rooms")
    .select("*")
    .eq("code", code.toUpperCase())
    .gt("expires_at", new Date().toISOString())
    .single();

  if (error || !roomRow) return null;

  const { data: playerRows } = await supabase
    .from("players")
    .select("*")
    .eq("room_id", roomRow.id)
    .order("player_order");

  return {
    room: mapRoom(roomRow),
    players: (playerRows ?? []).map(mapPlayer),
  };
}

// ─── fetchRoomById ────────────────────────────────────────────────────────────

/**
 * Fetch a room row by ID.
 * Used as a polling fallback so clients detect status changes (e.g. "playing")
 * even if the Realtime event was missed.
 */
export async function fetchRoomById(roomId: string): Promise<Room | null> {
  const { data } = await supabase
    .from("rooms")
    .select("*")
    .eq("id", roomId)
    .single();
  return data ? mapRoom(data) : null;
}

// ─── fetchPlayersByRoomId ─────────────────────────────────────────────────────

/**
 * Fetch all players for a room.
 * Used as a polling fallback in case Realtime events are missed.
 */
export async function fetchPlayersByRoomId(roomId: string): Promise<MultiplayerPlayer[]> {
  const { data } = await supabase
    .from("players")
    .select("*")
    .eq("room_id", roomId)
    .order("player_order");
  return (data ?? []).map(mapPlayer);
}
