/**
 * Hand-written database types matching the supabase-js v2 generic schema shape.
 * Must include Row / Insert / Update / Relationships for every table, plus
 * top-level Views and Functions keys, otherwise the client's type inference
 * resolves Insert/Update to `never`.
 *
 * Replace with `npx supabase gen types typescript --project-id <id>` once
 * your project is live.
 */

export type RoomStatus   = "waiting" | "playing" | "finished";
export type PlayerStatus = "connected" | "disconnected";

export interface Database {
  public: {
    Tables: {
      rooms: {
        Row: {
          id:             string;
          code:           string;
          host_player_id: string | null;
          status:         RoomStatus;
          max_players:    number;
          created_at:     string;
          expires_at:     string;
        };
        Insert: {
          id?:             string;
          code:            string;
          host_player_id?: string | null;
          status?:         RoomStatus;
          max_players?:    number;
          created_at?:     string;
          expires_at?:     string;
        };
        Update: {
          id?:             string;
          code?:           string;
          host_player_id?: string | null;
          status?:         RoomStatus;
          max_players?:    number;
          created_at?:     string;
          expires_at?:     string;
        };
        Relationships: [];
      };
      players: {
        Row: {
          id:           string;
          room_id:      string;
          name:         string;
          is_host:      boolean;
          player_order: number;
          status:       PlayerStatus;
          joined_at:    string;
          last_seen_at: string;
        };
        Insert: {
          id?:           string;
          room_id:       string;
          name:          string;
          is_host?:      boolean;
          player_order:  number;
          status?:       PlayerStatus;
          joined_at?:    string;
          last_seen_at?: string;
        };
        Update: {
          id?:           string;
          room_id?:      string;
          name?:         string;
          is_host?:      boolean;
          player_order?: number;
          status?:       PlayerStatus;
          joined_at?:    string;
          last_seen_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "players_room_id_fkey";
            columns: ["room_id"];
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          }
        ];
      };
      game_state: {
        Row: {
          id:         string;
          room_id:    string;
          state:      Record<string, unknown>;
          updated_at: string;
        };
        Insert: {
          id?:         string;
          room_id:     string;
          state?:      Record<string, unknown>;
          updated_at?: string;
        };
        Update: {
          id?:         string;
          room_id?:    string;
          state?:      Record<string, unknown>;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "game_state_room_id_fkey";
            columns: ["room_id"];
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views:     Record<string, never>;
    Functions: {
      cleanup_expired_rooms: {
        Args:    Record<string, never>;
        Returns: undefined;
      };
    };
    Enums:     Record<string, never>;
  };
}
