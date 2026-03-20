-- 🎱 BINGO PRO: THE UNIFIED "SOURCE OF TRUTH" SCHEMA (v1.0)
-- This script consolidates 01, 04, 05, 06, 07, and 08 into one master migration.

-- ============================================================
-- 0. DESTRUCTIVE RESET (CLEAN SLATE)
-- ============================================================
-- Un-comment the next line to wipe everything and start fresh
-- DROP SCHEMA public CASCADE; CREATE SCHEMA public;
-- GRANT ALL ON SCHEMA public TO postgres; GRANT ALL ON SCHEMA public TO anon; GRANT ALL ON SCHEMA public TO authenticated; GRANT ALL ON SCHEMA public TO service_role;

-- Alternative: Precise Drop
DROP TABLE IF EXISTS public.game_winners CASCADE;
DROP TABLE IF EXISTS public.called_numbers CASCADE;
DROP TABLE IF EXISTS public.room_cards CASCADE;
DROP TABLE IF EXISTS public.rooms_engine CASCADE;
DROP TABLE IF EXISTS public.card_templates CASCADE;
DROP TABLE IF EXISTS public.transactions_ledger CASCADE;
DROP TABLE IF EXISTS public.wallets CASCADE;
DROP TABLE IF EXISTS public.bot_user_states CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Old Redundant Tables
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.bot_transactions CASCADE;
DROP TABLE IF EXISTS public.wallet_transactions CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.rooms CASCADE;
DROP TABLE IF EXISTS public.games CASCADE;
DROP TABLE IF EXISTS public.cards CASCADE;
DROP TABLE IF EXISTS public.game_players CASCADE;
DROP TABLE IF EXISTS public.game_actions CASCADE;

-- Drop Types
DROP TYPE IF EXISTS public.user_role CASCADE;
DROP TYPE IF EXISTS public.ledger_transaction_type CASCADE;
DROP TYPE IF EXISTS public.ledger_transaction_status CASCADE;
DROP TYPE IF EXISTS public.bot_transaction_type CASCADE;
DROP TYPE IF EXISTS public.bot_transaction_status CASCADE;

-- ============================================================
-- 1. TYPES & ENUMS
-- ============================================================

DO $$ BEGIN
    CREATE TYPE public.user_role AS ENUM ('player', 'operator', 'admin');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.ledger_transaction_type AS ENUM ('deposit', 'withdrawal', 'bet', 'win', 'bonus', 'refund');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.ledger_transaction_status AS ENUM ('pending', 'approved', 'rejected', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============================================================
-- 2. IDENTITY & WALLETS
-- ============================================================

-- MASTER USER TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
    telegram_id BIGINT UNIQUE,
    username TEXT,
    phone_number TEXT,
    role public.user_role DEFAULT 'player',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- MASTER WALLET (Source of Truth for Balances)
CREATE TABLE IF NOT EXISTS public.wallets (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    balance DECIMAL(20, 2) DEFAULT 0.00 CHECK (balance >= 0),
    currency TEXT DEFAULT 'Birr',
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 3. UNIFIED FINANCIAL LEDGER
-- ============================================================

CREATE TABLE IF NOT EXISTS public.transactions_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) NOT NULL,
    amount DECIMAL(20, 2) NOT NULL,
    type public.ledger_transaction_type NOT NULL,
    status public.ledger_transaction_status DEFAULT 'pending',
    payment_method TEXT, -- 'telebirr', 'cbe', 'internal'
    reference_id TEXT, -- SMS Txn ID or Room ID
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookup by reference (SMS ID)
CREATE UNIQUE INDEX IF NOT EXISTS idx_txn_ledger_reference ON public.transactions_ledger (reference_id) WHERE reference_id IS NOT NULL;

-- ============================================================
-- 4. BINGO GAME ENGINE
-- ============================================================

-- ROOMS ENGINE
CREATE TABLE IF NOT EXISTS public.rooms_engine (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'finished', 'cancelled')),
    max_players INT DEFAULT 100,
    card_price DECIMAL(20, 2) DEFAULT 10.00,
    company_percentage DECIMAL(5, 2) DEFAULT 10.00,
    pool DECIMAL(20, 2) DEFAULT 0.00,
    company_fee DECIMAL(20, 2) DEFAULT 0.00,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- CARD TEMPLATES POOL
CREATE TABLE IF NOT EXISTS public.card_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grid JSONB NOT NULL,
    grid_hash TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ROOM CARDS (Ownership & Selection)
CREATE TABLE IF NOT EXISTS public.room_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES public.rooms_engine(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    card_template_id UUID REFERENCES public.card_templates(id),
    card_numbers INT[] NOT NULL,
    selected_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_room_card UNIQUE (room_id, card_numbers), -- Prevent same card in one room
    CONSTRAINT unique_user_per_room UNIQUE (room_id, user_id) -- One card per player
);

-- CALLED NUMBERS (The Draw)
CREATE TABLE IF NOT EXISTS public.called_numbers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES public.rooms_engine(id) ON DELETE CASCADE,
    number INT NOT NULL,
    called_at TIMESTAMPTZ DEFAULT now()
);

-- WINNERS CIRCLE
CREATE TABLE IF NOT EXISTS public.game_winners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES public.rooms_engine(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    card_id UUID REFERENCES public.room_cards(id) ON DELETE CASCADE,
    position INT NOT NULL, -- 1st, 2nd, etc.
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 5. BOT MANAGEMENT
-- ============================================================

CREATE TABLE IF NOT EXISTS public.bot_user_states (
    telegram_id BIGINT PRIMARY KEY,
    state TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 6. ATOMIC LOGIC (RPCs)
-- ============================================================

-- BUY CARD ATOMICALLY
CREATE OR REPLACE FUNCTION public.buy_card_atomic(
    p_user_id UUID,
    p_room_id UUID,
    p_card_numbers INT[],
    p_price DECIMAL,
    p_template_id UUID DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE
    v_card_id UUID;
    v_existing_card UUID;
BEGIN
    -- 0. Check duplicate registration
    SELECT id INTO v_existing_card FROM public.room_cards 
    WHERE room_id = p_room_id AND user_id = p_user_id LIMIT 1;

    IF v_existing_card IS NOT NULL THEN
        RAISE EXCEPTION 'already_joined: User already has a card in this room.';
    END IF;

    -- 1. Deduct balance from wallets
    UPDATE public.wallets SET balance = balance - p_price WHERE user_id = p_user_id;

    -- 2. Log 'completed' bet in ledger
    INSERT INTO public.transactions_ledger (user_id, amount, type, status, reference_id)
    VALUES (p_user_id, -p_price, 'bet', 'completed', p_room_id::text);

    -- 3. Add to Room Pool
    UPDATE public.rooms_engine SET pool = pool + p_price WHERE id = p_room_id;

    -- 4. Create Card (Fails if numbers taken via unique_room_card)
    INSERT INTO public.room_cards (room_id, user_id, card_numbers, card_template_id)
    VALUES (p_room_id, p_user_id, p_card_numbers, p_template_id)
    RETURNING id INTO v_card_id;

    RETURN v_card_id;
END;
$$;

-- PROCESS WIN ATOMICALLY
CREATE OR REPLACE FUNCTION public.process_bingo_win(
    p_room_id UUID,
    p_user_id UUID,
    p_card_id UUID
) RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE
    v_pool DECIMAL(20, 2);
    v_reward DECIMAL(20, 2);
    v_company_cut DECIMAL(20, 2);
    v_status TEXT;
    v_percentage DECIMAL(5,2);
BEGIN
    -- Lock room for update
    SELECT status, pool, company_percentage INTO v_status, v_pool, v_percentage 
    FROM public.rooms_engine WHERE id = p_room_id FOR UPDATE;

    IF v_status != 'playing' THEN RETURN FALSE; END IF;

    -- 1. Payout Calculation
    v_company_cut := v_pool * (v_percentage / 100);
    v_reward := (v_pool - v_company_cut);

    -- 2. Update Finance
    UPDATE public.wallets SET balance = balance + v_reward WHERE user_id = p_user_id;
    INSERT INTO public.transactions_ledger (user_id, amount, type, status, reference_id)
    VALUES (p_user_id, v_reward, 'win', 'completed', p_room_id::text);

    -- 3. Mark Winners & Close Room
    INSERT INTO public.game_winners (room_id, user_id, card_id, position) VALUES (p_room_id, p_user_id, p_card_id, 1);
    UPDATE public.rooms_engine SET status = 'finished', end_time = now(), company_fee = v_company_cut WHERE id = p_room_id;

    -- 4. Spawn next round (Auto restart)
    INSERT INTO public.rooms_engine (status, card_price, pool) VALUES ('waiting', 10.00, 0.00);

    RETURN TRUE;
END;
$$;

-- ADMIN: APPROVE TRANSACTION
CREATE OR REPLACE FUNCTION public.handle_transaction_approval(
    p_tx_id UUID,
    p_new_status public.ledger_transaction_status,
    p_admin_id UUID DEFAULT NULL
) RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE
    v_type public.ledger_transaction_type;
    v_amount DECIMAL;
    v_user_id UUID;
    v_status public.ledger_transaction_status;
BEGIN
    SELECT user_id, amount, type, status INTO v_user_id, v_amount, v_type, v_status
    FROM public.transactions_ledger WHERE id = p_tx_id FOR UPDATE;

    IF v_status != 'pending' THEN RETURN FALSE; END IF;

    IF p_new_status = 'approved' THEN
        -- Apply balance change
        UPDATE public.wallets SET balance = balance + v_amount WHERE user_id = v_user_id;
        UPDATE public.transactions_ledger SET status = 'approved', updated_at = now() WHERE id = p_tx_id;
        RETURN TRUE;
    ELSIF p_new_status = 'rejected' THEN
        UPDATE public.transactions_ledger SET status = 'rejected', updated_at = now() WHERE id = p_tx_id;
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$;

-- ============================================================
-- 7. HELPERS & TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER on_wallets_updated BEFORE UPDATE ON public.wallets FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER on_txn_ledger_updated BEFORE UPDATE ON public.transactions_ledger FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER on_bot_user_states_updated BEFORE UPDATE ON public.bot_user_states FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- ============================================================
-- 8. PERFORMANCE & REALTIME
-- ============================================================

-- Replica Identity for Realtime row tracking
ALTER TABLE public.called_numbers REPLICA IDENTITY FULL;
ALTER TABLE public.rooms_engine REPLICA IDENTITY FULL;
ALTER TABLE public.room_cards REPLICA IDENTITY FULL;
ALTER TABLE public.game_winners REPLICA IDENTITY FULL;

-- Realtime Publication
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.called_numbers;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms_engine;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.room_cards;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.game_winners;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_room_cards_user_id ON public.room_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_room_cards_room_id ON public.room_cards(room_id);
CREATE INDEX IF NOT EXISTS idx_ledger_user_id ON public.transactions_ledger(user_id);

-- ============================================================
-- 9. SECURITY (RLS)
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms_engine ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.called_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_winners ENABLE ROW LEVEL SECURITY;

-- Select Policies
CREATE POLICY "Public Read: Room Templates" ON public.card_templates FOR SELECT USING (true);
CREATE POLICY "Public Read: Room State" ON public.rooms_engine FOR SELECT USING (true);
CREATE POLICY "Public Read: Card Ownership" ON public.room_cards FOR SELECT USING (true);
CREATE POLICY "Public Read: Drawn Numbers" ON public.called_numbers FOR SELECT USING (true);
CREATE POLICY "Public Read: Winners" ON public.game_winners FOR SELECT USING (true);

CREATE POLICY "Private: Access own Profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Private: Access own Wallet" ON public.wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Private: Access own Ledger" ON public.transactions_ledger FOR SELECT USING (auth.uid() = user_id);

