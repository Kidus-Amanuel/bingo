-- ============================================================
-- Migration 05: Real-time Fixes & One-Card-Per-User Enforcement
-- Run this in your Supabase SQL editor
-- ============================================================

-- 1. Enable Realtime for room_cards so card selection
--    broadcasts to all connected clients instantly.
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_cards;

-- 2. One card per user per room (prevents buying multiple cards in same room).
--    If this constraint already exists, the DO NOTHING block skips it safely.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'unique_user_per_room'
          AND conrelid = 'public.room_cards'::regclass
    ) THEN
        ALTER TABLE public.room_cards
            ADD CONSTRAINT unique_user_per_room UNIQUE (room_id, user_id);
    END IF;
END;
$$;

-- 3. The buy_card_atomic function should also check that the user does not
--    already have a card in this room before proceeding.
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
    -- 0. Check if the user already owns a card in this room
    SELECT id INTO v_existing_card
    FROM public.room_cards
    WHERE room_id = p_room_id AND user_id = p_user_id
    LIMIT 1;

    IF v_existing_card IS NOT NULL THEN
        RAISE EXCEPTION 'already_joined: User already has a card in this room.';
    END IF;

    -- 1. Deduct balance (triggers balance >= 0 check via constraint)
    UPDATE public.users SET balance = balance - p_price WHERE id = p_user_id;

    -- 2. Insert Transaction Record
    INSERT INTO public.wallet_transactions (user_id, amount, type)
    VALUES (p_user_id, -p_price, 'buy_card');

    -- 3. Add to Room Pool (this is the pot balance that all clients see in real-time)
    UPDATE public.rooms_engine
    SET pool = pool + p_price
    WHERE id = p_room_id;

    -- 4. Lock Card (Fails if card_numbers in room already taken via UNIQUE constraint,
    --    OR fails if user already has a card via unique_user_per_room constraint)
    INSERT INTO public.room_cards (room_id, user_id, card_numbers, card_template_id)
    VALUES (p_room_id, p_user_id, p_card_numbers, p_template_id)
    RETURNING id INTO v_card_id;

    RETURN v_card_id;
END;
$$;
