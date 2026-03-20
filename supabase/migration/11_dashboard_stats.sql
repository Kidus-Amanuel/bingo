-- 📊 BINGO PRO: DASHBOARD & FINANCES (v1.1)

-- 1. COMPANY FINANCES TABLE
CREATE TABLE IF NOT EXISTS public.company_finances (
    id INT PRIMARY KEY DEFAULT 1,
    tele_balance DECIMAL(20, 2) DEFAULT 0.00,
    tele_profit DECIMAL(20, 2) DEFAULT 0.00,
    cbe_balance DECIMAL(20, 2) DEFAULT 0.00,
    cbe_profit DECIMAL(20, 2) DEFAULT 0.00,
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT singleton_check CHECK (id = 1) -- Ensure only one row exists
);

-- Initialize the row if it doesn't exist
INSERT INTO public.company_finances (id) VALUES (1) ON CONFLICT DO NOTHING;

-- 2. WITHDRAWAL LOGS VIEW (For Dashboard)
CREATE OR REPLACE VIEW public.withdrawal_requests AS
SELECT 
    t.id,
    t.user_id,
    p.username,
    t.amount,
    t.payment_method,
    t.status,
    t.created_at,
    t.metadata->>'account_number' as account_number,
    t.metadata->>'account_name' as account_name
FROM public.transactions_ledger t
JOIN public.profiles p ON t.user_id = p.id
WHERE t.type = 'withdrawal';

-- 3. TRIGGER TO UPDATE COMPANY BALANCE ON DEPOSIT/WITHDRAWAL
CREATE OR REPLACE FUNCTION public.sync_company_finances()
RETURNS TRIGGER AS $$
BEGIN
    -- Only handle completed/approved transactions
    IF NEW.status NOT IN ('completed', 'approved') THEN
        RETURN NEW;
    END IF;

    -- Handle Deposits
    IF NEW.type = 'deposit' THEN
        IF NEW.payment_method = 'telebirr' THEN
            UPDATE public.company_finances SET tele_balance = tele_balance + NEW.amount WHERE id = 1;
        ELSIF NEW.payment_method = 'cbe' THEN
            UPDATE public.company_finances SET cbe_balance = cbe_balance + NEW.amount WHERE id = 1;
        END IF;
    END IF;

    -- Handle Withdrawals
    IF NEW.type = 'withdrawal' THEN
        IF NEW.payment_method = 'telebirr' THEN
            UPDATE public.company_finances SET tele_balance = tele_balance - NEW.amount WHERE id = 1;
        ELSIF NEW.payment_method = 'cbe' THEN
            UPDATE public.company_finances SET cbe_balance = cbe_balance - NEW.amount WHERE id = 1;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_txn_ledger_sync_finance
AFTER INSERT OR UPDATE OF status ON public.transactions_ledger
FOR EACH ROW EXECUTE PROCEDURE public.sync_company_finances();

-- 4. UPDATE PROFIT TRIGGER
-- We update profit when a room is finished and company_fee is recorded.
-- Since we don't track the exact provider per bet in the pool, 
-- we split the profit based on the payment_method of the room_cards if needed,
-- but for simplicity now, we'll attribute profit to the payment_method of the win if known,
-- or just split it 50/50 or based on total volume.
-- REFINED: We'll add 'last_payment_method' to profiles to attribute profit.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_payment_method TEXT DEFAULT 'telebirr';

CREATE OR REPLACE FUNCTION public.sync_company_profit()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if room just finished
    IF OLD.status != 'finished' AND NEW.status = 'finished' THEN
        -- Attribute profit to the providers (for now 50/50 if unknown, or based on majority)
        -- Real implementation should iterate through room_cards and their users' deposit history
        -- Simplest: update based on the default or last used provider.
        UPDATE public.company_finances SET tele_profit = tele_profit + (NEW.company_fee / 2), cbe_profit = cbe_profit + (NEW.company_fee / 2) WHERE id = 1;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_room_finished_sync_profit
AFTER UPDATE OF status ON public.rooms_engine
FOR EACH ROW EXECUTE PROCEDURE public.sync_company_profit();

-- 5. ACCESS CONTROL
ALTER TABLE public.company_finances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins only access finance" ON public.company_finances
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

GRANT ALL ON public.company_finances TO service_role;
GRANT SELECT ON public.company_finances TO authenticated;
