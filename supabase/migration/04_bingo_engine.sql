-- 🎱 Bingo Game Engine Schema additions

-- 1. users
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telegram_id BIGINT UNIQUE NOT NULL,
    balance DECIMAL(20, 2) DEFAULT 0.00 CHECK (balance >= 0)
);

-- 2. rooms
CREATE TABLE IF NOT EXISTS public.rooms_engine (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'finished')),
    max_players INT DEFAULT 100,
    card_price DECIMAL(20, 2) DEFAULT 10.00,
    company_percentage DECIMAL(5, 2) DEFAULT 10.00, -- e.g., 10%
    pool DECIMAL(20, 2) DEFAULT 0.00,
    company_fee DECIMAL(20, 2) DEFAULT 0.00,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. room_cards
CREATE TABLE IF NOT EXISTS public.room_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES public.rooms_engine(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    card_numbers INT[] NOT NULL,
    selected_at TIMESTAMPTZ DEFAULT now(),
    -- The critical unique constraint to prevent card duplication in the same room
    CONSTRAINT unique_room_card UNIQUE (room_id, card_numbers)
);

-- 4. called_numbers
CREATE TABLE IF NOT EXISTS public.called_numbers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES public.rooms_engine(id) ON DELETE CASCADE,
    number INT NOT NULL,
    called_at TIMESTAMPTZ DEFAULT now()
);

-- 5. game_winners
CREATE TABLE IF NOT EXISTS public.game_winners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES public.rooms_engine(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    card_id UUID REFERENCES public.room_cards(id) ON DELETE CASCADE,
    position INT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. wallet_transactions
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    amount DECIMAL(20, 2) NOT NULL,
    type TEXT CHECK (type IN ('deposit', 'withdraw', 'buy_card', 'win')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Functions for Bingo Mechanics

-- Atomic Wallet Transaction for Buying a Card
CREATE OR REPLACE FUNCTION public.buy_card_atomic(
    p_user_id UUID,
    p_room_id UUID,
    p_card_numbers INT[],
    p_price DECIMAL
) RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE
    v_card_id UUID;
BEGIN
    -- 1. Deduct balance (triggers balance check automatically due to constraint)
    UPDATE public.users SET balance = balance - p_price WHERE id = p_user_id;

    -- 2. Insert Transaction Record
    INSERT INTO public.wallet_transactions (user_id, amount, type)
    VALUES (p_user_id, -p_price, 'buy_card');

    -- 3. Add to Room Pool
    UPDATE public.rooms_engine 
    SET pool = pool + p_price 
    WHERE id = p_room_id;

    -- 4. Lock Card (Fails if card_numbers in room exists via UNIQUE constraint)
    INSERT INTO public.room_cards (room_id, user_id, card_numbers)
    VALUES (p_room_id, p_user_id, p_card_numbers)
    RETURNING id INTO v_card_id;

    RETURN v_card_id;
END;
$$;


-- Atomic Bingo Payout & Round Completion
CREATE OR REPLACE FUNCTION public.process_bingo_win(
    p_room_id UUID,
    p_user_id UUID,
    p_card_id UUID
) RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE
    v_pool DECIMAL(20, 2);
    v_winner_count INT;
    v_reward DECIMAL(20, 2);
    v_company_cut DECIMAL(20, 2);
    v_status TEXT;
    v_percentage DECIMAL(5,2);
BEGIN
    -- Ensure room is playing and lock it
    SELECT status, pool, company_percentage INTO v_status, v_pool, v_percentage 
    FROM public.rooms_engine 
    WHERE id = p_room_id FOR UPDATE;

    IF v_status != 'playing' THEN
        RETURN FALSE;
    END IF;

    -- Insert winner (position can be calculated based on existing rows)
    SELECT count(*) + 1 INTO v_winner_count FROM public.game_winners WHERE room_id = p_room_id;
    
    INSERT INTO public.game_winners (room_id, user_id, card_id, position)
    VALUES (p_room_id, p_user_id, p_card_id, v_winner_count);

    -- Payout Calculation: Multi-winner pot splitting
    -- Example distributes total pot - company fee to winners
    -- Since we mark room as finished on the first win OR we manage multiple winners in real-time
    -- This logic simulates closing the room instantly
    
    UPDATE public.rooms_engine SET status = 'finished', end_time = now() WHERE id = p_room_id;

    v_company_cut := v_pool * (v_percentage / 100);
    v_reward := (v_pool - v_company_cut); -- if Multi winner, calculate by sharing

    UPDATE public.rooms_engine SET company_fee = v_company_cut WHERE id = p_room_id;
    
    UPDATE public.users SET balance = balance + v_reward WHERE id = p_user_id;
    INSERT INTO public.wallet_transactions (user_id, amount, type) VALUES (p_user_id, v_reward, 'win');

    -- Auto Room Restart Integration Setup
    INSERT INTO public.rooms_engine (status, pool, company_fee) VALUES ('waiting', 0.00, 0.00);

    RETURN TRUE;
END;
$$;

-- Activate Realtime for called_numbers to broadcast to clients instantly
ALTER PUBLICATION supabase_realtime ADD TABLE public.called_numbers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms_engine;
