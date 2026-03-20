-- 🛠️ BINGO PRO: AUTH TRIGGERS (v1.2)
-- This script handles automatic profile and wallet creation when a user signs up via Supabase Auth.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_username TEXT;
    v_role public.user_role;
BEGIN
    -- Extract username from metadata if it exists
    v_username := COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1));
    
    -- Extract role from metadata or default to 'operator' (since this is for the Dashboard portal)
    v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'operator')::public.user_role;

    -- 1. Create Profile
    -- Using NEW.id for both id and auth_user_id since auth_user_id is the reference.
    INSERT INTO public.profiles (id, auth_user_id, username, role)
    VALUES (NEW.id, NEW.id, v_username, v_role);

    -- 2. Create Wallet
    INSERT INTO public.wallets (user_id, balance)
    VALUES (NEW.id, 0.00);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to run on AFTER INSERT to ensure we have the auth user record available
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
