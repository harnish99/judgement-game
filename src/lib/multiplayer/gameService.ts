/**
 * Game state service — Supabase CRUD + Realtime for the multiplayer game_state table.
 *
 * Schema expected:
 *   game_state(id uuid PK, room_id uuid UNIQUE FK→rooms, state jsonb, updated_at timestamptz)
 *
 * Call `initGameState` once when the host starts the game, then use
 * `subscribeToGameState` + `saveGameState` to keep all clients in sync.
 */

import { supabase } from "@/lib/supabase/client";
import { initMatch } from "@/game/match";
import { sortHand } from "@/game/trick";
import type { MatchState, PlayerCount } from "@/game/types";

// ─── Init ─────────────────────────────────────────────────────────────────────

/**
 * Create a fresh multiplayer match and persist it.
 * `playerNames` must be in playerOrder order (index 0 = seat 0, etc.).
 */
export async function initGameState(
  roomId: string,
  playerNames: string[],
  playerCount: PlayerCount
): Promise<void> {
  const match = buildMultiplayerMatch(playerNames, playerCount);
  await saveGameState(roomId, match);
}

function buildMultiplayerMatch(
  playerNames: string[],
  playerCount: PlayerCount
): MatchState {
  const match = initMatch("medium", playerCount); // difficulty irrelevant without AI
  if (!match.currentRound) return match;

  const round = match.currentRound;
  // Inject real player names. isHuman is true only for player 0 in the global
  // state (same as solo play); applyPerspective remaps it for each client.
  const patchedPlayers = round.players.map((p) => ({
    ...p,
    name: playerNames[p.id] ?? p.name,
    isHuman: p.id === 0,
    hand: sortHand(p.hand),
  }));

  return {
    ...match,
    currentRound: { ...round, players: patchedPlayers },
  };
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function saveGameState(
  roomId: string,
  state: MatchState
): Promise<void> {
  const { error } = await supabase.from("game_state").upsert(
    {
      room_id: roomId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      state: state as any,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "room_id" }
  );
  if (error) throw error;
}

export async function loadGameState(
  roomId: string
): Promise<MatchState | null> {
  const { data, error } = await supabase
    .from("game_state")
    .select("state")
    .eq("room_id", roomId)
    // maybeSingle (not single) so a not-yet-created row returns null instead of
    // a 406 error. The host can mount MultiplayerGame and call loadGameState
    // before initGameState's upsert commits; the realtime subscription then
    // delivers the state moments later.
    .maybeSingle();

  if (error || !data) return null;
  return data.state as unknown as MatchState;
}

// ─── Realtime ─────────────────────────────────────────────────────────────────

export function subscribeToGameState(
  roomId: string,
  onState: (state: MatchState) => void
): () => void {
  const channel = supabase
    .channel(`game:${roomId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "game_state",
        filter: `room_id=eq.${roomId}`,
      },
      (payload) => {
        const row = payload.new as { state?: unknown } | undefined;
        if (row?.state) {
          onState(row.state as MatchState);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
