import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { drawNextNumber } from '@/lib/gameEngine';

export async function POST(req: Request) {
    try {
        const { gameId } = await req.json();

        if (!gameId) {
            return NextResponse.json({ success: false, error: 'Missing gameId' }, { status: 400 });
        }

        // 1. Fetch current game state
        const { data: game, error: gameError } = await supabase
            .from('games')
            .select('status, numbers_drawn')
            .eq('id', gameId)
            .single();

        if (gameError || !game) {
            return NextResponse.json({ success: false, error: 'Game not found' }, { status: 404 });
        }

        if (game.status !== 'started') {
            return NextResponse.json({ success: false, error: 'Game is not in "started" status' }, { status: 400 });
        }

        // 2. Draw next number
        const alreadyDrawn = game.numbers_drawn || [];
        const nextNumber = drawNextNumber(alreadyDrawn);

        if (nextNumber === null) {
            return NextResponse.json({ success: false, error: 'All numbers have already been drawn' }, { status: 400 });
        }

        // 3. Update game with new number
        const updatedNumbers = [...alreadyDrawn, nextNumber];
        const { error: updateError } = await supabase
            .from('games')
            .update({
                numbers_drawn: updatedNumbers,
                updated_at: new Date().toISOString()
            })
            .eq('id', gameId);

        if (updateError) {
            return NextResponse.json({ success: false, error: 'Failed to update game: ' + updateError.message }, { status: 500 });
        }

        // 4. Log action (optional)
        await supabase.from('game_actions').insert({
            game_id: gameId,
            action_type: 'number_drawn',
            meta_data: { number: nextNumber }
        });

        return NextResponse.json({ success: true, nextNumber, numbersDrawn: updatedNumbers });
    } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
