import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
        return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const [{ data: profile }, { data: walletData }] = await Promise.all([
        supabaseAdmin.from('profiles').select('id, username, avatar_url').eq('id', userId).single(),
        supabaseAdmin.from('wallets').select('balance').eq('user_id', userId).single()
    ]);

    return NextResponse.json({
        profile: profile ?? null,
        balance: walletData ? Number(walletData.balance) : 0
    });
}
