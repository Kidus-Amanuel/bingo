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
            parse_mode: 'HTML',
            reply_markup: replyMarkup
        })
    });
}

async function setBotCommands() {
    await fetch(`${TELEGRAM_API}/setMyCommands`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            commands: [
                { command: "play", description: "🚀 Join the next active game" },
                { command: "balance", description: "💰 View your wallet balance" },
                { command: "help", description: "🆘 How to play & Rules" }
            ]
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

            await sendMessage(chatId, `<b>Welcome to Bingo Pro, ${username}! 🎱</b>\n\nI've created your profile and added a <b>100 Birr welcome bonus</b> to your wallet! 🎁\n\n<i>Let's start winning!</i>`);
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
            await setBotCommands(); // Ensure menu is always updated
            await sendMessage(
                chatId, 
                "<b>Welcome to the Ultimate Bingo Experience! 🎱</b>\n\nJoin thousands of players in real-time draws and win big pots instantly.\n\n<b>Commands:</b>\n🚀 /play - Join game instantly\n💰 /balance - View your wallet\n🆘 /help - How to play",
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

            await sendMessage(chatId, `<b>Wallet Status 💰</b>\n\n👤 <b>Player:</b> ${username}\n🗄 <b>Balance:</b> <code>${wallet?.balance || 0} Birr</code>\n\n<i>Use /play to enter the next round!</i>`);
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
                await sendMessage(chatId, "<b>⚠️ No active rooms.</b>\n\nThe engine is currently spawning a new room. Please wait a few seconds and try again!");
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
                    "<b>You're already in! ✅</b>\n\nYour spot is reserved. Tap the button below to watch the live draw and claim your prize!",
                    {
                        inline_keyboard: [[
                            { text: "Go to Live Draw 🎮", web_app: { url: `https://bingo-app-tawny.vercel.app/lobby?userId=${profile.id}` } }
                        ]]
                    }
                );
                return NextResponse.json({ ok: true });
            }

            // 4. Check balance (from engine users table)
            const { data: wallet } = await supabaseAdmin.from('users').select('balance').eq('id', profile.id).single();
            const betAmount = Number(game.card_price);
            if (!wallet || wallet.balance < betAmount) {
                await sendMessage(chatId, `<b>🚫 Insufficient Funds</b>\n\nEntry: <code>${betAmount} Birr</code>\nBalance: <code>${wallet?.balance || 0} Birr</code>\n\n<i>Please top up to continue!</i>`);
                return NextResponse.json({ ok: true });
            }

            // 5. Instant Enrollment
            await sendMessage(chatId, `🎰 <b>Entering the arena...</b>\n\nStaking: <code>${betAmount} Birr</code>`);

            const joinRes = await fetch(`${req.url.split('/api')[0]}/api/game/join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gameId: game.id, userId: profile.id })
            });
            const joinData = await joinRes.json();

            if (joinData.success) {
                await sendMessage(
                    chatId,
                    "<b>Tickets Confirmed! 🎟</b>\n\nSuccess! Your card has been generated. Tap below to see your lucky numbers and follow the game in real-time.",
                    {
                        inline_keyboard: [[
                            { text: "Launch Game UI 🎮", web_app: { url: `https://bingo-app-tawny.vercel.app/lobby?userId=${profile.id}` } }
                        ]]
                    }
                );
            } else {
                await sendMessage(chatId, "<b>❌ System Error</b>\n\n" + joinData.error);
            }
        }
        else if (text === '/help') {
            await sendMessage(chatId, "<b>Bingo Pro Help 🆘</b>\n\n1️⃣ <b>Join:</b> Use /play to enter the next round.\n2️⃣ <b>Wait:</b> Game starts once 3 players join.\n3️⃣ <b>Win:</b> Numbers are drawn automatically. First pattern wins the Pot!\n\n💰 <b>Wallet:</b> Check /balance anytime.\n\n<i>Good luck, player!</i>");
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
