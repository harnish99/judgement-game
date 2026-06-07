/**
 * Realtime service — thin wrappers around Supabase Realtime channels.
 *
 * Returns an unsubscribe function so callers (hooks/useEffect) can clean up.
 */

import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import type { MultiplayerPlayer, Room, ConnectionStatus } from "./types";

type PlayerChangeHandler = (
  event: "INSERT" | "UPDATE" | "DELETE",
  player: MultiplayerPlayer
) => void;

type RoomChangeHandler = (room: Partial<Room>) => void;
type StatusChangeHandler = (status: ConnectionStatus) => void;

function mapPlayerRow(row: Record<string, unknown>): MultiplayerPlayer {
  return {
    id: row.id as string,
    roomId: row.room_id as string,
    name: row.name as string,
    isHost: row.is_host as boolean,
    playerOrder: row.player_order as number,
    status: row.status as MultiplayerPlayer["status"],
    joinedAt: row.joined_at as string,
    lastSeenAt: row.last_seen_at as string,
  };
}

function mapRoomRow(row: Record<string, unknown>): Partial<Room> {
  return {
    id: row.id as string,
    code: row.code as string,
    hostPlayerId: row.host_player_id as string | null,
    status: row.status as Room["status"],
    maxPlayers: row.max_players as number,
    expiresAt: row.expires_at as string,
  };
}

/**
 * Subscribe to all player and room changes for a given room.
 *
 * @param roomId      The room UUID to filter on
 * @param onPlayer    Called whenever a player row changes
 * @param onRoom      Called whenever the room row changes
 * @param onStatus    Called when the channel connection status changes
 * @returns           A cleanup function — call it in useEffect's return
 */
export function subscribeToRoom(
  roomId: string,
  onPlayer: PlayerChangeHandler,
  onRoom: RoomChangeHandler,
  onStatus: StatusChangeHandler
): () => void {
  const channel: RealtimeChannel = supabase
    .channel(`room:${roomId}`, {
      config: { broadcast: { self: false } },
    })
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "players",
        filter: `room_id=eq.${roomId}`,
      },
      (payload) => {
        const event = payload.eventType as "INSERT" | "UPDATE" | "DELETE";
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const row: any = event === "DELETE" ? payload.old : payload.new;
        if (row && row.id) {
          onPlayer(event, mapPlayerRow(row as Record<string, unknown>));
        }
      }
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "rooms",
        filter: `id=eq.${roomId}`,
      },
      (payload) => {
        if (payload.new) {
          onRoom(mapRoomRow(payload.new as Record<string, unknown>));
        }
      }
    )
    .subscribe((status, err) => {
      if (status === "SUBSCRIBED") {
        onStatus("connected");
      } else if (status === "CHANNEL_ERROR" || err) {
        onStatus("error");
      } else if (status === "TIMED_OUT") {
        onStatus("disconnected");
      } else if (status === "CLOSED") {
        onStatus("disconnected");
      } else {
        onStatus("connecting");
      }
    });

  return () => {
    supabase.removeChannel(channel);
  };
}
