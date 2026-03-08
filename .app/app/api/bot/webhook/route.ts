import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

async function sendMessage(chatId: number, text: string) {
    await fetch(`${TELEGRAM_API}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text })
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

        // 1. Find or create user profile
        let { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id, role')
            .eq('telegram_id', telegramId)
            .maybeSingle();

        if (!profile) {
            // Create profile and wallet for new user
            const { data: newProfile, error: createError } = await supabase
                .from('profiles')
                .insert({
                    telegram_id: telegramId,
                    username: username,
                    role: 'player'
                })
                .select()
                .single();

            if (createError || !newProfile) {
                await sendMessage(chatId, "❌ Error creating your profile. Please try again later.");
                return NextResponse.json({ ok: true });
            }
            profile = newProfile;

            // Initialize wallet with 100 Birr welcome bonus (optional, for testing)
            await supabase.from('wallets').insert({
                user_id: newProfile.id,
                balance: 100.00
            });

            await sendMessage(chatId, `👋 Welcome to Bingo Pro, ${username}! I've created your profile and added 100 Birr welcome bonus to your wallet.`);
        }

        // Safety check for TypeScript (redundant but keeps it safe for subsequent code)
        if (!profile) {
            return NextResponse.json({ ok: true });
        }

        // 2. Command Handlers
        if (text === '/start') {
            await sendMessage(chatId, "🎮 Welcome to the Bingo Pro Bot!\n\nCommands:\n/play - Join an active game\n/balance - Check your current balance\n/help - Show this message");
        }
        else if (text === '/balance') {
            const { data: wallet } = await supabase
                .from('wallets')
                .select('balance')
                .eq('user_id', profile.id)
                .single();

            await sendMessage(chatId, `💰 Your current balance is: ${wallet?.balance || 0} Birr`);
        }
        else if (text === '/play') {
            // Find an active/waiting game
            const { data: game } = await supabase
                .from('games')
                .select('id, bet_amount')
                .eq('status', 'waiting')
                .limit(1)
                .maybeSingle();

            if (!game) {
                await sendMessage(chatId, "🎰 No active games at the moment. Please wait for an operator to start one.");
            } else {
                await sendMessage(chatId, `🎯 Found a game! Bet amount: ${game.bet_amount} Birr.\nType /join to enter.`);
            }
        }
        else if (text === '/join') {
            const { data: game } = await supabase
                .from('games')
                .select('id, bet_amount, status')
                .eq('status', 'waiting')
                .limit(1)
                .maybeSingle();

            if (!game) {
                await sendMessage(chatId, "⚠️ No waiting games found matching your request.");
                return NextResponse.json({ ok: true });
            }

            // Call the join session (we can do this by making an internal request or using the logic directly)
            // For simplicity and to ensure the logic is identical, we'll implement it here using a similar pattern.
            const { data: wallet } = await supabase.from('wallets').select('balance').eq('user_id', profile.id).single();

            if (!wallet || wallet.balance < game.bet_amount) {
                await sendMessage(chatId, `🚫 Insufficient balance. You need ${game.bet_amount} Birr, but have ${wallet?.balance || 0} Birr.`);
                return NextResponse.json({ ok: true });
            }

            // Check if already in
            const { data: existing } = await supabase.from('game_players').select('user_id').eq('game_id', game.id).eq('user_id', profile.id).maybeSingle();
            if (existing) {
                await sendMessage(chatId, "✅ You are already in this game! Wait for the draw.");
                return NextResponse.json({ ok: true });
            }

            // Process Join
            const res = await fetch(`${req.url.split('/api')[0]}/api/game/join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gameId: game.id, userId: profile.id })
            });
            const joinData = await res.json();

            if (joinData.success) {
                await sendMessage(chatId, "🎟️ Successfully joined! Here is your card grid:\n\n" +
                    joinData.grid.map((row: any) => row.join(' | ')).join('\n')
                );
            } else {
                await sendMessage(chatId, "❌ Join failed: " + joinData.error);
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
