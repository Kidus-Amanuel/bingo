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
                { command: "deposit", description: "💳 Top up your wallet" },
                { command: "withdraw", description: "💸 Withdraw your winnings" },
                { command: "balance", description: "💰 View your wallet balance" },
                { command: "information", description: "ℹ️ Game rules & info" },
                { command: "help", description: "🆘 How to play & Rules" }
            ]
        })
    });
}

async function handleDepositSMS(userId: string, telegramId: number, chatId: number, amount: number, paymentMethod: string, transactionId: string, rawMessage: string) {
    // Check if transaction ID already exists in the new unified ledger
    const { data: existingTxn } = await supabaseAdmin
        .from('transactions_ledger')
        .select('id')
        .eq('reference_id', transactionId)
        .maybeSingle();

    if (existingTxn) {
        await sendMessage(chatId, `⚠️ This transaction (ID: <code>${transactionId}</code>) has already been submitted or processed.`);
        return;
    }

    // Insert pending deposit into unified ledger
    const { error } = await supabaseAdmin.from('transactions_ledger').insert({
        user_id: userId,
        amount: amount,
        type: 'deposit',
        payment_method: paymentMethod,
        reference_id: transactionId,
        status: 'pending',
        metadata: { raw_message: rawMessage }
    });

    if (error) {
        console.error('Deposit Insert Error:', error);
        await sendMessage(chatId, "❌ Error saving your deposit request. Please contact support @BingoProSupport.");
        return;
    }

    await sendMessage(chatId, `✅ <b>Deposit Request Received</b>\n\nAmount: <b>${amount.toFixed(2)} Birr</b>\nTransaction ID: <code>${transactionId}</code>\n\nYour top-up will be processed by our operators shortly. You'll receive a notification when it's approved.\n\nStatus: ⏳ Pending`);
}

export async function POST(req: Request) {
    try {
        const update = await req.json();

        let text = update.message?.text || '';
        let telegramId: number;
        let chatId: number;
        let username: string;
        let contact = update.message?.contact;

        // Handle Callback Queries
        if (update.callback_query) {
            telegramId = update.callback_query.from.id;
            chatId = update.callback_query.message.chat.id;
            username = update.callback_query.from.username || update.callback_query.from.first_name;

            const data = update.callback_query.data;
            if (data === 'deposit_telebirr') {
                const depositMsg = `💳 <b>የ Telebirr አካውንት</b>\n<code>0945940021</code> - KIDUS AMANUEL\n\n<b>መመሪያ</b>\n1. ከላይ ባለው የ Telebirr አካውንት ገንዘቡን ያስገቡ\n2. ብሩን ስትልኩ የከፈላችሁበትን መረጃ የያዝ አጭር የጹሁፍ መልክት(sms) ከ Telebirr ይደርሳችኋል\n3. የደረሳችሁን አጭር የጹሁፍ መለክት(sms) ሙሉዉን ኮፒ(copy) በማረግ ከታሽ ባለው የቴሌግራም የጹሁፍ ማስገቢአው ላይ ፔስት(paste) በማረግ ይላኩት\n\nየሚያጋጥማቹ የክፍያ ችግር ካለ @BingoProSupport በዚ ሳፖርት ማዉራት ይችላሉ`;
                await sendMessage(chatId, depositMsg);
            } else if (data === 'deposit_cbe') {
                const depositMsg = `💳 <b>CBE Birr</b>\n<code>0945940021</code> - KIDUS AMANUEL\n\n<b>መመሪያ</b>\n1. ከላይ ባለው የ CBE Birr አካውንት ገንዘቡን ያስገቡ\n2. ብሩን ስትልኩ የከፈላችሁበትን መረጃ የያዝ አጭር የጹሁፍ መልክት(sms) ከ CBE ይደርሳችኋል\n3. የደረሳችሁን አጭር የጹሁፍ መለክት(sms) ሙሉዉን ኮፒ(copy) በማረግ ከታሽ ባለው የቴሌግራም የጹሁፍ ማስገቢአው ላይ ፔስት(paste) በማረግ ይላኩት\n\nየሚያጋጥማቹ የክፍያ ችግር ካለ @BingoProSupport በዚ ሳፖርት ማዉራት ይችላሉ`;
                await sendMessage(chatId, depositMsg);
            } else if (data === 'withdraw_telebirr') {
                await supabaseAdmin.from('bot_user_states').upsert({ telegram_id: telegramId, state: 'WAITING_WITHDRAWAL_AMOUNT_TELEBIRR' });
                await sendMessage(chatId, "<b>💸 Withdraw to Telebirr</b>\n\nPlease enter the amount you wish to withdraw.\n\n<i>Minimum withdrawal: 100 Birr</i>");
            } else if (data === 'withdraw_cbe') {
                await supabaseAdmin.from('bot_user_states').upsert({ telegram_id: telegramId, state: 'WAITING_WITHDRAWAL_AMOUNT_CBE' });
                await sendMessage(chatId, "<b>💸 Withdraw to CBE Birr</b>\n\nPlease enter the amount you wish to withdraw.\n\n<i>Minimum withdrawal: 100 Birr</i>");
            }

            await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ callback_query_id: update.callback_query.id })
            });

            return NextResponse.json({ ok: true });
        } else if (update.message) {
            telegramId = update.message.from.id;
            chatId = update.message.chat.id;
            username = update.message.from.username || update.message.from.first_name;
        } else {
            return NextResponse.json({ ok: true });
        }

        if (!text && !contact) return NextResponse.json({ ok: true });
        if (!supabaseAdmin) return NextResponse.json({ ok: true });

        // 1. Find or create user profile in UNIFIED 'profiles' table
        let { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('id, role, phone_number')
            .eq('telegram_id', telegramId)
            .maybeSingle();

        // 1a. Handle Contact Sharing
        if (contact && contact.phone_number) {
            if (profile) {
                await supabaseAdmin
                    .from('profiles')
                    .update({ phone_number: contact.phone_number, username: username })
                    .eq('id', profile.id);
                await sendMessage(chatId, "✅ <b>Phone number updated successfully!</b>");
            } else {
                const newId = uuidv4();
                const { data: newProfile, error: createError } = await supabaseAdmin
                    .from('profiles')
                    .insert({
                        id: newId,
                        telegram_id: telegramId,
                        username: username,
                        phone_number: contact.phone_number,
                        role: 'player'
                    })
                    .select()
                    .single();

                if (createError || !newProfile) {
                    await sendMessage(chatId, "❌ Error creating your profile.");
                    return NextResponse.json({ ok: true });
                }

                // Initialize unified wallet with 10 Birr bonus
                await supabaseAdmin.from('wallets').insert({ user_id: newProfile.id, balance: 10.00 });
                // We keep 'users' synced for engine legacy if needed, but primarily use wallets
                profile = newProfile;

                await setBotCommands();
                await sendMessage(
                    chatId,
                    `<b>Welcome to Bingo Pro, ${username}! 🎱</b>\n\nYour registration is complete! 🎁\n\n<b>Commands:</b>\n🚀 /play - Join game instantly\n💳 /deposit - Top up your wallet\n💸 /withdraw - Withdraw funds\n💰 /balance - View your wallet`,
                    {
                        keyboard: [[{ text: "Open Bingo App 🎮", web_app: { url: `https://bingo-app-tawny.vercel.app/lobby?userId=${newProfile.id}` } }]],
                        resize_keyboard: true
                    }
                );
            }
            return NextResponse.json({ ok: true });
        }

        if (!profile) {
            await sendMessage(
                chatId,
                "👋 <b>Welcome to Joy Bingo!</b>\n\n📱 To register and start playing, we need your phone number.",
                {
                    keyboard: [[{ text: "📱 Share My Phone Number", request_contact: true }]],
                    resize_keyboard: true,
                    one_time_keyboard: true
                }
            );
            return NextResponse.json({ ok: true });
        }

        // 2. Withdrawal Request Handling
        const { data: userState } = await supabaseAdmin
            .from('bot_user_states')
            .select('state')
            .eq('telegram_id', telegramId)
            .maybeSingle();

        if (userState && userState.state.startsWith('WAITING_WITHDRAWAL_AMOUNT') && !text.startsWith('/')) {
            const amount = parseFloat(text);
            if (isNaN(amount) || amount < 100) {
                await sendMessage(chatId, "⚠️ Invalid amount. Minimum withdrawal is 100 Birr.");
                return NextResponse.json({ ok: true });
            }

            // Check unified balance
            const { data: wallet } = await supabaseAdmin.from('wallets').select('balance').eq('user_id', profile.id).single();
            if (!wallet || wallet.balance < amount) {
                await sendMessage(chatId, `🚫 Insufficient funds. Balance: ${wallet?.balance || 0} Birr`);
                await supabaseAdmin.from('bot_user_states').delete().eq('telegram_id', telegramId);
                return NextResponse.json({ ok: true });
            }

            // Create Pending Withdrawal in unified ledger
            await supabaseAdmin.from('transactions_ledger').insert({
                user_id: profile.id,
                amount: -Math.abs(amount), // Negative for ledger tracking
                type: 'withdrawal',
                payment_method: userState.state === 'WAITING_WITHDRAWAL_AMOUNT_TELEBIRR' ? 'telebirr' : 'cbe',
                status: 'pending',
                metadata: { raw_message: text }
            });

            await supabaseAdmin.from('bot_user_states').delete().eq('telegram_id', telegramId);
            await sendMessage(chatId, `✅ <b>Withdrawal Request Received</b>\n\nAmount: <b>${amount.toFixed(2)} Birr</b>\nStatus: ⏳ Pending Approval`);
            return NextResponse.json({ ok: true });
        }

        // 3. Main Commands
        if (text === '/start') {
            await sendMessage(chatId, "<b>Welcome to Bingo Pro! 🎱</b>", {
                keyboard: [[{ text: "Open Bingo App 🎮", web_app: { url: `https://bingo-app-tawny.vercel.app/lobby?userId=${profile.id}` } }]],
                resize_keyboard: true
            });
        }
        else if (text === '/balance') {
            const { data: wallet } = await supabaseAdmin.from('wallets').select('balance').eq('user_id', profile.id).single();
            await sendMessage(chatId, `<b>Wallet Status 💰</b>\n\nBalance: <code>${wallet?.balance || 0} Birr</code>`);
        }
        else if (text === '/play' || text === '/join') {
            const { data: game } = await supabaseAdmin.from('rooms_engine').select('id, card_price, status').eq('status', 'waiting').order('created_at', { ascending: false }).limit(1).maybeSingle();
            if (!game) {
                await sendMessage(chatId, "⚠️ No active rooms. Please wait...");
                return NextResponse.json({ ok: true });
            }

            const { data: existing } = await supabaseAdmin.from('room_cards').select('id').eq('room_id', game.id).eq('user_id', profile.id).maybeSingle();
            if (existing) {
                await sendMessage(chatId, "<b>You're already in! ✅</b>", {
                    inline_keyboard: [[{ text: "Play Now 🎮", web_app: { url: `https://bingo-app-tawny.vercel.app/lobby?userId=${profile.id}` } }]]
                });
                return NextResponse.json({ ok: true });
            }

            const { data: wallet } = await supabaseAdmin.from('wallets').select('balance').eq('user_id', profile.id).single();
            const betAmount = Number(game.card_price);
            if (!wallet || Number(wallet.balance) < betAmount) {
                await sendMessage(chatId, `<b>🚫 Insufficient Funds</b>\nEntry: ${betAmount} Birr\nBalance: ${wallet?.balance || 0} Birr`);
                return NextResponse.json({ ok: true });
            }

            await sendMessage(chatId, `<b>🎱 Game Waiting!</b>\nEntry: ${betAmount} Birr`, {
                inline_keyboard: [[{ text: "Open Lobby 🎟", web_app: { url: `https://bingo-app-tawny.vercel.app/lobby?userId=${profile.id}` } }]]
            });
        }
        else if (text === '/deposit') {
            await sendMessage(chatId, "<b>Select bank for top-up:</b>", {
                inline_keyboard: [[{ text: "💳 Telebirr", callback_data: "deposit_telebirr" }], [{ text: "💳 CBE Birr", callback_data: "deposit_cbe" }]]
            });
        }
        else if (text === '/withdraw') {
            await sendMessage(chatId, "<b>Select withdrawal method:</b>", {
                inline_keyboard: [[{ text: "💸 Telebirr", callback_data: "withdraw_telebirr" }], [{ text: "💸 CBE Birr", callback_data: "withdraw_cbe" }]]
            });
        }
        else if (text.toLowerCase().includes("transferred") && text.toLowerCase().includes("telebirr")) {
            const amountMatch = text.match(/ETB\s*([\d,\.]+)/i);
            const txnMatch = text.match(/transaction number is\s*([A-Za-z0-9]+)/i);
            if (amountMatch && txnMatch) {
                await handleDepositSMS(profile.id, telegramId, chatId, parseFloat(amountMatch[1].replace(/,/g, '')), 'telebirr', txnMatch[1], text);
            }
        }

        return NextResponse.json({ ok: true });
    } catch (err: any) {
        console.error('Webhook Error:', err);
        return NextResponse.json({ ok: true });
    }
}
