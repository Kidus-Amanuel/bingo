import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const provider = searchParams.get('provider');

    if (!supabaseAdmin) {
        return NextResponse.json({ error: 'Admin client not available' }, { status: 500 });
    }

    let query = supabaseAdmin
        .from('transactions_ledger')
        .select('*, profiles(username, phone_number, telegram_id)')
        .order('created_at', { ascending: false });

    if (type) {
        query = query.eq('type', type);
    }

    if (status && status !== 'all') {
        query = query.eq('status', status);
    }

    if (provider && provider !== 'all') {
        query = query.eq('payment_method', provider);
    }

    const { data, error } = await query;

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
}
