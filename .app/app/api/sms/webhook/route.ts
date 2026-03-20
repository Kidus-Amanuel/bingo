import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// API Key for simple authentication of the SMS forwarder
const SMS_WEBHOOK_SECRET = process.env.SMS_WEBHOOK_SECRET || 'bingo-pro-sms-secret-123';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

async function sendTelegramMessage(chatId: number, text: string) {
    if (!BOT_TOKEN) return;
    try {
        await fetch(`${TELEGRAM_API}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text,
                parse_mode: 'HTML'
            })
        });
    } catch (err) {
        console.error('Error sending Telegram notification:', err);
    }
}

export async function POST(req: Request) {
    try {
        const apiKey = req.headers.get('x-api-key');

        if (apiKey !== SMS_WEBHOOK_SECRET) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { message, sender } = body; // Adjust based on your SMS forwarder's payload

        if (!message) {
            return NextResponse.json({ error: 'No message provided' }, { status: 400 });
        }

        console.log('Incoming SMS:', message);

        let type: 'cbe' | 'telebirr' | null = null;
        let amount: number | null = null;
        let transactionId: string | null = null;

        // --- 1. CBE Birr Parser ---
        // Example: ... you have sent 5.00Br. to ... Txn ID DCA117UGJ0N
        // Example (Receiver): CBE Birr: You have received 10.00 Br from ... Txn ID ABC123XYZ
        if (message.includes('CBE') || message.includes('DCA')) {
            type = 'cbe';
            const txnMatch = message.match(/Txn ID\s*([A-Za-z0-9]+)/i);
            const amtMatch = message.match(/([\d,\.]+)\s*Br/i);
            
            if (txnMatch) transactionId = txnMatch[1];
            if (amtMatch) amount = parseFloat(amtMatch[1].replace(/,/g, ''));
        } 
        // --- 2. Telebirr Parser ---
        // Example: ... ETB 50.00 ... transaction number is ABC123XYZ
        else if (message.toLowerCase().includes('telebirr') || message.toLowerCase().includes('transferred')) {
            type = 'telebirr';
            const txnMatch = message.match(/transaction number is\s*([A-Za-z0-9]+)/i);
            const amtMatch = message.match(/ETB\s*([\d,\.]+)/i);
            
            if (txnMatch) transactionId = txnMatch[1];
            if (amtMatch) amount = parseFloat(amtMatch[1].replace(/,/g, ''));
        }

        if (!transactionId || !amount) {
            return NextResponse.json({ error: 'Could not parse SMS', message }, { status: 422 });
        }

        // --- 3. Match and Approve Ledger Entry ---
        // We look for a pending deposit with this transaction ID
        const { data: ledgerEntry, error: ledgerError } = await supabaseAdmin
            .from('transactions_ledger')
            .select('id, user_id, status, profiles(telegram_id)')
            .eq('reference_id', transactionId)
            .eq('type', 'deposit')
            .maybeSingle();

        if (ledgerError) {
            console.error('Ledger Lookup Error:', ledgerError);
            return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }

        if (!ledgerEntry) {
            return NextResponse.json({ error: 'Transaction ID not found in pending deposits', transactionId }, { status: 404 });
        }

        if (ledgerEntry.status === 'approved' || ledgerEntry.status === 'completed') {
            return NextResponse.json({ message: 'Transaction already processed', transactionId });
        }

        // Use the handle_transaction_approval RPC to update balance and status
        const { data: success, error: approveError } = await supabaseAdmin.rpc('handle_transaction_approval', {
            p_tx_id: ledgerEntry.id,
            p_new_status: 'approved'
        });

        if (approveError || !success) {
            console.error('Approval Error:', approveError);
            return NextResponse.json({ error: 'Failed to approve transaction' }, { status: 500 });
        }

        // --- 4. Notify User in Telegram (if applicable) ---
        // @ts-ignore
        const telegramId = ledgerEntry.profiles?.telegram_id;
        if (telegramId) {
            const successMsg = `🎉 <b>Deposit Approved!</b>\n\nYour deposit of <b>${amount.toFixed(2)} Birr</b> has been confirmed and added to your wallet.\n\nTransaction: <code>${transactionId}</code>\n\nGood luck! 🍀`;
            await sendTelegramMessage(telegramId, successMsg);
        }

        return NextResponse.json({ 
            success: true, 
            message: 'Transaction approved', 
            transactionId, 
            amount, 
            type 
        });

    } catch (err: any) {
        console.error('SMS Webhook Error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
