-- ─────────────────────────────────────────────────────────────────────────────
-- Judgement — Multiplayer lobby schema
-- Migration: 001_multiplayer_lobby
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── rooms ───────────────────────────────────────────────────────────────────
-- One row per active game lobby.
-- host_player_id is nullable because the host row is inserted into `players`
-- AFTER the room is created (avoids a circular FK chicken-and-egg problem).

CREATE TABLE IF NOT EXISTS public.rooms (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  code            CHAR(6)     NOT NULL UNIQUE,
  host_player_id  UUID,                         -- set once host row exists
  status          TEXT        NOT NULL DEFAULT 'waiting'
                              CHECK (status IN ('waiting', 'playing', 'finished')),
  max_players     SMALLINT    NOT NULL DEFAULT 4,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '2 hours'
);

-- ─── players ─────────────────────────────────────────────────────────────────
-- One row per seat in a room.  No auth — identity is stored in the client's
-- localStorage and used to reclaim the seat on reconnect.

CREATE TABLE IF NOT EXISTS public.players (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id       UUID        NOT NULL REFERENCES public.rooms (id) ON DELETE CASCADE,
  name          TEXT        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 20),
  is_host       BOOLEAN     NOT NULL DEFAULT FALSE,
  player_order  SMALLINT    NOT NULL,           -- seat index 0-3
  status        TEXT        NOT NULL DEFAULT 'connected'
                            CHECK (status IN ('connected', 'disconnected')),
  joined_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Back-fill rooms.host_player_id FK once players table exists
ALTER TABLE public.rooms
  ADD CONSTRAINT fk_rooms_host_player
  FOREIGN KEY (host_player_id) REFERENCES public.players (id)
  ON DELETE SET NULL
  DEFERRABLE INITIALLY DEFERRED;

-- ─── game_state ──────────────────────────────────────────────────────────────
-- One row per room, holds the serialised GameState JSON once play begins.
-- Empty during the lobby phase.

CREATE TABLE IF NOT EXISTS public.game_state (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id     UUID        NOT NULL UNIQUE REFERENCES public.rooms (id) ON DELETE CASCADE,
  state       JSONB       NOT NULL DEFAULT '{}',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_rooms_code        ON public.rooms   (code);
CREATE INDEX IF NOT EXISTS idx_rooms_status      ON public.rooms   (status);
CREATE INDEX IF NOT EXISTS idx_players_room_id   ON public.players (room_id);
CREATE INDEX IF NOT EXISTS idx_game_state_room   ON public.game_state (room_id);

-- ─── Automatic updated_at for game_state ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_game_state_updated_at
  BEFORE UPDATE ON public.game_state
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── Auto-expire rooms ────────────────────────────────────────────────────────
-- A scheduled job (pg_cron or Supabase Edge Function) can call this, or you
-- can call it on-demand.  Rooms older than their expires_at are deleted;
-- the ON DELETE CASCADE cleans players and game_state automatically.
CREATE OR REPLACE FUNCTION public.cleanup_expired_rooms()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM public.rooms WHERE expires_at < NOW();
END;
$$;

-- ─── Row Level Security ───────────────────────────────────────────────────────
-- No authentication is required.  All rows are publicly readable and writable
-- via the anon key.  RLS is still enabled so future auth can be layered on.

ALTER TABLE public.rooms      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_state ENABLE ROW LEVEL SECURITY;

-- rooms: anyone can read; anyone can insert; only update non-expired rows
CREATE POLICY "rooms_select"  ON public.rooms FOR SELECT USING (true);
CREATE POLICY "rooms_insert"  ON public.rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "rooms_update"  ON public.rooms FOR UPDATE USING (expires_at > NOW());
CREATE POLICY "rooms_delete"  ON public.rooms FOR DELETE USING (expires_at < NOW());

-- players: anyone can read; anyone can insert or update
CREATE POLICY "players_select" ON public.players FOR SELECT USING (true);
CREATE POLICY "players_insert" ON public.players FOR INSERT WITH CHECK (true);
CREATE POLICY "players_update" ON public.players FOR UPDATE USING (true);
CREATE POLICY "players_delete" ON public.players FOR DELETE USING (true);

-- game_state: anyone can read/write (gameplay auth deferred to Phase 2)
CREATE POLICY "game_state_select" ON public.game_state FOR SELECT USING (true);
CREATE POLICY "game_state_insert" ON public.game_state FOR INSERT WITH CHECK (true);
CREATE POLICY "game_state_update" ON public.game_state FOR UPDATE USING (true);

-- ─── Enable Realtime ─────────────────────────────────────────────────────────
-- Run these in the Supabase dashboard → Table Editor → Realtime, OR via SQL:
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.players;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.game_state;
