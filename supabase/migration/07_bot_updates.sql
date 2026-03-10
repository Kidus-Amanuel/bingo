-- 🎱 Bingo Pro: Bot Transactions & User States Schema
-- Generated on: 2026-03-10

-- 1. Custom Types for Bot Transactions
DO $$ BEGIN
    CREATE TYPE public.bot_transaction_type AS ENUM ('deposit', 'withdrawal');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.bot_transaction_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Bot Transactions Table
CREATE TABLE IF NOT EXISTS public.bot_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) NOT NULL,
    telegram_id BIGINT NOT NULL,
    amount DECIMAL(20, 2) NOT NULL,
    type public.bot_transaction_type NOT NULL,
    payment_method TEXT NOT NULL,
    transaction_id TEXT UNIQUE, -- Extracted from SMS, unique to prevent double counting
    status public.bot_transaction_status DEFAULT 'pending',
    raw_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Note: We make `transaction_id` nullable because withdrawals may not have one immediately upon request.
-- A partial index to enforce uniqueness only for non-null (i.e., completed deposits)
CREATE UNIQUE INDEX IF NOT EXISTS idx_bot_transactions_unique_tx_id 
ON public.bot_transactions (transaction_id) 
WHERE transaction_id IS NOT NULL;

-- 3. Bot User States Table
-- Used for managing multi-step conversations (e.g. waiting for withdrawal amount)
CREATE TABLE IF NOT EXISTS public.bot_user_states (
    telegram_id BIGINT PRIMARY KEY,
    state TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Triggers for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_bot_transactions_updated ON public.bot_transactions;
CREATE TRIGGER on_bot_transactions_updated 
BEFORE UPDATE ON public.bot_transactions 
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS on_bot_user_states_updated ON public.bot_user_states;
CREATE TRIGGER on_bot_user_states_updated 
BEFORE UPDATE ON public.bot_user_states 
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- 5. Row Level Security (RLS)
ALTER TABLE public.bot_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_user_states ENABLE ROW LEVEL SECURITY;

-- 5a. Policies (Admins can do everything, Users can read their own)
DO $$ BEGIN
    CREATE POLICY "Users can view their own bot transactions" 
    ON public.bot_transactions FOR SELECT 
    USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Service role bypasses RLS by default, so bot operations will work.
