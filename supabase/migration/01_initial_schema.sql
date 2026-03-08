-- 🎱 Bingo Pro: Initial Database Schema
-- Generated on: 2026-03-08

-- 1. Custom Types & Enums
CREATE TYPE public.user_role AS ENUM ('player', 'operator', 'admin');
CREATE TYPE public.game_status AS ENUM ('waiting', 'started', 'finished', 'cancelled');
CREATE TYPE public.transaction_type AS ENUM ('deposit', 'withdrawal', 'bet', 'win', 'refund');
CREATE TYPE public.transaction_status AS ENUM ('pending', 'completed', 'failed', 'cancelled');
CREATE TYPE public.room_status AS ENUM ('active', 'suspended');

-- 2. Profiles (Extends Auth.Users)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    telegram_id BIGINT UNIQUE,
    username TEXT,
    phone_number TEXT,
    role public.user_role DEFAULT 'player',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Wallets
CREATE TABLE public.wallets (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    balance DECIMAL(20, 2) DEFAULT 0.00 CHECK (balance >= 0),
    currency TEXT DEFAULT 'Birr',
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Transactions (Audit Log for Financials)
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) NOT NULL,
    idempotency_key TEXT UNIQUE NOT NULL,
    type public.transaction_type NOT NULL,
    amount DECIMAL(20, 2) NOT NULL,
    status public.transaction_status DEFAULT 'pending',
    meta_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Rooms (B2B Multi-tenancy)
CREATE TABLE public.rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operator_id UUID REFERENCES public.profiles(id) NOT NULL,
    name TEXT NOT NULL,
    config JSONB DEFAULT '{}'::jsonb,
    status public.room_status DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Games
CREATE TABLE public.games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES public.rooms(id) NOT NULL,
    status public.game_status DEFAULT 'waiting',
    bet_amount DECIMAL(20, 2) NOT NULL,
    numbers_drawn INTEGER[] DEFAULT '{}',
    winner_id UUID REFERENCES public.profiles(id),
    total_pot DECIMAL(20, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Cards
CREATE TABLE public.cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) NOT NULL,
    grid JSONB NOT NULL,
    grid_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Game Players (Many-to-Many with unique card)
CREATE TABLE public.game_players (
    game_id UUID REFERENCES public.games(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    card_id UUID REFERENCES public.cards(id) NOT NULL,
    joined_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (game_id, user_id),
    UNIQUE (game_id, card_id) -- Uniqueness Guarantee: No two players have same card in one game
);

-- 9. Game Actions (Audit Trail)
CREATE TABLE public.game_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID REFERENCES public.games(id) NOT NULL,
    user_id UUID REFERENCES public.profiles(id),
    action_type TEXT NOT NULL,
    meta_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. Indexes for Performance
CREATE INDEX idx_profiles_telegram_id ON public.profiles(telegram_id);
CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX idx_transactions_idempotency_key ON public.transactions(idempotency_key);
CREATE INDEX idx_games_room_id ON public.games(room_id);
CREATE INDEX idx_games_status ON public.games(status);
CREATE INDEX idx_game_players_game_id ON public.game_players(game_id);
CREATE INDEX idx_game_players_user_id ON public.game_players(user_id);
CREATE INDEX idx_cards_user_id ON public.cards(user_id);
CREATE INDEX idx_game_actions_game_id ON public.game_actions(game_id);

-- 11. Triggers for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER on_wallets_updated BEFORE UPDATE ON public.wallets FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER on_rooms_updated BEFORE UPDATE ON public.rooms FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER on_games_updated BEFORE UPDATE ON public.games FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- 11a. Helper Functions for RLS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_actions ENABLE ROW LEVEL SECURITY;

-- 12a. Profile Policies
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.is_admin());

-- 12b. Wallet Policies
CREATE POLICY "Users can view their own wallet" ON public.wallets FOR SELECT USING (auth.uid() = user_id);

-- 12c. Room Policies
CREATE POLICY "Operators can view their own rooms" ON public.rooms FOR SELECT USING (auth.uid() = operator_id);
CREATE POLICY "Operators can update their own rooms" ON public.rooms FOR UPDATE USING (auth.uid() = operator_id);
CREATE POLICY "Public can view active rooms" ON public.rooms FOR SELECT USING (status = 'active');

-- 12d. Game Policies
CREATE POLICY "Anyone can view games" ON public.games FOR SELECT USING (true);

-- 12e. Card Policies
CREATE POLICY "Users can view their own cards" ON public.cards FOR SELECT USING (auth.uid() = user_id);

-- 12f. Game Player Policies
CREATE POLICY "Users can view their join status" ON public.game_players FOR SELECT USING (auth.uid() = user_id);
