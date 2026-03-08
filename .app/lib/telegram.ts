/**
 * 🤖 Bingo Pro: Telegram Bot Integration Helpers
 * Handles webhook verification and user profile linking.
 */

import crypto from 'crypto';

/**
 * Verifies that a request comes from Telegram using the Bot Token.
 * @param token - The Telegram Bot Token from environment variables.
 * @param data - The raw request body or data for signature verification.
 */
export async function verifyTelegramWebappData(token: string, initData: string): Promise<boolean> {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    urlParams.delete('hash');

    const dataCheckString = Array.from(urlParams.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');

    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(token).digest();
    const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    return hash === calculatedHash;
}

/**
 * Logic for processing a deposit request from Telegram.
 * In a real scenario, this would trigger a payment gateway or an admin alert.
 */
export async function processTelegramDeposit(userId: string, amount: number, telegramId: number) {
    // Generate an idempotency key to prevent double processing
    const idempotencyKey = `dep_${telegramId}_${Date.now()}`;

    // This function acts as a wrapper for what will eventually be a Supabase RPC call
    return {
        userId,
        amount,
        idempotencyKey,
        status: 'pending',
        message: 'Deposit request logged. Please complete payment via Telebirr.',
    };
}
