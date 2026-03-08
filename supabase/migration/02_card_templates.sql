-- 🎱 Bingo Pro: Card Templates Pool
-- Diversifying the "Lucky Number" selection

CREATE TABLE public.card_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grid JSONB NOT NULL,
    grid_hash TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Note: In a real app, we'd use a script to generate hundreds of these.
-- For now, let's seed with 10 diverse cards.

INSERT INTO public.card_templates (grid, grid_hash) VALUES 
('[[1,7,10,12,15],[18,21,22,23,24],[31,35,"FREE",43,45],[46,47,52,57,60],[61,62,63,72,75]]', 'hash_1'),
('[[2,8,11,13,14],[19,20,25,26,27],[32,36,"FREE",44,40],[48,49,53,58,59],[64,65,70,71,74]]', 'hash_2'),
('[[3,9,12,14,15],[20,22,23,24,25],[33,37,"FREE",41,42],[50,51,54,55,56],[66,67,68,69,73]]', 'hash_3'),
('[[4,10,13,15,5],[21,23,24,25,26],[34,38,"FREE",42,43],[51,52,55,56,57],[67,68,69,70,71]]', 'hash_4'),
('[[5,11,14,1,6],[22,24,25,26,27],[35,39,"FREE",43,44],[52,53,56,57,58],[68,69,70,71,72]]', 'hash_5'),
('[[6,12,15,2,7],[23,25,26,27,28],[36,40,"FREE",44,45],[53,54,57,58,59],[69,70,71,72,73]]', 'hash_6'),
('[[7,13,1,3,8],[24,26,27,28,29],[37,41,"FREE",45,31],[54,55,58,59,60],[70,71,72,73,74]]', 'hash_7'),
('[[8,14,2,4,9],[25,27,28,29,30],[38,42,"FREE",31,32],[55,56,59,60,46],[71,72,73,74,75]]', 'hash_8'),
('[[9,15,3,5,10],[26,28,29,30,16],[39,43,"FREE",32,33],[56,57,60,46,47],[72,73,74,75,61]]', 'hash_9'),
('[[10,1,4,6,11],[27,29,30,16,17],[40,44,"FREE",33,34],[57,58,46,47,48],[73,74,75,61,62]]', 'hash_10');

-- Enable RLS (Select only)
ALTER TABLE public.card_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view templates" ON public.card_templates FOR SELECT USING (true);
