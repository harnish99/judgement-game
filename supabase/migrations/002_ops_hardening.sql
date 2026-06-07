-- ─────────────────────────────────────────────────────────────────────────────
-- Judgement — Operational hardening
-- Migration: 002_ops_hardening
--
-- Idempotent. Safe to run on an existing project. Covers two operational gaps:
--   1. Realtime publication membership (so postgres_changes events fire).
--   2. Scheduled cleanup of expired rooms (so they don't accumulate forever).
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── 1. Realtime publication ─────────────────────────────────────────────────
-- The client subscribes to changes on these tables. Adding them to the
-- supabase_realtime publication is required for events to be delivered.
-- Wrapped in a DO block so re-running doesn't error if already a member.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'rooms'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'players'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.players;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'game_state'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.game_state;
  END IF;
END
$$;

-- ─── 2. Scheduled room cleanup ───────────────────────────────────────────────
-- cleanup_expired_rooms() already exists (migration 001). Schedule it to run
-- every 15 minutes via pg_cron so expired rooms (and their cascaded players +
-- game_state) are reclaimed automatically.
--
-- Requires the pg_cron extension. On Supabase, enable it once under
-- Database → Extensions → pg_cron, or via the CREATE EXTENSION below.

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove any previous schedule with the same name before re-adding (idempotent).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup_expired_rooms') THEN
    PERFORM cron.unschedule('cleanup_expired_rooms');
  END IF;

  PERFORM cron.schedule(
    'cleanup_expired_rooms',
    '*/15 * * * *',
    $cron$ SELECT public.cleanup_expired_rooms(); $cron$
  );
EXCEPTION
  -- If pg_cron isn't available in this environment, don't fail the migration;
  -- the cleanup function can still be invoked on-demand.
  WHEN undefined_table OR undefined_function OR insufficient_privilege THEN
    RAISE NOTICE 'pg_cron not available — skipping schedule. Enable it and re-run.';
END
$$;
