import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const gameId = searchParams.get('gameId');

    if (!userId || !gameId) {
        return NextResponse.json({ error: 'Missing userId or gameId' }, { status: 400 });
    }

    // Fetch game player record to get the card
    const { data: playerRecord } = await supabaseAdmin
        .from('game_players')
        .select('card_id, cards(grid)')
        .eq('game_id', gameId)
        .eq('user_id', userId)
        .single();

    // Fetch game info
    const { data: game } = await supabaseAdmin
        .from('games')
        .select('id, bet_amount, status, total_pot, numbers_drawn')
        .eq('id', gameId)
        .single();

    return NextResponse.json({
        cardId: playerRecord?.card_id ?? null,
        grid: (playerRecord?.cards as any)?.grid ?? null,
        game: game ?? null
    });
}
