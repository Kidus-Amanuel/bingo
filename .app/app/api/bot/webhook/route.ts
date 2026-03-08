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

            // Initialize wallet with 100 Birr welcome bonus
            const { error: walletError } = await supabaseAdmin.from('wallets').insert({
                user_id: newProfile.id,
                balance: 100.00
            });

            if (walletError) {
                console.error('Wallet Creation Error:', walletError);
            }

            await sendMessage(chatId, `👋 Welcome to Bingo Pro, ${username}! I've created your profile and added 100 Birr welcome bonus to your wallet.`);
            profile = newProfile;
        }

        // Safety check for TypeScript (redundant but keeps it safe for subsequent code)
        if (!profile) {
            return NextResponse.json({ ok: true });
        }

        // 2. Command Handlers
        if (text === '/start') {
            await sendMessage(chatId, "🎮 Welcome to the Bingo Pro Bot!\n\nCommands:\n/play - Join a game instantly\n/balance - Check your current balance\n/help - Show this message");
        }
        else if (text === '/balance') {
            const { data: wallet } = await supabaseAdmin
                .from('wallets')
                .select('balance')
                .eq('user_id', profile.id)
                .single();

            await sendMessage(chatId, `💰 Your current balance is: ${wallet?.balance || 0} Birr`);
        }
        else if (text === '/play' || text === '/join') {
            // --- PERSISTENT GAME LOOP ---

            // 1. Find the most recent waiting game
            let { data: game, error: findError } = await supabaseAdmin
                .from('games')
                .select('id, bet_amount, status')
                .eq('status', 'waiting')
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            // 2. Auto-Rollover: If no game, or the last one is somehow inaccessible, create a new one
            if (!game) {
                // Find system operator (initialized by seed.sql or created here as fallback)
                let { data: operator } = await supabaseAdmin.from('profiles').select('id').eq('role', 'operator').eq('username', 'System Operator').maybeSingle();
                if (!operator) {
                    const { data: newOp } = await supabaseAdmin.from('profiles').insert({ username: 'System Operator', role: 'operator' }).select().single();
                    operator = newOp;
                }

                if (!operator) {
                    await sendMessage(chatId, "❌ System Error: Could not verify Game Operator.");
                    return NextResponse.json({ ok: true });
                }

                // Find Main Hall room
                let { data: room } = await supabaseAdmin.from('rooms').select('id').eq('operator_id', operator.id).eq('name', 'Main Hall').maybeSingle();
                if (!room) {
                    const { data: newRoom } = await supabaseAdmin.from('rooms').insert({ operator_id: operator.id, name: 'Main Hall' }).select().single();
                    room = newRoom;
                }

                // Create a fresh 'waiting' game
                const { data: newGame, error: gameError } = await supabaseAdmin.from('games').insert({
                    room_id: room!.id,
                    bet_amount: 10.00,
                    status: 'waiting'
                }).select().single();

                if (gameError || !newGame) {
                    console.error('Persistent Loop Error:', gameError);
                    await sendMessage(chatId, "❌ Failed to rotate to a new game session.");
                    return NextResponse.json({ ok: true });
                }
                game = newGame;
            }

            if (!game) {
                await sendMessage(chatId, "❌ Error: Could not synchronize with the game server.");
                return NextResponse.json({ ok: true });
            }

            // 3. Check for existing join (prevent double-betting on the same game)
            const { data: existing } = await supabaseAdmin.from('game_players').select('user_id').eq('game_id', game.id).eq('user_id', profile.id).maybeSingle();
            if (existing) {
                await sendMessage(chatId, "✅ You are already in the queue for this game! Please wait for the operator to start the draw.");
                return NextResponse.json({ ok: true });
            }

            // 4. Check balance
            const { data: wallet } = await supabaseAdmin.from('wallets').select('balance').eq('user_id', profile.id).single();
            if (!wallet || wallet.balance < game.bet_amount) {
                await sendMessage(chatId, `🚫 Insufficient balance. Entry is ${game.bet_amount} Birr, but you have ${wallet?.balance || 0} Birr.`);
                return NextResponse.json({ ok: true });
            }

            // 5. Instant Enrollment
            await sendMessage(chatId, `🎰 Joining the next game (Bet: ${game.bet_amount} Birr)...`);

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
                            { text: "Play Now 🎮", url: `https://bingo-app-tawny.vercel.app/lobby?userId=${profile.id}` }
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
