-- Seeding Bingo Pro: Initial Data

-- 1. Create a System Operator
INSERT INTO public.profiles (username, role)
VALUES ('System Operator', 'operator')
ON CONFLICT (telegram_id) DO NOTHING;

-- 2. Create a System Room (Main Hall)
-- We'll use a subquery to find the operator we just created
INSERT INTO public.rooms (operator_id, name)
SELECT id, 'Main Hall'
FROM public.profiles
WHERE role = 'operator' AND username = 'System Operator'
LIMIT 1
ON CONFLICT DO NOTHING;

-- 3. Create an Initial Waiting Game
INSERT INTO public.games (room_id, bet_amount, status)
SELECT id, 10.00, 'waiting'
FROM public.rooms
WHERE name = 'Main Hall'
LIMIT 1
ON CONFLICT DO NOTHING;
