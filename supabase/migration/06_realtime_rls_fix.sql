-- ============================================================
-- Migration 06: Fix Realtime Subscriptions for Game Tables
-- Run this in your Supabase SQL editor
-- ============================================================

-- ── 1. REPLICA IDENTITY FULL ─────────────────────────────────────────────────
-- Without FULL, PostgreSQL only sends the PK in the WAL stream for UPDATE/DELETE.
-- For Supabase Realtime row-level filters to work reliably on all event types,
-- all engine tables must use FULL.

ALTER TABLE public.called_numbers   REPLICA IDENTITY FULL;
ALTER TABLE public.rooms_engine     REPLICA IDENTITY FULL;
ALTER TABLE public.room_cards       REPLICA IDENTITY FULL;
ALTER TABLE public.game_winners     REPLICA IDENTITY FULL;

-- ── 2. RLS Policies for Engine Tables ────────────────────────────────────────
-- Supabase Realtime respects Row Level Security. Without a SELECT policy that
-- allows read access, anon clients receive NO realtime events (silently dropped).
-- These tables hold public game state that all players need to see in real-time.

-- called_numbers: public read (everyone watching a game needs to see draws)
ALTER TABLE public.called_numbers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read called numbers" ON public.called_numbers;
CREATE POLICY "Anyone can read called numbers"
    ON public.called_numbers
    FOR SELECT
    USING (true);

-- rooms_engine: public read (lobby + game page needs live room state)
ALTER TABLE public.rooms_engine ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read rooms" ON public.rooms_engine;
CREATE POLICY "Anyone can read rooms"
    ON public.rooms_engine
    FOR SELECT
    USING (true);

-- room_cards: public read (lobby needs to show which cards are taken)
DROP POLICY IF EXISTS "Anyone can read room_cards" ON public.room_cards;
CREATE POLICY "Anyone can read room_cards"
    ON public.room_cards
    FOR SELECT
    USING (true);

-- game_winners: public read (winner popup needs to fire for all players)
ALTER TABLE public.game_winners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read game_winners" ON public.game_winners;
CREATE POLICY "Anyone can read game_winners"
    ON public.game_winners
    FOR SELECT
    USING (true);

-- ── 3. Ensure all tables are in the Realtime publication ─────────────────────
-- (Safe to re-run — DO blocks handle the case where they're already added)

DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.called_numbers;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms_engine;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.room_cards;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.game_winners;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END;
$$;

-- ── 4. Index for fast filter lookups ─────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_called_numbers_room_id ON public.called_numbers(room_id);
CREATE INDEX IF NOT EXISTS idx_game_winners_room_id   ON public.game_winners(room_id);
