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
    // Check if transaction ID already exists
    const { data: existingTxn } = await supabaseAdmin
        .from('bot_transactions')
        .select('id')
        .eq('transaction_id', transactionId)
        .maybeSingle();

    if (existingTxn) {
        await sendMessage(chatId, `⚠️ This transaction (ID: <code>${transactionId}</code>) has already been submitted or processed.`);
        return;
    }

    // Insert pending deposit
    const { error } = await supabaseAdmin.from('bot_transactions').insert({
        user_id: userId,
        telegram_id: telegramId,
        amount: amount,
        type: 'deposit',
        payment_method: paymentMethod,
        transaction_id: transactionId,
        status: 'pending',
        raw_message: rawMessage
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

        // Handle Callback Queries (Inline button clicks)
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

            // Answer callback query to remove loading state on button
            await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ callback_query_id: update.callback_query.id })
            });

            // We continue processing below to ensure profile exists, but we can return early for callbacks
            return NextResponse.json({ ok: true });
        } else if (update.message) {
            telegramId = update.message.from.id;
            chatId = update.message.chat.id;
            username = update.message.from.username || update.message.from.first_name;
        } else {
            return NextResponse.json({ ok: true });
        }

        if (!text && !contact) {
            return NextResponse.json({ ok: true });
        }

        if (!supabaseAdmin) {
            console.error('Bot Error: supabaseAdmin is not initialized (missing service role key)');
            await sendMessage(chatId, "⚠️ The bot is currently in maintenance mode (Configuration Error).");
            return NextResponse.json({ ok: true });
        }

        // 1. Find or create user profile
        let { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('id, role, phone_number')
            .eq('telegram_id', telegramId)
            .maybeSingle();

        // 1a. Handle Contact Sharing (Registration Enhancement)
        if (contact && contact.phone_number) {
            if (profile) {
                // Update existing profile with phone
                await supabaseAdmin
                    .from('profiles')
                    .update({ phone_number: contact.phone_number })
                    .eq('id', profile.id);

                await sendMessage(chatId, "✅ <b>Phone number updated successfully!</b>");
                return NextResponse.json({ ok: true });
            }
        }

        // 1b. Auto-Register if no profile exists (without strict phone requirement)
        if (!profile) {
            const newId = uuidv4();
            const { data: newProfile, error: createError } = await supabaseAdmin
                .from('profiles')
                .insert({
                    id: newId,
                    telegram_id: telegramId,
                    username: username,
                    phone_number: contact?.phone_number || null, // Optional
                    role: 'player'
                })
                .select()
                .single();

            if (createError || !newProfile) {
                console.error('Profile Creation Error:', createError);
                await sendMessage(chatId, "❌ Error creating your profile. Please try again later.");
                return NextResponse.json({ ok: true });
            }

            // Initialize wallets
            await supabaseAdmin.from('wallets').insert({ user_id: newProfile.id, balance: 10.00 });
            await supabaseAdmin.from('users').insert({ id: newProfile.id, telegram_id: telegramId, balance: 0.00 });
            profile = newProfile;

            // Welcome message with menu after registration
            await setBotCommands();
            await sendMessage(
                chatId,
                `<b>Welcome to Bingo Pro, ${username}! 🎱</b>\n\nYour registration is complete! 🎁\n\n<i>Let's start winning!</i>\n\n<b>Commands:</b>\n🚀 /play - Join game instantly\n💳 /deposit - Top up your wallet\n💸 /withdraw - Withdraw funds\n💰 /balance - View your wallet\nℹ️ /information - Game rules`,
                {
                    keyboard: [[{ text: "Open Bingo App 🎮", web_app: { url: `https://bingo-app-tawny.vercel.app/lobby?userId=${profile?.id}` } }]],
                    resize_keyboard: true
                }
            );
            return NextResponse.json({ ok: true });
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

        // Safety check for TypeScript
        if (!profile) {
            return NextResponse.json({ ok: true });
        }

        // 2. State Management for Withdrawals
        const { data: userState } = await supabaseAdmin
            .from('bot_user_states')
            .select('state')
            .eq('telegram_id', telegramId)
            .maybeSingle();

        if (userState && userState.state.startsWith('WAITING_WITHDRAWAL_AMOUNT') && !text.startsWith('/')) {
            const amount = parseFloat(text);

            if (isNaN(amount)) {
                await sendMessage(chatId, "⚠️ Please enter a valid number for the withdrawal amount.");
                return NextResponse.json({ ok: true });
            }

            if (amount < 100) {
                await sendMessage(chatId, "⚠️ Withdraw amount must be greater than or equal to 100 Birr.");
                return NextResponse.json({ ok: true });
            }

            // Check balance
            const { data: wallet } = await supabaseAdmin.from('users').select('balance').eq('id', profile.id).single();
            if (!wallet || wallet.balance < amount) {
                await sendMessage(chatId, `🚫 Insufficient fund. user: ${profile.phone_number || telegramId}, amount: ${amount.toFixed(2)}`);
                // Clear state
                await supabaseAdmin.from('bot_user_states').delete().eq('telegram_id', telegramId);
                return NextResponse.json({ ok: true });
            }

            // Create Pending Withdrawal
            await supabaseAdmin.from('bot_transactions').insert({
                user_id: profile.id,
                telegram_id: telegramId,
                amount: amount,
                type: 'withdrawal',
                payment_method: userState.state === 'WAITING_WITHDRAWAL_AMOUNT_TELEBIRR' ? 'telebirr' : 'cbe_birr',
                status: 'pending',
                raw_message: text
            });

            await supabaseAdmin.from('bot_user_states').delete().eq('telegram_id', telegramId);
            await sendMessage(chatId, `✅ <b>Withdrawal Request Received</b>\n\nYour request to withdraw <b>${amount.toFixed(2)} Birr</b> via <b>${userState.state === 'WAITING_WITHDRAWAL_AMOUNT_TELEBIRR' ? 'Telebirr' : 'CBE'}</b> has been submitted to our operators.\n\nStatus: ⏳ Pending`);
            return NextResponse.json({ ok: true });
        }


        // 3. Command & Message Handlers
        if (text === '/start') {
            await setBotCommands(); // Ensure menu is always updated
            await sendMessage(
                chatId,
                "<b>Welcome to the Ultimate Bingo Experience! 🎱</b>\n\nJoin thousands of players in real-time draws and win big pots instantly.\n\n<b>Commands:</b>\n🚀 /play - Join game instantly\n💳 /deposit - Top up your wallet\n💸 /withdraw - Withdraw funds\n💰 /balance - View your wallet\nℹ️ /information - Game rules",
                {
                    keyboard: [[{ text: "Open Bingo App 🎮", web_app: { url: `https://bingo-app-tawny.vercel.app/lobby?userId=${profile.id}` } }]],
                    resize_keyboard: true
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
            // 1. Find the most recent waiting room
            const { data: game } = await supabaseAdmin
                .from('rooms_engine')
                .select('id, card_price, status')
                .eq('status', 'waiting')
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (!game) {
                await sendMessage(chatId, "<b>⚠️ No active rooms right now.</b>\n\nThe engine is spawning a new room. Please wait a moment and try again!");
                return NextResponse.json({ ok: true });
            }

            // 2. Check if already joined this room
            const { data: existing } = await supabaseAdmin
                .from('room_cards')
                .select('id')
                .eq('room_id', game.id)
                .eq('user_id', profile.id)
                .maybeSingle();

            if (existing) {
                await sendMessage(
                    chatId,
                    "<b>You're already in! ✅</b>\n\nYour card is reserved. Open the app to watch the live draw!",
                    {
                        inline_keyboard: [[
                            { text: "Play Now 🎮", web_app: { url: `https://bingo-app-tawny.vercel.app/lobby?userId=${profile.id}` } }
                        ]]
                    }
                );
                return NextResponse.json({ ok: true });
            }

            // 3. Check balance — card selection happens in the lobby, not here
            const { data: wallet } = await supabaseAdmin
                .from('users')
                .select('balance')
                .eq('id', profile.id)
                .single();

            const betAmount = Number(game.card_price);
            if (!wallet || wallet.balance < betAmount) {
                await sendMessage(chatId, `<b>🚫 Insufficient Funds</b>\n\nEntry: <code>${betAmount} Birr</code>\nBalance: <code>${wallet?.balance || 0} Birr</code>\n\n<i>Please top up to continue!</i>`);
                return NextResponse.json({ ok: true });
            }

            // 4. Send user to lobby to pick their lucky card
            await sendMessage(
                chatId,
                `<b>🎱 There's a game waiting for you!</b>\n\nEntry: <code>${betAmount} Birr</code>\nBalance: <code>${wallet.balance} Birr</code>\n\n<i>Open the lobby below, pick your lucky card, and wait for the draw!</i>`,
                {
                    inline_keyboard: [[
                        { text: "Play Now 🎟", web_app: { url: `https://bingo-app-tawny.vercel.app/lobby?userId=${profile.id}` } }
                    ]]
                }
            );
        }
        else if (text === '/deposit' || text === '/deposite') {
            await sendMessage(
                chatId,
                "<b>Please select the bank option you wish to use for the top-up.</b>",
                {
                    inline_keyboard: [
                        [{ text: "💳 Telebirr", callback_data: "deposit_telebirr" }],
                        [{ text: "💳 CBE Birr", callback_data: "deposit_cbe" }]
                    ]
                }
            );
        }
        else if (text === '/withdraw' || text === '/withdrawal') {
            await sendMessage(
                chatId,
                "<b>Please select your preferred withdrawal method.</b>",
                {
                    inline_keyboard: [
                        [{ text: "💸 Withdraw to Telebirr", callback_data: "withdraw_telebirr" }],
                        [{ text: "💸 Withdraw to CBE Birr", callback_data: "withdraw_cbe" }]
                    ]
                }
            );
        }
        else if (text === '/information' || text === '/rule' || text === '/help' || text === '/info') {
            await sendMessage(chatId, "<b>Bingo Pro Rules & Info ℹ️</b>\n\n1️⃣ <b>Join:</b> Use /play to enter the next round.\n2️⃣ <b>Deposit/Withdraw:</b> Use /deposit to add funds and /withdraw to cash out.\n3️⃣ <b>Wait:</b> Game starts once players join.\n4️⃣ <b>Win:</b> Numbers are drawn automatically. First pattern wins the Pot!\n\n💰 <b>Wallet:</b> Check /balance anytime.\n\n<i>For support, contact @BingoProSupport</i>");
        }
        else if (text.toLowerCase().includes("transferred") && text.toLowerCase().includes("telebirr")) {
            // Telebirr SMS parsing: "You have transferred ETB 30.00 to mitku tasaw... Your transaction number is DC83JYBUGX..."
            const amountMatch = text.match(/ETB\s*([\d,\.]+)/i);
            const txnMatch = text.match(/transaction number is\s*([A-Za-z0-9]+)/i);

            if (amountMatch && txnMatch) {
                const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
                const txnId = txnMatch[1];

                await handleDepositSMS(profile.id, telegramId, chatId, amount, 'telebirr', txnId, text);
            } else {
                await sendMessage(chatId, "⚠️ Could not read the amount or transaction ID from your Telebirr message. Please ensure you copied the exact SMS.");
            }
        }
        else if (text.toLowerCase().includes("you have sent") && text.toLowerCase().includes("cbe birr")) {
            // CBE Birr SMS parsing: "Dear KIDUS, you have sent 5.00Br. to KIDUS AMANUEL... Txn ID DCA117UGJ0N..."
            const amountMatch = text.match(/sent\s*([\d,\.]+)\s*Br/i);
            const txnMatch = text.match(/Txn ID\s*([A-Za-z0-9]+)/i);

            if (amountMatch && txnMatch) {
                const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
                const txnId = txnMatch[1];

                await handleDepositSMS(profile.id, telegramId, chatId, amount, 'cbe_birr', txnId, text);
            } else {
                await sendMessage(chatId, "⚠️ Could not read the amount or transaction ID from your CBE Birr message. Please ensure you copied the exact SMS.");
            }
        }
        else if (!text.startsWith('/')) {
            await sendMessage(chatId, "❓ Unknown message. Type /help for assistance.");
        }

        return NextResponse.json({ ok: true });
    } catch (err: any) {
        console.error('Webhook Error:', err);
        return NextResponse.json({ ok: true }); // Always return 200 to Telegram
    }
}
