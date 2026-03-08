import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { checkBingoWinner, BingoGrid } from '@/lib/gameEngine';

export async function POST(req: Request) {
    try {
        const { gameId } = await req.json();

        if (!gameId) {
            return NextResponse.json({ success: false, error: 'Missing gameId' }, { status: 400 });
        }

        // 1. Fetch game numbers
        const { data: game, error: gameError } = await supabase
            .from('games')
            .select('numbers_drawn, status')
            .eq('id', gameId)
            .single();

        if (gameError || !game) {
            return NextResponse.json({ success: false, error: 'Game not found' }, { status: 404 });
        }

        const drawnNumbers = game.numbers_drawn || [];

        // 2. Fetch all players and their cards for this game
        const { data: participants, error: playerError } = await supabase
            .from('game_players')
            .select('user_id, card_id, cards(grid)')
            .eq('game_id', gameId);

        if (playerError || !participants) {
            return NextResponse.json({ success: false, error: 'Failed to fetch players' }, { status: 500 });
        }

        // 3. Scan for winners
        let winnerId: string | null = null;

        for (const player of participants) {
            // Cast the cards object to recognize 'grid'
            const cardData = player.cards as unknown as { grid: BingoGrid };
            if (cardData && checkBingoWinner(cardData.grid, drawnNumbers)) {
                winnerId = player.user_id;
                break; // Stop at first winner for now
            }
        }

        // 4. Update game if winner found
        if (winnerId) {
            const { error: finishError } = await supabase
                .from('games')
                .update({
                    status: 'finished',
                    winner_id: winnerId,
                    updated_at: new Date().toISOString()
                })
                .eq('id', gameId);

            if (finishError) {
                return NextResponse.json({ success: false, error: 'Failed to update winner status: ' + finishError.message }, { status: 500 });
            }

            return NextResponse.json({ success: true, hasWinner: true, winnerId });
        }

        return NextResponse.json({ success: true, hasWinner: false });
    } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
