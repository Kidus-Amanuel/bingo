import { NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

async function sendMessage(chatId: number, text: string, replyMarkup?: any) {
    await fetch(`${TELEGRAM_API}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            text,
            reply_markup: replyMarkup
        })
    });
}

export async function POST(req: Request) {
    try {
        const update = await req.json();

        if (!update.message || !update.message.text) {
            return NextResponse.json({ ok: true });
        }

        const chatId = update.message.chat.id;
        const text = update.message.text;
        const telegramId = update.message.from.id;
        const username = update.message.from.username || update.message.from.first_name;

        if (!supabaseAdmin) {
            console.error('Bot Error: supabaseAdmin is not initialized (missing service role key)');
            await sendMessage(chatId, "⚠️ The bot is currently in maintenance mode (Configuration Error).");
            return NextResponse.json({ ok: true });
        }

        // 1. Find or create user profile
        let { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('id, role')
            .eq('telegram_id', telegramId)
            .maybeSingle();

        if (!profile) {
            // Create profile and wallet for new user using Admin client (bypasses RLS)
            const newId = uuidv4();
            const { data: newProfile, error: createError } = await supabaseAdmin
                .from('profiles')
                .insert({
                    id: newId,
                    telegram_id: telegramId,
                    username: username,
                    role: 'player'
                })
                .select()
                .single();

            if (createError || !newProfile) {
                console.error('Profile Creation Error:', createError);
                await sendMessage(chatId, "❌ Error creating your profile. Please try again later.");
                return NextResponse.json({ ok: true });
            }

            // Initialize wallet with 100 Birr welcome bonus (Existing UI Compat)
            await supabaseAdmin.from('wallets').insert({
                user_id: newProfile.id,
                balance: 100.00
            });

            // Initialize BINGO ENGINE User (Engine Compat)
            await supabaseAdmin.from('users').insert({
                id: newProfile.id,
                telegram_id: telegramId,
                balance: 100.00
            });

            await sendMessage(chatId, `👋 Welcome to Bingo Pro, ${username}! I've created your profile and added 100 Birr welcome bonus to your wallet.`);
            profile = newProfile;
        } else {
            // Ensure record exists in engine's 'users' table if it was created via web UI
            const { data: engineUser } = await supabaseAdmin.from('users').select('id').eq('id', profile.id).maybeSingle();
            if (!engineUser) {
                const { data: wallet } = await supabaseAdmin.from('wallets').select('balance').eq('user_id', profile.id).single();
                await supabaseAdmin.from('users').insert({
                    id: profile.id,
                    telegram_id: telegramId,
                    balance: wallet?.balance || 0
                });
            }
        }

        // Safety check for TypeScript (redundant but keeps it safe for subsequent code)
        if (!profile) {
            return NextResponse.json({ ok: true });
        }

        // 2. Command Handlers
        if (text === '/start') {
            await sendMessage(
                chatId, 
                "🎮 Welcome to the Bingo Pro Bot!\n\nCommands:\n/play - Join a game instantly\n/balance - Check your current balance\n/help - Show this message",
                {
                    inline_keyboard: [[
                        { text: "Open Bingo App 🎮", web_app: { url: `https://bingo-app-tawny.vercel.app/lobby?userId=${profile.id}` } }
                    ]]
                }
            );
        }
        else if (text === '/balance') {
            const { data: wallet } = await supabaseAdmin
                .from('users')
                .select('balance')
                .eq('id', profile.id)
                .single();

            await sendMessage(chatId, `💰 Your current balance is: ${wallet?.balance || 0} Birr`);
        }
        else if (text === '/play' || text === '/join') {
            // --- BINGO ENGINE LOOKUP ---

            // 1. Find the most recent waiting room in the engine
            let { data: game, error: findError } = await supabaseAdmin
                .from('rooms_engine')
                .select('id, card_price, status')
                .eq('status', 'waiting')
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            // 2. If no room, the engine might not have spawned it yet (or is inactive)
            if (!game) {
                await sendMessage(chatId, "⚠️ No waiting games available right now. Please wait for the engine to spawn a new room...");
                return NextResponse.json({ ok: true });
            }

            // 3. Check for existing join (using room_cards)
            const { data: existing } = await supabaseAdmin
                .from('room_cards')
                .select('id')
                .eq('room_id', game.id)
                .eq('user_id', profile.id)
                .maybeSingle();
            if (existing) {
                await sendMessage(
                    chatId,
                    "✅ You are already in the queue for this game! Tap the button below to open your card and watch the draw live:",
                    {
                        inline_keyboard: [[
                            { text: "Play Now 🎮", web_app: { url: `https://bingo-app-tawny.vercel.app/lobby?userId=${profile.id}` } }
                        ]]
                    }
                );
                return NextResponse.json({ ok: true });
            }

            // 4. Check balance (from engine users table)
            const { data: wallet } = await supabaseAdmin.from('users').select('balance').eq('id', profile.id).single();
            const betAmount = Number(game.card_price);
            if (!wallet || wallet.balance < betAmount) {
                await sendMessage(chatId, `🚫 Insufficient balance. Entry is ${betAmount} Birr, but you have ${wallet?.balance || 0} Birr.`);
                return NextResponse.json({ ok: true });
            }

            // 5. Instant Enrollment
            await sendMessage(chatId, `🎰 Joining the next game (Bet: ${betAmount} Birr)...`);

            const joinRes = await fetch(`${req.url.split('/api')[0]}/api/game/join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gameId: game.id, userId: profile.id })
            });
            const joinData = await joinRes.json();

            if (joinData.success) {
                await sendMessage(
                    chatId,
                    "🎟️ Successfully joined! Tap the button below to open your card and watch the draw live:",
                    {
                        inline_keyboard: [[
                            { text: "Play Now 🎮", web_app: { url: `https://bingo-app-tawny.vercel.app/lobby?userId=${profile.id}` } }
                        ]]
                    }
                );
            } else {
                await sendMessage(chatId, "❌ Registration failed: " + joinData.error);
            }
        }
        else if (text === '/help') {
            await sendMessage(chatId, "🆘 Bingo Pro Bot Help:\n\n1. /balance - View your current wallet funds.\n2. /play - Find a waiting game to join.\n3. /join - Enter the waiting game and deduct the bet.\n\nGood luck!");
        }
        else {
            await sendMessage(chatId, "❓ Unknown command. Type /help for assistance.");
        }

        return NextResponse.json({ ok: true });
    } catch (err: any) {
        console.error('Webhook Error:', err);
        return NextResponse.json({ ok: true }); // Always return 200 to Telegram
    }
}
