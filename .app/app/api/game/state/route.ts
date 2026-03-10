import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const roomId = searchParams.get('gameId');

    if (!userId || !roomId) {
        return NextResponse.json({ error: 'Missing userId or roomId' }, { status: 400 });
    }

    // Fetch the specific user's card for this room
    const { data: playerCard } = await supabaseAdmin
        .from('room_cards')
        .select('id, card_numbers')
        .eq('room_id', roomId)
        .eq('user_id', userId)
        .single();

    // Fetch room engine details
    const { data: room } = await supabaseAdmin
        .from('rooms_engine')
        .select('*')
        .eq('id', roomId)
        .single();

    // Transform card_numbers from integer array back to the expected 5x5 Matrix (or handle as flat on UI)
    let grid = null;
    if (playerCard?.card_numbers) {
        const nums = playerCard.card_numbers;
        grid = [
            nums.slice(0, 5),
            nums.slice(5, 10),
            nums.slice(10, 15),
            nums.slice(15, 20),
            nums.slice(20, 25)
        ];
    }

    // Fetch player count (unique users in this room)
    const { count: playerCount } = await supabaseAdmin
        .from('room_cards')
        .select('*', { count: 'exact', head: true })
        .eq('room_id', roomId);

    return NextResponse.json({
        cardId: playerCard?.id ?? null,
        grid: grid,
        game: room ? {
            id: room.id,
            bet_amount: room.card_price,
            status: room.status, 
            total_pot: room.pool,
            players_count: playerCount || 0,
            start_time: room.start_time,
            end_time: room.end_time
        } : null
    });
}
